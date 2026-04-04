const { query } = require("../db");
const { mapUserRow, attachAppointmentUsers } = require("../utils/dbMappers");

const CHATBOT_SERVICE_URL = process.env.CHATBOT_SERVICE_URL || "http://127.0.0.1:5000";

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

async function fetchFromPython(endpoint, data) {
  const response = await fetch(`${CHATBOT_SERVICE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Python service returned ${response.status}`);
  }

  return response.json();
}

async function healthCheck(req, res) {
  try {
    const response = await fetch(`${CHATBOT_SERVICE_URL}/health`);
    const data = await response.json();
    res.json({ status: "ok", pythonService: data.status });
  } catch (error) {
    res.status(503).json({ status: "error", message: "Chatbot service unavailable" });
  }
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

    try {
      const ranked = await fetchFromPython("/suggest-doctors", {
        doctors,
        query: searchQuery,
        date: date || "",
      });
      return res.json(ranked);
    } catch (pythonError) {
      console.warn("Using JS fallback for doctor suggestions:", pythonError.message);
      return res.json({ suggestions: rankDoctorsFallback(doctors, searchQuery), fallback: true });
    }
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

    try {
      const result = await fetchFromPython("/doctor-slots", { doctor, date, bookedTimes });
      return res.json(result);
    } catch (pythonError) {
      console.warn("Using JS fallback for slot generation:", pythonError.message);
      return res.json({ availableSlots: generateSlotsFallback(doctor, date, bookedTimes), fallback: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getMyAppointments(req, res) {
  try {
    const result = await query(
      `select a.*,
              p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
              d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
              d.specialty as doctor_specialty, d.years_experience as doctor_years_experience
       from appointments a
       left join users p on p.id = a.patient_id
       left join users d on d.id = a.doctor_id
       where a.patient_id = $1
       order by a.created_at desc`,
      [req.user.userId]
    );

    res.json(result.rows.map(attachAppointmentUsers));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  healthCheck,
  suggestDoctors,
  getDoctorDetails,
  getAvailableSlots,
  getMyAppointments,
};
