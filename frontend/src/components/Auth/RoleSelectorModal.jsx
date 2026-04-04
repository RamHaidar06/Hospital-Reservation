export default function RoleSelectorModal({
  authRoleModal,
  closeAuthSelector,
  selectRole,
}) {
  return (
    <div className={`modal-overlay ${authRoleModal ? "show" : ""}`}>
      <div
        className="glass"
        style={{ padding: 40, maxWidth: 400, width: "100%", animation: "fadeInUp 0.4s ease-out" }}
      >
        <h3 style={{ textAlign: "center", marginBottom: 32 }}>Choose Your Role</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button
            onClick={() => selectRole("patient")}
            className="glass-card"
            style={{
              padding: 32,
              border: "2px solid rgba(47, 127, 141, 0.16)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "2rem", margin: "0 0 12px 0" }}>👤</p>
            <h4 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>Patient</h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              Book appointments & manage health
            </p>
          </button>

          <button
            onClick={() => selectRole("doctor")}
            className="glass-card"
            style={{
              padding: 32,
              border: "2px solid rgba(47, 127, 141, 0.16)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "2rem", margin: "0 0 12px 0" }}>⚕️</p>
            <h4 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>Doctor</h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              Manage patients & availability
            </p>
          </button>
        </div>

        <button
          onClick={closeAuthSelector}
          style={{
            width: "100%",
            marginTop: 20,
            background: "none",
            border: "1px solid rgba(47, 127, 141, 0.18)",
            color: "var(--text-secondary)",
            padding: 12,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
