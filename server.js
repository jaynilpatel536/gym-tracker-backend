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

const seedAppVersion103 = async () => {
  try {
    await AppVersion.findOneAndUpdate(
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
    console.log('[Auto-Seed]: Version 1.0.3 successfully registered in MongoDB Atlas');
  } catch (e) {
    console.warn('[Auto-Seed Warning]:', e.message);
  }
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    seedAppVersion103();
    // M3: Run cleanup once on start, then repeat every 24h while server is up
    runRejectedCleanupJob();
    setInterval(runRejectedCleanupJob, 24 * 60 * 60 * 1000);
  });
});
