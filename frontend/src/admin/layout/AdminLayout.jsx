import { useState } from "react";
import { clearSession } from "../utils/auth";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/doctors", label: "Doctors" },
  { to: "/admin/patients", label: "Patients" },
  { to: "/admin/appointments", label: "Appointments" },
  { to: "/admin/settings", label: "Settings" },
];

function titleForPath(pathname) {
  if (pathname.includes("doctors")) return "Doctors Management";
  if (pathname.includes("patients")) return "Patients Management";
  if (pathname.includes("appointments")) return "Appointments Management";
  if (pathname.includes("settings")) return "Admin Settings";
  return "Admin Dashboard";
}

function sectionTag(pathname) {
  if (pathname.includes("doctors")) return "Doctor Moderation";
  if (pathname.includes("patients")) return "Patient Directory";
  if (pathname.includes("appointments")) return "Schedule Control";
  if (pathname.includes("settings")) return "System Configuration";
  return "Operational Overview";
}

export default function AdminLayout({ currentPath, children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function navigateTo(path) {
    if (window.location.pathname !== path) {
      window.location.assign(path);
    }
  }

  function handleLogout() {
    clearSession();
    window.location.assign("/admin");
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${isMenuOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <div className="admin-brand-badge">M</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>MediCare Admin</p>
            <p style={{ margin: "2px 0 0", opacity: 0.8, fontSize: "0.8rem" }}>Operations Console</p>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.to}
              type="button"
              className={`admin-nav-link ${currentPath === item.to ? "active" : ""}`}
              onClick={() => {
                setIsMenuOpen(false);
                navigateTo(item.to);
              }}
            >
              {item.label}
            </button>
          ))}

          <button type="button" className="admin-nav-link" onClick={handleLogout}>Logout</button>
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-page-title">{titleForPath(currentPath)}</h1>
            <p className="admin-subtitle">Private administration area for clinic operations.</p>
            <span className="admin-chip completed" style={{ marginTop: 8 }}>{sectionTag(currentPath)}</span>
          </div>
          <div className="admin-row">
            <button type="button" className="admin-btn secondary" onClick={() => setIsMenuOpen((value) => !value)}>
              Toggle Menu
            </button>
            <button type="button" className="admin-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </section>
    </div>
  );
}
