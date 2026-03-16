import { useMemo } from "react";
import { normalizeId } from "../utils/normalize";
import { generateTimeSlots } from "../utils/slots";

function extractId(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return String(value.id || value._id || "");
}

function toAppointmentDateTime(appointment) {
  const date = appointment?.appointmentDate;
  const time = appointment?.appointmentTime || "00:00";

  if (!date) return new Date(0);

  const dateTime = new Date(`${date}T${time}:00`);
  if (!Number.isNaN(dateTime.getTime())) return dateTime;

  const fallback = new Date(date);
  return Number.isNaN(fallback.getTime()) ? new Date(0) : fallback;
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

    const patientId = extractId(currentPatient);
    const now = new Date();

    return (allData.appointments || [])
      .filter(
        (a) =>
          extractId(a.patientId) === patientId &&
          toAppointmentDateTime(a) >= now &&
          a.status !== "cancelled"
      )
      .sort(
        (a, b) => toAppointmentDateTime(a) - toAppointmentDateTime(b)
      );
  }, [allData.appointments, currentPatient]);

  const patientPast = useMemo(() => {
    if (!currentPatient) return [];

    const patientId = extractId(currentPatient);
    const now = new Date();

    return (allData.appointments || [])
      .filter(
        (a) =>
          extractId(a.patientId) === patientId &&
          toAppointmentDateTime(a) < now &&
          a.status !== "cancelled"
      )
      .sort(
        (a, b) => toAppointmentDateTime(b) - toAppointmentDateTime(a)
      );
  }, [allData.appointments, currentPatient]);

  const visibleDoctors = useMemo(() => {
    return (allData.doctors || []).slice(0, 6);
  }, [allData.doctors]);

  const doctorAppointments = useMemo(() => {
    if (!currentDoctor) return [];

    const doctorId = extractId(currentDoctor);

    return (allData.appointments || []).filter(
      (a) =>
        extractId(a.doctorId) === doctorId &&
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