const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    workoutDay: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutDay', required: true },
    order: { type: Number, required: true }, // display order within the day, e.g. "Exercise 1 / 10"
    name: { type: String, required: true },
    category: { type: String, required: true }, // e.g. "Compound", "Chest", "Biceps"
    muscleGroup: { type: String, required: true },
    targetMuscle: { type: String, default: '' },
    sets: { type: Number, required: true },
    repsRange: { type: String, required: true }, // e.g. "8-10" or "Failure"
    defaultRestSeconds: { type: Number, default: 90 },
    imageUrl: { type: String, default: '' }, // Cloudinary URL only
    imagePublicId: { type: String, default: '' },
    benefits: [{ type: String }],
    tips: [{ type: String }],
    commonMistakes: [{ type: String }],
    // Automatic Progressive Overload Settings
    autoProgressiveEnabled: { type: Boolean, default: false },
    increaseIntervalWeeks: { type: Number, default: 3 },
    increaseWeightKg: { type: Number, default: 2.5 },
    applyToAllExercises: { type: Boolean, default: false },
    startDate: { type: Date, default: null },
    nextIncreaseDate: { type: Date, default: null },
    lastIncreaseDate: { type: Date, default: null },
    currentWeight: { type: Number, default: 0 },
  },
  { timestamps: true }
);

exerciseSchema.index({ workoutDay: 1, order: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);
