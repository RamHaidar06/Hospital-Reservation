import React, { useState, useEffect } from "react";
import { apiFetch } from "../../API/http";

/**
 * OTP Verification Component
 * Used after successful password verification to verify OTP
 */
export default function OTPVerification({
  email,
  userRole,
  onSuccess,
  onCancel,
  expiresIn = 600, // seconds (10 minutes default)
  rememberByDefault = false,
}) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  const [message, setMessage] = useState("OTP sent to your email");
  const [rememberDevice, setRememberDevice] = useState(rememberByDefault);

  useEffect(() => {
    setRememberDevice(rememberByDefault);
  }, [rememberByDefault]);

  // Timer for OTP expiration
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedOtp = String(otp || "").trim().replace(/\D/g, "");

      if (!normalizedOtp || normalizedOtp.length !== 6) {
        setError("Please enter a 6-digit code");
        setLoading(false);
        return;
      }

      if (timeLeft <= 0) {
        setError("OTP has expired. Please request a new one.");
        setLoading(false);
        return;
      }

      const data = await apiFetch("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email,
          otp: normalizedOtp,
          role: userRole,
          rememberDevice,
        }),
      });

      // apiFetch throws on non-2xx, so success means verified.
      localStorage.setItem("token", data.token);
      await onSuccess(data, {
        rememberDevice,
        email,
        role: userRole,
      });
    } catch (err) {
      setError(err?.message || "Error verifying OTP. Please try again.");
      console.error("OTP verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({
          email,
          role: userRole,
        }),
      });

      setMessage("New OTP sent to your email");
      setTimeLeft(data.expiresIn || 600);
      setOtp("");
    } catch (err) {
      setError("Error resending OTP. Please try again.");
      console.error("Resend OTP error:", err);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, var(--dark-bg) 0%, rgba(14, 165, 233, 0.05) 100%)",
        padding: "24px",
      }}
    >
      <div
        className="glass-card"
        style={{
          padding: "40px",
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: 12,
            background: "linear-gradient(135deg, var(--cyan-bright) 0%, var(--teal-accent) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Verify Your Identity
        </h2>

        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: 24,
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
        >
          We've sent a 6-digit code to your email. Please enter it below to complete your login.
        </p>

        <form onSubmit={handleVerifyOTP} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* OTP Input */}
          <div style={{ position: "relative" }}>
            <label
              style={{
                display: "block",
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                marginBottom: 8,
                textAlign: "left",
              }}
            >
              Verification Code
            </label>
            <input
              type="text"
              maxLength="6"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(14, 165, 233, 0.1)",
                border: `2px solid ${error ? "#ff4444" : "var(--cyan-bright)"}`,
                borderRadius: "6px",
                color: "#fff",
                fontSize: "1.3rem",
                letterSpacing: "0.4em",
                textAlign: "center",
                fontFamily: "monospace",
                fontWeight: 600,
                transition: "all 0.3s ease",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--teal-accent)";
                e.target.style.boxShadow = "0 0 12px rgba(32, 201, 201, 0.3)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error ? "#ff4444" : "var(--cyan-bright)";
                e.target.style.boxShadow = "none";
              }}
              disabled={loading}
            />
          </div>

          {/* Timer */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Code expires in:
            </span>
            <span
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: timeLeft <= 60 ? "#ff6b6b" : "var(--cyan-bright)",
                fontFamily: "monospace",
                minWidth: "50px",
              }}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "rgba(255, 68, 68, 0.1)",
                border: "1px solid #ff4444",
                color: "#ff8888",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && !error && (
            <div
              style={{
                background: "rgba(0, 255, 136, 0.1)",
                border: "1px solid #00ff88",
                color: "#00ff88",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              {message}
            </div>
          )}

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, var(--cyan-bright) 0%, var(--teal-accent) 100%)",
              border: "none",
              color: "#000",
              fontWeight: 600,
              fontSize: "0.95rem",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              opacity: loading ? 0.6 : 1,
              boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.boxShadow = "0 8px 24px rgba(14, 165, 233, 0.5)";
                e.target.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.3)";
              e.target.style.transform = "translateY(0)";
            }}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
              justifyContent: "center",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--cyan-bright)" }}
            />
            Remember this device for 30 days
          </label>

          {/* Resend OTP */}
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={resendLoading || timeLeft > 300} // Allow resend if less than 5 minutes left
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid var(--cyan-bright)",
              color: "var(--cyan-bright)",
              fontWeight: 500,
              fontSize: "0.9rem",
              borderRadius: "6px",
              cursor: resendLoading || timeLeft > 300 ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              opacity: resendLoading || timeLeft > 300 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!resendLoading && timeLeft <= 300) {
                e.target.style.background = "rgba(14, 165, 233, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
            }}
          >
            {resendLoading ? "Sending..." : timeLeft > 300 ? "Resend available soon" : "Resend Code"}
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid var(--text-secondary)",
              color: "var(--text-secondary)",
              fontWeight: 500,
              fontSize: "0.9rem",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
            }}
          >
            Cancel
          </button>
        </form>

        {/* Info Footer */}
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.75rem",
            marginTop: 24,
            marginBottom: 0,
          }}
        >
          For security, this code is valid for 10 minutes only and can only be used once.
        </p>
      </div>
    </div>
  );
}
