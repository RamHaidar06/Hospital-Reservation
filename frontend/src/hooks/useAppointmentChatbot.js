import { useState, useCallback } from "react";
import { apiFetch } from "../API/http";

/**
 * Chatbot Hook for managing conversation state and chatbot interactions
 * Handles guided appointment booking, rescheduling, and cancellation flows
 */

function getInitialBotMessage(userRole) {
  if (userRole === "doctor") {
    return {
      id: "init",
      type: "bot",
      text: "Hello Doctor! I can help you quickly review your schedule.",
      quickReplies: [
        { label: "Today's appointments", id: "doctor-today" },
        { label: "Upcoming appointments", id: "doctor-upcoming" },
        { label: "Completed appointments", id: "doctor-completed" },
        { label: "What can you do?", id: "help-doctor" },
      ],
    };
  }

  return {
    id: "init",
    type: "bot",
    text: "Hello! I'm your healthcare assistant. How can I help you today?",
    quickReplies: [
      { label: "Book an appointment", id: "book" },
      { label: "Reschedule appointment", id: "reschedule" },
      { label: "Cancel appointment", id: "cancel" },
      { label: "What can you do?", id: "help-patient" },
    ],
  };
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function includesAny(text, keywords) {
  const normalized = normalizeText(text);
  return keywords.some((word) => normalized.includes(word));
}

function parseTimeFromText(text) {
  const normalized = normalizeText(text);
  const match = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!match) return null;

  let hour = Number(match[1]);
  let minute = Number(match[2] || 0);
  const suffix = match[3];

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute < 0 || minute > 59) return null;

  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function useAppointmentChatbot(currentUser, userRole = "patient") {
  const inferSpecialty = useCallback((text) => {
    const q = String(text || "").toLowerCase();
    if (q.includes("chest") || q.includes("heart") || q.includes("cardio")) return "cardiology";
    if (q.includes("leg") || q.includes("bone") || q.includes("knee")) return "orthopedics";
    if (q.includes("skin") || q.includes("rash")) return "dermatology";
    if (q.includes("eye") || q.includes("vision")) return "ophthalmology";
    if (q.includes("head") || q.includes("migraine")) return "neurology";
    return "";
  }, []);

  const buildDoctorFallbackSuggestions = useCallback((doctorsList, need) => {
    const q = String(need || "").trim().toLowerCase();
    const inferred = inferSpecialty(q);

    const scored = (doctorsList || []).map((doc) => {
      const specialty = String(doc.specialty || "").toLowerCase();
      const fullName = `${doc.firstName || ""} ${doc.lastName || ""}`.toLowerCase();
      let score = 0;

      if (q && specialty.includes(q)) score += 6;
      if (inferred && specialty.includes(inferred)) score += 5;
      if (q && fullName.includes(q)) score += 2;

      return {
        doctorId: doc.id || doc._id,
        firstName: doc.firstName,
        lastName: doc.lastName,
        specialty: doc.specialty || "General Medicine",
        yearsExperience: Number(doc.yearsExperience || 0),
        workingDays: doc.workingDays,
        startTime: doc.startTime,
        endTime: doc.endTime,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score || b.yearsExperience - a.yearsExperience);
    const filtered = q ? scored.filter((d) => d.score > 0) : scored;
    return (filtered.length ? filtered : scored).slice(0, 8);
  }, [inferSpecialty]);

  const [messages, setMessages] = useState([getInitialBotMessage(userRole)]);

  const [flowState, setFlowState] = useState({
    intent: null, // "book", "reschedule", "cancel"
    step: null, // "need", "select-doctor", "select-date", "select-time", "confirm"
    draft: {}, // { need, selectedDoctor, selectedDate, selectedTime, selectedAppointment }
  });

  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const detectTopLevelIntent = useCallback(
    (text) => {
      const t = normalizeText(text);

      if (includesAny(t, ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"])) {
        return "greeting";
      }

      if (includesAny(t, ["thanks", "thank you", "thx"])) {
        return "gratitude";
      }

      if (includesAny(t, ["yes", "yeah", "yep", "ok", "okay", "sure"])) {
        return "affirm";
      }

      if (includesAny(t, ["no", "nope", "nah"])) {
        return "deny";
      }

      if (includesAny(t, ["help", "what can", "options", "menu"])) return "help";

      if (userRole === "doctor") {
        if (includesAny(t, ["today", "todays", "to day"])) return "doctor-today";
        if (includesAny(t, ["upcoming", "next", "future", "schedule"])) return "doctor-upcoming";
        if (includesAny(t, ["completed", "done", "finished"])) return "doctor-completed";
        return null;
      }

      if (includesAny(t, ["reschedule", "resched", "change", "move", "shift"])) return "reschedule";
      if (includesAny(t, ["cancel", "delete", "remove"])) return "cancel";
      if (includesAny(t, ["book", "appointment", "apointment", "appoint", "schedule", "doctor"])) return "book";

      return null;
    },
    [userRole]
  );

  const parseDateInput = useCallback((input) => {
    const raw = String(input || "").trim().toLowerCase();
    const now = new Date();

    if (raw === "tomorrow") {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return d;
    }

    if (raw === "today") {
      return now;
    }

    if (raw === "next week") {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      return d;
    }

    const parsed = new Date(input);
    if (!isNaN(parsed)) return parsed;
    return null;
  }, []);

  const generateFallbackSlots = useCallback((doctor, formattedDate) => {
    const workingDays = String(doctor?.workingDays || "monday,tuesday,wednesday,thursday,friday")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    const startTime = String(doctor?.startTime || "09:00");
    const endTime = String(doctor?.endTime || "17:00");
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    if ([startH, startM, endH, endM].some((v) => Number.isNaN(v))) return [];

    const dateObj = new Date(`${formattedDate}T00:00:00`);
    if (isNaN(dateObj)) return [];

    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = weekdays[dateObj.getDay()];
    if (!workingDays.includes(dayName)) return [];

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const slotsOut = [];

    const now = new Date();
    const isToday = now.toISOString().slice(0, 10) === formattedDate;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (let minutes = startMinutes; minutes + 30 <= endMinutes; minutes += 30) {
      if (isToday && minutes <= nowMinutes) continue;
      const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
      const mm = String(minutes % 60).padStart(2, "0");
      slotsOut.push(`${hh}:${mm}`);
    }

    return slotsOut;
  }, []);

  // Push bot message to conversation
  const pushBotMessage = useCallback((text, quickReplies = null) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        type: "bot",
        text,
        quickReplies,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Push user message to conversation
  const pushUserMessage = useCallback((text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        type: "user",
        text,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleHelp = useCallback(() => {
    if (userRole === "doctor") {
      pushBotMessage(
        "I can help you review appointments. Try typing: 'today appointments', 'upcoming schedule', or 'completed appointments'.",
        [
          { label: "Today's appointments", id: "doctor-today" },
          { label: "Upcoming appointments", id: "doctor-upcoming" },
          { label: "Completed appointments", id: "doctor-completed" },
        ]
      );
      return;
    }

    pushBotMessage(
      "I can help with booking, rescheduling, and cancelling appointments. Try typing: 'book cardiology tomorrow', 'reschedule my appointment', or 'cancel appointment'.",
      [
        { label: "Book an appointment", id: "book" },
        { label: "Reschedule appointment", id: "reschedule" },
        { label: "Cancel appointment", id: "cancel" },
      ]
    );
  }, [pushBotMessage, userRole]);

  // ============================================================
  // BOOKING FLOW
  // ============================================================

  const handleStartBook = useCallback(() => {
    pushUserMessage("I want to book an appointment");
    setFlowState({
      intent: "book",
      step: "need",
      draft: {},
    });
    pushBotMessage(
      "Great! To help me suggest the best doctors for you, what's your health need or which specialty are you looking for? (e.g., 'I have chest pain', 'Cardiology', 'Skin issue')"
    );
  }, [pushUserMessage, pushBotMessage]);

  const handleBookNeedInput = useCallback(
    async (need) => {
      if (!need || !need.trim()) {
        pushBotMessage("Please tell me more about your health need.");
        return;
      }

      pushUserMessage(need);
      setLoading(true);

      try {
        // Call backend to get doctor suggestions from Python service
        const data = await apiFetch("/chatbot/suggest-doctors", {
          method: "POST",
          body: JSON.stringify({
            query: need,
            date: null,
          }),
        });

        const suggestions = data.suggestions || [];

        setDoctors(suggestions);

        if (suggestions.length === 0) {
          pushBotMessage(
            "Sorry, I couldn't find doctors matching your request. Please try another specialty or symptom."
          );
          setFlowState((prev) => ({
            ...prev,
            step: "need",
          }));
        } else {
          // Move to doctor selection
          setFlowState((prev) => ({
            ...prev,
            step: "select-doctor",
            draft: { ...prev.draft, need },
          }));

          pushBotMessage(
            `I found ${suggestions.length} doctors for you. Here are the top matches:`,
            suggestions.slice(0, 3).map((doc) => ({
              label: `${doc.firstName} ${doc.lastName} - ${doc.specialty}`,
              id: doc.doctorId,
            }))
          );
        }
      } catch (error) {
        console.error("Error suggesting doctors:", error);
        if (String(error?.message || "").includes("(404)")) {
          try {
            const doctorsData = await apiFetch("/users/doctors");
            const suggestions = buildDoctorFallbackSuggestions(doctorsData, need);
            setDoctors(suggestions);

            if (suggestions.length === 0) {
              pushBotMessage(
                "I could not find matching doctors right now. Try a different symptom or specialty."
              );
              setFlowState((prev) => ({ ...prev, step: "need" }));
            } else {
              setFlowState((prev) => ({
                ...prev,
                step: "select-doctor",
                draft: { ...prev.draft, need },
              }));

              pushBotMessage(
                `I found ${suggestions.length} doctors for you (fallback mode):`,
                suggestions.slice(0, 3).map((doc) => ({
                  label: `${doc.firstName} ${doc.lastName} - ${doc.specialty}`,
                  id: doc.doctorId,
                }))
              );
            }
          } catch (fallbackError) {
            pushBotMessage(`Error accessing doctor suggestions: ${fallbackError.message}`);
          }
        } else {
          pushBotMessage(`Error accessing doctor suggestions: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    },
    [pushUserMessage, pushBotMessage, buildDoctorFallbackSuggestions]
  );

  const handleBookDoctorSelect = useCallback(
    async (doctorId) => {
      const doctor = doctors.find((d) => d.doctorId === doctorId);
      if (!doctor) {
        pushBotMessage("Doctor not found. Please select again.");
        return;
      }

      pushUserMessage(`${doctor.firstName} ${doctor.lastName}`);

      setFlowState((prev) => ({
        ...prev,
        step: "select-date",
        draft: { ...prev.draft, selectedDoctor: doctor },
      }));

      pushBotMessage(
        `Great! Dr. ${doctor.lastName} is a ${doctor.specialty} specialist with ${doctor.yearsExperience} years of experience.\n\nWhat date would you prefer for your appointment? (Please provide in YYYY-MM-DD format or say 'tomorrow', 'next week', etc.)`
      );
    },
    [doctors, pushUserMessage, pushBotMessage]
  );

  const handleBookDoctorTextSelect = useCallback(
    (typedValue) => {
      const typed = normalizeText(typedValue);
      if (!typed) return false;

      const asNumber = Number(typed);
      if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= doctors.length) {
        const option = doctors[asNumber - 1];
        if (option?.doctorId) {
          handleBookDoctorSelect(option.doctorId);
          return true;
        }
      }

      const matched = doctors.find((doc) => {
        const fullName = `${doc.firstName || ""} ${doc.lastName || ""}`.toLowerCase().trim();
        const specialty = String(doc.specialty || "").toLowerCase();
        return fullName.includes(typed) || typed.includes(fullName) || specialty.includes(typed);
      });

      if (matched?.doctorId) {
        handleBookDoctorSelect(matched.doctorId);
        return true;
      }

      pushBotMessage("I could not match that doctor. Please click an option or type a clearer doctor name/specialty.");
      return false;
    },
    [doctors, handleBookDoctorSelect, pushBotMessage]
  );

  const handleBookDateSelect = useCallback(
    async (dateInput) => {
      if (!dateInput || !dateInput.trim()) {
        pushBotMessage("Please provide a date for the appointment.");
        return;
      }

      pushUserMessage(dateInput);
      setLoading(true);

      try {
        const date = parseDateInput(dateInput);
        if (!date || isNaN(date)) {
          pushBotMessage("Could you please enter the date in YYYY-MM-DD format?");
          setLoading(false);
          return;
        }

        const formattedDate = date.toISOString().split("T")[0];
        const selectedDoctor = flowState.draft.selectedDoctor;

        // Fetch available slots
        const data = await apiFetch(`/chatbot/doctors/${selectedDoctor.doctorId}/available-slots`, {
          method: "POST",
          body: JSON.stringify({
            date: formattedDate,
          }),
        });

        const availableSlots = data.availableSlots || [];

        setSlots(availableSlots);

        if (availableSlots.length === 0) {
          pushBotMessage(
            `No appointments available on ${formattedDate}. Would you like to try a different date?`
          );
        } else {
          setFlowState((prev) => ({
            ...prev,
            step: "select-time",
            draft: { ...prev.draft, selectedDate: formattedDate },
          }));

          pushBotMessage(
            `Perfect! Available time slots on ${formattedDate}:`,
            availableSlots.map((slot) => ({
              label: slot,
              id: slot,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching slots:", error);
        if (String(error?.message || "").includes("(404)")) {
          const selectedDoctor = flowState.draft.selectedDoctor;
          const date = parseDateInput(dateInput);
          if (!date || !selectedDoctor) {
            pushBotMessage("Could you please enter the date in YYYY-MM-DD format?");
          } else {
            const formattedDate = date.toISOString().split("T")[0];
            const availableSlots = generateFallbackSlots(selectedDoctor, formattedDate);
            setSlots(availableSlots);

            if (availableSlots.length === 0) {
              pushBotMessage(`No appointments available on ${formattedDate}. Would you like to try a different date?`);
            } else {
              setFlowState((prev) => ({
                ...prev,
                step: "select-time",
                draft: { ...prev.draft, selectedDate: formattedDate },
              }));
              pushBotMessage(
                `Perfect! Available time slots on ${formattedDate} (fallback mode):`,
                availableSlots.map((slot) => ({ label: slot, id: slot }))
              );
            }
          }
        } else {
          pushBotMessage(`Error checking availability: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    },
    [flowState.draft, pushUserMessage, pushBotMessage, parseDateInput, generateFallbackSlots]
  );

  const handleBookTimeSelect = useCallback(
    (time) => {
      if (!time) {
        pushBotMessage("Please select a time slot.");
        return;
      }

      pushUserMessage(time);

      const selectedDoctor = flowState.draft.selectedDoctor;
      const selectedDate = flowState.draft.selectedDate;

      setFlowState((prev) => ({
        ...prev,
        step: "confirm",
        draft: { ...prev.draft, selectedTime: time },
      }));

      pushBotMessage(
        `Please confirm your appointment details:\n\n📅 Date: ${selectedDate}\n🕐 Time: ${time}\n👨‍⚕️ Doctor: ${selectedDoctor.firstName} ${selectedDoctor.lastName}\n${selectedDoctor.specialty}`,
        [
          { label: "✓ Confirm Booking", id: "confirm-yes" },
          { label: "✗ Cancel & Start Over", id: "confirm-no" },
        ]
      );
    },
    [flowState.draft, pushUserMessage, pushBotMessage]
  );

  const handleBookTimeTextSelect = useCallback(
    (typedValue) => {
      const parsedTime = parseTimeFromText(typedValue);
      if (!parsedTime) {
        const examples = slots.slice(0, 4).join(", ");
        pushBotMessage(
          examples
            ? `Please type a valid time. For example: ${examples}`
            : "Please select one of the available time slots shown."
        );
        return false;
      }

      if (!slots.includes(parsedTime)) {
        const examples = slots.slice(0, 4).join(", ");
        pushBotMessage(
          examples
            ? `${parsedTime} is not available. Try one of these: ${examples}`
            : "That time is not currently available. Please choose another slot."
        );
        return false;
      }

      handleBookTimeSelect(parsedTime);
      return true;
    },
    [slots, handleBookTimeSelect, pushBotMessage]
  );

  const handleBookConfirmation = useCallback(
    async (confirmed) => {
      if (confirmed) {
        pushUserMessage("Confirm");
        setLoading(true);

        try {
          const selectedDoctor = flowState.draft.selectedDoctor;
          const selectedDate = flowState.draft.selectedDate;
          const selectedTime = flowState.draft.selectedTime;

          // Create appointment via Node backend
          const data = await apiFetch("/appointments", {
            method: "POST",
            body: JSON.stringify({
              doctorId: selectedDoctor.doctorId,
              appointmentDate: selectedDate,
              appointmentTime: selectedTime,
              reason: flowState.draft.need || "Appointment",
            }),
          });

          pushBotMessage(
            `✅ Your appointment has been booked successfully!\n\nAppointment ID: ${data._id}\nDoctor: ${selectedDoctor.firstName} ${selectedDoctor.lastName}\nDate: ${selectedDate}\nTime: ${selectedTime}\n\nYou'll receive a confirmation email shortly.`
          );
        } catch (error) {
          console.error("Error booking appointment:", error);
          pushBotMessage("Error booking appointment. Please try again.");
        } finally {
          setLoading(false);
          setFlowState({
            intent: null,
            step: null,
            draft: {},
          });
        }
      } else {
        pushUserMessage("Start Over");
        pushBotMessage("No problem! Let's start fresh. How can I help you?", [
          { label: "Book an appointment", id: "book" },
          { label: "Reschedule appointment", id: "reschedule" },
          { label: "Cancel appointment", id: "cancel" },
        ]);
        setFlowState({
          intent: null,
          step: null,
          draft: {},
        });
      }
    },
    [flowState.draft, pushUserMessage, pushBotMessage]
  );

  // ============================================================
  // RESCHEDULE FLOW (Simplified)
  // ============================================================

  const handleStartReschedule = useCallback(async () => {
    pushUserMessage("I want to reschedule an appointment");
    setLoading(true);

    try {
      const data = await apiFetch("/chatbot/my-appointments", {
        method: "GET",
      });

      const upcoming = data.filter((apt) => apt.status !== "completed" && apt.status !== "cancelled");

      setAppointments(upcoming);

      if (upcoming.length === 0) {
        pushBotMessage("You don't have any upcoming appointments to reschedule.");
      } else {
        setFlowState({
          intent: "reschedule",
          step: "select-appointment",
          draft: {},
        });

        pushBotMessage("Select the appointment you'd like to reschedule:", [
          ...upcoming.slice(0, 5).map((apt) => ({
            label: `${apt.doctorId.firstName} ${apt.doctorId.lastName} - ${apt.appointmentDate} at ${apt.appointmentTime}`,
            id: apt._id,
          })),
        ]);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      pushBotMessage("Error fetching your appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [pushUserMessage, pushBotMessage]);

  const handleRescheduleAppointmentSelect = useCallback(
    (appointmentId) => {
      const apt = appointments.find((a) => a._id === appointmentId);
      if (!apt) return;

      pushUserMessage(
        `${apt.doctorId.firstName} ${apt.doctorId.lastName} - ${apt.appointmentDate} at ${apt.appointmentTime}`
      );

      setFlowState((prev) => ({
        ...prev,
        step: "reschedule-new-date",
        draft: { ...prev.draft, selectedAppointment: apt },
      }));

      pushBotMessage(
        `When would you like to reschedule this appointment? (Please provide date in YYYY-MM-DD format)`
      );
    },
    [appointments, pushUserMessage, pushBotMessage]
  );

  // ============================================================
  // CANCEL FLOW (Simplified)
  // ============================================================

  const handleStartCancel = useCallback(async () => {
    pushUserMessage("I want to cancel an appointment");
    setLoading(true);

    try {
      const data = await apiFetch("/chatbot/my-appointments", {
        method: "GET",
      });

      const upcoming = data.filter((apt) => apt.status !== "completed" && apt.status !== "cancelled");

      setAppointments(upcoming);

      if (upcoming.length === 0) {
        pushBotMessage("You don't have any upcoming appointments to cancel.");
      } else {
        setFlowState({
          intent: "cancel",
          step: "select-appointment",
          draft: {},
        });

        pushBotMessage("Select the appointment you'd like to cancel:", [
          ...upcoming.slice(0, 5).map((apt) => ({
            label: `${apt.doctorId.firstName} ${apt.doctorId.lastName} - ${apt.appointmentDate} at ${apt.appointmentTime}`,
            id: apt._id,
          })),
        ]);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      pushBotMessage("Error fetching your appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [pushUserMessage, pushBotMessage]);

  const handleCancelAppointmentConfirm = useCallback(
    async (appointmentId, confirmed) => {
      const apt = appointments.find((a) => a._id === appointmentId);
      if (!apt) return;

      if (confirmed) {
        pushUserMessage("Yes, cancel it");
        setLoading(true);

        try {
          await apiFetch(`/appointments/${appointmentId}/cancel`, {
            method: "PATCH",
          });

          pushBotMessage(
            `✅ Your appointment with ${apt.doctorId.firstName} ${apt.doctorId.lastName} on ${apt.appointmentDate} has been cancelled.`
          );
        } catch (error) {
          console.error("Error cancelling appointment:", error);
          pushBotMessage("Error cancelling appointment. Please try again.");
        } finally {
          setLoading(false);
          setFlowState({
            intent: null,
            step: null,
            draft: {},
          });
        }
      } else {
        pushUserMessage("No, keep it");
        pushBotMessage("No problem! Is there anything else I can help you with?", [
          { label: "Book an appointment", id: "book" },
          { label: "Reschedule appointment", id: "reschedule" },
          { label: "Cancel appointment", id: "cancel" },
        ]);
        setFlowState({
          intent: null,
          step: null,
          draft: {},
        });
      }
    },
    [appointments, pushUserMessage, pushBotMessage]
  );

  const handleDoctorAppointmentsSummary = useCallback(
    async (mode) => {
      setLoading(true);

      try {
        const data = await apiFetch("/appointments/mine", { method: "GET" });
        const allAppointments = Array.isArray(data) ? data : [];

        const today = new Date().toISOString().slice(0, 10);
        const active = allAppointments.filter((apt) => apt.status !== "cancelled");
        const todayAppointments = active.filter((apt) => apt.appointmentDate === today);
        const upcomingAppointments = active.filter(
          (apt) => apt.appointmentDate >= today && apt.status !== "completed"
        );
        const completedAppointments = allAppointments.filter((apt) => apt.status === "completed");

        if (mode === "doctor-today") {
          if (!todayAppointments.length) {
            pushBotMessage("You have no appointments scheduled for today.");
            return;
          }

          const list = todayAppointments
            .slice(0, 6)
            .map((apt) => {
              const patient = apt.patientId || {};
              const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Patient";
              return `- ${apt.appointmentTime} with ${patientName} (${apt.status})`;
            })
            .join("\n");

          pushBotMessage(`Today's appointments:\n\n${list}`);
          return;
        }

        if (mode === "doctor-upcoming") {
          const list = upcomingAppointments
            .sort((a, b) => `${a.appointmentDate} ${a.appointmentTime}`.localeCompare(`${b.appointmentDate} ${b.appointmentTime}`))
            .slice(0, 8)
            .map((apt) => {
              const patient = apt.patientId || {};
              const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Patient";
              return `- ${apt.appointmentDate} ${apt.appointmentTime} with ${patientName} (${apt.status})`;
            })
            .join("\n");

          pushBotMessage(
            upcomingAppointments.length
              ? `Upcoming appointments (${upcomingAppointments.length}):\n\n${list}`
              : "You currently have no upcoming appointments."
          );
          return;
        }

        pushBotMessage(`Completed appointments total: ${completedAppointments.length}.`);
      } catch (error) {
        console.error("Error loading doctor appointment summary:", error);
        pushBotMessage("I could not load your appointments right now. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [pushBotMessage]
  );

  // ============================================================
  // MESSAGE HANDLING
  // ============================================================

  const submitTextMessage = useCallback(
    (text) => {
      const raw = String(text || "").trim();
      if (!raw) return;

      const topLevelIntent = detectTopLevelIntent(raw);

      if (includesAny(raw, ["start over", "restart", "reset"])) {
        pushUserMessage(raw);
        setMessages([getInitialBotMessage(userRole)]);
        setFlowState({
          intent: userRole === "doctor" ? "doctor" : null,
          step: null,
          draft: {},
        });
        return;
      }

      if (!flowState.intent && topLevelIntent) {
        if (topLevelIntent === "greeting") {
          pushUserMessage(raw);
          pushBotMessage(
            userRole === "doctor"
              ? "Hello Doctor. I can help with today's, upcoming, or completed appointments."
              : "Hello. I can help you book, reschedule, or cancel appointments."
          );
          return;
        }

        if (topLevelIntent === "gratitude") {
          pushUserMessage(raw);
          pushBotMessage("You are welcome. Tell me what you want to do next.");
          return;
        }

        if (topLevelIntent === "affirm" || topLevelIntent === "deny") {
          pushUserMessage(raw);
          pushBotMessage(
            userRole === "doctor"
              ? "Please tell me: today, upcoming, or completed appointments."
              : "Please tell me what you need: book, reschedule, or cancel."
          );
          return;
        }

        if (topLevelIntent === "help") {
          pushUserMessage(raw);
          handleHelp();
          return;
        }
        if (topLevelIntent === "book") {
          handleStartBook();
          return;
        }
        if (topLevelIntent === "reschedule") {
          handleStartReschedule();
          return;
        }
        if (topLevelIntent === "cancel") {
          handleStartCancel();
          return;
        }
        if (topLevelIntent.startsWith("doctor-")) {
          pushUserMessage(raw);
          handleDoctorAppointmentsSummary(topLevelIntent);
          return;
        }
      }

      const intent = flowState.intent;
      const step = flowState.step;

      switch (intent) {
        case "doctor":
          pushUserMessage(raw);
          if (topLevelIntent === "greeting") {
            pushBotMessage("Hello Doctor. Ask for today's, upcoming, or completed appointments.");
          } else if (topLevelIntent === "gratitude") {
            pushBotMessage("Happy to help.");
          } else if (topLevelIntent?.startsWith("doctor-")) {
            handleDoctorAppointmentsSummary(topLevelIntent);
          } else if (topLevelIntent === "help") {
            handleHelp();
          } else {
            pushBotMessage("Try asking for 'today appointments', 'upcoming schedule', or 'completed appointments'.");
          }
          break;
        case "book":
          if (step === "need") {
            handleBookNeedInput(raw);
          } else if (step === "select-doctor") {
            handleBookDoctorTextSelect(raw);
          } else if (step === "select-date") {
            handleBookDateSelect(raw);
          } else if (step === "select-time") {
            handleBookTimeTextSelect(raw);
          } else if (step === "confirm") {
            if (
              topLevelIntent === "affirm" ||
              includesAny(raw, ["confirm", "book it", "go ahead", "proceed", "yes confirm"])
            ) {
              handleBookConfirmation(true);
            } else if (
              topLevelIntent === "deny" ||
              includesAny(raw, ["cancel", "stop", "dont", "don't", "no cancel"])
            ) {
              handleBookConfirmation(false);
            } else {
              pushUserMessage(raw);
              pushBotMessage("Please type 'confirm' to book, or 'cancel' to restart.");
            }
          } else {
            pushUserMessage(raw);
            pushBotMessage("Continue the booking steps, or type 'start over' to restart.");
          }
          break;
        case "reschedule":
          if (step === "reschedule-new-date") {
            pushUserMessage(raw);
            // Handle reschedule (simplified)
            pushBotMessage(
              "Rescheduling feature is coming soon. Please contact support for now."
            );
          } else {
            pushUserMessage(raw);
            pushBotMessage("Please pick an appointment first, then provide the new date.");
          }
          break;
        default:
          pushUserMessage(raw);
          if (topLevelIntent === "greeting") {
            pushBotMessage(
              userRole === "doctor"
                ? "Hello Doctor. Ask for today's, upcoming, or completed appointments."
                : "Hello. I can help you book, reschedule, or cancel appointments."
            );
          } else if (topLevelIntent === "gratitude") {
            pushBotMessage("You are welcome.");
          } else if (topLevelIntent === "help") {
            handleHelp();
          } else {
            pushBotMessage(
              userRole === "doctor"
                ? "I didn't fully understand. Try 'today appointments' or 'upcoming schedule'."
                : "I didn't fully understand. Try 'book appointment', 'reschedule', or 'cancel'."
            );
          }
          break;
      }
    },
    [
      flowState,
      detectTopLevelIntent,
      handleHelp,
      handleStartBook,
      handleStartReschedule,
      handleStartCancel,
      handleDoctorAppointmentsSummary,
      handleBookNeedInput,
      handleBookDoctorTextSelect,
      handleBookDateSelect,
      handleBookTimeTextSelect,
      handleBookConfirmation,
      pushUserMessage,
      pushBotMessage,
      userRole,
    ]
  );

  const selectQuickReply = useCallback(
    (replyId) => {
      switch (replyId) {
        case "doctor-today":
        case "doctor-upcoming":
        case "doctor-completed":
          pushUserMessage(replyId.replace("doctor-", "").replace(/-/g, " "));
          handleDoctorAppointmentsSummary(replyId);
          break;
        case "help-patient":
        case "help-doctor":
          pushUserMessage("help");
          handleHelp();
          break;
        case "book":
          handleStartBook();
          break;
        case "reschedule":
          handleStartReschedule();
          break;
        case "cancel":
          handleStartCancel();
          break;
        case "confirm-yes":
          handleBookConfirmation(true);
          break;
        case "confirm-no":
          handleBookConfirmation(false);
          break;
        default:
          // Doctor selection in booking
          if (flowState.intent === "book" && flowState.step === "select-doctor") {
            handleBookDoctorSelect(replyId);
          }
          // Time selection in booking
          else if (flowState.intent === "book" && flowState.step === "select-time") {
            handleBookTimeSelect(replyId);
          }
          // Appointment selection for reschedule/cancel
          else if (
            (flowState.intent === "reschedule" || flowState.intent === "cancel") &&
            flowState.step === "select-appointment"
          ) {
            if (flowState.intent === "reschedule") {
              handleRescheduleAppointmentSelect(replyId);
            } else {
              setFlowState((prev) => ({
                ...prev,
                step: "confirm-cancel",
                draft: { ...prev.draft, selectedAppointmentId: replyId },
              }));
              const apt = appointments.find((a) => a._id === replyId);
              pushBotMessage(
                `Are you sure you want to cancel your appointment with ${apt.doctorId.firstName} ${apt.doctorId.lastName} on ${apt.appointmentDate}?`,
                [
                  { label: "Yes, cancel it", id: `confirm-cancel-${replyId}` },
                  { label: "No, keep it", id: `confirm-keep-${replyId}` },
                ]
              );
            }
          }
          break;
      }
    },
    [
      flowState,
      handleStartBook,
      handleStartReschedule,
      handleStartCancel,
      handleBookConfirmation,
      handleBookDoctorSelect,
      handleBookTimeSelect,
      handleRescheduleAppointmentSelect,
      handleDoctorAppointmentsSummary,
      handleHelp,
      appointments,
      pushUserMessage,
      pushBotMessage,
    ]
  );

  const resetChat = useCallback(() => {
    setMessages([getInitialBotMessage(userRole)]);
    setFlowState({
      intent: userRole === "doctor" ? "doctor" : null,
      step: null,
      draft: {},
    });
  }, [userRole]);

  return {
    messages,
    flowState,
    loading,
    submitTextMessage,
    selectQuickReply,
    resetChat,
    pushBotMessage,
    pushUserMessage,
  };
}
