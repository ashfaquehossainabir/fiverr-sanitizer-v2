import { daysUntil } from "./dates.js";

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

const byPriorityThenNew = (a, b) =>
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || new Date(b.createdAt) - new Date(a.createdAt);

const byDueThenPriority = (a, b) =>
  daysUntil(a.dueDate) - daysUntil(b.dueDate) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

/** Split tasks into the planner's sections. */
export function groupTasks(tasks) {
  const out = { overdue: [], today: [], upcoming: [], someday: [], done: [] };
  for (const t of tasks) {
    if (t.done) {
      out.done.push(t);
      continue;
    }
    const d = daysUntil(t.dueDate);
    if (d === null) out.someday.push(t);
    else if (d < 0) out.overdue.push(t);
    else if (d === 0) out.today.push(t);
    else out.upcoming.push(t);
  }
  out.overdue.sort(byDueThenPriority);
  out.today.sort(byPriorityThenNew);
  out.upcoming.sort(byDueThenPriority);
  out.someday.sort(byPriorityThenNew);
  out.done.sort((a, b) => new Date(b.doneAt || b.updatedAt) - new Date(a.doneAt || a.updatedAt));
  return out;
}

export const isSameDayAsToday = (value) => {
  if (!value) return false;
  const d = new Date(value);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

/** Open tasks that need doing today or are already late. */
export const openTaskCount = (tasks) => tasks.filter((t) => !t.done && (daysUntil(t.dueDate) ?? 1) <= 0).length;

/** Read-only events derived from clients: deadlines and follow-ups of open orders. */
export function clientEvents(clients) {
  const events = [];
  for (const c of clients) {
    if (["completed", "archived"].includes(c.status)) continue;
    if (c.deadline) events.push({ key: `${c._id}-d`, kind: "deadline", date: c.deadline, label: c.project ? `${c.name} · ${c.project}` : c.name });
    if (c.followUpAt) events.push({ key: `${c._id}-f`, kind: "follow-up", date: c.followUpAt, label: c.name });
  }
  return events.sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
}
