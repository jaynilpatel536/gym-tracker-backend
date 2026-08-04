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

// User approval / rejection / suspension routes (supports both path formats)
router.put('/users/:id/approve', approveUser);
router.put('/users/approve/:id', approveUser);
router.put('/users/:id/reject', rejectUser);
router.put('/users/reject/:id', rejectUser);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/suspend/:id', suspendUser);

router.get('/users', getUsers);
router.get('/users/:id', getUserById);

router.get('/notifications', getNotifications);
router.put('/notifications/mark-read', markNotificationsRead);

module.exports = router;
