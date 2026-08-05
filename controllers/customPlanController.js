const CustomPlan = require('../models/CustomPlan');
const Exercise = require('../models/Exercise');
const WorkoutDay = require('../models/WorkoutDay');

const DEFAULT_DAYS = [
  { dayNumber: 1, name: 'Day 1', exercises: [] },
  { dayNumber: 2, name: 'Day 2', exercises: [] },
  { dayNumber: 3, name: 'Day 3', exercises: [] },
  { dayNumber: 4, name: 'Day 4', exercises: [] },
  { dayNumber: 5, name: 'Day 5', exercises: [] },
  { dayNumber: 6, name: 'Day 6', exercises: [] },
  { dayNumber: 7, name: 'Day 7', exercises: [] },
];

const formatCustomPlanDays = (days) => {
  return days.map((d) => ({
    dayNumber: d.dayNumber,
    name: d.name,
    exercises: (d.exercises || []).map((ex) => {
      const tpl = ex.template || {};
      return {
        _id: ex._id,
        templateId: tpl._id || ex._id,
        sets: ex.sets || 3,
        repsRange: ex.repsRange || '8-12',
        defaultRestSeconds: ex.defaultRestSeconds || 90,
        name: tpl.name || ex.name || 'Exercise',
        category: tpl.category || ex.category || '',
        muscleGroup: tpl.muscleGroup || ex.muscleGroup || tpl.category || '',
        targetMuscle: tpl.targetMuscle || '',
        imageUrl: tpl.imageUrl || ex.imageUrl || '',
        currentWeight: tpl.currentWeight || 0,
        autoProgressiveEnabled: !!tpl.autoProgressiveEnabled,
        increaseIntervalWeeks: tpl.increaseIntervalWeeks || 3,
        increaseWeightKg: tpl.increaseWeightKg || 2.5,
        nextIncreaseDate: tpl.nextIncreaseDate || null,
      };
    }),
  }));
};

// GET /api/custom-plans -> Get all custom plans for logged in user
const getCustomPlans = async (req, res) => {
  try {
    const plans = await CustomPlan.find({ user: req.user._id })
      .populate({
        path: 'days.exercises',
        populate: { path: 'template' },
      })
      .sort({ createdAt: -1 });

    const formattedPlans = plans.map((p) => ({
      _id: p._id,
      user: p.user,
      name: p.name,
      goal: p.goal,
      durationWeeks: p.durationWeeks,
      isActive: p.isActive,
      createdAt: p.createdAt,
      days: formatCustomPlanDays(p.days),
    }));

    res.json({ plans: formattedPlans });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch custom plans', error: err.message });
  }
};

// POST /api/custom-plans -> Create a new custom plan
const createCustomPlan = async (req, res) => {
  try {
    const { name, goal, durationWeeks, planCode } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Plan name is required' });
    }

    let initialDays = DEFAULT_DAYS;

    if (planCode) {
      const masterDays = await WorkoutDay.find({ planCode }).sort({ dayNumber: 1 });
      if (masterDays && masterDays.length > 0) {
        initialDays = await Promise.all(
          masterDays.map(async (d) => {
            const dayExercises = await Exercise.find({ workoutDay: d._id }).sort({ createdAt: 1 });
            return {
              dayNumber: d.dayNumber,
              name: d.name,
              exercises: dayExercises.map((ex) => ex._id),
            };
          })
        );
      }
    }

    const plan = await CustomPlan.create({
      user: req.user._id,
      name: name.trim(),
      goal: goal || 'Muscle Building',
      durationWeeks: parseInt(durationWeeks, 10) || 4,
      planCode: planCode || null,
      isBuiltInCopy: !!planCode,
      days: initialDays,
    });

    const populatedPlan = await CustomPlan.findById(plan._id).populate({
      path: 'days.exercises',
      populate: { path: 'template' },
    });

    res.status(201).json({
      plan: {
        _id: populatedPlan._id,
        user: populatedPlan.user,
        name: populatedPlan.name,
        goal: populatedPlan.goal,
        durationWeeks: populatedPlan.durationWeeks,
        isActive: populatedPlan.isActive,
        createdAt: populatedPlan.createdAt,
        days: formatCustomPlanDays(populatedPlan.days),
      },
    });
  } catch (err) {
    console.error('[createCustomPlan Error]:', err);
    res.status(500).json({ message: 'Failed to create custom plan', error: err.message });
  }
};

