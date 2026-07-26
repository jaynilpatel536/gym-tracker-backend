const User = require('../models/User');
const Exercise = require('../models/Exercise');
const WorkoutDay = require('../models/WorkoutDay');
const WorkoutHistory = require('../models/WorkoutHistory');

const ADMIN_EMAIL = 'progressfit.app@gmail.com';

// Middleware to ensure user is admin
const adminOnly = (req, res, next) => {
  if (req.user && (req.user.email === ADMIN_EMAIL || req.user.isAdmin)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
};

// GET /api/admin/stats
const getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const totalExercises = await Exercise.countDocuments({});
    const totalWorkoutDays = await WorkoutDay.countDocuments({});
    const totalWorkoutLogs = await WorkoutHistory.countDocuments({});

    res.json({
      stats: {
        totalUsers,
        totalExercises,
        totalWorkoutDays,
        totalWorkoutLogs,
        serverStatus: 'Operational',
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch admin stats', error: err.message });
  }
};

// --- USER MANAGEMENT (CRUD) ---
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, isAdmin } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      isAdmin: !!isAdmin || normalizedEmail === ADMIN_EMAIL,
    });
    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create user', error: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, isAdmin } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (typeof isAdmin === 'boolean') user.isAdmin = isAdmin || user.email === ADMIN_EMAIL;

    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.email === ADMIN_EMAIL) {
      return res.status(400).json({ message: 'Primary admin user cannot be deleted' });
    }
    await WorkoutHistory.deleteMany({ user: user._id });
    await user.deleteOne();
    res.json({ message: 'User and user data deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
};

const fs = require('fs');
const { uploadToCloudinary } = require('../config/cloudinary');

// --- EXERCISE MANAGEMENT (CRUD) ---
const getAllExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find({}).populate('workoutDay', 'name dayNumber').sort({ createdAt: -1 });
    res.json({ exercises });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch exercises', error: err.message });
  }
};

const createExercise = async (req, res) => {
  try {
    const {
      workoutDay,
      name,
      category,
      muscleGroup,
      targetMuscle,
      sets,
      repsRange,
      defaultRestSeconds,
      imageUrl,
      benefits,
      tips,
      commonMistakes,
    } = req.body;

    if (!workoutDay || !name || !category || !muscleGroup) {
      return res.status(400).json({ message: 'Workout day, name, category, and muscle group are required' });
    }

    const order = (await Exercise.countDocuments({ workoutDay })) + 1;
    const exercise = await Exercise.create({
      workoutDay,
      order,
      name: name.trim(),
      category: category.trim(),
      muscleGroup: muscleGroup.trim(),
      targetMuscle: targetMuscle ? targetMuscle.trim() : '',
      sets: parseInt(sets, 10) || 3,
      repsRange: repsRange || '8-12',
      defaultRestSeconds: parseInt(defaultRestSeconds, 10) || 90,
      imageUrl: imageUrl || '',
      benefits: Array.isArray(benefits) ? benefits : [],
      tips: Array.isArray(tips) ? tips : [],
      commonMistakes: Array.isArray(commonMistakes) ? commonMistakes : [],
    });

    res.status(201).json({ exercise });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create exercise', error: err.message });
  }
};

const updateExerciseAdmin = async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
    res.json({ exercise });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update exercise', error: err.message });
  }
};

const reorderExercisesAdmin = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'items array is required' });
    }

    const updates = items.map((item) =>
      Exercise.findByIdAndUpdate(item.id || item._id, { order: item.order })
    );
    await Promise.all(updates);

    res.json({ message: 'Exercise order updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reorder exercises', error: err.message });
  }
};

const uploadExerciseImageAdmin = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const result = await uploadToCloudinary(req.file.path, {
      type: 'images',
      publicId: `exercise_img_${exercise._id}`,
    });
    fs.unlink(req.file.path, () => {});

    exercise.imageUrl = result.secure_url;
    exercise.imagePublicId = result.public_id;
    await exercise.save();

    res.json({ exercise });
  } catch (err) {
    res.status(500).json({ message: 'Image upload failed', error: err.message });
  }
};

const deleteExerciseAdmin = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
    await exercise.deleteOne();
    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete exercise', error: err.message });
  }
};

// --- WORKOUT DAY MANAGEMENT (CRUD) ---
const getAllWorkoutDays = async (req, res) => {
  try {
    const days = await WorkoutDay.find({}).sort({ dayNumber: 1 });
    res.json({ days });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch workout days', error: err.message });
  }
};

const createWorkoutDay = async (req, res) => {
  try {
    const { dayNumber, name, isRestDay, recoveryTips, stretchingSuggestions, hydrationReminder } = req.body;
    if (!dayNumber || !name) {
      return res.status(400).json({ message: 'dayNumber and name are required' });
    }
    const day = await WorkoutDay.create({
      dayNumber: parseInt(dayNumber, 10),
      name,
      isRestDay: !!isRestDay,
      recoveryTips: recoveryTips || [],
      stretchingSuggestions: stretchingSuggestions || [],
      hydrationReminder: hydrationReminder || '',
    });
    res.status(201).json({ day });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create workout day', error: err.message });
  }
};

const updateWorkoutDayAdmin = async (req, res) => {
  try {
    const day = await WorkoutDay.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!day) return res.status(404).json({ message: 'Workout day not found' });
    res.json({ day });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update workout day', error: err.message });
  }
};

const deleteWorkoutDayAdmin = async (req, res) => {
  try {
    const day = await WorkoutDay.findById(req.params.id);
    if (!day) return res.status(404).json({ message: 'Workout day not found' });
    await Exercise.deleteMany({ workoutDay: day._id });
    await day.deleteOne();
    res.json({ message: 'Workout day and associated exercises deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete workout day', error: err.message });
  }
};

module.exports = {
  adminOnly,
  getSystemStats,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllExercises,
  createExercise,
  updateExerciseAdmin,
  reorderExercisesAdmin,
  uploadExerciseImageAdmin,
  deleteExerciseAdmin,
  getAllWorkoutDays,
  createWorkoutDay,
  updateWorkoutDayAdmin,
  deleteWorkoutDayAdmin,
};
