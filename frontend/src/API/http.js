const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 10_000;

export function getToken() {
  return localStorage.getItem("token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const method = (options.method || "GET").toUpperCase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = `${API_BASE}${path}`;

  try {
    let res;
    try {
      res = await fetch(url, {
        ...options,
        method,
        signal: controller.signal,
        headers: {
          ...(method !== "GET" && method !== "HEAD" ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });
    } catch (networkError) {
      if (networkError?.name === "AbortError") {
        throw new Error(`Request timed out (${method} ${url})`);
      }
      throw new Error(`Network error (${method} ${url})`);
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data?.message || data?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}