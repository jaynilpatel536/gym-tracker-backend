const fs = require('fs');
const Exercise = require('../models/Exercise');
const ExerciseVideo = require('../models/ExerciseVideo');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// GET /api/exercises -> Fetch all available system exercises
const getAllExercisesUser = async (req, res) => {
  try {
    const exercises = await Exercise.find({}).sort({ name: 1 });
    res.json({ exercises });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch exercises', error: err.message });
  }
};

// GET /api/exercises/:id -> Exercise Details screen
const getExerciseDetails = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const video = await ExerciseVideo.findOne({ exercise: exercise._id });

    res.json({
      exercise,
      video: video ? { videoUrl: video.videoUrl, durationSeconds: video.durationSeconds } : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch exercise details', error: err.message });
  }
};

// PUT /api/exercises/:id -> Edit Exercise
const updateExercise = async (req, res) => {
  try {
    const allowedFields = [
      'name',
      'category',
      'muscleGroup',
      'targetMuscle',
      'sets',
      'repsRange',
      'defaultRestSeconds',
      'benefits',
      'tips',
      'commonMistakes',
      'order',
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const exercise = await Exercise.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    res.json({ exercise });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update exercise', error: err.message });
  }
};

// DELETE /api/exercises/:id -> Delete Exercise
const deleteExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    if (exercise.imagePublicId) {
      await deleteFromCloudinary(exercise.imagePublicId, 'image');
    }
    const video = await ExerciseVideo.findOne({ exercise: exercise._id });
    if (video?.videoPublicId) {
      await deleteFromCloudinary(video.videoPublicId, 'video');
    }
    await ExerciseVideo.deleteOne({ exercise: exercise._id });
    await exercise.deleteOne();

    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete exercise', error: err.message });
  }
};

// POST /api/exercises/:id/image -> multipart upload, stores only the Cloudinary URL
const uploadExerciseImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });

    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const result = await uploadToCloudinary(req.file.path, {
      type: 'images',
      publicId: `exercise_${exercise._id}`,
    });
    fs.unlink(req.file.path, () => {});

    exercise.imageUrl = result.secure_url;
    exercise.imagePublicId = result.public_id;
    await exercise.save();

    res.json({ imageUrl: exercise.imageUrl });
  } catch (err) {
    res.status(500).json({ message: 'Image upload failed', error: err.message });
  }
};

// POST /api/exercises/:id/video -> multipart upload, stores only the Cloudinary URL
const uploadExerciseVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file provided' });

    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const result = await uploadToCloudinary(req.file.path, {
      type: 'videos',
      publicId: `exercise_${exercise._id}`,
    });
    fs.unlink(req.file.path, () => {});

    const video = await ExerciseVideo.findOneAndUpdate(
      { exercise: exercise._id },
      {
        exercise: exercise._id,
        videoUrl: result.secure_url,
        videoPublicId: result.public_id,
        durationSeconds: Math.round(result.duration || 0),
      },
      { upsert: true, new: true }
    );

    res.json({ videoUrl: video.videoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Video upload failed', error: err.message });
  }
};

// GET /api/exercises/:id/auto-overload -> Get auto-progression settings
const getAutoOverloadSettings = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    res.json({
      autoProgressiveEnabled: exercise.autoProgressiveEnabled,
      increaseIntervalWeeks: exercise.increaseIntervalWeeks,
      increaseWeightKg: exercise.increaseWeightKg,
      applyToAllExercises: exercise.applyToAllExercises,
      startDate: exercise.startDate,
      nextIncreaseDate: exercise.nextIncreaseDate,
      lastIncreaseDate: exercise.lastIncreaseDate,
      currentWeight: exercise.currentWeight,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch overload settings', error: err.message });
  }
};

// PUT /api/exercises/:id/auto-overload -> Update auto-progression settings
const updateAutoOverloadSettings = async (req, res) => {
  try {
    const {
      autoProgressiveEnabled,
      increaseIntervalWeeks,
      increaseWeightKg,
      applyToAllExercises,
      currentWeight,
    } = req.body;

    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const now = new Date();
    const intervalWeeks = parseInt(increaseIntervalWeeks, 10) || 3;
    const weightKg = parseFloat(increaseWeightKg) || 2.5;

    let startDate = null;
    let nextIncreaseDate = null;
    let lastIncreaseDate = null;

    if (autoProgressiveEnabled) {
      startDate = now;
      lastIncreaseDate = now;
      nextIncreaseDate = new Date(now.getTime() + intervalWeeks * 7 * 24 * 60 * 60 * 1000);
    }

    const payload = {
      autoProgressiveEnabled: !!autoProgressiveEnabled,
      increaseIntervalWeeks: intervalWeeks,
      increaseWeightKg: weightKg,
      applyToAllExercises: !!applyToAllExercises,
      startDate,
      nextIncreaseDate,
      lastIncreaseDate,
    };

    if (currentWeight !== undefined && currentWeight !== null && !isNaN(parseFloat(currentWeight))) {
      payload.currentWeight = parseFloat(currentWeight);
    }

    if (applyToAllExercises) {
      await Exercise.updateMany({}, { $set: payload });
      const updated = await Exercise.findById(req.params.id);
      return res.json({ message: 'Auto-overload settings applied to all exercises', exercise: updated });
    } else {
      Object.assign(exercise, payload);
      await exercise.save();
      return res.json({ message: 'Auto-overload settings updated', exercise });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to update overload settings', error: err.message });
  }
};

// POST /api/exercises/check-auto-overload -> Check and apply due weight increases
const checkAutoOverloadProgressions = async (req, res) => {
  try {
    const exercises = await Exercise.find({ autoProgressiveEnabled: true });
    const now = new Date();
    const applied = [];

    for (const ex of exercises) {
      if (ex.nextIncreaseDate && new Date(ex.nextIncreaseDate) <= now) {
        const intervalMs = ex.increaseIntervalWeeks * 7 * 24 * 60 * 60 * 1000;
        const nextTime = new Date(ex.nextIncreaseDate).getTime();
        const elapsedMs = now.getTime() - nextTime + intervalMs;
        const numIntervals = Math.max(1, Math.floor(elapsedMs / intervalMs));

        const oldWeight = ex.currentWeight || 0;
        const newWeight = oldWeight + ex.increaseWeightKg * numIntervals;

        ex.currentWeight = newWeight;
        ex.lastIncreaseDate = now;
        ex.nextIncreaseDate = new Date(nextTime + numIntervals * intervalMs);
        await ex.save();

        applied.push({
          exerciseId: ex._id,
          exerciseName: ex.name,
          oldWeight,
          newWeight,
        });
      }
    }

    res.json({ applied });
  } catch (err) {
    res.status(500).json({ message: 'Failed to check auto overload', error: err.message });
  }
};

module.exports = {
  getAllExercisesUser,
  getExerciseDetails,
  updateExercise,
  deleteExercise,
  uploadExerciseImage,
  uploadExerciseVideo,
  getAutoOverloadSettings,
  updateAutoOverloadSettings,
  checkAutoOverloadProgressions,
};
