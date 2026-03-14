export default function EditDoctorModal({
  editDoctorOpen,
  setEditDoctorOpen,
  doctorEditForm,
  setDoctorEditForm,
  saveDoctorProfile,
}) {
  return (
    <div
      className={`modal-overlay ${editDoctorOpen ? "show" : ""}`}
      onClick={() => setEditDoctorOpen(false)}
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

        <form onSubmit={saveDoctorProfile}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
                First Name
              </label>
              <input
                className="input-field"
                required
                value={doctorEditForm.firstName}
                onChange={(e) => setDoctorEditForm((s) => ({ ...s, firstName: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
                Last Name
              </label>
              <input
                className="input-field"
                required
                value={doctorEditForm.lastName}
                onChange={(e) => setDoctorEditForm((s) => ({ ...s, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
              Email
            </label>
            <input className="input-field" value={doctorEditForm.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
              Years of Experience
            </label>
            <input
              className="input-field"
              type="number"
              required
              value={doctorEditForm.experience}
              onChange={(e) => setDoctorEditForm((s) => ({ ...s, experience: e.target.value }))}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontWeight: 600, color: "white", marginBottom: 6, fontSize: "0.85rem" }}>
              Bio
            </label>
            <textarea
              className="input-field"
              rows="4"
              style={{ resize: "none" }}
              value={doctorEditForm.bio}
              onChange={(e) => setDoctorEditForm((s) => ({ ...s, bio: e.target.value }))}
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
              onClick={() => setEditDoctorOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}