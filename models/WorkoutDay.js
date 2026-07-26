const mongoose = require('mongoose');

const workoutDaySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true, min: 1, max: 7 },
    name: { type: String, required: true }, // e.g. "Pull A", "Rest Day"
    isRestDay: { type: Boolean, default: false },
    recoveryTips: [{ type: String }],
    stretchingSuggestions: [{ type: String }],
    hydrationReminder: { type: String },
  },
  { timestamps: true }
);

// dayNumber is a fixed template (1-7), unique per user's plan copy in future,
// kept globally unique for this single-user app.
workoutDaySchema.index({ dayNumber: 1 }, { unique: true });

module.exports = mongoose.model('WorkoutDay', workoutDaySchema);
