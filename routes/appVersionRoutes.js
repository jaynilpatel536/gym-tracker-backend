const express = require('express');
const router = express.Router();
const AppVersion = require('../models/AppVersion');
const { getLatestAndroidVersion, publishAndroidVersion } = require('../controllers/appVersionController');
const { protect, admin } = require('../middleware/auth');

// Public route for mobile app version check
router.get('/android', getLatestAndroidVersion);

// Helper route to seed Version 1.0.3 (Build 4) into MongoDB Atlas
router.get('/seed-v103', async (req, res) => {
  try {
    const versionDoc = await AppVersion.findOneAndUpdate(
      { platform: 'android', versionCode: 4 },
      {
        $set: {
          platform: 'android',
          versionName: '1.0.3',
          versionCode: 4,
          minimumSupportedVersionCode: 1,
          apkUrl: 'https://gym-tracker-backend-qpu8.onrender.com/releases/application-4ea2ba98-93d2-4bc5-b15f-8ba1f11a6481.apk',
          sha256: '8f486ba62716b036307bf657da23709c8320b11cd97fb912f02bf1f547feeecd',
          fileSizeBytes: 75773012,
          releaseNotes: [
            'Direct User Login without admin approval (configurable via Admin Dashboard)',
            'Admin Dashboard System Configuration toggle card',
            'Plan schedule editing navigation fix',
          ],
          forceUpdate: false,
          isActive: true,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ message: 'Version 1.0.3 published to MongoDB Atlas!', version: versionDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper route to force publish Version 1.0.3 (Build 4) into MongoDB Atlas
router.get('/force-publish-v103', async (req, res) => {
  try {
    await AppVersion.deleteMany({});
    const doc = await AppVersion.create({
      platform: 'android',
      versionName: '1.0.3',
      versionCode: 4,
      minimumSupportedVersionCode: 1,
      apkUrl: 'https://gym-tracker-backend-qpu8.onrender.com/releases/application-4ea2ba98-93d2-4bc5-b15f-8ba1f11a6481.apk',
      sha256: '8f486ba62716b036307bf657da23709c8320b11cd97feeecd',
      fileSizeBytes: 75773012,
      releaseNotes: [
        'Direct User Login without admin approval (configurable via Admin Dashboard)',
        'Admin Dashboard System Configuration toggle card',
        'Plan schedule editing navigation fix',
      ],
      forceUpdate: false,
      isActive: true,
    });
    return res.json({ success: true, version: doc });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Protected admin route to publish new release version
router.post('/android', protect, admin, publishAndroidVersion);

module.exports = router;
