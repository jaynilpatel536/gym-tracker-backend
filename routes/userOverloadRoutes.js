const express = require('express');
const {
  getOverloadProfile,
  updateOverloadProfile,
  getAllUserOverloadProfiles,
} = require('../controllers/userOverloadController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getAllUserOverloadProfiles);
router.get('/:templateId', getOverloadProfile);
router.put('/:templateId', updateOverloadProfile);

module.exports = router;
