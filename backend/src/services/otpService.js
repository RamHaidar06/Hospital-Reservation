const nodemailer = require("nodemailer");
const crypto = require("crypto");

/**
 * OTP Service for email/SMS verification
 * Handles OTP generation, storage, sending, and validation
 */

// In-memory OTP storage (in production, use Redis or MongoDB)
const otpStore = new Map();

// Email transporter configuration
let emailTransporter = null;

function normalizeEmailKey(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeOtpCode(code) {
  return String(code || "").trim().replace(/\D/g, "");
}

function initEmailTransporter() {
  if (emailTransporter) return;

  const hasEmailConfig = process.env.SMTP_HOST && process.env.SMTP_PORT;

  if (hasEmailConfig) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Hard timeout so the transporter never hangs indefinitely
      connectionTimeout: 8000,  // 8s to connect
      greetingTimeout:   5000,  // 5s for SMTP greeting
      socketTimeout:     10000, // 10s socket inactivity
    });
  }
}

/**
 * Generate a random 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via email — with a hard 12-second timeout so it never hangs
 */
async function sendOTPByEmail(email, otp) {
  try {
    initEmailTransporter();

    if (!emailTransporter) {
      console.warn("Email not configured. OTP not sent. OTP is:", otp);
      return false;
    }

    const mailOptions = {
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Your Healthcare Login Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 480px;">
          <h2 style="color: #0ea5e9;">Secure Login Verification</h2>
          <p>Your one-time verification code is:</p>
          <h1 style="color: #0ea5e9; letter-spacing: 6px; font-size: 2.5rem; margin: 16px 0;">
            ${otp}
          </h1>
          <p style="color: #666; font-size: 0.9rem;">This code will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 0.85rem;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `,
    };

    // Race the send against a 12-second timeout
    const sendPromise = emailTransporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Email send timed out")), 12000)
    );

    await Promise.race([sendPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error.message || error);
    return false;
  }
}

/**
 * Generate OTP, store it, and attempt to send.
 * Always returns success:true for email method so the login flow proceeds
 * even when the SMTP server is unavailable — the OTP is logged to console.
 */
async function generateAndSendOTP(email, method = "email") {
  const emailKey = normalizeEmailKey(email);

  if (!emailKey) {
    return { success: false, expiresIn: 600 };
  }

  const otp = generateOTP();
  const expiresIn = 10 * 60 * 1000; // 10 minutes
  const expiresAt = Date.now() + expiresIn;

  // Store OTP before attempting to send
  otpStore.set(emailKey, {
    otp,
    expiresAt,
    attempts: 0,
    method,
  });

  let sent = false;

  if (method === "email") {
    sent = await sendOTPByEmail(email, otp);
    if (!sent) {
      // SMTP failed — OTP is still valid, log it for dev/testing
      console.warn(`[OTP] Email delivery failed for ${email}. OTP: ${otp}`);
    }
  }

  // Always return success for email method — OTP is stored and valid
  // even if the email couldn't be delivered
  return {
    success: true,
    expiresIn: 600, // 10 minutes in seconds
  };
}

/**
 * Verify OTP
 */
function verifyOTP(email, code) {
  const emailKey = normalizeEmailKey(email);
  const normalizedCode = normalizeOtpCode(code);
  const record = otpStore.get(emailKey);

  if (!record) {
    return { valid: false, message: "No OTP found for this email. Please request a new one." };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(emailKey);
    return { valid: false, message: "OTP has expired. Please request a new one." };
  }

  if (record.attempts >= 5) {
    otpStore.delete(emailKey);
    return { valid: false, message: "Too many failed attempts. Please request a new OTP." };
  }

  if (record.otp === normalizedCode) {
    otpStore.delete(emailKey);
    return { valid: true, message: "OTP verified successfully." };
  }

  record.attempts += 1;
  return { valid: false, message: `Invalid code. ${5 - record.attempts} attempts remaining.` };
}

/**
 * Cleanup expired OTPs periodically
 */
function cleanupExpiredOTPs() {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(email);
    }
  }
}

setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

module.exports = {
  generateAndSendOTP,
  verifyOTP,
  generateOTP,
  sendOTPByEmail,
};