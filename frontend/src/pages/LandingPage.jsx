import { useMemo, useState } from "react";

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function formatDoctorName(doctor) {
  const fullName = [doctor.firstName, doctor.lastName].filter(Boolean).join(" ").trim();
  return fullName ? `Dr. ${fullName}` : "Doctor";
}

function initialsForDoctor(doctor) {
  const firstInitial = doctor.firstName?.[0] || "D";
  const lastInitial = doctor.lastName?.[0] || "";
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

function DoctorPublicReviewPreview({ reviews = [], currentPatient = null, patientReviews = [] }) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const patientReviewIds = new Set((patientReviews || []).map((review) => String(review.id || review._id || "")));
  const ownName = [currentPatient?.firstName, currentPatient?.lastName].filter(Boolean).join(" ").trim();
  const visibleReviews = (showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => {
    const isOwnReview = patientReviewIds.has(String(review.id));

    return {
      ...review,
      patientName: isOwnReview && ownName ? `${ownName} (Your review)` : review.patientName,
    };
  });

  if (reviews.length === 0) return null;

  return (
    <div className="glass-card" style={{ padding: 16, display: "grid", gap: 12, background: "rgba(249,252,252,0.98)" }}>
      <p style={{ margin: 0, color: "var(--text-primary)", fontWeight: 700 }}>Patient Reviews</p>
      {visibleReviews.map((review) => (
        <div key={review.id} style={{ borderTop: "1px solid rgba(31,59,66,0.08)", paddingTop: 10 }}>
          <p style={{ margin: 0, color: "var(--text-primary)", fontWeight: 600 }}>{review.patientName}</p>
          <p style={{ margin: "4px 0", color: "#b88532", fontWeight: 700 }}>{Number(review.rating).toFixed(1)} / 5.0</p>
          <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.65 }}>
            {review.comment || "No written comment provided."}
          </p>
        </div>
      ))}
      {reviews.length > 3 ? (
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: "8px 12px", fontSize: "0.85rem", justifySelf: "start" }}
          onClick={() => setShowAllReviews((value) => !value)}
        >
          {showAllReviews ? "Show fewer reviews" : "View all reviews"}
        </button>
      ) : null}
    </div>
  );
}

