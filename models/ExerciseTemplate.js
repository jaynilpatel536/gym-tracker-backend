const mongoose = require('mongoose');

const exerciseTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true }, // e.g. "Compound", "Chest", "Biceps"
    muscleGroup: { type: String, required: true },
    targetMuscle: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    benefits: [{ type: String }],
    tips: [{ type: String }],
    commonMistakes: [{ type: String }],

    // Shared Automatic Progressive Overload Configuration
    autoProgressiveEnabled: { type: Boolean, default: false },
    increaseIntervalWeeks: { type: Number, default: 3 },
    increaseWeightKg: { type: Number, default: 2.5 },
    startDate: { type: Date, default: null },
    nextIncreaseDate: { type: Date, default: null },
    lastIncreaseDate: { type: Date, default: null },
    currentWeight: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExerciseTemplate', exerciseTemplateSchema);
