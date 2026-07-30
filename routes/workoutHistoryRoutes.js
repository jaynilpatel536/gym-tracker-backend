const express = require('express');
const {
  logWorkout,
  getHistoryForExercise,
  getExerciseProgressChartData,
  syncHistory,
} = require('../controllers/workoutHistoryController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, logWorkout);
router.post('/sync', protect, syncHistory);
router.get('/exercise/:exerciseId', protect, getHistoryForExercise);
router.get('/progress/:exerciseId', protect, getExerciseProgressChartData);

module.exports = router;
