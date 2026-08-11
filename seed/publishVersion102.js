require('dotenv').config();
const mongoose = require('mongoose');
const AppVersion = require('../models/AppVersion');

const publishVersion102 = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is missing from environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas...');

    const versionDoc = await AppVersion.findOneAndUpdate(
      { platform: 'android', versionCode: 3 },
      {
        $set: {
          platform: 'android',
          versionName: '1.0.2',
          versionCode: 3,
          minimumSupportedVersionCode: 1,
          apkUrl: 'https://gym-tracker-backend-qpu8.onrender.com/releases/application-a985cd8a-c81f-4c2c-b095-244909f73553.apk',
          sha256: '64654ea87377304014a8ea18cf04038af06c1acbfb47b1ae7c6c1e1d5727e0a1',
          fileSizeBytes: 75769552,
          releaseNotes: [
            'Instant 0ms app launch & background verification',
            'Muscle group chip box text readability fix',
            'Multi-user security and cache isolation',
          ],
          forceUpdate: false,
          isActive: true,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    console.log('Successfully published Version 1.0.2 to MongoDB Atlas:', versionDoc);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to publish Version 1.0.2:', err.message);
    process.exit(1);
  }
};

publishVersion102();