// GET /api/custom-plans/:id -> Get single custom plan details
const getCustomPlanById = async (req, res) => {
  try {
    const plan = await CustomPlan.findOne({ _id: req.params.id, user: req.user._id }).populate({
      path: 'days.exercises',
      populate: { path: 'template' },
    });

    if (!plan) {
      return res.status(404).json({ message: 'Custom plan not found' });
    }

    const formatted = {
      _id: plan._id,
      user: plan.user,
      name: plan.name,
      goal: plan.goal,
      durationWeeks: plan.durationWeeks,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      days: formatCustomPlanDays(plan.days),
    };

    res.json({ plan: formatted });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch custom plan', error: err.message });
  }
};

// PUT /api/custom-plans/:id/days/:dayNumber -> Update exercises for a specific day
const updatePlanDayExercises = async (req, res) => {
  try {
    const { exerciseIds } = req.body;
    const dayNumber = parseInt(req.params.dayNumber, 10);

    const plan = await CustomPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) {
      return res.status(404).json({ message: 'Custom plan not found' });
    }

    const dayIndex = plan.days.findIndex((d) => d.dayNumber === dayNumber);
    if (dayIndex === -1) {
      plan.days.push({ dayNumber, name: `Day ${dayNumber}`, exercises: exerciseIds || [] });
    } else {
      plan.days[dayIndex].exercises = exerciseIds || [];
    }

    await plan.save();

    const updatedPlan = await CustomPlan.findById(plan._id).populate({
      path: 'days.exercises',
      populate: { path: 'template' },
    });

    const formatted = {
      _id: updatedPlan._id,
      user: updatedPlan.user,
      name: updatedPlan.name,
      goal: updatedPlan.goal,
      durationWeeks: updatedPlan.durationWeeks,
      isActive: updatedPlan.isActive,
      createdAt: updatedPlan.createdAt,
      days: formatCustomPlanDays(updatedPlan.days),
    };

    res.json({ plan: formatted });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update plan exercises', error: err.message });
  }
};

// PUT /api/custom-plans/:id/reorder-days -> Reorder workout days in custom plan
const reorderPlanDays = async (req, res) => {
  try {
    const { reorderedDays } = req.body; // Array of day objects [{ dayNumber, name, exercises: [...] }]
    const plan = await CustomPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Custom plan not found' });

    if (Array.isArray(reorderedDays)) {
      plan.days = reorderedDays;
      await plan.save();
    }

    res.json({ message: 'Workout days reordered successfully', days: plan.days });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reorder workout days', error: err.message });
  }
};

