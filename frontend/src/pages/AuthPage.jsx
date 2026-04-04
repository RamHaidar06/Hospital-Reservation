export default function AuthPage({
  page,
  setPage,
  activeAuthRole,
  patientAuthView,
  doctorAuthView,
  patientLogin,
  setPatientLogin,
  doctorLogin,
  setDoctorLogin,
  patientRegister,
  setPatientRegister,
  doctorRegister,
  setDoctorRegister,
  patientForgotEmail,
  setPatientForgotEmail,
  doctorForgotEmail,
  setDoctorForgotEmail,
  setPatientAuthView,
  setDoctorAuthView,
  setActiveAuthRole,
  handlePatientLoginSubmit,
  handlePatientRegisterSubmit,
  handleDoctorLoginSubmit,
  handleDoctorRegisterSubmit,
  handlePatientForgotSubmit,
  handleDoctorForgotSubmit,
}) {
  if (page !== "auth") return null;

  function goToHomepage() {
    setActiveAuthRole("patient");
    setPatientAuthView("login");
    setDoctorAuthView("login");
    setPage("landing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div
      id="auth-section"
      style={{
        padding: "80px 24px",
        position: "relative",
        zIndex: 10,
        background: "rgba(235, 244, 247, 0.34)",
      }}
    >
      <div className="max-w-md mx-auto">
        {activeAuthRole === "patient" && (
          <>
            {patientAuthView === "login" && (
              <div className="glass" style={{ padding: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      margin: "0 auto 16px",
                      background: "linear-gradient(135deg, var(--cyan-bright), var(--teal-accent))",
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                    }}
                  >
                    👤
                  </div>
                  <h3 style={{ margin: "0 0 8px 0" }}>Patient Login</h3>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
                    Access your health dashboard
                  </p>
                </div>

                <form onSubmit={handlePatientLoginSubmit}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, fontSize: "0.9rem" }}>
                      Email
                    </label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="patient@email.com"
                      required
                      value={patientLogin.email}
                      onChange={(e) => setPatientLogin((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, fontSize: "0.9rem" }}>
                      Password
                    </label>
                    <input
                      className="input-field"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={patientLogin.password}
                      onChange={(e) => setPatientLogin((s) => ({ ...s, password: e.target.value }))}
                    />
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)", marginBottom: 20, fontSize: "0.9rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!patientLogin.rememberMe}
                      onChange={(e) => setPatientLogin((s) => ({ ...s, rememberMe: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: "var(--cyan-bright)" }}
                    />
                    Remember me on this device
                  </label>

                  <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>
                    Sign In
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.9rem" }}>
                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                    New patient?{" "}
                    <button
                      type="button"
                      onClick={() => setPatientAuthView("register")}
                      style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Create account
                    </button>
                  </p>

                  <p style={{ color: "var(--text-secondary)", margin: "12px 0 0 0" }}>
                    Forgot password?{" "}
                    <button
                      type="button"
                      onClick={() => setPatientAuthView("forgot")}
                      style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Reset it
                    </button>
                  </p>

                  <p style={{ color: "var(--text-secondary)", margin: "12px 0 0 0" }}>
                    Are you a doctor?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAuthRole("doctor");
                        setDoctorAuthView("login");
                      }}
                      style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Doctor portal
                    </button>
                  </p>
                </div>

                <button type="button" className="btn-secondary" style={{ width: "100%", marginTop: 20 }} onClick={goToHomepage}>
                  Go Back to Homepage
                </button>
              </div>
            )}

            {patientAuthView === "register" && (
              <div className="glass" style={{ padding: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <h3 style={{ margin: "0 0 8px 0" }}>Create Patient Account</h3>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
                    Join our healthcare community
                  </p>
                </div>

                <form onSubmit={handlePatientRegisterSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                        First Name
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        placeholder="First"
                        required
                        value={patientRegister.firstName}
                        onChange={(e) => setPatientRegister((s) => ({ ...s, firstName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                        Last Name
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        placeholder="Last"
                        required
                        value={patientRegister.lastName}
                        onChange={(e) => setPatientRegister((s) => ({ ...s, lastName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      Email
                    </label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="patient@email.com"
                      required
                      value={patientRegister.email}
                      onChange={(e) => setPatientRegister((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      Phone
                    </label>
                    <input
                      className="input-field"
                      type="tel"
                      placeholder="70 000 000"
                      value={patientRegister.phone}
                      onChange={(e) => setPatientRegister((s) => ({ ...s, phone: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      Date of Birth
                    </label>
                    <input
                      className="input-field"
                      type="date"
                      value={patientRegister.dob}
                      onChange={(e) => setPatientRegister((s) => ({ ...s, dob: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      Password
                    </label>
                    <input
                      className="input-field"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={patientRegister.password}
                      onChange={(e) => setPatientRegister((s) => ({ ...s, password: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      Confirm Password
                    </label>
                    <input
                      className="input-field"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={patientRegister.confirmPassword}
                      onChange={(e) => setPatientRegister((s) => ({ ...s, confirmPassword: e.target.value }))}
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>
                    Create Account
                  </button>
                </form>

                <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 20, fontSize: "0.9rem" }}>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setPatientAuthView("login")}
                    style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Login here
                  </button>
                </p>

                <button type="button" className="btn-secondary" style={{ width: "100%", marginTop: 20 }} onClick={goToHomepage}>
                  Go Back to Homepage
                </button>
              </div>
            )}

            {patientAuthView === "forgot" && (
              <div className="glass" style={{ padding: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <h3 style={{ margin: "0 0 8px 0" }}>Reset Password</h3>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
                    We'll send you a recovery link
                  </p>
                </div>

                <form onSubmit={handlePatientForgotSubmit}>
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, fontSize: "0.9rem" }}>
                      Email
                    </label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="patient@email.com"
                      required
                      value={patientForgotEmail}
                      onChange={(e) => setPatientForgotEmail(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>
                    Send Recovery Link
                  </button>
                </form>

                <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 20, fontSize: "0.9rem" }}>
                  Back to{" "}
                  <button
                    type="button"
                    onClick={() => setPatientAuthView("login")}
                    style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                  >
                    login
                  </button>
                </p>

                <button type="button" className="btn-secondary" style={{ width: "100%", marginTop: 20 }} onClick={goToHomepage}>
                  Go Back to Homepage
                </button>
              </div>
            )}
          </>
        )}

        {activeAuthRole === "doctor" && (
          <>
            {doctorAuthView === "login" && (
              <div className="glass" style={{ padding: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      margin: "0 auto 16px",
                      background: "linear-gradient(135deg, var(--cyan-bright), var(--teal-accent))",
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                    }}
                  >
                    ⚕️
                  </div>
                  <h3 style={{ margin: "0 0 8px 0" }}>Physician Login</h3>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
                    Provider credential portal
                  </p>
                </div>

                <form onSubmit={handleDoctorLoginSubmit}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, fontSize: "0.9rem" }}>
                      Email
                    </label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="doctor@medicare.io"
                      required
                      value={doctorLogin.email}
                      onChange={(e) => setDoctorLogin((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, fontSize: "0.9rem" }}>
                      Password
                    </label>
                    <input
                      className="input-field"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={doctorLogin.password}
                      onChange={(e) => setDoctorLogin((s) => ({ ...s, password: e.target.value }))}
                    />
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)", marginBottom: 20, fontSize: "0.9rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!doctorLogin.rememberMe}
                      onChange={(e) => setDoctorLogin((s) => ({ ...s, rememberMe: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: "var(--cyan-bright)" }}
                    />
                    Remember me on this device
                  </label>

                  <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>
                    Sign In
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 24, display: "flex", flexDirection: "column", gap: 12, fontSize: "0.9rem" }}>
                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                    New provider?{" "}
                    <button
                      type="button"
                      onClick={() => setDoctorAuthView("register")}
                      style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Join network
                    </button>
                  </p>

                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                    Forgot password?{" "}
                    <button
                      type="button"
                      onClick={() => setDoctorAuthView("forgot")}
                      style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Reset it
                    </button>
                  </p>

                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                    Are you a patient?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAuthRole("patient");
                        setPatientAuthView("login");
                      }}
                      style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Patient portal
                    </button>
                  </p>
                </div>

                <button type="button" className="btn-secondary" style={{ width: "100%", marginTop: 20 }} onClick={goToHomepage}>
                  Go Back to Homepage
                </button>
              </div>
            )}

            {doctorAuthView === "register" && (
              <div className="glass" style={{ padding: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <h3 style={{ margin: "0 0 8px 0" }}>Join Our Network</h3>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
                    Provider credentialing application
                  </p>
                </div>

                <form onSubmit={handleDoctorRegisterSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                        First Name
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        placeholder="First"
                        required
                        value={doctorRegister.firstName}
                        onChange={(e) => setDoctorRegister((s) => ({ ...s, firstName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                        Last Name
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        placeholder="Last"
                        required
                        value={doctorRegister.lastName}
                        onChange={(e) => setDoctorRegister((s) => ({ ...s, lastName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      Email
                    </label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="doctor@email.com"
                      required
                      value={doctorRegister.email}
                      onChange={(e) => setDoctorRegister((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      Specialty
                    </label>
                    <select
                      className="input-field"
                      required
                      value={doctorRegister.specialty}
                      onChange={(e) => setDoctorRegister((s) => ({ ...s, specialty: e.target.value }))}
                    >
                      <option value="">Select Specialty</option>
                      <option value="cardiology">Cardiology</option>
                      <option value="dermatology">Dermatology</option>
                      <option value="neurology">Neurology</option>
                      <option value="orthopedics">Orthopedics</option>
                      <option value="pediatrics">Pediatrics</option>
                      <option value="general">General Practice</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      License Number
                    </label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="MED-XXXXX"
                      required
                      value={doctorRegister.license}
                      onChange={(e) => setDoctorRegister((s) => ({ ...s, license: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      Years of Experience
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      placeholder="0"
                      min="0"
                      max="70"
                      required
                      value={doctorRegister.experience}
                      onChange={(e) => setDoctorRegister((s) => ({ ...s, experience: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      Password
                    </label>
                    <input
                      className="input-field"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={doctorRegister.password}
                      onChange={(e) => setDoctorRegister((s) => ({ ...s, password: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: "0.85rem" }}>
                      Confirm Password
                    </label>
                    <input
                      className="input-field"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={doctorRegister.confirmPassword}
                      onChange={(e) => setDoctorRegister((s) => ({ ...s, confirmPassword: e.target.value }))}
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>
                    Submit Application
                  </button>
                </form>

                <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 20, fontSize: "0.9rem" }}>
                  Have credentials?{" "}
                  <button
                    type="button"
                    onClick={() => setDoctorAuthView("login")}
                    style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Login here
                  </button>
                </p>

                <button type="button" className="btn-secondary" style={{ width: "100%", marginTop: 20 }} onClick={goToHomepage}>
                  Go Back to Homepage
                </button>
              </div>
            )}

            {doctorAuthView === "forgot" && (
              <div className="glass" style={{ padding: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <h3 style={{ margin: "0 0 8px 0" }}>Reset Password</h3>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
                    We'll send you a recovery link
                  </p>
                </div>

                <form onSubmit={handleDoctorForgotSubmit}>
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, fontSize: "0.9rem" }}>
                      Email
                    </label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="doctor@email.com"
                      required
                      value={doctorForgotEmail}
                      onChange={(e) => setDoctorForgotEmail(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: "100%", padding: 16, fontWeight: 600 }}>
                    Send Recovery Link
                  </button>
                </form>

                <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 20, fontSize: "0.9rem" }}>
                  Back to{" "}
                  <button
                    type="button"
                    onClick={() => setDoctorAuthView("login")}
                    style={{ background: "none", border: "none", color: "var(--cyan-bright)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                  >
                    login
                  </button>
                </p>

                <button type="button" className="btn-secondary" style={{ width: "100%", marginTop: 20 }} onClick={goToHomepage}>
                  Go Back to Homepage
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
