const express = require('express');
const { getAllDays, getDayByNumber } = require('../controllers/workoutDayController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getAllDays);
router.get('/:dayNumber', protect, getDayByNumber);

module.exports = router;
