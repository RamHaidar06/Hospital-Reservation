import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * =========================
 * CONFIG (EDIT IF NEEDED)
 * =========================
 */
const API_BASE = "http://localhost:3000/api"; // change if your backend differs

/**
 * =========================
 * HELPERS
 * =========================
 */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

function normalizeId(obj) {
  if (!obj) return obj;
  return { ...obj, id: obj.id || obj._id };
}

function normalizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeId);
}

function generateTimeSlots(doctor) {
  const slots = [];
  const workingDays = (doctor.workingDays || "").split(",").filter(Boolean);
  const startTime = doctor.startTime || "09:00";
  const endTime = doctor.endTime || "17:00";

  const [startHour] = startTime.split(":").map(Number);
  const [endHour] = endTime.split(":").map(Number);

  const dayValues = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  for (let d = 0; d < 30; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dayName = dayValues[date.getDay()];
    if (!workingDays.includes(dayName)) continue;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const timeStr = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        slots.push({ date: date.toISOString().split("T")[0], time: timeStr });
      }
    }
  }
  return slots;
}

/**
 * =========================
 * TOAST
 * =========================
 */
function Toast({ toast }) {
  if (!toast.show) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "14px 24px",
        borderRadius: 12,
        fontWeight: 500,
        zIndex: 99999,
        opacity: 1,
        transition: "opacity 0.3s ease",
        boxShadow:
          toast.type === "error"
            ? "0 0 30px rgba(239, 68, 68, 0.2)"
            : toast.type === "success"
            ? "0 0 30px rgba(34, 197, 94, 0.2)"
            : "0 0 30px rgba(0, 217, 255, 0.2)",
        background:
          toast.type === "error"
            ? "rgba(239, 68, 68, 0.2)"
            : toast.type === "success"
            ? "rgba(34, 197, 94, 0.2)"
            : "rgba(0, 217, 255, 0.2)",
        border:
          toast.type === "error"
            ? "1px solid rgba(239, 68, 68, 0.4)"
            : toast.type === "success"
            ? "1px solid rgba(34, 197, 94, 0.4)"
            : "1px solid rgba(0, 217, 255, 0.4)",
        color: toast.type === "error" ? "#fca5a5" : toast.type === "success" ? "#86efac" : "var(--cyan-bright)",
      }}
    >
      {toast.message}
    </div>
  );
}

/**
 * =========================
 * API WRAPPER
 * =========================
 */
function getToken() {
  return localStorage.getItem("token");
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

/**
 * =========================
 * APP
 * =========================
 */
export default function App() {
  // NOTE: no fake demo data anymore
  const [allData, setAllData] = useState({
    patients: [],
    doctors: [],
    appointments: [],
  });

  const [loggedInPatient, setLoggedInPatient] = useState(null);
  const [loggedInDoctor, setLoggedInDoctor] = useState(null);

  const [page, setPage] = useState("landing"); // landing | auth | patient | doctor
  const [authRoleModal, setAuthRoleModal] = useState(false);

  const [patientAuthView, setPatientAuthView] = useState("login"); // login | register | forgot
  const [doctorAuthView, setDoctorAuthView] = useState("login"); // login | register | forgot
  const [activeAuthRole, setActiveAuthRole] = useState("patient"); // patient | doctor

  const [patientTab, setPatientTab] = useState("profile");
  const [doctorTab, setDoctorTab] = useState("profile");

  const [toast, setToast] = useState({ show: false, type: "success", message: "" });
  const toastTimer = useRef(null);

  function showMessage(message, type = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, type, message });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  }

  // --- Modals ---
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editDoctorOpen, setEditDoctorOpen] = useState(false);
  const [doctorDetailOpen, setDoctorDetailOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);

  // --- Forms ---
  const [patientLogin, setPatientLogin] = useState({ email: "", password: "" });
  const [doctorLogin, setDoctorLogin] = useState({ email: "", password: "" });

  const [patientRegister, setPatientRegister] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    password: "",
    confirmPassword: "",
  });

  const [doctorRegister, setDoctorRegister] = useState({
    firstName: "",
    lastName: "",
    email: "",
    specialty: "",
    license: "",
    experience: "",
    password: "",
    confirmPassword: "",
  });

  const [patientForgotEmail, setPatientForgotEmail] = useState("");
  const [doctorForgotEmail, setDoctorForgotEmail] = useState("");

  // --- Patient edit form ---
  const [patientEditForm, setPatientEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    address: "",
  });

  // --- Doctor edit form ---
  const [doctorEditForm, setDoctorEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    specialty: "",
    license: "",
    experience: "",
    bio: "",
  });

  // --- Booking form ---
  const [apptForm, setApptForm] = useState({ date: "", time: "", reason: "", notes: "" });

  // --- Doctor availability drafts ---
  const [workingDaysDraft, setWorkingDaysDraft] = useState(new Set());
  const [startTimeDraft, setStartTimeDraft] = useState("09:00");
  const [endTimeDraft, setEndTimeDraft] = useState("17:00");

  /**
   * =========================
   * LOAD DATA FROM BACKEND
   * =========================
   *
   * With only routes/auth.js + routes/appointments.js, the one thing we can always load is appointments.
   * For doctors list, we try multiple likely endpoints; if none exist, we’ll show an error.
   */
  /**
 * =========================
 * LOAD DATA FROM BACKEND
 * =========================
 */
