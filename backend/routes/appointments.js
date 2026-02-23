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


// cancel
router.patch("/:id/cancel", auth, async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ message: "Not found" });

  const { userId, role } = req.user;
  const isOwner =
    (role === "patient" && String(appt.patientId) === String(userId)) ||
    (role === "doctor" && String(appt.doctorId) === String(userId));

  if (!isOwner) return res.status(403).json({ message: "Forbidden" });

  appt.status = "cancelled";
  await appt.save();
  res.json(appt);
});

// reschedule
router.patch("/:id/reschedule", auth, async (req, res) => {
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

  // prevent clashes
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

  res.json(appt);
});

// generic update fallback (status/date/time)
router.patch("/:id", auth, async (req, res) => {
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
  res.json(appt);
});

module.exports = router;