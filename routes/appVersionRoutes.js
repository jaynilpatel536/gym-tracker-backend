const express = require('express');
const router = express.Router();
const { getLatestAndroidVersion, publishAndroidVersion } = require('../controllers/appVersionController');
const { protect, admin } = require('../middleware/auth');

// Public route for mobile app version check
router.get('/android', getLatestAndroidVersion);

// Protected admin route to publish new release version
router.post('/android', protect, admin, publishAndroidVersion);

module.exports = router;