export default function LandingPage({ selectRole, openAuthSelector, doctors = [], currentPatient = null, patientReviews = [] }) {
  const [nameSearch, setNameSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [ratingSearch, setRatingSearch] = useState("");
  const [selectedRating, setSelectedRating] = useState("all");

  const specialties = useMemo(() => {
    const values = Array.from(new Set(doctors.map((doctor) => doctor.specialty?.trim()).filter(Boolean)));
    return values.sort((a, b) => a.localeCompare(b));
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const normalizedNameSearch = nameSearch.trim().toLowerCase();
    const normalizedRatingSearch = ratingSearch.trim().toLowerCase();
    const minimumRating = selectedRating === "all" ? 0 : Number(selectedRating);

    return [...doctors]
      .filter((doctor) => {
        const ratingText = Number(doctor.averageRating || 0).toFixed(1);
        const matchesName = !normalizedNameSearch || [doctor.firstName, doctor.lastName].filter(Boolean).join(" ").toLowerCase().includes(normalizedNameSearch);
        const matchesSpecialty = selectedSpecialty === "all" || doctor.specialty === selectedSpecialty;
        const doctorRating = Number(doctor.averageRating || 0);
        const matchesRatingSearch = !normalizedRatingSearch || ratingText.includes(normalizedRatingSearch);
        const matchesRating = selectedRating === "all" || doctorRating >= minimumRating;

        return matchesName && matchesSpecialty && matchesRatingSearch && matchesRating;
      })
      .sort((a, b) => {
        const ratingDiff = Number(b.averageRating || 0) - Number(a.averageRating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return formatDoctorName(a).localeCompare(formatDoctorName(b));
      });
  }, [doctors, nameSearch, selectedSpecialty, ratingSearch, selectedRating]);

  return (
    <div id="landing" style={{ position: "relative", width: "100%", padding: 0 }}>
      <div style={{ width: "100%" }}>
        <section id="hospital-overview" style={{ position: "relative", marginBottom: 0 }}>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 0,
              minHeight: 760,
              backgroundImage:
                "linear-gradient(90deg, rgba(38, 69, 87, 0.94) 0%, rgba(56, 93, 114, 0.82) 34%, rgba(213, 230, 237, 0.16) 62%, rgba(237, 247, 250, 0.06) 100%), url('/hospital-team-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(35,61,79,0.9) 0%, rgba(58,93,113,0.74) 36%, rgba(220,236,243,0.12) 64%, rgba(237,247,250,0.02) 100%)",
              }}
            />

            <div style={{ position: "relative", zIndex: 2, padding: "26px 40px 36px", maxWidth: 1280, margin: "0 auto" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 18,
                  flexWrap: "wrap",
                  marginBottom: 54,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff" }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.16)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "0.8rem",
                    }}
                  >
                    +
                  </div>
                  <span style={{ fontWeight: 700, letterSpacing: "0.01em" }}>MediCare</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                  {[
                    ["Home", "hospital-overview"],
                    ["About", "hospital-about"],
                    ["Find Doctor", "hospital-doctors"],
                  ].map(([label, id]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => scrollToSection(id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.92)",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={openAuthSelector}
                    style={{
                      border: "none",
                      background: "rgba(255,255,255,0.96)",
                      color: "#244f62",
                      borderRadius: 16,
                      padding: "14px 18px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 12px 30px rgba(255,255,255,0.18)",
                    }}
                  >
                    Sign Up / Login
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.08fr) minmax(320px, 0.92fr)", gap: 28, alignItems: "stretch", minHeight: 520 }}>
                <div style={{ padding: "40px 26px 0 26px", maxWidth: 520 }}>
                  <p
                    style={{
                      margin: "0 0 16px 0",
                      color: "rgba(255,255,255,0.72)",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    Trusted hospital care
                  </p>
                  <h1 style={{ margin: "0 0 18px 0", color: "#fff", maxWidth: 440, fontSize: "4rem", lineHeight: 1.08 }}>
                    Compassionate care, exceptional results.
                  </h1>
                  <p style={{ margin: "0 0 28px 0", color: "rgba(244,248,249,0.82)", lineHeight: 1.85, maxWidth: 430 }}>
                    Our experienced doctors and nursing teams are committed to providing thoughtful treatment, clearer communication, and reliable follow-up for every patient and family.
                  </p>

                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 26 }}>
                    <button className="btn-primary" type="button" onClick={() => scrollToSection("hospital-doctors")}>
                      Find A Doctor
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => scrollToSection("hospital-about")}
                      style={{ background: "rgba(255,255,255,0.08)", color: "#fff", borderColor: "rgba(255,255,255,0.18)" }}
                    >
                      Learn About Us
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollToSection("hospital-about")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.86)",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.35)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "0.85rem",
                      }}
                    >
                      ▶
                    </span>
                    See how we work
                  </button>
                </div>

                <div style={{ position: "relative", minHeight: 460 }}>
                  <div
                    className="glass-card"
                    style={{
                      position: "absolute",
                      top: 58,
                      right: 26,
                      padding: "14px 16px",
                      background: "rgba(255,255,255,0.9)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", marginRight: 4 }}>
                      {["A", "J", "M"].map((letter, index) => (
                        <div
                          key={letter}
                          style={{
                            width: 34,
                            height: 34,
                            marginLeft: index === 0 ? 0 : -8,
                            borderRadius: "50%",
                            background: index === 0 ? "#c9dce6" : index === 1 ? "#e8d4c6" : "#d8e9dd",
                            border: "2px solid #fff",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "#34586a",
                          }}
                        >
                          {letter}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p style={{ margin: 0, color: "#2a5364", fontWeight: 800 }}>150K +</p>
                      <p style={{ margin: "2px 0 0 0", color: "var(--text-secondary)", fontSize: "0.78rem" }}>Patient recoveries</p>
                    </div>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      right: 28,
                      bottom: 54,
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.92)",
                      display: "grid",
                      placeItems: "center",
                      color: "#4a8ca0",
                      fontSize: "1.2rem",
                      boxShadow: "0 12px 24px rgba(87,126,144,0.12)",
                    }}
                  >
                    +
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                zIndex: 2,
                maxWidth: 1280,
                margin: "0 auto",
                padding: "0 40px 40px",
              }}
            >
              <div
                className="glass-card"
                style={{
                  padding: "22px 26px",
                  background: "rgba(245,250,251,0.5)",
                  backdropFilter: "blur(16px)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 16,
                }}
              >
              {[
                ["20+", "years of experience"],
                ["95%", "patient satisfaction rating"],
                [String(doctors.length || 1), "specialists available"],
                ["10+", "departments in service"],
              ].map(([value, label]) => (
                <div key={label}>
                  <p style={{ margin: 0, color: "#ffffff", fontSize: "2rem", fontWeight: 800 }}>{value}</p>
                  <p style={{ margin: "8px 0 0 0", color: "rgba(255,255,255,0.92)", fontSize: "0.9rem", lineHeight: 1.5 }}>{label}</p>
                </div>
              ))}
              </div>
            </div>
          </div>
        </section>

        <section id="hospital-about" style={{ marginBottom: 0, padding: "24px 40px", background: "linear-gradient(180deg, #f8fcfd 0%, #f4f9fa 100%)" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.88fr)", gap: 28, alignItems: "stretch" }}>
            <div className="glass-card" style={{ padding: "42px 34px" }}>
              <p style={{ margin: 0, color: "var(--cyan-bright)", fontSize: "0.82rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 800 }}>
                About us
              </p>
              <h2 style={{ margin: "18px 0 18px 0", maxWidth: 560 }}>MediCare is a team of experienced medical professionals.</h2>
              <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", lineHeight: 1.9 }}>
                Medicare Hospital was founded in 1984 as a neighborhood clinic and grew into a full-service hospital built around continuity of care. Our doctors, nurses, and support teams work closely across departments to provide dependable treatment plans, clearer communication, and a calmer patient experience from first consultation through recovery.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                {[
                  ["Emergency readiness", "Round-the-clock support for urgent medical needs."],
                  ["Specialist clinics", "Coordinated care across major specialties and diagnostics."],
                  ["Family-centered care", "Treatment plans designed with patients and families in mind."],
                ].map(([title, copy]) => (
                  <div key={title} className="glass-card" style={{ padding: 18 }}>
                    <p style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontWeight: 700 }}>{title}</p>
                    <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.7 }}>{copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="glass-card"
              style={{
                padding: 24,
                background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,247,248,0.94))",
                display: "grid",
                gap: 18,
              }}
            >
              <div
                style={{
                  minHeight: 260,
                  borderRadius: 24,
                  background:
                    "linear-gradient(145deg, rgba(226,239,244,0.92), rgba(250,252,253,1) 50%, rgba(209,228,235,0.9) 100%)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "8%",
                    bottom: 22,
                    width: "42%",
                    aspectRatio: "0.82",
                    borderRadius: "24% 24% 12% 12%",
                    background: "linear-gradient(180deg, rgba(103,135,153,0.98), rgba(70,102,120,0.98))",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "14%",
                    top: 32,
                    width: 92,
                    height: 92,
                    borderRadius: "50%",
                    background: "linear-gradient(180deg, #f4dbc7, #e4b796)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: "12%",
                    bottom: 18,
                    width: "32%",
                    aspectRatio: "0.78",
                    borderRadius: "28% 28% 14% 14%",
                    background: "linear-gradient(180deg, rgba(216,230,236,0.98), rgba(166,193,205,0.96))",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: "18%",
                    top: 60,
                    width: 84,
                    height: 84,
                    borderRadius: "50%",
                    background: "linear-gradient(180deg, #f2d9c2, #dfb08e)",
                  }}
                />
              </div>

              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ margin: "0 0 6px 0", color: "var(--text-primary)", fontWeight: 800 }}>Why patients choose us</p>
                <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  Patients return for warm bedside care, coordinated specialist follow-up, and a system that helps them find the right doctor faster.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="hospital-doctors" style={{ padding: "24px 40px 64px", background: "linear-gradient(180deg, #f4f9fa 0%, #eef6f7 100%)" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ marginBottom: 26 }}>
            <p style={{ margin: 0, color: "var(--cyan-bright)", fontSize: "0.82rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 800 }}>
              Find doctor
            </p>
            <h2 style={{ margin: "16px 0 10px 0" }}>Choose the right doctor for your care.</h2>
            <p style={{ margin: 0, color: "var(--text-secondary)", maxWidth: 760, lineHeight: 1.8 }}>
              Search the medical team by doctor name, specialty, rating, or minimum rating before you enter the patient portal.
            </p>
          </div>

          <div className="glass-card" style={{ padding: 24, marginBottom: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 8, color: "var(--text-primary)", fontWeight: 700 }}>Name</label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Search doctor name"
                  value={nameSearch}
                  onChange={(event) => setNameSearch(event.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, color: "var(--text-primary)", fontWeight: 700 }}>Specialty</label>
                <select className="input-field" value={selectedSpecialty} onChange={(event) => setSelectedSpecialty(event.target.value)}>
                  <option value="all">All specialties</option>
                  {specialties.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, color: "var(--text-primary)", fontWeight: 700 }}>Rating</label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Example: 4.5"
                  value={ratingSearch}
                  onChange={(event) => setRatingSearch(event.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, color: "var(--text-primary)", fontWeight: 700 }}>Minimum rating</label>
                <select className="input-field" value={selectedRating} onChange={(event) => setSelectedRating(event.target.value)}>
                  <option value="all">All ratings</option>
                  <option value="4.5">4.5 and above</option>
                  <option value="4">4.0 and above</option>
                  <option value="3">3.0 and above</option>
                </select>
              </div>
            </div>
          </div>

          {filteredDoctors.length === 0 ? (
            <div className="glass-card" style={{ padding: 28 }}>
              <h3 style={{ margin: "0 0 8px 0" }}>No doctors match these filters</h3>
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>Try a different doctor name, specialty, or rating selection.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 22 }}>
              {filteredDoctors.map((doctor) => {
                const rating = Number(doctor.averageRating || 0);
                const reviewCount = Number(doctor.reviewCount || 0);
                const totalRatingText = reviewCount > 0
                  ? `${rating.toFixed(1)} / 5.0 from ${reviewCount} patient rating${reviewCount === 1 ? "" : "s"}`
                  : "No patient ratings yet";

                return (
                  <div key={doctor.id || doctor._id} className="glass-card" style={{ padding: 26, display: "grid", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 62,
                          height: 62,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          background: "linear-gradient(135deg, #6f8ea4, #9ec0cb)",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: "1.05rem",
                        }}
                      >
                        {initialsForDoctor(doctor)}
                      </div>
                      <div>
                        <h3 style={{ margin: 0 }}>{formatDoctorName(doctor)}</h3>
                        <p style={{ margin: "6px 0 0 0", color: "var(--cyan-bright)", fontWeight: 700 }}>
                          {doctor.specialty || "General Medicine"}
                        </p>
                      </div>
                    </div>

                    <p style={{ margin: 0, color: "#b88532", fontSize: "0.94rem", fontWeight: 700 }}>{totalRatingText}</p>
                    <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.75 }}>
                      {doctor.bio || `${formatDoctorName(doctor)} supports patients across consultations, diagnostics, and follow-up care.`}
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                      <div className="glass-card" style={{ padding: 14 }}>
                        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.82rem" }}>Experience</p>
                        <p style={{ margin: "6px 0 0 0", fontWeight: 700, color: "var(--text-primary)" }}>{doctor.yearsExperience || 0} years</p>
                      </div>
                      <div className="glass-card" style={{ padding: 14 }}>
                        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.82rem" }}>Hours</p>
                        <p style={{ margin: "6px 0 0 0", fontWeight: 700, color: "var(--text-primary)" }}>
                          {doctor.startTime || "09:00"} - {doctor.endTime || "17:00"}
                        </p>
                      </div>
                    </div>

                    <DoctorPublicReviewPreview reviews={doctor.publicReviews || []} currentPatient={currentPatient} patientReviews={patientReviews} />

                    <button className="btn-primary" type="button" onClick={openAuthSelector}>
                      Sign Up / Login To Book
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </section>
      </div>
    </div>
  );
}
