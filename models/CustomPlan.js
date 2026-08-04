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

    // User-Specific Built-In Plan Copy Support (Default Plan 1 & Plan 2)
    planCode: { type: String, default: null, index: true }, // 'plan1' or 'plan2'
    isBuiltInCopy: { type: Boolean, default: false },

    days: [customPlanDaySchema],
  },
  { timestamps: true }
);

// Compound indexes for fast active plan and built-in plan copy lookups
customPlanSchema.index({ user: 1, isActive: 1 });
customPlanSchema.index({ user: 1, planCode: 1 });

module.exports = mongoose.model('CustomPlan', customPlanSchema);
