import { formatClock } from "../hooks/useFocusTimer.js";

// Floating countdown shown on every page except the Planner while a session runs,
// so the timer never gets lost when you jump over to write a message.
export default function FocusPill({ timer, onOpen }) {
  if (!timer.running) return null;
  const label = timer.mode === "focus" ? "Focus" : "Break";
  return (
    <button type="button" className={`focus-pill mode-${timer.mode}`} onClick={onOpen} aria-label={`${label} timer, ${formatClock(timer.remainingMs)} left. Open planner`}>
      <span className="focus-pill-dot" aria-hidden="true" />
      <strong>{formatClock(timer.remainingMs)}</strong>
      <span>{label}</span>
    </button>
  );
}
