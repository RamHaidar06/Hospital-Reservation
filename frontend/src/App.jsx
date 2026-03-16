import React, { useState, useMemo } from "react";
import "./App.css";

import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";

import Toast from "./components/Toast";
import RoleSelectorModal from "./components/Auth/RoleSelectorModal";

import { todayISO } from "./utils/date";
import { generateTimeSlots } from "./utils/slots";

import PatientDashboard from "./components/dashboards/PatientDashboard";
import DoctorDashboard from "./components/dashboards/DoctorDashboard";

import EditPatientModal from "./components/modals/EditPatientModal";
import EditDoctorModal from "./components/modals/EditDoctorModal";
import DoctorDetailModal from "./components/modals/DoctorDetailModal";

import useToast from "./hooks/useToast";
import useDashboardData from "./hooks/useDashboardData";
import useAppointmentActions from "./hooks/useAppointmentActions";
import useAuthHandlers from "./hooks/useAuthHandlers";
import useProfileActions from "./hooks/useProfileActions";
import useDoctorAvailability from "./hooks/useDoctorAvailability";
import useAppBootstrap from "./hooks/useAppBootstrap";
import useSessionReviews from "./hooks/useSessionReviews";
import { apiFetch } from "./API/http";
import { normalizeId } from "./utils/normalize";

