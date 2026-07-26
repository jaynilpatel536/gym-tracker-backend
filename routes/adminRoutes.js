const express = require('express');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
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
} = require('../controllers/adminController');

const router = express.Router();

// Apply auth + admin restriction to all routes
router.use(protect, adminOnly);

// System Stats
router.get('/stats', getSystemStats);

// User Management (CRUD)
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Exercise Management (CRUD)
router.get('/exercises', getAllExercises);
router.post('/exercises', createExercise);
router.put('/exercises/reorder', reorderExercisesAdmin);
router.put('/exercises/:id', updateExerciseAdmin);
router.post('/exercises/:id/image', upload.single('image'), uploadExerciseImageAdmin);
router.delete('/exercises/:id', deleteExerciseAdmin);

// Workout Day Management (CRUD)
router.get('/workout-days', getAllWorkoutDays);
router.post('/workout-days', createWorkoutDay);
router.put('/workout-days/:id', updateWorkoutDayAdmin);
router.delete('/workout-days/:id', deleteWorkoutDayAdmin);

module.exports = router;
