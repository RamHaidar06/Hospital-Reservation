import { useMemo } from "react";
import { normalizeId } from "../utils/normalize";
import { generateTimeSlots } from "../utils/slots";

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

    return (allData.appointments || [])
      .filter(
        (a) =>
          (a.patientId === currentPatient.id ||
            a.patientId === currentPatient._id) &&
          new Date(a.appointmentDate) >= new Date() &&
          a.status !== "cancelled"
      )
      .sort(
        (a, b) =>
          new Date(a.appointmentDate) - new Date(b.appointmentDate)
      );
  }, [allData.appointments, currentPatient]);

  const patientPast = useMemo(() => {
    if (!currentPatient) return [];

    return (allData.appointments || [])
      .filter(
        (a) =>
          (a.patientId === currentPatient.id ||
            a.patientId === currentPatient._id) &&
          new Date(a.appointmentDate) < new Date()
      )
      .sort(
        (a, b) =>
          new Date(b.appointmentDate) - new Date(a.appointmentDate)
      );
  }, [allData.appointments, currentPatient]);

  const visibleDoctors = useMemo(() => {
    return (allData.doctors || []).slice(0, 6);
  }, [allData.doctors]);

  const doctorAppointments = useMemo(() => {
    if (!currentDoctor) return [];

    return (allData.appointments || []).filter(
      (a) =>
        (a.doctorId === currentDoctor.id ||
          a.doctorId === currentDoctor._id) &&
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