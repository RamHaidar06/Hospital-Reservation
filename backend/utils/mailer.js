const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

function hasMailConfig() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING EMAIL — unchanged from original, no confirm link
// ─────────────────────────────────────────────────────────────────────────────
async function sendAppointmentConfirmationEmail({
  patientEmail,
  patientName,
  doctorEmail,
  doctorName,
  appointmentDate,
  appointmentTime,
  reason,
  notes,
}) {
  if (!patientEmail) return { skipped: true, reason: "Missing patient email" };
  if (!hasMailConfig()) return { skipped: true, reason: "Missing SMTP configuration" };

  const tx = getTransporter();
  if (!tx) return { skipped: true, reason: "SMTP transporter unavailable" };

  const from            = process.env.MAIL_FROM || process.env.SMTP_USER;
  const safePatientName = patientName || "Patient";
  const safeDoctorName  = doctorName  || "Doctor";

  const patientHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h2 style="margin:0 0 12px;">Appointment Confirmed</h2>
      <p>Hello ${safePatientName},</p>
      <p>Your appointment has been confirmed.</p>
      <ul>
        <li><strong>Doctor:</strong> ${safeDoctorName}</li>
        <li><strong>Date:</strong> ${appointmentDate}</li>
        <li><strong>Time:</strong> ${appointmentTime}</li>
        <li><strong>Reason:</strong> ${reason}</li>
        <li><strong>Notes:</strong> ${notes || "None"}</li>
      </ul>
      <p>Thank you.</p>
    </div>`;

  await tx.sendMail({
    from,
    to: patientEmail,
    subject: `Appointment Confirmation — ${appointmentDate} ${appointmentTime}`,
    html: patientHtml,
  });

  let doctorNotified    = false;
  let doctorNotifyError = null;

  if (doctorEmail) {
    const doctorHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
        <h2 style="margin:0 0 12px;">New Appointment Booked</h2>
        <p>Hello ${safeDoctorName},</p>
        <p>A patient has booked an appointment with you.</p>
        <ul>
          <li><strong>Patient:</strong> ${safePatientName}</li>
          <li><strong>Date:</strong> ${appointmentDate}</li>
          <li><strong>Time:</strong> ${appointmentTime}</li>
          <li><strong>Reason:</strong> ${reason}</li>
          <li><strong>Notes:</strong> ${notes || "None"}</li>
        </ul>
      </div>`;

    try {
      await tx.sendMail({
        from,
        to: doctorEmail,
        subject: `New Appointment — ${appointmentDate} ${appointmentTime}`,
        html: doctorHtml,
      });
      doctorNotified = true;
    } catch (err) {
      doctorNotifyError = err.message || "Doctor notification failed";
    }
  }

  return { skipped: false, patientNotified: true, doctorNotified, doctorNotifyError };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6-HOUR REMINDER — tells patient to go to website and press Confirm
