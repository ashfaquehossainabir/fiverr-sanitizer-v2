// Per-day focus history, kept in localStorage per account. Powers the weekly chart,
// the streak and the daily session goal in the Planner.

const pad = (n) => String(n).padStart(2, "0");
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const logKey = (userId) => `sanitizer_focuslog_${userId || "anon"}`;
export const goalKey = (userId) => `sanitizer_focusgoal_${userId || "anon"}`;

export const DEFAULT_GOAL = 4;
const KEEP_DAYS = 120;

export function loadLog(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(logKey(userId)));
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  } catch {
    /* ignore corrupt data */
  }
  return {};
}

export function loadGoal(userId) {
  const n = Number(localStorage.getItem(goalKey(userId)));
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : DEFAULT_GOAL;
}

/** Returns a new log with one finished focus session added to `when`'s day. */
export function addSession(log, minutes, when = new Date()) {
  const k = dateKey(when);
  const cur = log[k] || { sessions: 0, minutes: 0 };
  const next = { ...log, [k]: { sessions: cur.sessions + 1, minutes: cur.minutes + minutes } };
  const keys = Object.keys(next).sort();
  if (keys.length > KEEP_DAYS) keys.slice(0, keys.length - KEEP_DAYS).forEach((old) => delete next[old]);
  return next;
}

/** Last 7 days, oldest first, ending today. */
export function weekSeries(log, today = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i), 12);
    const entry = log[dateKey(date)] || { sessions: 0, minutes: 0 };
    return { date, key: dateKey(date), sessions: entry.sessions, minutes: entry.minutes, isToday: i === 6 };
  });
}

/** Consecutive days with at least one session. Today not being done yet doesn't break the streak. */
export function currentStreak(log, today = new Date()) {
  let count = 0;
  for (let i = 0; i < KEEP_DAYS; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
    if ((log[dateKey(d)]?.sessions || 0) > 0) count++;
    else if (i === 0) continue;
    else break;
  }
  return count;
}
