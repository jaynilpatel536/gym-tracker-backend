const User = require('../models/User');
const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// GET /api/admin/users -> List users with status filters, search & pagination
const getUsers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const query = {};
    if (status && ['Pending', 'Approved', 'Rejected', 'Suspended'].includes(status)) {
      query.status = status;
    }
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }, { phoneNumber: searchRegex }];
    }

    const [users, total, pendingCount, approvedCount, rejectedCount, suspendedCount] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      User.countDocuments(query),
      User.countDocuments({ status: 'Pending' }),
      User.countDocuments({ status: 'Approved' }),
      User.countDocuments({ status: 'Rejected' }),
      User.countDocuments({ status: 'Suspended' }),
    ]);

    res.json({
      users,
      counts: {
        Pending: pendingCount,
        Approved: approvedCount,
        Rejected: rejectedCount,
        Suspended: suspendedCount,
      },
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

// GET /api/admin/users/:id -> Get single user details & audit history
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const auditLogs = await AuditLog.find({ targetUser: user._id })
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ user, auditLogs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user details', error: err.message });
  }
};

// PUT /api/admin/users/:id/approve -> Approve pending user
const approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.status = 'Approved';
    user.statusChangedAt = new Date();
    user.statusChangedBy = req.user._id;
    user.rejectionReason = '';
    await user.save();

    // Auto-resolve pending registration notifications for this user
    await Notification.updateMany(
      { relatedUser: user._id, type: NOTIFICATION_TYPES.NEW_REGISTRATION },
      { isRead: true, readAt: new Date(), autoResolved: true }
    );

    // Audit log
    await AuditLog.create({
      action: 'USER_APPROVED',
      performedBy: req.user._id,
      targetUser: user._id,
      details: `User approved by admin ${req.user.name} (${req.user.email})`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.json({ message: `Account for ${user.name} has been approved.`, user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve user', error: err.message });
  }
};

// PUT /api/admin/users/:id/reject -> Reject user registration request
const rejectUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.status = 'Rejected';
    user.rejectionReason = reason ? reason.trim() : 'Registration request denied by administrator.';
    user.statusChangedAt = new Date();
    user.statusChangedBy = req.user._id;
    await user.save();

    // Auto-resolve pending registration notifications
    await Notification.updateMany(
      { relatedUser: user._id, type: NOTIFICATION_TYPES.NEW_REGISTRATION },
      { isRead: true, readAt: new Date(), autoResolved: true }
    );

    // Audit log
    await AuditLog.create({
      action: 'USER_REJECTED',
      performedBy: req.user._id,
      targetUser: user._id,
      details: `User rejected: ${user.rejectionReason}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.json({ message: `Registration request for ${user.name} has been rejected.`, user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject user', error: err.message });
  }
};

// PUT /api/admin/users/:id/suspend -> Suspend an approved account
const suspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.isAdmin) {
      return res.status(400).json({ message: 'Cannot suspend an administrator account.' });
    }

    user.status = 'Suspended';
    user.statusChangedAt = new Date();
    user.statusChangedBy = req.user._id;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate active session tokens
    await user.save();

    // Audit log
    await AuditLog.create({
      action: 'USER_SUSPENDED',
      performedBy: req.user._id,
      targetUser: user._id,
      details: `User suspended by admin ${req.user.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.json({ message: `Account for ${user.name} has been suspended.`, user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to suspend user', error: err.message });
  }
};

// GET /api/admin/notifications -> List admin notifications & unread count
const getNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipientRole: 'ADMIN' })
        .populate('relatedUser', 'name email status')
        .sort({ createdAt: -1 })
        .limit(50),
      Notification.countDocuments({ recipientRole: 'ADMIN', isRead: false }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
};

// PUT /api/admin/notifications/mark-read -> Mark notification as read
const markNotificationsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await Notification.updateMany(
        { _id: { $in: notificationIds } },
        { isRead: true, readAt: new Date() }
      );
    } else {
      await Notification.updateMany({ recipientRole: 'ADMIN' }, { isRead: true, readAt: new Date() });
    }

    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark notifications read', error: err.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  approveUser,
  rejectUser,
  suspendUser,
  getNotifications,
  markNotificationsRead,
};
