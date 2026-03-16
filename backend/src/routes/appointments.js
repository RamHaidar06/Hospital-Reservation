const express = require("express");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const auth = require("../middleware/auth");
const {
  sendAppointmentConfirmationEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentCancelledEmail,
} = require("../../utils/mailer");

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

    await appt.populate([
      {
        path: "doctorId",
        select: "firstName lastName specialty yearsExperience email",
      },
      {
        path: "patientId",
        select: "firstName lastName email",
      },
    ]);

    const doctorName = [appt.doctorId?.firstName, appt.doctorId?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const patientName = [appt.patientId?.firstName, appt.patientId?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    let emailStatus = { skipped: true, reason: "Not attempted" };
    try {
      emailStatus = await sendAppointmentConfirmationEmail({
        patientEmail: appt.patientId?.email,
        patientName,
        doctorEmail: appt.doctorId?.email,
        doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
        appointmentDate,
        appointmentTime,
        reason,
        notes,
      });
    } catch (mailErr) {
      console.log("APPOINTMENT EMAIL ERROR:", mailErr.message || mailErr);
      emailStatus = { skipped: true, reason: mailErr.message || "Email send failed" };
    }

    return res.json({
      message: `Appointment confirmed with ${
        doctorName ? `Dr. ${doctorName}` : "your doctor"
      } on ${appointmentDate} at ${appointmentTime}.`,
      appointment: appt,
      emailStatus,
    });
  } catch (err) {
    console.log("BOOK APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * PATCH /api/appointments/:id/cancel
 * patient or doctor who owns the appointment can cancel it
 */
router.patch("/:id/cancel", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    const isPatientOwner = String(appt.patientId) === String(userId);
    const isDoctorOwner = String(appt.doctorId) === String(userId);

    if (!isPatientOwner && !isDoctorOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (role !== "patient" && role !== "doctor") {
      return res.status(403).json({ message: "Invalid role" });
    }

    appt.status = "cancelled";
    await appt.save();

    await appt.populate([
      { path: "doctorId", select: "firstName lastName email" },
      { path: "patientId", select: "firstName lastName email" },
    ]);

    const doctorName = [appt.doctorId?.firstName, appt.doctorId?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const patientName = [appt.patientId?.firstName, appt.patientId?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    let emailStatus = { skipped: true, reason: "Not attempted" };
    try {
      emailStatus = await sendAppointmentCancelledEmail({
        patientEmail: appt.patientId?.email,
        patientName,
        doctorEmail: appt.doctorId?.email,
        doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        reason: appt.reason,
      });
    } catch (mailErr) {
      console.log("CANCEL EMAIL ERROR:", mailErr.message || mailErr);
      emailStatus = { skipped: true, reason: mailErr.message || "Email send failed" };
    }

    return res.json({
      message: "Appointment cancelled",
      appointment: appt,
      emailStatus,
    });
  } catch (err) {
    console.log("CANCEL APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * PATCH /api/appointments/:id/reschedule
 * patient who owns the appointment can reschedule it
 */
router.patch("/:id/reschedule", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const { appointmentDate, appointmentTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    if (role !== "patient" || String(appt.patientId) !== String(userId)) {
      return res.status(403).json({ message: "Only the patient can reschedule" });
    }

    const clash = await Appointment.findOne({
      _id: { $ne: appt._id },
      doctorId: appt.doctorId,
      appointmentDate,
      appointmentTime,
      status: { $ne: "cancelled" },
    });

    if (clash) {
      return res.status(409).json({ message: "Time slot already booked" });
    }

    appt.appointmentDate = appointmentDate;
    appt.appointmentTime = appointmentTime;
    await appt.save();

    await appt.populate([
      { path: "doctorId", select: "firstName lastName email" },
      { path: "patientId", select: "firstName lastName email" },
    ]);

    const doctorName = [appt.doctorId?.firstName, appt.doctorId?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const patientName = [appt.patientId?.firstName, appt.patientId?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    let emailStatus = { skipped: true, reason: "Not attempted" };
    try {
      emailStatus = await sendAppointmentRescheduledEmail({
        patientEmail: appt.patientId?.email,
        patientName,
        doctorEmail: appt.doctorId?.email,
        doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
        appointmentDate,
        appointmentTime,
        reason: appt.reason,
      });
    } catch (mailErr) {
      console.log("RESCHEDULE EMAIL ERROR:", mailErr.message || mailErr);
      emailStatus = { skipped: true, reason: mailErr.message || "Email send failed" };
    }

    return res.json({
      message: "Appointment rescheduled",
      appointment: appt,
      emailStatus,
    });
  } catch (err) {
    console.log("RESCHEDULE APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * PATCH /api/appointments/:id
 * fallback update endpoint used by frontend legacy flow
 */
router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const { status, appointmentDate, appointmentTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    const isPatientOwner = String(appt.patientId) === String(userId);
    const isDoctorOwner = String(appt.doctorId) === String(userId);

    if (!isPatientOwner && !isDoctorOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (status === "cancelled") {
      if (role !== "patient" && role !== "doctor") {
        return res.status(403).json({ message: "Invalid role" });
      }

      appt.status = "cancelled";
      await appt.save();

      await appt.populate([
        { path: "doctorId", select: "firstName lastName email" },
        { path: "patientId", select: "firstName lastName email" },
      ]);

      const doctorName = [appt.doctorId?.firstName, appt.doctorId?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const patientName = [appt.patientId?.firstName, appt.patientId?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      let emailStatus = { skipped: true, reason: "Not attempted" };
      try {
        emailStatus = await sendAppointmentCancelledEmail({
          patientEmail: appt.patientId?.email,
          patientName,
          doctorEmail: appt.doctorId?.email,
          doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
          appointmentDate: appt.appointmentDate,
          appointmentTime: appt.appointmentTime,
          reason: appt.reason,
        });
      } catch (mailErr) {
        console.log("CANCEL EMAIL ERROR:", mailErr.message || mailErr);
        emailStatus = {
          skipped: true,
          reason: mailErr.message || "Email send failed",
        };
      }

      return res.json({
        message: "Appointment cancelled",
        appointment: appt,
        emailStatus,
      });
    }

    if (appointmentDate && appointmentTime) {
      if (role !== "patient" || !isPatientOwner) {
        return res.status(403).json({ message: "Only the patient can reschedule" });
      }

      const clash = await Appointment.findOne({
        _id: { $ne: appt._id },
        doctorId: appt.doctorId,
        appointmentDate,
        appointmentTime,
        status: { $ne: "cancelled" },
      });

      if (clash) {
        return res.status(409).json({ message: "Time slot already booked" });
      }

      appt.appointmentDate = appointmentDate;
      appt.appointmentTime = appointmentTime;
      await appt.save();

      await appt.populate([
        { path: "doctorId", select: "firstName lastName email" },
        { path: "patientId", select: "firstName lastName email" },
      ]);

      const doctorName = [appt.doctorId?.firstName, appt.doctorId?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const patientName = [appt.patientId?.firstName, appt.patientId?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      let emailStatus = { skipped: true, reason: "Not attempted" };
      try {
        emailStatus = await sendAppointmentRescheduledEmail({
          patientEmail: appt.patientId?.email,
          patientName,
          doctorEmail: appt.doctorId?.email,
          doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
          appointmentDate,
          appointmentTime,
          reason: appt.reason,
        });
      } catch (mailErr) {
        console.log("RESCHEDULE EMAIL ERROR:", mailErr.message || mailErr);
        emailStatus = {
          skipped: true,
          reason: mailErr.message || "Email send failed",
        };
      }

      return res.json({
        message: "Appointment rescheduled",
        appointment: appt,
        emailStatus,
      });
    }

    return res.status(400).json({ message: "Nothing to update" });
  } catch (err) {
    console.log("PATCH APPOINTMENT ERROR:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;