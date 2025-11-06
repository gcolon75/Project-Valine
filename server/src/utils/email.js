/**
 * Email utilities for sending verification and reset emails
 * This is a simple implementation that can be extended with a real email service
 */

import nodemailer from 'nodemailer'

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true'
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT || 587
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@valine.app'
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

/**
 * Create email transporter
 * In development, logs emails to console instead of sending
 */
function createTransporter() {
  if (!EMAIL_ENABLED || !SMTP_HOST) {
    // Development mode: log to console
    return {
      sendMail: async (options) => {
        console.log('\n📧 Email (Development Mode):')
        console.log('To:', options.to)
        console.log('Subject:', options.subject)
        console.log('Body:', options.text || options.html)
        console.log('---\n')
        return { messageId: 'dev-' + Date.now() }
      }
    }
  }

  // Production mode: use real SMTP
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === '465',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  })
}

/**
 * Send email verification email
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @returns {Promise<object>} Send result
 */
export async function sendVerificationEmail(email, token) {
  const verificationUrl = `${BASE_URL}/verify-email?token=${token}`
  
  const transporter = createTransporter()
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify Your Email - Project Valine',
    text: `
Welcome to Project Valine!

Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

Best regards,
The Project Valine Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to Project Valine!</h1>
    <p>Please verify your email address by clicking the button below:</p>
    <a href="${verificationUrl}" class="button">Verify Email Address</a>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
    <p>This link will expire in 24 hours.</p>
    <div class="footer">
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} Project Valine. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
  
  return transporter.sendMail(mailOptions)
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @returns {Promise<object>} Send result
 */
export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`
  
  const transporter = createTransporter()
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: 'Password Reset Request - Project Valine',
    text: `
You requested to reset your password for Project Valine.

Click the link below to reset your password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

Best regards,
The Project Valine Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Password Reset Request</h1>
    <p>You requested to reset your password for Project Valine.</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">${resetUrl}</p>
    <p>This link will expire in 1 hour.</p>
    <div class="warning">
      <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email and your password will remain unchanged.
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Project Valine. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
  
  return transporter.sendMail(mailOptions)
}

/**
 * Send 2FA enrollment confirmation email
 * @param {string} email - Recipient email
 * @returns {Promise<object>} Send result
 */
export async function send2FAEnabledEmail(email) {
  const transporter = createTransporter()
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: 'Two-Factor Authentication Enabled - Project Valine',
    text: `
Two-factor authentication has been enabled on your Project Valine account.

Your account is now more secure with an additional layer of protection.

If you didn't enable 2FA, please contact support immediately and change your password.

Best regards,
The Project Valine Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .success { background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 12px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Two-Factor Authentication Enabled</h1>
    <div class="success">
      <strong>Security Update:</strong> Two-factor authentication has been enabled on your Project Valine account.
    </div>
    <p>Your account is now more secure with an additional layer of protection.</p>
    <p>If you didn't enable 2FA, please contact support immediately and change your password.</p>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Project Valine. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
  
  return transporter.sendMail(mailOptions)
}

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  send2FAEnabledEmail
}
