const mongoose = require('mongoose');

const userExerciseOverloadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseTemplate', required: true, index: true },

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

// Compound Unique Index: Exactly one overload profile per user per exercise template!
userExerciseOverloadSchema.index({ user: 1, template: 1 }, { unique: true });

module.exports = mongoose.model('UserExerciseOverload', userExerciseOverloadSchema);
