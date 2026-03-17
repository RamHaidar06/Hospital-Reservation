/**
 * reminderScheduler.js
 *
 * Runs every 60 seconds. Handles two jobs:
 *
 * JOB 1 — 6-hour reminder
 *   Finds PENDING appointments within the next 6 hours that haven't had a
 *   reminder sent yet → emails the patient to go confirm on the website.
 *
 * JOB 2 — 30-minute auto-cancel
 *   Finds PENDING appointments whose start time is ≤ 30 minutes away →
 *   cancels them and emails both patient and doctor.
 */

const Appointment = require("../models/Appointment");
const User        = require("../models/User");
const {
  sendAppointmentReminderEmail,
  sendAppointmentAutoCancelledEmail,
} = require("../../utils/mailer");

const SIX_HOURS_MS   = 6  * 60 * 60 * 1000;
const THIRTY_MIN_MS  = 30 * 60 * 1000;
const INTERVAL_MS    = 60 * 1000; // every 60 seconds

function parseApptDate(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

async function runSchedulerTick() {
  try {
    const now = Date.now();

    // Load all pending appointments in one query
    const pending = await Appointment.find({ status: "pending" });

    for (const appt of pending) {
      const apptMs  = parseApptDate(appt.appointmentDate, appt.appointmentTime).getTime();
      const msLeft  = apptMs - now;

      // Skip appointments already in the past (edge case)
      if (msLeft <= 0) continue;

      // ── JOB 2: Auto-cancel at 30-minute mark ──────────────────────────────
      if (msLeft <= THIRTY_MIN_MS) {
        appt.status = "cancelled";
        await appt.save();

        const patient = await User.findById(appt.patientId).select("firstName lastName email");
        const doctor  = await User.findById(appt.doctorId).select("firstName lastName email");

        const patientName = [patient?.firstName, patient?.lastName].filter(Boolean).join(" ");
        const doctorName  = `Dr. ${[doctor?.firstName, doctor?.lastName].filter(Boolean).join(" ")}`;

        try {
          await sendAppointmentAutoCancelledEmail({
            patientEmail:    patient?.email,
            patientName,
            doctorEmail:     doctor?.email,
            doctorName,
            appointmentDate: appt.appointmentDate,
            appointmentTime: appt.appointmentTime,
          });
          console.log(`[Scheduler] Auto-cancelled appointment ${appt._id} (30min mark)`);
        } catch (mailErr) {
          console.error(`[Scheduler] Auto-cancel email failed for ${appt._id}:`, mailErr.message);
        }

        continue; // no need to check reminder for this one
      }

      // ── JOB 1: Send 6-hour reminder ───────────────────────────────────────
      if (msLeft <= SIX_HOURS_MS && !appt.reminderSentAt) {
        const patient = await User.findById(appt.patientId).select("firstName lastName email");
        const doctor  = await User.findById(appt.doctorId).select("firstName lastName");

        if (!patient?.email) continue;

        const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(" ");
        const doctorName  = `Dr. ${[doctor?.firstName, doctor?.lastName].filter(Boolean).join(" ")}`;

        try {
          await sendAppointmentReminderEmail({
            patientEmail:    patient.email,
            patientName,
            doctorName,
            appointmentDate: appt.appointmentDate,
            appointmentTime: appt.appointmentTime,
          });

          appt.reminderSentAt = new Date();
          await appt.save();

          console.log(`[Scheduler] Reminder sent for appointment ${appt._id}`);
        } catch (mailErr) {
          console.error(`[Scheduler] Reminder email failed for ${appt._id}:`, mailErr.message);
        }
      }
    }
  } catch (err) {
    console.error("[Scheduler] Tick error:", err.message);
  }
}

function startReminderScheduler() {
  console.log("[Scheduler] Started — checking every 60s");
  runSchedulerTick(); // run immediately on boot
  setInterval(runSchedulerTick, INTERVAL_MS);
}

module.exports = { startReminderScheduler };