useEffect(() => {
  (async () => {
    try {
      // Load doctors (public route)
      const docs = await apiFetch("/users/doctors");
      const doctors = normalizeArray(docs);

      // Load my appointments (if logged in)
      let appointments = [];
      try {
        const mine = await apiFetch("/appointments/mine");
        appointments = normalizeArray(mine);
      } catch {
        appointments = [];
      }

      setAllData((prev) => ({
        ...prev,
        doctors,
        appointments,
      }));
    } catch (e) {
      showMessage("✗ Failed loading data: " + e.message, "error");
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  /**
   * =========================
   * CURRENT USER MEMO
   * =========================
   */
  const currentDoctor = useMemo(() => {
    if (!loggedInDoctor) return null;
    const id = loggedInDoctor.id || loggedInDoctor._id;
    return allData.doctors.find((d) => (d.id || d._id) === id) || normalizeId(loggedInDoctor);
  }, [loggedInDoctor, allData.doctors]);

  const currentPatient = useMemo(() => {
    if (!loggedInPatient) return null;
    const id = loggedInPatient.id || loggedInPatient._id;
    return allData.patients.find((p) => (p.id || p._id) === id) || normalizeId(loggedInPatient);
  }, [loggedInPatient, allData.patients]);

  const doctorSlots = useMemo(() => {
    if (!currentDoctor) return [];
    return generateTimeSlots(currentDoctor);
  }, [currentDoctor]);

  /**
   * =========================
   * NAV / LANDING
   * =========================
   */
  function openAuthSelector() {
    setAuthRoleModal(true);
  }
  function closeAuthSelector() {
    setAuthRoleModal(false);
  }
  function selectRole(role) {
    closeAuthSelector();
    setActiveAuthRole(role);
    setPage("auth");
    if (role === "patient") setPatientAuthView("login");
    else setDoctorAuthView("login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * =========================
   * AUTH
   * =========================
   * Works with typical:
   * POST /api/auth/register  { email, password, role, ... }
   * POST /api/auth/login     { email, password, role }
   * returns: { token, user }
   */
  async function handlePatientLoginSubmit(e) {
    e.preventDefault();
    const email = patientLogin.email.trim();
    const password = patientLogin.password;

    if (!validateEmail(email)) return showMessage("✗ Invalid email format", "error");

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: "patient" }),
      });

      if (data?.token) localStorage.setItem("token", data.token);

      const user = normalizeId(data.user || data);
      setLoggedInPatient(user);
      setLoggedInDoctor(null);
      setPage("patient");
      setPatientTab("profile");
      showMessage("✓ Welcome back!", "success");

      // load patient appointments if supported
      // load my appointments (uses token + /appointments/mine)
try {
  const mine = await apiFetch(`/appointments/mine`);
  setAllData((d) => ({ ...d, appointments: normalizeArray(mine) }));
} catch {
  // ignore
}
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  async function handlePatientRegisterSubmit(e) {
    e.preventDefault();
    const firstName = patientRegister.firstName.trim();
    const lastName = patientRegister.lastName.trim();
    const email = patientRegister.email.trim();
    const phone = patientRegister.phone.trim();
    const dob = patientRegister.dob;
    const password = patientRegister.password;
    const confirmPassword = patientRegister.confirmPassword;

    if (!firstName || !lastName) return showMessage("✗ First and last name are required", "error");
    if (!validateEmail(email)) return showMessage("✗ Invalid email format", "error");
    if (!validatePassword(password)) return showMessage("✗ Password must be at least 6 characters", "error");
    if (password !== confirmPassword) return showMessage("✗ Passwords do not match", "error");

    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          role: "patient",
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth: dob,
          password,
        }),
      });

      if (data?.token) localStorage.setItem("token", data.token);

      const user = normalizeId(data.user || data);
      setLoggedInPatient(user);
      setLoggedInDoctor(null);
      setPage("patient");
      setPatientTab("profile");
      showMessage("✓ Account created successfully!", "success");

      setAllData((d) => ({ ...d, patients: [...d.patients, user] }));
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  async function handleDoctorLoginSubmit(e) {
    e.preventDefault();
    const email = doctorLogin.email.trim();
    const password = doctorLogin.password;

    if (!validateEmail(email)) return showMessage("✗ Invalid email format", "error");

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: "doctor" }),
      });

      if (data?.token) localStorage.setItem("token", data.token);

      const user = normalizeId(data.user || data);
      setLoggedInDoctor(user);
      setLoggedInPatient(null);
      setPage("doctor");
      setDoctorTab("profile");

      const wd = new Set((user.workingDays || "").split(",").filter(Boolean));
      setWorkingDaysDraft(wd);
      setStartTimeDraft(user.startTime || "09:00");
      setEndTimeDraft(user.endTime || "17:00");

      showMessage("✓ Welcome back, Doctor!", "success");

      // load my appointments (uses token + /appointments/mine)
