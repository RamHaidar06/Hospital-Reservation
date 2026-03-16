import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../API/http";
import { normalizeArray, normalizeId } from "../utils/normalize";

// Decode JWT payload locally (no network, no verification) to read the role.
function getTokenRole(token) {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload.role || null;
  } catch {
    return null;
  }
}

function toReviewsArray(data) {
  return normalizeArray(Array.isArray(data) ? data : data?.reviews || []);
}

export default function useSessionReviews({
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
  const [isReviewsLoading, setIsReviewsLoading] = useState(() =>
    Boolean(localStorage.getItem("token"))
  );
  const [isReviewsError, setIsReviewsError] = useState(false);

  // Tracks which user's reviews are already in state to prevent duplicate fetches.
  const lastFetchedForId = useRef(null);

  // ── Session restore ────────────────────────────────────────────────────────
  // Runs once on mount. Fires /users/me, /appointments/mine and /reviews/*
  // ALL IN PARALLEL so there is only one round-trip delay on refresh.
  // No secondary effect exists — this is the only path for session-restored logins.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsReviewsLoading(false);
      return;
    }

    const role = getTokenRole(token);
    const reviewsEndpoint =
      role === "doctor" ? "/reviews/doctor" :
      role === "patient" ? "/reviews/patient" :
      null;

    let cancelled = false;

    Promise.allSettled([
      apiFetch("/users/me"),
      apiFetch("/appointments/mine"),
      reviewsEndpoint ? apiFetch(reviewsEndpoint) : Promise.resolve([]),
    ]).then(([meResult, appointmentsResult, reviewsResult]) => {
      if (cancelled) return;

      // ── user / session ──
      if (meResult.status === "fulfilled") {
        const user = normalizeId(meResult.value);

        if (user.role === "doctor") {
          setLoggedInDoctor(user);
          setLoggedInPatient(null);
          setDoctorTab("profile");
          setPage("doctor");
          setWorkingDaysDraft(
            new Set((user.workingDays || "").split(",").filter(Boolean))
          );
          setStartTimeDraft(user.startTime || "09:00");
          setEndTimeDraft(user.endTime || "17:00");
        } else if (user.role === "patient") {
          setLoggedInPatient(user);
          setLoggedInDoctor(null);
          setPatientTab("profile");
          setPage("patient");
        }

        lastFetchedForId.current = String(user.id || user._id || "");
      } else {
        localStorage.removeItem("token");
      }

      // ── appointments ──
      if (appointmentsResult.status === "fulfilled") {
        setAllData((prev) => ({
          ...prev,
          appointments: normalizeArray(appointmentsResult.value),
        }));
      }

      // ── reviews ──
      if (reviewsResult.status === "fulfilled") {
        setReviews(toReviewsArray(reviewsResult.value));
        setIsReviewsError(false);
      } else {
        setIsReviewsError(true);
      }

      setIsReviewsLoading(false);
    });

    return () => {
      cancelled = true;
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

  // ── Called directly by login handlers ─────────────────────────────────────
  // This is the only other place reviews are fetched.
  // No useEffect watches currentDoctor/currentPatient — that was the race source.
  async function fetchReviewsForUser(userId, role) {
    const id = String(userId || "");
    if (id && id === lastFetchedForId.current) return;

    setIsReviewsLoading(true);
    setIsReviewsError(false);

    const endpoint = role === "doctor" ? "/reviews/doctor" : "/reviews/patient";

    try {
      const data = await apiFetch(endpoint);
      setReviews(toReviewsArray(data));
      lastFetchedForId.current = id;
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setReviews([]);
      setIsReviewsError(true);
    } finally {
      setIsReviewsLoading(false);
    }
  }

  return {
    reviews,
    setReviews,
    isReviewsLoading,
    isReviewsError,
    fetchReviewsForUser,
    resetReviews: () => {
      setReviews([]);
      setIsReviewsError(false);
      lastFetchedForId.current = null;
    },
  };
}