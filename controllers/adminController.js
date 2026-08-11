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
    if (status === 'Pending') {
      query.$or = [
        { status: 'Pending' },
        { status: { $exists: false } },
        { status: null },
        { status: '' },
      ];
    } else if (status && ['Approved', 'Rejected', 'Suspended'].includes(status)) {
      query.status = status;
    }

    if (search && search.trim()) {
      // BUG-009 FIX: Escape all special regex chars to prevent ReDoS attack
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      const searchCondition = [
        { name: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchCondition }];
        delete query.$or;
      } else {
        query.$or = searchCondition;
      }
    }

    const [users, total, pendingCount, approvedCount, rejectedCount, suspendedCount] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      User.countDocuments(query),
      User.countDocuments({
        $or: [{ status: 'Pending' }, { status: { $exists: false } }, { status: null }, { status: '' }],
      }),
      User.countDocuments({ status: 'Approved' }),
      User.countDocuments({ status: 'Rejected' }),
      User.countDocuments({ status: 'Suspended' }),
    ]);

    // Ensure all returned users have an explicit status field
    const normalizedUsers = users.map((u) => {
      const uObj = u.toObject();
      if (!uObj.status) {
        uObj.status = uObj.isAdmin ? 'Approved' : 'Pending';
      }
      return uObj;
    });

    res.json({
      users: normalizedUsers,
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
    try {
      await AuditLog.create({
        action: 'USER_APPROVED',
        performedBy: req.user._id,
        targetUser: user._id,
        details: `User approved by admin ${req.user.name} (${req.user.email})`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
      });
    } catch (auditErr) {
      console.warn('[approveUser AuditLog Warning]:', auditErr.message);
    }

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
    try {
      await AuditLog.create({
        action: 'USER_REJECTED',
        performedBy: req.user._id,
        targetUser: user._id,
        details: `User rejected: ${user.rejectionReason}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
      });
    } catch (auditErr) {
      console.warn('[rejectUser AuditLog Warning]:', auditErr.message);
    }

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
    try {
      await AuditLog.create({
        action: 'USER_SUSPENDED',
        performedBy: req.user._id,
        targetUser: user._id,
        details: `User suspended by admin ${req.user.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
      });
    } catch (auditErr) {
      console.warn('[suspendUser AuditLog Warning]:', auditErr.message);
    }

    res.json({ message: `Account for ${user.name} has been suspended.`, user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to suspend user', error: err.message });
  }
};

// PUT /api/admin/users/:id/reset-password -> Reset user password (Admin only)
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword.trim();
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate previous active tokens
    await user.save();

    try {
      await AuditLog.create({
        action: 'USER_PASSWORD_RESET_BY_ADMIN',
        performedBy: req.user._id,
        targetUser: user._id,
        details: `Password for ${user.name} (${user.email}) was reset by admin ${req.user.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
      });
    } catch (auditErr) {
      console.warn('[resetUserPassword AuditLog Warning]:', auditErr.message);
    }

    res.json({ message: `Password for ${user.name} has been reset successfully.`, user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset user password', error: err.message });
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

// POST /api/admin/cleanup-rejected -> M3: Delete rejected accounts older than 7 days
const cleanupRejectedAccounts = async (req, res) => {
  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Find rejected accounts older than 7 days
    const staleRejected = await User.find({
      status: 'Rejected',
      statusChangedAt: { $lte: cutoffDate },
    });

    if (staleRejected.length === 0) {
      return res.json({ message: 'No stale rejected accounts found.', deleted: 0 });
    }

    const userIds = staleRejected.map((u) => u._id);

    // AuditLog entries are preserved (they ref targetUser by ID — not cascade deleted)
    await User.deleteMany({ _id: { $in: userIds } });

    // Also remove any unresolved notifications for these users
    await Notification.deleteMany({ relatedUser: { $in: userIds } });

    try {
      await AuditLog.create({
        action: 'USER_REJECTED',
        performedBy: req.user._id,
        targetUser: req.user._id,
        details: `Auto-cleanup: Deleted ${staleRejected.length} rejected accounts older than 7 days. Emails: ${staleRejected.map((u) => u.email).join(', ')}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
      });
    } catch (auditErr) {
      console.warn('[cleanupRejected AuditLog Warning]:', auditErr.message);
    }

    res.json({
      message: `Cleaned up ${staleRejected.length} rejected account(s) older than 7 days.`,
      deleted: staleRejected.length,
      deletedEmails: staleRejected.map((u) => u.email),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cleanup rejected accounts', error: err.message });
  }
};

// Internal helper: run cleanup without HTTP context (called on server start)
const runRejectedCleanupJob = async () => {
  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const staleRejected = await User.find({
      status: 'Rejected',
      statusChangedAt: { $lte: cutoffDate },
    });
    if (staleRejected.length > 0) {
      const userIds = staleRejected.map((u) => u._id);
      await User.deleteMany({ _id: { $in: userIds } });
      await Notification.deleteMany({ relatedUser: { $in: userIds } });
      console.log(`[Cleanup Job] Deleted ${staleRejected.length} stale rejected account(s).`);
    }
  } catch (err) {
    console.error('[Cleanup Job Error]:', err.message);
  }
};

module.exports = {
  getUsers,
  getUserById,
  approveUser,
  rejectUser,
  suspendUser,
  resetUserPassword,
  getNotifications,
  markNotificationsRead,
  cleanupRejectedAccounts,
  runRejectedCleanupJob,
};
