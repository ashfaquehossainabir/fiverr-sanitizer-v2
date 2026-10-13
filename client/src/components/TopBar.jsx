import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
  return initials.join("") || "?";
}

export default function TopBar({ title, subtitle, onMenuClick, onAvatarClick }) {
  const { user, isAdmin } = useAuth();

  return (
    <header className="topbar">
      <button type="button" className="menu-toggle" onClick={onMenuClick} aria-label="Open menu">
        ☰
      </button>

      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && (
          <>
            <span className="crumb-sep" aria-hidden="true">/</span>
            <span className="crumb">{subtitle}</span>
          </>
        )}
      </div>

      <div className="topbar-right">
        {isAdmin && (
          <Link to="/admin" className="admin-pill-link" title="Admin Dashboard">
            Admin
          </Link>
        )}

        <ThemeToggle />

        <button type="button" className="avatar-btn" onClick={onAvatarClick} aria-label="Open account settings">
          <span className="avatar-circle">{getInitials(user?.name)}</span>
        </button>
      </div>
    </header>
  );
}
