const express = require('express');
const {
  getUsers,
  getUserById,
  approveUser,
  rejectUser,
  suspendUser,
  getNotifications,
  markNotificationsRead,
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication & admin role (`protect` + `admin`)
router.use(protect, admin);

router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/approve', approveUser);
router.put('/users/:id/reject', rejectUser);
router.put('/users/:id/suspend', suspendUser);

router.get('/notifications', getNotifications);
router.put('/notifications/mark-read', markNotificationsRead);

module.exports = router;
