import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import ConfirmModal from "./ConfirmModal.jsx";

const VIEWS = [
  { id: "workspace", label: "Workspace", icon: "✎" },
  { id: "overview", label: "Overview", icon: "▤" },
  { id: "planner", label: "Planner", icon: "✓" },
  { id: "clients", label: "Clients", icon: "☺" },
  { id: "templates", label: "Templates", icon: "❝" },
  { id: "search", label: "Search", icon: "⌕" }
];

export default function Sidebar({
  view,
  onChangeView,
  followUpCount = 0,
  taskCount = 0,
  tabs,
  activeTabId,
  onSelectTab,
  onCreateTab,
  onRenameTab,
  onDeleteTab,
  isOpen,
  onClose,
  onOpenAccount
}) {
  const { user } = useAuth();
  const renameDone = useRef(false);
  const [creating, setCreating] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [tabPendingDelete, setTabPendingDelete] = useState(null);
  const [deletingTab, setDeletingTab] = useState(false);

  const handleCreate = (e) => {
    e.preventDefault();
    const name = newTabName.trim();
    if (!name) return;
    onCreateTab(name);
    setNewTabName("");
    setCreating(false);
  };

  // Close the tab "⋮" menu when clicking elsewhere; Escape closes it (or the mobile drawer).
  useEffect(() => {
    const onDown = (e) => {
      if (!e.target.closest?.(".sidebar-tab-menu-wrap")) setMenuOpenFor(null);
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setMenuOpenFor(null);
      setCreating(false);
      if (isOpen) onClose();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  const startRename = (tab) => {
    renameDone.current = false;
    setRenamingId(tab._id);
    setRenameValue(tab.name);
    setMenuOpenFor(null);
  };

  // Enter submits AND the input then blurs as it unmounts: only rename once.
  const submitRename = (e, tabId) => {
    e.preventDefault();
    if (renameDone.current) return;
    renameDone.current = true;
    const name = renameValue.trim();
    const current = tabs.find((t) => t._id === tabId);
    if (name && name !== current?.name) onRenameTab(tabId, name);
    setRenamingId(null);
  };

  const confirmDeleteTab = async () => {
    if (!tabPendingDelete) return;
    setDeletingTab(true);
    try {
      await onDeleteTab(tabPendingDelete._id, tabPendingDelete.name);
    } finally {
      setDeletingTab(false);
      setTabPendingDelete(null);
    }
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-logo">FS</span>
            <span>Sanitizer</span>
          </div>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <p className="sidebar-section-label sidebar-menu-label">Menu</p>
        <nav className="sidebar-views" aria-label="Sections">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`sidebar-view-btn ${view === v.id ? "active" : ""} ${v.id === "search" ? "sidebar-view-search" : ""}`}
              onClick={() => {
                onChangeView(v.id);
                onClose();
              }}
            >
              <span className="sidebar-view-icon" aria-hidden="true">{v.icon}</span>
              <span>{v.label}</span>
              {v.id === "clients" && followUpCount > 0 && (
                <span className="sidebar-badge" title="Follow-ups due">{followUpCount}</span>
              )}
              {v.id === "planner" && taskCount > 0 && (
                <span className="sidebar-badge" title="Tasks due today or overdue">{taskCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-section-row">
          <p className="sidebar-section-label">
            Tabs <span className="sidebar-count">{tabs.length}</span>
          </p>
          <button
            type="button"
            className="sidebar-add-tab"
            onClick={() => setCreating((v) => !v)}
            aria-label="New tab"
            title="New tab"
          >
            +
          </button>
        </div>

        {creating && (
          <form className="sidebar-new-tab-form" onSubmit={handleCreate}>
            <input
              autoFocus
              type="text"
              placeholder="Tab name..."
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              maxLength={40}
            />
            <div className="sidebar-new-tab-actions">
              <button type="submit">Add</button>
              <button type="button" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        )}

        <nav className="sidebar-tabs">
          {tabs.length === 0 && !creating && (
            <p className="sidebar-empty">No tabs yet. Create one to start saving sanitized messages.</p>
          )}

          {tabs.map((tab) => (
            <div
              key={tab._id}
              className={`sidebar-tab-item ${view === "workspace" && activeTabId === tab._id ? "active" : ""}`}
            >
              {renamingId === tab._id ? (
                <form className="sidebar-rename-form" onSubmit={(e) => submitRename(e, tab._id)}>
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    maxLength={40}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={(e) => submitRename(e, tab._id)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        renameDone.current = true;
                        setRenamingId(null);
                      }
                    }}
                  />
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className="sidebar-tab-button"
                    onClick={() => {
                      onSelectTab(tab._id);
                      onChangeView("workspace");
                      onClose();
                    }}
                    title={tab.name}
                  >
                    <span className="sidebar-tab-dot">#</span>
                    <span className="sidebar-tab-name">{tab.name}</span>
                  </button>

                  <div className="sidebar-tab-menu-wrap">
                    <button
                      type="button"
                      className="sidebar-tab-menu-btn"
                      onClick={() => setMenuOpenFor(menuOpenFor === tab._id ? null : tab._id)}
                      aria-label="Tab options"
                    >
                      ⋮
                    </button>

                    {menuOpenFor === tab._id && (
                      <div className="sidebar-tab-menu">
                        <button type="button" onClick={() => startRename(tab)}>Rename</button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setMenuOpenFor(null);
                            setTabPendingDelete(tab);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>

        <button type="button" className="sidebar-user" onClick={() => { onOpenAccount?.(); onClose(); }} title="Account settings">
          <span className="sidebar-user-avatar">{(user?.name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}</span>
          <span className="sidebar-user-text">
            <strong>{user?.name || "Account"}</strong>
            <small>{user?.email}</small>
          </span>
        </button>
      </aside>

      {tabPendingDelete && (
        <ConfirmModal
          title={`Delete "${tabPendingDelete.name}"?`}
          message="This also permanently deletes every message saved in this tab. This action cannot be undone."
          confirmLabel="Delete Tab"
          variant="danger"
          loading={deletingTab}
          onConfirm={confirmDeleteTab}
          onCancel={() => setTabPendingDelete(null)}
        />
      )}
    </>
  );
}
