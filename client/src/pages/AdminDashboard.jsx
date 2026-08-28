import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import ResetPasswordModal from "../components/ResetPasswordModal.jsx";
import Loader from "../components/Loader.jsx";

// How often the dashboard silently re-checks for new pending registrations.
const POLL_INTERVAL_MS = 20000;

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
  return initials.join("") || "?";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// Small inline icon set for the stat cards — kept dependency-free.
const STAT_ICONS = {
  pending: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
  total: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 5 18.5V20" />
      <circle cx="9.5" cy="8" r="3.25" />
      <path d="M19 20v-1.5a3.3 3.3 0 0 0-2.2-3.12" />
      <path d="M15 4.13a3.25 3.25 0 0 1 0 6.24" />
    </svg>
  ),
  active: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  ),
  deactivated: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </svg>
  ),
  admins: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l6.5 2.6v5.1c0 4.3-2.75 7.6-6.5 8.8-3.75-1.2-6.5-4.5-6.5-8.8V6.1L12 3.5z" />
      <path d="M9.5 12l1.8 1.8 3.2-3.6" />
    </svg>
  )
};

export default function AdminDashboard() {
  const { user: currentUser, logout } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [banner, setBanner] = useState({ type: "", text: "" });

  const [statusPending, setStatusPending] = useState(null); // user pending activate/deactivate
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [resetTarget, setResetTarget] = useState(null); // user pending password reset

  const [deleteTarget, setDeleteTarget] = useState(null); // user pending deletion
  const [deleting, setDeleting] = useState(false);

  const [rejectTarget, setRejectTarget] = useState(null); // pending registration to reject
  const [rejecting, setRejecting] = useState(false);

  const [approvingId, setApprovingId] = useState(null); // pending registration currently being approved

  const [notice, setNotice] = useState(""); // "new registration" alert banner
  const knownPendingIds = useRef(null); // null until first load, then a Set of ids we've already surfaced

  const [settings, setSettings] = useState(null); // { pendingApprovalEnabled }
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [togglingSetting, setTogglingSetting] = useState(false);

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/settings");
      setSettings(data.settings);
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.message || "Could not load settings." });
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const handleTogglePendingApproval = async () => {
    if (!settings || togglingSetting) return;
    const nextValue = !settings.pendingApprovalEnabled;
    setTogglingSetting(true);
    try {
      const { data } = await api.patch("/admin/settings", { pendingApprovalEnabled: nextValue });
      setSettings(data.settings);
      setBanner({
        type: "success",
        text: data.settings.pendingApprovalEnabled
          ? "Pending approval is now ON — new sign-ups will need admin approval before they can log in."
          : "Pending approval is now OFF — new sign-ups are auto-approved and go straight to the dashboard."
      });
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.message || "Could not update this setting." });
    } finally {
      setTogglingSetting(false);
    }
  };

  const loadUsers = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);

      // Notification: whenever a pending registration we haven't seen
      // before shows up, surface a banner (and a native notification if
      // the browser allows it) right here on the Admin Dashboard.
      const pendingIds = data.users.filter((u) => !u.isApproved).map((u) => u.id);
      if (knownPendingIds.current !== null) {
        const newOnes = pendingIds.filter((id) => !knownPendingIds.current.has(id));
        if (newOnes.length > 0) {
          const names = data.users
            .filter((u) => newOnes.includes(u.id))
            .map((u) => u.name)
            .join(", ");
          setNotice(
            newOnes.length === 1
              ? `New registration awaiting approval: ${names}`
              : `${newOnes.length} new registrations awaiting approval: ${names}`
          );
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("New account pending approval", {
              body: newOnes.length === 1 ? `${names} just signed up.` : `${newOnes.length} new users signed up.`
            });
          }
        }
      }
      knownPendingIds.current = new Set(pendingIds);
    } catch (err) {
      if (!isSilent) {
        setBanner({ type: "error", text: err.response?.data?.message || "Could not load users." });
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadSettings();

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Poll quietly in the background so new sign-ups show up without a
    // manual refresh — this is what makes the approval queue feel "live".
    const interval = setInterval(() => loadUsers(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadUsers, loadSettings]);

  const matchesSearch = useCallback(
    (u) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    },
    [search]
  );

  const pendingUsers = useMemo(() => users.filter((u) => !u.isApproved), [users]);
  const approvedUsers = useMemo(() => users.filter((u) => u.isApproved), [users]);

  const filteredPendingUsers = useMemo(() => pendingUsers.filter(matchesSearch), [pendingUsers, matchesSearch]);
  const filteredUsers = useMemo(() => approvedUsers.filter(matchesSearch), [approvedUsers, matchesSearch]);

  const stats = useMemo(
    () => ({
      total: users.length,
      pending: pendingUsers.length,
      active: approvedUsers.filter((u) => u.isActive).length,
      deactivated: approvedUsers.filter((u) => !u.isActive).length,
      admins: users.filter((u) => u.role === "admin").length
    }),
    [users, pendingUsers, approvedUsers]
  );

  const confirmStatusChange = async () => {
    if (!statusPending) return;
    setStatusSubmitting(true);
    const nextIsActive = !statusPending.isActive;
    try {
      const { data } = await api.patch(`/admin/users/${statusPending.id}/status`, {
        isActive: nextIsActive
      });
      setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
      setBanner({
        type: "success",
        text: `${data.user.name} is now ${data.user.isActive ? "active" : "deactivated"}.`
      });
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.message || "Could not update this user." });
    } finally {
      setStatusSubmitting(false);
      setStatusPending(null);
    }
  };

  const handleResetPassword = async (newPassword) => {
    const { data } = await api.put(`/admin/users/${resetTarget.id}/reset-password`, { newPassword });
    setBanner({ type: "success", text: data.message });
    setResetTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${deleteTarget.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setBanner({ type: "success", text: `${deleteTarget.name} was deleted.` });
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.message || "Could not delete this user." });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleApprove = async (pendingUser) => {
    setApprovingId(pendingUser.id);
    try {
      const { data } = await api.patch(`/admin/users/${pendingUser.id}/approve`);
      setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
      knownPendingIds.current?.delete(pendingUser.id);
      setBanner({ type: "success", text: `${data.user.name} was approved and can now log in.` });
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.message || "Could not approve this user." });
    } finally {
      setApprovingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const { data } = await api.delete(`/admin/users/${rejectTarget.id}/reject`);
      setUsers((prev) => prev.filter((u) => u.id !== rejectTarget.id));
      knownPendingIds.current?.delete(rejectTarget.id);
      setBanner({ type: "success", text: data.message || `${rejectTarget.name}'s registration was rejected.` });
    } catch (err) {
      setBanner({ type: "error", text: err.response?.data?.message || "Could not reject this registration." });
    } finally {
      setRejecting(false);
      setRejectTarget(null);
    }
  };

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <span className="sidebar-logo">FS</span>
          <div className="admin-topbar-heading">
            <h1>Admin Dashboard</h1>
            <p>Manage every registered user</p>
          </div>
        </div>

        <div className="admin-topbar-actions">
          <Link to="/dashboard" className="admin-back-link" aria-label="Back to Workspace">
            <svg className="admin-topbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M11 6l-6 6 6 6" />
            </svg>
            <span className="admin-topbar-action-text">Back to Workspace</span>
          </Link>
          <button
            type="button"
            className="logout-btn admin-logout-btn"
            onClick={() => setLogoutConfirmOpen(true)}
            aria-label="Log Out"
          >
            <svg className="admin-topbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span className="admin-topbar-action-text">Log Out</span>
          </button>
        </div>
      </header>

      <main className="admin-content">
        {banner.text && (
          <div className={`dashboard-error-banner ${banner.type === "success" ? "success" : ""}`}>
            <span>{banner.text}</span>
            <button type="button" onClick={() => setBanner({ type: "", text: "" })}>✕</button>
          </div>
        )}

        {notice && (
          <div className="dashboard-error-banner admin-notice-banner">
            <span>🔔 {notice}</span>
            <button type="button" onClick={() => setNotice("")}>✕</button>
          </div>
        )}

        <div className="admin-stats">
          <div
            className={`admin-stat-card ${stats.pending > 0 ? "is-pending" : ""}`}
            data-stat="pending"
            tabIndex={0}
          >
            <span className="admin-stat-icon">{STAT_ICONS.pending}</span>
            <span className="admin-stat-body">
              <span className="admin-stat-value">{stats.pending}</span>
              <span className="admin-stat-label">Pending Approval</span>
            </span>
          </div>
          <div className="admin-stat-card" data-stat="total" tabIndex={0}>
            <span className="admin-stat-icon">{STAT_ICONS.total}</span>
            <span className="admin-stat-body">
              <span className="admin-stat-value">{stats.total}</span>
              <span className="admin-stat-label">Total Users</span>
            </span>
          </div>
          <div className="admin-stat-card" data-stat="active" tabIndex={0}>
            <span className="admin-stat-icon">{STAT_ICONS.active}</span>
            <span className="admin-stat-body">
              <span className="admin-stat-value">{stats.active}</span>
              <span className="admin-stat-label">Active</span>
            </span>
          </div>
          <div className="admin-stat-card" data-stat="deactivated" tabIndex={0}>
            <span className="admin-stat-icon">{STAT_ICONS.deactivated}</span>
            <span className="admin-stat-body">
              <span className="admin-stat-value">{stats.deactivated}</span>
              <span className="admin-stat-label">Deactivated</span>
            </span>
          </div>
          <div className="admin-stat-card" data-stat="admins" tabIndex={0}>
            <span className="admin-stat-icon">{STAT_ICONS.admins}</span>
            <span className="admin-stat-body">
              <span className="admin-stat-value">{stats.admins}</span>
              <span className="admin-stat-label">Admins</span>
            </span>
          </div>
        </div>

        <div className="admin-setting-card">
          <div className="admin-setting-info">
            <h3>Pending Approval for Sign-Ups</h3>
            <p>
              {settingsLoading
                ? "Loading current setting..."
                : settings?.pendingApprovalEnabled
                ? "New registrations wait in the queue above until an admin approves them."
                : "New registrations are auto-approved and sent straight to the dashboard — the approval queue is skipped."}
            </p>
          </div>

          <label
            className={`toggle-switch ${settingsLoading || togglingSetting ? "is-disabled" : ""}`}
            title={
              settings?.pendingApprovalEnabled
                ? "Turn off to let new sign-ups skip approval"
                : "Turn on to require admin approval for new sign-ups"
            }
          >
            <input
              type="checkbox"
              checked={Boolean(settings?.pendingApprovalEnabled)}
              disabled={settingsLoading || togglingSetting}
              onChange={handleTogglePendingApproval}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="dashboard-loading">
            <Loader label="Loading users" />
          </div>
        ) : (
          <>
            {filteredPendingUsers.length > 0 && (
              <section className="admin-pending-section">
                <h2 className="admin-section-title">
                  Pending Approvals {" "}
                  <span className="admin-section-count">{filteredPendingUsers.length}</span>
                </h2>

                <div className="admin-user-grid">
                  {filteredPendingUsers.map((u) => (
                    <div className="admin-user-card admin-user-card-pending" key={u.id}>
                      <div className="admin-user-card-top">
                        <div className="account-avatar-lg admin-user-avatar">{getInitials(u.name)}</div>
                        <div className="admin-user-identity">
                          <h3>{u.name}</h3>
                          <p>{u.email}</p>
                        </div>
                      </div>

                      <div className="admin-user-badges">
                        <span className="admin-badge status-pending">Awaiting Approval</span>
                        <span className="admin-badge admin-badge-date">Requested {formatDate(u.createdAt)}</span>
                      </div>

                      <div className="admin-user-actions admin-user-actions-pending">
                        <button
                          type="button"
                          className="admin-action-btn accent"
                          disabled={approvingId === u.id}
                          onClick={() => handleApprove(u)}
                        >
                          {approvingId === u.id ? "Approving..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn danger"
                          disabled={approvingId === u.id}
                          onClick={() => setRejectTarget(u)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <h2 className="admin-section-title">All Users</h2>

            {filteredUsers.length === 0 ? (
              <div className="dashboard-loading">
                {approvedUsers.length === 0 ? "No approved users yet." : "No users match your search."}
              </div>
            ) : (
              <div className="admin-user-grid">
                {filteredUsers.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <div className="admin-user-card" key={u.id}>
                  <div className="admin-user-card-top">
                    <div className="account-avatar-lg admin-user-avatar">{getInitials(u.name)}</div>
                    <div className="admin-user-identity">
                      <h3>
                        {u.name}
                        {isSelf && <span className="admin-you-tag">You</span>}
                      </h3>
                      <p>{u.email}</p>
                    </div>
                  </div>

                  <div className="admin-user-badges">
                    <span className={`admin-badge role-${u.role}`}>{u.role}</span>
                    <span className={`admin-badge status-${u.isActive ? "active" : "inactive"}`}>
                      {u.isActive ? "Active" : "Deactivated"}
                    </span>
                    <span className="admin-badge admin-badge-date">Joined {formatDate(u.createdAt)}</span>
                  </div>

                  <div className="admin-user-actions">
                    <button
                      type="button"
                      className={`admin-action-btn ${u.isActive ? "warn" : "accent"}`}
                      disabled={isSelf}
                      title={isSelf ? "You can't deactivate your own account" : undefined}
                      onClick={() => setStatusPending(u)}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button type="button" className="admin-action-btn" onClick={() => setResetTarget(u)}>
                      Reset Password
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn danger"
                      disabled={isSelf}
                      title={isSelf ? "You can't delete your own account here" : undefined}
                      onClick={() => setDeleteTarget(u)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {statusPending && (
        <ConfirmModal
          title={
            statusPending.isActive
              ? `Deactivate ${statusPending.name}?`
              : `Activate ${statusPending.name}?`
          }
          message={
            statusPending.isActive
              ? "They won't be able to log in until an admin reactivates their account."
              : "This restores their ability to log in and use the app."
          }
          confirmLabel={statusPending.isActive ? "Deactivate" : "Activate"}
          variant={statusPending.isActive ? "danger" : "default"}
          loading={statusSubmitting}
          onConfirm={confirmStatusChange}
          onCancel={() => setStatusPending(null)}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onConfirm={handleResetPassword}
          onCancel={() => setResetTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`Delete ${deleteTarget.name}?`}
          message="This permanently deletes their account, tabs, and saved messages. This action cannot be undone."
          confirmLabel="Delete User"
          variant="danger"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {rejectTarget && (
        <ConfirmModal
          title={`Reject ${rejectTarget.name}'s registration?`}
          message="This permanently deletes their pending account from the database. They will need to submit a brand-new registration to request access again."
          confirmLabel="Reject"
          variant="danger"
          loading={rejecting}
          onConfirm={confirmReject}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {logoutConfirmOpen && (
        <ConfirmModal
          title="Log out of the admin dashboard?"
          message="You'll need to sign in again to manage users."
          confirmLabel="Log Out"
          variant="danger"
          onConfirm={logout}
          onCancel={() => setLogoutConfirmOpen(false)}
        />
      )}
    </div>
  );
}
