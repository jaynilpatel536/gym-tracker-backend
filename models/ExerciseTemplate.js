const mongoose = require('mongoose');

const exerciseTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true }, // e.g. "Push", "Pull", "Legs", "Core", "Cardio", "Full Body"
    muscleGroup: { type: String, required: true },
    secondaryMuscleGroup: { type: String, default: '' },
    targetMuscle: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    notes: { type: String, default: '' },
    instructions: { type: String, default: '' },
    benefits: [{ type: String }],
    tips: [{ type: String }],
    commonMistakes: [{ type: String }],

    // Default parameters for new instances
    sets: { type: Number, default: 3 },
    repsRange: { type: String, default: '8-12' },
    defaultRestSeconds: { type: Number, default: 90 },

    // Default Progressive Overload Fallback Defaults
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
