import { useAuth } from "../context/AuthContext.jsx";
import { daysUntil } from "../lib/dates.js";

const CLOSED = ["completed", "archived"];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// "Today" summary shown above the editor: what needs attention right now, one tap
// from the Clients view. Everything is derived from the clients already loaded.
export default function TodayStrip({ clients, onOpenClients }) {
  const { user } = useAuth();
  const first = (user?.name || "").trim().split(/\s+/)[0] || "there";

  const open = clients.filter((c) => !CLOSED.includes(c.status));
  const followUps = open.filter((c) => c.followUpAt && daysUntil(c.followUpAt) <= 0).length;
  const overdue = open.filter((c) => c.deadline && daysUntil(c.deadline) < 0).length;
  const dueSoon = open.filter((c) => c.deadline && daysUntil(c.deadline) >= 0 && daysUntil(c.deadline) <= 2).length;

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const attention = followUps + overdue + dueSoon;

  const chips = [
    { key: "follow", value: followUps, label: "Follow-ups due", tone: followUps ? "warn" : "calm" },
    { key: "overdue", value: overdue, label: "Overdue", tone: overdue ? "danger" : "calm" },
    { key: "soon", value: dueSoon, label: "Due in 3 days", tone: dueSoon ? "warn" : "calm" },
    { key: "open", value: open.length, label: "Open orders", tone: "info" }
  ];

  return (
    <section className="today-strip" aria-label="Today at a glance">
      <div className="today-hello">
        <p className="today-date">{today}</p>
        <h2>
          {greeting()}, {first}
        </h2>
        <p className="today-sub">
          {clients.length === 0
            ? "Add your first client to get follow-up and deadline reminders here."
            : attention === 0
            ? "Nothing urgent today. A good moment to get ahead."
            : `${attention} thing${attention === 1 ? "" : "s"} need${attention === 1 ? "s" : ""} your attention.`}
        </p>
      </div>

      {clients.length > 0 && (
        <div className="today-chips">
          {chips.map((c) => (
            <button key={c.key} type="button" className={`today-chip tone-${c.tone}`} onClick={onOpenClients}>
              <strong>{c.value}</strong>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
