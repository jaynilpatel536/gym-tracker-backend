const User = require('../models/User');
const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const generateToken = require('../utils/generateToken');

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'progressfit.app@gmail.com').trim().toLowerCase();

/**
 * POST /api/auth/signup
 * Registers a new user with Pending status or re-submits a previously rejected request.
 * NEVER returns a JWT token or creates an authenticated session during signup.
 */
const signup = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isSuperAdmin = normalizedEmail === SUPER_ADMIN_EMAIL;

    const existingUser = await User.findOne({ email: normalizedEmail }).select('+password');

    if (existingUser) {
      if (existingUser.status === 'Pending') {
        return res.status(400).json({
          message: 'Your registration request is already waiting for administrator approval.',
          status: 'Pending',
        });
      }

      if (existingUser.status === 'Approved') {
        return res.status(400).json({ message: 'An account with this email address already exists.' });
      }

      if (existingUser.status === 'Suspended') {
        return res.status(403).json({
          message: 'Your account has been suspended. Please contact the administrator.',
          status: 'Suspended',
        });
      }

      // Re-application for REJECTED user: Update existing record, reset status to Pending
      if (existingUser.status === 'Rejected') {
        existingUser.name = name.trim();
        existingUser.password = password;
        if (phoneNumber) existingUser.phoneNumber = phoneNumber.trim();
        existingUser.status = isSuperAdmin ? 'Approved' : 'Pending';
        existingUser.isAdmin = isSuperAdmin;
        existingUser.rejectionReason = '';
        existingUser.statusChangedAt = new Date();
        await existingUser.save();

        if (!isSuperAdmin) {
          // Create Notification for Admin
          await Notification.create({
            recipientRole: 'ADMIN',
            type: NOTIFICATION_TYPES.NEW_REGISTRATION,
            title: '🔔 New User Registration Request (Re-application)',
            message: `${existingUser.name} (${existingUser.email}) has re-applied for account access.`,
            relatedUser: existingUser._id,
          });

          // Audit log
          await AuditLog.create({
            action: 'USER_RE_REGISTERED',
            targetUser: existingUser._id,
            details: `Rejected user re-applied for registration: ${existingUser.name}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') || '',
          });
        }

        return res.status(201).json({
          message: isSuperAdmin
            ? 'Super Admin account created. Please log in.'
            : 'Registration submitted successfully. Your account is waiting for administrator approval.',
          status: existingUser.status,
        });
      }
    }

    // New user registration
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      status: isSuperAdmin ? 'Approved' : 'Pending',
      isAdmin: isSuperAdmin,
    });

    if (!isSuperAdmin) {
      // Create Admin Notification & Audit Log for non-admin signups
      await Notification.create({
        recipientRole: 'ADMIN',
        type: NOTIFICATION_TYPES.NEW_REGISTRATION,
        title: '🔔 New User Registration Request',
        message: `${user.name} (${user.email}) has requested account access.`,
        relatedUser: user._id,
      });

      await AuditLog.create({
        action: 'USER_REGISTERED',
        targetUser: user._id,
        details: `New registration request submitted by ${user.name}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
      });
    }

    // NEVER return token on signup. Force user to log in after approval.
    res.status(201).json({
      message: isSuperAdmin
        ? 'Super Admin account created successfully. Please log in.'
        : 'Registration submitted successfully. Your account is waiting for administrator approval.',
      status: user.status,
    });
  } catch (err) {
    console.error('[signup Error]:', err.message);
    res.status(500).json({ message: 'Failed to create account', error: err.message });
  }
};

/**
 * POST /api/auth/login
 * Authenticates ONLY Approved users
 */
const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isSuperAdmin = normalizedEmail === SUPER_ADMIN_EMAIL;

    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid email address or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email address or password' });
    }

    // Auto-grant Super Admin
    if (isSuperAdmin && (!user.isAdmin || user.status !== 'Approved')) {
      user.isAdmin = true;
      user.status = 'Approved';
      await user.save();
    }

    // Verify Account Status — Block Non-Approved Accounts
    if (user.status === 'Pending') {
      return res.status(403).json({
        message: 'Your account is waiting for administrator approval. You will be able to log in after your account has been approved.',
        status: 'Pending',
      });
    }

    if (user.status === 'Rejected') {
      const reasonMsg = user.rejectionReason ? ` Rejection note: ${user.rejectionReason}` : '';
      return res.status(403).json({
        message: `Your registration request was rejected.${reasonMsg} Please contact the administrator.`,
        status: 'Rejected',
      });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact the administrator.',
        status: 'Suspended',
      });
    }

    if (user.status !== 'Approved') {
      return res.status(403).json({
        message: 'Access denied. Your account has not been approved.',
        status: user.status,
      });
    }

    // Issue JWT Token ONLY for Approved Users
    const token = generateToken(user._id, !!rememberMe);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        status: user.status,
        isAdmin: !!user.isAdmin,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error('[login Error]:', err.message);
    res.status(500).json({ message: 'Failed to log in', error: err.message });
  }
};

/**
 * GET /api/auth/me
 * Returns logged-in user profile
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.status !== 'Approved') {
      return res.status(403).json({ message: 'Account is not approved', status: user.status });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
};

module.exports = {
  signup,
  login,
  getMe,
};
