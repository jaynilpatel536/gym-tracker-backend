const nodemailer = require('nodemailer');

const createNodemailerTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USERNAME || 'progressfit.app@gmail.com',
      pass: process.env.SMTP_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });
};

/**
 * Send a 6-digit OTP verification email securely via Brevo REST API (HTTPS).
 * Fallback to Nodemailer SSL transport if Brevo is unavailable.
 */
const sendOtpEmail = async (toEmail, otpCode) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #1B4332; margin: 0;">ProgressFit</h1>
        <p style="color: #5B6F64; margin-top: 5px;">Personal Gym Workout Tracker</p>
      </div>
      <div style="background-color: #F6FAF8; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <p style="font-size: 15px; color: #132A1F; margin: 0 0 10px 0;">Use the following verification code to sign in to your account:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1B4332; margin: 15px 0;">${otpCode}</div>
        <p style="font-size: 12px; color: #888888; margin: 0;">This code is valid for 10 minutes. Do not share it with anyone.</p>
      </div>
      <div style="text-align: center; font-size: 12px; color: #aaaaaa;">
        &copy; ${new Date().getFullYear()} ProgressFit. All rights reserved.
      </div>
    </div>
  `;

  // Option A: Brevo HTTP REST API (Secure HTTPS)
  const brevoKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
  if (brevoKey) {
    try {
      const senderEmail =
        process.env.BREVO_SMTP_USER || process.env.EMAIL_FROM || 'progressfit.app@gmail.com';

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'ProgressFit', email: senderEmail },
          to: [{ email: toEmail }],
          subject: `Your ProgressFit Verification Code: ${otpCode}`,
          htmlContent: htmlContent,
        }),
      });

      const resData = await response.json();
      if (response.ok) {
        console.log(`[Brevo REST API] Success: OTP sent to ${toEmail} (MessageID: ${resData.messageId || 'OK'})`);
        return;
      }
      console.error(`[Brevo REST API Warning] Status ${response.status}:`, resData.message || resData);
    } catch (err) {
      console.error('[Brevo REST API Connection Error]:', err.message);
    }
  }

  // Option B: Secondary Fallback to Nodemailer SSL
  try {
    const transporter = createNodemailerTransporter();
    await transporter.sendMail({
      from: `"ProgressFit" <${process.env.EMAIL_FROM || 'progressfit.app@gmail.com'}>`,
      to: toEmail,
      subject: `Your ProgressFit Verification Code: ${otpCode}`,
      html: htmlContent,
    });
    console.log(`[Gmail SMTP Fallback] Success: OTP sent to ${toEmail}`);
  } catch (err) {
    console.error('[Gmail SMTP Fallback Error]:', err.message);
    throw new Error('Email delivery failed');
  }
};

module.exports = { sendOtpEmail };
