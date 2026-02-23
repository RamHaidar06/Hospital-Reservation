const express = require("express");
const Appointment = require("../models/Appointment");
const auth = require("../middleware/auth");

const router = express.Router();

// get my appointments
router.get("/mine", auth, async (req, res) => {
  const { userId, role } = req.user;

  const filter =
    role === "patient" ? { patientId: userId } :
    role === "doctor" ? { doctorId: userId } :
    {};

  const appts = await Appointment.find(filter).sort({ createdAt: -1 });
  res.json(appts);
});

// create appointment (patient books)
router.post("/", auth, async (req, res) => {
  const { userId, role } = req.user;
  if (role !== "patient") return res.status(403).json({ message: "Only patients can book" });

  const { doctorId, appointmentDate, appointmentTime, reason, notes } = req.body;
  if (!doctorId || !appointmentDate || !appointmentTime || !reason)
    return res.status(400).json({ message: "Missing fields" });

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

  res.json(appt);
});

module.exports = router;