const User = require("../models/User");
const Appointment = require("../models/Appointment");

/**
 * Chatbot Controller
 * Proxies chatbot requests to Python service
 * Fetches doctor and appointment data from MongoDB
 */

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

function inferSpecialty(query = "") {
  const q = String(query).toLowerCase();
  for (const [keyword, specialty] of Object.entries(SYMPTOM_SPECIALTY_MAP)) {
    if (q.includes(keyword)) return specialty;
  }
  return "";
}

function rankDoctorsFallback(doctors, query = "") {
  const q = String(query).trim().toLowerCase();
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
      doctorId: String(doc._id),
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

/**
 * Helper to call Python Flask service
 */
async function fetchFromPython(endpoint, data) {
  try {
    const response = await fetch(`${CHATBOT_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Python service returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error calling Python chatbot service ${endpoint}:`, error);
    throw error;
  }
}

/**
 * GET /api/chatbot/health
 * Check if Python chatbot service is running
 */
async function healthCheck(req, res) {
  try {
    const response = await fetch(`${CHATBOT_SERVICE_URL}/health`);
    const data = await response.json();
    res.json({ status: "ok", pythonService: data.status });
  } catch (error) {
    res.status(503).json({ status: "error", message: "Chatbot service unavailable" });
  }
}

/**
 * POST /api/chatbot/suggest-doctors
 * Get ranked doctor suggestions based on user need
 */
async function suggestDoctors(req, res) {
  try {
    const { query, need, date } = req.body;
    const searchQuery = query || need || "";

    // Fetch all doctors from MongoDB
    const doctors = await User.find({ role: "doctor" }).lean();

    if (!doctors.length) {
      return res.json({ suggestions: [] });
    }

    // Call Python service to rank doctors
    try {
      const result = await fetchFromPython("/suggest-doctors", {
        doctors,
        query: searchQuery,
        date: date || "",
      });
      return res.json(result);
    } catch (pythonError) {
      console.warn("Using JS fallback for doctor suggestions:", pythonError.message);
      const suggestions = rankDoctorsFallback(doctors, searchQuery);
      return res.json({ suggestions, fallback: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/chatbot/doctors/:doctorId
 * Get doctor details
 */
async function getDoctorDetails(req, res) {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findById(doctorId).lean();
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/chatbot/doctors/:doctorId/available-slots
 * Get available appointment slots for a doctor on a specific date
 */
async function getAvailableSlots(req, res) {
  try {
    const { doctorId } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    // Fetch doctor
    const doctor = await User.findById(doctorId).lean();
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    // Fetch booked appointments for this doctor on this date
    const bookedAppointments = await Appointment.find({
      doctorId,
      appointmentDate: date,
      status: { $ne: "cancelled" },
    }).lean();

    const bookedTimes = bookedAppointments.map((apt) => apt.appointmentTime);

    try {
      const result = await fetchFromPython("/doctor-slots", {
        doctor,
        date,
        bookedTimes,
      });
      return res.json(result);
    } catch (pythonError) {
      console.warn("Using JS fallback for slot generation:", pythonError.message);
      const availableSlots = generateSlotsFallback(doctor, date, bookedTimes);
      return res.json({ availableSlots, fallback: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/chatbot/my-appointments
 * Get current patient's appointments (for reschedule/cancel flows)
 */
async function getMyAppointments(req, res) {
  try {
    const { userId } = req.user;

    const appointments = await Appointment.find({ patientId: userId })
      .populate("doctorId", "firstName lastName specialty yearsExperience")
      .lean();

    res.json(appointments);
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
