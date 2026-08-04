const UserExerciseOverload = require('../models/UserExerciseOverload');
const ExerciseTemplate = require('../models/ExerciseTemplate');

// GET /api/user-overload/:templateId -> Get or create overload profile for (user, template)
const getOverloadProfile = async (req, res) => {
  try {
    const { templateId } = req.params;
    let profile = await UserExerciseOverload.findOne({
      user: req.user._id,
      template: templateId,
    }).populate('template');

    if (!profile) {
      // Check if ExerciseTemplate exists
      const templateDoc = await ExerciseTemplate.findById(templateId);
      if (!templateDoc) {
        return res.status(404).json({ message: 'Exercise template not found' });
      }

      // Create default overload profile for this user & template
      profile = await UserExerciseOverload.create({
        user: req.user._id,
        template: templateId,
        currentWeight: templateDoc.currentWeight || 0,
        increaseWeightKg: templateDoc.increaseWeightKg || 2.5,
        increaseIntervalWeeks: templateDoc.increaseIntervalWeeks || 3,
        autoProgressiveEnabled: templateDoc.autoProgressiveEnabled || false,
      });

      profile = await profile.populate('template');
    }

    res.json({ profile });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch overload profile', error: err.message });
  }
};

// PUT /api/user-overload/:templateId -> Update overload profile for (user, template)
const updateOverloadProfile = async (req, res) => {
  try {
    const { templateId } = req.params;
    const {
      currentWeight,
      autoProgressiveEnabled,
      increaseIntervalWeeks,
      increaseWeightKg,
      startDate,
      nextIncreaseDate,
      lastIncreaseDate,
      notes,
    } = req.body;

    const updateFields = {};
    if (currentWeight !== undefined) updateFields.currentWeight = parseFloat(currentWeight);
    if (autoProgressiveEnabled !== undefined) updateFields.autoProgressiveEnabled = !!autoProgressiveEnabled;
    if (increaseIntervalWeeks !== undefined) updateFields.increaseIntervalWeeks = parseInt(increaseIntervalWeeks, 10);
    if (increaseWeightKg !== undefined) updateFields.increaseWeightKg = parseFloat(increaseWeightKg);
    if (startDate !== undefined) updateFields.startDate = startDate;
    if (nextIncreaseDate !== undefined) updateFields.nextIncreaseDate = nextIncreaseDate;
    if (lastIncreaseDate !== undefined) updateFields.lastIncreaseDate = lastIncreaseDate;
    if (notes !== undefined) updateFields.notes = notes.trim();

    const profile = await UserExerciseOverload.findOneAndUpdate(
      { user: req.user._id, template: templateId },
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    ).populate('template');

    res.json({ message: 'Progressive overload profile updated', profile });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update overload profile', error: err.message });
  }
};

// GET /api/user-overload -> Get all overload profiles for current user (pre-warms local cache)
const getAllUserOverloadProfiles = async (req, res) => {
  try {
    const profiles = await UserExerciseOverload.find({ user: req.user._id }).populate('template');
    res.json({ profiles });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user overload profiles', error: err.message });
  }
};

module.exports = {
  getOverloadProfile,
  updateOverloadProfile,
  getAllUserOverloadProfiles,
};
