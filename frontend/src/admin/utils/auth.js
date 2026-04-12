import { apiFetch } from "../../API/http";

function decodePayload(token) {
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;

    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getAuthToken() {
  return localStorage.getItem("token") || "";
}

export function getSessionRole() {
  const token = getAuthToken();
  if (!token) return null;
  return decodePayload(token)?.role || null;
}

export function isAdminSession() {
  return getSessionRole() === "admin";
}

export async function fetchAdminMe() {
  return apiFetch("/users/me");
}

export function clearSession() {
  localStorage.removeItem("token");
}
