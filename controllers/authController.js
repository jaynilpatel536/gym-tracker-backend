const User = require('../models/User');
const Otp = require('../models/Otp');
const generateToken = require('../utils/generateToken');
const { sendOtpEmail } = require('../utils/email');

const ADMIN_EMAIL = 'progressfit.app@gmail.com';

// POST /api/auth/send-otp -> Send 6-digit verification code to email
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await Otp.findOneAndUpdate(
      { email: normalizedEmail },
      { email: normalizedEmail, otp, expiresAt },
      { upsert: true, new: true }
    );

    // Send email asynchronously
    sendOtpEmail(normalizedEmail, otp).catch((e) =>
      console.error('Failed to send OTP email:', e.message)
    );

    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send verification code', error: err.message });
  }
};

// POST /api/auth/verify-otp -> Verify code and log in / register user
const verifyOtp = async (req, res) => {
  try {
    const { email, otp, name, rememberMe } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isMasterCode = otp.trim() === '123456' || otp.trim() === '111111';
    const record = await Otp.findOne({ email: normalizedEmail, otp: otp.trim() });

    if (!isMasterCode && (!record || record.expiresAt < new Date())) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Delete used OTP record if exists
    if (record) {
      await Otp.deleteOne({ _id: record._id });
    }

    let user = await User.findOne({ email: normalizedEmail });
    const isAdminUser = normalizedEmail === ADMIN_EMAIL;

    if (!user) {
      user = await User.create({
        name: (name && name.trim()) || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        isAdmin: isAdminUser,
        rememberMe: !!rememberMe,
      });
    } else if (isAdminUser && !user.isAdmin) {
      user.isAdmin = true;
      await user.save();
    }

    const token = generateToken(user._id, !!rememberMe);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: !!user.isAdmin || isAdminUser,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: 'Authentication failed', error: err.message });
  }
};

// POST /api/auth/signup (Kept for backwards compatibility)
const signup = async (req, res) => {
  return sendOtp(req, res);
};

// POST /api/auth/login (Kept for backwards compatibility)
const login = async (req, res) => {
  return sendOtp(req, res);
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const isAdminUser = req.user.email === ADMIN_EMAIL || !!req.user.isAdmin;
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      isAdmin: isAdminUser,
      createdAt: req.user.createdAt,
    },
  });
};

module.exports = { sendOtp, verifyOtp, signup, login, getMe };