// PUT /api/custom-plans/:id/days/:dayNumber/reorder-exercises -> Reorder exercises inside a day
const reorderDayExercises = async (req, res) => {
  try {
    const { exerciseIds } = req.body; // Re-sequenced exercise IDs array
    const dayNumber = parseInt(req.params.dayNumber, 10);

    const plan = await CustomPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Custom plan not found' });

    const dayIndex = plan.days.findIndex((d) => d.dayNumber === dayNumber);
    if (dayIndex !== -1 && Array.isArray(exerciseIds)) {
      plan.days[dayIndex].exercises = exerciseIds;
      await plan.save();
    }

    res.json({ message: 'Exercises reordered successfully', day: plan.days[dayIndex] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reorder exercises', error: err.message });
  }
};

// PUT /api/custom-plans/:id/restore-default -> Restore custom plan to copy master default routine
const restoreDefaultPlan = async (req, res) => {
  try {
    const { planCode = 'plan1' } = req.body; // 'plan1' or 'plan2'
    const plan = await CustomPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return res.status(404).json({ message: 'Custom plan not found' });

    const masterDays = await WorkoutDay.find({ planCode }).sort({ dayNumber: 1 });
    const restoredDays = await Promise.all(
      masterDays.map(async (d) => {
        const dayExercises = await Exercise.find({ workoutDay: d._id }).sort({ createdAt: 1 });
        return {
          dayNumber: d.dayNumber,
          name: d.name,
          exercises: dayExercises.map((ex) => ex._id),
        };
      })
    );

    plan.days = restoredDays;
    await plan.save();

    const updatedPlan = await CustomPlan.findById(plan._id).populate({
      path: 'days.exercises',
      populate: { path: 'template' },
    });

    res.json({
      message: `Restored plan to Default ${planCode === 'plan2' ? 'Plan 2' : 'Plan 1'}`,
      plan: {
        _id: updatedPlan._id,
        name: updatedPlan.name,
        days: formatCustomPlanDays(updatedPlan.days),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to restore default plan', error: err.message });
  }
};

// DELETE /api/custom-plans/:id -> Delete a custom plan
const deleteCustomPlan = async (req, res) => {
  try {
    const plan = await CustomPlan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!plan) {
      return res.status(404).json({ message: 'Custom plan not found' });
    }
    res.json({ message: 'Custom plan deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete custom plan', error: err.message });
  }
};

// GET /api/custom-plans/active -> Get currently active custom plan for user
const getActiveCustomPlan = async (req, res) => {
  try {
    const activePlan = await CustomPlan.findOne({ user: req.user._id, isActive: true }).populate({
      path: 'days.exercises',
      populate: { path: 'template' },
    });

    let formatted = null;
    if (activePlan) {
      formatted = {
        _id: activePlan._id,
        user: activePlan.user,
        name: activePlan.name,
        goal: activePlan.goal,
        durationWeeks: activePlan.durationWeeks,
        isActive: activePlan.isActive,
        createdAt: activePlan.createdAt,
        days: formatCustomPlanDays(activePlan.days),
      };
    }

    res.json({ activePlan: formatted });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch active custom plan', error: err.message });
  }
};

// PUT /api/custom-plans/:id/set-active -> Set specific custom plan as active
const setActiveCustomPlan = async (req, res) => {
  try {
    await CustomPlan.updateMany({ user: req.user._id }, { isActive: false });
    const plan = await CustomPlan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: true },
      { new: true }
    ).populate({
      path: 'days.exercises',
      populate: { path: 'template' },
    });

    if (!plan) {
      return res.status(404).json({ message: 'Custom plan not found' });
    }

    const formatted = {
      _id: plan._id,
      user: plan.user,
      name: plan.name,
      goal: plan.goal,
      durationWeeks: plan.durationWeeks,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      days: formatCustomPlanDays(plan.days),
    };

    res.json({ plan: formatted, message: `${plan.name} set as active plan` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to set active plan', error: err.message });
  }
};

// PUT /api/custom-plans/reset-default-active -> Reset to Default Plan
const resetDefaultActivePlanRequest = async (req, res) => {
  try {
    await CustomPlan.updateMany({ user: req.user._id }, { isActive: false });
    res.json({ message: 'Reset to default workout plan' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset active plan', error: err.message });
  }
};

module.exports = {
  getCustomPlans,
  createCustomPlan,
  getCustomPlanById,
  updatePlanDayExercises,
  reorderPlanDays,
  reorderDayExercises,
  restoreDefaultPlan,
  deleteCustomPlan,
  getActiveCustomPlan,
  setActiveCustomPlan,
  resetDefaultActivePlan: resetDefaultActivePlanRequest,
};
