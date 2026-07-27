const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const createTransporter = () => {
  // If Brevo SMTP Key is configured (Instant <1s delivery to ANY email)
  if (process.env.BREVO_SMTP_KEY) {
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER || process.env.SMTP_USERNAME || 'progressfit.app@gmail.com',
        pass: process.env.BREVO_SMTP_KEY,
      },
    });
  }

  // Fallback to Gmail SSL port 465
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
 * Supports Brevo SMTP for instant <1s delivery to any recipient,
 * Resend API, or Gmail SMTP fallback.
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

  // Option A: Brevo SMTP (Instant <1s to ANY email address)
  if (process.env.BREVO_SMTP_KEY) {
    try {
      const transporter = createTransporter();
      const senderEmail = process.env.BREVO_SMTP_USER || process.env.EMAIL_FROM || 'progressfit.app@gmail.com';
      await transporter.sendMail({
        from: `"ProgressFit" <${senderEmail}>`,
        to: toEmail,
        subject: `Your ProgressFit Verification Code: ${otpCode}`,
        html: htmlContent,
      });
      console.log(`[Brevo Instant Email] OTP ${otpCode} sent successfully to ${toEmail}`);
      return;
    } catch (err) {
      console.error('Brevo SMTP error, falling back:', err.message);
    }
  }

  // Option B: Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'ProgressFit <onboarding@resend.dev>',
        to: toEmail,
        subject: `Your ProgressFit Verification Code: ${otpCode}`,
        html: htmlContent,
      });
      console.log(`[Resend Instant Email] OTP ${otpCode} sent to ${toEmail}`);
      return;
    } catch (err) {
      console.error('Resend API error, falling back to Gmail SMTP:', err.message);
    }
  }

  // Option C: Fallback to Gmail SMTP
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"ProgressFit" <${process.env.EMAIL_FROM || 'progressfit.app@gmail.com'}>`,
    to: toEmail,
    subject: `Your ProgressFit Verification Code: ${otpCode}`,
    html: htmlContent,
  });
  console.log(`[Gmail SMTP Email] OTP ${otpCode} sent to ${toEmail}`);
};

module.exports = { sendOtpEmail };
