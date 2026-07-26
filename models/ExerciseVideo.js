const mongoose = require('mongoose');

const exerciseVideoSchema = new mongoose.Schema(
  {
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true, unique: true },
    videoUrl: { type: String, required: true }, // Cloudinary URL only, streamed directly
    videoPublicId: { type: String, default: '' },
    durationSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExerciseVideo', exerciseVideoSchema);
