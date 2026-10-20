import { PRESETS, formatClock } from "../hooks/useFocusTimer.js";
import { IconPause, IconPlay, IconReset } from "./icons.jsx";

/**
 * The focus timer UI (ring, task picker, controls, today's stats).
 * Shared by the Planner side card and the floating-timer modal.
 * `variant="modal"` drops the card chrome and the title, because the modal supplies its own.
 */
export default function FocusCard({ timer, openTasks, variant = "card" }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const label = timer.mode === "focus" ? "Focus" : "Break";
  const state = timer.running ? "running" : timer.paused ? "paused" : "ready";
  const inModal = variant === "modal";
  const Wrapper = inModal ? "div" : "section";

  return (
    <Wrapper
      className={`${inModal ? "focus-card-modal" : "planner-card"} focus-card mode-${timer.mode} is-${state}`}
      {...(inModal ? {} : { "aria-label": "Focus timer" })}
    >
      <div className="planner-card-head">
        {!inModal && <h3>Focus timer</h3>}
        <div className="planner-seg planner-seg-sm" role="group" aria-label="Session length">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={timer.preset === p.id ? "on" : ""} disabled={timer.running} aria-pressed={timer.preset === p.id} onClick={() => timer.setPreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="focus-body">
        <div className="focus-ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="focus-ring-track" cx="60" cy="60" r={R} />
            <circle className="focus-ring-bar" cx="60" cy="60" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, Math.max(0, timer.progress)))} transform="rotate(-90 60 60)" />
          </svg>
          <div className="focus-ring-text">
            <strong role="timer" aria-live="off">{formatClock(timer.remainingMs)}</strong>
            <span>{label}{timer.paused ? " · paused" : ""}</span>
          </div>
        </div>

        <div className="focus-side">
          {timer.mode === "focus" && (
            <label className="focus-task">
              <span>Working on</span>
              <select value={timer.taskId || ""} onChange={(e) => timer.setTask(e.target.value)}>
                <option value="">Nothing specific</option>
                {openTasks.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.text}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="focus-controls">
            {timer.running ? (
              <button type="button" className="btn-primary focus-main" onClick={timer.pause}>
                <IconPause size={16} /> Pause
              </button>
            ) : (
              <button type="button" className="btn-primary focus-main" onClick={() => timer.start()}>
                <IconPlay size={16} /> {timer.paused ? "Resume" : timer.mode === "focus" ? "Start focus" : "Start break"}
              </button>
            )}
            <button type="button" className="icon-btn" onClick={timer.reset} aria-label="Reset timer" title="Reset">
              <IconReset size={16} />
            </button>
          </div>

          <p className="focus-stats">
            <strong>{timer.sessionsToday}</strong> session{timer.sessionsToday === 1 ? "" : "s"} today
            <span aria-hidden="true"> · </span>
            <strong>{timer.minutesToday}</strong> min focused
          </p>
        </div>
      </div>
    </Wrapper>
  );
}
