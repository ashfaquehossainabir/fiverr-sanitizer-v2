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

export default function SavedMessages({ messages, loading, onDelete }) {
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

  return (
    <div className="saved-messages-list">
      {messages.map((msg) => (
        <div className="saved-message-card" key={msg._id}>
          <div className="saved-message-meta">
            <span>{formatDate(msg.createdAt)}</span>
            <div className="saved-message-actions">
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
