const fs = require('fs');
const Exercise = require('../models/Exercise');
const ExerciseTemplate = require('../models/ExerciseTemplate');
const ExerciseVideo = require('../models/ExerciseVideo');
const UserExerciseOverload = require('../models/UserExerciseOverload');
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

// Helper for normalized duplicate exercise name validation
const normalizeExerciseName = (name) => {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
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

// GET /api/exercises/admin/all -> Admin fetch all master exercises
const getAllMasterExercisesAdmin = async (req, res) => {
  try {
    const templates = await ExerciseTemplate.find({}).sort({ category: 1, name: 1 });
    res.json({ exercises: templates });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch master exercises', error: err.message });
  }
};

// POST /api/exercises/admin/create -> Admin create a new global master exercise template
const createMasterExerciseAdmin = async (req, res) => {
  try {
    const {
      name,
      category,
      muscleGroup,
      secondaryMuscleGroup,
      imageUrl,
      notes,
      instructions,
      sets,
      repsRange,
      defaultRestSeconds,
    } = req.body;

    if (!name || !category || !muscleGroup) {
      return res.status(400).json({ message: 'Exercise name, category, and primary muscle group are required.' });
    }

    const normalizedName = normalizeExerciseName(name);

    // Duplicate Exercise Name Validation (Case-insensitive, whitespace-trimmed, multi-space collapsed)
    const existing = await ExerciseTemplate.findOne({
      name: new RegExp(`^${normalizedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i'),
    });

    if (existing) {
      return res.status(400).json({
        message: `An exercise named "${existing.name}" already exists in the master exercise database. Please use a different name or edit the existing exercise.`,
        isDuplicate: true,
        existingId: existing._id,
        existingName: existing.name,
      });
    }

    const template = await ExerciseTemplate.create({
      name: normalizedName,
      category,
      muscleGroup: muscleGroup.trim(),
      secondaryMuscleGroup: secondaryMuscleGroup ? secondaryMuscleGroup.trim() : '',
      imageUrl: imageUrl || '',
      notes: notes ? notes.trim() : '',
      instructions: instructions ? instructions.trim() : '',
      sets: parseInt(sets, 10) || 3,
      repsRange: repsRange || '8-12',
      defaultRestSeconds: parseInt(defaultRestSeconds, 10) || 90,
    });

    res.status(201).json({ message: `Master exercise "${template.name}" created successfully.`, exercise: template });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create master exercise', error: err.message });
  }
};

// PUT /api/exercises/admin/:id -> Admin edit existing master exercise template
const updateMasterExerciseAdmin = async (req, res) => {
  try {
    const template = await ExerciseTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Master exercise template not found' });

    const {
      name,
      category,
      muscleGroup,
      secondaryMuscleGroup,
      imageUrl,
      notes,
      instructions,
      sets,
      repsRange,
      defaultRestSeconds,
    } = req.body;

    if (name) {
      const normalizedName = normalizeExerciseName(name);
      // Duplicate Name Validation (Ignoring current exercise _id)
      const existing = await ExerciseTemplate.findOne({
        _id: { $ne: template._id },
        name: new RegExp(`^${normalizedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i'),
      });

      if (existing) {
        return res.status(400).json({
          message: `An exercise named "${existing.name}" already exists in the master exercise database. Please use a different name.`,
          isDuplicate: true,
          existingId: existing._id,
          existingName: existing.name,
        });
      }
      template.name = normalizedName;
    }

    if (category) template.category = category;
    if (muscleGroup) template.muscleGroup = muscleGroup.trim();
    if (secondaryMuscleGroup !== undefined) template.secondaryMuscleGroup = secondaryMuscleGroup.trim();
    if (imageUrl !== undefined) template.imageUrl = imageUrl.trim();
    if (notes !== undefined) template.notes = notes.trim();
    if (instructions !== undefined) template.instructions = instructions.trim();
    if (sets !== undefined) template.sets = parseInt(sets, 10) || 3;
    if (repsRange !== undefined) template.repsRange = repsRange;
    if (defaultRestSeconds !== undefined) template.defaultRestSeconds = parseInt(defaultRestSeconds, 10) || 90;

    await template.save();
    res.json({ message: `Master exercise "${template.name}" updated successfully.`, exercise: template });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update master exercise', error: err.message });
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

    let userProfile = null;
    if (req.user && template) {
      userProfile = await UserExerciseOverload.findOne({ user: req.user._id, template: template._id });
    }

    const details = {
      _id: exercise ? exercise._id : template._id,
      templateId: template._id,
      name: template.name,
      category: template.category,
      muscleGroup: template.muscleGroup,
      secondaryMuscleGroup: template.secondaryMuscleGroup || '',
      targetMuscle: template.targetMuscle,
      imageUrl: template.imageUrl,
      notes: template.notes || '',
      instructions: template.instructions || '',
      sets: template.sets || 3,
      repsRange: template.repsRange || '8-12',
      defaultRestSeconds: template.defaultRestSeconds || 90,
      benefits: template.benefits,
      tips: template.tips,
      commonMistakes: template.commonMistakes,
      currentWeight: userProfile ? userProfile.currentWeight : 0,
      autoProgressiveEnabled: userProfile ? !!userProfile.autoProgressiveEnabled : false,
      increaseIntervalWeeks: userProfile ? userProfile.increaseIntervalWeeks : 3,
      increaseWeightKg: userProfile ? userProfile.increaseWeightKg : 2.5,
      startDate: userProfile ? userProfile.startDate : null,
      nextIncreaseDate: userProfile ? userProfile.nextIncreaseDate : null,
      lastIncreaseDate: userProfile ? userProfile.lastIncreaseDate : null,
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
      'secondaryMuscleGroup',
      'targetMuscle',
      'benefits',
      'tips',
      'commonMistakes',
      'imageUrl',
      'notes',
      'instructions',
      'sets',
      'repsRange',
      'defaultRestSeconds',
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

    let profile = null;
    if (req.user) {
      profile = await UserExerciseOverload.findOne({ user: req.user._id, template: template._id });
    }

    res.json({
      templateId: template._id,
      autoProgressiveEnabled: profile ? profile.autoProgressiveEnabled : false,
      increaseIntervalWeeks: profile ? profile.increaseIntervalWeeks : 3,
      increaseWeightKg: profile ? profile.increaseWeightKg : 2.5,
      startDate: profile ? profile.startDate : null,
      nextIncreaseDate: profile ? profile.nextIncreaseDate : null,
      lastIncreaseDate: profile ? profile.lastIncreaseDate : null,
      currentWeight: profile ? profile.currentWeight : 0,
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
      updatedAt: now,
    };

    if (currentWeight !== undefined && currentWeight !== null && !isNaN(parseFloat(currentWeight))) {
      payload.currentWeight = parseFloat(currentWeight);
    }

    if (req.user) {
      if (applyToAllExercises) {
        const templates = await ExerciseTemplate.find({});
        for (const tpl of templates) {
          await UserExerciseOverload.findOneAndUpdate(
            { user: req.user._id, template: tpl._id },
            { $set: payload },
            { upsert: true, new: true }
          );
        }
      } else {
        await UserExerciseOverload.findOneAndUpdate(
          { user: req.user._id, template: template._id },
          { $set: payload },
          { upsert: true, new: true }
        );
      }
    }

    const userProfile = req.user
      ? await UserExerciseOverload.findOne({ user: req.user._id, template: template._id })
      : null;

    return res.json({
      message: applyToAllExercises
        ? 'Auto-overload settings applied to all exercise templates'
        : 'Auto-overload settings updated',
      exercise: {
        _id: template._id,
        templateId: template._id,
        name: template.name,
        currentWeight: userProfile ? userProfile.currentWeight : 0,
        autoProgressiveEnabled: userProfile ? !!userProfile.autoProgressiveEnabled : false,
        increaseIntervalWeeks: userProfile ? userProfile.increaseIntervalWeeks : 3,
        increaseWeightKg: userProfile ? userProfile.increaseWeightKg : 2.5,
        startDate: userProfile ? userProfile.startDate : null,
        nextIncreaseDate: userProfile ? userProfile.nextIncreaseDate : null,
        lastIncreaseDate: userProfile ? userProfile.lastIncreaseDate : null,
      },
    });
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

        let oldWeight = tpl.currentWeight || 0;
        if (req.user) {
          const userOverload = await UserExerciseOverload.findOne({ user: req.user._id, template: tpl._id });
          if (userOverload && userOverload.currentWeight > 0) {
            oldWeight = userOverload.currentWeight;
          }
        }

        const newWeight = oldWeight + tpl.increaseWeightKg * numIntervals;

        if (req.user) {
          await UserExerciseOverload.findOneAndUpdate(
            { user: req.user._id, template: tpl._id },
            { $set: { currentWeight: newWeight, updatedAt: now } },
            { upsert: true, new: true }
          );
        }

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
  getAllMasterExercisesAdmin,
  createMasterExerciseAdmin,
  updateMasterExerciseAdmin,
  getExerciseDetails,
  updateExercise,
  deleteExercise,
  uploadExerciseImage,
  uploadExerciseVideo,
  getAutoOverloadSettings,
  updateAutoOverloadSettings,
  checkAutoOverloadProgressions,
};
