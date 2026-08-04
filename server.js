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

const app = express();

app.use(cors());
app.use(express.json());

// Serve exercise images statically from the exercise folder
app.use('/exercise-images', express.static(path.join(__dirname, 'exercise')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/workout-days', workoutDayRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workout-history', workoutHistoryRoutes);
app.use('/api/progressive-overload', progressiveOverloadRoutes);
app.use('/api/user-overload', userOverloadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/custom-plans', customPlanRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
