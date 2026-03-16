import { useEffect, useState } from "react";
import { apiFetch } from "../API/http";
import { normalizeArray, normalizeId } from "../utils/normalize";

export default function useSessionReviews({
  currentDoctor,
  currentPatient,
  setAllData,
  setLoggedInDoctor,
  setLoggedInPatient,
  setPage,
  setPatientTab,
  setDoctorTab,
  setWorkingDaysDraft,
  setStartTimeDraft,
  setEndTimeDraft,
}) {
  const [reviews, setReviews] = useState([]);
  const [isSessionRestoring, setIsSessionRestoring] = useState(() =>
    Boolean(localStorage.getItem("token"))
  );
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsSessionRestoring(false);
        return;
      }

      try {
        const me = await apiFetch("/users/me");
        const user = normalizeId(me);

        let appointments = [];
        try {
          const mine = await apiFetch("/appointments/mine");
          appointments = normalizeArray(mine);
        } catch {
          appointments = [];
        }

        if (isCancelled) return;

        setAllData((prev) => ({
          ...prev,
          appointments,
        }));

        if (user.role === "doctor") {
          setLoggedInDoctor(user);
          setLoggedInPatient(null);
          setDoctorTab("profile");
          setPage("doctor");

          const workingDays = new Set(
            (user.workingDays || "").split(",").filter(Boolean)
          );

          setWorkingDaysDraft(workingDays);
          setStartTimeDraft(user.startTime || "09:00");
          setEndTimeDraft(user.endTime || "17:00");
        } else if (user.role === "patient") {
          setLoggedInPatient(user);
          setLoggedInDoctor(null);
          setPatientTab("profile");
          setPage("patient");
        }
      } catch {
        localStorage.removeItem("token");
      } finally {
        if (!isCancelled) {
          setIsSessionRestoring(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    setAllData,
    setDoctorTab,
    setEndTimeDraft,
    setLoggedInDoctor,
    setLoggedInPatient,
    setPage,
    setPatientTab,
    setStartTimeDraft,
    setWorkingDaysDraft,
  ]);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      const token = localStorage.getItem("token");
      if (!token || (!currentDoctor && !currentPatient)) {
        setReviews([]);
        setIsReviewsLoading(false);
        return;
      }

      setIsReviewsLoading(true);

      try {
        const endpoint = currentDoctor ? "/reviews/doctor" : "/reviews/patient";
        const data = await apiFetch(endpoint);
        const nextReviews = normalizeArray(
          Array.isArray(data) ? data : data?.reviews || []
        );

        if (!isCancelled) {
          setReviews(nextReviews);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
        if (!isCancelled) {
          setReviews([]);
        }
      } finally {
        if (!isCancelled) {
          setIsReviewsLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [currentDoctor, currentPatient]);

  return {
    reviews,
    setReviews,
    isSessionRestoring,
    isReviewsLoading,
  };
}