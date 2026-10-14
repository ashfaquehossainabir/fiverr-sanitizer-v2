import useEscape from "../hooks/useEscape.js";

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel
}) {
  useEscape(onCancel, !loading);

  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div
        className="modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-modal-icon ${variant}`}>
          {variant === "danger" ? "⚠" : "?"}
        </div>

        <h3 id="confirm-modal-title" className="confirm-modal-title">
          {title}
        </h3>

        {message && <p className="confirm-modal-message">{message}</p>}

        <div className="confirm-modal-actions">
          {/* Destructive dialogs focus Cancel so a stray Enter never deletes anything. */}
          <button type="button" className="cancel-btn" onClick={onCancel} disabled={loading} autoFocus={variant === "danger"}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-btn ${variant === "danger" ? "danger" : ""}`}
            onClick={onConfirm}
            disabled={loading}
            autoFocus={variant !== "danger"}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
