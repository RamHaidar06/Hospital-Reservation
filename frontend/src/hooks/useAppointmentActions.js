import { apiFetch } from "../API/http";
import { normalizeId } from "../utils/normalize";

function formatAppointmentDate(date) {
  if (!date) return "the selected date";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
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
    if (!currentPatient || !selectedDoctor) return;

    const date = apptForm.date;
    const time = apptForm.time;
    const reason = apptForm.reason.trim();
    const notes = apptForm.notes.trim();

    if (!date || !time || !reason) {
      return showMessage("✗ Please fill in all required fields", "error");
    }

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

      setAllData((prev) => ({
        ...prev,
        appointments: [...prev.appointments, saved],
      }));

      setDoctorDetailOpen(false);
      setSelectedDoctorId(null);
      setApptForm({ date: "", time: "", reason: "", notes: "" });
      setPatientTab("upcoming");

      const doctorLastName =
        selectedDoctor.lastName || selectedDoctor.firstName || "the doctor";

      const confirmationMessage =
        created.message ||
        `✓ Appointment confirmed with Dr. ${doctorLastName} on ${formatAppointmentDate(
          date
        )} at ${time}.`;

      if (created.emailStatus?.skipped) {
        const reason = created.emailStatus.reason || "email delivery was skipped";
        showMessage(`${confirmationMessage} (Email not sent: ${reason})`, "success");
      } else {
        showMessage(`${confirmationMessage} (Confirmation email sent)`, "success");
      }
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  async function cancelAppointment(apptId) {
    try {
      let updated;
      try {
        updated = await apiFetch(`/appointments/${apptId}/cancel`, {
          method: "PATCH",
        });
      } catch {
        updated = await apiFetch(`/appointments/${apptId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        });
      }

      setAllData((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          a.id === apptId ? { ...a, status: "cancelled" } : a
        ),
      }));

      const baseMessage = updated?.message || "✓ Appointment cancelled";
      if (updated?.emailStatus?.skipped) {
        const reason = updated.emailStatus.reason || "email delivery was skipped";
        showMessage(`${baseMessage} (Email not sent: ${reason})`, "success");
      } else {
        showMessage(`${baseMessage} (Cancellation email sent)`, "success");
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
          body: JSON.stringify({
            appointmentDate: newDate,
            appointmentTime: newTime,
          }),
        });
      } catch {
        updated = await apiFetch(`/appointments/${apptId}`, {
          method: "PATCH",
          body: JSON.stringify({
            appointmentDate: newDate,
            appointmentTime: newTime,
          }),
        });
      }

      setAllData((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          a.id === apptId
            ? { ...a, appointmentDate: newDate, appointmentTime: newTime }
            : a
        ),
      }));

      const baseMessage = updated?.message || "✓ Appointment rescheduled!";
      if (updated?.emailStatus?.skipped) {
        const reason = updated.emailStatus.reason || "email delivery was skipped";
        showMessage(`${baseMessage} (Email not sent: ${reason})`, "success");
      } else {
        showMessage(`${baseMessage} (Reschedule email sent)`, "success");
      }
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  return {
    openDoctorDetails,
    closeDoctorDetails,
    selectTimeSlot,
    bookAppointmentSubmit,
    cancelAppointment,
    rescheduleAppointment,
  };
}