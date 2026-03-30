export default function LandingPage({ selectRole }) {
  const scrollToAuth = () => {
    const section = document.getElementById("landing-auth-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div id="landing" className="relative w-full">
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 10 }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="animate-slide-in-left">
              <p
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--cyan-bright)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 16,
                }}
              >
                The Future of Healthcare
              </p>

              <h1
                style={{
                  marginBottom: 24,
                  background: "linear-gradient(135deg, #ffffff 0%, var(--cyan-bright) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Healthcare,
                <br />
                Reinvented by AI
              </h1>

              <p style={{ fontSize: "1.1rem", marginBottom: 32, lineHeight: 1.8, color: "var(--text-secondary)" }}>
                Connect with verified doctors, manage your health with AI-powered insights, and receive personalized
                care—all in one intelligent platform.
              </p>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 48 }}>
                <button 
                  onClick={scrollToAuth}
                  className="btn-get-started"
                  style={{
                    background: "linear-gradient(135deg, var(--cyan-bright) 0%, var(--teal-accent) 100%)",
                    border: "none",
                    color: "#000",
                    padding: "14px 32px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 8px 24px rgba(14, 165, 233, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = "0 12px 32px rgba(14, 165, 233, 0.5)";
                    e.target.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = "0 8px 24px rgba(14, 165, 233, 0.3)";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  Get Started
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
                <div>
                  <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--cyan-bright)", margin: 0 }}>2K+</p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
                    Verified Doctors
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--cyan-bright)", margin: 0 }}>99.9%</p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
                    Uptime SLA
                  </p>
                </div>
              </div>
            </div>

            <div className="animate-slide-in-right" style={{ display: "grid", gap: 16 }}>
              <div className="glass-card" style={{ padding: 24, borderLeft: "4px solid var(--cyan-bright)" }}>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    margin: "0 0 8px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Average Response
                </p>
                <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--cyan-bright)", margin: 0 }}>2-5 mins</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
                  Get connected to a doctor
                </p>
              </div>

              <div className="glass-card" style={{ padding: 24, borderLeft: "4px solid var(--teal-accent)" }}>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    margin: "0 0 8px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Patient Satisfaction
                </p>
                <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--teal-accent)", margin: 0 }}>98%</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
                  Highly rated by users
                </p>
              </div>

              <div className="glass-card" style={{ padding: 24, borderLeft: "4px solid #00ff88" }}>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    margin: "0 0 8px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Active Users
                </p>
                <p style={{ fontSize: "2rem", fontWeight: 700, color: "#00ff88", margin: 0 }}>50K+</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
                  Monthly active patients
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Section - scrolled to from Get Started button */}
      <section
        id="landing-auth-section"
        style={{
          padding: "80px 24px",
          position: "relative",
          zIndex: 9,
          background: "linear-gradient(180deg, rgba(14, 165, 233, 0.05) 0%, rgba(32, 201, 201, 0.05) 100%)",
          borderTop: "1px solid rgba(14, 165, 233, 0.2)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2
              style={{
                fontSize: "2.5rem",
                fontWeight: 700,
                marginBottom: 16,
                background: "linear-gradient(135deg, var(--cyan-bright) 0%, var(--teal-accent) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Join Us Today
            </h2>
            <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto" }}>
              Choose your role and get started. Whether you're a patient seeking care or a doctor offering expertise,
              we have the right place for you.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 32,
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            {/* Patient Card */}
            <div
              className="glass-card"
              style={{
                padding: 32,
                textAlign: "center",
                transition: "all 0.3s ease",
                borderLeft: "4px solid var(--cyan-bright)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(14, 165, 233, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.2)";
              }}
            >
              <div
                style={{
                  fontSize: "3rem",
                  marginBottom: 16,
                  color: "var(--cyan-bright)",
                }}
              >
                👤
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 12, color: "#fff" }}>
                For Patients
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
                Book appointments, chat with doctors, track your health, and receive personalized care.
              </p>
              <button
                onClick={() => selectRole("patient")}
                style={{
                  background: "linear-gradient(135deg, var(--cyan-bright) 0%, rgba(14, 165, 233, 0.8) 100%)",
                  border: "none",
                  color: "#000",
                  padding: "12px 28px",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = "0 8px 20px rgba(14, 165, 233, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.3)";
                }}
              >
                Sign Up / Login
              </button>
            </div>

            {/* Doctor Card */}
            <div
              className="glass-card"
              style={{
                padding: 32,
                textAlign: "center",
                transition: "all 0.3s ease",
                borderLeft: "4px solid var(--teal-accent)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(32, 201, 201, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.2)";
              }}
            >
              <div
                style={{
                  fontSize: "3rem",
                  marginBottom: 16,
                  color: "var(--teal-accent)",
                }}
              >
                👨‍⚕️
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 12, color: "#fff" }}>
                For Doctors
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
                Manage your schedule, see patients, build your profile, and grow your practice.
              </p>
              <button
                onClick={() => selectRole("doctor")}
                style={{
                  background: "linear-gradient(135deg, var(--teal-accent) 0%, rgba(32, 201, 201, 0.8) 100%)",
                  border: "none",
                  color: "#000",
                  padding: "12px 28px",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(32, 201, 201, 0.3)",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = "0 8px 20px rgba(32, 201, 201, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = "0 4px 12px rgba(32, 201, 201, 0.3)";
                }}
              >
                Sign Up / Login
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}