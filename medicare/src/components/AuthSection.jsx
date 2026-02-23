import { useState } from "react";

export default function AuthSection({ showMessage, setLoggedInDoctor }) {
  const [tab, setTab] = useState("patient");

  const handleDoctorLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    setLoggedInDoctor({ full_name: "Dr. Sample Doctor", email, specialty: "Cardiology" });
    showMessage("✓ Welcome to your dashboard!");
  };

  return (
    <section id="auth" className="py-20 px-6 bg-[rgba(26,40,81,0.3)]">
      <div className="max-w-md mx-auto">
        <div className="tab-switch flex gap-2 bg-[rgba(26,40,81,0.5)] p-2 rounded-xl border border-cyan-900 mb-8">
          <button className={`tab-btn flex-1 ${tab === "patient" ? "active" : ""}`} onClick={() => setTab("patient")}>Patient</button>
          <button className={`tab-btn flex-1 ${tab === "doctor" ? "active" : ""}`} onClick={() => setTab("doctor")}>Doctor</button>
        </div>

        {tab === "patient" ? (
          <div className="glass p-10">
            <h3 className="text-xl font-semibold mb-4 text-center">Patient Login</h3>
            <form onSubmit={(e) => { e.preventDefault(); showMessage("✓ Patient login ready"); }}>
              <input type="text" placeholder="Email or Phone" className="input-field mb-4" required />
              <input type="password" placeholder="Password" className="input-field mb-6" required />
              <button type="submit" className="btn-primary w-full">Sign In</button>
            </form>
          </div>
        ) : (
          <div className="glass p-10">
            <h3 className="text-xl font-semibold mb-4 text-center">Doctor Login</h3>
            <form onSubmit={handleDoctorLogin}>
              <input name="email" type="email" placeholder="doctor@medicare.io" className="input-field mb-4" required />
              <input type="password" placeholder="Password" className="input-field mb-6" required />
              <button type="submit" className="btn-primary w-full">Sign In</button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}