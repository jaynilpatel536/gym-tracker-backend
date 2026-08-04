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

// Unambiguous User Management Endpoints
router.all('/approve-user/:id', approveUser);
router.all('/reject-user/:id', rejectUser);
router.all('/suspend-user/:id', suspendUser);

// Legacy Path Pattern Support
router.all('/users/:id/approve', approveUser);
router.all('/users/approve/:id', approveUser);
router.all('/users/:id/reject', rejectUser);
router.all('/users/reject/:id', rejectUser);
router.all('/users/:id/suspend', suspendUser);
router.all('/users/suspend/:id', suspendUser);

router.get('/users', getUsers);
router.get('/users/:id', getUserById);

router.get('/notifications', getNotifications);
router.all('/notifications/mark-read', markNotificationsRead);

module.exports = router;
