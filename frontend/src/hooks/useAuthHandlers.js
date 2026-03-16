import { apiFetch } from "../API/http";
import { validateEmail, validatePassword } from "../utils/validators";
import { normalizeId, normalizeArray } from "../utils/normalize";

export default function useAuthHandlers({
  patientLogin,
  doctorLogin,
  patientRegister,
  doctorRegister,
  patientForgotEmail,
  doctorForgotEmail,
  setLoggedInPatient,
  setLoggedInDoctor,
  setPage,
  setPatientTab,
  setDoctorTab,
  setAllData,
  setWorkingDaysDraft,
  setStartTimeDraft,
  setEndTimeDraft,
  setDoctorRegister,
  setDoctorAuthView,
  setPatientForgotEmail,
  setDoctorForgotEmail,
  setPatientAuthView,
  setPatientLogin,
  setDoctorLogin,
  resetReviews,
  fetchReviewsForUser,
  showMessage,
}) {
  async function handlePatientLoginSubmit(e) {
    e.preventDefault();

    const email = patientLogin.email.trim();
    const password = patientLogin.password;

    if (!validateEmail(email)) {
      return showMessage("✗ Invalid email format", "error");
    }

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: "patient" }),
      });

      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      const user = normalizeId(data.user || data);

      setLoggedInPatient(user);
      setLoggedInDoctor(null);
      setPage("patient");
      setPatientTab("profile");

      showMessage("✓ Welcome back!", "success");

      fetchReviewsForUser(user.id || user._id, "patient");

      try {
        const mine = await apiFetch("/appointments/mine");
        setAllData((prev) => ({
          ...prev,
          appointments: normalizeArray(mine),
        }));
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

    if (!firstName || !lastName) {
      return showMessage("✗ First and last name are required", "error");
    }
    if (!validateEmail(email)) {
      return showMessage("✗ Invalid email format", "error");
    }
    if (!validatePassword(password)) {
      return showMessage("✗ Password must be at least 6 characters", "error");
    }
    if (password !== confirmPassword) {
      return showMessage("✗ Passwords do not match", "error");
    }

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

      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      const user = normalizeId(data.user || data);

      setLoggedInPatient(user);
      setLoggedInDoctor(null);
      setPage("patient");
      setPatientTab("profile");

      setAllData((prev) => ({
        ...prev,
        patients: [...prev.patients, user],
      }));

      showMessage("✓ Account created successfully!", "success");
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  async function handleDoctorLoginSubmit(e) {
    e.preventDefault();

    const email = doctorLogin.email.trim();
    const password = doctorLogin.password;

    if (!validateEmail(email)) {
      return showMessage("✗ Invalid email format", "error");
    }

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: "doctor" }),
      });

      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

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

      fetchReviewsForUser(user.id || user._id, "doctor");

      try {
        const mine = await apiFetch("/appointments/mine");
        setAllData((prev) => ({
          ...prev,
          appointments: normalizeArray(mine),
        }));
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

    if (!firstName || !lastName) {
      return showMessage("✗ First and last name are required", "error");
    }
    if (!validateEmail(email)) {
      return showMessage("✗ Invalid email format", "error");
    }
    if (!license) {
      return showMessage("✗ License number is required", "error");
    }
    if (Number.isNaN(experience) || experience < 0) {
      return showMessage("✗ Please enter valid years of experience", "error");
    }
    if (!validatePassword(password)) {
      return showMessage("✗ Password must be at least 6 characters", "error");
    }
    if (password !== confirmPassword) {
      return showMessage("✗ Passwords do not match", "error");
    }

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

      const user = normalizeId(data.user || data);

      setAllData((prev) => ({
        ...prev,
        doctors: [...prev.doctors, user],
      }));

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
      showMessage("✓ Doctor registered!", "success");
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  function handlePatientForgotSubmit(e) {
    e.preventDefault();

    if (!validateEmail(patientForgotEmail.trim())) {
      return showMessage("✗ Invalid email format", "error");
    }

    showMessage("✓ Recovery link sent (demo)", "success");
    setPatientForgotEmail("");
    setTimeout(() => setPatientAuthView("login"), 900);
  }

  function handleDoctorForgotSubmit(e) {
    e.preventDefault();

    if (!validateEmail(doctorForgotEmail.trim())) {
      return showMessage("✗ Invalid email format", "error");
    }

    showMessage("✓ Recovery link sent (demo)", "success");
    setDoctorForgotEmail("");
    setTimeout(() => setDoctorAuthView("login"), 900);
  }

  function logoutPatient() {
    resetReviews();
    setLoggedInPatient(null);
    setPage("landing");
    setPatientLogin({ email: "", password: "" });
    localStorage.removeItem("token");
    showMessage("✓ Logged out successfully", "success");
  }

  function logoutDoctor() {
    resetReviews();
    setLoggedInDoctor(null);
    setPage("landing");
    setDoctorLogin({ email: "", password: "" });
    localStorage.removeItem("token");
    showMessage("✓ Logged out successfully", "success");
  }

  return {
    handlePatientLoginSubmit,
    handlePatientRegisterSubmit,
    handleDoctorLoginSubmit,
    handleDoctorRegisterSubmit,
    handlePatientForgotSubmit,
    handleDoctorForgotSubmit,
    logoutPatient,
    logoutDoctor,
  };
}