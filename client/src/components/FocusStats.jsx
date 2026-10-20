import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { IconBolt } from "./icons.jsx";
import { currentStreak, DEFAULT_GOAL, goalKey, loadGoal, weekSeries } from "../lib/focusLog.js";

// Daily session goal, streak and a 7-day chart, built from the focus timer's history.
export default function FocusStats({ timer }) {
  const { user } = useAuth();
  const uid = user?.id || user?._id;
  const [goal, setGoal] = useState(() => loadGoal(uid));

  useEffect(() => {
    try {
      localStorage.setItem(goalKey(uid), String(goal));
    } catch {
      /* storage can be unavailable */
    }
  }, [goal, uid]);

  const week = useMemo(() => weekSeries(timer.log), [timer.log]);
  const streak = useMemo(() => currentStreak(timer.log), [timer.log]);
  const todaySessions = Math.max(timer.sessionsToday, week[6].sessions);
  const weekMinutes = week.reduce((sum, d) => sum + d.minutes, 0);
  const maxMinutes = Math.max(30, ...week.map((d) => d.minutes));
  const pct = Math.min(100, Math.round((todaySessions / goal) * 100));
  const reached = todaySessions >= goal;

  return (
    <section className="planner-card stats-card" aria-label="Focus progress">
      <div className="planner-card-head">
        <h3>Focus progress</h3>
        <span className={`streak-badge ${streak ? "on" : ""}`} title="Days in a row with at least one focus session">
          <IconBolt size={13} /> {streak} day{streak === 1 ? "" : "s"}
        </span>
      </div>

      <div className="goal-row">
        <div className="goal-text">
          <strong>{todaySessions}</strong> / {goal} sessions today
          {reached && <span className="goal-done"> · goal reached</span>}
        </div>
        <div className="goal-stepper" role="group" aria-label="Daily session goal">
          <button type="button" onClick={() => setGoal((g) => Math.max(1, g - 1))} disabled={goal <= 1} aria-label="Lower daily goal">
            −
          </button>
          <span aria-hidden="true">{goal}</span>
          <button type="button" onClick={() => setGoal((g) => Math.min(20, g + 1))} disabled={goal >= 20} aria-label="Raise daily goal">
            +
          </button>
        </div>
      </div>
      <div className={`planner-bar goal-bar ${reached ? "is-done" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Daily goal progress">
        <span style={{ width: `${pct}%` }} />
      </div>

      <div className="week-bars" role="img" aria-label={`Focus minutes over the last 7 days: ${weekMinutes} in total`}>
        {week.map((d) => (
          <div key={d.key} className={`week-bar ${d.isToday ? "is-today" : ""}`} title={`${d.date.toLocaleDateString(undefined, { weekday: "long" })}: ${d.minutes} min`}>
            <span className="week-bar-val">{d.minutes || ""}</span>
            <span className="week-bar-track">
              <span className="week-bar-fill" style={{ height: `${d.minutes ? Math.max(8, (d.minutes / maxMinutes) * 100) : 0}%` }} />
            </span>
            <span className="week-bar-day">{d.date.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
          </div>
        ))}
      </div>
      <p className="stats-foot">
        <strong>{weekMinutes}</strong> min focused in the last 7 days
      </p>
    </section>
  );
}

export { DEFAULT_GOAL };