// ─────────────────────────────────────────────────────────────────────────────
async function sendAppointmentReminderEmail({
  patientEmail,
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
}) {
  if (!patientEmail) return { skipped: true, reason: "Missing patient email" };
  if (!hasMailConfig()) return { skipped: true, reason: "Missing SMTP configuration" };

  const tx = getTransporter();
  if (!tx) return { skipped: true, reason: "SMTP transporter unavailable" };

  const from            = process.env.MAIL_FROM || process.env.SMTP_USER;
  const safePatientName = patientName || "Patient";
  const safeDoctorName  = doctorName  || "Doctor";
  const appBase         = process.env.APP_URL || "http://localhost:5173";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;">
      <h2 style="margin:0 0 12px;color:#f59e0b;">⏰ Appointment Reminder — Action Required</h2>
      <p>Hello ${safePatientName},</p>
      <p>
        Your appointment is coming up in <strong>less than 6 hours</strong>.
        Please log in to the website and press the <strong>Confirm</strong> button
        on your upcoming appointment to secure your slot.
      </p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
        <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:600;">Doctor</td>
            <td style="padding:6px 12px;">${safeDoctorName}</td></tr>
        <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:600;">Date</td>
            <td style="padding:6px 12px;">${appointmentDate}</td></tr>
        <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:600;">Time</td>
            <td style="padding:6px 12px;">${appointmentTime}</td></tr>
      </table>
      <p style="text-align:center;margin:24px 0;">
        <a href="${appBase}"
           style="background:#f59e0b;color:#fff;padding:12px 28px;border-radius:6px;
                  text-decoration:none;font-weight:700;font-size:1rem;">
          Go to Website &amp; Confirm
        </a>
      </p>
      <p style="color:#ef4444;font-size:0.85rem;">
        ⚠️ If you do not confirm at least 30 minutes before your appointment,
        it will be automatically cancelled.
      </p>
    </div>`;

  await tx.sendMail({
    from,
    to: patientEmail,
    subject: `⏰ Reminder: Confirm Your Appointment — ${appointmentDate} at ${appointmentTime}`,
    html,
  });

  return { skipped: false, patientNotified: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT CONFIRMED — notify doctor
// ─────────────────────────────────────────────────────────────────────────────
async function sendAppointmentPatientConfirmedEmail({
  doctorEmail,
  doctorName,
  patientName,
  appointmentDate,
  appointmentTime,
  reason,
  notes,
}) {
  if (!doctorEmail) return { skipped: true, reason: "Missing doctor email" };
  if (!hasMailConfig()) return { skipped: true, reason: "Missing SMTP configuration" };

  const tx = getTransporter();
  if (!tx) return { skipped: true, reason: "SMTP transporter unavailable" };

  const from           = process.env.MAIL_FROM || process.env.SMTP_USER;
  const safeDoctorName = doctorName  || "Doctor";
  const safePatientName = patientName || "Patient";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;">
      <h2 style="margin:0 0 12px;color:#10b981;">✓ Appointment Confirmed by Patient</h2>
      <p>Hello ${safeDoctorName},</p>
      <p>Your patient has confirmed their upcoming appointment with you.</p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
        <tr><td style="padding:6px 12px;background:#d1fae5;font-weight:600;">Patient</td>
            <td style="padding:6px 12px;">${safePatientName}</td></tr>
        <tr><td style="padding:6px 12px;background:#d1fae5;font-weight:600;">Date</td>
            <td style="padding:6px 12px;">${appointmentDate}</td></tr>
        <tr><td style="padding:6px 12px;background:#d1fae5;font-weight:600;">Time</td>
            <td style="padding:6px 12px;">${appointmentTime}</td></tr>
        <tr><td style="padding:6px 12px;background:#d1fae5;font-weight:600;">Reason</td>
            <td style="padding:6px 12px;">${reason || "Not provided"}</td></tr>
        <tr><td style="padding:6px 12px;background:#d1fae5;font-weight:600;">Notes</td>
            <td style="padding:6px 12px;">${notes || "None"}</td></tr>
      </table>
      <p>The appointment is now confirmed on both sides.</p>
    </div>`;

  await tx.sendMail({
    from,
    to: doctorEmail,
    subject: `✓ Appointment Confirmed — ${appointmentDate} at ${appointmentTime}`,
    html,
  });

  return { skipped: false, doctorNotified: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-CANCEL (30-min no-confirm) — sent to both patient and doctor
// ─────────────────────────────────────────────────────────────────────────────
async function sendAppointmentAutoCancelledEmail({
  patientEmail,
  patientName,
  doctorEmail,
  doctorName,
  appointmentDate,
  appointmentTime,
}) {
  if (!hasMailConfig()) return { skipped: true, reason: "Missing SMTP configuration" };

  const tx = getTransporter();
  if (!tx) return { skipped: true, reason: "SMTP transporter unavailable" };

  const from            = process.env.MAIL_FROM || process.env.SMTP_USER;
  const safePatientName = patientName || "Patient";
  const safeDoctorName  = doctorName  || "Doctor";

  if (patientEmail) {
    const patientHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;">
        <h2 style="margin:0 0 12px;color:#ef4444;">Appointment Automatically Cancelled</h2>
        <p>Hello ${safePatientName},</p>
        <p>
          Your appointment was <strong>automatically cancelled</strong> because it was not
          confirmed within the required time window (at least 30 minutes before the appointment).
        </p>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
          <tr><td style="padding:6px 12px;background:#fee2e2;font-weight:600;">Doctor</td>
              <td style="padding:6px 12px;">${safeDoctorName}</td></tr>
          <tr><td style="padding:6px 12px;background:#fee2e2;font-weight:600;">Date</td>
              <td style="padding:6px 12px;">${appointmentDate}</td></tr>
          <tr><td style="padding:6px 12px;background:#fee2e2;font-weight:600;">Time</td>
              <td style="padding:6px 12px;">${appointmentTime}</td></tr>
        </table>
        <p>You may book a new appointment at any time.</p>
      </div>`;

    try {
      await tx.sendMail({
        from,
        to: patientEmail,
        subject: `Appointment Cancelled — ${appointmentDate} at ${appointmentTime}`,
        html: patientHtml,
      });
    } catch (err) {
      console.error("Auto-cancel patient email failed:", err.message);
    }
  }

  if (doctorEmail) {
    const doctorHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;">
        <h2 style="margin:0 0 12px;color:#ef4444;">Appointment Automatically Cancelled</h2>
        <p>Hello ${safeDoctorName},</p>
        <p>
          An appointment has been <strong>automatically cancelled</strong> because the patient
          did not confirm within the required time window.
        </p>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
          <tr><td style="padding:6px 12px;background:#fee2e2;font-weight:600;">Patient</td>
              <td style="padding:6px 12px;">${safePatientName}</td></tr>
          <tr><td style="padding:6px 12px;background:#fee2e2;font-weight:600;">Date</td>
              <td style="padding:6px 12px;">${appointmentDate}</td></tr>
          <tr><td style="padding:6px 12px;background:#fee2e2;font-weight:600;">Time</td>
              <td style="padding:6px 12px;">${appointmentTime}</td></tr>
        </table>
      </div>`;

    try {
      await tx.sendMail({
        from,
        to: doctorEmail,
        subject: `Appointment Cancelled (No Confirmation) — ${appointmentDate} at ${appointmentTime}`,
        html: doctorHtml,
      });
    } catch (err) {
      console.error("Auto-cancel doctor email failed:", err.message);
    }
  }

  return { skipped: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING EMAILS — unchanged
// ─────────────────────────────────────────────────────────────────────────────
async function sendAppointmentRescheduledEmail({
  patientEmail, patientName, doctorEmail, doctorName,
  appointmentDate, appointmentTime, reason,
}) {
  if (!patientEmail) return { skipped: true, reason: "Missing patient email" };
  if (!hasMailConfig()) return { skipped: true, reason: "Missing SMTP configuration" };

  const tx = getTransporter();
  if (!tx) return { skipped: true, reason: "SMTP transporter unavailable" };

  const from            = process.env.MAIL_FROM || process.env.SMTP_USER;
  const safePatientName = patientName || "Patient";
  const safeDoctorName  = doctorName  || "Doctor";

  const patientHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h2 style="margin:0 0 12px;">Appointment Rescheduled</h2>
      <p>Hello ${safePatientName},</p>
      <p>Your appointment has been successfully rescheduled.</p>
      <ul>
        <li><strong>Doctor:</strong> ${safeDoctorName}</li>
        <li><strong>New Date:</strong> ${appointmentDate}</li>
        <li><strong>New Time:</strong> ${appointmentTime}</li>
        <li><strong>Reason:</strong> ${reason || "Not provided"}</li>
      </ul>
      <p>Please keep this email for your records.</p>
    </div>`;

  await tx.sendMail({
    from, to: patientEmail,
    subject: `Appointment Rescheduled — ${appointmentDate} ${appointmentTime}`,
    html: patientHtml,
  });

  let doctorNotified = false, doctorNotifyError = null;
  if (doctorEmail) {
    try {
      await tx.sendMail({
        from, to: doctorEmail,
        subject: `Rescheduled Appointment — ${appointmentDate} ${appointmentTime}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
          <h2>Appointment Rescheduled by Patient</h2>
          <p>Hello ${safeDoctorName},</p>
          <ul>
            <li><strong>Patient:</strong> ${safePatientName}</li>
            <li><strong>New Date:</strong> ${appointmentDate}</li>
            <li><strong>New Time:</strong> ${appointmentTime}</li>
          </ul></div>`,
      });
      doctorNotified = true;
    } catch (err) { doctorNotifyError = err.message; }
  }

  return { skipped: false, patientNotified: true, doctorNotified, doctorNotifyError };
}

async function sendAppointmentCancelledEmail({
  patientEmail, patientName, doctorEmail, doctorName,
  appointmentDate, appointmentTime, reason,
}) {
  if (!patientEmail) return { skipped: true, reason: "Missing patient email" };
  if (!hasMailConfig()) return { skipped: true, reason: "Missing SMTP configuration" };

  const tx = getTransporter();
  if (!tx) return { skipped: true, reason: "SMTP transporter unavailable" };

  const from            = process.env.MAIL_FROM || process.env.SMTP_USER;
  const safePatientName = patientName || "Patient";
  const safeDoctorName  = doctorName  || "Doctor";

  await tx.sendMail({
    from, to: patientEmail,
    subject: `Appointment Cancelled — ${appointmentDate || "Date TBD"} ${appointmentTime || ""}`.trim(),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h2>Appointment Cancelled</h2>
      <p>Hello ${safePatientName},</p>
      <p>Your appointment has been cancelled.</p>
      <ul>
        <li><strong>Doctor:</strong> ${safeDoctorName}</li>
        <li><strong>Date:</strong> ${appointmentDate || "N/A"}</li>
        <li><strong>Time:</strong> ${appointmentTime || "N/A"}</li>
        <li><strong>Reason:</strong> ${reason || "Not provided"}</li>
      </ul></div>`,
  });

  let doctorNotified = false, doctorNotifyError = null;
  if (doctorEmail) {
    try {
      await tx.sendMail({
        from, to: doctorEmail,
        subject: `Cancelled Appointment — ${appointmentDate || "Date TBD"} ${appointmentTime || ""}`.trim(),
        html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
          <h2>Appointment Cancelled</h2>
          <p>Hello ${safeDoctorName},</p>
          <ul>
            <li><strong>Patient:</strong> ${safePatientName}</li>
            <li><strong>Date:</strong> ${appointmentDate || "N/A"}</li>
            <li><strong>Time:</strong> ${appointmentTime || "N/A"}</li>
          </ul></div>`,
      });
      doctorNotified = true;
    } catch (err) { doctorNotifyError = err.message; }
  }

  return { skipped: false, patientNotified: true, doctorNotified, doctorNotifyError };
}

module.exports = {
  sendAppointmentConfirmationEmail,
  sendAppointmentReminderEmail,
  sendAppointmentPatientConfirmedEmail,
  sendAppointmentAutoCancelledEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentCancelledEmail,
};
