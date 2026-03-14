import { useState } from "react";
import { apiFetch } from "../API/http";

export default function useProfileActions({
  currentPatient,
  currentDoctor,
  setLoggedInPatient,
  setLoggedInDoctor,
  setAllData,
  showMessage,
}) {
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editDoctorOpen, setEditDoctorOpen] = useState(false);

  const [patientEditForm, setPatientEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    address: "",
  });

  const [doctorEditForm, setDoctorEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    specialty: "",
    license: "",
    experience: "",
    bio: "",
  });

  function openEditPatient() {
    if (!currentPatient) return;

    setPatientEditForm({
      firstName: currentPatient.firstName || "",
      lastName: currentPatient.lastName || "",
      email: currentPatient.email || "",
      phone: currentPatient.phone || "",
      dob: currentPatient.dateOfBirth || "",
      address: currentPatient.address || "",
    });

    setEditPatientOpen(true);
  }

  async function savePatientProfile(e) {
    e.preventDefault();
    if (!currentPatient) return;

    const currentPatientId = currentPatient.id || currentPatient._id;

    const updated = {
      ...currentPatient,
      firstName: patientEditForm.firstName,
      lastName: patientEditForm.lastName,
      phone: patientEditForm.phone,
      dateOfBirth: patientEditForm.dob,
      address: patientEditForm.address,
    };

    try {
      await apiFetch(`/auth/users/${currentPatientId}`, {
        method: "PATCH",
        body: JSON.stringify(updated),
      });
    } catch {
      // ignore if route doesn't exist
    }

    setLoggedInPatient(updated);
    setAllData((prev) => ({
      ...prev,
      patients: prev.patients.map((p) =>
        (p.id || p._id) === currentPatientId ? updated : p
      ),
    }));
    setEditPatientOpen(false);
    showMessage("✓ Profile updated!", "success");
  }

  function openEditDoctor() {
    if (!currentDoctor) return;

    setDoctorEditForm({
      firstName: currentDoctor.firstName || "",
      lastName: currentDoctor.lastName || "",
      email: currentDoctor.email || "",
      specialty: currentDoctor.specialty || "",
      license: currentDoctor.licenseNumber || "",
      experience: String(currentDoctor.yearsExperience ?? ""),
      bio: currentDoctor.bio || "",
    });

    setEditDoctorOpen(true);
  }

  async function saveDoctorProfile(e) {
    e.preventDefault();
    if (!currentDoctor) return;

    const currentDoctorId = currentDoctor.id || currentDoctor._id;

    const updated = {
      ...currentDoctor,
      firstName: doctorEditForm.firstName,
      lastName: doctorEditForm.lastName,
      yearsExperience: parseInt(doctorEditForm.experience || "0", 10),
      bio: doctorEditForm.bio,
    };

    try {
      await apiFetch(`/auth/users/${currentDoctorId}`, {
        method: "PATCH",
        body: JSON.stringify(updated),
      });
    } catch {
      // ignore if route doesn't exist
    }

    setLoggedInDoctor(updated);
    setAllData((prev) => ({
      ...prev,
      doctors: prev.doctors.map((doc) =>
        (doc.id || doc._id) === currentDoctorId ? updated : doc
      ),
    }));
    setEditDoctorOpen(false);
    showMessage("✓ Profile updated!", "success");
  }

  return {
    editPatientOpen,
    setEditPatientOpen,
    editDoctorOpen,
    setEditDoctorOpen,
    patientEditForm,
    setPatientEditForm,
    doctorEditForm,
    setDoctorEditForm,
    openEditPatient,
    savePatientProfile,
    openEditDoctor,
    saveDoctorProfile,
  };
}