import { useState } from "react";
import ConfirmModal from "./ConfirmModal.jsx";
import ViewMessageModal from "./ViewMessageModal.jsx";
import Loader from "./Loader.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { IconReuse, IconDownload } from "./icons.jsx";


const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true
};

const PinIcon = ({ filled }) => (
  <svg {...iconProps} fill={filled ? "currentColor" : "none"}>
    <path d="M12 17v5" />
    <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
  </svg>
);
const EyeIcon = () => (
  <svg {...iconProps}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const CopyIcon = () => (
  <svg {...iconProps}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);
const ClockIcon = () => (
  <svg {...iconProps} width={13} height={13}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function SavedMessages({ messages, loading, onDelete, onTogglePin, onReuse, tabName = "", clientNames = {} }) {
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [viewingMessage, setViewingMessage] = useState(null);
  const [messagePendingDelete, setMessagePendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleCopy = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      notify("Copy failed. Open the message and copy it manually.", { tone: "error", duration: 4000 });
      return;
    }
    setCopiedId(id);
    notify("Message copied");
    setTimeout(() => setCopiedId(null), 1500);
  };

  /* Download everything in this tab as a plain-text file (newest first). */
  const exportTab = () => {
    const body = messages
      .map((m) => `[${new Date(m.createdAt).toLocaleString()}]${m.pinned ? " (pinned)" : ""}\n${m.sanitizedText}`)
      .join("\n\n----------------------------------------\n\n");
    const blob = new Blob([`${tabName || "Saved messages"}\n\n${body}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(tabName || "messages").replace(/[^\w-]+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${messages.length} message${messages.length === 1 ? "" : "s"}`);
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
  const pinnedCount = messages.filter((m) => m.pinned).length;
  const visible = messages.filter(
    (m) =>
      (!onlyPinned || m.pinned) &&
      (!q || `${m.sanitizedText} ${clientNames[m.client] || ""}`.toLowerCase().includes(q))
  );

  return (
    <div className="saved-messages-list">
      <div className="saved-toolbar">
        {messages.length > 3 && (
          <input
            className="panel-search saved-search"
            type="search"
            placeholder="Search messages in this tab…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <div className="saved-toolbar-right">
          {pinnedCount > 0 && (
            <button
              type="button"
              className={`chip ${onlyPinned ? "chip-active" : ""}`}
              onClick={() => setOnlyPinned((v) => !v)}
              aria-pressed={onlyPinned}
            >
              Pinned · {pinnedCount}
            </button>
          )}
          <button type="button" className="tool-btn" onClick={exportTab} title="Download this tab as a .txt file">
            <IconDownload size={15} /> <span>Export</span>
          </button>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="saved-messages-empty">
          {onlyPinned && !q ? "No pinned messages in this tab." : <>No saved messages match “{query}”.</>}
        </div>
      )}

      {visible.map((msg) => {
        const clientName = msg.client && clientNames[msg.client];
        const copied = copiedId === msg._id;
        const wordCount = msg.sanitizedText.trim().split(/\s+/).filter(Boolean).length;

        return (
          <article className={`saved-message-card ${msg.pinned ? "is-pinned" : ""}`} key={msg._id}>
            <header className="sm-head">
              <span className="sm-date">
                <ClockIcon />
                {formatDate(msg.createdAt)}
              </span>
              <button
                type="button"
                className={`sm-icon-btn sm-pin ${msg.pinned ? "active" : ""}`}
                onClick={() => onTogglePin(msg)}
                title={msg.pinned ? "Unpin" : "Pin to top"}
                aria-label={msg.pinned ? "Unpin message" : "Pin message"}
                aria-pressed={!!msg.pinned}
              >
                <PinIcon filled={msg.pinned} />
              </button>
            </header>

            <p className="saved-message-text">{msg.sanitizedText}</p>

            <footer className="sm-foot">
              <div className="sm-tags">
                {clientName && <span className="badge badge-ok sm-client" title={clientName}>{clientName}</span>}
                <span className="sm-words">{wordCount} {wordCount === 1 ? "word" : "words"}</span>
              </div>

              <div className="sm-actions">
                {onReuse && (
                  <button
                    type="button"
                    className="sm-icon-btn"
                    onClick={() => onReuse(msg.sanitizedText)}
                    title="Use again in the editor"
                    aria-label="Use this message again in the editor"
                  >
                    <IconReuse size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="sm-icon-btn"
                  onClick={() => setViewingMessage(msg)}
                  title="View"
                  aria-label="View message"
                >
                  <EyeIcon />
                </button>
                <button
                  type="button"
                  className={`sm-icon-btn ${copied ? "success" : ""}`}
                  onClick={() => handleCopy(msg._id, msg.sanitizedText)}
                  title={copied ? "Copied!" : "Copy"}
                  aria-label="Copy message"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
                <button
                  type="button"
                  className="sm-icon-btn danger"
                  onClick={() => setMessagePendingDelete(msg)}
                  title="Delete"
                  aria-label="Delete message"
                >
                  <TrashIcon />
                </button>
              </div>
            </footer>
          </article>
        );
      })}

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
