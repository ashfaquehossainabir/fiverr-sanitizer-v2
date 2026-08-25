import { useState } from "react";

export default function ResetPasswordModal({ user, onConfirm, onCancel }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(newPassword);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset the password.");
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal reset-password-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
          ✕
        </button>

        <h3 id="reset-password-title" className="confirm-modal-title">
          Reset password
        </h3>
        <p className="confirm-modal-message">
          Set a new password for <strong>{user?.name}</strong> ({user?.email}). They&apos;ll need
          to use it next time they log in.
        </p>

        <form onSubmit={handleSubmit} className="settings-form">
          <label>
            New Password
            <input
              autoFocus
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label>
            Confirm New Password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          {error && <p className="settings-msg error">{error}</p>}

          <div className="confirm-modal-actions">
            <button type="button" className="cancel-btn" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="confirm-btn" disabled={submitting}>
              {submitting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
