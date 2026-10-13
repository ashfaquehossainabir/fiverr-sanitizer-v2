import { useState } from "react";
import ConfirmModal from "./ConfirmModal.jsx";
import ViewMessageModal from "./ViewMessageModal.jsx";
import Loader from "./Loader.jsx";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function SavedMessages({ messages, loading, onDelete, onTogglePin, clientNames = {} }) {
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [viewingMessage, setViewingMessage] = useState(null);
  const [messagePendingDelete, setMessagePendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleCopy = async (id, text) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const confirmDelete = async () => {
    if (!messagePendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(messagePendingDelete._id);
    } finally {
      setDeleting(false);
      setMessagePendingDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="saved-messages-empty">
        <Loader label="Loading saved messages" />
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="saved-messages-empty">
        No messages saved in this tab yet. Sanitize a message above and click{" "}
        <strong>Save to Tab</strong> to keep it here.
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? messages.filter((m) => `${m.sanitizedText} ${clientNames[m.client] || ""}`.toLowerCase().includes(q))
    : messages;

  return (
    <div className="saved-messages-list">
      {messages.length > 3 && (
        <input
          className="panel-search saved-search"
          type="search"
          placeholder="Search messages in this tab…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {visible.length === 0 && <div className="saved-messages-empty">No saved messages match “{query}”.</div>}

      {visible.map((msg) => (
        <div className={`saved-message-card ${msg.pinned ? "is-pinned" : ""}`} key={msg._id}>
          <div className="saved-message-meta">
            <span className="saved-message-when">
              {msg.pinned && <span className="pin-mark" title="Pinned">📌</span>}
              {formatDate(msg.createdAt)}
            </span>
            <div className="saved-message-actions">
              <button type="button" onClick={() => onTogglePin(msg)}>
                {msg.pinned ? "Unpin" : "Pin"}
              </button>
              <button type="button" onClick={() => setViewingMessage(msg)}>
                View
              </button>
              <button type="button" onClick={() => handleCopy(msg._id, msg.sanitizedText)}>
                {copiedId === msg._id ? "Copied!" : "Copy"}
              </button>
              <button type="button" className="danger" onClick={() => setMessagePendingDelete(msg)}>
                Delete
              </button>
            </div>
          </div>
          <p className="saved-message-text">{msg.sanitizedText}</p>
          {msg.client && clientNames[msg.client] && (
            <div className="saved-message-foot">
              <span className="badge badge-ok">{clientNames[msg.client]}</span>
            </div>
          )}
        </div>
      ))}

      {viewingMessage && (
        <ViewMessageModal message={viewingMessage} onClose={() => setViewingMessage(null)} />
      )}

      {messagePendingDelete && (
        <ConfirmModal
          title="Delete this saved message?"
          message="This permanently removes the sanitized message from this tab. This action cannot be undone."
          confirmLabel="Delete Message"
          variant="danger"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setMessagePendingDelete(null)}
        />
      )}
    </div>
  );
}
