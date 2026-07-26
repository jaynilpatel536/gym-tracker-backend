const express = require('express');
const { getProgressiveOverload } = require('../controllers/progressiveOverloadController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/:exerciseId', protect, getProgressiveOverload);

module.exports = router;
