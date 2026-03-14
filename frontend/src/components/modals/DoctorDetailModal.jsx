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
  return (
    <div className={`modal-overlay ${doctorDetailOpen ? "show" : ""}`} onClick={closeDoctorDetails}>
      <div
        className="glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: 40,
          maxWidth: 600,
          width: "100%",
          animation: "fadeInUp 0.4s ease-out",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {!selectedDoctor ? (
          <p style={{ color: "var(--text-secondary)" }}>Doctor not found</p>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: "0 0 8px 0" }}>
                  Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                </h3>
                <p style={{ color: "var(--cyan-bright)", fontWeight: 600, margin: 0 }}>
                  {selectedDoctor.specialty || "specialty"}
                </p>
              </div>

              <button
                onClick={closeDoctorDetails}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.5rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <h4 style={{ margin: "0 0 16px 0", color: "white" }}>Available Time Slots</h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 24 }}>
              {selectedDoctorSlots.map((slot) => (
                <button
                  key={`${slot.date}_${slot.time}`}
                  onClick={() => selectTimeSlot(slot.date, slot.time)}
                  className="btn-primary"
                  style={{ padding: 10, fontSize: "0.85rem" }}
                >
                  {slot.time}
                </button>
              ))}
            </div>

            <form onSubmit={bookAppointmentSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
                  Select Date
                </label>
                <input
                  type="date"
                  className="input-field"
                  required
                  min={todayISO()}
                  value={apptForm.date}
                  onChange={(e) => setApptForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
                  Select Time
                </label>
                <input
                  type="time"
                  className="input-field"
                  required
                  value={apptForm.time}
                  onChange={(e) => setApptForm((f) => ({ ...f, time: e.target.value }))}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
                  Reason for Visit
                </label>
                <input
                  className="input-field"
                  placeholder="e.g., Check-up, Consultation"
                  required
                  value={apptForm.reason}
                  onChange={(e) => setApptForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
                  Additional Notes (optional)
                </label>
                <textarea
                  className="input-field"
                  rows="3"
                  style={{ resize: "none" }}
                  value={apptForm.notes}
                  onChange={(e) => setApptForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: 14, fontWeight: 600 }}>
                  Book Appointment
                </button>
                <button type="button" onClick={closeDoctorDetails} className="btn-secondary" style={{ flex: 1, padding: 14, fontWeight: 600 }}>
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