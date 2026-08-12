const AppVersion = require('../models/AppVersion');

// GET /api/app-version/android -> Get latest active Android version metadata
const getLatestAndroidVersion = async (req, res) => {
  try {
    const versions = await AppVersion.find({ platform: 'android', isActive: true })
      .sort({ versionCode: -1 })
      .limit(1);
    const versionDoc = versions && versions.length > 0 ? versions[0] : null;

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
