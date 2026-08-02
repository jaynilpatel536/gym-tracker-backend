const WorkoutHistory = require('../models/WorkoutHistory');
const Exercise = require('../models/Exercise');
const ExerciseTemplate = require('../models/ExerciseTemplate');
const { suggestProgression } = require('../utils/progressiveOverload');

// Helper to resolve an ID to an ExerciseTemplate
const resolveTemplateId = async (id) => {
  const template = await ExerciseTemplate.findById(id);
  if (template) return template._id;
  const exercise = await Exercise.findById(id);
  if (exercise && exercise.template) return exercise.template;
  return id;
};

// POST /api/workout-history -> log a completed exercise (Done button)
const logWorkout = async (req, res) => {
  try {
    const { exerciseId, workoutDayId, sets, notes, date } = req.body;
    if (!exerciseId || !workoutDayId || !Array.isArray(sets) || !sets.length) {
      return res.status(400).json({ message: 'exerciseId, workoutDayId and sets are required' });
    }

    const templateId = await resolveTemplateId(exerciseId);

    // Find the most recent previous session for this user+template, for progressive overload
    const previous = await WorkoutHistory.findOne({
      user: req.user._id,
      template: templateId,
    }).sort({ date: -1 });

    const { isPersonalRecord } = suggestProgression(previous ? previous.sets : [], sets);

    const entry = await WorkoutHistory.create({
      user: req.user._id,
      template: templateId,
      exercise: exerciseId,
      workoutDay: workoutDayId,
      date: date || Date.now(),
      sets,
      notes: notes || '',
      isPersonalRecord,
    });

    // Find max working set weight
    const validWeights = sets.map((s) => parseFloat(s.weightKg) || 0).filter((w) => w > 0);
    const maxLoggedWeight = validWeights.length ? Math.max(...validWeights) : 0;

    // Permanently update ExerciseTemplate.currentWeight with newly saved max set weight
    if (maxLoggedWeight > 0) {
      const template = await ExerciseTemplate.findById(templateId);
      if (template) {
        template.currentWeight = maxLoggedWeight;
        // If auto progressive overload is enabled, recalculate next overload schedule from new weight date
        if (template.autoProgressiveEnabled) {
          const now = new Date();
          const intervalWeeks = template.increaseIntervalWeeks || 3;
          template.lastIncreaseDate = now;
          template.nextIncreaseDate = new Date(now.getTime() + intervalWeeks * 7 * 24 * 60 * 60 * 1000);
        }
        await template.save();
      }
    }

    res.status(201).json({ entry });
  } catch (err) {
    res.status(500).json({ message: 'Failed to log workout', error: err.message });
  }
};

// GET /api/workout-history/exercise/:exerciseId -> previous workout display on the exercise card
const getHistoryForExercise = async (req, res) => {
  try {
    const templateId = await resolveTemplateId(req.params.exerciseId);

    const history = await WorkoutHistory.find({
      user: req.user._id,
      template: templateId,
    })
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
    const templateId = await resolveTemplateId(exerciseId);

    let template = await ExerciseTemplate.findById(templateId);
    if (!template) {
      const exercise = await Exercise.findById(exerciseId).populate('template');
      if (exercise && exercise.template) template = exercise.template;
    }
    if (!template) return res.status(404).json({ message: 'Exercise not found' });

    const logs = await WorkoutHistory.find({
      user: req.user._id,
      template: templateId,
    }).sort({ date: 1 });

    let maxPersonalRecordKg = template.currentWeight || 0;
    let startingWeight = template.currentWeight || 0;
    const timeline = [];

    logs.forEach((log) => {
      const validWeights = log.sets.map((s) => parseFloat(s.weightKg) || 0).filter((w) => w > 0);
      if (!validWeights.length) return; // Ignore zero-weight sessions from progress chart timeline

      const maxWeightInSession = Math.max(...validWeights);
      if (startingWeight === 0 || maxWeightInSession < startingWeight) {
        startingWeight = maxWeightInSession;
      }
      if (maxWeightInSession > maxPersonalRecordKg) {
        maxPersonalRecordKg = maxWeightInSession;
      }

      timeline.push({
        date: log.date,
        maxWeightKg: maxWeightInSession,
        totalVolumeKg: log.sets.reduce((sum, s) => sum + (parseFloat(s.weightKg) || 0) * (parseInt(s.reps, 10) || 0), 0),
        isPR: log.isPersonalRecord,
      });
    });

    res.json({
      exerciseName: template.name,
      muscleGroup: template.muscleGroup || template.category,
      currentWeightKg: template.currentWeight || 0,
      startingWeightKg: startingWeight,
      personalRecordKg: maxPersonalRecordKg,
      totalSessions: timeline.length,
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
      const templateId = await resolveTemplateId(exerciseId);

      // Check if duplicate log was already saved in the last 60 seconds
      const existingLog = await WorkoutHistory.findOne({
        user: req.user._id,
        template: templateId,
        workoutDay: workoutDayId,
        createdAt: { $gte: windowStart },
      });

      if (existingLog) {
        results.push({ localId, serverId: existingLog._id, duplicateSkipped: true });
        continue;
      }

      const previous = await WorkoutHistory.findOne({
        user: req.user._id,
        template: templateId,
      }).sort({ date: -1 });

      const { isPersonalRecord } = suggestProgression(previous ? previous.sets : [], sets);

      const entry = await WorkoutHistory.create({
        user: req.user._id,
        template: templateId,
        exercise: exerciseId,
        workoutDay: workoutDayId,
        date: date || Date.now(),
        sets,
        notes: notes || '',
        isPersonalRecord,
      });

      const validWeights = sets.map((s) => parseFloat(s.weightKg) || 0).filter((w) => w > 0);
      const maxLoggedWeight = validWeights.length ? Math.max(...validWeights) : 0;

      if (maxLoggedWeight > 0) {
        const template = await ExerciseTemplate.findById(templateId);
        if (template) {
          template.currentWeight = maxLoggedWeight;
          if (template.autoProgressiveEnabled) {
            const now = new Date();
            const intervalWeeks = template.increaseIntervalWeeks || 3;
            template.lastIncreaseDate = now;
            template.nextIncreaseDate = new Date(now.getTime() + intervalWeeks * 7 * 24 * 60 * 60 * 1000);
          }
          await template.save();
        }
      }

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
