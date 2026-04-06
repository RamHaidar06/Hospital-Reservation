const express = require("express");

const auth = require("../middleware/auth");
const { query } = require("../db");
const { attachAppointmentUsers } = require("../utils/dbMappers");
const {
  sendAppointmentConfirmationEmail,
  sendAppointmentPatientConfirmedEmail,
  sendAppointmentReminderEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentCancelledEmail,
} = require("../../utils/mailer");

const router = express.Router();
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;

function parseApptDate(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

async function getRoleBoundRecipientEmails(patientId, doctorId) {
  // Fetch patient email directly from patient user
  const patientResult = await query(
    "select email from users where id = $1 and role = 'patient' limit 1",
    [patientId]
  );
  
  // Fetch doctor email directly from doctor user
  const doctorResult = await query(
    "select email from users where id = $1 and role = 'doctor' limit 1",
    [doctorId]
  );

  const patient_email = patientResult.rows[0]?.email || "";
  const doctor_email = doctorResult.rows[0]?.email || "";

  return { patient_email, doctor_email };
}

async function getAppointmentWithUsers(id) {
  const result = await query(
    `select a.*,
            p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
            d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
            d.specialty as doctor_specialty, d.years_experience as doctor_years_experience
     from appointments a
     left join users p on p.id = a.patient_id and p.role = 'patient'
     left join users d on d.id = a.doctor_id and d.role = 'doctor'
     where a.id = $1
     limit 1`,
    [id]
  );
  return result.rows[0] ? attachAppointmentUsers(result.rows[0]) : null;
}

router.get("/mine", auth, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const column = role === "patient" ? "patient_id" : role === "doctor" ? "doctor_id" : null;
    if (!column) return res.status(403).json({ message: "Invalid role" });

    const result = await query(
      `select a.*,
              p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
              d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
              d.specialty as doctor_specialty, d.years_experience as doctor_years_experience
       from appointments a
       left join users p on p.id = a.patient_id
       left join users d on d.id = a.doctor_id
       where a.${column} = $1
       order by a.created_at desc`,
      [userId]
    );

    res.json(result.rows.map(attachAppointmentUsers));
  } catch (err) {
    console.log("MINE APPOINTMENTS ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

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

    const apptAt = parseApptDate(appointmentDate, appointmentTime);
    if (Number.isNaN(apptAt.getTime()) || apptAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: "Appointment time must be in the future" });
    }

    const doctorCheck = await query("select id from users where id = $1 and role = 'doctor' limit 1", [doctorId]);
    if (!doctorCheck.rows[0]) {
      return res.status(400).json({ message: "Invalid doctorId" });
    }

    const clash = await query(
      `select id from appointments
       where doctor_id = $1 and appointment_date = $2 and appointment_time = $3 and status <> 'cancelled'
       limit 1`,
      [doctorId, appointmentDate, appointmentTime]
    );
    if (clash.rows[0]) return res.status(409).json({ message: "Time slot already booked" });

    const insertResult = await query(
      `insert into appointments (
        patient_id, doctor_id, appointment_date, appointment_time, reason, notes
      ) values ($1, $2, $3, $4, $5, $6)
      returning *`,
      [userId, doctorId, appointmentDate, appointmentTime, reason, notes || ""]
    );

    const appt = await getAppointmentWithUsers(insertResult.rows[0].id);

    const doctorName = [appt.doctorId?.firstName, appt.doctorId?.lastName].filter(Boolean).join(" ").trim();
    const patientName = [appt.patientId?.firstName, appt.patientId?.lastName].filter(Boolean).join(" ").trim();
    const recipients = await getRoleBoundRecipientEmails(appt.patientId?.id || appt.patientId, appt.doctorId?.id || appt.doctorId);
    
    // Log resolved emails for debugging
    console.log(`[Route][book] patient=${appt.patientId?.id || appt.patientId} -> ${recipients.patient_email ? recipients.patient_email.slice(0,2) + '***' : 'EMPTY'} | doctor=${appt.doctorId?.id || appt.doctorId} -> ${recipients.doctor_email ? recipients.doctor_email.slice(0,2) + '***' : 'EMPTY'}`);
    
    const apptMs = parseApptDate(appointmentDate, appointmentTime).getTime();
    const msUntil = apptMs - Date.now();

    let emailStatus = { skipped: true, reason: "Not attempted" };
    try {
      emailStatus = await sendAppointmentConfirmationEmail({
        patientEmail: recipients.patient_email,
        patientName,
        doctorEmail: recipients.doctor_email,
        doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
        appointmentDate,
        appointmentTime,
        reason,
        notes,
      });

      if (msUntil <= TWENTY_FOUR_HOURS_MS && msUntil > THIRTY_MIN_MS) {
        await sendAppointmentReminderEmail({
          patientEmail: recipients.patient_email,
          patientName,
          doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
          appointmentDate,
          appointmentTime,
        });
        await query("update appointments set reminder_sent_at = now(), updated_at = now() where id = $1", [appt.id]);
        appt.reminderSentAt = new Date().toISOString();
      }
    } catch (mailErr) {
      console.log("BOOK EMAIL ERROR:", mailErr.message || mailErr);
      emailStatus = { skipped: true, reason: mailErr.message || "Email send failed" };
    }

    res.json({
      message: `Appointment booked with ${doctorName ? `Dr. ${doctorName}` : "your doctor"} on ${appointmentDate} at ${appointmentTime}. Please confirm it when the time comes.`,
      appointment: appt,
      emailStatus,
    });
  } catch (err) {
    console.log("BOOK APPOINTMENT ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/:id/patient-confirm", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    if (role !== "patient") {
      return res.status(403).json({ message: "Only patients can confirm appointments" });
    }

    const appt = await getAppointmentWithUsers(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (String(appt.patientId?.id || appt.patientId) !== String(userId)) {
      return res.status(403).json({ message: "Not your appointment" });
    }
    if (appt.status === "cancelled") return res.status(400).json({ message: "This appointment has been cancelled" });
    if (appt.status === "confirmed" || appt.status === "completed") {
      return res.status(400).json({ message: "Appointment is already confirmed" });
    }

    const apptMs = parseApptDate(appt.appointmentDate, appt.appointmentTime).getTime();
    const msLeft = apptMs - Date.now();
    const windowOpenTime = new Date(apptMs - TWENTY_FOUR_HOURS_MS);
    const windowCloseTime = new Date(apptMs - THIRTY_MIN_MS);
    const fmt = (d) =>
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
      " on " +
      d.toLocaleDateString([], { month: "short", day: "numeric" });

    if (msLeft > TWENTY_FOUR_HOURS_MS) {
      return res.status(400).json({
        message: `You can confirm your appointment between ${fmt(windowOpenTime)} and ${fmt(windowCloseTime)}.`,
        tooEarly: true,
        windowOpen: windowOpenTime.toISOString(),
        windowClose: windowCloseTime.toISOString(),
      });
    }

    if (msLeft <= THIRTY_MIN_MS) {
      return res.status(400).json({
        message: "The confirmation window has closed (less than 30 minutes to appointment). The appointment will be auto-cancelled shortly.",
        tooLate: true,
      });
    }

    await query("update appointments set status = 'confirmed', updated_at = now() where id = $1", [id]);

    try {
      const doctorName = [appt.doctorId?.firstName, appt.doctorId?.lastName].filter(Boolean).join(" ").trim();
      const patientName = [appt.patientId?.firstName, appt.patientId?.lastName].filter(Boolean).join(" ").trim();

      await sendAppointmentPatientConfirmedEmail({
        doctorEmail: appt.doctorId?.email,
        doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
        patientName,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        reason: appt.reason,
        notes: appt.notes,
      });
    } catch (mailErr) {
      console.log("CONFIRM DOCTOR EMAIL ERROR:", mailErr.message);
    }

    const updated = await getAppointmentWithUsers(id);
    res.json({ message: "Appointment confirmed successfully", appointment: updated });
  } catch (err) {
    console.log("PATIENT CONFIRM ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/:id/complete", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    if (role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can mark appointments as completed" });
    }

    const appt = await getAppointmentWithUsers(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (String(appt.doctorId?.id || appt.doctorId) !== String(userId)) {
      return res.status(403).json({ message: "You are not the doctor for this appointment" });
    }
    if (appt.status === "cancelled") return res.status(400).json({ message: "Cannot complete a cancelled appointment" });
    if (appt.status === "completed") return res.status(400).json({ message: "Appointment is already completed" });

    await query("update appointments set status = 'completed', updated_at = now() where id = $1", [id]);
    const updated = await getAppointmentWithUsers(id);
    res.json({ message: "Appointment marked as completed", appointment: updated });
  } catch (err) {
    console.log("COMPLETE APPOINTMENT ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/:id/visit-summary", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    if (role !== "doctor") return res.status(403).json({ message: "Only doctors can update the visit summary" });

    const appt = await getAppointmentWithUsers(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (String(appt.doctorId?.id || appt.doctorId) !== String(userId)) {
      return res.status(403).json({ message: "You are not the doctor for this appointment" });
    }
    if (appt.status !== "completed") {
      return res.status(400).json({ message: "Visit summary is only available for completed appointments" });
    }

    const { visitSummary } = req.body;
    if (typeof visitSummary !== "string") {
      return res.status(400).json({ message: "visitSummary must be a string" });
    }

    await query(
      "update appointments set visit_summary = $2, visit_summary_updated_at = now(), updated_at = now() where id = $1",
      [id, visitSummary]
    );

    const updated = await getAppointmentWithUsers(id);
    res.json({ message: "Visit summary updated", appointment: updated });
  } catch (err) {
    console.log("VISIT SUMMARY ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/:id/cancel", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const appt = await getAppointmentWithUsers(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    const patientId = appt.patientId?.id || appt.patientId;
    const doctorId = appt.doctorId?.id || appt.doctorId;
    const isOwner = String(patientId) === String(userId) || String(doctorId) === String(userId);

    if (!isOwner) return res.status(403).json({ message: "Not allowed" });
    if (role !== "patient" && role !== "doctor") return res.status(403).json({ message: "Invalid role" });

    await query("update appointments set status = 'cancelled', updated_at = now() where id = $1", [id]);
    const updated = await getAppointmentWithUsers(id);

    const doctorName = [updated.doctorId?.firstName, updated.doctorId?.lastName].filter(Boolean).join(" ").trim();
    const patientName = [updated.patientId?.firstName, updated.patientId?.lastName].filter(Boolean).join(" ").trim();
    const recipients = await getRoleBoundRecipientEmails(updated.patientId?.id || updated.patientId, updated.doctorId?.id || updated.doctorId);
    let emailStatus = { skipped: true, reason: "Not attempted" };

    try {
      emailStatus = await sendAppointmentCancelledEmail({
        patientEmail: recipients.patient_email,
        patientName,
        doctorEmail: recipients.doctor_email,
        doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
        appointmentDate: updated.appointmentDate,
        appointmentTime: updated.appointmentTime,
        reason: updated.reason,
      });
    } catch (mailErr) {
      emailStatus = { skipped: true, reason: mailErr.message };
    }

    res.json({ message: "Appointment cancelled", appointment: updated, emailStatus });
  } catch (err) {
    console.log("CANCEL APPOINTMENT ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/:id/reschedule", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const { appointmentDate, appointmentTime } = req.body;

    if (!appointmentDate || !appointmentTime) return res.status(400).json({ message: "Missing fields" });

    const nextAt = parseApptDate(appointmentDate, appointmentTime);
    if (Number.isNaN(nextAt.getTime()) || nextAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: "Rescheduled time must be in the future" });
    }

    const appt = await getAppointmentWithUsers(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (role !== "patient" || String(appt.patientId?.id || appt.patientId) !== String(userId)) {
      return res.status(403).json({ message: "Only the patient can reschedule" });
    }

    const clash = await query(
      `select id from appointments
       where id <> $1 and doctor_id = $2 and appointment_date = $3 and appointment_time = $4 and status <> 'cancelled'
       limit 1`,
      [id, appt.doctorId?.id || appt.doctorId, appointmentDate, appointmentTime]
    );
    if (clash.rows[0]) return res.status(409).json({ message: "Time slot already booked" });

    await query(
      `update appointments
       set appointment_date = $2, appointment_time = $3, status = 'pending', reminder_sent_at = null, updated_at = now()
       where id = $1`,
      [id, appointmentDate, appointmentTime]
    );

    const updated = await getAppointmentWithUsers(id);
    const doctorName = [updated.doctorId?.firstName, updated.doctorId?.lastName].filter(Boolean).join(" ").trim();
    const patientName = [updated.patientId?.firstName, updated.patientId?.lastName].filter(Boolean).join(" ").trim();
    const recipients = await getRoleBoundRecipientEmails(updated.patientId?.id || updated.patientId, updated.doctorId?.id || updated.doctorId);
    let emailStatus = { skipped: true, reason: "Not attempted" };

    try {
      emailStatus = await sendAppointmentRescheduledEmail({
        patientEmail: recipients.patient_email,
        patientName,
        doctorEmail: recipients.doctor_email,
        doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
        appointmentDate,
        appointmentTime,
        reason: updated.reason,
      });
    } catch (mailErr) {
      emailStatus = { skipped: true, reason: mailErr.message };
    }

    res.json({ message: "Appointment rescheduled", appointment: updated, emailStatus });
  } catch (err) {
    console.log("RESCHEDULE APPOINTMENT ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const { status, appointmentDate, appointmentTime } = req.body;

    const appt = await getAppointmentWithUsers(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    const patientId = appt.patientId?.id || appt.patientId;
    const doctorId = appt.doctorId?.id || appt.doctorId;
    const isOwner = String(patientId) === String(userId) || String(doctorId) === String(userId);
    if (!isOwner) return res.status(403).json({ message: "Not allowed" });

    if (status === "cancelled") {
      if (role !== "patient" && role !== "doctor") return res.status(403).json({ message: "Invalid role" });

      await query("update appointments set status = 'cancelled', updated_at = now() where id = $1", [id]);
      const updated = await getAppointmentWithUsers(id);

      const doctorName = [updated.doctorId?.firstName, updated.doctorId?.lastName].filter(Boolean).join(" ").trim();
      const patientName = [updated.patientId?.firstName, updated.patientId?.lastName].filter(Boolean).join(" ").trim();
      const recipients = await getRoleBoundRecipientEmails(updated.patientId?.id || updated.patientId, updated.doctorId?.id || updated.doctorId);
      let emailStatus = { skipped: true, reason: "Not attempted" };

      try {
        emailStatus = await sendAppointmentCancelledEmail({
          patientEmail: recipients.patient_email,
          patientName,
          doctorEmail: recipients.doctor_email,
          doctorName: doctorName ? `Dr. ${doctorName}` : "Doctor",
          appointmentDate: updated.appointmentDate,
          appointmentTime: updated.appointmentTime,
          reason: updated.reason,
        });
      } catch (mailErr) {
        emailStatus = { skipped: true, reason: mailErr.message };
      }

      return res.json({ message: "Appointment cancelled", appointment: updated, emailStatus });
    }

    if (appointmentDate && appointmentTime) {
      if (role !== "patient" || String(patientId) !== String(userId)) {
        return res.status(403).json({ message: "Only the patient can reschedule" });
      }

      const nextAt = parseApptDate(appointmentDate, appointmentTime);
      if (Number.isNaN(nextAt.getTime()) || nextAt.getTime() <= Date.now()) {
        return res.status(400).json({ message: "Rescheduled time must be in the future" });
      }

      const clash = await query(
        `select id from appointments
         where id <> $1 and doctor_id = $2 and appointment_date = $3 and appointment_time = $4 and status <> 'cancelled'
         limit 1`,
        [id, doctorId, appointmentDate, appointmentTime]
      );
      if (clash.rows[0]) return res.status(409).json({ message: "Time slot already booked" });

      await query(
        `update appointments
         set appointment_date = $2, appointment_time = $3, status = 'pending', reminder_sent_at = null, updated_at = now()
         where id = $1`,
        [id, appointmentDate, appointmentTime]
      );

      const updated = await getAppointmentWithUsers(id);
      return res.json({ message: "Appointment rescheduled", appointment: updated });
    }

    res.status(400).json({ message: "Nothing to update" });
  } catch (err) {
    console.log("PATCH APPOINTMENT ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
