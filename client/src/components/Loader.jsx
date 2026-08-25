export default function Loader({ label = "Loading", full = false }) {
  return (
    <div className={full ? "loader loader-full" : "loader loader-inline"} role="status" aria-live="polite">
      <span className="loader-mark" aria-hidden="true">
        <span className="loader-mark-text">FS</span>
        <span className="loader-scan" />
      </span>
      <p className="loader-label">
        {label}
        <span className="loader-dots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>
    </div>
  );
}
