const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.BREVO_SMTP_KEY) {
    const user = process.env.BREVO_SMTP_USER || process.env.SMTP_USERNAME || 'progressfit.app@gmail.com';
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: user,
        pass: process.env.BREVO_SMTP_KEY,
      },
    });
  }

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

  // Brevo SMTP Transporter (Instant <1s to ANY recipient)
  if (process.env.BREVO_SMTP_KEY) {
    try {
      const transporter = createTransporter();
      const senderUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USERNAME || 'progressfit.app@gmail.com';
      await transporter.sendMail({
        from: `"ProgressFit" <${senderUser}>`,
        to: toEmail,
        subject: `Your ProgressFit Verification Code: ${otpCode}`,
        html: htmlContent,
      });
      console.log(`[Brevo Instant Email] OTP ${otpCode} sent to ${toEmail}`);
      return;
    } catch (err) {
      console.error('Brevo SMTP error, falling back to Gmail SSL:', err.message);
    }
  }

  // Fallback to Gmail SSL
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
