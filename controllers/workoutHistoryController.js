const WorkoutHistory = require('../models/WorkoutHistory');
const Exercise = require('../models/Exercise');
const ExerciseTemplate = require('../models/ExerciseTemplate');
const PersonalExercise = require('../models/PersonalExercise');
const UserExerciseOverload = require('../models/UserExerciseOverload');
const { suggestProgression } = require('../utils/progressiveOverload');
const { resolveExerciseIdentity } = require('../utils/exerciseIdentity');

// Backward-compatible helper used by old callers that only need templateId
const resolveTemplateId = async (id) => {
  const { templateId } = await resolveExerciseIdentity(id);
  return templateId || id;
};

/**
 * Update the exercise weight record after a completed log.
 * BUG-003+004 FIX: ALWAYS writes to UserExerciseOverload (per-user).
 * ExerciseTemplate.currentWeight was a shared field that caused multi-user
 * data corruption — any user's log would overwrite every other user's data.
 *
 * For master template exercises: upserts UserExerciseOverload { user, template }
 * For personal exercises: upserts UserExerciseOverload { user, personalExercise }
 *
 * Auto-overload date scheduling (nextIncreaseDate) still updates ExerciseTemplate
 * for the shared interval tracking, but currentWeight is now strictly per-user.
 */
const updateWeightAfterLog = async (identity, userId, maxLoggedWeight) => {
  if (!maxLoggedWeight || maxLoggedWeight <= 0) return;

  if (!identity.isPersonal && identity.templateId) {
    // Master template: upsert per-user overload profile (NOT the shared ExerciseTemplate)
    await UserExerciseOverload.findOneAndUpdate(
      { user: userId, template: identity.templateId },
      { $set: { currentWeight: maxLoggedWeight, updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    // Still update the auto-progressive scheduling dates on the template (these are plan-level, not user-level)
    // but do NOT touch currentWeight on ExerciseTemplate — it is now read-only (shared field)
    const tpl = await ExerciseTemplate.findById(identity.templateId);
    if (tpl && tpl.autoProgressiveEnabled) {
      const now = new Date();
      const intervalWeeks = tpl.increaseIntervalWeeks || 3;
      tpl.lastIncreaseDate = now;
      tpl.nextIncreaseDate = new Date(now.getTime() + intervalWeeks * 7 * 24 * 60 * 60 * 1000);
      await tpl.save();
    }
  } else if (identity.isPersonal && identity.personalExerciseId) {
    // Personal exercise: update user-specific overload profile
    await UserExerciseOverload.findOneAndUpdate(
      { user: userId, personalExercise: identity.personalExerciseId },
      { $set: { currentWeight: maxLoggedWeight, updatedAt: new Date() } },
      { upsert: true, new: true }
    );
  }
};

// POST /api/workout-history -> log a completed exercise (Done button)
const logWorkout = async (req, res) => {
  try {
    const { exerciseId, workoutDayId, customPlanId, customDayNumber, sets, notes, date } = req.body;
    if (!exerciseId || !Array.isArray(sets) || !sets.length) {
      return res.status(400).json({ message: 'exerciseId and sets are required' });
    }

    const identity = await resolveExerciseIdentity(exerciseId);

    // Find the most recent previous session for progressive overload comparison
    const prevQuery = { user: req.user._id };
    if (identity.isPersonal) prevQuery.personalExercise = identity.personalExerciseId;
    else prevQuery.template = identity.templateId;

    const previous = await WorkoutHistory.findOne(prevQuery).sort({ date: -1 });
    const { isPersonalRecord } = suggestProgression(previous ? previous.sets : [], sets);

    const entry = await WorkoutHistory.create({
      user: req.user._id,
      template: identity.isPersonal ? null : identity.templateId,
      personalExercise: identity.isPersonal ? identity.personalExerciseId : null,
      exercise: exerciseId,
      workoutDay: workoutDayId || null,
      customPlanId: customPlanId || null,
      customDayNumber: customDayNumber || null,
      date: date || Date.now(),
      sets,
      notes: notes || '',
      isPersonalRecord,
    });

    // Update weight records (template or personal exercise overload)
    const validWeights = sets.map((s) => parseFloat(s.weightKg) || 0).filter((w) => w > 0);
    const maxLoggedWeight = validWeights.length ? Math.max(...validWeights) : 0;
    await updateWeightAfterLog(identity, req.user._id, maxLoggedWeight);

    res.status(201).json({ entry });
  } catch (err) {
    res.status(500).json({ message: 'Failed to log workout', error: err.message });
  }
};

// GET /api/workout-history/exercise/:exerciseId -> previous workout display on the exercise card
const getHistoryForExercise = async (req, res) => {
  try {
    const identity = await resolveExerciseIdentity(req.params.exerciseId);

    const query = { user: req.user._id };
    if (identity.isPersonal) query.personalExercise = identity.personalExerciseId;
    else query.template = identity.templateId;

    const history = await WorkoutHistory.find(query)
      .sort({ date: -1 })
      .limit(10);

    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history', error: err.message });
  }
};

// GET /api/workout-history/progress/:exerciseId -> chart progression data & timeline
const getExerciseProgressChartData = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const identity = await resolveExerciseIdentity(exerciseId);

    // Build exercise meta info
    let exerciseName = 'Exercise';
    let exerciseMuscleGroup = '';
    let currentWeight = 0;

    if (identity.isPersonal) {
      const pe = await PersonalExercise.findById(identity.personalExerciseId);
      if (!pe) return res.status(404).json({ message: 'Personal exercise not found' });
      exerciseName = pe.name;
      exerciseMuscleGroup = pe.muscleGroup || pe.category;
      // Get current weight from user's overload profile
      const overload = await UserExerciseOverload.findOne({
        user: req.user._id,
        personalExercise: identity.personalExerciseId,
      });
      currentWeight = overload?.currentWeight || 0;
    } else {
      let tpl = await ExerciseTemplate.findById(identity.templateId);
      if (!tpl) {
        const ex = await Exercise.findById(exerciseId).populate('template');
        if (ex && ex.template) tpl = ex.template;
      }
      if (!tpl) return res.status(404).json({ message: 'Exercise not found' });
      exerciseName = tpl.name;
      exerciseMuscleGroup = tpl.muscleGroup || tpl.category;
      // BUG-003 consistency fix: read per-user weight from UserExerciseOverload, not shared ExerciseTemplate
      const overload = await UserExerciseOverload.findOne({
        user: req.user._id,
        template: identity.templateId,
      });
      currentWeight = overload?.currentWeight ?? tpl.currentWeight ?? 0;
    }

    const query = { user: req.user._id };
    if (identity.isPersonal) query.personalExercise = identity.personalExerciseId;
    else query.template = identity.templateId;

    const logs = await WorkoutHistory.find(query).sort({ date: 1 });

    let maxPersonalRecordKg = currentWeight;
    let startingWeight = currentWeight;
    const timeline = [];

    logs.forEach((log) => {
      const validWeights = log.sets.map((s) => parseFloat(s.weightKg) || 0).filter((w) => w > 0);
      if (!validWeights.length) return;

      const maxWeightInSession = Math.max(...validWeights);
      if (startingWeight === 0 || maxWeightInSession < startingWeight) {
        startingWeight = maxWeightInSession;
      }
      if (maxWeightInSession > maxPersonalRecordKg) {
        maxPersonalRecordKg = maxWeightInSession;
      }

      timeline.push({
        date: log.date,
        formattedDate: new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        maxWeight: maxWeightInSession,
        maxWeightKg: maxWeightInSession,
        totalVolume: log.sets.reduce((sum, s) => sum + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps, 10) || 0), 0),
        isPersonalRecord: !!log.isPersonalRecord,
      });
    });

    const netGain = currentWeight > 0 && startingWeight > 0 ? currentWeight - startingWeight : 0;

    res.json({
      exercise: {
        name: exerciseName,
        muscleGroup: exerciseMuscleGroup,
        isPersonal: identity.isPersonal,
      },
      stats: {
        startingWeight,
        currentWeight,
        personalRecord: maxPersonalRecordKg,
        netGain: parseFloat(netGain.toFixed(1)),
        totalSessions: timeline.length,
      },
      timeline,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch chart data', error: err.message });
  }
};

// POST /api/workout-history/sync -> Sync queued offline logs with 60-second window deduplication
const syncHistory = async (req, res) => {
  try {
    const { logs } = req.body;
    if (!Array.isArray(logs)) return res.status(400).json({ message: 'logs array is required' });

    const results = [];
    const windowStart = new Date(Date.now() - 60 * 1000);

    for (const item of logs) {
      const { exerciseId, workoutDayId, sets, notes, date, localId } = item;
      const identity = await resolveExerciseIdentity(exerciseId);

      // Deduplication query — check by exercise identity + source context
      const dupQuery = { user: req.user._id, createdAt: { $gte: windowStart } };
      if (identity.isPersonal) dupQuery.personalExercise = identity.personalExerciseId;
      else dupQuery.template = identity.templateId;
      if (item.customPlanId) dupQuery.customPlanId = item.customPlanId;
      else if (workoutDayId) dupQuery.workoutDay = workoutDayId;

      const existingLog = await WorkoutHistory.findOne(dupQuery);
      if (existingLog) {
        results.push({ localId, serverId: existingLog._id, duplicateSkipped: true });
        continue;
      }

      const prevQuery = { user: req.user._id };
      if (identity.isPersonal) prevQuery.personalExercise = identity.personalExerciseId;
      else prevQuery.template = identity.templateId;
      const previous = await WorkoutHistory.findOne(prevQuery).sort({ date: -1 });
      const { isPersonalRecord } = suggestProgression(previous ? previous.sets : [], sets);

      const entry = await WorkoutHistory.create({
        user: req.user._id,
        template: identity.isPersonal ? null : identity.templateId,
        personalExercise: identity.isPersonal ? identity.personalExerciseId : null,
        exercise: exerciseId,
        workoutDay: workoutDayId || null,
        customPlanId: item.customPlanId || null,
        customDayNumber: item.customDayNumber || null,
        date: date || Date.now(),
        sets,
        notes: notes || '',
        isPersonalRecord,
      });

      const validWeights = sets.map((s) => parseFloat(s.weightKg) || 0).filter((w) => w > 0);
      const maxLoggedWeight = validWeights.length ? Math.max(...validWeights) : 0;
      await updateWeightAfterLog(identity, req.user._id, maxLoggedWeight);

      results.push({ localId, serverId: entry._id });
    }

    res.json({ message: 'Sync complete', results });
  } catch (err) {
    res.status(500).json({ message: 'Failed to sync history', error: err.message });
  }
};

module.exports = {
  logWorkout,
  getHistoryForExercise,
  getExerciseProgressChartData,
  syncHistory,
};
