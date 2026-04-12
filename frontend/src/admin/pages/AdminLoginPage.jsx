import { useState } from "react";
import { apiFetch } from "../../API/http";
import { isAdminSession } from "../utils/auth";

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (!data?.token || data?.user?.role !== "admin") {
        throw new Error("This account does not have admin access.");
      }

      localStorage.setItem("token", data.token);
      if (isAdminSession()) {
        window.location.assign("/admin/dashboard");
      } else {
        throw new Error("Failed to validate admin session.");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <h2 style={{ margin: "0 0 6px", fontSize: "1.6rem" }}>Admin Sign In</h2>
        <p className="admin-muted" style={{ marginTop: 0 }}>This area is restricted to authorized administrators.</p>

        {error ? <p className="admin-banner error">{error}</p> : null}

        <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
          Email
          <input
            className="admin-input"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
          Password
          <input
            className="admin-input"
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
        </label>

        <div className="admin-row" style={{ marginTop: 16, justifyContent: "space-between" }}>
          <button type="button" className="admin-btn secondary" onClick={() => window.location.assign("/")}>Back To Website</button>
          <button type="submit" className="admin-btn primary" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </form>
    </div>
  );
}
