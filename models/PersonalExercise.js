const mongoose = require('mongoose');

const personalExerciseSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['Push', 'Pull', 'Legs', 'Core', 'Cardio', 'Full Body'],
      required: true,
    },
    muscleGroup: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    instructions: {
      type: String,
      default: '',
    },
    reviewStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    promotedTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExerciseTemplate',
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
personalExerciseSchema.index({ createdBy: 1, name: 1 });
personalExerciseSchema.index({ reviewStatus: 1, createdAt: -1 });

module.exports = mongoose.model('PersonalExercise', personalExerciseSchema);
