// In-memory rate limiting middleware to prevent OTP spam and brute-force attempts

const requestCounts = new Map();

/**
 * Limit OTP send requests per IP/Email (Max 3 requests per 10 minutes)
 */
const sendOtpLimiter = (req, res, next) => {
  const identifier = req.body.email ? req.body.email.trim().toLowerCase() : req.ip;
  const key = `send_${identifier}`;
  const now = Date.now();
  const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  const MAX_LIMIT = 3;

  const record = requestCounts.get(key) || { count: 0, resetTime: now + WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
  } else {
    record.count += 1;
  }

  requestCounts.set(key, record);

  if (record.count > MAX_LIMIT) {
    const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      message: `Too many OTP requests. Please wait ${minutesLeft} minute(s) before trying again.`,
    });
  }

  next();
};

/**
 * Limit OTP verification attempts (Max 10 attempts per 10 minutes per IP)
 */
const verifyOtpLimiter = (req, res, next) => {
  const identifier = req.body.email ? req.body.email.trim().toLowerCase() : req.ip;
  const key = `verify_${identifier}`;
  const now = Date.now();
  const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  const MAX_LIMIT = 10;

  const record = requestCounts.get(key) || { count: 0, resetTime: now + WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
  } else {
    record.count += 1;
  }

  requestCounts.set(key, record);

  if (record.count > MAX_LIMIT) {
    return res.status(429).json({
      message: 'Too many failed verification attempts. Please request a new code.',
    });
  }

  next();
};

module.exports = { sendOtpLimiter, verifyOtpLimiter };
