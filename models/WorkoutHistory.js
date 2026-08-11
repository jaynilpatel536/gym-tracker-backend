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

    // Exactly one of template OR personalExercise must be set.
    // template  → master ExerciseTemplate (standard exercises)
    // personalExercise → user-created PersonalExercise (not yet promoted to master)
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseTemplate', default: null },
    personalExercise: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonalExercise', default: null },

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

// Custom validator: Ensure at least one of template OR personalExercise is populated
workoutHistorySchema.path('template').validate(function () {
  return this.template != null || this.personalExercise != null;
}, 'WorkoutHistory document must reference either a master ExerciseTemplate or a PersonalExercise.');

// Indexes for fast history lookup
workoutHistorySchema.index({ user: 1, template: 1, date: -1 });
workoutHistorySchema.index({ user: 1, personalExercise: 1, date: -1 });
workoutHistorySchema.index({ user: 1, customPlanId: 1, date: -1 });

module.exports = mongoose.model('WorkoutHistory', workoutHistorySchema);
