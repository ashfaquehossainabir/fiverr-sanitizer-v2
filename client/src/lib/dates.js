// Deadlines and follow-ups are calendar DAYS, not moments in time. Comparing raw
// timestamps shifts them by a day for anyone west of UTC (a date stored as UTC
// midnight is "yesterday evening" locally). These helpers always resolve a stored
// value to the calendar day the user meant, in any timezone.

const pad = (n) => String(n).padStart(2, "0");

// Older records were saved as UTC midnight; newer ones as local noon (see fromInputDate).
const isUtcMidnight = (d) =>
  d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;

export function dayParts(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return isUtcMidnight(d)
    ? { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }
    : { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
}

/** Value for <input type="date"> ("" when empty). */
export function toInputDate(value) {
  const p = dayParts(value);
  return p ? `${p.y}-${pad(p.m + 1)}-${pad(p.d)}` : "";
}

/** <input type="date"> value -> ISO string at local noon (safe in every timezone). */
export function fromInputDate(str) {
  if (!str) return "";
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

const dayNumber = (value) => {
  const p = dayParts(value);
  return p ? Date.UTC(p.y, p.m, p.d) / 86400000 : null;
};

const todayNumber = () => {
  const n = new Date();
  return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 86400000;
};

/** Whole calendar days from today: 0 = today, -1 = yesterday, null = no date. */
export function daysUntil(value) {
  const n = dayNumber(value);
  return n === null ? null : n - todayNumber();
}

export function formatDay(value, options = { month: "short", day: "numeric" }) {
  const p = dayParts(value);
  return p ? new Date(p.y, p.m, p.d).toLocaleDateString(undefined, options) : "";
}
