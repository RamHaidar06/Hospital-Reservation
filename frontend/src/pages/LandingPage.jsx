export default function LandingPage({ openAuthSelector }) {
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
                <button onClick={openAuthSelector} className="btn-primary">
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
    </div>
  );
}