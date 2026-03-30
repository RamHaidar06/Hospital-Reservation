import { apiFetch } from "../API/http";
import { validateEmail, validatePassword } from "../utils/validators";
import { normalizeId, normalizeArray } from "../utils/normalize";

function buildTrustedDeviceKey(email, role) {
  return `trustedOtp:${String(role || "").toLowerCase()}:${String(email || "").trim().toLowerCase()}`;
}

function getTrustedDeviceToken(email, role) {
  const key = buildTrustedDeviceKey(email, role);
  const raw = String(localStorage.getItem(key) || "").trim();
  // Migrate from old JSON marker format to token-only format.
  if (raw.startsWith("{") && raw.endsWith("}")) {
    localStorage.removeItem(key);
    return "";
  }
  return raw;
}

function setTrustedDeviceToken(email, role, token) {
  const key = buildTrustedDeviceKey(email, role);
  localStorage.setItem(key, String(token || ""));
}

function clearTrustedDeviceToken(email, role) {
  const key = buildTrustedDeviceKey(email, role);
  localStorage.removeItem(key);
}

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
  // OTP handlers
  setAwaitingOTP,
  setOtpEmail,
  setOtpUserRole,
  setOtpExpiresIn,
  setOtpRememberDeviceWanted,
  otpUserRole,
}) {
  //============================================================
  // HELPER: Complete login after OTP verification
  //============================================================
  async function completeLogin(token, user, isDoctor) {
    if (token) {
      localStorage.setItem("token", token);
    }

    const normalizedUser = normalizeId(user);

    if (isDoctor) {
      setLoggedInDoctor(normalizedUser);
      setLoggedInPatient(null);
      setPage("doctor");
      setDoctorTab("profile");

      const wd = new Set((normalizedUser.workingDays || "").split(",").filter(Boolean));
      setWorkingDaysDraft(wd);
      setStartTimeDraft(normalizedUser.startTime || "09:00");
      setEndTimeDraft(normalizedUser.endTime || "17:00");

      showMessage("✓ Welcome back, Doctor!", "success");
      fetchReviewsForUser(normalizedUser.id || normalizedUser._id, "doctor");
    } else {
      setLoggedInPatient(normalizedUser);
      setLoggedInDoctor(null);
      setPage("patient");
      setPatientTab("profile");

      showMessage("✓ Welcome back!", "success");
      fetchReviewsForUser(normalizedUser.id || normalizedUser._id, "patient");
    }

    try {
      const mine = await apiFetch("/appointments/mine");
      setAllData((prev) => ({
        ...prev,
        appointments: normalizeArray(mine),
      }));
    } catch {
      // ignore
    }
  }

  //============================================================
  // LOGIN WITH OTP HANDLERS
  //============================================================

  async function loginWithOtpFallback(email, password, role) {
    const trustedDeviceToken = getTrustedDeviceToken(email, role);

    try {
      return await apiFetch("/auth/login-with-otp", {
        method: "POST",
        body: JSON.stringify({ email, password, role, trustedDeviceToken }),
      });
    } catch (err) {
      // Backward compatibility: if OTP route is unavailable, use legacy login route.
      if (String(err?.message || "").includes("(404)")) {
        const legacy = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password, role }),
        });
        return { ...legacy, requiresOTP: false };
      }
      throw err;
    }
  }

  async function handlePatientLoginSubmit(e) {
    e.preventDefault();

    const email = patientLogin.email.trim();
    const password = patientLogin.password;
    const rememberMe = !!patientLogin.rememberMe;

    if (!validateEmail(email)) {
      return showMessage("✗ Invalid email format", "error");
    }

    try {
      // Step 1: Validate credentials and send OTP
      const data = await loginWithOtpFallback(email, password, "patient");

      if (data.requiresOTP) {
        // Step 2: Show OTP verification screen
        setOtpEmail(email);
        setOtpUserRole("patient");
        setOtpExpiresIn(data.expiresIn || 600);
        setOtpRememberDeviceWanted(rememberMe);
        setAwaitingOTP(true);
        setPatientAuthView("otp");
        showMessage("✓ OTP sent to your email. Please verify.", "success");
      } else if (data?.token && data?.user) {
        await completeLogin(data.token, data.user, false);
        setPatientLogin({ email: "", password: "", rememberMe: false });
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
        await completeLogin(data.token, data.user || data, false);

        setPatientRegister({
          firstName: "", lastName: "", email: "", phone: "", dob: "", password: "", confirmPassword: "",
        });

        setAllData((prev) => ({
          ...prev,
          patients: [...prev.patients, normalizeId(data.user || data)],
        }));

        showMessage("✓ Account created successfully!", "success");
      }
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  async function handleDoctorLoginSubmit(e) {
    e.preventDefault();

    const email = doctorLogin.email.trim();
    const password = doctorLogin.password;
    const rememberMe = !!doctorLogin.rememberMe;

    if (!validateEmail(email)) {
      return showMessage("✗ Invalid email format", "error");
    }

    try {
      // Step 1: Validate credentials and send OTP
      const data = await loginWithOtpFallback(email, password, "doctor");

      if (data.requiresOTP) {
        // Step 2: Show OTP verification screen
        setOtpEmail(email);
        setOtpUserRole("doctor");
        setOtpExpiresIn(data.expiresIn || 600);
        setOtpRememberDeviceWanted(rememberMe);
        setAwaitingOTP(true);
        setDoctorAuthView("otp");
        showMessage("✓ OTP sent to your email. Please verify.", "success");
      } else if (data?.token && data?.user) {
        await completeLogin(data.token, data.user, true);
        setDoctorLogin({ email: "", password: "", rememberMe: false });
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
      showMessage("✓ Doctor registered! Please log in.", "success");
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  async function handleOTPVerificationSuccess(data, options = {}) {
    // Called after OTP is verified successfully
    const isDoctor = otpUserRole === "doctor";

    if (options.rememberDevice && data?.trustedDeviceToken) {
      setTrustedDeviceToken(options.email || "", options.role || otpUserRole, data.trustedDeviceToken);
    } else {
      clearTrustedDeviceToken(options.email || "", options.role || otpUserRole);
    }

    await completeLogin(data.token, data.user, isDoctor);

    // Reset login form
    if (isDoctor) {
      setDoctorLogin({ email: "", password: "", rememberMe: false });
      setDoctorAuthView("login");
    } else {
      setPatientLogin({ email: "", password: "", rememberMe: false });
      setPatientAuthView("login");
    }

    setAwaitingOTP(false);
    setOtpEmail("");
    setOtpRememberDeviceWanted(false);
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
    setPatientLogin({ email: "", password: "", rememberMe: false });
    localStorage.removeItem("token");
    showMessage("✓ Logged out successfully", "success");
  }

  function logoutDoctor() {
    resetReviews();
    setLoggedInDoctor(null);
    setPage("landing");
    setDoctorLogin({ email: "", password: "", rememberMe: false });
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
    handleOTPVerificationSuccess,
    logoutPatient,
    logoutDoctor,
  };
}