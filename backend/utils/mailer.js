const nodemailer = require("nodemailer");
const https = require("https");

let transporter;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isSameEmail(a, b) {
  return Boolean(normalizeEmail(a) && normalizeEmail(a) === normalizeEmail(b));
}

function maskEmail(email) {
  const value = String(email || "").trim();
  const parts = value.split("@");
  if (parts.length !== 2) return value || "";
  const local = parts[0];
  const domain = parts[1];
  if (!local) return `***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function parseMailFromHeader(rawFrom) {
  const text = String(rawFrom || "").trim();
  const match = text.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: String(match[1] || "").trim().replace(/^"|"$/g, "") || "MediCare",
      email: String(match[2] || "").trim(),
    };
  }

  return {
    name: String(process.env.BREVO_SENDER_NAME || "").trim() || "MediCare",
    email: text,
  };
}

function getBrevoApiKey() {
  return String(process.env.BREVO_API_KEY || "").trim();
}

function getBrevoSender(preferredFrom) {
  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || "").trim();
  const senderName = String(process.env.BREVO_SENDER_NAME || "").trim();
  const fallbackFrom = preferredFrom || process.env.MAIL_FROM || process.env.SMTP_USER || "MediCare <no-reply@medicare.local>";
  const parsed = parseMailFromHeader(fallbackFrom);

  return {
    name: senderName || parsed.name || "MediCare",
    email: senderEmail || parsed.email,
  };
}

function hasBrevoConfig() {
  return Boolean(getBrevoApiKey() && getBrevoSender().email);
}

function toBrevoRecipients(to) {
  if (Array.isArray(to)) {
    return to
      .map((entry) => {
        if (!entry) return null;
        if (typeof entry === "string") {
          const email = String(entry || "").trim();
          return email ? { email } : null;
        }
        const email = String(entry.email || "").trim();
        const name = String(entry.name || "").trim();
        if (!email) return null;
        return name ? { email, name } : { email };
      })
      .filter(Boolean);
  }

  return String(to || "")
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

function sendMailByBrevo({ from, to, subject, html, text }) {
  return new Promise((resolve, reject) => {
    const apiKey = getBrevoApiKey();
    const recipients = toBrevoRecipients(to);

    if (!apiKey) {
      reject(new Error("BREVO_API_KEY is missing"));
      return;
    }
    if (!recipients.length) {
      reject(new Error("Missing recipient email"));
      return;
    }

    const sender = getBrevoSender(from);
    if (!sender.email) {
      reject(new Error("Brevo sender email is missing"));
      return;
    }

    const htmlContent = String(html || "<p>No content</p>");
    const textContent =
      String(text || "").trim() ||
      htmlContent
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim() ||
      "Appointment notification";

    const payload = {
      sender,
      to: recipients,
      subject: String(subject || "Appointment Notification"),
      htmlContent,
      textContent,
    };

    const request = https.request(
      {
        method: "POST",
        hostname: "api.brevo.com",
        path: "/v3/smtp/email",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          accept: "application/json",
        },
        timeout: 12000,
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ accepted: recipients.map((r) => r.email), response: body || "ok" });
            return;
          }

          reject(
            new Error(
              `Brevo email failed (${response.statusCode}): ${body || response.statusMessage || "Unknown Brevo error"}`
            )
          );
        });
      }
    );

    request.on("error", (error) => reject(error));
    request.on("timeout", () => request.destroy(new Error("Brevo email timed out")));
    request.write(JSON.stringify(payload));
    request.end();
  });
}

function createBrevoTransporter() {
  return {
    sendMail: (mailOptions) => sendMailByBrevo(mailOptions),
  };
}

function getTransporter() {
  if (transporter) return transporter;

  if (hasBrevoConfig()) {
    transporter = createBrevoTransporter();
    return transporter;
  }

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
  return Boolean(hasBrevoConfig() || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
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

  console.log(`[Mail][booking] patient template -> ${maskEmail(patientEmail)} | doctor template -> ${maskEmail(doctorEmail)}`);

  if (doctorEmail && !isSameEmail(doctorEmail, patientEmail)) {
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

  return {
    skipped: false,
    patientNotified: true,
    doctorNotified,
    doctorNotifyError,
    patientRecipient: maskEmail(patientEmail),
    doctorRecipient: maskEmail(doctorEmail),
  };
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
        Your appointment is coming up in <strong>less than 24 hours</strong>.
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

  console.log(`[Mail][reminder] patient template -> ${maskEmail(patientEmail)}`);
  return { skipped: false, patientNotified: true, patientRecipient: maskEmail(patientEmail) };
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

  console.log(`[Mail][patient-confirmed] doctor template -> ${maskEmail(doctorEmail)}`);
  return { skipped: false, doctorNotified: true, doctorRecipient: maskEmail(doctorEmail) };
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

  if (doctorEmail && !isSameEmail(doctorEmail, patientEmail)) {
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

  console.log(`[Mail][auto-cancel] patient template -> ${maskEmail(patientEmail)} | doctor template -> ${maskEmail(doctorEmail)}`);
  return {
    skipped: false,
    patientRecipient: maskEmail(patientEmail),
    doctorRecipient: maskEmail(doctorEmail),
  };
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
  console.log(`[Mail][reschedule] patient template -> ${maskEmail(patientEmail)} | doctor template -> ${maskEmail(doctorEmail)}`);
  if (doctorEmail && !isSameEmail(doctorEmail, patientEmail)) {
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

  return {
    skipped: false,
    patientNotified: true,
    doctorNotified,
    doctorNotifyError,
    patientRecipient: maskEmail(patientEmail),
    doctorRecipient: maskEmail(doctorEmail),
  };
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
  console.log(`[Mail][cancel] patient template -> ${maskEmail(patientEmail)} | doctor template -> ${maskEmail(doctorEmail)}`);
  if (doctorEmail && !isSameEmail(doctorEmail, patientEmail)) {
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

  return {
    skipped: false,
    patientNotified: true,
    doctorNotified,
    doctorNotifyError,
    patientRecipient: maskEmail(patientEmail),
    doctorRecipient: maskEmail(doctorEmail),
  };
}

async function sendPasswordResetEmail({ email, name, role, resetUrl, expiresMinutes = 30 }) {
  if (!email) return { skipped: true, reason: "Missing recipient email" };
  if (!resetUrl) return { skipped: true, reason: "Missing reset URL" };
  if (!hasMailConfig()) return { skipped: true, reason: "Missing SMTP configuration" };

  const tx = getTransporter();
  if (!tx) return { skipped: true, reason: "SMTP transporter unavailable" };

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const safeName = String(name || "there").trim() || "there";
  const safeRole = String(role || "patient").toLowerCase() === "doctor" ? "doctor" : "patient";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;">
      <h2 style="margin:0 0 12px;color:#0ea5e9;">Reset Your Password</h2>
      <p>Hello ${safeName},</p>
      <p>We received a request to reset your ${safeRole} account password.</p>
      <p style="margin:20px 0;text-align:center;">
        <a href="${resetUrl}"
           style="background:#0284c7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
          Reset Password
        </a>
      </p>
      <p style="margin:0 0 8px;">This link expires in <strong>${Number(expiresMinutes) || 30} minutes</strong>.</p>
      <p style="color:#6b7280;font-size:0.9rem;margin:12px 0 0;">
        If you did not request this, you can safely ignore this email.
      </p>
    </div>`;

  await tx.sendMail({
    from,
    to: email,
    subject: "MediCare Password Reset",
    html,
  });

  console.log(`[Mail][password-reset] template -> ${maskEmail(email)}`);
  return { skipped: false, recipient: maskEmail(email) };
}

module.exports = {
  sendAppointmentConfirmationEmail,
  sendAppointmentReminderEmail,
  sendAppointmentPatientConfirmedEmail,
  sendAppointmentAutoCancelledEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentCancelledEmail,
  sendPasswordResetEmail,
};
