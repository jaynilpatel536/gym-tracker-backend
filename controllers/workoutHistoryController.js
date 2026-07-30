const WorkoutHistory = require('../models/WorkoutHistory');
const Exercise = require('../models/Exercise');
const { suggestProgression } = require('../utils/progressiveOverload');

// POST /api/workout-history -> log a completed exercise (Done button)
const logWorkout = async (req, res) => {
  try {
    const { exerciseId, workoutDayId, sets, notes, date } = req.body;
    if (!exerciseId || !workoutDayId || !Array.isArray(sets) || !sets.length) {
      return res.status(400).json({ message: 'exerciseId, workoutDayId and sets are required' });
    }

    // Find the most recent previous session for this user+exercise, for progressive overload
    const previous = await WorkoutHistory.findOne({
      user: req.user._id,
      exercise: exerciseId,
    }).sort({ date: -1 });

    const { isPersonalRecord } = suggestProgression(previous ? previous.sets : [], sets);

    const entry = await WorkoutHistory.create({
      user: req.user._id,
      exercise: exerciseId,
      workoutDay: workoutDayId,
      date: date || Date.now(),
      sets,
      notes: notes || '',
      isPersonalRecord,
    });

    // Permanently update exercise.currentWeight in database with newly saved set weight
    if (sets[0] && sets[0].weightKg > 0) {
      const ex = await Exercise.findById(exerciseId);
      if (ex) {
        ex.currentWeight = sets[0].weightKg;
        // If auto progressive overload is enabled, recalculate next overload schedule from new weight date
        if (ex.autoProgressiveEnabled) {
          const now = new Date();
          const intervalWeeks = ex.increaseIntervalWeeks || 3;
          ex.lastIncreaseDate = now;
          ex.nextIncreaseDate = new Date(now.getTime() + intervalWeeks * 7 * 24 * 60 * 60 * 1000);
        }
        await ex.save();
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
    const history = await WorkoutHistory.find({
      user: req.user._id,
      exercise: req.params.exerciseId,
    })
      .sort({ date: -1 })
      .limit(10);

    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history', error: err.message });
  }
};

// POST /api/workout-history/sync -> bulk sync of locally cached, offline-logged sessions
const syncHistory = async (req, res) => {
  try {
    const { entries } = req.body; // array of { exerciseId, workoutDayId, sets, notes, date, localId }
    if (!Array.isArray(entries)) {
      return res.status(400).json({ message: 'entries array is required' });
    }

    const results = [];
    for (const entry of entries) {
      const previous = await WorkoutHistory.findOne({
        user: req.user._id,
        exercise: entry.exerciseId,
        date: { $lt: entry.date || Date.now() },
      }).sort({ date: -1 });

      const { isPersonalRecord } = suggestProgression(previous ? previous.sets : [], entry.sets);

      const saved = await WorkoutHistory.create({
        user: req.user._id,
        exercise: entry.exerciseId,
        workoutDay: entry.workoutDayId,
        date: entry.date || Date.now(),
        sets: entry.sets,
        notes: entry.notes || '',
        isPersonalRecord,
      });

      if (entry.sets && entry.sets[0] && entry.sets[0].weightKg > 0) {
        await Exercise.findByIdAndUpdate(entry.exerciseId, { currentWeight: entry.sets[0].weightKg });
      }

      results.push({ localId: entry.localId, serverId: saved._id });
    }

    res.json({ synced: results.length, results });
  } catch (err) {
    res.status(500).json({ message: 'Sync failed', error: err.message });
  }
};

module.exports = { logWorkout, getHistoryForExercise, syncHistory };