export default function App() {
  const [allData, setAllData] = useState({
    patients: [],
    doctors: [],
    appointments: [],
  });

  const [loggedInPatient, setLoggedInPatient] = useState(null);
  const [loggedInDoctor, setLoggedInDoctor] = useState(null);

  const [page, setPage] = useState("landing");
  const [authRoleModal, setAuthRoleModal] = useState(false);

  const [patientAuthView, setPatientAuthView] = useState("login");
  const [doctorAuthView, setDoctorAuthView] = useState("login");
  const [activeAuthRole, setActiveAuthRole] = useState("patient");

  const [patientTab, setPatientTab] = useState("profile");
  const [doctorTab, setDoctorTab] = useState("profile");

  const [doctorDetailOpen, setDoctorDetailOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);

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

  const [apptForm, setApptForm] = useState({
    date: "",
    time: "",
    reason: "",
    notes: "",
  });

  const { toast, showMessage } = useToast();

  useAppBootstrap({ setAllData, showMessage });

  const {
    currentDoctor,
    currentPatient,
    doctorSlots,
    patientUpcoming,
    patientPast,
    visibleDoctors,
    doctorAppointments,
  } = useDashboardData({
    allData,
    loggedInDoctor,
    loggedInPatient,
  });

  const availability = useDoctorAvailability({
    currentDoctor,
    setLoggedInDoctor,
    setAllData,
    showMessage,
  });

  const profileActions = useProfileActions({
    currentPatient,
    currentDoctor,
    setLoggedInPatient,
    setLoggedInDoctor,
    setAllData,
    showMessage,
  });

  const {
    reviews,
    setReviews,
    isReviewsLoading,
    isReviewsError,
    fetchReviewsForUser,
    resetReviews,
  } = useSessionReviews({
    setAllData,
    setLoggedInDoctor,
    setLoggedInPatient,
    setPage,
    setPatientTab,
    setDoctorTab,
    setWorkingDaysDraft: availability.setWorkingDaysDraft,
    setStartTimeDraft: availability.setStartTimeDraft,
    setEndTimeDraft: availability.setEndTimeDraft,
  });

  const {
    handlePatientLoginSubmit,
    handlePatientRegisterSubmit,
    handleDoctorLoginSubmit,
    handleDoctorRegisterSubmit,
    handlePatientForgotSubmit,
    handleDoctorForgotSubmit,
    logoutPatient,
    logoutDoctor,
  } = useAuthHandlers({
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
    setWorkingDaysDraft: availability.setWorkingDaysDraft,
    setStartTimeDraft: availability.setStartTimeDraft,
    setEndTimeDraft: availability.setEndTimeDraft,
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
  });

  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;

    return (
      (allData.doctors || []).find((d) => (d.id || d._id) === selectedDoctorId) ||
      null
    );
  }, [selectedDoctorId, allData.doctors]);

  const {
    openDoctorDetails,
    closeDoctorDetails,
    selectTimeSlot,
    bookAppointmentSubmit,
    cancelAppointment,
    rescheduleAppointment,
  } = useAppointmentActions({
    currentPatient,
    selectedDoctor,
    apptForm,
    setApptForm,
    setSelectedDoctorId,
    setDoctorDetailOpen,
    setAllData,
    setPatientTab,
    showMessage,
  });

  const selectedDoctorSlots = useMemo(() => {
    if (!selectedDoctor) return [];
    return generateTimeSlots(selectedDoctor).slice(0, 7);
  }, [selectedDoctor]);

  // The backend endpoints /reviews/doctor and /reviews/patient already scope
  // results to the current user — no need to re-filter by ID on the frontend.
  const doctorReviews = currentDoctor ? reviews : [];
  const patientReviews = currentPatient ? reviews : [];

  const patientReviewsByAppointment = useMemo(() => {
    const map = new Map();

    for (const review of patientReviews) {
      const reviewAppointmentId =
        typeof review.appointment_id === "string"
          ? review.appointment_id
          : review.appointment_id?._id || review.appointment_id?.id;

      if (reviewAppointmentId) {
        map.set(String(reviewAppointmentId), review);
      }
    }

    return map;
  }, [patientReviews]);

  async function submitReview({
    doctor_id,
    appointment_id,
    rating,
    comment,
  }) {
    const data = await apiFetch("/reviews", {
      method: "POST",
      body: JSON.stringify({
        doctor_id,
        appointment_id,
        rating,
        comment,
      }),
    });

    const savedReview = normalizeId(data.review);
    setReviews((prev) => {
      const next = prev.filter((review) => {
        const existingAppointmentId =
          typeof review.appointment_id === "string"
            ? review.appointment_id
            : review.appointment_id?._id || review.appointment_id?.id;

        return String(existingAppointmentId) !== String(appointment_id);
      });

      return [...next, savedReview];
    });
    showMessage("Review submitted successfully", "success");

    return savedReview;
  }

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

    if (role === "patient") {
      setPatientAuthView("login");
    } else {
      setDoctorAuthView("login");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div
      className="h-full w-full overflow-auto"
      style={{ position: "relative" }}
    >
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      <div className="glow-orb glow-orb-3" />

      {page === "landing" && (
        <LandingPage openAuthSelector={openAuthSelector} />
      )}

      <AuthPage
        page={page}
        activeAuthRole={activeAuthRole}
        patientAuthView={patientAuthView}
        doctorAuthView={doctorAuthView}
        patientLogin={patientLogin}
        setPatientLogin={setPatientLogin}
        doctorLogin={doctorLogin}
        setDoctorLogin={setDoctorLogin}
        patientRegister={patientRegister}
        setPatientRegister={setPatientRegister}
        doctorRegister={doctorRegister}
        setDoctorRegister={setDoctorRegister}
        patientForgotEmail={patientForgotEmail}
        setPatientForgotEmail={setPatientForgotEmail}
        doctorForgotEmail={doctorForgotEmail}
        setDoctorForgotEmail={setDoctorForgotEmail}
        setPatientAuthView={setPatientAuthView}
        setDoctorAuthView={setDoctorAuthView}
        setActiveAuthRole={setActiveAuthRole}
        handlePatientLoginSubmit={handlePatientLoginSubmit}
        handlePatientRegisterSubmit={handlePatientRegisterSubmit}
        handleDoctorLoginSubmit={handleDoctorLoginSubmit}
        handleDoctorRegisterSubmit={handleDoctorRegisterSubmit}
        handlePatientForgotSubmit={handlePatientForgotSubmit}
        handleDoctorForgotSubmit={handleDoctorForgotSubmit}
      />

      <RoleSelectorModal
        authRoleModal={authRoleModal}
        closeAuthSelector={closeAuthSelector}
        selectRole={selectRole}
      />

      <PatientDashboard
        page={page}
        currentPatient={currentPatient}
        logoutPatient={logoutPatient}
        patientTab={patientTab}
        setPatientTab={setPatientTab}
        openEditPatient={profileActions.openEditPatient}
        visibleDoctors={visibleDoctors}
        openDoctorDetails={openDoctorDetails}
        patientUpcoming={patientUpcoming}
        patientPast={patientPast}
        allData={allData}
        rescheduleAppointment={rescheduleAppointment}
        cancelAppointment={cancelAppointment}
        isHistoryLoading={isReviewsLoading}
        isHistoryError={isReviewsError}
        doctorReviews={Array.from(patientReviewsByAppointment.values())}
        submitReview={submitReview}
      />

      <DoctorDashboard
        page={page}
        currentDoctor={currentDoctor}
        logoutDoctor={logoutDoctor}
        doctorTab={doctorTab}
        setDoctorTab={setDoctorTab}
        openEditDoctor={profileActions.openEditDoctor}
        workingDaysDraft={availability.workingDaysDraft}
        toggleWorkDay={availability.toggleWorkDay}
        startTimeDraft={availability.startTimeDraft}
        setStartTimeDraft={availability.setStartTimeDraft}
        endTimeDraft={availability.endTimeDraft}
        setEndTimeDraft={availability.setEndTimeDraft}
        saveWorkingHours={availability.saveWorkingHours}
        doctorSlots={doctorSlots}
        allData={allData}
        doctorAppointments={doctorAppointments}
        isReviewsLoading={isReviewsLoading}
        isReviewsError={isReviewsError}
        doctorReviews={doctorReviews}
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
        doctorDetailOpen={doctorDetailOpen}
        closeDoctorDetails={closeDoctorDetails}
        selectedDoctor={selectedDoctor}
        selectedDoctorSlots={selectedDoctorSlots}
        selectTimeSlot={selectTimeSlot}
        apptForm={apptForm}
        setApptForm={setApptForm}
        todayISO={todayISO}
        bookAppointmentSubmit={bookAppointmentSubmit}
      />

      <Toast toast={toast} />
    </div>
  );
}