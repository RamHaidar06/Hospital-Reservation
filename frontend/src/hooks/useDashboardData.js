import { useMemo } from "react";
import { normalizeId } from "../utils/normalize";
import { generateTimeSlots } from "../utils/slots";

function extractId(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return String(value.id || value._id || "");
}

function sameId(a, b) {
  return extractId(a) !== "" && extractId(a) === extractId(b);
}

function toAppointmentDateTime(appointment) {
  const date = appointment?.appointmentDate;
  const time = appointment?.appointmentTime || "00:00";

  if (!date) return new Date(0);

  // Supports legacy dd/mm/yyyy values in addition to ISO yyyy-mm-dd.
  const asString = String(date);
  const dmy = asString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    const dateTime = new Date(`${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}T${time}:00`);
    if (!Number.isNaN(dateTime.getTime())) return dateTime;
  }

  const dateTime = new Date(`${date}T${time}:00`);
  if (!Number.isNaN(dateTime.getTime())) return dateTime;

  const fallback = new Date(date);
  return Number.isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

function hasValidAppointmentDateTime(appointment) {
  const dt = toAppointmentDateTime(appointment);
  return !Number.isNaN(dt.getTime()) && dt.getTime() !== 0;
}

export default function useDashboardData({
  allData,
  loggedInDoctor,
  loggedInPatient,
}) {
  const currentDoctor = useMemo(() => {
    if (!loggedInDoctor) return null;
    const id = loggedInDoctor.id || loggedInDoctor._id;

    return (
      allData.doctors.find((d) => (d.id || d._id) === id) ||
      normalizeId(loggedInDoctor)
    );
  }, [loggedInDoctor, allData.doctors]);

  const currentPatient = useMemo(() => {
    if (!loggedInPatient) return null;
    const id = loggedInPatient.id || loggedInPatient._id;

    return (
      allData.patients.find((p) => (p.id || p._id) === id) ||
      normalizeId(loggedInPatient)
    );
  }, [loggedInPatient, allData.patients]);

  const doctorSlots = useMemo(() => {
    if (!currentDoctor) return [];
    return generateTimeSlots(currentDoctor);
  }, [currentDoctor]);

  const patientUpcoming = useMemo(() => {
    if (!currentPatient) return [];

    const activeStatuses = new Set(["pending", "confirmed"]);

    return (allData.appointments || [])
      .filter((a) => {
        if (a.status === "cancelled") return false;
        return activeStatuses.has(a.status);
      })
      .sort(
        (a, b) => toAppointmentDateTime(a) - toAppointmentDateTime(b)
      );
  }, [allData.appointments, currentPatient]);

  const patientPast = useMemo(() => {
    if (!currentPatient) return [];

    return (allData.appointments || [])
      .filter((a) => {
        if (a.status === "cancelled") return false;
        return a.status === "completed";
      })
      .sort(
        (a, b) => toAppointmentDateTime(b) - toAppointmentDateTime(a)
      );
  }, [allData.appointments, currentPatient]);

  const visibleDoctors = useMemo(() => {
    return (allData.doctors || []).slice(0, 6);
  }, [allData.doctors]);

  const doctorAppointments = useMemo(() => {
    if (!currentDoctor) return [];

    return (allData.appointments || []).filter(
      (a) =>
        sameId(a.doctorId, currentDoctor) &&
        a.status !== "cancelled"
    );
  }, [allData.appointments, currentDoctor]);

  return {
    currentDoctor,
    currentPatient,
    doctorSlots,
    patientUpcoming,
    patientPast,
    visibleDoctors,
    doctorAppointments,
  };
}