const express    = require("express");
const mongoose   = require("mongoose");
const Appointment = require("../models/Appointment");
const User       = require("../models/User");
const auth       = require("../middleware/auth");
const {
  sendAppointmentConfirmationEmail,
  sendAppointmentPatientConfirmedEmail,
  sendAppointmentReminderEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentCancelledEmail,
} = require("../../utils/mailer");

const router = express.Router();

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const THIRTY_MIN_MS        = 30 * 60 * 1000;

function parseApptDate(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/appointments/mine
// ─────────────────────────────────────────────────────────────────────────────
router.get("/mine", auth, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const filter =
      role === "patient" ? { patientId: userId } :
      role === "doctor"  ? { doctorId:  userId } : null;

    if (!filter) return res.status(403).json({ message: "Invalid role" });

    const appts = await Appointment.find(filter)
      .populate([
        { path: "patientId", select: "firstName lastName email" },
        { path: "doctorId", select: "firstName lastName specialty yearsExperience email" },
      ])
      .sort({ createdAt: -1 });
    return res.json(appts);
  } catch (err) {
    console.log("MINE APPOINTMENTS ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/appointments — book, starts as PENDING
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
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

    const apptAt = parseApptDate(appointmentDate, appointmentTime);
    if (Number.isNaN(apptAt.getTime()) || apptAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: "Appointment time must be in the future" });
    }

    const clash = await Appointment.findOne({
      doctorId, appointmentDate, appointmentTime,
      status: { $ne: "cancelled" },
    });
    if (clash) return res.status(409).json({ message: "Time slot already booked" });

    // Status defaults to "pending" in schema
    const appt = await Appointment.create({
      patientId: userId, doctorId,
      appointmentDate, appointmentTime,
      reason, notes: notes || "",
    });

    await appt.populate([
      { path: "doctorId",  select: "firstName lastName specialty yearsExperience email" },
      { path: "patientId", select: "firstName lastName email" },
    ]);

    const doctorName  = [appt.doctorId?.firstName,  appt.doctorId?.lastName ].filter(Boolean).join(" ").trim();
    const patientName = [appt.patientId?.firstName, appt.patientId?.lastName].filter(Boolean).join(" ").trim();

    const apptMs    = parseApptDate(appointmentDate, appointmentTime).getTime();
    const msUntil   = apptMs - Date.now();

    let emailStatus = { skipped: true, reason: "Not attempted" };
    try {
      // Original booking email — no confirm link
      emailStatus = await sendAppointmentConfirmationEmail({
        patientEmail: appt.patientId?.email, patientName,
        doctorEmail:  appt.doctorId?.email,
        doctorName:   doctorName ? `Dr. ${doctorName}` : "Doctor",
        appointmentDate, appointmentTime, reason, notes,
      });

      // If already within 24 hours, also send the reminder right now
      // and mark it so the scheduler doesn't duplicate it
      if (msUntil <= TWENTY_FOUR_HOURS_MS && msUntil > THIRTY_MIN_MS) {
        await sendAppointmentReminderEmail({
          patientEmail: appt.patientId?.email, patientName,
          doctorName:   doctorName ? `Dr. ${doctorName}` : "Doctor",
          appointmentDate, appointmentTime,
        });
        appt.reminderSentAt = new Date();
        await appt.save();
      }
    } catch (mailErr) {
      console.log("BOOK EMAIL ERROR:", mailErr.message || mailErr);
      emailStatus = { skipped: true, reason: mailErr.message || "Email send failed" };
    }

    return res.json({
      message: `Appointment booked with ${doctorName ? `Dr. ${doctorName}` : "your doctor"} on ${appointmentDate} at ${appointmentTime}. Please confirm it when the time comes.`,
      appointment: appt,
      emailStatus,
    });
  } catch (err) {
    console.log("BOOK APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/appointments/:id/patient-confirm
// Patient confirms their pending appointment (only allowed inside the 24h–30min window)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/patient-confirm", auth, async (req, res) => {
  try {
    const { id }           = req.params;
    const { userId, role } = req.user;

    if (role !== "patient") {
      return res.status(403).json({ message: "Only patients can confirm appointments" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    if (String(appt.patientId) !== String(userId)) {
      return res.status(403).json({ message: "Not your appointment" });
    }

    if (appt.status === "cancelled") {
      return res.status(400).json({ message: "This appointment has been cancelled" });
    }

    if (appt.status === "confirmed" || appt.status === "completed") {
      return res.status(400).json({ message: "Appointment is already confirmed" });
    }

    const apptMs   = parseApptDate(appt.appointmentDate, appt.appointmentTime).getTime();
    const msLeft   = apptMs - Date.now();

    // Build window times for error message
    const windowOpenTime  = new Date(apptMs - TWENTY_FOUR_HOURS_MS);
    const windowCloseTime = new Date(apptMs - THIRTY_MIN_MS);

    const fmt = (d) =>
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
      " on " +
      d.toLocaleDateString([], { month: "short", day: "numeric" });

    // Too early — outside confirmation window
    if (msLeft > TWENTY_FOUR_HOURS_MS) {
      return res.status(400).json({
        message: `You can confirm your appointment between ${fmt(windowOpenTime)} and ${fmt(windowCloseTime)}.`,
        tooEarly: true,
        windowOpen:  windowOpenTime.toISOString(),
        windowClose: windowCloseTime.toISOString(),
      });
    }

    // Too late — 30 min window has passed
    if (msLeft <= THIRTY_MIN_MS) {
      return res.status(400).json({
        message: "The confirmation window has closed (less than 30 minutes to appointment). The appointment will be auto-cancelled shortly.",
        tooLate: true,
      });
    }

    // ✓ Inside window — confirm
    appt.status = "confirmed";
    await appt.save();

    // Notify doctor
    try {
      await appt.populate([
        { path: "doctorId",  select: "firstName lastName email" },
        { path: "patientId", select: "firstName lastName email" },
      ]);

      const doctorName  = [appt.doctorId?.firstName,  appt.doctorId?.lastName ].filter(Boolean).join(" ").trim();
      const patientName = [appt.patientId?.firstName, appt.patientId?.lastName].filter(Boolean).join(" ").trim();

      await sendAppointmentPatientConfirmedEmail({
        doctorEmail:     appt.doctorId?.email,
        doctorName:      doctorName ? `Dr. ${doctorName}` : "Doctor",
        patientName,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        reason:          appt.reason,
        notes:           appt.notes,
      });
    } catch (mailErr) {
      console.log("CONFIRM DOCTOR EMAIL ERROR:", mailErr.message);
    }

    return res.json({ message: "Appointment confirmed successfully", appointment: appt });
  } catch (err) {
    console.log("PATIENT CONFIRM ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/appointments/:id/complete  — doctor only
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/complete", auth, async (req, res) => {
  try {
    const { id }           = req.params;
    const { userId, role } = req.user;

    if (role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can mark appointments as completed" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (String(appt.doctorId) !== String(userId)) {
      return res.status(403).json({ message: "You are not the doctor for this appointment" });
    }
    if (appt.status === "cancelled")  return res.status(400).json({ message: "Cannot complete a cancelled appointment" });
    if (appt.status === "completed")  return res.status(400).json({ message: "Appointment is already completed" });

    appt.status = "completed";
    await appt.save();

    return res.json({ message: "Appointment marked as completed", appointment: appt });
  } catch (err) {
    console.log("COMPLETE APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/appointments/:id/visit-summary  — doctor only
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/visit-summary", auth, async (req, res) => {
  try {
    const { id }           = req.params;
    const { userId, role } = req.user;

    if (role !== "doctor") return res.status(403).json({ message: "Only doctors can update the visit summary" });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid appointment id" });

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (String(appt.doctorId) !== String(userId)) return res.status(403).json({ message: "You are not the doctor for this appointment" });
    if (appt.status !== "completed") return res.status(400).json({ message: "Visit summary is only available for completed appointments" });

    const { visitSummary } = req.body;
    if (typeof visitSummary !== "string") return res.status(400).json({ message: "visitSummary must be a string" });

    appt.visitSummary          = visitSummary;
    appt.visitSummaryUpdatedAt = new Date();
    await appt.save();

    return res.json({ message: "Visit summary updated", appointment: appt });
  } catch (err) {
    console.log("VISIT SUMMARY ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/appointments/:id/cancel
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/cancel", auth, async (req, res) => {
  try {
    const { id }           = req.params;
    const { userId, role } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid appointment id" });

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    const isOwner = String(appt.patientId) === String(userId) || String(appt.doctorId) === String(userId);
    if (!isOwner) return res.status(403).json({ message: "Not allowed" });
    if (role !== "patient" && role !== "doctor") return res.status(403).json({ message: "Invalid role" });

    appt.status = "cancelled";
    await appt.save();

    await appt.populate([
      { path: "doctorId",  select: "firstName lastName email" },
      { path: "patientId", select: "firstName lastName email" },
    ]);

    const doctorName  = [appt.doctorId?.firstName,  appt.doctorId?.lastName ].filter(Boolean).join(" ").trim();
    const patientName = [appt.patientId?.firstName, appt.patientId?.lastName].filter(Boolean).join(" ").trim();

    let emailStatus = { skipped: true, reason: "Not attempted" };
    try {
      emailStatus = await sendAppointmentCancelledEmail({
        patientEmail:    appt.patientId?.email, patientName,
        doctorEmail:     appt.doctorId?.email,
        doctorName:      doctorName ? `Dr. ${doctorName}` : "Doctor",
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        reason:          appt.reason,
      });
    } catch (mailErr) {
      emailStatus = { skipped: true, reason: mailErr.message };
    }

    return res.json({ message: "Appointment cancelled", appointment: appt, emailStatus });
  } catch (err) {
    console.log("CANCEL APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/appointments/:id/reschedule
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/reschedule", auth, async (req, res) => {
  try {
    const { id }           = req.params;
    const { userId, role } = req.user;
    const { appointmentDate, appointmentTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid appointment id" });
    if (!appointmentDate || !appointmentTime)  return res.status(400).json({ message: "Missing fields" });

    const nextAt = parseApptDate(appointmentDate, appointmentTime);
    if (Number.isNaN(nextAt.getTime()) || nextAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: "Rescheduled time must be in the future" });
    }

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (role !== "patient" || String(appt.patientId) !== String(userId)) {
      return res.status(403).json({ message: "Only the patient can reschedule" });
    }

    const clash = await Appointment.findOne({
      _id: { $ne: appt._id }, doctorId: appt.doctorId,
      appointmentDate, appointmentTime, status: { $ne: "cancelled" },
    });
    if (clash) return res.status(409).json({ message: "Time slot already booked" });

    appt.appointmentDate = appointmentDate;
    appt.appointmentTime = appointmentTime;
    appt.status          = "pending";      // reset to pending after reschedule
    appt.reminderSentAt  = null;           // allow fresh reminder for new time
    await appt.save();

    await appt.populate([
      { path: "doctorId",  select: "firstName lastName email" },
      { path: "patientId", select: "firstName lastName email" },
    ]);

    const doctorName  = [appt.doctorId?.firstName,  appt.doctorId?.lastName ].filter(Boolean).join(" ").trim();
    const patientName = [appt.patientId?.firstName, appt.patientId?.lastName].filter(Boolean).join(" ").trim();

    let emailStatus = { skipped: true, reason: "Not attempted" };
    try {
      emailStatus = await sendAppointmentRescheduledEmail({
        patientEmail:    appt.patientId?.email, patientName,
        doctorEmail:     appt.doctorId?.email,
        doctorName:      doctorName ? `Dr. ${doctorName}` : "Doctor",
        appointmentDate, appointmentTime, reason: appt.reason,
      });
    } catch (mailErr) {
      emailStatus = { skipped: true, reason: mailErr.message };
    }

    return res.json({ message: "Appointment rescheduled", appointment: appt, emailStatus });
  } catch (err) {
    console.log("RESCHEDULE APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/appointments/:id  — fallback
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id", auth, async (req, res) => {
  try {
    const { id }           = req.params;
    const { userId, role } = req.user;
    const { status, appointmentDate, appointmentTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid appointment id" });

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    const isOwner = String(appt.patientId) === String(userId) || String(appt.doctorId) === String(userId);
    if (!isOwner) return res.status(403).json({ message: "Not allowed" });

    if (status === "cancelled") {
      appt.status = "cancelled";
      await appt.save();
      await appt.populate([
        { path: "doctorId",  select: "firstName lastName email" },
        { path: "patientId", select: "firstName lastName email" },
      ]);
      const doctorName  = [appt.doctorId?.firstName,  appt.doctorId?.lastName ].filter(Boolean).join(" ").trim();
      const patientName = [appt.patientId?.firstName, appt.patientId?.lastName].filter(Boolean).join(" ").trim();
      let emailStatus = { skipped: true, reason: "Not attempted" };
      try {
        emailStatus = await sendAppointmentCancelledEmail({
          patientEmail: appt.patientId?.email, patientName,
          doctorEmail:  appt.doctorId?.email,
          doctorName:   doctorName ? `Dr. ${doctorName}` : "Doctor",
          appointmentDate: appt.appointmentDate, appointmentTime: appt.appointmentTime,
          reason: appt.reason,
        });
      } catch (e) { emailStatus = { skipped: true, reason: e.message }; }
      return res.json({ message: "Appointment cancelled", appointment: appt, emailStatus });
    }

    if (appointmentDate && appointmentTime) {
      if (role !== "patient" || String(appt.patientId) !== String(userId)) {
        return res.status(403).json({ message: "Only the patient can reschedule" });
      }

      const nextAt = parseApptDate(appointmentDate, appointmentTime);
      if (Number.isNaN(nextAt.getTime()) || nextAt.getTime() <= Date.now()) {
        return res.status(400).json({ message: "Rescheduled time must be in the future" });
      }

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
      appt.status          = "pending";
      appt.reminderSentAt  = null;
      await appt.save();
      return res.json({ message: "Appointment rescheduled", appointment: appt });
    }

    return res.status(400).json({ message: "Nothing to update" });
  } catch (err) {
    console.log("PATCH APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
