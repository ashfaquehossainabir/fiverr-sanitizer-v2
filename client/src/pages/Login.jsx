import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-shell">
        <aside className="auth-showcase">
          <div className="auth-wordmark">
            <span className="auth-logo">FS</span>
            <span className="auth-wordmark-text">Fiverr Sanitizer</span>
          </div>

          <h2>
            Every message, <em>linted</em> before it ships.
          </h2>

          <div className="auth-demo" aria-hidden="true">
            <div className="auth-demo-bar">
              <span className="auth-demo-dot is-red" />
              <span className="auth-demo-dot is-amber" />
              <span className="auth-demo-dot is-green" />
              <span className="auth-demo-filename">message.txt — sanitized</span>
            </div>
            <div className="auth-demo-body">
              Hey! Thanks for the order 🙌 You can <span className="highlight">e_mail</span> me
              or ping me on <span className="highlight">Wh_atsApp</span> — my number&apos;s{" "}
              <span className="phone-highlight">1-7-8-1-2-3-4-5-6-7</span>. We can sort{" "}
              <span className="highlight">pa_yment</span> once the brief&apos;s locked in
              <span className="auth-demo-cursor" />
            </div>
          </div>

          <p className="auth-demo-caption">
            Flags emails, phone numbers and 30+ reserved terms automatically so
            your messages stay Fiverr-safe.
          </p>

          <div className="auth-showcase-foot">
            <span className="status-dot" />
            Trusted by freelancers to keep conversations on-platform
          </div>
        </aside>

        <div className="auth-panel">
          <div className="auth-panel-mobile-brand">
            <span className="auth-logo">FS</span>
            <span>Fiverr Sanitizer</span>
          </div>

          <div className="auth-brand">
            <h1>Welcome back</h1>
            <p>Log in to keep sanitizing and organizing your Fiverr messages.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={form.email}
                onChange={handleChange}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
              />
            </label>

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="auth-switch">
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
