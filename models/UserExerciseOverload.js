const mongoose = require('mongoose');

const userExerciseOverloadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // One of template OR personalExercise must be set (plan-agnostic overload profile)
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseTemplate', default: null, index: true },
    personalExercise: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonalExercise', default: null, index: true },

    // Single Shared Overload Profile per User per Exercise Template
    currentWeight: { type: Number, default: 0 },
    targetReps: { type: Number, default: 0 },
    lastReps: { type: Number, default: 0 },

    autoProgressiveEnabled: { type: Boolean, default: false },
    increaseIntervalWeeks: { type: Number, default: 3 },
    increaseWeightKg: { type: Number, default: 2.5 },
    startDate: { type: Date, default: null },
    nextIncreaseDate: { type: Date, default: null },
    lastIncreaseDate: { type: Date, default: null },

    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Compound Unique Index: One overload profile per user per ExerciseTemplate
userExerciseOverloadSchema.index({ user: 1, template: 1 }, { unique: true, sparse: true });
// Compound Unique Index: One overload profile per user per PersonalExercise
userExerciseOverloadSchema.index({ user: 1, personalExercise: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('UserExerciseOverload', userExerciseOverloadSchema);
