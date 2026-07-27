const express = require('express');
const { sendOtp, verifyOtp } = require('../controllers/authController');
const { sendOtpLimiter, verifyOtpLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/send-otp', sendOtpLimiter, sendOtp);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);

module.exports = router;