try {
  const mine = await apiFetch(`/appointments/mine`);
  setAllData((d) => ({ ...d, appointments: normalizeArray(mine) }));
} catch {
  // ignore
}
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  async function handleDoctorRegisterSubmit(e) {
    e.preventDefault();
    const firstName = doctorRegister.firstName.trim();
    const lastName = doctorRegister.lastName.trim();
    const email = doctorRegister.email.trim();
    const specialty = doctorRegister.specialty;
    const license = doctorRegister.license.trim();
    const experience = parseInt(doctorRegister.experience, 10);
    const password = doctorRegister.password;
    const confirmPassword = doctorRegister.confirmPassword;

    if (!firstName || !lastName) return showMessage("✗ First and last name are required", "error");
    if (!validateEmail(email)) return showMessage("✗ Invalid email format", "error");
    if (!license) return showMessage("✗ License number is required", "error");
    if (Number.isNaN(experience) || experience < 0) return showMessage("✗ Please enter valid years of experience", "error");
    if (!validatePassword(password)) return showMessage("✗ Password must be at least 6 characters", "error");
    if (password !== confirmPassword) return showMessage("✗ Passwords do not match", "error");

    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          role: "doctor",
          firstName,
          lastName,
          email,
          password,
          specialty,
          licenseNumber: license,
          yearsExperience: experience,
          workingDays: "monday,tuesday,wednesday,thursday,friday",
          startTime: "09:00",
          endTime: "17:00",
        }),
      });

      // some backends won’t auto-login doctors; both cases are ok
      showMessage("✓ Doctor registered!", "success");

      // Try to add doctor to local list (so patient can see them)
      const user = normalizeId(data.user || data);
      setAllData((d) => ({ ...d, doctors: [...d.doctors, user] }));

      setDoctorRegister({
        firstName: "",
        lastName: "",
        email: "",
        specialty: "",
        license: "",
        experience: "",
        password: "",
        confirmPassword: "",
      });
      setDoctorAuthView("login");
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  function handlePatientForgotSubmit(e) {
    e.preventDefault();
    if (!validateEmail(patientForgotEmail.trim())) return showMessage("✗ Invalid email format", "error");
    showMessage("✓ Recovery link sent (demo)", "success");
    setPatientForgotEmail("");
    setTimeout(() => setPatientAuthView("login"), 900);
  }

  function handleDoctorForgotSubmit(e) {
    e.preventDefault();
    if (!validateEmail(doctorForgotEmail.trim())) return showMessage("✗ Invalid email format", "error");
    showMessage("✓ Recovery link sent (demo)", "success");
    setDoctorForgotEmail("");
    setTimeout(() => setDoctorAuthView("login"), 900);
  }

  /**
   * =========================
   * LOGOUT
   * =========================
   */
  function logoutPatient() {
    setLoggedInPatient(null);
    setPage("landing");
    setPatientLogin({ email: "", password: "" });
    localStorage.removeItem("token");
    showMessage("✓ Logged out successfully", "success");
  }

  function logoutDoctor() {
    setLoggedInDoctor(null);
    setPage("landing");
    setDoctorLogin({ email: "", password: "" });
    localStorage.removeItem("token");
    showMessage("✓ Logged out successfully", "success");
  }

  /**
   * =========================
   * PATIENT: upcoming / past
   * =========================
   */
  const patientUpcoming = useMemo(() => {
    if (!currentPatient) return [];
    return (allData.appointments || [])
      .filter((a) => (a.patientId === currentPatient.id || a.patientId === currentPatient._id) && new Date(a.appointmentDate) >= new Date() && a.status !== "cancelled")
      .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
  }, [allData.appointments, currentPatient]);

  const patientPast = useMemo(() => {
    if (!currentPatient) return [];
    return (allData.appointments || [])
      .filter((a) => (a.patientId === currentPatient.id || a.patientId === currentPatient._id) && new Date(a.appointmentDate) < new Date())
      .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
  }, [allData.appointments, currentPatient]);

  const visibleDoctors = useMemo(() => (allData.doctors || []).slice(0, 6), [allData.doctors]);

  /**
   * =========================
   * DOCTOR: appointments
   * =========================
   */
  const doctorAppointments = useMemo(() => {
    if (!currentDoctor) return [];
    return (allData.appointments || []).filter(
      (a) => (a.doctorId === currentDoctor.id || a.doctorId === currentDoctor._id) && a.status !== "cancelled"
    );
  }, [allData.appointments, currentDoctor]);

  /**
   * =========================
   * EDIT PROFILE
   * =========================
   * NOTE: You likely DON'T have routes for this yet.
   * We try common endpoints; if missing, we still update UI locally.
   */
  function openEditPatient() {
    if (!currentPatient) return;
    setPatientEditForm({
      firstName: currentPatient.firstName || "",
      lastName: currentPatient.lastName || "",
      email: currentPatient.email || "",
      phone: currentPatient.phone || "",
      dob: currentPatient.dateOfBirth || "",
      address: currentPatient.address || "",
    });
    setEditPatientOpen(true);
  }

  async function savePatientProfile(e) {
    e.preventDefault();
    if (!currentPatient) return;

    const updated = {
      ...currentPatient,
      firstName: patientEditForm.firstName,
      lastName: patientEditForm.lastName,
      phone: patientEditForm.phone,
      dateOfBirth: patientEditForm.dob,
      address: patientEditForm.address,
    };

    // Try backend update (optional)
    try {
      await apiFetch(`/auth/users/${currentPatient.id}`, {
        method: "PATCH",
        body: JSON.stringify(updated),
      });
    } catch {
      // ignore if route doesn't exist
    }

    setLoggedInPatient(updated);
    setAllData((d) => ({
      ...d,
      patients: d.patients.map((p) => ((p.id || p._id) === updated.id ? updated : p)),
    }));
    setEditPatientOpen(false);
    showMessage("✓ Profile updated!", "success");
  }

  function openEditDoctor() {
    if (!currentDoctor) return;
    setDoctorEditForm({
      firstName: currentDoctor.firstName || "",
      lastName: currentDoctor.lastName || "",
      email: currentDoctor.email || "",
      specialty: currentDoctor.specialty || "",
      license: currentDoctor.licenseNumber || "",
      experience: String(currentDoctor.yearsExperience ?? ""),
      bio: currentDoctor.bio || "",
    });
    setEditDoctorOpen(true);
  }

  async function saveDoctorProfile(e) {
    e.preventDefault();
    if (!currentDoctor) return;

    const updated = {
      ...currentDoctor,
      firstName: doctorEditForm.firstName,
      lastName: doctorEditForm.lastName,
      yearsExperience: parseInt(doctorEditForm.experience || "0", 10),
      bio: doctorEditForm.bio,
    };

    try {
      await apiFetch(`/auth/users/${currentDoctor.id}`, {
        method: "PATCH",
        body: JSON.stringify(updated),
      });
    } catch {
      // ignore if route doesn't exist
    }

    setLoggedInDoctor(updated);
    setAllData((d) => ({
      ...d,
      doctors: d.doctors.map((doc) => ((doc.id || doc._id) === updated.id ? updated : doc)),
    }));
    setEditDoctorOpen(false);
    showMessage("✓ Profile updated!", "success");
  }

  /**
   * =========================
   * DOCTOR AVAILABILITY
   * =========================
   */
  function toggleWorkDay(day) {
    setWorkingDaysDraft((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function saveWorkingHours() {
    if (!currentDoctor) return;

    const updated = {
      ...currentDoctor,
      workingDays: Array.from(workingDaysDraft).join(","),
      startTime: startTimeDraft,
      endTime: endTimeDraft,
    };

    try {
      await apiFetch(`/auth/doctors/${currentDoctor.id}/availability`, {
        method: "PATCH",
        body: JSON.stringify({
          workingDays: updated.workingDays,
          startTime: updated.startTime,
          endTime: updated.endTime,
        }),
      });
    } catch {
      // ignore if route doesn't exist
    }

    setLoggedInDoctor(updated);
    setAllData((d) => ({
      ...d,
      doctors: d.doctors.map((doc) => ((doc.id || doc._id) === updated.id ? updated : doc)),
    }));
    showMessage("✓ Working hours saved!", "success");
  }

  /**
   * =========================
   * DOCTOR DETAILS + BOOKING
   * =========================
   */
  function openDoctorDetails(doctorId) {
    setSelectedDoctorId(doctorId);
    setApptForm({ date: "", time: "", reason: "", notes: "" });
    setDoctorDetailOpen(true);
  }
  function closeDoctorDetails() {
    setDoctorDetailOpen(false);
    setSelectedDoctorId(null);
  }

  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;
    return (allData.doctors || []).find((d) => (d.id || d._id) === selectedDoctorId) || null;
  }, [selectedDoctorId, allData.doctors]);

  const selectedDoctorSlots = useMemo(() => {
    if (!selectedDoctor) return [];
    return generateTimeSlots(selectedDoctor).slice(0, 7);
  }, [selectedDoctor]);

  function selectTimeSlot(date, time) {
    setApptForm((f) => ({ ...f, date, time }));
  }

  async function bookAppointmentSubmit(e) {
    e.preventDefault();
    if (!currentPatient || !selectedDoctor) return;

    const date = apptForm.date;
    const time = apptForm.time;
    const reason = apptForm.reason.trim();
    const notes = apptForm.notes.trim();

    if (!date || !time || !reason) return showMessage("✗ Please fill in all required fields", "error");

    try {
      const created = await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId: currentPatient.id,
          doctorId: selectedDoctor.id,
          appointmentDate: date,
          appointmentTime: time,
          reason,
          notes,
          status: "confirmed",
        }),
      });

      const saved = normalizeId(created.appointment || created);

      setAllData((d) => ({ ...d, appointments: [...d.appointments, saved] }));
      setDoctorDetailOpen(false);
      setPatientTab("upcoming");
      showMessage("✓ Appointment booked successfully!", "success");
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  /**
   * =========================
   * CANCEL / RESCHEDULE
   * =========================
   */
  async function cancelAppointment(apptId) {
    try {
      // try common cancel endpoint
      try {
        await apiFetch(`/appointments/${apptId}/cancel`, { method: "PATCH" });
      } catch {
        // fallback: update status directly if your backend supports PATCH /appointments/:id
        await apiFetch(`/appointments/${apptId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        });
      }

      setAllData((d) => ({
        ...d,
        appointments: d.appointments.map((a) => (a.id === apptId ? { ...a, status: "cancelled" } : a)),
      }));
      showMessage("✓ Appointment cancelled", "success");
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  async function rescheduleAppointment(apptId) {
    const newDate = window.prompt("Enter new date (YYYY-MM-DD):");
    if (!newDate) return;
    const newTime = window.prompt("Enter new time (HH:MM):");
    if (!newTime) return;

    try {
      // try common reschedule endpoint
      try {
        await apiFetch(`/appointments/${apptId}/reschedule`, {
          method: "PATCH",
          body: JSON.stringify({ appointmentDate: newDate, appointmentTime: newTime }),
        });
      } catch {
        // fallback: PATCH directly
        await apiFetch(`/appointments/${apptId}`, {
          method: "PATCH",
          body: JSON.stringify({ appointmentDate: newDate, appointmentTime: newTime }),
        });
      }

      setAllData((d) => ({
        ...d,
        appointments: d.appointments.map((a) =>
          a.id === apptId ? { ...a, appointmentDate: newDate, appointmentTime: newTime } : a
        ),
      }));
      showMessage("✓ Appointment rescheduled!", "success");
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  /**
   * =========================
   * UI
   * =========================
   * This keeps your same structure; only data source changed to MongoDB.
   */
  return (
    <div className="h-full w-full overflow-auto" style={{ position: "relative" }}>
      {/* Glow orbs */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      <div className="glow-orb glow-orb-3" />

      {/* NAV */}
      <nav className="sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 48,
                height: 48,
                background: "linear-gradient(135deg, var(--cyan-bright), var(--teal-accent))",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0a0e27",
                fontWeight: 700,
                fontSize: 24,
                boxShadow: "0 0 20px rgba(0, 217, 255, 0.4)",
              }}
            >
              🏥
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "1.15rem", color: "white", margin: 0 }}>MediCare</p>
              <p style={{ fontSize: "0.75rem", color: "var(--cyan-bright)", margin: 0 }}>Healthcare Platform</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {page === "landing" && (
              <button
                onClick={openAuthSelector}
                className="btn-primary"
                style={{ fontSize: "0.9rem", padding: "10px 24px" }}
              >
                Get Started
              </button>
            )}

            {page === "patient" && (
              <button onClick={logoutPatient} className="btn-secondary" style={{ fontSize: "0.85rem", padding: "10px 20px" }}>
                Logout
              </button>
            )}

            {page === "doctor" && (
              <button onClick={logoutDoctor} className="btn-secondary" style={{ fontSize: "0.85rem", padding: "10px 20px" }}>
                Logout
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* LANDING */}
      {page === "landing" && (
        <div id="landing" className="relative w-full">
          <section style={{ padding: "100px 24px", position: "relative", zIndex: 10 }}>
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="animate-slide-in-left">
                  <p
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--cyan-bright)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: 16,
                    }}
                  >
                    The Future of Healthcare
                  </p>

                  <h1
                    style={{
                      marginBottom: 24,
                      background: "linear-gradient(135deg, #ffffff 0%, var(--cyan-bright) 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Healthcare,<br />
                    Reinvented by AI
                  </h1>

                  <p style={{ fontSize: "1.1rem", marginBottom: 32, lineHeight: 1.8, color: "var(--text-secondary)" }}>
                    Connect with verified doctors, manage your health with AI-powered insights, and receive personalized care—all in one intelligent platform.
                  </p>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 48 }}>
                    <button onClick={openAuthSelector} className="btn-primary">Get Started</button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
                    <div>
                      <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--cyan-bright)", margin: 0 }}>2K+</p>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>Verified Doctors</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--cyan-bright)", margin: 0 }}>99.9%</p>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>Uptime SLA</p>
                    </div>
                  </div>
                </div>

                <div className="animate-slide-in-right" style={{ display: "grid", gap: 16 }}>
                  <div className="glass-card" style={{ padding: 24, borderLeft: "4px solid var(--cyan-bright)" }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Average Response
                    </p>
                    <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--cyan-bright)", margin: 0 }}>2-5 mins</p>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>Get connected to a doctor</p>
                  </div>

                  <div className="glass-card" style={{ padding: 24, borderLeft: "4px solid var(--teal-accent)" }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Patient Satisfaction
                    </p>
                    <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--teal-accent)", margin: 0 }}>98%</p>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>Highly rated by users</p>
                  </div>

                  <div className="glass-card" style={{ padding: 24, borderLeft: "4px solid #00ff88" }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Active Users
                    </p>
                    <p style={{ fontSize: "2rem", fontWeight: 700, color: "#00ff88", margin: 0 }}>50K+</p>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>Monthly active patients</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ROLE SELECTOR MODAL */}
      <div className={`modal-overlay ${authRoleModal ? "show" : ""}`}>
        <div className="glass" style={{ padding: 40, maxWidth: 400, width: "100%", animation: "fadeInUp 0.4s ease-out" }}>
          <h3 style={{ textAlign: "center", marginBottom: 32 }}>Choose Your Role</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <button
              onClick={() => selectRole("patient")}
              className="glass-card"
              style={{ padding: 32, border: "2px solid rgba(0, 217, 255, 0.2)", cursor: "pointer", textAlign: "center" }}
            >
              <p style={{ fontSize: "2rem", margin: "0 0 12px 0" }}>👤</p>
              <h4 style={{ margin: "0 0 8px 0", color: "white" }}>Patient</h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>Book appointments & manage health</p>
            </button>

            <button
              onClick={() => selectRole("doctor")}
              className="glass-card"
              style={{ padding: 32, border: "2px solid rgba(0, 217, 255, 0.2)", cursor: "pointer", textAlign: "center" }}
            >
              <p style={{ fontSize: "2rem", margin: "0 0 12px 0" }}>⚕️</p>
              <h4 style={{ margin: "0 0 8px 0", color: "white" }}>Doctor</h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>Manage patients & availability</p>
            </button>
          </div>

          <button
            onClick={closeAuthSelector}
            style={{
              width: "100%",
              marginTop: 20,
              background: "none",
              border: "1px solid rgba(0, 217, 255, 0.2)",
              color: "var(--text-secondary)",
              padding: 12,
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Back
          </button>
        </div>
      </div>

      {/* AUTH PAGE */}
      {page === "auth" && (
        <div id="auth-section" style={{ padding: "80px 24px", position: "relative", zIndex: 10, background: "rgba(26, 40, 81, 0.3)" }}>
          <div className="max-w-md mx-auto">
            {/* PATIENT AUTH */}
            {activeAuthRole === "patient" && (
              <>
                {patientAuthView === "login" && (
                  <div className="glass" style={{ padding: 40 }}>
                    <div style={{ textAlign: "center", marginBottom: 32 }}>
                      <div style={{ width: 60, height: 60, margin: "0 auto 16px", background: "linear-gradient(135deg, var(--cyan-bright), var(--teal-accent))", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                        👤
                      </div>
                      <h3 style={{ margin: "0 0 8px 0" }}>Patient Login</h3>
                      <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>Access your health dashboard</p>
                    </div>

                    <form onSubmit={handlePatientLoginSubmit}>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 8, fontSize: "0.9rem" }}>Email</label>
                        <input className="input-field" type="email" placeholder="patient@email.com" required value={patientLogin.email} onChange={(e) => setPatientLogin((s) => ({ ...s, email: e.target.value }))} />
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 8, fontSize: "0.9rem" }}>Password</label>
                        <input className="input-field" type="password" placeholder="••••••••" required value={patientLogin.password} onChange={(e) => setPatientLogin((s) => ({ ...s, password: e.target.value }))} />
                      </div>
                      <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>Sign In</button>
                    </form>

                    <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.9rem" }}>
                      <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                        New patient?{" "}
                        <button type="button" onClick={() => setPatientAuthView("register")} style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                          Create account
                        </button>
                      </p>
                      <p style={{ color: "var(--text-secondary)", margin: "12px 0 0 0" }}>
                        Forgot password?{" "}
                        <button type="button" onClick={() => setPatientAuthView("forgot")} style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                          Reset it
                        </button>
                      </p>
                      <p style={{ color: "var(--text-secondary)", margin: "12px 0 0 0" }}>
                        Are you a doctor?{" "}
                        <button type="button" onClick={() => { setActiveAuthRole("doctor"); setDoctorAuthView("login"); }} style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                          Doctor portal
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {patientAuthView === "register" && (
                  <div className="glass" style={{ padding: 40 }}>
                    <div style={{ textAlign: "center", marginBottom: 32 }}>
                      <h3 style={{ margin: "0 0 8px 0" }}>Create Patient Account</h3>
                      <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>Join our healthcare community</p>
                    </div>

                    <form onSubmit={handlePatientRegisterSubmit}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div>
                          <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>First Name</label>
                          <input className="input-field" type="text" placeholder="First" required value={patientRegister.firstName} onChange={(e) => setPatientRegister((s) => ({ ...s, firstName: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Last Name</label>
                          <input className="input-field" type="text" placeholder="Last" required value={patientRegister.lastName} onChange={(e) => setPatientRegister((s) => ({ ...s, lastName: e.target.value }))} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Email</label>
                        <input className="input-field" type="email" placeholder="patient@email.com" required value={patientRegister.email} onChange={(e) => setPatientRegister((s) => ({ ...s, email: e.target.value }))} />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Phone</label>
                        <input className="input-field" type="tel" placeholder="70 000 000" value={patientRegister.phone} onChange={(e) => setPatientRegister((s) => ({ ...s, phone: e.target.value }))} />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Date of Birth</label>
                        <input className="input-field" type="date" value={patientRegister.dob} onChange={(e) => setPatientRegister((s) => ({ ...s, dob: e.target.value }))} />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Password</label>
                        <input className="input-field" type="password" placeholder="••••••••" required value={patientRegister.password} onChange={(e) => setPatientRegister((s) => ({ ...s, password: e.target.value }))} />
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Confirm Password</label>
                        <input className="input-field" type="password" placeholder="••••••••" required value={patientRegister.confirmPassword} onChange={(e) => setPatientRegister((s) => ({ ...s, confirmPassword: e.target.value }))} />
                      </div>

                      <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>Create Account</button>
                    </form>

                    <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 20, fontSize: "0.9rem" }}>
                      Already have an account?{" "}
                      <button type="button" onClick={() => setPatientAuthView("login")} style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                        Login here
                      </button>
                    </p>
                  </div>
                )}

                {patientAuthView === "forgot" && (
                  <div className="glass" style={{ padding: 40 }}>
                    <div style={{ textAlign: "center", marginBottom: 32 }}>
                      <h3 style={{ margin: "0 0 8px 0" }}>Reset Password</h3>
                      <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>We'll send you a recovery link</p>
                    </div>

                    <form onSubmit={handlePatientForgotSubmit}>
                      <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 8, fontSize: "0.9rem" }}>Email</label>
                        <input className="input-field" type="email" placeholder="patient@email.com" required value={patientForgotEmail} onChange={(e) => setPatientForgotEmail(e.target.value)} />
                      </div>
                      <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>Send Recovery Link</button>
                    </form>

                    <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 20, fontSize: "0.9rem" }}>
                      Back to{" "}
                      <button type="button" onClick={() => setPatientAuthView("login")} style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                        login
                      </button>
                    </p>
                  </div>
                )}
              </>
            )}

            {/* DOCTOR AUTH */}
            {activeAuthRole === "doctor" && (
              <>
                {doctorAuthView === "login" && (
                  <div className="glass" style={{ padding: 40 }}>
                    <div style={{ textAlign: "center", marginBottom: 32 }}>
                      <div style={{ width: 60, height: 60, margin: "0 auto 16px", background: "linear-gradient(135deg, var(--cyan-bright), var(--teal-accent))", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                        ⚕️
                      </div>
                      <h3 style={{ margin: "0 0 8px 0" }}>Physician Login</h3>
                      <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>Provider credential portal</p>
                    </div>

                    <form onSubmit={handleDoctorLoginSubmit}>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 8, fontSize: "0.9rem" }}>Email</label>
                        <input className="input-field" type="email" placeholder="doctor@medicare.io" required value={doctorLogin.email} onChange={(e) => setDoctorLogin((s) => ({ ...s, email: e.target.value }))} />
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 8, fontSize: "0.9rem" }}>Password</label>
                        <input className="input-field" type="password" placeholder="••••••••" required value={doctorLogin.password} onChange={(e) => setDoctorLogin((s) => ({ ...s, password: e.target.value }))} />
                      </div>
                      <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>Sign In</button>
                    </form>

                    <div style={{ textAlign: "center", marginTop: 24, display: "flex", flexDirection: "column", gap: 12, fontSize: "0.9rem" }}>
                      <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                        New provider?{" "}
                        <button type="button" onClick={() => setDoctorAuthView("register")} style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                          Join network
                        </button>
                      </p>
                      <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                        Forgot password?{" "}
                        <button type="button" onClick={() => setDoctorAuthView("forgot")} style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                          Reset it
                        </button>
                      </p>
                      <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                        Are you a patient?{" "}
                        <button type="button" onClick={() => { setActiveAuthRole("patient"); setPatientAuthView("login"); }} style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                          Patient portal
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {doctorAuthView === "register" && (
                  <div className="glass" style={{ padding: 40 }}>
                    <div style={{ textAlign: "center", marginBottom: 32 }}>
                      <h3 style={{ margin: "0 0 8px 0" }}>Join Our Network</h3>
                      <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>Provider credentialing application</p>
                    </div>

                    <form onSubmit={handleDoctorRegisterSubmit}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div>
                          <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>First Name</label>
                          <input className="input-field" type="text" placeholder="First" required value={doctorRegister.firstName} onChange={(e) => setDoctorRegister((s) => ({ ...s, firstName: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Last Name</label>
                          <input className="input-field" type="text" placeholder="Last" required value={doctorRegister.lastName} onChange={(e) => setDoctorRegister((s) => ({ ...s, lastName: e.target.value }))} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Email</label>
                        <input className="input-field" type="email" placeholder="doctor@email.com" required value={doctorRegister.email} onChange={(e) => setDoctorRegister((s) => ({ ...s, email: e.target.value }))} />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Specialty</label>
                        <select className="input-field" required value={doctorRegister.specialty} onChange={(e) => setDoctorRegister((s) => ({ ...s, specialty: e.target.value }))}>
                          <option value="">Select Specialty</option>
                          <option value="cardiology">Cardiology</option>
                          <option value="dermatology">Dermatology</option>
                          <option value="neurology">Neurology</option>
                          <option value="orthopedics">Orthopedics</option>
                          <option value="pediatrics">Pediatrics</option>
                          <option value="general">General Practice</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>License Number</label>
                        <input className="input-field" type="text" placeholder="MED-XXXXX" required value={doctorRegister.license} onChange={(e) => setDoctorRegister((s) => ({ ...s, license: e.target.value }))} />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Years of Experience</label>
                        <input className="input-field" type="number" placeholder="0" min="0" max="70" required value={doctorRegister.experience} onChange={(e) => setDoctorRegister((s) => ({ ...s, experience: e.target.value }))} />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Password</label>
                        <input className="input-field" type="password" placeholder="••••••••" required value={doctorRegister.password} onChange={(e) => setDoctorRegister((s) => ({ ...s, password: e.target.value }))} />
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Confirm Password</label>
                        <input className="input-field" type="password" placeholder="••••••••" required value={doctorRegister.confirmPassword} onChange={(e) => setDoctorRegister((s) => ({ ...s, confirmPassword: e.target.value }))} />
                      </div>

                      <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>Submit Application</button>
                    </form>

                    <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 20, fontSize: "0.9rem" }}>
                      Have credentials?{" "}
                      <button type="button" onClick={() => setDoctorAuthView("login")} style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                        Login here
                      </button>
                    </p>
                  </div>
                )}

                {doctorAuthView === "forgot" && (
                  <div className="glass" style={{ padding: 40 }}>
                    <div style={{ textAlign: "center", marginBottom: 32 }}>
                      <h3 style={{ margin: "0 0 8px 0" }}>Reset Password</h3>
                      <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>We'll send you a recovery link</p>
                    </div>

                    <form onSubmit={handleDoctorForgotSubmit}>
                      <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 8, fontSize: "0.9rem" }}>Email</label>
                        <input className="input-field" type="email" placeholder="doctor@email.com" required value={doctorForgotEmail} onChange={(e) => setDoctorForgotEmail(e.target.value)} />
                      </div>
                      <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>Send Recovery Link</button>
                    </form>

                    <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 20, fontSize: "0.9rem" }}>
                      Back to{" "}
                      <button type="button" onClick={() => setDoctorAuthView("login")} style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                        login
                      </button>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* PATIENT DASHBOARD */}
      {page === "patient" && currentPatient && (
        <div className="w-full h-full flex flex-col">
          <header
            style={{
              background: "linear-gradient(135deg, rgba(26, 40, 81, 0.8), rgba(15, 23, 42, 0.6))",
              borderBottom: "1px solid rgba(0, 217, 255, 0.1)",
              padding: "20px 32px",
              backdropFilter: "blur(15px)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1400, margin: "0 auto" }}>
              <h2 style={{ margin: 0, fontSize: "1.75rem" }}>Patient Dashboard</h2>
              <button onClick={logoutPatient} className="btn-secondary" style={{ fontSize: "0.85rem", padding: "10px 20px" }}>
                Logout
              </button>
            </div>
          </header>

          <div className="tab-switch" style={{ maxWidth: 1400, margin: "32px auto", padding: "0 32px", width: "calc(100% - 64px)" }}>
            <button className={`tab-btn ${patientTab === "profile" ? "active" : ""}`} onClick={() => setPatientTab("profile")}>👤 Profile</button>
            <button className={`tab-btn ${patientTab === "book" ? "active" : ""}`} onClick={() => setPatientTab("book")}>📅 Book</button>
            <button className={`tab-btn ${patientTab === "upcoming" ? "active" : ""}`} onClick={() => setPatientTab("upcoming")}>📆 Upcoming</button>
            <button className={`tab-btn ${patientTab === "past" ? "active" : ""}`} onClick={() => setPatientTab("past")}>📋 History</button>
          </div>

          <main className="flex-1 overflow-auto" style={{ padding: "0 32px 32px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
            {patientTab === "profile" && (
              <div>
                <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                    <h3 style={{ margin: 0 }}>Your Profile</h3>
                    <button onClick={openEditPatient} className="btn-secondary" style={{ fontSize: "0.85rem" }}>Edit Profile</button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
                    <div>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 8px 0" }}>Full Name</p>
                      <p style={{ color: "white", fontWeight: 600, margin: 0, fontSize: "1.1rem" }}>
                        {currentPatient.firstName} {currentPatient.lastName}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 8px 0" }}>Email</p>
                      <p style={{ color: "white", fontWeight: 600, margin: 0 }}>{currentPatient.email}</p>
                    </div>
                    <div>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 8px 0" }}>Phone</p>
                      <p style={{ color: "white", fontWeight: 600, margin: 0 }}>{currentPatient.phone || "Not set"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {patientTab === "book" && (
              <div className="glass-card" style={{ padding: 32 }}>
                <h3 style={{ marginTop: 0, marginBottom: 24 }}>Book an Appointment</h3>

                {visibleDoctors.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>
                    No doctors loaded. If you don’t have a doctors endpoint yet, add one in <b>routes/auth.js</b> (list users with role="doctor").
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
                    {visibleDoctors.map((doc) => (
                      <div key={doc.id} className="glass-card" style={{ padding: 24, cursor: "pointer" }} onClick={() => openDoctorDetails(doc.id)}>
                        <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚕️</div>
                        <h4 style={{ margin: "0 0 8px 0", color: "white" }}>Dr. {doc.lastName}</h4>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 12px 0" }}>{doc.specialty || "specialty"}</p>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{doc.yearsExperience ?? 0}y exp.</span>
                        </div>
                        <button
                          className="btn-primary"
                          style={{ width: "100%", padding: 10, fontSize: "0.9rem" }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            openDoctorDetails(doc.id);
                          }}
                        >
                          Book Appointment
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {patientTab === "upcoming" && (
              <div className="glass-card" style={{ padding: 32 }}>
                <h3 style={{ marginTop: 0, marginBottom: 24 }}>Upcoming Appointments</h3>
                <div style={{ display: "grid", gap: 16 }}>
                  {patientUpcoming.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)" }}>No upcoming appointments</p>
                  ) : (
                    patientUpcoming.map((appt) => {
                      const doc = (allData.doctors || []).find((d) => d.id === appt.doctorId);
                      return (
                        <div key={appt.id} className="glass-card" style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontWeight: 600, margin: 0, color: "white" }}>Dr. {doc?.lastName || "Unknown"}</p>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "4px 0" }}>
                              📅 {new Date(appt.appointmentDate).toLocaleDateString()} at {appt.appointmentTime}
                            </p>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "4px 0" }}>{appt.reason}</p>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => rescheduleAppointment(appt.id)} className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                              Reschedule
                            </button>
                            <button onClick={() => cancelAppointment(appt.id)} className="btn-danger" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {patientTab === "past" && (
              <div className="glass-card" style={{ padding: 32 }}>
                <h3 style={{ marginTop: 0, marginBottom: 24 }}>Appointment History</h3>
                <div style={{ display: "grid", gap: 16 }}>
                  {patientPast.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)" }}>No past appointments</p>
                  ) : (
                    patientPast.map((appt) => {
                      const doc = (allData.doctors || []).find((d) => d.id === appt.doctorId);
                      return (
                        <div key={appt.id} className="glass-card" style={{ padding: 20 }}>
                          <p style={{ fontWeight: 600, margin: 0, color: "white" }}>Dr. {doc?.lastName || "Unknown"}</p>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "4px 0" }}>
                            📅 {new Date(appt.appointmentDate).toLocaleDateString()} at {appt.appointmentTime}
                          </p>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "4px 0" }}>{appt.reason}</p>
                          {appt.notes ? (
                            <p style={{ color: "var(--cyan-bright)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
                              Notes: {appt.notes}
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* DOCTOR DASHBOARD */}
      {page === "doctor" && currentDoctor && (
        <div className="w-full h-full flex flex-col">
          <header
            style={{
              background: "linear-gradient(135deg, rgba(26, 40, 81, 0.8), rgba(15, 23, 42, 0.6))",
              borderBottom: "1px solid rgba(0, 217, 255, 0.1)",
              padding: "20px 32px",
              backdropFilter: "blur(15px)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1400, margin: "0 auto" }}>
              <h2 style={{ margin: 0, fontSize: "1.75rem" }}>Doctor Dashboard</h2>
              <button onClick={logoutDoctor} className="btn-secondary" style={{ fontSize: "0.85rem", padding: "10px 20px" }}>
                Logout
              </button>
            </div>
          </header>

          <div className="tab-switch" style={{ maxWidth: 1400, margin: "32px auto", padding: "0 32px", width: "calc(100% - 64px)" }}>
            <button className={`tab-btn ${doctorTab === "profile" ? "active" : ""}`} onClick={() => setDoctorTab("profile")}>👤 Profile</button>
            <button className={`tab-btn ${doctorTab === "availability" ? "active" : ""}`} onClick={() => setDoctorTab("availability")}>⏰ Availability</button>
            <button className={`tab-btn ${doctorTab === "appointments" ? "active" : ""}`} onClick={() => setDoctorTab("appointments")}>📅 Appointments</button>
          </div>

          <main className="flex-1 overflow-auto" style={{ padding: "0 32px 32px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
            {doctorTab === "profile" && (
              <div className="glass-card" style={{ padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                  <h3 style={{ margin: 0 }}>Your Profile</h3>
                  <button onClick={openEditDoctor} className="btn-secondary" style={{ fontSize: "0.85rem" }}>Edit Profile</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
                  <div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 8px 0" }}>Full Name</p>
                    <p style={{ color: "white", fontWeight: 600, margin: 0, fontSize: "1.1rem" }}>
                      Dr. {currentDoctor.firstName} {currentDoctor.lastName}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 8px 0" }}>Specialty</p>
                    <p style={{ color: "white", fontWeight: 600, margin: 0 }}>{currentDoctor.specialty || "N/A"}</p>
                  </div>
                  <div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 8px 0" }}>License</p>
                    <p style={{ color: "white", fontWeight: 600, margin: 0 }}>{currentDoctor.licenseNumber || "N/A"}</p>
                  </div>
                </div>
              </div>
            )}

            {doctorTab === "availability" && (
              <div className="glass-card" style={{ padding: 32 }}>
                <h3 style={{ marginTop: 0, marginBottom: 24 }}>Set Your Working Hours</h3>

                <div style={{ display: "grid", gap: 16 }}>
                  {[
                    ["Monday", "monday"],
                    ["Tuesday", "tuesday"],
                    ["Wednesday", "wednesday"],
                    ["Thursday", "thursday"],
                    ["Friday", "friday"],
                    ["Saturday", "saturday"],
                    ["Sunday", "sunday"],
                  ].map(([label, value]) => (
                    <div
                      key={value}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr 1fr 1fr",
                        gap: 12,
                        alignItems: "center",
                        padding: 16,
                        background: "rgba(0, 217, 255, 0.05)",
                        borderRadius: 8,
                      }}
                    >
                      <input type="checkbox" className="checkbox-custom" checked={workingDaysDraft.has(value)} onChange={() => toggleWorkDay(value)} />
                      <label style={{ color: "white", fontWeight: 500, margin: 0 }}>{label}</label>
                      <input type="time" className="input-field" style={{ padding: 8 }} value={startTimeDraft} onChange={(e) => setStartTimeDraft(e.target.value)} />
                      <input type="time" className="input-field" style={{ padding: 8 }} value={endTimeDraft} onChange={(e) => setEndTimeDraft(e.target.value)} />
                    </div>
                  ))}
                </div>

                <button onClick={saveWorkingHours} className="btn-primary" style={{ marginTop: 24, padding: "14px 32px" }}>
                  Save Working Hours
                </button>

                <div style={{ borderTop: "1px solid rgba(0, 217, 255, 0.1)", paddingTop: 32, marginTop: 32 }}>
                  <h3 style={{ marginTop: 0 }}>Available Time Slots (Preview)</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginTop: 16 }}>
                    {doctorSlots.length === 0 ? (
                      <p style={{ color: "var(--text-secondary)" }}>No available slots configured.</p>
                    ) : (
                      doctorSlots.slice(0, 14).map((slot) => {
                        const isBooked = (allData.appointments || []).some(
                          (a) => (a.doctorId === currentDoctor.id) && a.appointmentDate === slot.date && a.appointmentTime === slot.time && a.status !== "cancelled"
                        );
                        return (
                          <div
                            key={`${slot.date}_${slot.time}`}
                            className="glass-card"
                            style={{ padding: 16, textAlign: "center", border: `1px solid ${isBooked ? "rgba(239, 68, 68, 0.3)" : "rgba(0, 217, 255, 0.2)"}` }}
                          >
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>{new Date(slot.date).toLocaleDateString()}</p>
                            <p style={{ color: "white", fontWeight: 600, margin: "4px 0" }}>{slot.time}</p>
                            <span className={`status-badge ${isBooked ? "status-busy" : "status-available"}`}>{isBooked ? "Booked" : "Available"}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {doctorTab === "appointments" && (
              <div className="glass-card" style={{ padding: 32 }}>
                <h3 style={{ marginTop: 0, marginBottom: 24 }}>Patient Appointments</h3>

                <div style={{ display: "grid", gap: 16 }}>
                  {doctorAppointments.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)" }}>No appointments scheduled</p>
                  ) : (
                    doctorAppointments.map((appt) => {
                      const patient = (allData.patients || []).find((p) => p.id === appt.patientId);
                      const isUpcoming = new Date(appt.appointmentDate) >= new Date();
                      return (
                        <div key={appt.id} className="glass-card" style={{ padding: 20, borderLeft: `4px solid ${isUpcoming ? "var(--cyan-bright)" : "var(--text-secondary)"}` }}>
                          <p style={{ fontWeight: 600, margin: 0, color: "white" }}>
                            {patient?.firstName || "Patient"} {patient?.lastName || ""}
                          </p>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "4px 0" }}>
                            📅 {new Date(appt.appointmentDate).toLocaleDateString()} at {appt.appointmentTime}
                          </p>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "4px 0" }}>Reason: {appt.reason}</p>
                          <p style={{ color: "var(--cyan-bright)", fontSize: "0.9rem", margin: "4px 0", textTransform: "uppercase", fontWeight: 600 }}>
                            {isUpcoming ? "Upcoming" : "Completed"}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* EDIT PATIENT MODAL */}
      <div className={`modal-overlay ${editPatientOpen ? "show" : ""}`} onClick={() => setEditPatientOpen(false)}>
        <div className="glass" onClick={(e) => e.stopPropagation()} style={{ padding: 40, maxWidth: 500, width: "100%", animation: "fadeInUp 0.4s ease-out", maxHeight: "90vh", overflowY: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Update Your Profile</h3>
          <form onSubmit={savePatientProfile}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>First Name</label>
                <input className="input-field" required value={patientEditForm.firstName} onChange={(e) => setPatientEditForm((s) => ({ ...s, firstName: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Last Name</label>
                <input className="input-field" required value={patientEditForm.lastName} onChange={(e) => setPatientEditForm((s) => ({ ...s, lastName: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Email</label>
              <input className="input-field" value={patientEditForm.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Phone</label>
              <input className="input-field" value={patientEditForm.phone} onChange={(e) => setPatientEditForm((s) => ({ ...s, phone: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Date of Birth</label>
              <input type="date" className="input-field" value={patientEditForm.dob} onChange={(e) => setPatientEditForm((s) => ({ ...s, dob: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Address</label>
              <input className="input-field" placeholder="Street address" value={patientEditForm.address} onChange={(e) => setPatientEditForm((s) => ({ ...s, address: e.target.value }))} />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, padding: 14, fontWeight: 600 }}>Save Changes</button>
              <button type="button" className="btn-secondary" style={{ flex: 1, padding: 14, fontWeight: 600 }} onClick={() => setEditPatientOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>

      {/* EDIT DOCTOR MODAL */}
      <div className={`modal-overlay ${editDoctorOpen ? "show" : ""}`} onClick={() => setEditDoctorOpen(false)}>
        <div className="glass" onClick={(e) => e.stopPropagation()} style={{ padding: 40, maxWidth: 500, width: "100%", animation: "fadeInUp 0.4s ease-out", maxHeight: "90vh", overflowY: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Update Your Profile</h3>
          <form onSubmit={saveDoctorProfile}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>First Name</label>
                <input className="input-field" required value={doctorEditForm.firstName} onChange={(e) => setDoctorEditForm((s) => ({ ...s, firstName: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Last Name</label>
                <input className="input-field" required value={doctorEditForm.lastName} onChange={(e) => setDoctorEditForm((s) => ({ ...s, lastName: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Email</label>
              <input className="input-field" value={doctorEditForm.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Years of Experience</label>
              <input className="input-field" type="number" required value={doctorEditForm.experience} onChange={(e) => setDoctorEditForm((s) => ({ ...s, experience: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Bio</label>
              <textarea className="input-field" rows="4" style={{ resize: "none" }} value={doctorEditForm.bio} onChange={(e) => setDoctorEditForm((s) => ({ ...s, bio: e.target.value }))} />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, padding: 14, fontWeight: 600 }}>Save Changes</button>
              <button type="button" className="btn-secondary" style={{ flex: 1, padding: 14, fontWeight: 600 }} onClick={() => setEditDoctorOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>

      {/* DOCTOR DETAIL MODAL */}
      <div className={`modal-overlay ${doctorDetailOpen ? "show" : ""}`} onClick={closeDoctorDetails}>
        <div className="glass" onClick={(e) => e.stopPropagation()} style={{ padding: 40, maxWidth: 600, width: "100%", animation: "fadeInUp 0.4s ease-out", maxHeight: "90vh", overflowY: "auto" }}>
          {!selectedDoctor ? (
            <p style={{ color: "var(--text-secondary)" }}>Doctor not found</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h3 style={{ margin: "0 0 8px 0" }}>Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</h3>
                  <p style={{ color: "var(--cyan-bright)", fontWeight: 600, margin: 0 }}>{selectedDoctor.specialty || "specialty"}</p>
                </div>
                <button onClick={closeDoctorDetails} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
              </div>

              <h4 style={{ margin: "0 0 16px 0", color: "white" }}>Available Time Slots</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 24 }}>
                {selectedDoctorSlots.map((slot) => (
                  <button key={`${slot.date}_${slot.time}`} onClick={() => selectTimeSlot(slot.date, slot.time)} className="btn-primary" style={{ padding: 10, fontSize: "0.85rem" }}>
                    {slot.time}
                  </button>
                ))}
              </div>

              <form onSubmit={bookAppointmentSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Select Date</label>
                  <input type="date" className="input-field" required min={todayISO()} value={apptForm.date} onChange={(e) => setApptForm((f) => ({ ...f, date: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Select Time</label>
                  <input type="time" className="input-field" required value={apptForm.time} onChange={(e) => setApptForm((f) => ({ ...f, time: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Reason for Visit</label>
                  <input className="input-field" placeholder="e.g., Check-up, Consultation" required value={apptForm.reason} onChange={(e) => setApptForm((f) => ({ ...f, reason: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>Additional Notes (optional)</label>
                  <textarea className="input-field" rows="3" style={{ resize: "none" }} value={apptForm.notes} onChange={(e) => setApptForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, padding: 14, fontWeight: 600 }}>Book Appointment</button>
                  <button type="button" onClick={closeDoctorDetails} className="btn-secondary" style={{ flex: 1, padding: 14, fontWeight: 600 }}>Cancel</button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}