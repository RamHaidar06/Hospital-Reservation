const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const TrustedDevice = require("../models/TrustedDevice");
const auth = require("../middleware/auth");
const { generateAndSendOTP, verifyOTP } = require("../services/otpService");

const router = express.Router();
const TRUSTED_DEVICE_DAYS = 30;

function createJwtForUser(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function toUserPayload(user) {
  return {
    id: user._id,
    role: user.role,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth,
    address: user.address,
    specialty: user.specialty,
    licenseNumber: user.licenseNumber,
    yearsExperience: user.yearsExperience,
    bio: user.bio,
    workingDays: user.workingDays,
    startTime: user.startTime,
    endTime: user.endTime,
  };
}

function hashTrustedToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function generateTrustedDeviceToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * =========================
 * REGISTER
 * =========================
 */
router.post("/register", async (req, res) => {
  try {
    const {
      email, password, role, firstName, lastName,
      phone, dateOfBirth, address,
      specialty, licenseNumber, yearsExperience, bio,
      workingDays, startTime, endTime
    } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      role,
      firstName,
      lastName,

      // patient fields
      phone: phone || "",
      dateOfBirth: dateOfBirth || "",
      address: address || "",

      // doctor fields
      specialty: specialty || "",
      licenseNumber: licenseNumber || "",
      yearsExperience: Number.isFinite(+yearsExperience) ? +yearsExperience : 0,
      bio: bio || "",
      workingDays: workingDays || "monday,tuesday,wednesday,thursday,friday",
      startTime: startTime || "09:00",
      endTime: endTime || "17:00",
    });

    const token = createJwtForUser(user);

    res.json({
      token,
      user: toUserPayload(user),
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * =========================
 * LOGIN
 * =========================
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(401).json({ message: "Invalid credentials" });

    if (role && user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as a ${user.role}. Please use the ${user.role} login.`,
      });
    }

    const token = createJwtForUser(user);

    res.json({
      token,
      user: toUserPayload(user),
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * =========================
 * GET ALL DOCTORS
 * =========================
 * Used by booking page
 */
router.get("/doctors", async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" }).select(
      "_id role email firstName lastName specialty licenseNumber yearsExperience bio workingDays startTime endTime"
    );

    res.json(
      doctors.map((d) => ({
        id: d._id,
        role: d.role,
        email: d.email,
        firstName: d.firstName,
        lastName: d.lastName,
        specialty: d.specialty,
        licenseNumber: d.licenseNumber,
        yearsExperience: d.yearsExperience,
        bio: d.bio,
        workingDays: d.workingDays,
        startTime: d.startTime,
        endTime: d.endTime,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// update profile (patient/doctor self-update)
router.patch("/users/:id", auth, async (req, res) => {
  try {
    const { userId } = req.user;
    const targetId = req.params.id;

    if (String(userId) !== String(targetId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updates = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      dateOfBirth: req.body.dateOfBirth,
      address: req.body.address,
      yearsExperience: req.body.yearsExperience,
      bio: req.body.bio,
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) user[key] = value;
    });

    await user.save();

    res.json({
      id: user._id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      specialty: user.specialty,
      licenseNumber: user.licenseNumber,
      yearsExperience: user.yearsExperience,
      bio: user.bio,
      workingDays: user.workingDays,
      startTime: user.startTime,
      endTime: user.endTime,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// update doctor availability (self)
router.patch("/doctors/:id/availability", auth, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const targetId = req.params.id;

    if (role !== "doctor" || String(userId) !== String(targetId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "doctor") return res.status(400).json({ message: "Target user is not a doctor" });

    const { workingDays, startTime, endTime } = req.body;

    if (workingDays !== undefined) user.workingDays = workingDays;
    if (startTime !== undefined) user.startTime = startTime;
    if (endTime !== undefined) user.endTime = endTime;

    await user.save();

    res.json({
      id: user._id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      specialty: user.specialty,
      licenseNumber: user.licenseNumber,
      yearsExperience: user.yearsExperience,
      bio: user.bio,
      workingDays: user.workingDays,
      startTime: user.startTime,
      endTime: user.endTime,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * =========================
 * OTP VERIFICATION ENDPOINTS
 * =========================
 */

/**
 * POST /api/auth/send-otp
 * Send OTP to user email after successful password verification
 * Used as second factor after login credentials are validated
 */
router.post("/send-otp", async (req, res) => {
  try {
    const { role } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Verify user exists and check role if provided
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as a ${user.role}. Please use the ${user.role} login.`,
      });
    }

    // Generate and send OTP
    const result = await generateAndSendOTP(email, "email");

    if (result.success) {
      res.json({
        message: "OTP sent successfully to your email",
        expiresIn: result.expiresIn, // seconds
      });
    } else {
      res.status(500).json({
        message: "Failed to send OTP. Please try again.",
      });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP code and return JWT token if valid
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { role } = req.body;
    const rememberDevice = !!req.body.rememberDevice;
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Verify OTP
    const verification = verifyOTP(email, otp);

    if (!verification.valid) {
      return res.status(401).json({ message: verification.message });
    }

    // OTP is valid, get user and issue JWT
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as a ${user.role}. Please use the ${user.role} login.`,
      });
    }

    const token = createJwtForUser(user);
    let trustedDeviceToken = null;

    if (rememberDevice) {
      trustedDeviceToken = generateTrustedDeviceToken();
      const tokenHash = hashTrustedToken(trustedDeviceToken);
      const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000);

      await TrustedDevice.create({
        userId: user._id,
        role: user.role,
        tokenHash,
        userAgent: String(req.headers["user-agent"] || ""),
        expiresAt,
      });
    }

    res.json({
      message: "Login successful",
      token,
      user: toUserPayload(user),
      ...(trustedDeviceToken ? { trustedDeviceToken } : {}),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/auth/login-with-otp
 * Complete login flow: password validation + OTP sending in one call
 * Returns user data and sends OTP, does NOT issue JWT until OTP verified
 */
router.post("/login-with-otp", async (req, res) => {
  try {
    const { password, role } = req.body;
    const trustedDeviceToken = String(req.body.trustedDeviceToken || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Validate credentials
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as a ${user.role}. Please use the ${user.role} login.`,
      });
    }

    if (trustedDeviceToken) {
      const tokenHash = hashTrustedToken(trustedDeviceToken);
      const trusted = await TrustedDevice.findOne({
        userId: user._id,
        role: user.role,
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });

      if (trusted) {
        trusted.lastUsedAt = new Date();
        await trusted.save();

        const token = createJwtForUser(user);
        return res.json({
          message: "Login successful",
          requiresOTP: false,
          token,
          user: toUserPayload(user),
        });
      }
    }

    // Credentials valid, send OTP
    const otpResult = await generateAndSendOTP(email, "email");

    if (otpResult.success) {
      res.json({
        message: "Credentials verified. OTP sent to your email.",
        requiresOTP: true,
        expiresIn: otpResult.expiresIn,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } else {
      res.status(500).json({
        message: "Failed to send OTP. Please try again.",
      });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;