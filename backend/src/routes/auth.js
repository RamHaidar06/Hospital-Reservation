const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

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

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
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
      },
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
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
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
      },
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

module.exports = router;