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

    const exercises = await Exercise.find({ workoutDay: day._id })
      .populate('template')
      .sort({ order: 1 });

    const formattedExercises = exercises.map((ex) => {
      const tpl = ex.template || {};
      return {
        _id: ex._id,
        templateId: tpl._id || ex._id,
        workoutDay: ex.workoutDay,
        order: ex.order,
        sets: ex.sets,
        repsRange: ex.repsRange,
        defaultRestSeconds: ex.defaultRestSeconds,
        name: tpl.name || 'Exercise',
        category: tpl.category || '',
        muscleGroup: tpl.muscleGroup || tpl.category || '',
        targetMuscle: tpl.targetMuscle || '',
        imageUrl: tpl.imageUrl || '',
        benefits: tpl.benefits || [],
        tips: tpl.tips || [],
        commonMistakes: tpl.commonMistakes || [],

        // Shared Progressive Overload Configuration from ExerciseTemplate
        autoProgressiveEnabled: !!tpl.autoProgressiveEnabled,
        increaseIntervalWeeks: tpl.increaseIntervalWeeks || 3,
        increaseWeightKg: tpl.increaseWeightKg || 2.5,
        startDate: tpl.startDate || null,
        nextIncreaseDate: tpl.nextIncreaseDate || null,
        lastIncreaseDate: tpl.lastIncreaseDate || null,
        currentWeight: tpl.currentWeight || 0,
        updatedAt: tpl.updatedAt || ex.updatedAt,
      };
    });

    res.json({
      day: { id: day._id, planCode: day.planCode, dayNumber: day.dayNumber, name: day.name, isRestDay: false },
      exercises: formattedExercises,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch workout day', error: err.message });
  }
};

module.exports = { getAllDays, getDayByNumber };
