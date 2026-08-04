const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCustomPlans,
  createCustomPlan,
  getCustomPlanById,
  updatePlanDayExercises,
  reorderPlanDays,
  reorderDayExercises,
  restoreDefaultPlan,
  deleteCustomPlan,
  getActiveCustomPlan,
  setActiveCustomPlan,
  resetDefaultActivePlan,
} = require('../controllers/customPlanController');

const router = express.Router();

router.use(protect);

router.get('/', getCustomPlans);
router.post('/', createCustomPlan);
router.get('/active', getActiveCustomPlan);
router.put('/reset-default', resetDefaultActivePlan);
router.put('/:id/set-active', setActiveCustomPlan);
router.get('/:id', getCustomPlanById);
router.put('/:id/reorder-days', reorderPlanDays);
router.put('/:id/restore-default', restoreDefaultPlan);
router.put('/:id/days/:dayNumber', updatePlanDayExercises);
router.put('/:id/days/:dayNumber/reorder-exercises', reorderDayExercises);
router.delete('/:id', deleteCustomPlan);

module.exports = router;
