const mongoose = require('mongoose');

const workoutDaySchema = new mongoose.Schema(
  {
    planCode: { type: String, default: 'plan1' }, // 'plan1' or 'plan2'
    dayNumber: { type: Number, required: true, min: 1, max: 7 },
    name: { type: String, required: true }, // e.g. "Pull A", "Rest Day"
    isRestDay: { type: Boolean, default: false },
    recoveryTips: [{ type: String }],
    stretchingSuggestions: [{ type: String }],
    hydrationReminder: { type: String },
  },
  { timestamps: true }
);

workoutDaySchema.index({ planCode: 1, dayNumber: 1 }, { unique: true });

module.exports = mongoose.model('WorkoutDay', workoutDaySchema);
