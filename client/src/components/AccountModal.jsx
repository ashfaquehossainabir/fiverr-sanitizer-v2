import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import ConfirmModal from "./ConfirmModal.jsx";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
  return initials.join("") || "?";
}

export default function AccountModal({ onClose }) {
  const { user, updateProfile, updatePassword, deleteAccount, logout } = useAuth();

  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });

    if (
      profileForm.name.trim() === user?.name &&
      profileForm.email.trim().toLowerCase() === user?.email
    ) {
      setProfileMsg({ type: "error", text: "No changes to save." });
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile({ name: profileForm.name.trim(), email: profileForm.email.trim() });
      setProfileMsg({ type: "success", text: "Account details updated." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.message || "Could not update your account." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: "", text: "" });

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMsg({ type: "error", text: "Fill in both password fields." });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    setPasswordSaving(true);
    try {
      await updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordMsg({ type: "success", text: "Password updated successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.response?.data?.message || "Could not update your password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteMsg("");

    if (!deletePassword) {
      setDeleteMsg("Enter your password to confirm.");
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      onClose();
    } catch (err) {
      setDeleteMsg(err.response?.data?.message || "Could not delete your account.");
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal account-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close settings">
          ✕
        </button>

        <div className="account-modal-header">
          <div className="account-avatar-lg">{getInitials(user?.name)}</div>
          <div>
            <h2>{user?.name}</h2>
            <p>{user?.email}</p>
          </div>
        </div>

        <div className="account-modal-body">
          <section className="settings-section">
            <h3>Account Details</h3>
            <form onSubmit={handleProfileSubmit} className="settings-form">
              <label>
                Full Name
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>

              {profileMsg.text && (
                <p className={`settings-msg ${profileMsg.type}`}>{profileMsg.text}</p>
              )}

              <button type="submit" className="settings-save-btn" disabled={profileSaving}>
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </section>

          <section className="settings-section">
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordSubmit} className="settings-form">
              <label>
                Current Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                />
              </label>
              <label>
                New Password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                />
              </label>
              <label>
                Confirm New Password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </label>

              {passwordMsg.text && (
                <p className={`settings-msg ${passwordMsg.type}`}>{passwordMsg.text}</p>
              )}

              <button type="submit" className="settings-save-btn" disabled={passwordSaving}>
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </form>
          </section>

          <section className="settings-section danger-zone">
            <h3>Danger Zone</h3>

            {!showDeleteConfirm ? (
              <button
                type="button"
                className="delete-account-btn"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount} className="settings-form">
                <p className="danger-warning">
                  This permanently deletes your account, tabs, and saved messages. Enter your password to confirm.
                </p>
                <input
                  type="password"
                  placeholder="Your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />

                {deleteMsg && <p className="settings-msg error">{deleteMsg}</p>}

                <div className="danger-actions">
                  <button type="submit" className="delete-account-btn" disabled={deleting}>
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword("");
                      setDeleteMsg("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          <button type="button" className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            Log Out
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <ConfirmModal
          title="Log out of your account?"
          message="You'll need to sign back in to access your tabs and saved messages."
          confirmLabel="Log Out"
          cancelLabel="Stay Logged In"
          variant="danger"
          onConfirm={logout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
}
