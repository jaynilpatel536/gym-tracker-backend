const nodemailer = require('nodemailer');

const createNodemailerTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USERNAME || 'progressfit.app@gmail.com',
      pass: process.env.SMTP_PASSWORD || 'dcbrkangjfzvrqir',
    },
    tls: { rejectUnauthorized: false },
  });
};

/**
 * Send a 6-digit OTP verification email to the user.
 * Uses Brevo HTTP REST API for ultra-fast (<0.5s) instant email delivery,
 * bypassing all SMTP handshake delays and port timeouts.
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

  // Brevo Ultra-Fast HTTP REST API (Bypasses all SMTP handshake delays <0.5s)
  const brevoKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
  if (brevoKey) {
    try {
      const senderEmail = process.env.BREVO_SMTP_USER || process.env.EMAIL_FROM || 'progressfit.app@gmail.com';
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
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
        console.log(`[Brevo HTTP API Ultra-Fast Email] OTP ${otpCode} sent to ${toEmail}:`, resData.messageId || 'Success');
        return;
      }
      console.error('[Brevo HTTP API Warning]', response.status, resData);
    } catch (err) {
      console.error('Brevo HTTP API error, falling back to Gmail SSL:', err.message);
    }
  }

  // Fallback to Gmail SSL Transporter
  try {
    const transporter = createNodemailerTransporter();
    await transporter.sendMail({
      from: `"ProgressFit" <${process.env.EMAIL_FROM || 'progressfit.app@gmail.com'}>`,
      to: toEmail,
      subject: `Your ProgressFit Verification Code: ${otpCode}`,
      html: htmlContent,
    });
    console.log(`[Gmail SMTP Email] OTP ${otpCode} sent to ${toEmail}`);
  } catch (err) {
    console.error('Gmail SMTP fallback error:', err.message);
  }
};

module.exports = { sendOtpEmail };
