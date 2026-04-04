import { useEffect, useState } from "react";

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
  isBooking = false,
  currentPatient = null,
  patientReviews = [],
}) {
  const doctorName = selectedDoctor
    ? `Dr. ${selectedDoctor.firstName || ""} ${selectedDoctor.lastName || ""}`.trim()
    : "Doctor";
  const averageRating = Number(selectedDoctor?.averageRating || 0);
  const reviewCount = Number(selectedDoctor?.reviewCount || 0);
  const ratingLabel = reviewCount > 0
    ? `${averageRating.toFixed(1)} / 5.0 from ${reviewCount} patient rating${reviewCount === 1 ? "" : "s"}`
    : "No patient ratings yet";
  const publicReviews = selectedDoctor?.publicReviews || [];
  const [showAllReviews, setShowAllReviews] = useState(false);
  const patientReviewIds = new Set((patientReviews || []).map((review) => String(review.id || review._id || "")));
  const ownName = [currentPatient?.firstName, currentPatient?.lastName].filter(Boolean).join(" ").trim();
  const visibleReviews = (showAllReviews ? publicReviews : publicReviews.slice(0, 3)).map((review) => {
    const isOwnReview = patientReviewIds.has(String(review.id));

    return {
      ...review,
      patientName: isOwnReview && ownName ? `${ownName} (Your review)` : review.patientName,
      isOwnReview,
    };
  });

  useEffect(() => {
    setShowAllReviews(false);
  }, [doctorDetailOpen, selectedDoctor?.id, selectedDoctor?._id]);

  return (
    <div
      className={`modal-overlay ${doctorDetailOpen ? "show" : ""}`}
      onClick={closeDoctorDetails}
    >
      <div
        className="glass-card doctor-detail-modal"
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
                <p style={{ color: "#facc15", fontWeight: 600, margin: "8px 0 0 0", fontSize: "0.95rem" }}>
                  Patient Rating: {ratingLabel}
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
                background: "rgba(244, 249, 250, 0.96)",
                border: "1px solid rgba(47, 127, 141, 0.18)",
              }}
            >
              <h4 style={{ margin: "0 0 16px 0", color: "var(--text-primary)" }}>
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
                  <p style={{ color: "var(--text-primary)", fontWeight: 700, margin: 0 }}>
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
                  <p style={{ color: "var(--text-primary)", fontWeight: 700, margin: 0 }}>
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
                    Total Rating
                  </p>
                  <p style={{ color: "var(--text-primary)", fontWeight: 700, margin: 0 }}>
                    {ratingLabel}
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
                  <p style={{ color: "var(--text-primary)", fontWeight: 700, margin: 0 }}>
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
                  <p style={{ color: "var(--text-primary)", fontWeight: 700, margin: 0 }}>
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
                <p style={{ color: "var(--text-primary)", margin: 0, lineHeight: 1.6 }}>
                  {selectedDoctor.bio || "No doctor bio has been added yet."}
                </p>
              </div>
            </div>

            <div
              className="glass-card"
              style={{
                padding: 20,
                marginBottom: 24,
                background: "rgba(250, 252, 253, 0.98)",
                border: "1px solid rgba(184, 133, 50, 0.18)",
              }}
            >
              <h4 style={{ margin: "0 0 16px 0", color: "var(--text-primary)" }}>Patient Reviews</h4>
              {publicReviews.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", margin: 0 }}>No public reviews yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {visibleReviews.map((review) => (
                    <div key={review.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
                      <p style={{ color: "var(--text-primary)", fontWeight: 700, margin: 0 }}>{review.patientName}</p>
                      <p style={{ color: "#facc15", fontWeight: 700, margin: "4px 0" }}>
                        {Number(review.rating).toFixed(1)} / 5.0
                      </p>
                      <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                        {review.comment || "No written comment provided."}
                      </p>
                    </div>
                  ))}
                  {publicReviews.length > 3 ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                      onClick={() => setShowAllReviews((value) => !value)}
                    >
                      {showAllReviews ? "Show fewer reviews" : "View all reviews"}
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <h4 style={{ margin: "0 0 16px 0", color: "var(--text-primary)" }}>
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
                    color: "var(--text-primary)",
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
                    color: "var(--text-primary)",
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
                    color: "var(--text-primary)",
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
                    color: "var(--text-primary)",
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
                  background: "rgba(232, 245, 238, 0.96)",
                  border: "1px solid rgba(87, 154, 117, 0.22)",
                }}
              >
                <p style={{ margin: 0, color: "#2f6b46", fontSize: "0.9rem", fontWeight: 600 }}>
                  After booking, you will receive an on-screen confirmation with
                  the appointment details.
                </p>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: 14, fontWeight: 600 }}
                  disabled={isBooking}
                >
                  {isBooking ? "Booking..." : "Book Appointment"}
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
