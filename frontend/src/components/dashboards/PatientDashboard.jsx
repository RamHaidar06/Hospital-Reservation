import React from "react";

export default function PatientDashboard({
  page,
  currentPatient,
  logoutPatient,
  patientTab,
  setPatientTab,
  openEditPatient,
  visibleDoctors,
  openDoctorDetails,
  patientUpcoming,
  patientPast,
  allData,
  rescheduleAppointment,
  cancelAppointment,
  isHistoryLoading = false,
  doctorReviews = [],
  submitReview,
}) {
  if (page !== "patient" || !currentPatient) return null;

  return (
    <div className="w-full h-full flex flex-col">
      <header
        style={{
          background:
            "linear-gradient(135deg, rgba(26, 40, 81, 0.8), rgba(15, 23, 42, 0.6))",
          borderBottom: "1px solid rgba(0, 217, 255, 0.1)",
          padding: "20px 32px",
          backdropFilter: "blur(15px)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: 1400,
            margin: "0 auto",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.75rem" }}>Patient Dashboard</h2>
          <button
            onClick={logoutPatient}
            className="btn-secondary"
            style={{ fontSize: "0.85rem", padding: "10px 20px" }}
          >
            Logout
          </button>
        </div>
      </header>

      <div
        className="tab-switch"
        style={{
          maxWidth: 1400,
          margin: "32px auto",
          padding: "0 32px",
          width: "calc(100% - 64px)",
        }}
      >
        <button
          className={`tab-btn ${patientTab === "profile" ? "active" : ""}`}
          onClick={() => setPatientTab("profile")}
        >
          👤 Profile
        </button>
        <button
          className={`tab-btn ${patientTab === "book" ? "active" : ""}`}
          onClick={() => setPatientTab("book")}
        >
          📅 Book
        </button>
        <button
          className={`tab-btn ${patientTab === "upcoming" ? "active" : ""}`}
          onClick={() => setPatientTab("upcoming")}
        >
          📆 Upcoming
        </button>
        <button
          className={`tab-btn ${patientTab === "past" ? "active" : ""}`}
          onClick={() => setPatientTab("past")}
        >
          📋 History
        </button>
      </div>

      <main
        className="flex-1 overflow-auto"
        style={{
          padding: "0 32px 32px",
          maxWidth: 1400,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {patientTab === "profile" && (
          <div>
            <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 32,
                }}
              >
                <h3 style={{ margin: 0 }}>Your Profile</h3>
                <button
                  onClick={openEditPatient}
                  className="btn-secondary"
                  style={{ fontSize: "0.85rem" }}
                >
                  Edit Profile
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 24,
                }}
              >
                <div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.9rem",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Full Name
                  </p>
                  <p
                    style={{
                      color: "white",
                      fontWeight: 600,
                      margin: 0,
                      fontSize: "1.1rem",
                    }}
                  >
                    {currentPatient.firstName} {currentPatient.lastName}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.9rem",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Email
                  </p>
                  <p style={{ color: "white", fontWeight: 600, margin: 0 }}>
                    {currentPatient.email}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.9rem",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Phone
                  </p>
                  <p style={{ color: "white", fontWeight: 600, margin: 0 }}>
                    {currentPatient.phone || "Not set"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {patientTab === "book" && (
          <div className="glass-card" style={{ padding: 32 }}>
            <h3 style={{ marginTop: 0, marginBottom: 24 }}>Book an Appointment</h3>

            {visibleDoctors.length === 0 ? (
              <p style={{ color: "var(--text-secondary)" }}>
                No doctors loaded. If you don’t have a doctors endpoint yet, add one in{" "}
                <b>routes/auth.js</b> (list users with role="doctor").
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 24,
                }}
              >
                {visibleDoctors.map((doc) => (
                  <div
                    key={doc.id || doc._id}
                    className="glass-card"
                    style={{ padding: 24, cursor: "pointer" }}
                    onClick={() => openDoctorDetails(doc.id || doc._id)}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚕️</div>
                    <h4 style={{ margin: "0 0 8px 0", color: "white" }}>
                      Dr. {doc.lastName}
                    </h4>
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.9rem",
                        margin: "0 0 12px 0",
                      }}
                    >
                      {doc.specialty || "specialty"}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.9rem",
                        }}
                      >
                        {doc.yearsExperience ?? 0}y exp.
                      </span>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ width: "100%", padding: 10, fontSize: "0.9rem" }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        openDoctorDetails(doc.id || doc._id);
                      }}
                    >
                      Book Appointment
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {patientTab === "upcoming" && (
          <div className="glass-card" style={{ padding: 32 }}>
            <h3 style={{ marginTop: 0, marginBottom: 24 }}>Upcoming Appointments</h3>
            <div style={{ display: "grid", gap: 16 }}>
              {patientUpcoming.length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>
                  No upcoming appointments
                </p>
              ) : (
                patientUpcoming.map((appt) => {
                  const doc = (allData.doctors || []).find(
                    (d) => d.id === appt.doctorId || d._id === appt.doctorId
                  );

                  return (
                    <div
                      key={appt.id || appt._id}
                      className="glass-card"
                      style={{
                        padding: 20,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: 600, margin: 0, color: "white" }}>
                          Dr. {doc?.lastName || "Unknown"}
                        </p>
                        <p
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.9rem",
                            margin: "4px 0",
                          }}
                        >
                          📅 {new Date(appt.appointmentDate).toLocaleDateString()} at{" "}
                          {appt.appointmentTime}
                        </p>
                        <p
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.9rem",
                            margin: "4px 0",
                          }}
                        >
                          {appt.reason}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => rescheduleAppointment(appt.id || appt._id)}
                          className="btn-secondary"
                          style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => cancelAppointment(appt.id || appt._id)}
                          className="btn-danger"
                          style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {patientTab === "past" && (
          <div className="glass-card" style={{ padding: 32 }}>
            <h3 style={{ marginTop: 0, marginBottom: 24 }}>Appointment History</h3>
            <div style={{ display: "grid", gap: 16 }}>
              {isHistoryLoading ? (
                <p style={{ color: "var(--text-secondary)" }}>
                  Loading appointment history...
                </p>
              ) : patientPast.length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>No past appointments</p>
              ) : (
                patientPast.map((appt) => {
                  const appointmentId = appt.id || appt._id;

                  const doc = (allData.doctors || []).find(
                    (d) => d.id === appt.doctorId || d._id === appt.doctorId
                  );

                  const existingReview = doctorReviews.find((review) => {
                    const reviewAppointmentId =
                      typeof review.appointment_id === "string"
                        ? review.appointment_id
                        : review.appointment_id?._id || review.appointment_id?.id;

                    return String(reviewAppointmentId) === String(appointmentId);
                  });

                  return (
                    <div key={appointmentId} className="glass-card" style={{ padding: 20 }}>
                      <p style={{ fontWeight: 600, margin: 0, color: "white" }}>
                        Dr. {doc?.lastName || "Unknown"}
                      </p>

                      <p
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.9rem",
                          margin: "4px 0",
                        }}
                      >
                        📅 {new Date(appt.appointmentDate).toLocaleDateString()} at{" "}
                        {appt.appointmentTime}
                      </p>

                      <p
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.9rem",
                          margin: "4px 0",
                        }}
                      >
                        {appt.reason}
                      </p>

                      {appt.notes ? (
                        <p
                          style={{
                            color: "var(--cyan-bright)",
                            fontSize: "0.9rem",
                            margin: "8px 0 0 0",
                          }}
                        >
                          Notes: {appt.notes}
                        </p>
                      ) : null}

                      <div
                        style={{
                          marginTop: 16,
                          paddingTop: 16,
                          borderTop: "1px solid rgba(0, 217, 255, 0.1)",
                        }}
                      >
                        {existingReview ? (
                          <div>
                            <p
                              style={{
                                color: "white",
                                fontWeight: 600,
                                margin: "0 0 8px 0",
                              }}
                            >
                              Your Review
                            </p>

                            <p
                              style={{
                                color: "#facc15",
                                fontWeight: 700,
                                margin: "0 0 8px 0",
                              }}
                            >
                              {"★".repeat(existingReview.rating)}
                              {"☆".repeat(5 - existingReview.rating)}
                            </p>

                            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                              {existingReview.comment || "No comment provided."}
                            </p>
                          </div>
                        ) : (
                          <ReviewForm
                            doctorId={appt.doctorId}
                            appointmentId={appointmentId}
                            submitReview={submitReview}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ReviewForm({ doctorId, appointmentId, submitReview }) {
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await submitReview({
        doctor_id: doctorId,
        appointment_id: appointmentId,
        rating: Number(rating),
        comment,
      });

      setMessage("Review submitted successfully.");
      setComment("");
      setRating(5);
    } catch (error) {
      setMessage(error.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ color: "white", fontWeight: 600, margin: "0 0 12px 0" }}>
        Leave a Review
      </p>

      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "block",
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          Rating
        </label>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="input-field"
          style={{ padding: 10, width: "100%" }}
        >
          <option value={5}>5 - Excellent</option>
          <option value={4}>4 - Very Good</option>
          <option value={3}>3 - Good</option>
          <option value={2}>2 - Fair</option>
          <option value={1}>1 - Poor</option>
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "block",
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          Comment
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your feedback..."
          className="input-field"
          style={{ width: "100%", minHeight: 100, padding: 12, resize: "vertical" }}
        />
      </div>

      <button
        type="submit"
        className="btn-primary"
        style={{ padding: "10px 18px" }}
        disabled={loading}
      >
        {loading ? "Submitting..." : "Submit Review"}
      </button>

      {message ? (
        <p style={{ color: "var(--text-secondary)", marginTop: 10 }}>{message}</p>
      ) : null}
    </form>
  );
}