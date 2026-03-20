import { useEffect } from "react";
import { apiFetch } from "../API/http";
import { normalizeArray } from "../utils/normalize";

export default function useAppBootstrap({ setAllData, showMessage }) {
  useEffect(() => {
    (async () => {
      try {
        const docs = await apiFetch("/users/doctors");
        const doctors = normalizeArray(docs);

        setAllData((prev) => ({
          ...prev,
          doctors,
        }));
      } catch {
        // Bootstrap failure is non-critical — session restore in useSessionReviews
        // handles auth and appointments. Silently ignore so the UI does not show
        // an alarming error when the backend is momentarily slow to respond.
      }
    })();
  }, [setAllData, showMessage]);
}