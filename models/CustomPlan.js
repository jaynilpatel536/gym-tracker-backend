const mongoose = require('mongoose');

const customPlanDaySchema = new mongoose.Schema({
  dayNumber: { type: Number, required: true, min: 1, max: 7 },
  name: { type: String, required: true },
  exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }],
});

const customPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    goal: {
      type: String,
      enum: ['Muscle Building', 'Fat Loss', 'Powerlifting'],
      default: 'Muscle Building',
    },
    durationWeeks: { type: Number, default: 4 },
    isActive: { type: Boolean, default: false },
    days: [customPlanDaySchema],
  },
  { timestamps: true }
);

// Compound index for user & active custom plan queries
customPlanSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('CustomPlan', customPlanSchema);
