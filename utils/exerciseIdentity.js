const mongoose = require('mongoose');
const Exercise = require('../models/Exercise');
const ExerciseTemplate = require('../models/ExerciseTemplate');
const PersonalExercise = require('../models/PersonalExercise');

/**
 * resolveExerciseIdentity
 * Given an exerciseId, determines whether it belongs to:
 *   - An ExerciseTemplate  → { templateId, personalExerciseId: null, isPersonal: false }
 *   - A PersonalExercise   → { templateId: null, personalExerciseId, isPersonal: true }
 *   - A master Exercise    → resolves to its template
 *
 * If a PersonalExercise has been promoted (has promotedTemplateId), use the template ID.
 */
const resolveExerciseIdentity = async (id) => {
  if (!id || typeof id !== 'string' && !(id instanceof mongoose.Types.ObjectId)) {
    return { templateId: null, personalExerciseId: null, isPersonal: false };
  }

  const cleanId = String(id).trim();
  if (!mongoose.Types.ObjectId.isValid(cleanId)) {
    return { templateId: null, personalExerciseId: null, isPersonal: false };
  }

  try {
    // 1. Check ExerciseTemplate first (most common path)
    const template = await ExerciseTemplate.findById(cleanId);
    if (template) {
      return { templateId: template._id, personalExerciseId: null, isPersonal: false };
    }

    // 2. Check PersonalExercise
    const pe = await PersonalExercise.findById(cleanId);
    if (pe) {
      if (pe.promotedTemplateId) {
        return { templateId: pe.promotedTemplateId, personalExerciseId: null, isPersonal: false };
      }
      return { templateId: null, personalExerciseId: pe._id, isPersonal: true };
    }

    // 3. Fallback: try master Exercise (legacy path)
    const exercise = await Exercise.findById(cleanId);
    if (exercise && exercise.template) {
      return { templateId: exercise.template, personalExerciseId: null, isPersonal: false };
    }
  } catch (err) {
    console.warn('[resolveExerciseIdentity] Warning:', err.message);
  }

  return { templateId: null, personalExerciseId: null, isPersonal: false };
};

module.exports = { resolveExerciseIdentity };
