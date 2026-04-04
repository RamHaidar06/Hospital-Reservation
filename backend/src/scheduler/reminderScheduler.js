const { query } = require("../db");
const {
  sendAppointmentReminderEmail,
  sendAppointmentAutoCancelledEmail,
} = require("../../utils/mailer");

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;
const INTERVAL_MS = 60 * 1000;

function parseApptDate(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

async function runSchedulerTick() {
  try {
    const now = Date.now();
    const pendingResult = await query("select * from appointments where status = 'pending'");

    for (const appt of pendingResult.rows) {
      const apptMs = parseApptDate(appt.appointment_date, appt.appointment_time).getTime();
      const msLeft = apptMs - now;
      if (msLeft <= 0) continue;

      if (msLeft <= THIRTY_MIN_MS) {
        await query("update appointments set status = 'cancelled', updated_at = now() where id = $1", [appt.id]);

        const usersResult = await query(
          `select
             p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
             d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email
           from users p, users d
           where p.id = $1 and d.id = $2`,
          [appt.patient_id, appt.doctor_id]
        );

        const row = usersResult.rows[0];
        const patientName = [row?.patient_first_name, row?.patient_last_name].filter(Boolean).join(" ");
        const doctorName = `Dr. ${[row?.doctor_first_name, row?.doctor_last_name].filter(Boolean).join(" ")}`;

        try {
          await sendAppointmentAutoCancelledEmail({
            patientEmail: row?.patient_email,
            patientName,
            doctorEmail: row?.doctor_email,
            doctorName,
            appointmentDate: appt.appointment_date,
            appointmentTime: appt.appointment_time,
          });
          console.log(`[Scheduler] Auto-cancelled appointment ${appt.id} (30min mark)`);
        } catch (mailErr) {
          console.error(`[Scheduler] Auto-cancel email failed for ${appt.id}:`, mailErr.message);
        }

        continue;
      }

      if (msLeft <= TWENTY_FOUR_HOURS_MS && !appt.reminder_sent_at) {
        const usersResult = await query(
          `select
             p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
             d.first_name as doctor_first_name, d.last_name as doctor_last_name
           from users p, users d
           where p.id = $1 and d.id = $2`,
          [appt.patient_id, appt.doctor_id]
        );

        const row = usersResult.rows[0];
        if (!row?.patient_email) continue;

        const patientName = [row.patient_first_name, row.patient_last_name].filter(Boolean).join(" ");
        const doctorName = `Dr. ${[row.doctor_first_name, row.doctor_last_name].filter(Boolean).join(" ")}`;

        try {
          await sendAppointmentReminderEmail({
            patientEmail: row.patient_email,
            patientName,
            doctorName,
            appointmentDate: appt.appointment_date,
            appointmentTime: appt.appointment_time,
          });

          await query("update appointments set reminder_sent_at = now(), updated_at = now() where id = $1", [appt.id]);
          console.log(`[Scheduler] Reminder sent for appointment ${appt.id}`);
        } catch (mailErr) {
          console.error(`[Scheduler] Reminder email failed for ${appt.id}:`, mailErr.message);
        }
      }
    }
  } catch (err) {
    console.error("[Scheduler] Tick error:", err.message);
  }
}

function startReminderScheduler() {
  console.log("[Scheduler] Started - checking every 60s");
  runSchedulerTick();
  setInterval(runSchedulerTick, INTERVAL_MS);
}

module.exports = { startReminderScheduler };
