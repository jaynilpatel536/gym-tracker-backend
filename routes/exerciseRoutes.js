const express = require('express');
const {
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
} = require('../controllers/exerciseController');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Admin routes
router.get('/admin/all', protect, admin, getAllMasterExercisesAdmin);
router.post('/admin/create', protect, admin, createMasterExerciseAdmin);
router.put('/admin/:id', protect, admin, updateMasterExerciseAdmin);

// Standard protected user routes
router.get('/', protect, getAllExercisesUser);
router.post('/check-auto-overload', protect, checkAutoOverloadProgressions);
router.get('/:id/auto-overload', protect, getAutoOverloadSettings);
router.put('/:id/auto-overload', protect, updateAutoOverloadSettings);
router.get('/:id', protect, getExerciseDetails);
router.put('/:id', protect, updateExercise);
router.delete('/:id', protect, deleteExercise);
router.post('/:id/image', protect, upload.single('image'), uploadExerciseImage);
router.post('/:id/video', protect, upload.single('video'), uploadExerciseVideo);

module.exports = router;
