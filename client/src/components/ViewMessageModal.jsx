import { useState } from "react";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ViewMessageModal({ message, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.sanitizedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="view-message-backdrop" onClick={onClose}>
      <div className="modal view-message-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="view-message-header">
          <h3>Saved Message</h3>
          <span className="view-message-date">{formatDate(message.createdAt)}</span>
        </div>

        <div className="view-message-body">{message.sanitizedText}</div>

        <div className="view-message-actions">
          <button
            type="button"
            className={`view-message-copy-btn ${copied ? "copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy Message"}
          </button>
        </div>
      </div>
    </div>
  );
}
