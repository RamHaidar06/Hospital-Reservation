export default function EditPatientModal({
  editPatientOpen,
  setEditPatientOpen,
  patientEditForm,
  setPatientEditForm,
  savePatientProfile,
}) {
  return (
    <div
      className={`modal-overlay ${editPatientOpen ? "show" : ""}`}
      onClick={() => setEditPatientOpen(false)}
    >
      <div
        className="glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: 40,
          maxWidth: 500,
          width: "100%",
          animation: "fadeInUp 0.4s ease-out",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Update Your Profile</h3>

        <form onSubmit={savePatientProfile}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
                First Name
              </label>
              <input
                className="input-field"
                required
                value={patientEditForm.firstName}
                onChange={(e) => setPatientEditForm((s) => ({ ...s, firstName: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
                Last Name
              </label>
              <input
                className="input-field"
                required
                value={patientEditForm.lastName}
                onChange={(e) => setPatientEditForm((s) => ({ ...s, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
              Email
            </label>
            <input className="input-field" value={patientEditForm.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
              Phone
            </label>
            <input
              className="input-field"
              value={patientEditForm.phone}
              onChange={(e) => setPatientEditForm((s) => ({ ...s, phone: e.target.value }))}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
              Date of Birth
            </label>
            <input
              type="date"
              className="input-field"
              value={patientEditForm.dob}
              onChange={(e) => setPatientEditForm((s) => ({ ...s, dob: e.target.value }))}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
              Address
            </label>
            <input
              className="input-field"
              placeholder="Street address"
              value={patientEditForm.address}
              onChange={(e) => setPatientEditForm((s) => ({ ...s, address: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: 14, fontWeight: 600 }}>
              Save Changes
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, padding: 14, fontWeight: 600 }}
              onClick={() => setEditPatientOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}