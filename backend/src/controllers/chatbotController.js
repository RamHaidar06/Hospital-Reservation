const { query } = require("../db");
const { mapUserRow, attachAppointmentUsers } = require("../utils/dbMappers");
const {
  sendAppointmentConfirmationEmail,
  sendAppointmentPatientConfirmedEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentCancelledEmail,
  sendAppointmentReminderEmail,
} = require("../../utils/mailer");
const { GoogleGenAI } = require("@google/genai");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiClient = geminiApiKey
  ? new GoogleGenAI({ apiKey: geminiApiKey })
  : null;

const SYMPTOM_SPECIALTY_MAP = {
  chest: "cardiology",
  heart: "cardiology",
  cardio: "cardiology",
  bone: "orthopedics",
  leg: "orthopedics",
  knee: "orthopedics",
  skin: "dermatology",
  rash: "dermatology",
  eye: "ophthalmology",
  vision: "ophthalmology",
  head: "neurology",
  migraine: "neurology",
  stomach: "gastroenterology",
  gastro: "gastroenterology",
  child: "pediatrics",
  baby: "pediatrics",
};

function inferSpecialty(queryText = "") {
  const q = String(queryText).toLowerCase();
  for (const [keyword, specialty] of Object.entries(SYMPTOM_SPECIALTY_MAP)) {
    if (q.includes(keyword)) return specialty;
  }
  return "";
}

function rankDoctorsFallback(doctors, queryText = "") {
  const q = String(queryText).trim().toLowerCase();
  const inferred = inferSpecialty(q);

  const scored = doctors.map((doc) => {
    const specialty = String(doc.specialty || "").toLowerCase();
    const fullName = `${doc.firstName || ""} ${doc.lastName || ""}`.toLowerCase();
    let score = 0;

    if (q && specialty.includes(q)) score += 6;
    if (inferred && specialty.includes(inferred)) score += 5;
    if (q && fullName.includes(q)) score += 2;
    if (q && String(doc.bio || "").toLowerCase().includes(q)) score += 1;

    return {
      doctorId: String(doc.id),
      firstName: doc.firstName,
      lastName: doc.lastName,
      specialty: doc.specialty || "General Medicine",
      yearsExperience: Number(doc.yearsExperience || 0),
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score || b.yearsExperience - a.yearsExperience);
  const filtered = q ? scored.filter((d) => d.score > 0) : scored;
  return (filtered.length ? filtered : scored).slice(0, 8);
}

function timeToMinutes(time) {
  const [h, m] = String(time || "").split(":").map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseApptDate(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function toIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseNaturalDate(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;

  const dateOnly = raw
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/g, "")
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/g, "")
    .replace(/\b\d{1,2}:\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!dateOnly) return null;

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateOnly === "today" || /\btoday\b/.test(dateOnly)) return toIsoDate(base);
  if (dateOnly === "tomorrow" || /\btomorrow\b|\btmrw\b|\btmr\b/.test(dateOnly)) {
    base.setDate(base.getDate() + 1);
    return toIsoDate(base);
  }
  if (dateOnly === "next week" || /\bnext\s+week\b/.test(dateOnly)) {
    base.setDate(base.getDate() + 7);
    return toIsoDate(base);
  }

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const nextWeekdayMatch = dateOnly.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (nextWeekdayMatch) {
    const target = weekdays.indexOf(nextWeekdayMatch[2]);
    const current = base.getDay();
    let delta = (target - current + 7) % 7;
    if (delta === 0 || nextWeekdayMatch[1]) delta += 7;
    base.setDate(base.getDate() + delta);
    return toIsoDate(base);
  }

  const normalized = dateOnly.replace(/\//g, "-");
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    const [y, m, d] = normalized.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (!Number.isNaN(date.getTime())) return toIsoDate(date);
  }

  const parsed = new Date(dateOnly || raw);
  return Number.isNaN(parsed.getTime()) ? null : toIsoDate(parsed);
}

function parseNaturalTime(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;

  const strict24 = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (strict24) {
    const hh = strict24[1].padStart(2, "0");
    const mm = strict24[2];
    return `${hh}:${mm}`;
  }

  const ampm = raw.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] || 0);
    const suffix = ampm[3];
    if (suffix === "pm" && h < 12) h += 12;
    if (suffix === "am" && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  return null;
}

function generateSlotsFallback(doctor, date, bookedTimes = []) {
  const requestedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(requestedDate.getTime())) return [];

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const day = weekdays[requestedDate.getDay()];
  const workingDays = String(doctor.workingDays || "monday,tuesday,wednesday,thursday,friday")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  if (!workingDays.includes(day)) return [];

  const start = timeToMinutes(doctor.startTime || "09:00");
  const end = timeToMinutes(doctor.endTime || "17:00");
  if (start === null || end === null || end <= start) return [];

  const now = new Date();
  const isToday = now.toISOString().slice(0, 10) === date;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const booked = new Set((bookedTimes || []).map((t) => String(t).slice(0, 5)));

  const slots = [];
  for (let mins = start; mins + 30 <= end; mins += 30) {
    const hhmm = minutesToTime(mins);
    if (booked.has(hhmm)) continue;
    if (isToday && mins <= nowMins) continue;
    slots.push(hhmm);
  }

  return slots;
}

