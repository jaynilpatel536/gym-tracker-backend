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
const AppVersion = require('./models/AppVersion');

const app = express();
const PORT = process.env.PORT || 5000;

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

/**
 * Upserts the current production AppVersion record on server startup.
 * Uses findOneAndUpdate with upsert so it is safe to run repeatedly:
 *   - If no versionCode:4 record exists → creates it.
 *   - If versionCode:4 already exists → updates fields in-place without touching other versions.
 * Does NOT delete historical AppVersion records.
 */
const seedCurrentAppVersion = async () => {
  try {
    await AppVersion.findOneAndUpdate(
      { platform: 'android', versionCode: 4 },
      {
        $set: {
          platform: 'android',
          versionName: '1.0.3',
          versionCode: 4,
          minimumSupportedVersionCode: 1,
          apkUrl: 'https://gym-tracker-backend-qpu8.onrender.com/releases/application-bef3be50-716b-433d-8d32-fb18d59c8145.apk',
          sha256: '7568abc429afa4502d8f160be12980fe87986bfcbd7265d71ce016867a1ef660',
          fileSizeBytes: 75769500,
          releaseNotes: [
            'Direct User Login without admin approval (configurable via Admin Dashboard)',
            'Admin Dashboard System Configuration toggle card',
            'Plan schedule editing navigation fix',
            'Migrated Expo FileSystem API to resolve deprecation warning',
          ],
          forceUpdate: false,
          isActive: true,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log('[AppVersion] v1.0.3 (versionCode 4) seeded successfully.');
  } catch (e) {
    console.warn('[AppVersion] Seed warning:', e.message);
  }
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    seedCurrentAppVersion();
    // Run cleanup once on start, then repeat every 24h
    runRejectedCleanupJob();
    setInterval(runRejectedCleanupJob, 24 * 60 * 60 * 1000);
  });
});
