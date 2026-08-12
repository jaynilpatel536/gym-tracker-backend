const express = require('express');
const router = express.Router();
const { getLatestAndroidVersion, publishAndroidVersion } = require('../controllers/appVersionController');
const { protect, admin } = require('../middleware/auth');

// Public route for mobile app version check
// Returns the highest versionCode active Android release
router.get('/android', getLatestAndroidVersion);

// Protected admin-only route to publish a new release version
router.post('/android', protect, admin, publishAndroidVersion);

module.exports = router;