function cleanJsonText(text) {
  return String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function safeParseJson(text) {
  try {
    return JSON.parse(cleanJsonText(text));
  } catch {
    return null;
  }
}

function formatDoctorName(doctor) {
  const fullName = [doctor?.firstName, doctor?.lastName].filter(Boolean).join(" ").trim();
  return fullName ? `Dr. ${fullName}` : "Doctor";
}

function formatAppointmentSummary(appt) {
  const doctorName = [appt?.doctorId?.firstName, appt?.doctorId?.lastName].filter(Boolean).join(" ").trim();
  const patientName = [appt?.patientId?.firstName, appt?.patientId?.lastName].filter(Boolean).join(" ").trim();
  return `${appt.id}: ${appt.appointmentDate} at ${appt.appointmentTime} with ${doctorName || "Doctor"} for ${patientName || "Patient"} (${appt.status})`;
}

function formatDoctorSummary(doctor) {
  return `${doctor.id}: ${doctor.firstName} ${doctor.lastName} - ${doctor.specialty || "General Medicine"}`;
}

function detectListMode(message) {
  const text = String(message || "").toLowerCase();
  // Accept common misspellings like "complette" by matching the stem.
  if (/\b(complet[a-z]*|done|finished|past)\b/.test(text)) return "completed";
  if (/\b(pending|open|not completed|incomplete|awaiting|due)\b/.test(text)) return "pending";
  if (/\b(today|todays|to day)\b/.test(text)) return "today";
  if (/\b(tomorrow|tmrw|tmr)\b/.test(text)) return "tomorrow";
  if (/\b(upcoming|due|next|future|scheduled)\b/.test(text)) return "upcoming";
  return "all";
}

function formatListAsSentence(items = []) {
  const clean = items
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
}

function toPoliteClarification(clarification, fallbackQuestion) {
  const raw = String(clarification || "").trim();
  const fallback = String(fallbackQuestion || "Could you please provide a bit more detail?").trim();

  if (!raw) return fallback;

  const lowered = raw
    .toLowerCase()
    .replace(/appointmenttime/g, "appointment time")
    .replace(/\s+/g, " ")
    .trim();

  const isAbruptFragment =
    raw.length < 90 &&
    !/[?.!]$/.test(raw) &&
    (raw.includes(",") || /\bdoctor\b|\bdate\b|\btime\b|\breason\b|\bbooking\b/.test(lowered));

  if (isAbruptFragment) {
    const items = lowered
      .replace(/^please\s+/i, "")
      .replace(/\bfor\s+the\s+appointment\b/g, "")
      .split(",")
      .map((part) => part.replace(/^and\s+/i, "").trim())
      .filter(Boolean);

    if (items.length > 1) {
      return `Could you please share the ${formatListAsSentence(items)}?`;
    }

    return `Could you please share ${lowered}?`;
  }

  if (/^please\b/i.test(raw)) {
    return raw.endsWith("?") ? raw : `${raw}?`;
  }

  if (/\?$/.test(raw)) {
    return raw;
  }

  return `Could you please clarify: ${raw.replace(/[.]+$/, "")}?`;
}

function detectSlotAvailabilityIntent(message, history = []) {
  const text = String(message || "").toLowerCase();
  const hasSlotWords =
    /\b(slot|slots|time slot|time slots|available time|availability|free time|open time|open slot)\b/.test(text) ||
    (/\bavailable\b/.test(text) && /\b(time|times)\b/.test(text));
  const hasAppointmentContext = /\b(appointment|book|booking|schedule)\b/.test(text);
  const explicitQuestion = /\b(what|which|show|tell|give|any)\b/.test(text);

  if (hasSlotWords && (hasAppointmentContext || explicitQuestion)) return true;

  const recentAssistant = history
    .slice(-6)
    .filter((item) => (item?.role || item?.type || "") === "assistant")
    .map((item) => String(item?.text || "").toLowerCase())
    .join(" \n ");

  if (hasSlotWords && /date and time|time would you prefer|what date/.test(recentAssistant)) return true;
  return false;
}

function getRecentDoctorQueryHint(history = []) {
  const recentUserMessages = history
    .filter((item) => (item?.role || item?.type || "") === "user")
    .slice(-8)
    .map((item) => String(item?.text || "").trim())
    .filter(Boolean);

  for (let i = recentUserMessages.length - 1; i >= 0; i -= 1) {
    const hint = extractDoctorQueryFromMessage(recentUserMessages[i]);
    if (hint) return hint;
  }

  return null;
}

function detectReasonQuery(message, history = []) {
  const text = String(message || "").toLowerCase();
  const hasReasonWord = /\breason\b|\bwhy\b|\breas\w*\b/.test(text);
  const hasAppointmentWord = /\bappoint/.test(text);
  const asksForEach = /\b(each|all|every)\b/.test(text);
  const genericReasonFollowup = /\b(what|which|was|is|the|for)\b/.test(text);
  const isSelectorReply = /\b(all of them|all|each|every|both|all appointments)\b/.test(text);
  const shortFuzzyReason = /\bwhat\b.*\breas\w*\b|\bwhy\b.*\b(that|this|it)\b/.test(text);

  // Prevent false positives like: "i feel dumb idk why"
  if (/\b(i\s*feel|feeling|dumb|stupid|confused|frustrated|idk\s+why)\b/.test(text) && !hasAppointmentWord) {
    return false;
  }

  const recentAssistant = history
    .slice(-12)
    .filter((item) => (item?.role || item?.type || "") === "assistant")
    .map((item) => String(item?.text || "").toLowerCase())
    .join(" \n ");
  const recentAskedReasonSelection =
    recentAssistant.includes("which appointment") && recentAssistant.includes("reason");

  if (hasReasonWord && hasAppointmentWord) return true;
  if (hasReasonWord && asksForEach) return true;
  if (isSelectorReply && recentAskedReasonSelection) return true;
  if (hasReasonWord && genericReasonFollowup) {
    const recent = history
      .slice(-10)
      .map((item) => String(item?.text || "").toLowerCase())
      .join(" ");
    if (recent.includes("appointment") || recent.includes("appointments")) return true;
  }
  if (shortFuzzyReason) {
    const recent = history
      .slice(-12)
      .map((item) => String(item?.text || "").toLowerCase())
      .join(" ");
    if (recent.includes("appointment") || recent.includes("appointments")) return true;
  }

  if (/\bwhat about\b/.test(text) && /\bappoint/.test(text)) {
    const recent = history
      .slice(-12)
      .map((item) => String(item?.text || "").toLowerCase())
      .join(" ");
    if (recent.includes("reason")) return true;
  }

  if (hasReasonWord) {
    const recent = history
      .slice(-12)
      .map((item) => String(item?.text || "").toLowerCase())
      .join(" ");
    if (recent.includes("appointments") || recent.includes("completed") || recent.includes("pending")) return true;
  }

  return false;
}

function getRecentDateHint(history = []) {
  const recentUserMessages = history
    .filter((item) => (item?.role || item?.type || "") === "user")
    .slice(-6)
    .map((item) => String(item?.text || "").trim())
    .filter(Boolean);

  for (let i = recentUserMessages.length - 1; i >= 0; i -= 1) {
    const parsed = parseNaturalDate(recentUserMessages[i]);
    if (parsed) return parsed;
  }
  return null;
}

function getRecentTimeHint(history = []) {
  const recentUserMessages = history
    .filter((item) => (item?.role || item?.type || "") === "user")
    .slice(-6)
    .map((item) => String(item?.text || "").trim())
    .filter(Boolean);

  for (let i = recentUserMessages.length - 1; i >= 0; i -= 1) {
    const parsed = parseNaturalTime(recentUserMessages[i]);
    if (parsed) return parsed;
  }
  return null;
}

function isAffirmativeReply(message) {
  const text = String(message || "").trim().toLowerCase();
  return /^(yes|yeah|yep|yup|ok|okay|sure|correct|right|exactly)$/i.test(text);
}

function inferListModeFromHistory(history = []) {
  const recentAssistantText = history
    .slice(-10)
    .filter((item) => (item?.role || item?.type || "") === "assistant")
    .map((item) => String(item?.text || "").toLowerCase())
    .join(" \n ");

  if (recentAssistantText.includes("pending appointments")) return "pending";
  if (recentAssistantText.includes("completed appointments")) return "completed";
  if (recentAssistantText.includes("appointments for today")) return "today";
  if (recentAssistantText.includes("appointments for tomorrow")) return "tomorrow";
  if (recentAssistantText.includes("upcoming appointments")) return "upcoming";
  return "all";
}

function isTemporalOnlyText(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;

  if (/^\d{1,2}\s*(am|pm)$/.test(text)) return true;
  if (/^\d{1,2}:\d{2}(\s*(am|pm))?$/.test(text)) return true;
  if (/^\d{4}-\d{2}-\d{2}(\s+at\s+\d{1,2}:\d{2}(\s*(am|pm))?)?$/.test(text)) return true;

  const hasWeekday = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(text);
  const hasMonth = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(text);
  const hasTimeHint = /\b(at|am|pm)\b|\d{1,2}:\d{2}/.test(text);

  return (hasWeekday || hasMonth) && hasTimeHint;
}

function normalizeReasonText(reason) {
  const text = String(reason || "").trim();
  if (!text) return "No reason";
  if (isTemporalOnlyText(text)) return "No reason";
  return text;
}

function detectVisitSummaryIntent(message) {
  const text = String(message || "").toLowerCase();
  return /\b(visit\s*summary|summary\s+for\s+visit|add\s+summary|update\s+summary|write\s+summary)\b/.test(text);
}

function extractSummaryTextFromMessage(message) {
  const raw = String(message || "").trim();
  if (!raw) return "";

  const colonMatch = raw.match(/\bsummary\b\s*:\s*(.+)$/i);
  if (colonMatch) return String(colonMatch[1] || "").trim();

  const quotedMatch = raw.match(/"([^"]{8,})"/);
  if (quotedMatch) return String(quotedMatch[1] || "").trim();

  const visitSummaryMatch = raw.match(/\bvisit\s*summary\b\s*(?:is|as)?\s*(.+)$/i);
  if (visitSummaryMatch) return String(visitSummaryMatch[1] || "").trim();

  return "";
}

