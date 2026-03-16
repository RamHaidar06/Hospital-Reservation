export default function DoctorDetailModal({
  doctorDetailOpen,
  closeDoctorDetails,
  selectedDoctor,
  selectedDoctorSlots,
  selectTimeSlot,
  apptForm,
  setApptForm,
  todayISO,
  bookAppointmentSubmit,
}) {
  const doctorName = selectedDoctor
    ? `Dr. ${selectedDoctor.firstName || ""} ${selectedDoctor.lastName || ""}`.trim()
    : "Doctor";

  return (
    <div
      className={`modal-overlay ${doctorDetailOpen ? "show" : ""}`}
      onClick={closeDoctorDetails}
    >
      <div
        className="glass-card"
        style={{ maxWidth: 700, width: "100%", padding: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!selectedDoctor ? (
          <div>No doctor selected.</div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 24,
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 8px 0" }}>{doctorName}</h3>
                <p
                  style={{
                    color: "var(--cyan-bright)",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {selectedDoctor.specialty || "General Practice"}
                </p>
              </div>

              <button
                onClick={closeDoctorDetails}
                className="btn-secondary"
                style={{ fontSize: "0.85rem" }}
              >
                Close
              </button>
            </div>

            <div
              className="glass-card"
              style={{
                padding: 20,
                marginBottom: 24,
                background: "rgba(15, 23, 42, 0.55)",
                border: "1px solid rgba(0, 217, 255, 0.14)",
              }}
            >
              <h4 style={{ margin: "0 0 16px 0", color: "white" }}>
                Doctor Profile
              </h4>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      margin: "0 0 6px 0",
                    }}
                  >
                    Specialization
                  </p>
                  <p style={{ color: "white", fontWeight: 600, margin: 0 }}>
                    {selectedDoctor.specialty || "Not provided"}
                  </p>
                </div>

                <div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      margin: "0 0 6px 0",
                    }}
                  >
                    Experience
                  </p>
                  <p style={{ color: "white", fontWeight: 600, margin: 0 }}>
                    {selectedDoctor.yearsExperience ?? 0} years
                  </p>
                </div>

                <div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      margin: "0 0 6px 0",
                    }}
                  >
                    License Number
                  </p>
                  <p style={{ color: "white", fontWeight: 600, margin: 0 }}>
                    {selectedDoctor.licenseNumber || "Not provided"}
                  </p>
                </div>

                <div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      margin: "0 0 6px 0",
                    }}
                  >
                    Working Hours
                  </p>
                  <p style={{ color: "white", fontWeight: 600, margin: 0 }}>
                    {selectedDoctor.startTime || "09:00"} -{" "}
                    {selectedDoctor.endTime || "17:00"}
                  </p>
                </div>
              </div>

              <div>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    margin: "0 0 8px 0",
                  }}
                >
                  About the Doctor
                </p>
                <p style={{ color: "white", margin: 0, lineHeight: 1.6 }}>
                  {selectedDoctor.bio || "No doctor bio has been added yet."}
                </p>
              </div>
            </div>

            <h4 style={{ margin: "0 0 16px 0", color: "white" }}>
              Available Time Slots
            </h4>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {selectedDoctorSlots.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                  No slots available right now.
                </p>
              ) : (
                selectedDoctorSlots.map((slot) => (
                  <button
                    key={`${slot.date}_${slot.time}`}
                    onClick={() => selectTimeSlot(slot.date, slot.time)}
                    className="btn-primary"
                    style={{ padding: 10, fontSize: "0.85rem" }}
                  >
                    {slot.time}
                  </button>
                ))
              )}
            </div>

            <form onSubmit={bookAppointmentSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    color: "white",
                    marginBottom: 6,
                    fontSize: "0.85rem",
                  }}
                >
                  Select Date
                </label>
                <input
                  type="date"
                  className="input-field"
                  required
                  min={todayISO()}
                  value={apptForm.date}
                  onChange={(e) =>
                    setApptForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    color: "white",
                    marginBottom: 6,
                    fontSize: "0.85rem",
                  }}
                >
                  Select Time
                </label>
                <input
                  type="time"
                  className="input-field"
                  required
                  value={apptForm.time}
                  onChange={(e) =>
                    setApptForm((f) => ({ ...f, time: e.target.value }))
                  }
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    color: "white",
                    marginBottom: 6,
                    fontSize: "0.85rem",
                  }}
                >
                  Reason for Visit
                </label>
                <input
                  className="input-field"
                  placeholder="e.g., Check-up, Consultation"
                  required
                  value={apptForm.reason}
                  onChange={(e) =>
                    setApptForm((f) => ({ ...f, reason: e.target.value }))
                  }
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    color: "white",
                    marginBottom: 6,
                    fontSize: "0.85rem",
                  }}
                >
                  Additional Notes (optional)
                </label>
                <textarea
                  className="input-field"
                  rows="3"
                  style={{ resize: "none" }}
                  value={apptForm.notes}
                  onChange={(e) =>
                    setApptForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>

              <div
                style={{
                  marginBottom: 20,
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                }}
              >
                <p style={{ margin: 0, color: "#bbf7d0", fontSize: "0.9rem" }}>
                  After booking, you will receive an on-screen confirmation with
                  the appointment details.
                </p>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: 14, fontWeight: 600 }}
                >
                  Book Appointment
                </button>
                <button
                  type="button"
                  onClick={closeDoctorDetails}
                  className="btn-secondary"
                  style={{ flex: 1, padding: 14, fontWeight: 600 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}