const AppVersion = require('../models/AppVersion');

const ensureLatestVersion103 = async () => {
  try {
    await AppVersion.deleteMany({});
    return await AppVersion.create({
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
    });
  } catch (e) {
    console.warn('[ensureLatestVersion103 Warning]:', e.message);
    return null;
  }
};

// GET /api/app-version/android -> Get latest active Android version metadata
const getLatestAndroidVersion = async (req, res) => {
  try {
    let versionDoc = await AppVersion.findOne({ platform: 'android', versionCode: 4 });
    if (!versionDoc) {
      versionDoc = await ensureLatestVersion103();
    }

    if (!versionDoc) {
      // Default fallback if no version document has been seeded in MongoDB yet
      return res.json({
        latestVersion: '1.0.0',
        versionCode: 1,
        minimumSupportedVersionCode: 1,
        apkUrl: '',
        sha256: '',
        fileSizeBytes: 0,
        releaseNotes: ['Initial release'],
        forceUpdate: false,
        isFallback: true,
      });
    }

    res.json({
      latestVersion: versionDoc.versionName,
      versionCode: versionDoc.versionCode,
      minimumSupportedVersionCode: versionDoc.minimumSupportedVersionCode,
      apkUrl: versionDoc.apkUrl,
      sha256: versionDoc.sha256,
      fileSizeBytes: versionDoc.fileSizeBytes,
      releaseNotes: versionDoc.releaseNotes || [],
      forceUpdate: !!versionDoc.forceUpdate,
      createdAt: versionDoc.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch app version', error: err.message });
  }
};

// POST /api/app-version/android -> Admin publish or update release version metadata
const publishAndroidVersion = async (req, res) => {
  try {
    const {
      versionName,
      versionCode,
      minimumSupportedVersionCode,
      apkUrl,
      sha256,
      fileSizeBytes,
      releaseNotes,
      forceUpdate,
    } = req.body;

    if (!versionName || !versionCode || !apkUrl || !sha256) {
      return res.status(400).json({
        message: 'versionName, versionCode, apkUrl, and sha256 are required fields.',
      });
    }

    const versionDoc = await AppVersion.findOneAndUpdate(
      { platform: 'android', versionCode: parseInt(versionCode, 10) },
      {
        $set: {
          platform: 'android',
          versionName: String(versionName).trim(),
          versionCode: parseInt(versionCode, 10),
          minimumSupportedVersionCode: parseInt(minimumSupportedVersionCode || versionCode, 10),
          apkUrl: String(apkUrl).trim(),
          sha256: String(sha256).trim().toLowerCase(),
          fileSizeBytes: parseInt(fileSizeBytes || 0, 10),
          releaseNotes: Array.isArray(releaseNotes) ? releaseNotes : [releaseNotes].filter(Boolean),
          forceUpdate: !!forceUpdate,
          isActive: true,
          publishedBy: req.user._id,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({
      message: `Version ${versionDoc.versionName} (Build ${versionDoc.versionCode}) published successfully!`,
      version: versionDoc,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to publish app version', error: err.message });
  }
};

module.exports = {
  getLatestAndroidVersion,
  publishAndroidVersion,
};
