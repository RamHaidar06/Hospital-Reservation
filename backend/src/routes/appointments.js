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
      role === "patient"
        ? { patientId: userId }
        : role === "doctor"
        ? { doctorId: userId }
        : null;

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
    if (role !== "patient") {
      return res.status(403).json({ message: "Only patients can book" });
    }

    const { doctorId, appointmentDate, appointmentTime, reason, notes } = req.body;

    if (!doctorId || !appointmentDate || !appointmentTime || !reason) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctorId" });
    }

    const clash = await Appointment.findOne({
      doctorId,
      appointmentDate,
      appointmentTime,
      status: { $ne: "cancelled" },
    });

    if (clash) {
      return res.status(409).json({ message: "Time slot already booked" });
    }

    const appt = await Appointment.create({
      patientId: userId,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      notes: notes || "",
      status: "confirmed",
    });

    await appt.populate("doctorId", "firstName lastName specialty yearsExperience");

    const doctorName = [appt.doctorId?.firstName, appt.doctorId?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return res.json({
      message: `Appointment confirmed with ${
        doctorName ? `Dr. ${doctorName}` : "your doctor"
      } on ${appointmentDate} at ${appointmentTime}.`,
      appointment: appt,
    });
  } catch (err) {
    console.log("BOOK APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;