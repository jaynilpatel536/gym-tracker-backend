const WorkoutHistory = require('../models/WorkoutHistory');
const { suggestProgression } = require('../utils/progressiveOverload');

// GET /api/progressive-overload/:exerciseId -> compares last 2 sessions, returns suggestion + PR flag
const getProgressiveOverload = async (req, res) => {
  try {
    const sessions = await WorkoutHistory.find({
      user: req.user._id,
      exercise: req.params.exerciseId,
    })
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
