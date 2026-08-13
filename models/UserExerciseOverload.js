const mongoose = require('mongoose');

const userExerciseOverloadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // One of template OR personalExercise is set
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseTemplate', default: null },
    personalExercise: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonalExercise', default: null },

    // Single Shared Overload Profile per User per Exercise
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

// Compound Unique Partial Indexes to prevent null-value duplicate collisions
userExerciseOverloadSchema.index(
  { user: 1, template: 1 },
  { unique: true, partialFilterExpression: { template: { $type: 'objectId' } } }
);

userExerciseOverloadSchema.index(
  { user: 1, personalExercise: 1 },
  { unique: true, partialFilterExpression: { personalExercise: { $type: 'objectId' } } }
);

module.exports = mongoose.model('UserExerciseOverload', userExerciseOverloadSchema);
