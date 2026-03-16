const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
	if (transporter) return transporter;

	const host = process.env.SMTP_HOST;
	const port = Number(process.env.SMTP_PORT || 587);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (!host || !user || !pass) {
		return null;
	}

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
	if (!patientEmail) {
		return { skipped: true, reason: "Missing patient email" };
	}

	if (!hasMailConfig()) {
		return { skipped: true, reason: "Missing SMTP configuration" };
	}

	const tx = getTransporter();
	if (!tx) {
		return { skipped: true, reason: "SMTP transporter unavailable" };
	}

	const from = process.env.MAIL_FROM || process.env.SMTP_USER;
	const safePatientName = patientName || "Patient";
	const safeDoctorName = doctorName || "Doctor";
	const subject = `Appointment Confirmation - ${appointmentDate} ${appointmentTime}`;

	const patientHtml = `
		<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
			<h2 style="margin: 0 0 12px;">Appointment Confirmed</h2>
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
		</div>
	`;

	await tx.sendMail({
		from,
		to: patientEmail,
		subject,
		html: patientHtml,
	});

	let doctorNotified = false;
	let doctorNotifyError = null;

	if (doctorEmail) {
		const doctorHtml = `
			<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
				<h2 style="margin: 0 0 12px;">New Appointment Booked</h2>
				<p>Hello ${safeDoctorName},</p>
				<p>A patient has booked an appointment with you.</p>
				<ul>
					<li><strong>Patient:</strong> ${safePatientName}</li>
					<li><strong>Date:</strong> ${appointmentDate}</li>
					<li><strong>Time:</strong> ${appointmentTime}</li>
					<li><strong>Reason:</strong> ${reason}</li>
					<li><strong>Notes:</strong> ${notes || "None"}</li>
				</ul>
			</div>
		`;

		try {
			await tx.sendMail({
				from,
				to: doctorEmail,
				subject: `New Appointment - ${appointmentDate} ${appointmentTime}`,
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
	};
}

async function sendAppointmentRescheduledEmail({
	patientEmail,
	patientName,
	doctorEmail,
	doctorName,
	appointmentDate,
	appointmentTime,
	reason,
}) {
	if (!patientEmail) {
		return { skipped: true, reason: "Missing patient email" };
	}

	if (!hasMailConfig()) {
		return { skipped: true, reason: "Missing SMTP configuration" };
	}

	const tx = getTransporter();
	if (!tx) {
		return { skipped: true, reason: "SMTP transporter unavailable" };
	}

	const from = process.env.MAIL_FROM || process.env.SMTP_USER;
	const safePatientName = patientName || "Patient";
	const safeDoctorName = doctorName || "Doctor";

	const patientHtml = `
		<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
			<h2 style="margin: 0 0 12px;">Appointment Rescheduled</h2>
			<p>Hello ${safePatientName},</p>
			<p>Your appointment has been successfully rescheduled.</p>
			<ul>
				<li><strong>Doctor:</strong> ${safeDoctorName}</li>
				<li><strong>New Date:</strong> ${appointmentDate}</li>
				<li><strong>New Time:</strong> ${appointmentTime}</li>
				<li><strong>Reason:</strong> ${reason || "Not provided"}</li>
			</ul>
			<p>Please keep this email for your records.</p>
		</div>
	`;

	await tx.sendMail({
		from,
		to: patientEmail,
		subject: `Appointment Rescheduled - ${appointmentDate} ${appointmentTime}`,
		html: patientHtml,
	});

	let doctorNotified = false;
	let doctorNotifyError = null;

	if (doctorEmail) {
		const doctorHtml = `
			<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
				<h2 style="margin: 0 0 12px;">Appointment Rescheduled by Patient</h2>
				<p>Hello ${safeDoctorName},</p>
				<p>A patient has rescheduled an appointment.</p>
				<ul>
					<li><strong>Patient:</strong> ${safePatientName}</li>
					<li><strong>New Date:</strong> ${appointmentDate}</li>
					<li><strong>New Time:</strong> ${appointmentTime}</li>
				</ul>
			</div>
		`;

		try {
			await tx.sendMail({
				from,
				to: doctorEmail,
				subject: `Rescheduled Appointment - ${appointmentDate} ${appointmentTime}`,
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
	};
}

async function sendAppointmentCancelledEmail({
	patientEmail,
	patientName,
	doctorEmail,
	doctorName,
	appointmentDate,
	appointmentTime,
	reason,
}) {
	if (!patientEmail) {
		return { skipped: true, reason: "Missing patient email" };
	}

	if (!hasMailConfig()) {
		return { skipped: true, reason: "Missing SMTP configuration" };
	}

	const tx = getTransporter();
	if (!tx) {
		return { skipped: true, reason: "SMTP transporter unavailable" };
	}

	const from = process.env.MAIL_FROM || process.env.SMTP_USER;
	const safePatientName = patientName || "Patient";
	const safeDoctorName = doctorName || "Doctor";

	const patientHtml = `
		<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
			<h2 style="margin: 0 0 12px;">Appointment Cancelled</h2>
			<p>Hello ${safePatientName},</p>
			<p>Your appointment has been cancelled.</p>
			<ul>
				<li><strong>Doctor:</strong> ${safeDoctorName}</li>
				<li><strong>Date:</strong> ${appointmentDate || "N/A"}</li>
				<li><strong>Time:</strong> ${appointmentTime || "N/A"}</li>
				<li><strong>Reason:</strong> ${reason || "Not provided"}</li>
			</ul>
		</div>
	`;

	await tx.sendMail({
		from,
		to: patientEmail,
		subject: `Appointment Cancelled - ${appointmentDate || "Date TBD"} ${appointmentTime || ""}`.trim(),
		html: patientHtml,
	});

	let doctorNotified = false;
	let doctorNotifyError = null;

	if (doctorEmail) {
		const doctorHtml = `
			<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
				<h2 style="margin: 0 0 12px;">Appointment Cancelled</h2>
				<p>Hello ${safeDoctorName},</p>
				<p>An appointment has been cancelled.</p>
				<ul>
					<li><strong>Patient:</strong> ${safePatientName}</li>
					<li><strong>Date:</strong> ${appointmentDate || "N/A"}</li>
					<li><strong>Time:</strong> ${appointmentTime || "N/A"}</li>
				</ul>
			</div>
		`;

		try {
			await tx.sendMail({
				from,
				to: doctorEmail,
				subject: `Cancelled Appointment - ${appointmentDate || "Date TBD"} ${appointmentTime || ""}`.trim(),
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
	};
}

module.exports = {
	sendAppointmentConfirmationEmail,
	sendAppointmentRescheduledEmail,
	sendAppointmentCancelledEmail,
};
