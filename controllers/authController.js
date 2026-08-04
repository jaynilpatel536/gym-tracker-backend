const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'progressfit.app@gmail.com').trim().toLowerCase();

/**
 * Generate JWT token for approved user sessions
 */
const generateToken = (userId, rememberMe = true) => {
  const expiresIn = rememberMe ? '365d' : '24h';
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

/**
 * POST /api/auth/signup
 * Always creates non-admin accounts as 'Pending'
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
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email address already exists.' });
    }

    // Auto-approve Super Admin
    const isSuperAdmin = normalizedEmail === SUPER_ADMIN_EMAIL;
    const initialStatus = isSuperAdmin ? 'Approved' : 'Pending';

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      status: initialStatus,
      isAdmin: isSuperAdmin,
    });

    try {
      if (isSuperAdmin) {
        await AuditLog.create({
          action: 'SUPER_ADMIN_REGISTERED',
          targetUser: user._id,
          details: `Super Admin registered (${user.email})`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent') || '',
        });
      } else {
        // Create admin notification
        await Notification.create({
          recipientRole: 'ADMIN',
          type: NOTIFICATION_TYPES.NEW_REGISTRATION,
          title: 'New Account Approval Request',
          message: `${user.name} (${user.email}) has registered and is waiting for account approval.`,
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
    } catch (auditErr) {
      console.warn('[signup AuditLog Warning]:', auditErr.message);
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
 * Authenticates ONLY Approved users with distinct Email vs Password error messages
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

    // Distinct Error 1: Email Address Not Found
    if (!user || !user.password) {
      return res.status(400).json({
        message: 'No account found with this email address. Please check your email or request registration.',
        errorType: 'EMAIL_NOT_FOUND',
      });
    }

    // Distinct Error 2: Password Incorrect
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Incorrect password. Please check your password and try again.',
        errorType: 'INVALID_PASSWORD',
      });
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

    user.rememberMe = !!rememberMe;
    await user.save();

    const token = generateToken(user._id, rememberMe);

    try {
      await AuditLog.create({
        action: 'USER_LOGIN',
        performedBy: user._id,
        targetUser: user._id,
        details: `User ${user.email} logged in successfully`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
      });
    } catch (auditErr) {
      console.warn('[login AuditLog Warning]:', auditErr.message);
    }

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
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

/**
 * GET /api/auth/me
 * Returns profile for current authenticated session
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status !== 'Approved') {
      return res.status(403).json({
        message: `Account status is ${user.status}. Access denied.`,
        status: user.status,
      });
    }

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
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user profile', error: err.message });
  }
};

module.exports = {
  signup,
  login,
  getMe,
};
