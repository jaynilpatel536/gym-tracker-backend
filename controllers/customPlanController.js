const CustomPlan = require('../models/CustomPlan');
const Exercise = require('../models/Exercise');

const DEFAULT_DAYS = [
  { dayNumber: 1, name: 'Day 1', exercises: [] },
  { dayNumber: 2, name: 'Day 2', exercises: [] },
  { dayNumber: 3, name: 'Day 3', exercises: [] },
  { dayNumber: 4, name: 'Day 4', exercises: [] },
  { dayNumber: 5, name: 'Day 5', exercises: [] },
  { dayNumber: 6, name: 'Day 6', exercises: [] },
  { dayNumber: 7, name: 'Day 7', exercises: [] },
];

// GET /api/custom-plans -> Get all custom plans for logged in user
const getCustomPlans = async (req, res) => {
  try {
    const plans = await CustomPlan.find({ user: req.user._id })
      .populate({
        path: 'days.exercises',
        select: 'name category muscleGroup targetMuscle sets repsRange defaultRestSeconds imageUrl',
      })
      .sort({ createdAt: -1 });

    res.json({ plans });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch custom plans', error: err.message });
  }
};

// POST /api/custom-plans -> Create a new custom plan
const createCustomPlan = async (req, res) => {
  try {
    const { name, goal, durationWeeks } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Plan name is required' });
    }

    const plan = await CustomPlan.create({
      user: req.user._id,
      name: name.trim(),
      goal: goal || 'Muscle Building',
      durationWeeks: parseInt(durationWeeks, 10) || 4,
      days: DEFAULT_DAYS,
    });

    res.status(201).json({ plan });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create custom plan', error: err.message });
  }
};

// GET /api/custom-plans/:id -> Get plan details
const getCustomPlanById = async (req, res) => {
  try {
    const plan = await CustomPlan.findOne({ _id: req.params.id, user: req.user._id }).populate({
      path: 'days.exercises',
      select: 'name category muscleGroup targetMuscle sets repsRange defaultRestSeconds imageUrl',
    });

    if (!plan) {
      return res.status(404).json({ message: 'Custom plan not found' });
    }

    res.json({ plan });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch custom plan', error: err.message });
  }
};

// PUT /api/custom-plans/:id/days/:dayNumber -> Save/Update exercises for a specific day
const updatePlanDayExercises = async (req, res) => {
  try {
    const { exerciseIds } = req.body; // Array of Exercise IDs
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
      select: 'name category muscleGroup targetMuscle sets repsRange defaultRestSeconds imageUrl',
    });

    res.json({ plan: updatedPlan });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update plan exercises', error: err.message });
  }
};

// DELETE /api/custom-plans/:id -> Delete custom plan
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

// GET /api/custom-plans/active -> Get currently active plan
const getActiveCustomPlan = async (req, res) => {
  try {
    const activePlan = await CustomPlan.findOne({ user: req.user._id, isActive: true }).populate({
      path: 'days.exercises',
      select: 'name category muscleGroup targetMuscle sets repsRange defaultRestSeconds imageUrl',
    });

    res.json({ activePlan });
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
      select: 'name category muscleGroup targetMuscle sets repsRange defaultRestSeconds imageUrl',
    });

    if (!plan) {
      return res.status(404).json({ message: 'Custom plan not found' });
    }

    res.json({ plan, message: `${plan.name} set as active plan` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to set active plan', error: err.message });
  }
};

// PUT /api/custom-plans/reset-default-active -> Reset to Default Plan
const resetDefaultActivePlan = async (req, res) => {
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
  deleteCustomPlan,
  getActiveCustomPlan,
  setActiveCustomPlan,
  resetDefaultActivePlan,
};
