const express = require('express');
const {
  logWorkout,
  getHistoryForExercise,
  syncHistory,
} = require('../controllers/workoutHistoryController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, logWorkout);
router.post('/sync', protect, syncHistory);
router.get('/exercise/:exerciseId', protect, getHistoryForExercise);

module.exports = router;
