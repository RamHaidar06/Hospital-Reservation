export default function AdminConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  tone = "danger",
  isBusy = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <div className="admin-modal-card">
        <h3 className="admin-section-title" style={{ marginBottom: 6 }}>{title}</h3>
        <p className="admin-muted" style={{ marginTop: 0 }}>{message}</p>

        <div className="admin-row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" className="admin-btn secondary" onClick={onCancel} disabled={isBusy}>
            Cancel
          </button>
          <button
            type="button"
            className={`admin-btn ${tone === "danger" ? "danger" : "primary"}`}
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
