// backend/routes/appointments.js
const express = require("express");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/appointments/mine
 * - patient: appointments where patientId = me
 * - doctor:  appointments where doctorId = me
 */
router.get("/mine", auth, async (req, res) => {
  try {
    const { userId, role } = req.user;

    const filter =
      role === "patient" ? { patientId: userId } :
      role === "doctor" ? { doctorId: userId } :
      null;

    if (!filter) return res.status(403).json({ message: "Invalid role" });

    const appts = await Appointment.find(filter).sort({ createdAt: -1 });
    return res.json(appts);
  } catch (err) {
    console.log("MINE APPOINTMENTS ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/appointments
 * patient books an appointment
 * body: { doctorId, appointmentDate, appointmentTime, reason, notes? }
 */
router.post("/", auth, async (req, res) => {
  try {
    console.log("BOOK BODY:", req.body);
    console.log("USER:", req.user);

    const { userId, role } = req.user;
    if (role !== "patient") return res.status(403).json({ message: "Only patients can book" });

    const { doctorId, appointmentDate, appointmentTime, reason, notes } = req.body;

    if (!doctorId || !appointmentDate || !appointmentTime || !reason) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // avoid CastError -> 500
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctorId" });
    }

    // prevent clashes (same doctor, same date/time, not cancelled)
    const clash = await Appointment.findOne({
      doctorId,
      appointmentDate,
      appointmentTime,
      status: { $ne: "cancelled" },
    });

    if (clash) return res.status(409).json({ message: "Time slot already booked" });

    const appt = await Appointment.create({
      patientId: userId,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      notes: notes || "",
      status: "confirmed",
    });

    return res.json(appt);
  } catch (err) {
    console.log("BOOK APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * PATCH /api/appointments/:id/cancel
 * patient or doctor cancels (must be owner)
 */
router.patch("/:id/cancel", auth, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: "Not found" });

    const { userId, role } = req.user;
    const isOwner =
      (role === "patient" && String(appt.patientId) === String(userId)) ||
      (role === "doctor" && String(appt.doctorId) === String(userId));

    if (!isOwner) return res.status(403).json({ message: "Forbidden" });

    appt.status = "cancelled";
    await appt.save();
    return res.json(appt);
  } catch (err) {
    console.log("CANCEL APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * PATCH /api/appointments/:id/reschedule
 * body: { appointmentDate, appointmentTime }
 * patient or doctor reschedules (must be owner), prevents clashes
 */
router.patch("/:id/reschedule", auth, async (req, res) => {
  try {
    const { appointmentDate, appointmentTime } = req.body;
    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: "Not found" });

    const { userId, role } = req.user;
    const isOwner =
      (role === "patient" && String(appt.patientId) === String(userId)) ||
      (role === "doctor" && String(appt.doctorId) === String(userId));

    if (!isOwner) return res.status(403).json({ message: "Forbidden" });

    const clash = await Appointment.findOne({
      _id: { $ne: appt._id },
      doctorId: appt.doctorId,
      appointmentDate,
      appointmentTime,
      status: { $ne: "cancelled" },
    });

    if (clash) return res.status(409).json({ message: "Time slot already booked" });

    appt.appointmentDate = appointmentDate;
    appt.appointmentTime = appointmentTime;
    await appt.save();

    return res.json(appt);
  } catch (err) {
    console.log("RESCHEDULE APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * PATCH /api/appointments/:id
 * generic update fallback (owner only)
 * allowed: status, appointmentDate, appointmentTime, reason, notes
 */
router.patch("/:id", auth, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: "Not found" });

    const { userId, role } = req.user;
    const isOwner =
      (role === "patient" && String(appt.patientId) === String(userId)) ||
      (role === "doctor" && String(appt.doctorId) === String(userId));

    if (!isOwner) return res.status(403).json({ message: "Forbidden" });

    const allowedFields = ["status", "appointmentDate", "appointmentTime", "reason", "notes"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) appt[field] = req.body[field];
    }

    await appt.save();
    return res.json(appt);
  } catch (err) {
    console.log("UPDATE APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;