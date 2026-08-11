const PersonalExercise = require('../models/PersonalExercise');
const ExerciseTemplate = require('../models/ExerciseTemplate');
const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');

const PERSONAL_EXERCISE_LIMIT = 15;

// POST /api/personal-exercises -> Create a new personal exercise & trigger automatic admin review notification
const createPersonalExercise = async (req, res) => {
  try {
    const { name, category, muscleGroup, imageUrl, notes, instructions } = req.body;
    if (!name || !category || !muscleGroup) {
      return res.status(400).json({ message: 'Exercise name, category, and muscle group are required.' });
    }

    // Check personal exercise limit (15 per user)
    const existingCount = await PersonalExercise.countDocuments({
      createdBy: req.user._id,
      reviewStatus: { $ne: 'Rejected' },
    });

    // Case-insensitive duplicate check for current user's personal exercises
    const escapedName = name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const existingDuplicate = await PersonalExercise.findOne({
      createdBy: req.user._id,
      name: new RegExp(`^${escapedName}$`, 'i'),
      reviewStatus: { $ne: 'Rejected' },
    });

    if (existingDuplicate) {
      return res.status(400).json({
        message: `You already have a personal exercise named "${existingDuplicate.name}". Please use a different name.`,
        isDuplicate: true,
      });
    }

    if (existingCount >= PERSONAL_EXERCISE_LIMIT) {
      return res.status(400).json({
        message: `Personal exercise limit reached (${PERSONAL_EXERCISE_LIMIT}/${PERSONAL_EXERCISE_LIMIT}). Please delete an existing personal exercise or wait for admin approval.`,
        limit: PERSONAL_EXERCISE_LIMIT,
        currentCount: existingCount,
      });
    }

    // Create Personal Exercise
    const personalExercise = await PersonalExercise.create({
      createdBy: req.user._id,
      name: name.trim(),
      category,
      muscleGroup: muscleGroup.trim(),
      imageUrl: imageUrl || '',
      notes: notes ? notes.trim() : '',
      instructions: instructions ? instructions.trim() : '',
      reviewStatus: 'Pending',
    });

    // Automatic submission -> Create Admin Notification
    await Notification.create({
      recipientRole: 'ADMIN',
      type: NOTIFICATION_TYPES.EXERCISE_REVIEW_REQUEST,
      title: '🔔 New Exercise Review Request',
      message: `"${personalExercise.name}" created by ${req.user.name} (${req.user.email}).`,
      relatedUser: req.user._id,
      metadata: { personalExerciseId: personalExercise._id },
    });

    res.status(201).json({
      message: 'Personal exercise created successfully and submitted for admin review.',
      personalExercise,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create personal exercise', error: err.message });
  }
};

// PUT /api/personal-exercises/:id -> Edit user's own personal exercise (ONLY if Pending or Rejected)
const updatePersonalExercise = async (req, res) => {
  try {
    const { name, category, muscleGroup, imageUrl, notes, instructions } = req.body;
    const personalExercise = await PersonalExercise.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!personalExercise) {
      return res.status(404).json({ message: 'Personal exercise not found' });
    }

    if (personalExercise.reviewStatus === 'Approved') {
      return res.status(403).json({
        message: 'This exercise has already been approved by Admin and promoted to the global Master database. Approved exercises can no longer be edited by original creator.',
      });
    }

    if (name) personalExercise.name = name.trim();
    if (category) personalExercise.category = category;
    if (muscleGroup) personalExercise.muscleGroup = muscleGroup.trim();
    if (imageUrl !== undefined) personalExercise.imageUrl = imageUrl.trim();
    if (notes !== undefined) personalExercise.notes = notes.trim();
    if (instructions !== undefined) personalExercise.instructions = instructions.trim();

    await personalExercise.save();

    res.json({
      message: 'Personal exercise updated successfully.',
      personalExercise,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update personal exercise', error: err.message });
  }
};

// GET /api/personal-exercises/me -> Get personal exercises created by current user
const getUserPersonalExercises = async (req, res) => {
  try {
    const personalExercises = await PersonalExercise.find({ createdBy: req.user._id }).sort({
      createdAt: -1,
    });

    const activeCount = personalExercises.filter((e) => e.reviewStatus !== 'Rejected').length;

    res.json({
      personalExercises,
      limit: PERSONAL_EXERCISE_LIMIT,
      activeCount,
      remaining: Math.max(0, PERSONAL_EXERCISE_LIMIT - activeCount),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch personal exercises', error: err.message });
  }
};

// GET /api/personal-exercises/admin/pending -> Admin list all pending exercise review requests
const getPendingPersonalExercises = async (req, res) => {
  try {
    const [requests, pendingCount] = await Promise.all([
      PersonalExercise.find({ reviewStatus: 'Pending' })
        .populate('createdBy', 'name email phoneNumber')
        .sort({ createdAt: -1 }),
      PersonalExercise.countDocuments({ reviewStatus: 'Pending' }),
    ]);

    res.json({ requests, pendingCount });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending exercise requests', error: err.message });
  }
};

// PUT /api/personal-exercises/admin/:id/approve -> Admin edit & approve exercise to global master template
const approvePersonalExercise = async (req, res) => {
  try {
    const { name, category, muscleGroup, imageUrl, notes, instructions } = req.body;
    const personalExercise = await PersonalExercise.findById(req.params.id);

    if (!personalExercise) {
      return res.status(404).json({ message: 'Personal exercise request not found' });
    }

    // Apply admin edits if provided, else use original values
    const finalName = name ? name.trim() : personalExercise.name;
    const finalCategory = category || personalExercise.category;
    const finalMuscleGroup = muscleGroup ? muscleGroup.trim() : personalExercise.muscleGroup;
    const finalImageUrl = imageUrl !== undefined ? imageUrl : personalExercise.imageUrl;
    const finalNotes = notes !== undefined ? notes.trim() : personalExercise.notes;
    const finalInstructions = instructions !== undefined ? instructions.trim() : personalExercise.instructions;

    // Check if matching ExerciseTemplate already exists or create new global master template
    let template = await ExerciseTemplate.findOne({ name: new RegExp(`^${finalName}$`, 'i') });
    if (!template) {
      template = await ExerciseTemplate.create({
        name: finalName,
        category: finalCategory,
        muscleGroup: finalMuscleGroup,
        imageUrl: finalImageUrl,
        notes: finalNotes,
        instructions: finalInstructions,
      });
    }

    // Update PersonalExercise state to Approved
    personalExercise.reviewStatus = 'Approved';
    personalExercise.reviewedBy = req.user._id;
    personalExercise.reviewedAt = new Date();
    personalExercise.promotedTemplateId = template._id;
    await personalExercise.save();

    // Auto-resolve admin notification
    await Notification.updateMany(
      { 'metadata.personalExerciseId': personalExercise._id },
      { isRead: true, readAt: new Date(), autoResolved: true }
    );

    res.json({
      message: `Exercise "${finalName}" approved and added to global master exercise database!`,
      personalExercise,
      promotedTemplate: template,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve personal exercise', error: err.message });
  }
};

// PUT /api/personal-exercises/admin/:id/reject -> Admin reject exercise request
const rejectPersonalExercise = async (req, res) => {
  try {
    const personalExercise = await PersonalExercise.findById(req.params.id);
    if (!personalExercise) {
      return res.status(404).json({ message: 'Personal exercise request not found' });
    }

    personalExercise.reviewStatus = 'Rejected';
    personalExercise.reviewedBy = req.user._id;
    personalExercise.reviewedAt = new Date();
    await personalExercise.save();

    // Auto-resolve admin notification
    await Notification.updateMany(
      { 'metadata.personalExerciseId': personalExercise._id },
      { isRead: true, readAt: new Date(), autoResolved: true }
    );

    res.json({
      message: `Request for "${personalExercise.name}" rejected. Exercise remains private to creator.`,
      personalExercise,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject personal exercise', error: err.message });
  }
};

// DELETE /api/personal-exercises/:id -> Delete user's own personal exercise (ONLY if Pending or Rejected)
const deletePersonalExercise = async (req, res) => {
  try {
    const personalExercise = await PersonalExercise.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!personalExercise) {
      return res.status(404).json({ message: 'Personal exercise not found or access denied' });
    }

    if (personalExercise.reviewStatus === 'Approved') {
      return res.status(403).json({
        message: 'This exercise has been approved and promoted to the global Master database. Approved exercises cannot be deleted.',
      });
    }

    await PersonalExercise.deleteOne({ _id: personalExercise._id });

    res.json({ message: 'Personal exercise deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete personal exercise', error: err.message });
  }
};

module.exports = {
  createPersonalExercise,
  updatePersonalExercise,
  getUserPersonalExercises,
  getPendingPersonalExercises,
  approvePersonalExercise,
  rejectPersonalExercise,
  deletePersonalExercise,
};
