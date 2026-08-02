const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    workoutDay: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutDay', required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseTemplate', required: true },
    order: { type: Number, required: true }, // display order within the day, e.g. "Exercise 1 / 10"
    sets: { type: Number, required: true },
    repsRange: { type: String, required: true }, // e.g. "8-10" or "Failure"
    defaultRestSeconds: { type: Number, default: 90 },
  },
  { timestamps: true }
);

exerciseSchema.index({ workoutDay: 1, order: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);
