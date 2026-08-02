const fs = require('fs');
const Exercise = require('../models/Exercise');
const ExerciseTemplate = require('../models/ExerciseTemplate');
const ExerciseVideo = require('../models/ExerciseVideo');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// Helper to resolve an Exercise ID or ExerciseTemplate ID to an ExerciseTemplate document
const resolveTemplate = async (id) => {
  let template = await ExerciseTemplate.findById(id);
  if (!template) {
    const exercise = await Exercise.findById(id);
    if (exercise && exercise.template) {
      template = await ExerciseTemplate.findById(exercise.template);
    }
  }
  return template;
};

// GET /api/exercises -> Fetch all available system exercises/templates
const getAllExercisesUser = async (req, res) => {
  try {
    const templates = await ExerciseTemplate.find({}).sort({ name: 1 });
    res.json({ exercises: templates });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch exercises', error: err.message });
  }
};

// GET /api/exercises/:id -> Exercise Details screen
const getExerciseDetails = async (req, res) => {
  try {
    let exercise = await Exercise.findById(req.params.id).populate('template');
    let template = null;
    if (exercise && exercise.template) {
      template = exercise.template;
    } else {
      template = await ExerciseTemplate.findById(req.params.id);
    }

    if (!template) return res.status(404).json({ message: 'Exercise not found' });

    const video = await ExerciseVideo.findOne({ exercise: exercise ? exercise._id : template._id });

    const details = {
      _id: exercise ? exercise._id : template._id,
      templateId: template._id,
      name: template.name,
      category: template.category,
      muscleGroup: template.muscleGroup,
      targetMuscle: template.targetMuscle,
      imageUrl: template.imageUrl,
      benefits: template.benefits,
      tips: template.tips,
      commonMistakes: template.commonMistakes,
      currentWeight: template.currentWeight,
      autoProgressiveEnabled: template.autoProgressiveEnabled,
      increaseIntervalWeeks: template.increaseIntervalWeeks,
      increaseWeightKg: template.increaseWeightKg,
      startDate: template.startDate,
      nextIncreaseDate: template.nextIncreaseDate,
      lastIncreaseDate: template.lastIncreaseDate,
    };

    res.json({
      exercise: details,
      video: video ? { videoUrl: video.videoUrl, durationSeconds: video.durationSeconds } : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch exercise details', error: err.message });
  }
};

// PUT /api/exercises/:id -> Edit Exercise Template
const updateExercise = async (req, res) => {
  try {
    const template = await resolveTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: 'Exercise not found' });

    const allowedFields = [
      'name',
      'category',
      'muscleGroup',
      'targetMuscle',
      'benefits',
      'tips',
      'commonMistakes',
      'imageUrl',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) template[field] = req.body[field];
    });

    await template.save();
    res.json({ exercise: template });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update exercise', error: err.message });
  }
};

// DELETE /api/exercises/:id -> Delete Exercise
const deleteExercise = async (req, res) => {
  try {
    const template = await resolveTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: 'Exercise not found' });

    if (template.imagePublicId) {
      await deleteFromCloudinary(template.imagePublicId, 'image');
    }
    await Exercise.deleteMany({ template: template._id });
    await template.deleteOne();

    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete exercise', error: err.message });
  }
};

// POST /api/exercises/:id/image -> Upload exercise image
const uploadExerciseImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });

    const template = await resolveTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: 'Exercise not found' });

    const result = await uploadToCloudinary(req.file.path, {
      type: 'images',
      publicId: `template_${template._id}`,
    });
    fs.unlink(req.file.path, () => {});

    template.imageUrl = result.secure_url;
    template.imagePublicId = result.public_id;
    await template.save();

    res.json({ imageUrl: template.imageUrl });
  } catch (err) {
    res.status(500).json({ message: 'Image upload failed', error: err.message });
  }
};

// POST /api/exercises/:id/video -> Upload exercise video
const uploadExerciseVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file provided' });

    const template = await resolveTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: 'Exercise not found' });

    const result = await uploadToCloudinary(req.file.path, {
      type: 'videos',
      publicId: `template_${template._id}`,
    });
    fs.unlink(req.file.path, () => {});

    const video = await ExerciseVideo.findOneAndUpdate(
      { exercise: template._id },
      {
        exercise: template._id,
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
    const template = await resolveTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: 'Exercise not found' });

    res.json({
      templateId: template._id,
      autoProgressiveEnabled: template.autoProgressiveEnabled,
      increaseIntervalWeeks: template.increaseIntervalWeeks,
      increaseWeightKg: template.increaseWeightKg,
      startDate: template.startDate,
      nextIncreaseDate: template.nextIncreaseDate,
      lastIncreaseDate: template.lastIncreaseDate,
      currentWeight: template.currentWeight,
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

    const template = await resolveTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: 'Exercise not found' });

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
      startDate,
      nextIncreaseDate,
      lastIncreaseDate,
    };

    if (currentWeight !== undefined && currentWeight !== null && !isNaN(parseFloat(currentWeight))) {
      payload.currentWeight = parseFloat(currentWeight);
    }

    if (applyToAllExercises) {
      await ExerciseTemplate.updateMany({}, { $set: payload });
      const updated = await ExerciseTemplate.findById(template._id);
      return res.json({ message: 'Auto-overload settings applied to all exercise templates', exercise: updated });
    } else {
      Object.assign(template, payload);
      await template.save();
      return res.json({ message: 'Auto-overload settings updated', exercise: template });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to update overload settings', error: err.message });
  }
};

// POST /api/exercises/check-auto-overload -> Check and apply due weight increases on ExerciseTemplates
const checkAutoOverloadProgressions = async (req, res) => {
  try {
    const templates = await ExerciseTemplate.find({ autoProgressiveEnabled: true });
    const now = new Date();
    const applied = [];

    for (const tpl of templates) {
      if (tpl.nextIncreaseDate && new Date(tpl.nextIncreaseDate) <= now) {
        const intervalMs = tpl.increaseIntervalWeeks * 7 * 24 * 60 * 60 * 1000;
        const nextTime = new Date(tpl.nextIncreaseDate).getTime();
        const elapsedMs = now.getTime() - nextTime + intervalMs;
        const numIntervals = Math.max(1, Math.floor(elapsedMs / intervalMs));

        const oldWeight = tpl.currentWeight || 0;
        const newWeight = oldWeight + tpl.increaseWeightKg * numIntervals;

        tpl.currentWeight = newWeight;
        tpl.lastIncreaseDate = now;
        tpl.nextIncreaseDate = new Date(nextTime + numIntervals * intervalMs);
        await tpl.save();

        applied.push({
          templateId: tpl._id,
          exerciseName: tpl.name,
          oldWeight,
          newWeight,
          nextIncreaseDate: tpl.nextIncreaseDate,
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
