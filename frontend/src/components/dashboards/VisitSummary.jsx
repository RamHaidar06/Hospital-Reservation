import React, { useState } from "react";

/**
 * VisitSummary
 *
 * Shown inside every completed appointment card.
 * - Both patient and doctor can READ the summary.
 * - Only the doctor can EDIT / SAVE it.
 *
 * Props:
 *   appointmentId      {string}
 *   initialSummary     {string}
 *   updatedAt          {string|null}  ISO date string
 *   isDoctor           {boolean}
 *   onSave             {(apptId, text) => Promise<void>}
 */
export default function VisitSummary({
  appointmentId,
  initialSummary = "",
  updatedAt = null,
  isDoctor = false,
  onSave,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialSummary);
  const [saving, setSaving] = useState(false);

  // Keep draft in sync if the parent updates the summary (e.g. after optimistic update)
  React.useEffect(() => {
    if (!isEditing) setDraft(initialSummary);
  }, [initialSummary, isEditing]);

  const handleEdit = () => {
    setDraft(initialSummary);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(initialSummary);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (draft.trim() === initialSummary.trim()) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(appointmentId, draft.trim());
      setIsEditing(false);
    } catch {
      // error already shown via showMessage in the hook
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        background: "rgba(0, 217, 255, 0.04)",
        border: "1px solid rgba(0, 217, 255, 0.12)",
        borderRadius: 10,
      }}
    >
      {/* ── Header row ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <p
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: "0.8rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--cyan-bright, #00d9ff)",
          }}
        >
          🩺 Visit Summary
        </p>

        {isDoctor && !isEditing && (
          <button
            onClick={handleEdit}
            className="btn-secondary"
            style={{ fontSize: "0.78rem", padding: "5px 14px" }}
          >
            {initialSummary ? "Edit" : "Add Summary"}
          </button>
        )}
      </div>

      {/* ── Edit mode (doctor only) ── */}
      {isEditing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write the consultation summary — diagnosis, prescriptions, follow-up instructions..."
            className="input-field"
            style={{
              width: "100%",
              minHeight: 110,
              padding: 12,
              resize: "vertical",
              fontSize: "0.9rem",
              boxSizing: "border-box",
            }}
            autoFocus
            disabled={saving}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button
              onClick={handleCancel}
              className="btn-secondary"
              style={{ fontSize: "0.82rem", padding: "6px 16px" }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              style={{ fontSize: "0.82rem", padding: "6px 18px" }}
              disabled={saving || draft.trim() === ""}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        /* ── View mode (both roles) ── */
        <div>
          {initialSummary ? (
            <>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-primary, #e2e8f0)",
                  fontSize: "0.9rem",
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {initialSummary}
              </p>
              {updatedAt && (
                <p
                  style={{
                    margin: "8px 0 0 0",
                    color: "var(--text-secondary, #64748b)",
                    fontSize: "0.78rem",
                  }}
                >
                  Last updated: {formatDate(updatedAt)}
                </p>
              )}
            </>
          ) : (
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary, #64748b)",
                fontSize: "0.88rem",
                fontStyle: "italic",
              }}
            >
              {isDoctor
                ? "No summary yet. Click 'Add Summary' to write one."
                : "No visit summary has been added by your doctor yet."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
