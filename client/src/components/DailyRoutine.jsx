import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { IconCheck, IconPlus, IconTrash } from "./icons.jsx";
import { dateKey } from "../lib/focusLog.js";

const STARTERS = ["Check the Fiverr inbox", "Reply to buyers", "Review today's deadlines", "Update gig stats", "Plan tomorrow"];

const storageKey = (uid) => `sanitizer_routine_${uid || "anon"}`;
let seq = 0;
const newId = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;

function load(uid) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(uid)));
    if (raw && Array.isArray(raw.items)) {
      const items = raw.items.filter((i) => i && typeof i.id === "string" && typeof i.text === "string");
      const sameDay = raw.day === dateKey();
      return { items, day: dateKey(), done: sameDay && Array.isArray(raw.done) ? raw.done : [] };
    }
  } catch {
    /* ignore corrupt data */
  }
  return { items: [], day: dateKey(), done: [] };
}

// A short checklist of things you do every working day. It starts fresh each morning.
export default function DailyRoutine() {
  const { user } = useAuth();
  const uid = user?.id || user?._id;
  const [state, setState] = useState(() => load(uid));
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(uid), JSON.stringify(state));
    } catch {
      /* storage can be unavailable */
    }
  }, [state, uid]);

  // Reset ticks if the tab stays open past midnight.
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => (s.day === dateKey() ? s : { ...s, day: dateKey(), done: [] }));
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const doneSet = useMemo(() => new Set(state.done), [state.done]);
  const doneCount = state.items.filter((i) => doneSet.has(i.id)).length;
  const total = state.items.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const toggle = (id) => setState((s) => ({ ...s, done: s.done.includes(id) ? s.done.filter((d) => d !== id) : [...s.done, id] }));
  const remove = (id) => setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id), done: s.done.filter((d) => d !== id) }));
  const add = (value) => {
    const t = value.trim().slice(0, 80);
    if (!t) return;
    setState((s) => (s.items.length >= 15 ? s : { ...s, items: [...s.items, { id: newId(), text: t }] }));
  };
  const addStarters = () => setState((s) => ({ ...s, items: STARTERS.map((t) => ({ id: newId(), text: t })), done: [] }));

  const submit = (e) => {
    e.preventDefault();
    add(text);
    setText("");
  };

  return (
    <section className="planner-card routine-card" aria-label="Daily routine">
      <div className="planner-card-head">
        <h3>
          Daily routine {total > 0 && <span className="count-pill">{doneCount}/{total}</span>}
        </h3>
        {total > 0 && (
          <button type="button" className="link-btn" onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {total === 0 ? (
        <div className="routine-empty">
          <p className="planner-none">Habits you repeat every day. They reset each morning.</p>
          <button type="button" className="btn-ghost routine-starter" onClick={addStarters}>
            Add a starter routine
          </button>
        </div>
      ) : (
        <>
          <div className="planner-bar routine-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Routine progress">
            <span style={{ width: `${pct}%` }} />
          </div>
          <ul className="routine-list">
            {state.items.map((i) => (
              <li key={i.id} className={doneSet.has(i.id) ? "is-done" : ""}>
                <button type="button" className="routine-check" role="checkbox" aria-checked={doneSet.has(i.id)} onClick={() => toggle(i.id)}>
                  <span className="routine-box" aria-hidden="true">{doneSet.has(i.id) && <IconCheck size={13} />}</span>
                  <span className="routine-text">{i.text}</span>
                </button>
                {editing && (
                  <button type="button" className="icon-btn routine-del" onClick={() => remove(i.id)} aria-label={`Remove ${i.text}`}>
                    <IconTrash size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {doneCount === total && <p className="routine-all">All done for today. Nice work.</p>}
        </>
      )}

      <form className="routine-add" onSubmit={submit}>
        <input type="text" value={text} maxLength={80} onChange={(e) => setText(e.target.value)} placeholder="Add a daily habit" aria-label="Add a daily habit" />
        <button type="submit" className="icon-btn" disabled={!text.trim()} aria-label="Add habit">
          <IconPlus size={16} />
        </button>
      </form>
    </section>
  );
}
