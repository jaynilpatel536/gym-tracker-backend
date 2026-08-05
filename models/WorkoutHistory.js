const mongoose = require('mongoose');

const setLogSchema = new mongoose.Schema({
  setNumber: { type: Number, required: true },
  weightKg: { type: Number, required: true },
  reps: { type: Number, required: true },
  completed: { type: Boolean, default: false },
});

const workoutHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseTemplate', required: true },
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
    // workoutDay is optional — null when logging from a custom plan day
    workoutDay: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutDay', default: null },
    // Custom plan tracking (populated when logging from a CustomPlan day)
    customPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomPlan', default: null },
    customDayNumber: { type: Number, default: null },
    date: { type: Date, default: Date.now },
    sets: [setLogSchema],
    notes: { type: String, default: '' },
    isPersonalRecord: { type: Boolean, default: false },
  },
  { timestamps: true }
);

workoutHistorySchema.index({ user: 1, template: 1, date: -1 });
workoutHistorySchema.index({ user: 1, customPlanId: 1, date: -1 });

module.exports = mongoose.model('WorkoutHistory', workoutHistorySchema);
