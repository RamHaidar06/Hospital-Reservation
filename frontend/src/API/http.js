const API_BASE = "http://localhost:3000/api";

// Default timeout — most requests
const DEFAULT_TIMEOUT_MS = 10_000;

// Longer timeout for endpoints that send emails (OTP, notifications)
const SLOW_ENDPOINTS = ["/auth/login-with-otp", "/auth/send-otp", "/auth/verify-otp"];
const SLOW_TIMEOUT_MS = 30_000;

export function getToken() {
  return localStorage.getItem("token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const isSlow = SLOW_ENDPOINTS.some((ep) => path.includes(ep));
  const timeoutMs = isSlow ? SLOW_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data?.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}