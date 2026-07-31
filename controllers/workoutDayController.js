const WorkoutDay = require('../models/WorkoutDay');
const Exercise = require('../models/Exercise');

// GET /api/workout-days  -> Week 1 screen: Day 1-7 cards for plan1 or plan2
const getAllDays = async (req, res) => {
  try {
    const planCode = req.query.plan || 'plan1';
    const days = await WorkoutDay.find({ planCode }).sort({ dayNumber: 1 });
    const daysWithCounts = await Promise.all(
      days.map(async (day) => {
        const exerciseCount = await Exercise.countDocuments({ workoutDay: day._id });
        return {
          id: day._id,
          planCode: day.planCode,
          dayNumber: day.dayNumber,
          name: day.name,
          isRestDay: day.isRestDay,
          exerciseCount,
        };
      })
    );
    res.json({ days: daysWithCounts });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch workout days', error: err.message });
  }
};

// GET /api/workout-days/:dayNumber -> Workout Screen for that day and plan
const getDayByNumber = async (req, res) => {
  try {
    const dayNumber = Number(req.params.dayNumber);
    const planCode = req.query.plan || 'plan1';
    const day = await WorkoutDay.findOne({ dayNumber, planCode });
    if (!day) return res.status(404).json({ message: 'Day not found' });

    if (day.isRestDay) {
      return res.json({
        day: {
          id: day._id,
          planCode: day.planCode,
          dayNumber: day.dayNumber,
          name: day.name,
          isRestDay: true,
          recoveryTips: day.recoveryTips,
          stretchingSuggestions: day.stretchingSuggestions,
          hydrationReminder: day.hydrationReminder,
        },
        exercises: [],
      });
    }

    const exercises = await Exercise.find({ workoutDay: day._id }).sort({ order: 1 });
    res.json({
      day: { id: day._id, planCode: day.planCode, dayNumber: day.dayNumber, name: day.name, isRestDay: false },
      exercises,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch workout day', error: err.message });
  }
};

module.exports = { getAllDays, getDayByNumber };
