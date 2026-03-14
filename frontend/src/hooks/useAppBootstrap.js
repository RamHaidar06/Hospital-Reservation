import { useEffect } from "react";
import { apiFetch } from "../API/http";
import { normalizeArray } from "../utils/normalize";

export default function useAppBootstrap({ setAllData, showMessage }) {
  useEffect(() => {
    (async () => {
      try {
        const docs = await apiFetch("/users/doctors");
        const doctors = normalizeArray(docs);

        let appointments = [];
        try {
          const mine = await apiFetch("/appointments/mine");
          appointments = normalizeArray(mine);
        } catch {
          appointments = [];
        }

        setAllData((prev) => ({
          ...prev,
          doctors,
          appointments,
        }));
      } catch (e) {
        showMessage("✗ Failed loading data: " + e.message, "error");
      }
    })();
  }, [setAllData, showMessage]);
}