function detectCancelByPatientIntent(message) {
  const text = String(message || "").toLowerCase();
  const hasCancel = /\b(cancel|delete|remove)\b/.test(text);
  const hasPlural = /\bappointments?\b/.test(text);
  const hasPersonTarget = /\b(of|for)\b/.test(text) || /\bpatient\b/.test(text);
  return hasCancel && hasPlural && hasPersonTarget;
}

function detectVisitSummaryQuery(message, history = []) {
  const text = String(message || "").toLowerCase();
  const hasSummaryWord = /\b(visit\s*summary|summary|summry|sumary)\b/.test(text);
  const asksToRead =
    /\b(what|show|tell|read|give|display|did\s+i\s+put|what\s+did\s+i\s+put)\b/.test(text) ||
    /\bfor\s+that\b|\bfor\s+this\b/.test(text);

  if (hasSummaryWord && asksToRead) return true;
  if (hasSummaryWord && /\b(each|all|every)\b/.test(text)) return true;

  const recent = history
    .slice(-10)
    .map((item) => String(item?.text || "").toLowerCase())
    .join(" ");
  if (hasSummaryWord && (recent.includes("completed appointments") || recent.includes("visit summary"))) {
    return true;
  }

  return false;
}

function extractPatientQueryFromMessage(message) {
  const raw = String(message || "").trim();
  if (!raw) return "";

  const quoted = raw.match(/"([^"]+)"/);
  if (quoted) return String(quoted[1] || "").trim();

  const forOfMatch = raw.match(/\b(?:cancel|delete|remove)\b[^\n]*?\bappointments?\b[^\n]*?\b(?:for|of)\b\s+(?:patient\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
  if (forOfMatch) return String(forOfMatch[1] || "").trim();

  const patientMatch = raw.match(/\bpatient\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
  if (patientMatch) return String(patientMatch[1] || "").trim();

  return "";
}

async function getDoctors() {
  const result = await query(
    `select *
     from users
     where role = 'doctor'
     order by created_at desc`
  );

  return result.rows.map(mapUserRow);
}

async function getAppointmentsForUser(userId, role = "patient") {
  const column = role === "doctor" ? "doctor_id" : "patient_id";
  const result = await query(
    `select a.*,
            p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
            d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
            d.specialty as doctor_specialty, d.years_experience as doctor_years_experience
     from appointments a
     left join users p on p.id = a.patient_id and p.role = 'patient'
     left join users d on d.id = a.doctor_id and d.role = 'doctor'
     where a.${column} = $1
     order by a.created_at desc`,
    [userId]
  );

  return result.rows.map(attachAppointmentUsers);
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

async function findDoctorCandidates(queryText) {
  const doctors = await getDoctors();
  const q = String(queryText || "").trim().toLowerCase();

  const ranked = doctors
    .map((doctor) => {
      const fullName = `${doctor.firstName} ${doctor.lastName}`.toLowerCase();
      const specialty = String(doctor.specialty || "").toLowerCase();
      let score = 0;

      if (!q) score = 1;
      if (q && fullName === q) score += 10;
      if (q && fullName.includes(q)) score += 6;
      if (q && specialty.includes(q)) score += 5;
      if (q && String(doctor.bio || "").toLowerCase().includes(q)) score += 1;

      return { doctor, score };
    })
    .filter((entry) => entry.score > 0 || !q)
    .sort((a, b) => b.score - a.score || a.doctor.lastName.localeCompare(b.doctor.lastName));

  return ranked.map((entry) => entry.doctor);
}

async function findAppointmentCandidate(userId, role, parsed, rawMessage) {
  const appointments = await getAppointmentsForUser(userId, role);
  const q = String(rawMessage || "").toLowerCase();

  if (!appointments.length) return null;

  if (parsed?.appointmentId) {
    const exact = appointments.find((apt) => String(apt.id) === String(parsed.appointmentId));
    if (exact) return exact;
  }

  const dateText = String(parsed?.appointmentDate || "").trim();
  const timeText = String(parsed?.appointmentTime || "").trim();
  if (dateText && timeText) {
    const exact = appointments.find(
      (apt) => apt.appointmentDate === dateText && apt.appointmentTime === timeText && apt.status !== "cancelled"
    );
    if (exact) return exact;
  }

  if (q) {
    const matched = appointments.filter((apt) => {
      const doctorName = `${apt.doctorId?.firstName || ""} ${apt.doctorId?.lastName || ""}`.toLowerCase();
      const apptText = `${apt.appointmentDate} ${apt.appointmentTime} ${doctorName}`;
      return apptText.includes(q);
    });

    if (matched.length === 1) return matched[0];
    if (matched.length > 1) return { ambiguous: true, appointments: matched };
  }

  if (appointments.length === 1) return appointments[0];
  return { ambiguous: appointments.length > 1, appointments };
}

function extractBookingReasonFromMessage(message) {
  const text = String(message || "").trim();
  if (!text) return null;

  const byReason = text.match(/\b(?:reason|because|for)\b\s*[:\-]?\s*(.+)$/i);
  if (byReason) {
    const candidate = String(byReason[1] || "").trim();
    if (candidate && !isTemporalOnlyText(candidate)) return candidate;
  }

  return null;
}

function extractDoctorQueryFromMessage(message) {
  const text = String(message || "").trim();
  if (!text) return null;

  // Match "with dr(.)? name" patterns
  const withDoctor = text.match(/\bwith\s+(?:dr\.?\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
  if (withDoctor) return String(withDoctor[1] || "").trim();

  // Match "dr(.)? name" at start or standalone (e.g., "dr fakhouri", "dr. ahmed")
  const drPrefix = text.match(/^(?:dr\.?\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})$/i);
  if (drPrefix && drPrefix[1].toLowerCase() !== "doctor") return String(drPrefix[1] || "").trim();

  // Match standalone "dr(.)? name" in text (but not when it's part of a sentence like "i saw dr yesterday")
  if (/^dr\.?\s+[a-z]/i.test(text)) {
    const match = text.match(/^(?:dr\.?\s+)([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
    if (match) return String(match[1] || "").trim();
  }

  const inferred = inferSpecialty(text);
  if (inferred) return inferred;

  return null;
}

function extractIntentLocally({ message, history, userRole }) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();

  const parsedDate = parseNaturalDate(text);
  const parsedTime = parseNaturalTime(text);
  const visitSummary = extractSummaryTextFromMessage(text) || null;
  const patientQuery = extractPatientQueryFromMessage(text) || null;
  const doctorQuery = extractDoctorQueryFromMessage(text);
  const bookingReason = extractBookingReasonFromMessage(text);

  let intent = "chat";
  if (detectVisitSummaryQuery(text, history)) intent = "visit_summary_query";
  else if (userRole === "doctor" && detectVisitSummaryIntent(text)) intent = "add_visit_summary";
  else if (userRole === "doctor" && detectCancelByPatientIntent(text)) intent = "cancel_by_patient";
  else if (detectReasonQuery(text, history)) intent = "reason_query";
  else if (detectSlotAvailabilityIntent(text, history)) intent = "availability_query";
  else if (/\b(help|what can you do|capabilities|options)\b/.test(lower)) intent = "help";
  else if (/\b(reschedule|change|move)\b/.test(lower)) intent = "reschedule";
  else if (/\b(cancel|remove|delete)\b/.test(lower) && /\bappointment\b/.test(lower)) intent = "cancel";
  else if (/\b(book|schedule|new appointment|make appointment)\b/.test(lower)) intent = "book";
  else if (/\bappointments?\b|\bschedule\b|\btoday\b|\btomorrow\b|\bupcoming\b|\bcompleted\b|\bpending\b/.test(lower)) intent = "list_appointments";
  else if (/\bdoctor\b|\bspecialty\b|\bcardio|derma|neuro|pedia|ortho|gastro\b/.test(lower)) intent = "doctor_info";

  return {
    intent,
    reply: null,
    doctorQuery: doctorQuery || null,
    doctorId: null,
    appointmentId: null,
    appointmentDate: parsedDate || null,
    appointmentTime: parsedTime || null,
    newAppointmentDate: intent === "reschedule" ? parsedDate || null : null,
    newAppointmentTime: intent === "reschedule" ? parsedTime || null : null,
    reason: bookingReason || null,
    notes: null,
    visitSummary,
    patientQuery,
    clarification: null,
    engine: "local",
  };
}

async function extractIntentSmart({ message, history, userRole, userName, doctors, appointments }) {
  if (!geminiClient) {
    return extractIntentLocally({ message, history, userRole });
  }

  try {
    const extracted = await extractIntentWithGemini({
      message,
      history: history
        .slice(-8)
        .map((item) => `${item.role || item.type || "user"}: ${item.text || ""}`)
        .join("\n"),
      userRole,
      userName,
      doctors,
      appointments,
    });

    return {
      ...extracted,
      engine: "gemini",
    };
  } catch (error) {
    console.warn("Gemini unavailable, using local fallback:", error?.message || error);
    return extractIntentLocally({ message, history, userRole });
  }
}

async function extractIntentWithGemini({ message, history, userRole, userName, doctors, appointments }) {
  const prompt = [
    "You are the AI assistant for a medical appointment website.",
    "Return strict JSON only, no markdown, no code fences.",
    "Schema:",
    '{"intent":"chat|book|cancel|reschedule|availability_query|list_appointments|doctor_info|help|add_visit_summary|cancel_by_patient|reason_query|visit_summary_query","reply":"string","doctorQuery":"string|null","doctorId":"string|null","appointmentId":"string|null","appointmentDate":"YYYY-MM-DD|null","appointmentTime":"HH:MM|null","newAppointmentDate":"YYYY-MM-DD|null","newAppointmentTime":"HH:MM|null","reason":"string|null","notes":"string|null","visitSummary":"string|null","patientQuery":"string|null","clarification":"string|null"}',
    "Rules:",
    "- intent=book when the user wants to schedule a new appointment.",
    "- intent=cancel when the user wants to cancel an appointment.",
    "- intent=reschedule when the user wants to change an existing appointment.",
    "- intent=list_appointments when the user asks for their appointments.",
    "- intent=availability_query when the user asks for available slots/times for a doctor on a date.",
    "- intent=doctor_info when the user asks for doctor suggestions or a doctor by specialty.",
    "- intent=add_visit_summary when a doctor wants to add or update a visit summary for a completed appointment.",
    "- intent=cancel_by_patient when a doctor wants to cancel appointments for a specific patient name.",
    "- intent=reason_query when the user asks for the reason of one or more appointments, even with typos or vague phrasing.",
    "- intent=visit_summary_query when the user asks to read what was written in the visit summary.",
    "- intent=help when the user asks what you can do.",
    "- For booking/cancel/reschedule, prefer using the appointment/doctor IDs from the lists below when clear.",
    "- If something is missing, set clarification to a short question and reply to that question.",
    `User role: ${userRole}`,
    `User name: ${userName || "unknown"}`,
    `Conversation history:\n${history || "No prior messages."}`,
    `Latest user message: ${message}`,
    `Doctor options:\n${doctors || "No doctors loaded."}`,
    `Appointment options:\n${appointments || "No appointments loaded."}`,
  ].join("\n\n");

  const response = await geminiClient.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  return safeParseJson(response.text) || {
    intent: "chat",
    reply: response.text || "I’m here to help.",
  };
}

async function suggestDoctors(req, res) {
  try {
    const { query: q, need, date } = req.body;
    const searchQuery = q || need || "";
    const result = await query("select * from users where role = 'doctor'");
    const doctors = result.rows.map(mapUserRow);

    if (!doctors.length) {
      return res.json({ suggestions: [] });
    }

    return res.json({
      suggestions: rankDoctorsFallback(doctors, searchQuery),
      fallback: true,
      date: date || "",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getDoctorDetails(req, res) {
  try {
    const result = await query("select * from users where id = $1 and role = 'doctor' limit 1", [req.params.doctorId]);
    if (!result.rows[0]) return res.status(404).json({ error: "Doctor not found" });
    res.json(mapUserRow(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getAvailableSlots(req, res) {
  try {
    const { doctorId } = req.params;
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: "Date is required" });

    const doctorResult = await query("select * from users where id = $1 and role = 'doctor' limit 1", [doctorId]);
    if (!doctorResult.rows[0]) return res.status(404).json({ error: "Doctor not found" });

    const doctor = mapUserRow(doctorResult.rows[0]);
    const bookedResult = await query(
      `select appointment_time
       from appointments
       where doctor_id = $1 and appointment_date = $2 and status <> 'cancelled'`,
      [doctorId, date]
    );
    const bookedTimes = bookedResult.rows.map((row) => row.appointment_time);

    return res.json({
      availableSlots: generateSlotsFallback(doctor, date, bookedTimes),
      fallback: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getMyAppointments(req, res) {
  try {
    const appointments = await getAppointmentsForUser(req.user.userId, "patient");
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function chatWithGemini(req, res) {
  try {
    const message = String(req.body.message || "").trim();
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const userRole = String(req.user?.role || req.body.userRole || "patient");
    const userName = req.user?.name || req.body.user?.name || "";

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const doctors = await getDoctors();
    const appointments = await getAppointmentsForUser(req.user.userId, userRole === "doctor" ? "doctor" : "patient");
    const doctorSummary = doctors.slice(0, 10).map(formatDoctorSummary).join("\n");
    const appointmentSummary = appointments.slice(0, 10).map(formatAppointmentSummary).join("\n");

    const extracted = await extractIntentSmart({
      message,
      history,
      userRole,
      userName,
      doctors: doctorSummary,
      appointments: appointmentSummary,
    });

    const intent = String(extracted.intent || "chat").toLowerCase();
    const wantsVisitSummary = userRole === "doctor" && (intent === "add_visit_summary" || detectVisitSummaryIntent(message));
    const wantsCancelByPatient =
      userRole === "doctor" && (intent === "cancel_by_patient" || detectCancelByPatientIntent(message));

    if (intent === "reason_query" || detectReasonQuery(message, history)) {
      const listModeFromMessage = detectListMode(message);
      const listMode = listModeFromMessage === "all" ? inferListModeFromHistory(history) : listModeFromMessage;
      const asksForEach = /\b(each|all|every)\b/.test(String(message || "").toLowerCase());
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayIso = `${yyyy}-${mm}-${dd}`;
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tyyyy = tomorrow.getFullYear();
      const tmm = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const tdd = String(tomorrow.getDate()).padStart(2, "0");
      const tomorrowIso = `${tyyyy}-${tmm}-${tdd}`;

      const scopedAppointments = (() => {
        let scoped = appointments.filter((apt) => apt.status !== "cancelled");
        if (listMode === "completed") scoped = scoped.filter((apt) => apt.status === "completed");
        if (listMode === "pending") scoped = scoped.filter((apt) => apt.status === "pending");
        if (listMode === "today") scoped = scoped.filter((apt) => apt.appointmentDate === todayIso);
        if (listMode === "tomorrow") scoped = scoped.filter((apt) => apt.appointmentDate === tomorrowIso);
        if (listMode === "upcoming") scoped = scoped.filter((apt) => apt.appointmentDate >= todayIso && apt.status !== "completed");
        return scoped;
      })();

      if (asksForEach) {
        const scoped = scopedAppointments;

        if (!scoped.length) {
          return res.json({ reply: "No appointments found for that filter." });
        }

        const rows = scoped.slice(0, 10).map((apt, index) => {
          const patientName =
            [apt?.patientId?.firstName, apt?.patientId?.lastName].filter(Boolean).join(" ").trim() ||
            "Unknown Patient";
          const reasonText = normalizeReasonText(apt?.reason);
          return `${index + 1}. The reason for the appointment of patient ${patientName} is: ${reasonText}.`;
        });

        return res.json({ reply: rows.join("\n") });
      }

      if (scopedAppointments.length === 1 && !/\b(choose|which|specific|id|date|time)\b/.test(String(message || "").toLowerCase())) {
        const appt = scopedAppointments[0];
        const patientName =
          [appt?.patientId?.firstName, appt?.patientId?.lastName].filter(Boolean).join(" ").trim() ||
          "Unknown Patient";
        const reasonText = normalizeReasonText(appt?.reason);
        return res.json({
          reply: `The reason for the appointment of patient ${patientName} is: ${reasonText}.`,
        });
      }

      const appointmentCandidate = await findAppointmentCandidate(
        req.user.userId,
        userRole === "doctor" ? "doctor" : "patient",
        extracted,
        message
      );

      if (!appointmentCandidate) {
        return res.json({
          reply: "I could not find any matching appointment. Please provide the appointment date/time or doctor name.",
        });
      }

      if (appointmentCandidate?.ambiguous) {
        const options = appointmentCandidate.appointments
          .slice(0, 5)
          .map((apt, index) => `${index + 1}. ${apt.appointmentDate} at ${apt.appointmentTime} with ${apt.doctorId?.firstName || "Doctor"} ${apt.doctorId?.lastName || ""}`)
          .join("\n");

        return res.json({
          reply: `Could you please specify which appointment you'd like to know the reason for?\n\n${options}`,
        });
      }

      const appt = appointmentCandidate;
      const patientName =
        [appt?.patientId?.firstName, appt?.patientId?.lastName].filter(Boolean).join(" ").trim() ||
        "Unknown Patient";
      const reasonText = normalizeReasonText(appt?.reason);

      return res.json({
        reply: `The reason for the appointment of patient ${patientName} is: ${reasonText}.`,
      });
    }

    if (intent === "visit_summary_query" || detectVisitSummaryQuery(message, history)) {
      const listModeFromMessage = detectListMode(message);
      const inferredMode = inferListModeFromHistory(history);
      const listMode = listModeFromMessage === "all" ? inferredMode : listModeFromMessage;
      const asksForEach = /\b(each|all|every)\b/.test(String(message || "").toLowerCase());

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayIso = `${yyyy}-${mm}-${dd}`;
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tyyyy = tomorrow.getFullYear();
      const tmm = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const tdd = String(tomorrow.getDate()).padStart(2, "0");
      const tomorrowIso = `${tyyyy}-${tmm}-${tdd}`;

      let scoped = appointments.filter((apt) => apt.status !== "cancelled");
      if (listMode === "completed") scoped = scoped.filter((apt) => apt.status === "completed");
      else if (listMode === "pending") scoped = scoped.filter((apt) => apt.status === "pending");
      else if (listMode === "today") scoped = scoped.filter((apt) => apt.appointmentDate === todayIso);
      else if (listMode === "tomorrow") scoped = scoped.filter((apt) => apt.appointmentDate === tomorrowIso);
      else if (listMode === "upcoming") scoped = scoped.filter((apt) => apt.appointmentDate >= todayIso && apt.status !== "completed");
      else scoped = scoped.filter((apt) => apt.status === "completed");

      if (asksForEach) {
        if (!scoped.length) {
          return res.json({ reply: "No matching appointments found for visit summaries." });
        }

        const rows = scoped.slice(0, 10).map((apt, index) => {
          const patientName =
            [apt?.patientId?.firstName, apt?.patientId?.lastName].filter(Boolean).join(" ").trim() ||
            "Unknown Patient";
          const summaryText = String(apt?.visitSummary || "").trim() || "No visit summary recorded.";
          return `${index + 1}. Visit summary for ${patientName} on ${apt.appointmentDate} at ${apt.appointmentTime}: ${summaryText}`;
        });

        return res.json({ reply: rows.join("\n") });
      }

      if (scoped.length === 1) {
        const apt = scoped[0];
        const doctorName = [apt?.doctorId?.firstName, apt?.doctorId?.lastName].filter(Boolean).join(" ").trim() || "Doctor";
        const patientName = [apt?.patientId?.firstName, apt?.patientId?.lastName].filter(Boolean).join(" ").trim() || "Patient";
        const who = userRole === "doctor" ? patientName : doctorName;
        const summaryText = String(apt?.visitSummary || "").trim() || "No visit summary recorded.";

        return res.json({
          reply: `The visit summary for the appointment with ${who} on ${apt.appointmentDate} at ${apt.appointmentTime} is: ${summaryText}`,
        });
      }

      const appointmentCandidate = await findAppointmentCandidate(
        req.user.userId,
        userRole === "doctor" ? "doctor" : "patient",
        extracted,
        message
      );

      if (!appointmentCandidate) {
        return res.json({
          reply: "I could not identify which appointment summary you want. Please include date/time or doctor/patient name.",
        });
      }

      if (appointmentCandidate?.ambiguous) {
        const options = appointmentCandidate.appointments
          .slice(0, 5)
          .map(
            (apt, index) =>
              `${index + 1}. ${apt.appointmentDate} at ${apt.appointmentTime} with ${apt.doctorId?.firstName || "Doctor"} ${apt.doctorId?.lastName || ""}`
          )
          .join("\n");

        return res.json({
          reply: `Please specify which appointment summary you want:\n\n${options}`,
        });
      }

      const apt = appointmentCandidate;
      const summaryText = String(apt?.visitSummary || "").trim() || "No visit summary recorded.";
      return res.json({
        reply: `The visit summary for ${apt.appointmentDate} at ${apt.appointmentTime} is: ${summaryText}`,
      });
    }

    if (wantsVisitSummary) {
      const appointmentCandidate = await findAppointmentCandidate(req.user.userId, "doctor", extracted, message);

      if (!appointmentCandidate) {
        return res.json({
          reply:
            "I could not find the appointment. Please include the appointment date/time (or doctor/patient context) and the summary text.",
        });
      }

      if (appointmentCandidate?.ambiguous) {
        const options = appointmentCandidate.appointments
          .slice(0, 5)
          .map(
            (apt, index) =>
              `${index + 1}. ${apt.appointmentDate} at ${apt.appointmentTime} with ${apt.patientId?.firstName || "Patient"} ${apt.patientId?.lastName || ""} (${apt.status})`
          )
          .join("\n");

        return res.json({
          reply: `I found more than one appointment. Please choose one for the visit summary:\n\n${options}`,
        });
      }

      const appointment = appointmentCandidate;
      if (appointment.status !== "completed") {
        return res.json({
          reply: "Visit summary can only be added to completed appointments.",
        });
      }

      const summaryText = String(extracted.visitSummary || extracted.notes || extractSummaryTextFromMessage(message)).trim();
      if (!summaryText || summaryText.length < 8) {
        return res.json({
          reply:
            "Please provide the visit summary text as well. Example: summary: Patient is stable, continue current medication for 2 weeks.",
        });
      }

      await query(
        "update appointments set visit_summary = $2, visit_summary_updated_at = now(), updated_at = now() where id = $1",
        [appointment.id, summaryText]
      );

      return res.json({
        reply: `Visit summary saved for ${appointment.appointmentDate} at ${appointment.appointmentTime}.`,
      });
    }

    if (wantsCancelByPatient) {
      const patientQuery = String(extracted.patientQuery || extractPatientQueryFromMessage(message)).trim().toLowerCase();
      if (!patientQuery || patientQuery.length < 2) {
        return res.json({
          reply: "Please tell me the patient name to cancel appointments for. Example: cancel appointments for patient John Doe.",
        });
      }

      const matchingAppointments = appointments.filter((apt) => {
        const fullName = `${apt.patientId?.firstName || ""} ${apt.patientId?.lastName || ""}`.toLowerCase().trim();
        return fullName.includes(patientQuery) && apt.status !== "cancelled" && apt.status !== "completed";
      });

      if (!matchingAppointments.length) {
        return res.json({
          reply: `I could not find active appointments for patient "${patientQuery}".`,
        });
      }

      const patientNames = [...new Set(matchingAppointments.map((apt) => `${apt.patientId?.firstName || ""} ${apt.patientId?.lastName || ""}`.trim()))].filter(Boolean);
      if (patientNames.length > 1) {
        const nameList = patientNames.slice(0, 5).map((name, index) => `${index + 1}. ${name}`).join("\n");
        return res.json({
          reply: `I found multiple matching patients. Please be more specific:\n\n${nameList}`,
        });
      }

      const ids = matchingAppointments.map((apt) => apt.id);
      await query(
        "update appointments set status = 'cancelled', updated_at = now() where id = ANY($1::uuid[])",
        [ids]
      );

      for (const apt of matchingAppointments.slice(0, 10)) {
        try {
          await sendAppointmentCancelledEmail({
            patientEmail: apt.patientId?.email,
            patientName: [apt.patientId?.firstName, apt.patientId?.lastName].filter(Boolean).join(" ").trim(),
            doctorEmail: apt.doctorId?.email,
            doctorName: formatDoctorName(apt.doctorId),
            appointmentDate: apt.appointmentDate,
            appointmentTime: apt.appointmentTime,
            reason: apt.reason,
          });
        } catch (mailErr) {
          console.error("Gemini bulk cancel email error:", mailErr.message);
        }
      }

      const preview = matchingAppointments
        .slice(0, 5)
        .map((apt, index) => `${index + 1}. ${apt.appointmentDate} at ${apt.appointmentTime}`)
        .join("\n");

      return res.json({
        reply: `Cancelled ${matchingAppointments.length} appointment(s) for ${patientNames[0]}.\n\n${preview}`,
      });
    }

    if (intent === "availability_query" || detectSlotAvailabilityIntent(message, history)) {
      const doctorQuery = String(
        extracted.doctorQuery ||
          extractDoctorQueryFromMessage(message) ||
          getRecentDoctorQueryHint(history) ||
          ""
      ).trim();

      if (!doctorQuery) {
        return res.json({
          reply: "Could you please tell me which doctor or specialty you want available slots for?",
        });
      }

      const candidateDoctors = extracted.doctorId
        ? doctors.filter((doctor) => String(doctor.id) === String(extracted.doctorId))
        : await findDoctorCandidates(doctorQuery);

      if (!candidateDoctors.length) {
        return res.json({
          reply: `I could not find a matching doctor for "${doctorQuery}". Could you please share the full doctor name or specialty?`,
        });
      }

      if (candidateDoctors.length > 1 && !extracted.doctorId) {
        const options = candidateDoctors
          .slice(0, 5)
          .map((doctor, index) => `${index + 1}. ${doctor.firstName} ${doctor.lastName} - ${doctor.specialty || "General Medicine"}`)
          .join("\n");

        return res.json({
          reply: `I found more than one match. Please choose the doctor:\n\n${options}`,
        });
      }

      const doctor = candidateDoctors[0];
      const requestedDate =
        parseNaturalDate(message) ||
        parseNaturalDate(extracted.appointmentDate || "") ||
        getRecentDateHint(history);

      if (!requestedDate) {
        return res.json({
          reply: `Sure. For which date would you like available slots with Dr. ${doctor.firstName} ${doctor.lastName}? You can say "today", "tomorrow", or a calendar date.`,
        });
      }

      const bookedResult = await query(
        `select appointment_time
         from appointments
         where doctor_id = $1 and appointment_date = $2 and status <> 'cancelled'`,
        [doctor.id, requestedDate]
      );
      const bookedTimes = bookedResult.rows.map((row) => row.appointment_time);
      const availableSlots = generateSlotsFallback(doctor, requestedDate, bookedTimes);

      if (!availableSlots.length) {
        return res.json({
          reply: `There are no available slots for Dr. ${doctor.firstName} ${doctor.lastName} on ${requestedDate}. Would you like me to check another date?`,
        });
      }

      return res.json({
        reply: `Available slots for Dr. ${doctor.firstName} ${doctor.lastName} on ${requestedDate}: ${availableSlots.slice(0, 10).join(", ")}`,
      });
    }

    if (intent === "help") {
      return res.json({
        reply:
          extracted.reply ||
          "I can help you chat, book appointments, cancel appointments, reschedule appointments, list appointments, add visit summaries (doctor), and cancel appointments for a patient (doctor).",
      });
    }

    if (intent === "list_appointments") {
      const listMode = detectListMode(message);
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayIso = `${yyyy}-${mm}-${dd}`;
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tyyyy = tomorrow.getFullYear();
      const tmm = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const tdd = String(tomorrow.getDate()).padStart(2, "0");
      const tomorrowIso = `${tyyyy}-${tmm}-${tdd}`;

      let list = appointments.filter((apt) => apt.status !== "cancelled");
      if (listMode === "completed") {
        list = list.filter((apt) => apt.status === "completed");
      } else if (listMode === "pending") {
        list = list.filter((apt) => apt.status === "pending");
      } else if (listMode === "today") {
        list = list.filter((apt) => apt.appointmentDate === todayIso);
      } else if (listMode === "tomorrow") {
        list = list.filter((apt) => apt.appointmentDate === tomorrowIso);
      } else if (listMode === "upcoming") {
        list = list.filter((apt) => apt.appointmentDate >= todayIso && apt.status !== "completed");
      }

      if (!list.length) {
        const noneMessage =
          listMode === "completed"
            ? "You do not have any completed appointments right now."
            : listMode === "pending"
              ? "You do not have any pending appointments right now."
            : listMode === "today"
              ? "You do not have any appointments scheduled for today."
            : listMode === "tomorrow"
              ? "You do not have any appointments scheduled for tomorrow."
              : listMode === "upcoming"
                ? "You do not have any upcoming appointments right now."
                : "You do not have any active appointments right now.";
        return res.json({ reply: noneMessage });
      }

      const reply = list
        .slice(0, 6)
        .map((apt, index) => {
          const doctorName = [apt.doctorId?.firstName, apt.doctorId?.lastName].filter(Boolean).join(" ").trim();
          return `${index + 1}. ${apt.appointmentDate} at ${apt.appointmentTime} with ${doctorName || "Doctor"} (${apt.status})`;
        })
        .join("\n");

      const title =
        listMode === "completed"
          ? "Here are your completed appointments"
          : listMode === "pending"
            ? "Here are your pending appointments"
          : listMode === "today"
            ? "Here are your appointments for today"
            : listMode === "tomorrow"
              ? "Here are your appointments for tomorrow"
            : listMode === "upcoming"
              ? "Here are your upcoming appointments"
              : "Here are your appointments";

      return res.json({ reply: `${title}:\n\n${reply}` });
    }

    if (intent === "doctor_info") {
      const doctorQuery = extracted.doctorQuery || message;
      const matches = await findDoctorCandidates(doctorQuery);

      if (!matches.length) {
        return res.json({
          reply: toPoliteClarification(
            extracted.clarification,
            "I could not find a matching doctor. Could you please share the specialty or doctor name?"
          ),
        });
      }

      const reply = matches
        .slice(0, 5)
        .map((doctor, index) => `${index + 1}. ${doctor.firstName} ${doctor.lastName} - ${doctor.specialty || "General Medicine"}`)
        .join("\n");

      return res.json({ reply: `Here are some matches:\n\n${reply}` });
    }

    if (intent === "book") {
      if (userRole !== "patient") {
        return res.json({ reply: "Only patients can book appointments on this website." });
      }

      const doctorQuery = String(extracted.doctorQuery || extracted.reason || "").trim();
      const candidateDoctors = extracted.doctorId
        ? doctors.filter((doctor) => String(doctor.id) === String(extracted.doctorId))
        : doctorQuery
          ? await findDoctorCandidates(doctorQuery)
          : [];

      if (!candidateDoctors.length || (!doctorQuery && !extracted.doctorId)) {
        return res.json({
          reply: toPoliteClarification(
            extracted.clarification,
            "Which doctor or specialty would you like to book with?"
          ),
        });
      }

      // Improved exact doctor matching: full name or single last name
      const queryLower = doctorQuery.toLowerCase();
      const exactDoctor = doctors.find((doctor) => {
        const fullName = `${doctor.firstName} ${doctor.lastName}`.toLowerCase().trim();
        const lastName = String(doctor.lastName).toLowerCase().trim();
        return fullName === queryLower || lastName === queryLower;
      });

      // If we have an exact match in candidates, use it directly
      let doctor = exactDoctor && candidateDoctors.some((d) => String(d.id) === String(exactDoctor.id)) 
        ? exactDoctor 
        : null;

      // Only ask for clarification if no exact match and multiple candidates
      if (!doctor && candidateDoctors.length > 1 && !extracted.doctorId) {
        const options = candidateDoctors
          .slice(0, 3)
          .map((d, index) => `${index + 1}. ${d.firstName} ${d.lastName} - ${d.specialty || "General Medicine"}`)
          .join("\n");

        return res.json({
          reply: `I found more than one possible doctor. Please choose one:\n\n${options}`,
        });
      }

      // If still no doctor, use the first candidate
      if (!doctor) {
        doctor = candidateDoctors[0];
      }

      const recentAssistantText = history
        .filter((item) => (item?.role || item?.type || "") === "assistant")
        .slice(-4)
        .map((item) => String(item?.text || "").toLowerCase())
        .join("\n");
      const askedTomorrowDate =
        recentAssistantText.includes("exact date for tomorrow") ||
        recentAssistantText.includes("what date for tomorrow");

      const appointmentDate =
        (isAffirmativeReply(message) && askedTomorrowDate ? parseNaturalDate("tomorrow") : null) ||
        parseNaturalDate(message) ||
        getRecentDateHint(history) ||
        parseNaturalDate(extracted.appointmentDate || "");
      const appointmentTime =
        parseNaturalTime(message) ||
        getRecentTimeHint(history) ||
        parseNaturalTime(extracted.appointmentTime || "");
      const bookingReason = String(extracted.reason || "").trim();

      if (!appointmentDate || !appointmentTime) {
        return res.json({
          reply: toPoliteClarification(
            extracted.clarification,
            `I found ${doctor.firstName} ${doctor.lastName}. Could you please tell me the exact date and time you prefer?`
          ),
        });
      }

      if (!bookingReason || bookingReason.length < 3) {
        return res.json({
          reply: toPoliteClarification(
            extracted.clarification,
            "Could you please share the reason for the appointment (for example: chest pain, follow-up, or skin rash)?"
          ),
        });
      }

      if (isTemporalOnlyText(bookingReason)) {
        return res.json({
          reply: "That looks like a date/time, not a medical reason. Please provide a short reason like 'checkup', 'follow-up', or 'headache'.",
        });
      }

      const apptAt = parseApptDate(appointmentDate, appointmentTime);
      if (Number.isNaN(apptAt.getTime()) || apptAt.getTime() <= Date.now()) {
        return res.json({ reply: "Please choose a future date and time for the appointment." });
      }

      const clash = await query(
        `select id from appointments
         where doctor_id = $1 and appointment_date = $2 and appointment_time = $3 and status <> 'cancelled'
         limit 1`,
        [doctor.id, appointmentDate, appointmentTime]
      );

      if (clash.rows[0]) {
        const availableSlots = generateSlotsFallback(doctor, appointmentDate, [appointmentTime]);
        return res.json({
          reply:
            availableSlots.length > 0
              ? `That slot is taken. Try one of these available times on ${appointmentDate}: ${availableSlots.slice(0, 6).join(", ")}.`
              : `That slot is taken. Please try another date or time with ${doctor.firstName} ${doctor.lastName}.`,
        });
      }

      const insertResult = await query(
        `insert into appointments (
          patient_id, doctor_id, appointment_date, appointment_time, reason, notes
        ) values ($1, $2, $3, $4, $5, $6)
        returning *`,
        [
          req.user.userId,
          doctor.id,
          appointmentDate,
          appointmentTime,
          bookingReason,
          extracted.notes || "",
        ]
      );

      const booked = await query(
        `select a.*,
                p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
                d.specialty as doctor_specialty, d.years_experience as doctor_years_experience
         from appointments a
         left join users p on p.id = a.patient_id and p.role = 'patient'
         left join users d on d.id = a.doctor_id and d.role = 'doctor'
         where a.id = $1 limit 1`,
        [insertResult.rows[0].id]
      );
      const appt = attachAppointmentUsers(booked.rows[0]);

      try {
        const doctorName = formatDoctorName(appt.doctorId);
        const patientName = [appt.patientId?.firstName, appt.patientId?.lastName].filter(Boolean).join(" ").trim();
        const recipients = await getRoleBoundRecipientEmails(appt.patientId?.id || appt.patientId, appt.doctorId?.id || appt.doctorId);
        const msUntil = apptAt.getTime() - Date.now();

        await sendAppointmentConfirmationEmail({
          patientEmail: recipients.patient_email,
          patientName,
          doctorEmail: recipients.doctor_email,
          doctorName,
          appointmentDate,
          appointmentTime,
          reason: bookingReason,
          notes: extracted.notes || "",
        });

        if (msUntil <= 24 * 60 * 60 * 1000 && msUntil > 30 * 60 * 1000) {
          await sendAppointmentReminderEmail({
            patientEmail: recipients.patient_email,
            patientName,
            doctorName,
            appointmentDate,
            appointmentTime,
          });
        }
      } catch (mailErr) {
        console.error("Gemini booking email error:", mailErr.message);
      }

      return res.json({
        reply: `Booked successfully with ${doctor.firstName} ${doctor.lastName} on ${appointmentDate} at ${appointmentTime}.`,
        appointmentsUpdated: true,
        action: "book",
      });
    }

    if (intent === "cancel" || intent === "reschedule") {
      if (userRole !== "patient" && userRole !== "doctor") {
        return res.json({ reply: "You need to be logged in to manage appointments." });
      }

      const appointmentCandidate = await findAppointmentCandidate(req.user.userId, userRole, extracted, message);
      if (!appointmentCandidate) {
        return res.json({
          reply: toPoliteClarification(
            extracted.clarification,
            "I could not find any matching appointment. Could you please share the doctor name or appointment date?"
          ),
        });
      }
      if (appointmentCandidate?.ambiguous) {
        const options = appointmentCandidate.appointments
          .slice(0, 5)
          .map((apt, index) => `${index + 1}. ${apt.appointmentDate} at ${apt.appointmentTime} with ${apt.doctorId?.firstName || "Doctor"} ${apt.doctorId?.lastName || ""}`)
          .join("\n");

        return res.json({
          reply: `I found more than one appointment. Please choose one:\n\n${options}`,
        });
      }

      const appointment = appointmentCandidate;
      if (!appointment) {
        return res.json({
          reply: toPoliteClarification(
            extracted.clarification,
            "I could not identify which appointment you mean. Could you please share the doctor name, date, or time?"
          ),
        });
      }

      const appointmentOwnerId = appointment.patientId?.id || appointment.patientId;
      const appointmentDoctorId = appointment.doctorId?.id || appointment.doctorId;
      const isOwner = String(appointmentOwnerId) === String(req.user.userId) || String(appointmentDoctorId) === String(req.user.userId);

      if (!isOwner) {
        return res.json({ reply: "You can only manage your own appointments." });
      }

      if (intent === "cancel") {
        await query("update appointments set status = 'cancelled', updated_at = now() where id = $1", [appointment.id]);
        const updated = await query(
          `select a.*,
                  p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
                  d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
                  d.specialty as doctor_specialty, d.years_experience as doctor_years_experience
           from appointments a
           left join users p on p.id = a.patient_id and p.role = 'patient'
           left join users d on d.id = a.doctor_id and d.role = 'doctor'
           where a.id = $1 limit 1`,
          [appointment.id]
        );
        const cancelled = attachAppointmentUsers(updated.rows[0]);

        try {
          const recipients = await getRoleBoundRecipientEmails(
            cancelled.patientId?.id || cancelled.patientId,
            cancelled.doctorId?.id || cancelled.doctorId
          );
          await sendAppointmentCancelledEmail({
            patientEmail: recipients.patient_email,
            patientName: [cancelled.patientId?.firstName, cancelled.patientId?.lastName].filter(Boolean).join(" ").trim(),
            doctorEmail: recipients.doctor_email,
            doctorName: formatDoctorName(cancelled.doctorId),
            appointmentDate: cancelled.appointmentDate,
            appointmentTime: cancelled.appointmentTime,
            reason: cancelled.reason,
          });
        } catch (mailErr) {
          console.error("Gemini cancel email error:", mailErr.message);
        }

        return res.json({
          reply: `Cancelled your appointment on ${cancelled.appointmentDate} at ${cancelled.appointmentTime}.`,
          appointmentsUpdated: true,
          action: "cancel",
        });
      }

      const newDate = parseNaturalDate(extracted.newAppointmentDate || extracted.appointmentDate || message);
      const newTime = parseNaturalTime(extracted.newAppointmentTime || extracted.appointmentTime || message);
      if (!newDate || !newTime) {
        return res.json({
          reply: toPoliteClarification(
            extracted.clarification,
            "What new date and time would you like for the reschedule?"
          ),
        });
      }

      const nextAt = parseApptDate(newDate, newTime);
      if (Number.isNaN(nextAt.getTime()) || nextAt.getTime() <= Date.now()) {
        return res.json({ reply: "Please choose a future date and time for the reschedule." });
      }

      const clash = await query(
        `select id from appointments
         where id <> $1 and doctor_id = $2 and appointment_date = $3 and appointment_time = $4 and status <> 'cancelled'
         limit 1`,
        [appointment.id, appointmentDoctorId, newDate, newTime]
      );

      if (clash.rows[0]) {
        const doctor = appointment.doctorId;
        const availableSlots = generateSlotsFallback(doctor, newDate, [newTime]);
        return res.json({
          reply:
            availableSlots.length > 0
              ? `That slot is already booked. Try one of these times on ${newDate}: ${availableSlots.slice(0, 6).join(", ")}.`
              : `That time is booked. Please choose another slot for ${formatDoctorName(doctor)}.`,
        });
      }

      await query(
        `update appointments
         set appointment_date = $2, appointment_time = $3, status = 'pending', reminder_sent_at = null, updated_at = now()
         where id = $1`,
        [appointment.id, newDate, newTime]
      );

      const updated = await query(
        `select a.*,
                p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
                d.specialty as doctor_specialty, d.years_experience as doctor_years_experience
         from appointments a
         left join users p on p.id = a.patient_id and p.role = 'patient'
         left join users d on d.id = a.doctor_id and d.role = 'doctor'
         where a.id = $1 limit 1`,
        [appointment.id]
      );
      const rescheduled = attachAppointmentUsers(updated.rows[0]);

      try {
        const recipients = await getRoleBoundRecipientEmails(
          rescheduled.patientId?.id || rescheduled.patientId,
          rescheduled.doctorId?.id || rescheduled.doctorId
        );
        await sendAppointmentRescheduledEmail({
          patientEmail: recipients.patient_email,
          patientName: [rescheduled.patientId?.firstName, rescheduled.patientId?.lastName].filter(Boolean).join(" ").trim(),
          doctorEmail: recipients.doctor_email,
          doctorName: formatDoctorName(rescheduled.doctorId),
          appointmentDate: newDate,
          appointmentTime: newTime,
          reason: rescheduled.reason,
        });
      } catch (mailErr) {
        console.error("Gemini reschedule email error:", mailErr.message);
      }

      return res.json({
        reply: `Rescheduled your appointment to ${newDate} at ${newTime}.`,
        appointmentsUpdated: true,
        action: "reschedule",
      });
    }

    res.json({
      reply: extracted.reply || "I am here to help. Please tell me what you want to do.",
    });
  } catch (error) {
    console.error("Gemini error:", error);

    if (Number(error?.status) === 429) {
      return res.status(429).json({
        message:
          "Gemini quota reached for now. Please wait a bit and retry, or upgrade billing/quota in Google AI Studio.",
        error: "Gemini quota exceeded",
        detail: error?.message || "RESOURCE_EXHAUSTED",
      });
    }

    res.status(500).json({
      message: error?.message || "Gemini request failed",
      error: "Failed to get response from Gemini",
      detail: error?.message || "Unknown Gemini error",
    });
  }
}

module.exports = {
  suggestDoctors,
  getDoctorDetails,
  getAvailableSlots,
  getMyAppointments,
  chatWithGemini,
};
