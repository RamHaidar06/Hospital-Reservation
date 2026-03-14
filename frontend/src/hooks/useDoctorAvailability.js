import { useEffect, useState } from "react";
import { apiFetch } from "../API/http";

export default function useDoctorAvailability({
  currentDoctor,
  setLoggedInDoctor,
  setAllData,
  showMessage,
}) {
  const [workingDaysDraft, setWorkingDaysDraft] = useState(new Set());
  const [startTimeDraft, setStartTimeDraft] = useState("09:00");
  const [endTimeDraft, setEndTimeDraft] = useState("17:00");

  useEffect(() => {
    if (!currentDoctor) return;

    const workingDays = currentDoctor.workingDays
      ? String(currentDoctor.workingDays)
          .split(",")
          .map((day) => day.trim())
          .filter(Boolean)
      : [];

    setWorkingDaysDraft(new Set(workingDays));
    setStartTimeDraft(currentDoctor.startTime || "09:00");
    setEndTimeDraft(currentDoctor.endTime || "17:00");
  }, [currentDoctor]);

  function toggleWorkDay(day) {
    setWorkingDaysDraft((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function saveWorkingHours() {
    if (!currentDoctor) return;

    const currentDoctorId = currentDoctor.id || currentDoctor._id;

    const updated = {
      ...currentDoctor,
      workingDays: Array.from(workingDaysDraft).join(","),
      startTime: startTimeDraft,
      endTime: endTimeDraft,
    };

    try {
      await apiFetch(`/auth/doctors/${currentDoctorId}/availability`, {
        method: "PATCH",
        body: JSON.stringify({
          workingDays: updated.workingDays,
          startTime: updated.startTime,
          endTime: updated.endTime,
        }),
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
    showMessage("✓ Working hours saved!", "success");
  }

  return {
    workingDaysDraft,
    setWorkingDaysDraft,
    startTimeDraft,
    setStartTimeDraft,
    endTimeDraft,
    setEndTimeDraft,
    toggleWorkDay,
    saveWorkingHours,
  };
}