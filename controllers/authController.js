const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const SystemSetting = require('../models/SystemSetting');

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'progressfit.app@gmail.com').trim().toLowerCase();

/**
 * Generate JWT token for approved user sessions
 */
const generateToken = (userId, tokenVersion = 0, rememberMe = true) => {
  const expiresIn = rememberMe ? '365d' : '24h';
  return jwt.sign({ id: userId, tokenVersion }, process.env.JWT_SECRET, { expiresIn });
};

/**
 * POST /api/auth/signup
 * Respects requireRegistrationApproval system setting (default: false / Direct Login)
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

    // Check system setting for registration approval requirement
    const approvalSetting = await SystemSetting.findOne({ key: 'requireRegistrationApproval' });
    const requireApproval = approvalSetting ? !!approvalSetting.value : false; // Default: false (Direct Login)

    // C2: Allow re-registration if previous account was Rejected
    if (existingUser) {
      if (existingUser.status === 'Rejected') {
        const nextStatus = requireApproval ? 'Pending' : 'Approved';
        // Reset the rejected account back with updated details
        existingUser.name = name.trim();
        existingUser.password = password; // will be hashed by pre-save hook
        existingUser.phoneNumber = phoneNumber ? phoneNumber.trim() : existingUser.phoneNumber;
        existingUser.status = nextStatus;
        existingUser.rejectionReason = '';
        existingUser.statusChangedAt = new Date();
        existingUser.statusChangedBy = null;
        existingUser.tokenVersion = (existingUser.tokenVersion || 0) + 1; // Invalidate any old sessions
        await existingUser.save();

        try {
          await AuditLog.create({
            action: 'USER_RE_REGISTERED',
            targetUser: existingUser._id,
            details: `User re-registered after previous rejection (status: ${nextStatus})`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent') || '',
          });
        } catch (auditErr) {
          console.warn('[re-registration AuditLog Warning]:', auditErr.message);
        }

        return res.status(201).json({
          message: nextStatus === 'Approved'
            ? 'Account re-registered successfully! You can now log in immediately.'
            : 'Your re-registration request has been submitted. Please wait for administrator approval.',
          status: nextStatus,
        });
      }

      // For all other statuses (Pending, Approved, Suspended) — block duplicate registration
      return res.status(400).json({ message: 'An account with this email address already exists.' });
    }

    // Auto-approve Super Admin or if requireApproval setting is Disabled
    const isSuperAdmin = normalizedEmail === SUPER_ADMIN_EMAIL;
    const initialStatus = isSuperAdmin || !requireApproval ? 'Approved' : 'Pending';

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      status: initialStatus,
      isAdmin: isSuperAdmin,
      statusChangedAt: new Date(),
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
          title: user.status === 'Approved' ? 'New User Registered' : 'New Account Approval Request',
          message: user.status === 'Approved'
            ? `${user.name} (${user.email}) has registered and account is Approved (Direct Login).`
            : `${user.name} (${user.email}) has registered and is waiting for account approval.`,
          relatedUser: user._id,
        });

        await AuditLog.create({
          action: 'USER_REGISTERED',
          targetUser: user._id,
          details: `New registration submitted by ${user.name} (status: ${user.status})`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent') || '',
        });
      }
    } catch (auditErr) {
      console.warn('[signup AuditLog Warning]:', auditErr.message);
    }

    res.status(201).json({
      message: user.status === 'Approved'
        ? 'Account created successfully! You can now log in immediately.'
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
        message: 'No account found with this email address. Please submit a registration request first before logging in.',
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

    const token = generateToken(user._id, user.tokenVersion || 0, rememberMe);

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
