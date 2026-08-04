const express = require('express');
const {
  createPersonalExercise,
  updatePersonalExercise,
  getUserPersonalExercises,
  getPendingPersonalExercises,
  approvePersonalExercise,
  rejectPersonalExercise,
  deletePersonalExercise,
} = require('../controllers/personalExerciseController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createPersonalExercise);
router.get('/me', getUserPersonalExercises);
router.put('/:id', updatePersonalExercise);
router.delete('/:id', deletePersonalExercise);

// Admin-only review endpoints
router.get('/admin/pending', admin, getPendingPersonalExercises);
router.put('/admin/:id/approve', admin, approvePersonalExercise);
router.put('/admin/:id/reject', admin, rejectPersonalExercise);

module.exports = router;
