const WorkoutHistory = require('../models/WorkoutHistory');
const ExerciseTemplate = require('../models/ExerciseTemplate');
const PersonalExercise = require('../models/PersonalExercise');
const Exercise = require('../models/Exercise');
const { suggestProgression } = require('../utils/progressiveOverload');
const { resolveExerciseIdentity } = require('../utils/exerciseIdentity');

// GET /api/progressive-overload/:exerciseId
// Compares last 2 sessions for this user + exercise, returns suggestion + PR flag.
const getProgressiveOverload = async (req, res) => {
  try {
    // BUG FIX: resolve the incoming exerciseId to its canonical identity so we
    // query WorkoutHistory on the correct field (.template or .personalExercise)
    // instead of the stale legacy .exercise field that logWorkout() never writes to.
    const identity = await resolveExerciseIdentity(req.params.exerciseId);

    const query = { user: req.user._id };
    if (identity.isPersonal) {
      query.personalExercise = identity.personalExerciseId;
    } else {
      query.template = identity.templateId;
    }

    const sessions = await WorkoutHistory.find(query)
      .sort({ date: -1 })
      .limit(2);

    if (sessions.length === 0) {
      return res.json({
        suggestion: 'Log your first session to get a suggestion',
        isPersonalRecord: false,
      });
    }

    if (sessions.length === 1) {
      return res.json({
        suggestion: 'Increase Reps or Weight from last session',
        isPersonalRecord: !!sessions[0].isPersonalRecord,
      });
    }

    const [current, previous] = sessions;
    const result = suggestProgression(previous.sets, current.sets);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute progressive overload', error: err.message });
  }
};

module.exports = { getProgressiveOverload };
