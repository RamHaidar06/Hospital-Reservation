import { useState } from "react";

export default function DoctorDashboard({ doctor, logout, showMessage }) {
  const [tab, setTab] = useState("profile");

  return (
    <div className="flex h-screen">
      <aside className="sidebar w-64 flex-shrink-0 border-r border-cyan-900 p-4">
        <h3 className="text-white font-semibold mb-6">Provider Portal</h3>
        {["profile", "appointments", "patients", "timeslots", "reviews"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`sidebar-item w-full text-left mb-2 ${tab === t ? "active" : ""}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button onClick={() => { logout(); showMessage("✓ Logged out successfully"); }} className="btn-secondary w-full mt-6">
          Logout
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {tab === "profile" && (
          <div className="glass-card p-8">
            <h3 className="text-xl font-semibold mb-4">Your Profile</h3>
            <p><strong>Name:</strong> {doctor.full_name}</p>
            <p><strong>Email:</strong> {doctor.email}</p>
            <p><strong>Specialty:</strong> {doctor.specialty}</p>
          </div>
        )}
        {tab === "appointments" && <p className="text-gray-400">Your appointments will appear here.</p>}
        {tab === "patients" && <p className="text-gray-400">Your patients will appear here.</p>}
        {tab === "timeslots" && <p className="text-gray-400">Your time slots will appear here.</p>}
        {tab === "reviews" && <p className="text-gray-400">Your reviews will appear here.</p>}
      </main>
    </div>
  );
}

