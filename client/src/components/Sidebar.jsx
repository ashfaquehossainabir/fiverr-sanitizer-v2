import { useState } from "react";
import ConfirmModal from "./ConfirmModal.jsx";

export default function Sidebar({
  tabs,
  activeTabId,
  onSelectTab,
  onCreateTab,
  onRenameTab,
  onDeleteTab,
  isOpen,
  onClose
}) {
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

  const startRename = (tab) => {
    setRenamingId(tab._id);
    setRenameValue(tab.name);
    setMenuOpenFor(null);
  };

  const submitRename = (e, tabId) => {
    e.preventDefault();
    const name = renameValue.trim();
    if (name) onRenameTab(tabId, name);
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

        <button type="button" className="sidebar-new-tab" onClick={() => setCreating((v) => !v)}>
          + New Tab
        </button>

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
              className={`sidebar-tab-item ${activeTabId === tab._id ? "active" : ""}`}
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
                  />
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className="sidebar-tab-button"
                    onClick={() => {
                      onSelectTab(tab._id);
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
