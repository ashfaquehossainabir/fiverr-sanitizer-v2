import { useEffect } from "react";
import { MOD } from "../lib/platform.js";

const GROUPS = [
  {
    title: "Anywhere",
    rows: [
      [[MOD, "K"], "Open the command palette"],
      [["?"], "Show this list"],
      [["N"], "Add a task in the Planner"],
      [["Esc"], "Close dialogs and menus"]
    ]
  },
  {
    title: "Writing",
    rows: [
      [[MOD, "Enter"], "Copy the sanitized message"],
      [[MOD, "S"], "Save to the current tab"],
      [[MOD, "Shift", "Enter"], "Copy and save in one go"]
    ]
  },
  {
    title: "Command palette",
    rows: [
      [["↑", "↓"], "Move through results"],
      [["Enter"], "Run the highlighted item"]
    ]
  }
];

export default function ShortcutsModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div
        className="modal shortcuts-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-head">
          <h3 id="shortcuts-title">Keyboard shortcuts</h3>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {GROUPS.map((g) => (
          <section key={g.title} className="shortcuts-group">
            <h4>{g.title}</h4>
            <ul>
              {g.rows.map(([keys, label]) => (
                <li key={label}>
                  <span>{label}</span>
                  <span className="kbd-row">
                    {keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
