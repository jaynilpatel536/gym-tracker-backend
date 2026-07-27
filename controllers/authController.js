const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const ADMIN_EMAIL = 'progressfit.app@gmail.com';

/**
 * POST /api/auth/signup
 * Registers a new user with Name, Email, and Password
 */
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email address already exists' });
    }

    const isAdminUser = normalizedEmail === ADMIN_EMAIL;

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      isAdmin: isAdminUser,
    });

    const token = generateToken(user._id, true);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error('[signup Error]:', err.message);
    res.status(500).json({ message: 'Failed to create account', error: err.message });
  }
};

/**
 * POST /api/auth/login
 * Authenticates user with Email and Password
 */
const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(400).json({ message: 'Invalid email address or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email address or password' });
    }

    // Auto-grant admin for progressfit.app@gmail.com
    if (normalizedEmail === ADMIN_EMAIL && !user.isAdmin) {
      user.isAdmin = true;
      await user.save();
    }

    const token = generateToken(user._id, !!rememberMe);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
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
 * POST /api/auth/reset-password
 * Resets user password using registered Email Address
 */
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email address and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully! You can now log in with your new password.' });
  } catch (err) {
    console.error('[resetPassword Error]:', err.message);
    res.status(500).json({ message: 'Failed to reset password', error: err.message });
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
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
};

module.exports = {
  signup,
  login,
  resetPassword,
  getMe,
};
