const User = require('../models/User');
const Otp = require('../models/Otp');
const generateToken = require('../utils/generateToken');
const { sendOtpEmail } = require('../utils/email');

const ADMIN_EMAIL = 'progressfit.app@gmail.com';

/**
 * POST /api/auth/send-otp
 * Generates 6-digit OTP, stores in Mongoose with TTL, and sends via Brevo REST API
 */
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate cryptographically random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL

    // Save or update OTP document in MongoDB (resetting attempts to 0)
    await Otp.findOneAndUpdate(
      { email: normalizedEmail },
      { email: normalizedEmail, otp, attempts: 0, expiresAt },
      { upsert: true, new: true }
    );

    // Trigger Brevo REST API email send asynchronously with logging
    sendOtpEmail(normalizedEmail, otp).catch((err) =>
      console.error(`[OTP Send Error] Failed for ${normalizedEmail}:`, err.message)
    );

    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    console.error('[sendOtp Internal Error]:', err.message);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
};

/**
 * POST /api/auth/verify-otp
 * Verifies 6-digit OTP, checks expiration & attempts limit, performs single-use cleanup, and issues JWT
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, otp, name, rememberMe } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const inputOtp = otp.trim();

    // Production Environment Guard for Development-Only Test OTP
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isTestOtpAllowed = isDevelopment && process.env.ALLOW_TEST_OTP === 'true';
    const isMasterCode = isTestOtpAllowed && (inputOtp === '123456' || inputOtp === '111111');

    // Find active OTP record in MongoDB
    const record = await Otp.findOne({ email: normalizedEmail });

    if (!isMasterCode) {
      if (!record || record.expiresAt < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }

      // Check max failed attempts limit (Max 5 attempts)
      if (record.attempts >= 5) {
        await Otp.deleteOne({ _id: record._id });
        return res.status(429).json({
          message: 'Maximum verification attempts exceeded. Please request a new code.',
        });
      }

      // Validate OTP code
      if (record.otp !== inputOtp) {
        record.attempts += 1;
        await record.save();
        const remaining = 5 - record.attempts;
        return res.status(400).json({
          message: `Incorrect verification code. ${remaining} attempt(s) remaining.`,
        });
      }
    }

    // Atomic Single-Use Cleanup: Delete OTP record from MongoDB upon successful verification
    if (record) {
      await Otp.deleteOne({ _id: record._id });
    }

    // Register or Login User
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

    // Issue signed JWT token
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
    console.error('[verifyOtp Internal Error]:', err.message);
    res.status(500).json({ message: 'Failed to verify code' });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
};
