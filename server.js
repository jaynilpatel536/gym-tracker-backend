require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const workoutDayRoutes = require('./routes/workoutDayRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const workoutHistoryRoutes = require('./routes/workoutHistoryRoutes');
const progressiveOverloadRoutes = require('./routes/progressiveOverloadRoutes');
const userOverloadRoutes = require('./routes/userOverloadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const customPlanRoutes = require('./routes/customPlanRoutes');
const personalExerciseRoutes = require('./routes/personalExerciseRoutes');
const appVersionRoutes = require('./routes/appVersionRoutes');
const { runRejectedCleanupJob } = require('./controllers/adminController');

const app = express();

app.use(cors());
app.use(express.json());

// Serve exercise images statically from the exercise folder
app.use('/exercise-images', express.static(path.join(__dirname, 'exercise')));
// Serve release APK files statically from the releases folder
app.use('/releases', express.static(path.join(__dirname, 'releases')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/workout-days', workoutDayRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workout-history', workoutHistoryRoutes);
app.use('/api/progressive-overload', progressiveOverloadRoutes);
app.use('/api/user-overload', userOverloadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/custom-plans', customPlanRoutes);
app.use('/api/personal-exercises', personalExerciseRoutes);
app.use('/api/app-version', appVersionRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const AppVersion = require('./models/AppVersion');

const seedAppVersion102 = async () => {
  try {
    await AppVersion.findOneAndUpdate(
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
    console.log('[Auto-Seed]: Version 1.0.2 successfully registered in MongoDB Atlas');
  } catch (e) {
    console.warn('[Auto-Seed Warning]:', e.message);
  }
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    seedAppVersion102();
    // M3: Run cleanup once on start, then repeat every 24h while server is up
    runRejectedCleanupJob();
    setInterval(runRejectedCleanupJob, 24 * 60 * 60 * 1000);
  });
});
