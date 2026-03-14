import { apiFetch } from "../API/http";
import { normalizeId } from "../utils/normalize";

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
      setPatientTab("upcoming");
      showMessage("✓ Appointment booked successfully!", "success");
    } catch (err) {
      showMessage("✗ " + err.message, "error");
    }
  }

  async function cancelAppointment(apptId) {
    try {
      try {
        await apiFetch(`/appointments/${apptId}/cancel`, {
          method: "PATCH",
        });
      } catch {
        await apiFetch(`/appointments/${apptId}`, {
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
      try {
        await apiFetch(`/appointments/${apptId}/reschedule`, {
          method: "PATCH",
          body: JSON.stringify({
            appointmentDate: newDate,
            appointmentTime: newTime,
          }),
        });
      } catch {
        await apiFetch(`/appointments/${apptId}`, {
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

      showMessage("✓ Appointment rescheduled!", "success");
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