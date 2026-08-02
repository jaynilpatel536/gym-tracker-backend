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
    workoutDay: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutDay', required: true },
    date: { type: Date, default: Date.now },
    sets: [setLogSchema],
    notes: { type: String, default: '' },
    isPersonalRecord: { type: Boolean, default: false },
  },
  { timestamps: true }
);

workoutHistorySchema.index({ user: 1, template: 1, date: -1 });

module.exports = mongoose.model('WorkoutHistory', workoutHistorySchema);
