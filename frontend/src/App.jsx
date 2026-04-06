import React, { useState, useMemo, useCallback } from "react";
import "./App.css";

import AuthPage    from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import OTPVerification from "./components/Auth/OTPVerification";

import Toast             from "./components/Toast";
import RoleSelectorModal from "./components/Auth/RoleSelectorModal";
import AppointmentChatbot from "./components/AppointmentChatbot";

import { todayISO }          from "./utils/date";
import { generateTimeSlots } from "./utils/slots";

import PatientDashboard from "./components/dashboards/PatientDashboard";
import DoctorDashboard  from "./components/dashboards/DoctorDashboard";

import EditPatientModal  from "./components/modals/EditPatientModal";
import EditDoctorModal   from "./components/modals/EditDoctorModal";
import DoctorDetailModal from "./components/modals/DoctorDetailModal";

import useToast              from "./hooks/useToast";
import useDashboardData      from "./hooks/useDashboardData";
import useAppointmentActions from "./hooks/useAppointmentActions";
import useAuthHandlers       from "./hooks/useAuthHandlers";
import useProfileActions     from "./hooks/useProfileActions";
import useDoctorAvailability from "./hooks/useDoctorAvailability";
import useAppBootstrap       from "./hooks/useAppBootstrap";
import useSessionReviews     from "./hooks/useSessionReviews";
import { apiFetch }          from "./API/http";
import { normalizeId }       from "./utils/normalize";

