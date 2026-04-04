const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const auth = require("../middleware/auth");
const { query, withTransaction } = require("../db");
const { mapUserRow } = require("../utils/dbMappers");
const { generateAndSendOTP, verifyOTP } = require("../services/otpService");

const router = express.Router();
const TRUSTED_DEVICE_DAYS = 30;

function createJwtForUser(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function toUserPayload(user) {
  return mapUserRow(user);
}

function hashTrustedToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function generateTrustedDeviceToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function findUserByEmail(email) {
  const result = await query("select * from users where email = $1 limit 1", [String(email || "").trim().toLowerCase()]);
  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await query("select * from users where id = $1 limit 1", [id]);
  return result.rows[0] || null;
}

router.post("/register", async (req, res) => {
  try {
    const {
      email, password, role, firstName, lastName,
      phone, dateOfBirth, address,
      specialty, licenseNumber, yearsExperience, bio,
      workingDays, startTime, endTime,
    } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `insert into users (
        email, password_hash, role, first_name, last_name, phone, date_of_birth, address,
        specialty, license_number, years_experience, bio, working_days, start_time, end_time
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )
      returning *`,
      [
        String(email).trim().toLowerCase(),
        passwordHash,
        role,
        firstName || "",
        lastName || "",
        phone || "",
        dateOfBirth || "",
        address || "",
        specialty || "",
        licenseNumber || "",
        Number.isFinite(+yearsExperience) ? +yearsExperience : 0,
        bio || "",
        workingDays || "monday,tuesday,wednesday,thursday,friday",
        startTime || "09:00",
        endTime || "17:00",
      ]
    );

    const user = result.rows[0];
    const token = createJwtForUser(user);

    res.json({
      token,
      user: toUserPayload(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

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

router.get("/doctors", async (req, res) => {
  try {
    const result = await query(
      `select id, role, email, first_name, last_name, specialty, license_number,
              years_experience, bio, working_days, start_time, end_time
       from users
       where role = 'doctor'
       order by created_at desc`
    );

    res.json(result.rows.map((row) => toUserPayload(row)));
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/users/:id", auth, async (req, res) => {
  try {
    const { userId } = req.user;
    const targetId = req.params.id;

    if (String(userId) !== String(targetId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const current = await findUserById(targetId);
    if (!current) return res.status(404).json({ message: "User not found" });

    const updates = {
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      phone: req.body.phone,
      date_of_birth: req.body.dateOfBirth,
      address: req.body.address,
      years_experience: req.body.yearsExperience !== undefined ? Number(req.body.yearsExperience || 0) : undefined,
      bio: req.body.bio,
    };

    const keys = Object.entries(updates).filter(([, value]) => value !== undefined);
    if (keys.length === 0) {
      return res.json(toUserPayload(current));
    }

    const setClause = keys.map(([key], index) => `${key} = $${index + 2}`).join(", ");
    const params = [targetId, ...keys.map(([, value]) => value)];
    const result = await query(`update users set ${setClause}, updated_at = now() where id = $1 returning *`, params);

    res.json(toUserPayload(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/doctors/:id/availability", auth, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const targetId = req.params.id;

    if (role !== "doctor" || String(userId) !== String(targetId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const current = await findUserById(targetId);
    if (!current) return res.status(404).json({ message: "User not found" });
    if (current.role !== "doctor") return res.status(400).json({ message: "Target user is not a doctor" });

    const updates = {
      working_days: req.body.workingDays,
      start_time: req.body.startTime,
      end_time: req.body.endTime,
    };

    const keys = Object.entries(updates).filter(([, value]) => value !== undefined);
    if (keys.length === 0) {
      return res.json(toUserPayload(current));
    }

    const setClause = keys.map(([key], index) => `${key} = $${index + 2}`).join(", ");
    const params = [targetId, ...keys.map(([, value]) => value)];
    const result = await query(`update users set ${setClause}, updated_at = now() where id = $1 returning *`, params);

    res.json(toUserPayload(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { role } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as a ${user.role}. Please use the ${user.role} login.`,
      });
    }

    const result = await generateAndSendOTP(email, "email");

    if (result.success) {
      return res.json({
        message: "OTP sent successfully to your email",
        expiresIn: result.expiresIn,
      });
    }

    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { role } = req.body;
    const rememberDevice = !!req.body.rememberDevice;
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const verification = verifyOTP(email, otp);
    if (!verification.valid) {
      return res.status(401).json({ message: verification.message });
    }

    const user = await findUserByEmail(email);
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

      await query(
        `insert into trusted_devices (user_id, role, token_hash, user_agent, expires_at)
         values ($1, $2, $3, $4, $5)`,
        [user.id, user.role, tokenHash, String(req.headers["user-agent"] || ""), expiresAt]
      );
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

router.post("/login-with-otp", async (req, res) => {
  try {
    const { password, role } = req.body;
    const trustedDeviceToken = String(req.body.trustedDeviceToken || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
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
      const trusted = await query(
        `select * from trusted_devices
         where user_id = $1 and role = $2 and token_hash = $3 and revoked_at is null and expires_at > now()
         limit 1`,
        [user.id, user.role, tokenHash]
      );

      if (trusted.rows[0]) {
        await query("update trusted_devices set last_used_at = now(), updated_at = now() where id = $1", [trusted.rows[0].id]);
        const token = createJwtForUser(user);

        return res.json({
          message: "Login successful",
          requiresOTP: false,
          token,
          user: toUserPayload(user),
        });
      }
    }

    const otpResult = await generateAndSendOTP(email, "email");
    if (otpResult.success) {
      return res.json({
        message: "Credentials verified. OTP sent to your email.",
        requiresOTP: true,
        expiresIn: otpResult.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      });
    }

    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
