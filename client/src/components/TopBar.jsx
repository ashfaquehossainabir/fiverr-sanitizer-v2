import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { IconSearch, IconKeyboard, IconShield } from "./icons.jsx";
import { MOD } from "../lib/platform.js";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
  return initials.join("") || "?";
}

export default function TopBar({ title, subtitle, onMenuClick, onAvatarClick, onOpenPalette, onOpenShortcuts }) {
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

      <button type="button" className="topbar-search" onClick={onOpenPalette} aria-label="Open command palette">
        <IconSearch size={16} />
        <span className="topbar-search-text">Search or jump to…</span>
        <kbd>{MOD} K</kbd>
      </button>

      <div className="topbar-right">
        {isAdmin && (
          <Link to="/admin" className="admin-pill-link" title="Admin Dashboard" aria-label="Admin Dashboard">
            <IconShield size={18} className="admin-pill-icon" />
            <span className="admin-pill-text">Admin</span>
          </Link>
        )}

        <button type="button" className="icon-btn topbar-shortcuts" onClick={onOpenShortcuts} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
          <IconKeyboard size={18} />
        </button>

        <ThemeToggle />

        <button type="button" className="avatar-btn" onClick={onAvatarClick} aria-label="Open account settings">
          <span className="avatar-circle">{getInitials(user?.name)}</span>
        </button>
      </div>
    </header>
  );
}
