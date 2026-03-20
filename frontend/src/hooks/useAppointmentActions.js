import { useState } from "react";
import { apiFetch } from "../API/http";
import { normalizeArray, normalizeId } from "../utils/normalize";

function formatAppointmentDate(date) {
  if (!date) return "the selected date";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

export default function useAppointmentActions({
  currentPatient,
  selectedDoctor,
  apptForm,
  setApptForm,
  setSelectedDoctorId,
  setDoctorDetailOpen,
  setAllData,
  setPatientTab,
  showMessage,
}) {
  const [isBooking, setIsBooking] = useState(false);

  function openDoctorDetails(doctorId) {
    setSelectedDoctorId(doctorId);
    setApptForm({ date: "", time: "", reason: "", notes: "" });
    setDoctorDetailOpen(true);
  }

  function closeDoctorDetails() {
    setDoctorDetailOpen(false);
    setSelectedDoctorId(null);
  }

  function selectTimeSlot(date, time) {
    setApptForm((prev) => ({ ...prev, date, time }));
  }

  async function bookAppointmentSubmit(e) {
    e.preventDefault();
    if (!currentPatient || !selectedDoctor || isBooking) return;

    const date   = apptForm.date;
    const time   = apptForm.time;
    const reason = apptForm.reason.trim();
    const notes  = apptForm.notes.trim();

    if (!date || !time || !reason) {
      return showMessage("✗ Please fill in all required fields", "error");
    }

    const selectedAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(selectedAt.getTime()) || selectedAt.getTime() <= Date.now()) {
      return showMessage("✗ Please select a future date/time", "error");
    }

    setIsBooking(true);
    try {
      const created = await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId: currentPatient.id,
          doctorId:  selectedDoctor.id,
          appointmentDate: date,
          appointmentTime: time,
          reason, notes,
        }),
      });

      const saved = normalizeId(created.appointment || created);
      const savedId = String(saved.id || saved._id || "");

      // Show the appointment immediately in UI.
      setAllData((prev) => {
        const exists = (prev.appointments || []).some(
          (a) => String(a.id || a._id || "") === savedId
        );
        return {
          ...prev,
          appointments: exists ? prev.appointments : [...prev.appointments, saved],
        };
      });

      // Sync with backend truth, but never wipe local booked data with an empty response.
      try {
        const mine = normalizeArray(await apiFetch("/appointments/mine"));
        setAllData((prev) => ({
          ...prev,
          appointments: mine.length > 0 ? mine : prev.appointments,
        }));
      } catch {
        // keep optimistic data
      }

      setDoctorDetailOpen(false);
      setSelectedDoctorId(null);
      setApptForm({ date: "", time: "", reason: "", notes: "" });
      setPatientTab("upcoming");

      const doctorLastName = selectedDoctor.lastName || selectedDoctor.firstName || "the doctor";
      const msg = created.message ||
        `✓ Appointment booked with Dr. ${doctorLastName} on ${formatAppointmentDate(date)} at ${time}.`;

      if (created.emailStatus?.skipped) {
        showMessage(`${msg} (Email not sent: ${created.emailStatus.reason})`, "success");
      } else {
        showMessage(`${msg} (Confirmation email sent)`, "success");
      }
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    } finally {
      setIsBooking(false);
    }
  }

  async function cancelAppointment(apptId) {
    try {
      let updated;
      try {
        updated = await apiFetch(`/appointments/${apptId}/cancel`, { method: "PATCH" });
      } catch {
        updated = await apiFetch(`/appointments/${apptId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        });
      }

      setAllData((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          (a.id || a._id) === apptId ? { ...a, status: "cancelled" } : a
        ),
      }));

      const base = updated?.message || "✓ Appointment cancelled";
      if (updated?.emailStatus?.skipped) {
        showMessage(`${base} (Email not sent: ${updated.emailStatus.reason})`, "success");
      } else {
        showMessage(`${base} (Cancellation email sent)`, "success");
      }
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
      let updated;
      try {
        updated = await apiFetch(`/appointments/${apptId}/reschedule`, {
          method: "PATCH",
          body: JSON.stringify({ appointmentDate: newDate, appointmentTime: newTime }),
        });
      } catch {
        updated = await apiFetch(`/appointments/${apptId}`, {
          method: "PATCH",
          body: JSON.stringify({ appointmentDate: newDate, appointmentTime: newTime }),
        });
      }

      setAllData((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          (a.id || a._id) === apptId
            ? { ...a, appointmentDate: newDate, appointmentTime: newTime, status: "pending" }
            : a
        ),
      }));

      const base = updated?.message || "✓ Appointment rescheduled!";
      if (updated?.emailStatus?.skipped) {
        showMessage(`${base} (Email not sent: ${updated.emailStatus.reason})`, "success");
      } else {
        showMessage(`${base} (Reschedule email sent)`, "success");
      }
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  /**
   * confirmAppointment — patient only
   * Calls PATCH /api/appointments/:id/patient-confirm
   * Returns { tooEarly, windowOpen, windowClose } if outside window.
   */
  async function confirmAppointment(apptId) {
    try {
      const updated = await apiFetch(`/appointments/${apptId}/patient-confirm`, {
        method: "PATCH",
      });

      setAllData((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          (a.id || a._id) === apptId ? { ...a, status: "confirmed" } : a
        ),
      }));

      showMessage("✓ Appointment confirmed!", "success");
      return { success: true };
    } catch (err) {
      // Backend sends tooEarly flag with window times
      // We re-throw with the full error so the UI can show the popup
      throw err;
    }
  }

  async function markAsCompleted(apptId) {
    try {
      await apiFetch(`/appointments/${apptId}/complete`, { method: "PATCH" });

      setAllData((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          (a.id || a._id) === apptId ? { ...a, status: "completed" } : a
        ),
      }));

      showMessage("✓ Appointment marked as completed", "success");
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  async function saveVisitSummary(apptId, visitSummary) {
    try {
      const updated = await apiFetch(`/appointments/${apptId}/visit-summary`, {
        method: "PATCH",
        body: JSON.stringify({ visitSummary }),
      });

      setAllData((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          (a.id || a._id) === apptId
            ? {
                ...a,
                visitSummary:          updated.appointment?.visitSummary ?? visitSummary,
                visitSummaryUpdatedAt: updated.appointment?.visitSummaryUpdatedAt ?? new Date().toISOString(),
              }
            : a
        ),
      }));

      showMessage("✓ Visit summary saved", "success");
    } catch (err) {
      showMessage("✗ " + err.message, "error");
      throw err;
    }
  }

  return {
    isBooking,
    openDoctorDetails,
    closeDoctorDetails,
    selectTimeSlot,
    bookAppointmentSubmit,
    cancelAppointment,
    rescheduleAppointment,
    confirmAppointment,
    markAsCompleted,
    saveVisitSummary,
  };
}
