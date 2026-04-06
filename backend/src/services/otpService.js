const crypto = require("crypto");
const https = require("https");

/**
 * OTP Service for email/SMS verification
 * Handles OTP generation, storage, sending, and validation
 */

// In-memory OTP storage (in production, use Redis or MongoDB)
const otpStore = new Map();

function parseMailFromHeader(rawFrom) {
  const text = String(rawFrom || "").trim();
  const match = text.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: String(match[1] || "").trim().replace(/^"|"$/g, "") || "Medicare",
      email: String(match[2] || "").trim(),
    };
  }
  return {
    name: "Medicare",
    email: text,
  };
}

function getBrevoApiKey() {
  return String(process.env.BREVO_API_KEY || "").trim();
}

function getBrevoSender() {
  const fallbackFrom = process.env.MAIL_FROM || process.env.SMTP_USER || "Medicare <no-reply@medicare.local>";
  const senderName = String(process.env.BREVO_SENDER_NAME || "").trim();
  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || "").trim();

  if (senderEmail) {
    return {
      name: senderName || parseMailFromHeader(fallbackFrom).name || "Medicare",
      email: senderEmail,
    };
  }

  return parseMailFromHeader(fallbackFrom);
}

async function sendOTPByBrevo(email, otp) {
  const apiKey = getBrevoApiKey();
  if (!apiKey) return false;

  const sender = getBrevoSender();
  if (!sender.email) {
    console.warn("Brevo sender email is missing. Set BREVO_SENDER_EMAIL or MAIL_FROM.");
    return false;
  }

  const payload = {
    sender,
    to: [{ email: String(email || "").trim() }],
    subject: "Your Healthcare Login Verification Code",
    htmlContent: `
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

  return new Promise((resolve) => {
    const request = https.request(
      {
        method: "POST",
        hostname: "api.brevo.com",
        path: "/v3/smtp/email",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          accept: "application/json",
        },
        timeout: 12000,
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(true);
            return;
          }

          console.error(
            `Brevo OTP send failed (${response.statusCode}) from ${sender.email}:`,
            body || response.statusMessage || "Unknown Brevo error"
          );
          resolve(false);
        });
      }
    );

    request.on("error", (error) => {
      console.error("Brevo OTP send error:", error.message || error);
      resolve(false);
    });

    request.on("timeout", () => {
      request.destroy(new Error("Brevo OTP send timed out"));
    });

    request.write(JSON.stringify(payload));
    request.end();
  });
}

function normalizeEmailKey(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeOtpCode(code) {
  return String(code || "").trim().replace(/\D/g, "");
}

/**
 * Generate a random 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via email using Brevo.
 */
async function sendOTPByEmail(email, otp) {
  return sendOTPByBrevo(email, otp);
}

/**
 * Generate OTP, store it, and attempt to send.
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

  if (method === "email") {
    const sent = await sendOTPByEmail(email, otp);
    if (!sent) {
      console.warn(`[OTP] Email delivery failed for ${email}. OTP: ${otp}`);
      return {
        success: false,
        expiresIn: 600,
        message: "Failed to send OTP email via Brevo. Check the verified sender and API key.",
      };
    }
  }

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