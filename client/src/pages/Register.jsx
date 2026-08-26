import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(null); // set to the server message once submitted

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Please fill in every field.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await register(form.name, form.email, form.password);

      // If pending approval is OFF, the account is already logged in at
      // this point (AuthContext stored the token) — the surrounding
      // PublicOnlyRoute will redirect straight to /dashboard on its own,
      // so there's nothing else to do here.
      if (data.token) return;

      setPending(
        data.message ||
          "Your account has been created and is pending admin approval. You'll be able to log in once it's approved."
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create your account. Please try again.");
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
            Write freely. Ship <em>clean</em>.
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
            Flags emails, phone numbers and 30+ reserved terms automatically — so
            your messages stay Fiverr-safe.
          </p>

          <div className="auth-showcase-foot">
            <span className="status-dot" />
            Free to join — takes less than a minute
          </div>
        </aside>

        <div className="auth-panel">
          <div className="auth-panel-mobile-brand">
            <span className="auth-logo">FS</span>
            <span>Fiverr Sanitizer</span>
          </div>

          {pending ? (
            <>
              <div className="auth-brand">
                <h1>Account created 🎉</h1>
                <p>One more step before you can sign in.</p>
              </div>

              <div className="auth-success">{pending}</div>

              <p className="auth-switch">
                Already approved? <Link to="/login">Log in</Link>
              </p>
            </>
          ) : (
            <>
              <div className="auth-brand">
                <h1>Create your account</h1>
                <p>Organize sanitized Fiverr messages into tabs, synced everywhere.</p>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <form className="auth-form" onSubmit={handleSubmit}>
                <label>
                  Full Name
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={handleChange}
                  />
                </label>

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
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={form.password}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Confirm Password
                  <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                  />
                </label>

                <button type="submit" className="auth-submit" disabled={submitting}>
                  {submitting ? "Creating account..." : "Create Account"}
                </button>
              </form>

              <p className="auth-switch">
                Already have an account? <Link to="/login">Log in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
