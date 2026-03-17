import React, { useState } from "react";
import VisitSummary from "./VisitSummary";

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible section component
// ─────────────────────────────────────────────────────────────────────────────
function AppointmentSection({ title, count, color, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Section header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          background: "rgba(0,217,255,0.04)",
          border: `1px solid ${color}33`,
          borderRadius: open ? "10px 10px 0 0" : 10,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseOver={(e) => e.currentTarget.style.background = "rgba(0,217,255,0.08)"}
        onMouseOut={(e)  => e.currentTarget.style.background = "rgba(0,217,255,0.04)"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            display: "inline-block", width: 10, height: 10,
            borderRadius: "50%", background: color, flexShrink: 0,
          }} />
          <span style={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>{title}</span>
          <span style={{
            background: `${color}22`, color, border: `1px solid ${color}55`,
            borderRadius: 20, padding: "2px 10px", fontSize: "0.78rem", fontWeight: 700,
          }}>
            {count}
          </span>
        </div>
        <span style={{ color: "var(--text-secondary)", fontSize: "1.1rem", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          ▼
        </span>
      </button>

      {/* Collapsible content */}
      {open && (
        <div style={{
          border: `1px solid ${color}33`, borderTop: "none",
          borderRadius: "0 0 10px 10px",
          padding: "12px 12px 4px 12px",
          background: "rgba(0,0,0,0.15)",
        }}>
          {count === 0
            ? <p style={{ color: "var(--text-secondary)", padding: "8px 4px", margin: 0 }}>No {title.toLowerCase()} appointments.</p>
            : children
          }
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single appointment card inside the doctor's panel
// ─────────────────────────────────────────────────────────────────────────────
function DoctorApptCard({ appt, patient, isCompleted, isPending, saveVisitSummary, markAsCompleted }) {
  const apptId      = appt.id || appt._id;
  const borderColor = isCompleted ? "rgba(16,185,129,0.5)" : isPending ? "#f59e0b" : "var(--cyan-bright)";
  const statusColor = isCompleted ? "#10b981" : isPending ? "#f59e0b" : "var(--cyan-bright)";

  return (
    <div className="glass-card" style={{ padding: 18, marginBottom: 10, borderLeft: `4px solid ${borderColor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <p style={{ fontWeight: 600, margin: 0, color: "white" }}>
          {patient?.firstName || "Patient"} {patient?.lastName || ""}
        </p>

        {/* Mark as Completed button — only on confirmed appointments */}
        {!isCompleted && !isPending && (
          <button
            onClick={() => markAsCompleted(apptId)}
            style={{
              fontSize: "0.78rem", fontWeight: 700, padding: "5px 12px",
              borderRadius: 6, border: "1px solid rgba(16,185,129,0.4)",
              background: "rgba(16,185,129,0.1)", color: "#10b981",
              cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s",
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(16,185,129,0.2)"}
            onMouseOut={(e)  => e.currentTarget.style.background = "rgba(16,185,129,0.1)"}
          >
            ✓ Mark as Completed
          </button>
        )}
      </div>

      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "4px 0" }}>
        📅 {new Date(appt.appointmentDate).toLocaleDateString()} at {appt.appointmentTime}
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "4px 0" }}>Reason: {appt.reason}</p>
      <p style={{ fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "4px 0 0 0", color: statusColor }}>
        {appt.status}
      </p>

      {isCompleted && (
        <VisitSummary
          appointmentId={apptId}
          initialSummary={appt.visitSummary || ""}
          updatedAt={appt.visitSummaryUpdatedAt || null}
          isDoctor={true}
          onSave={saveVisitSummary}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DoctorDashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function DoctorDashboard({
  page,
  currentDoctor,
  logoutDoctor,
  doctorTab,
  setDoctorTab,
  openEditDoctor,
  workingDaysDraft,
  toggleWorkDay,
  startTimeDraft,
  setStartTimeDraft,
  endTimeDraft,
  setEndTimeDraft,
  saveWorkingHours,
  doctorSlots,
  allData,
  doctorAppointments,
  isReviewsLoading = false,
  isReviewsError   = false,
  doctorReviews    = [],
  saveVisitSummary,
  markAsCompleted,
}) {
  if (page !== "doctor" || !currentDoctor) return null;

  const asId = (v) => {
    if (!v) return "";
    if (typeof v === "string" || typeof v === "number") return String(v);
    return String(v.id || v._id || "");
  };

  const confirmed  = doctorAppointments.filter((a) => a.status === "confirmed");
  const pending    = doctorAppointments.filter((a) => a.status === "pending");
  const completed  = doctorAppointments.filter((a) => a.status === "completed");

  return (
    <div className="w-full h-full flex flex-col">
      <header style={{
        background: "linear-gradient(135deg, rgba(26,40,81,0.8), rgba(15,23,42,0.6))",
        borderBottom: "1px solid rgba(0,217,255,0.1)",
        padding: "20px 32px", backdropFilter: "blur(15px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1400, margin: "0 auto" }}>
          <h2 style={{ margin: 0, fontSize: "1.75rem" }}>Doctor Dashboard</h2>
          <button onClick={logoutDoctor} className="btn-secondary" style={{ fontSize: "0.85rem", padding: "10px 20px" }}>Logout</button>
        </div>
      </header>

      <div className="tab-switch" style={{ maxWidth: 1400, margin: "32px auto", padding: "0 32px", width: "calc(100% - 64px)" }}>
        <button className={`tab-btn ${doctorTab === "profile"       ? "active" : ""}`} onClick={() => setDoctorTab("profile")}>👤 Profile</button>
        <button className={`tab-btn ${doctorTab === "availability"  ? "active" : ""}`} onClick={() => setDoctorTab("availability")}>⏰ Availability</button>
        <button className={`tab-btn ${doctorTab === "appointments"  ? "active" : ""}`} onClick={() => setDoctorTab("appointments")}>📅 Appointments</button>
        <button className={`tab-btn ${doctorTab === "reviews"       ? "active" : ""}`} onClick={() => setDoctorTab("reviews")}>⭐ Reviews</button>
      </div>

      <main className="flex-1 overflow-auto" style={{ padding: "0 32px 32px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>

        {/* ── PROFILE ── */}
        {doctorTab === "profile" && (
          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <h3 style={{ margin: 0 }}>Your Profile</h3>
              <button onClick={openEditDoctor} className="btn-secondary" style={{ fontSize: "0.85rem" }}>Edit Profile</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 24 }}>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 8px 0" }}>Full Name</p>
                <p style={{ color: "white", fontWeight: 600, margin: 0, fontSize: "1.1rem" }}>Dr. {currentDoctor.firstName} {currentDoctor.lastName}</p>
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 8px 0" }}>Specialty</p>
                <p style={{ color: "white", fontWeight: 600, margin: 0 }}>{currentDoctor.specialty || "N/A"}</p>
              </div>
              <div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 8px 0" }}>License</p>
                <p style={{ color: "white", fontWeight: 600, margin: 0 }}>{currentDoctor.licenseNumber || "N/A"}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── AVAILABILITY ── */}
        {doctorTab === "availability" && (
          <div className="glass-card" style={{ padding: 32 }}>
            <h3 style={{ marginTop: 0, marginBottom: 24 }}>Set Your Working Hours</h3>
            <div style={{ display: "grid", gap: 16 }}>
              {[["Monday","monday"],["Tuesday","tuesday"],["Wednesday","wednesday"],
                ["Thursday","thursday"],["Friday","friday"],["Saturday","saturday"],["Sunday","sunday"]
              ].map(([label, value]) => (
                <div key={value} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: 12,
                  alignItems: "center", padding: 16, background: "rgba(0,217,255,0.05)", borderRadius: 8,
                }}>
                  <input type="checkbox" className="checkbox-custom" checked={workingDaysDraft.has(value)} onChange={() => toggleWorkDay(value)} />
                  <label style={{ color: "white", fontWeight: 500, margin: 0 }}>{label}</label>
                  <input type="time" className="input-field" style={{ padding: 8 }} value={startTimeDraft} onChange={(e) => setStartTimeDraft(e.target.value)} />
                  <input type="time" className="input-field" style={{ padding: 8 }} value={endTimeDraft}   onChange={(e) => setEndTimeDraft(e.target.value)} />
                </div>
              ))}
            </div>
            <button onClick={saveWorkingHours} className="btn-primary" style={{ marginTop: 24, padding: "14px 32px" }}>Save Working Hours</button>

            <div style={{ borderTop: "1px solid rgba(0,217,255,0.1)", paddingTop: 32, marginTop: 32 }}>
              <h3 style={{ marginTop: 0 }}>Available Time Slots (Preview)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 16, marginTop: 16 }}>
                {doctorSlots.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>No available slots configured.</p>
                ) : (
                  doctorSlots.slice(0, 14).map((slot) => {
                    const isBooked = (allData.appointments || []).some(
                      (a) => a.doctorId === currentDoctor.id &&
                             a.appointmentDate === slot.date &&
                             a.appointmentTime === slot.time &&
                             a.status !== "cancelled"
                    );
                    return (
                      <div key={`${slot.date}_${slot.time}`} className="glass-card" style={{
                        padding: 16, textAlign: "center",
                        border: `1px solid ${isBooked ? "rgba(239,68,68,0.3)" : "rgba(0,217,255,0.2)"}`,
                      }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>{new Date(slot.date).toLocaleDateString()}</p>
                        <p style={{ color: "white", fontWeight: 600, margin: "4px 0" }}>{slot.time}</p>
                        <span className={`status-badge ${isBooked ? "status-busy" : "status-available"}`}>{isBooked ? "Booked" : "Available"}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── APPOINTMENTS (grouped + collapsible) ── */}
        {doctorTab === "appointments" && (
          <div className="glass-card" style={{ padding: 32 }}>
            <h3 style={{ marginTop: 0, marginBottom: 24 }}>Patient Appointments</h3>

            {doctorAppointments.length === 0 ? (
              <p style={{ color: "var(--text-secondary)" }}>No appointments scheduled</p>
            ) : (
              <>
                {/* ── Confirmed ── */}
                <AppointmentSection title="Confirmed" count={confirmed.length} color="var(--cyan-bright, #00d9ff)" defaultOpen={true}>
                  {confirmed.map((appt) => {
                    const patient = (allData.patients || []).find((p) => asId(p.id || p._id) === asId(appt.patientId));
                    return (
                      <DoctorApptCard key={appt.id || appt._id} appt={appt} patient={patient}
                        isCompleted={false} isPending={false}
                        saveVisitSummary={saveVisitSummary} markAsCompleted={markAsCompleted} />
                    );
                  })}
                </AppointmentSection>

                {/* ── Pending ── */}
                <AppointmentSection title="Pending" count={pending.length} color="#f59e0b" defaultOpen={true}>
                  {pending.map((appt) => {
                    const patient = (allData.patients || []).find((p) => asId(p.id || p._id) === asId(appt.patientId));
                    return (
                      <DoctorApptCard key={appt.id || appt._id} appt={appt} patient={patient}
                        isCompleted={false} isPending={true}
                        saveVisitSummary={saveVisitSummary} markAsCompleted={markAsCompleted} />
                    );
                  })}
                </AppointmentSection>

                {/* ── Completed ── */}
                <AppointmentSection title="Completed" count={completed.length} color="#10b981" defaultOpen={false}>
                  {completed.map((appt) => {
                    const patient = (allData.patients || []).find((p) => asId(p.id || p._id) === asId(appt.patientId));
                    return (
                      <DoctorApptCard key={appt.id || appt._id} appt={appt} patient={patient}
                        isCompleted={true} isPending={false}
                        saveVisitSummary={saveVisitSummary} markAsCompleted={markAsCompleted} />
                    );
                  })}
                </AppointmentSection>
              </>
            )}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {doctorTab === "reviews" && (
          <div className="glass-card" style={{ padding: 32 }}>
            <h3 style={{ marginTop: 0, marginBottom: 24 }}>My Reviews</h3>
            {isReviewsLoading ? (
              <p style={{ color: "var(--text-secondary)" }}>Loading reviews...</p>
            ) : isReviewsError ? (
              <p style={{ color: "var(--text-secondary)" }}>Could not load reviews.</p>
            ) : doctorReviews.length === 0 ? (
              <p style={{ color: "var(--text-secondary)" }}>No reviews available yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {doctorReviews.map((review) => (
                  <div key={review.id || review._id} className="glass-card" style={{ padding: 20, borderLeft: "4px solid var(--cyan-bright)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p style={{ fontWeight: 600, margin: 0, color: "white" }}>
                        {review.patient_id?.firstName || review.patient_id?.lastName
                          ? `${review.patient_id?.firstName || ""} ${review.patient_id?.lastName || ""}`.trim()
                          : "Anonymous Patient"}
                      </p>
                      <p style={{ color: "#facc15", fontWeight: 700, margin: 0 }}>
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </p>
                    </div>
                    <p style={{ color: "var(--text-secondary)", margin: "8px 0" }}>{review.comment || "No comment provided."}</p>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
