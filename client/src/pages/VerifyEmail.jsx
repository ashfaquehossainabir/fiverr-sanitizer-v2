import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "../components/Loader.jsx";

export default function VerifyEmail() {
  const { token } = useParams();
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent

  useEffect(() => {
    // Guards against React 18 StrictMode's dev double-invoke, which would
    // otherwise burn the (single-use) token on a second call.
    if (hasRun.current) return;
    hasRun.current = true;

    async function run() {
      try {
        await verifyEmail(token);
        setStatus("success");
        const redirect = setTimeout(() => navigate("/dashboard", { replace: true }), 1800);
        return () => clearTimeout(redirect);
      } catch (err) {
        setStatus("error");
        setMessage(err.response?.data?.message || "This verification link is invalid or has expired.");
      }
    }

    run();
  }, [token, verifyEmail, navigate]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResendState("sending");
    try {
      await resendVerification(resendEmail);
    } finally {
      setResendState("sent");
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-shell auth-shell-single">
        <div className="auth-panel">
          <div className="auth-panel-mobile-brand">
            <span className="auth-logo">FS</span>
            <span>Fiverr Sanitizer</span>
          </div>

          {status === "verifying" && (
            <>
              <div className="auth-brand">
                <h1>Verifying your email...</h1>
                <p>Hang tight, this only takes a second.</p>
              </div>
              <Loader label="Verifying" />
            </>
          )}

          {status === "success" && (
            <>
              <div className="auth-brand">
                <h1>Email verified 🎉</h1>
                <p>Your account is ready. Taking you to your dashboard...</p>
              </div>
              <div className="auth-success">{message || "Email verified successfully."}</div>
              <p className="auth-switch">
                <Link to="/dashboard">Go to dashboard now</Link>
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="auth-brand">
                <h1>Verification failed</h1>
                <p>That link didn't work, but you can request a fresh one below.</p>
              </div>
              <div className="auth-error">{message}</div>

              <form className="auth-form" onSubmit={handleResend}>
                <label>
                  Email
                  <input
                    type="email"
                    name="resendEmail"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                  />
                </label>
                <button type="submit" className="auth-submit" disabled={resendState === "sending"}>
                  {resendState === "sending"
                    ? "Sending..."
                    : resendState === "sent"
                    ? "Sent — check your inbox ✓"
                    : "Send a new verification email"}
                </button>
              </form>

              <p className="auth-switch">
                <Link to="/login">Back to log in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
