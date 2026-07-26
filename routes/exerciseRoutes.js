const express = require('express');
const {
  getAllExercisesUser,
  getExerciseDetails,
  updateExercise,
  deleteExercise,
  uploadExerciseImage,
  uploadExerciseVideo,
  getAutoOverloadSettings,
  updateAutoOverloadSettings,
  checkAutoOverloadProgressions,
} = require('../controllers/exerciseController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

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
