const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// Public: list doctors (for patient booking page)
router.get("/doctors", async (req, res) => {
  const docs = await User.find({ role: "doctor" })
    .select("firstName lastName email specialty licenseNumber yearsExperience bio workingDays startTime endTime")
    .sort({ createdAt: -1 });

  res.json(docs);
});

// Auth: get current logged-in user
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

module.exports = router;