export default function App() {
  const [allData, setAllData] = useState({ patients: [], doctors: [], appointments: [] });

  const [loggedInPatient, setLoggedInPatient] = useState(null);
  const [loggedInDoctor,  setLoggedInDoctor]  = useState(null);

  const [page,          setPage]          = useState("landing");
  const [authRoleModal, setAuthRoleModal] = useState(false);

  const [patientAuthView, setPatientAuthView] = useState("login");
  const [doctorAuthView,  setDoctorAuthView]  = useState("login");
  const [activeAuthRole,  setActiveAuthRole]  = useState("patient");

  // OTP verification state
  const [awaitingOTP, setAwaitingOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpUserRole, setOtpUserRole] = useState("patient");
  const [otpExpiresIn, setOtpExpiresIn] = useState(600);
  const [otpRememberDeviceWanted, setOtpRememberDeviceWanted] = useState(false);

  const [patientTab, setPatientTab] = useState("profile");
  const [doctorTab,  setDoctorTab]  = useState("profile");

  const [doctorDetailOpen, setDoctorDetailOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);

  const [patientLogin,    setPatientLogin]    = useState({ email: "", password: "", rememberMe: false });
  const [doctorLogin,     setDoctorLogin]     = useState({ email: "", password: "", rememberMe: false });

  const [patientRegister, setPatientRegister] = useState({
    firstName: "", lastName: "", email: "", phone: "", dob: "", password: "", confirmPassword: "",
  });
  const [doctorRegister, setDoctorRegister] = useState({
    firstName: "", lastName: "", email: "", specialty: "", license: "", experience: "", password: "", confirmPassword: "",
  });

  const [patientForgotEmail, setPatientForgotEmail] = useState("");
  const [doctorForgotEmail,  setDoctorForgotEmail]  = useState("");
  const [apptForm, setApptForm] = useState({ date: "", time: "", reason: "", notes: "" });

  const { toast, showMessage } = useToast();

  useAppBootstrap({ setAllData, showMessage });

  const {
    currentDoctor, currentPatient, doctorSlots,
    patientUpcoming, patientPast, visibleDoctors, doctorAppointments,
  } = useDashboardData({ allData, loggedInDoctor, loggedInPatient });

  const availability = useDoctorAvailability({ currentDoctor, setLoggedInDoctor, setAllData, showMessage });

  const profileActions = useProfileActions({
    currentPatient, currentDoctor, setLoggedInPatient, setLoggedInDoctor, setAllData, showMessage,
  });

  const {
    reviews, setReviews, isReviewsLoading, isReviewsError, fetchReviewsForUser, resetReviews,
  } = useSessionReviews({
    setAllData, setLoggedInDoctor, setLoggedInPatient, setPage, setPatientTab, setDoctorTab,
    setWorkingDaysDraft: availability.setWorkingDaysDraft,
    setStartTimeDraft:   availability.setStartTimeDraft,
    setEndTimeDraft:     availability.setEndTimeDraft,
  });

  const {
    handlePatientLoginSubmit, handlePatientRegisterSubmit,
    handleDoctorLoginSubmit,  handleDoctorRegisterSubmit,
    handlePatientForgotSubmit, handleDoctorForgotSubmit,
    handleOTPVerificationSuccess,
    logoutPatient, logoutDoctor,
  } = useAuthHandlers({
    patientLogin, doctorLogin, patientRegister, doctorRegister,
    patientForgotEmail, doctorForgotEmail,
    setLoggedInPatient, setLoggedInDoctor, setPage, setPatientTab, setDoctorTab, setAllData,
    setWorkingDaysDraft: availability.setWorkingDaysDraft,
    setStartTimeDraft:   availability.setStartTimeDraft,
    setEndTimeDraft:     availability.setEndTimeDraft,
    setDoctorRegister, setDoctorAuthView, setPatientForgotEmail, setDoctorForgotEmail,
    setPatientAuthView, setPatientLogin, setDoctorLogin,
    resetReviews, fetchReviewsForUser, showMessage,
    // OTP handlers
    setAwaitingOTP, setOtpEmail, setOtpUserRole, setOtpExpiresIn, setOtpRememberDeviceWanted, otpUserRole,
  });

  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;
    return (allData.doctors || []).find((d) => (d.id || d._id) === selectedDoctorId) || null;
  }, [selectedDoctorId, allData.doctors]);

  const {
    isBooking,
    openDoctorDetails, closeDoctorDetails, selectTimeSlot,
    bookAppointmentSubmit, cancelAppointment, rescheduleAppointment,
    confirmAppointment,    // ← new
    markAsCompleted, saveVisitSummary,
  } = useAppointmentActions({
    currentPatient, selectedDoctor, apptForm, setApptForm,
    setSelectedDoctorId, setDoctorDetailOpen, setAllData, setPatientTab, showMessage,
  });

  const selectedDoctorSlots = useMemo(() => {
    if (!selectedDoctor) return [];
    return generateTimeSlots(selectedDoctor).slice(0, 7);
  }, [selectedDoctor]);

  const doctorReviews  = currentDoctor  ? reviews : [];
  const patientReviews = currentPatient ? reviews : [];

  const patientReviewsByAppointment = useMemo(() => {
    const map = new Map();
    for (const review of patientReviews) {
      const id = typeof review.appointment_id === "string"
        ? review.appointment_id
        : review.appointment_id?._id || review.appointment_id?.id;
      if (id) map.set(String(id), review);
    }
    return map;
  }, [patientReviews]);

  const refreshAppointmentsFromServer = useCallback(async () => {
    try {
      const mine = await apiFetch("/appointments/mine");
      setAllData((prev) => ({
        ...prev,
        appointments: Array.isArray(mine) ? mine : prev.appointments,
      }));
    } catch {
      // ignore refresh failures to avoid interrupting chat flow
    }
  }, []);

  function applyDoctorRatingUpdate(doctors, doctorId, newRating, previousReview = null, publicReview = null) {
    return (doctors || []).map((doctor) => {
      const id = doctor.id || doctor._id;
      if (String(id) !== String(doctorId)) return doctor;

      const currentReviewCount = Number(doctor.reviewCount || 0);
      const currentAverageRating = Number(doctor.averageRating || 0);
      const previousRating = previousReview ? Number(previousReview.rating || 0) : null;

      let nextReviewCount = currentReviewCount;
      let totalRatingPoints = currentAverageRating * currentReviewCount;

      if (previousRating) {
        totalRatingPoints -= previousRating;
      } else {
        nextReviewCount += 1;
      }

      totalRatingPoints += Number(newRating);

      return {
        ...doctor,
        reviewCount: nextReviewCount,
        averageRating: nextReviewCount > 0 ? Number((totalRatingPoints / nextReviewCount).toFixed(1)) : 0,
        publicReviews: publicReview
          ? [publicReview, ...(doctor.publicReviews || []).filter((review) => String(review.id) !== String(publicReview.id))]
          : doctor.publicReviews || [],
      };
    });
  }

  function updateDoctorPublicReview(doctors, doctorId, reviewId, updates) {
    return (doctors || []).map((doctor) => {
      const id = doctor.id || doctor._id;
      if (String(id) !== String(doctorId)) return doctor;

      return {
        ...doctor,
        publicReviews: (doctor.publicReviews || []).map((review) =>
          String(review.id) === String(reviewId) ? { ...review, ...updates } : review
        ),
      };
    });
  }

  async function submitReview({ doctor_id, appointment_id, rating, comment, hideFromPublic, hideFromDoctor }) {
    const previousReview = patientReviews.find((review) => {
      const rid = typeof review.appointment_id === "string"
        ? review.appointment_id
        : review.appointment_id?._id || review.appointment_id?.id;
      return String(rid) === String(appointment_id);
    });

    const data = await apiFetch("/reviews", {
      method: "POST",
      body: JSON.stringify({ doctor_id, appointment_id, rating, comment, hideFromPublic, hideFromDoctor }),
    });
    const savedReview = normalizeId(data.review);
    const publicReview = {
      id: savedReview.id || savedReview._id,
      rating: Number(savedReview.rating),
      comment: savedReview.comment || "",
      patientName: hideFromPublic
        ? "Anonymous Patient"
        : [currentPatient?.firstName, currentPatient?.lastName].filter(Boolean).join(" ").trim() || "Anonymous Patient",
      hideFromPublic: Boolean(hideFromPublic),
      hideFromDoctor: Boolean(hideFromDoctor),
      createdAt: savedReview.createdAt || new Date().toISOString(),
    };
    setReviews((prev) => {
      const next = prev.filter((r) => {
        const rid = typeof r.appointment_id === "string"
          ? r.appointment_id : r.appointment_id?._id || r.appointment_id?.id;
        return String(rid) !== String(appointment_id);
      });
      return [...next, savedReview];
    });
    setAllData((prev) => ({
      ...prev,
      doctors: applyDoctorRatingUpdate(prev.doctors, doctor_id, rating, previousReview, publicReview),
    }));
    showMessage("Review submitted successfully", "success");
    return savedReview;
  }

  async function updateReviewVisibility({ reviewId, doctorId, hideFromPublic, hideFromDoctor }) {
    const data = await apiFetch(`/reviews/${reviewId}/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ hideFromPublic, hideFromDoctor }),
    });

    const updatedReview = normalizeId(data.review);

    setReviews((prev) =>
      prev.map((review) => {
        const id = review.id || review._id;
        return String(id) === String(reviewId)
          ? { ...review, ...updatedReview, hideFromPublic: Boolean(hideFromPublic), hideFromDoctor: Boolean(hideFromDoctor) }
          : review;
      })
    );

    setAllData((prev) => ({
      ...prev,
      doctors: updateDoctorPublicReview(prev.doctors, doctorId, reviewId, {
        patientName: hideFromPublic
          ? "Anonymous Patient"
          : [currentPatient?.firstName, currentPatient?.lastName].filter(Boolean).join(" ").trim() || "Anonymous Patient",
        hideFromPublic: Boolean(hideFromPublic),
        hideFromDoctor: Boolean(hideFromDoctor),
      }),
    }));

    showMessage("Review visibility updated", "success");
    return updatedReview;
  }

  function openAuthSelector()  { setAuthRoleModal(true);  }
  function closeAuthSelector() { setAuthRoleModal(false); }

  function selectRole(role) {
    closeAuthSelector();
    setActiveAuthRole(role);
    setPage("auth");
    if (role === "patient") setPatientAuthView("login");
    else                    setDoctorAuthView("login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="h-full w-full overflow-auto" style={{ position: "relative" }}>
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      <div className="glow-orb glow-orb-3" />

      {page === "landing" && (
        <LandingPage
          selectRole={selectRole}
          openAuthSelector={openAuthSelector}
          doctors={allData.doctors || []}
          currentPatient={currentPatient}
          patientReviews={patientReviews}
        />
      )}

      <AuthPage
        page={page} setPage={setPage} activeAuthRole={activeAuthRole}
        patientAuthView={patientAuthView} doctorAuthView={doctorAuthView}
        patientLogin={patientLogin}   setPatientLogin={setPatientLogin}
        doctorLogin={doctorLogin}     setDoctorLogin={setDoctorLogin}
        patientRegister={patientRegister} setPatientRegister={setPatientRegister}
        doctorRegister={doctorRegister}   setDoctorRegister={setDoctorRegister}
        patientForgotEmail={patientForgotEmail} setPatientForgotEmail={setPatientForgotEmail}
        doctorForgotEmail={doctorForgotEmail}   setDoctorForgotEmail={setDoctorForgotEmail}
        setPatientAuthView={setPatientAuthView} setDoctorAuthView={setDoctorAuthView}
        setActiveAuthRole={setActiveAuthRole}
        handlePatientLoginSubmit={handlePatientLoginSubmit}
        handlePatientRegisterSubmit={handlePatientRegisterSubmit}
        handleDoctorLoginSubmit={handleDoctorLoginSubmit}
        handleDoctorRegisterSubmit={handleDoctorRegisterSubmit}
        handlePatientForgotSubmit={handlePatientForgotSubmit}
        handleDoctorForgotSubmit={handleDoctorForgotSubmit}
      />

      <RoleSelectorModal authRoleModal={authRoleModal} closeAuthSelector={closeAuthSelector} selectRole={selectRole} />

      <PatientDashboard
        page={page} currentPatient={currentPatient} logoutPatient={logoutPatient}
        patientTab={patientTab} setPatientTab={setPatientTab}
        openEditPatient={profileActions.openEditPatient}
        visibleDoctors={visibleDoctors} openDoctorDetails={openDoctorDetails}
        patientUpcoming={patientUpcoming} patientPast={patientPast} allData={allData}
        rescheduleAppointment={rescheduleAppointment}
        cancelAppointment={cancelAppointment}
        confirmAppointment={confirmAppointment}        // ← new
        isHistoryLoading={isReviewsLoading} isHistoryError={isReviewsError}
        doctorReviews={Array.from(patientReviewsByAppointment.values())}
        submitReview={submitReview}
        updateReviewVisibility={updateReviewVisibility}
        saveVisitSummary={saveVisitSummary}
      />

      <DoctorDashboard
        page={page} currentDoctor={currentDoctor} logoutDoctor={logoutDoctor}
        doctorTab={doctorTab} setDoctorTab={setDoctorTab}
        openEditDoctor={profileActions.openEditDoctor}
        workingDaysDraft={availability.workingDaysDraft} toggleWorkDay={availability.toggleWorkDay}
        startTimeDraft={availability.startTimeDraft}     setStartTimeDraft={availability.setStartTimeDraft}
        endTimeDraft={availability.endTimeDraft}         setEndTimeDraft={availability.setEndTimeDraft}
        saveWorkingHours={availability.saveWorkingHours}
        doctorSlots={doctorSlots} allData={allData}
        doctorAppointments={doctorAppointments}
        isReviewsLoading={isReviewsLoading} isReviewsError={isReviewsError}
        doctorReviews={doctorReviews}
        saveVisitSummary={saveVisitSummary}
        markAsCompleted={markAsCompleted}
      />

      <EditPatientModal
        editPatientOpen={profileActions.editPatientOpen}
        setEditPatientOpen={profileActions.setEditPatientOpen}
        patientEditForm={profileActions.patientEditForm}
        setPatientEditForm={profileActions.setPatientEditForm}
        savePatientProfile={profileActions.savePatientProfile}
      />
      <EditDoctorModal
        editDoctorOpen={profileActions.editDoctorOpen}
        setEditDoctorOpen={profileActions.setEditDoctorOpen}
        doctorEditForm={profileActions.doctorEditForm}
        setDoctorEditForm={profileActions.setDoctorEditForm}
        saveDoctorProfile={profileActions.saveDoctorProfile}
      />
      <DoctorDetailModal
        doctorDetailOpen={doctorDetailOpen} closeDoctorDetails={closeDoctorDetails}
        selectedDoctor={selectedDoctor} selectedDoctorSlots={selectedDoctorSlots}
        selectTimeSlot={selectTimeSlot} apptForm={apptForm} setApptForm={setApptForm}
        todayISO={todayISO} bookAppointmentSubmit={bookAppointmentSubmit}
        isBooking={isBooking}
        currentPatient={currentPatient}
        patientReviews={patientReviews}
      />

      {/* OTP Verification Screen */}
      {awaitingOTP && (
        <OTPVerification
          email={otpEmail}
          userRole={otpUserRole}
          expiresIn={otpExpiresIn}
          rememberByDefault={otpRememberDeviceWanted}
          onSuccess={handleOTPVerificationSuccess}
          onCancel={() => {
            setAwaitingOTP(false);
            setOtpEmail("");
            setOtpRememberDeviceWanted(false);
            if (otpUserRole === "patient") {
              setPatientAuthView("login");
            } else {
              setDoctorAuthView("login");
            }
          }}
        />
      )}

      {/* Chatbot Widget */}
      <AppointmentChatbot
        key={loggedInDoctor ? "doctor-chatbot" : "patient-chatbot"}
        loggedInPatient={loggedInPatient}
        loggedInDoctor={loggedInDoctor}
        isAuthenticated={!!loggedInPatient || !!loggedInDoctor}
        onAppointmentsChanged={refreshAppointmentsFromServer}
      />

      <Toast toast={toast} />
    </div>
  );
}
