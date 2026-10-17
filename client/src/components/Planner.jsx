import { useEffect, useMemo, useRef, useState } from "react";
import { PRESETS, formatClock } from "../hooks/useFocusTimer.js";
import { clientEvents, groupTasks, isSameDayAsToday } from "../lib/tasks.js";
import { daysUntil, formatDay, fromInputDate, toInputDate } from "../lib/dates.js";
import { IconCheck, IconClock, IconEdit, IconFlag, IconPause, IconPlay, IconPlus, IconReset, IconTrash } from "./icons.jsx";
import Loader from "./Loader.jsx";

const PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "High" }
];
const CLOSED = ["completed", "archived"];

const pad = (n) => String(n).padStart(2, "0");
function inputDateIn(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dueLabel(value) {
  const d = daysUntil(value);
  if (d === null) return null;
  if (d < 0) return { text: d === -1 ? "Yesterday" : `${-d}d overdue`, tone: "danger" };
  if (d === 0) return { text: "Today", tone: "warn" };
  if (d === 1) return { text: "Tomorrow", tone: "info" };
  if (d < 7) return { text: formatDay(value, { weekday: "short" }), tone: "ok" };
  return { text: formatDay(value), tone: "ok" };
}

/* ------------------------------------------------------------------ quick add */

function QuickAdd({ clients, onAdd, inputRef }) {
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("normal");
  const [clientId, setClientId] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    const created = await onAdd({ text: value, dueDate: fromInputDate(due), priority, client: clientId });
    setBusy(false);
    if (created) {
      setText("");
      setDue("");
      setPriority("normal");
      setClientId("");
    }
    inputRef.current?.focus();
  };

  const quick = [
    { label: "Today", offset: 0 },
    { label: "Tomorrow", offset: 1 },
    { label: "Next week", offset: 7 }
  ];

  return (
    <form className="planner-add" onSubmit={submit}>
      <div className="planner-add-main">
        <input
          ref={inputRef}
          className="planner-add-input"
          placeholder="What needs doing?"
          aria-label="New task"
          maxLength={200}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn-primary planner-add-btn" disabled={!text.trim() || busy}>
          <IconPlus size={16} />
          <span>Add</span>
        </button>
      </div>
      <div className="planner-add-opts">
        <div className="planner-opt-group" role="group" aria-label="Due date">
          {quick.map((q) => {
            const value = inputDateIn(q.offset);
            return (
              <button
                key={q.label}
                type="button"
                className={`chip ${due === value ? "chip-active" : ""}`}
                aria-pressed={due === value}
                onClick={() => setDue(due === value ? "" : value)}
              >
                {q.label}
              </button>
            );
          })}
          <input type="date" className="planner-date" aria-label="Pick a due date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div className="planner-seg" role="group" aria-label="Priority">
          {PRIORITIES.map((p) => (
            <button key={p.id} type="button" data-p={p.id} className={priority === p.id ? "on" : ""} aria-pressed={priority === p.id} onClick={() => setPriority(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        {clients.length > 0 && (
          <select className="planner-client-select" aria-label="Link to a client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ task row */

function TaskRow({ task, clientName, clients, isFocus, onToggle, onUpdate, onDelete, onFocus }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ text: "", due: "", client: "", priority: "normal" });
  const due = dueLabel(task.dueDate);

  // The task's own client may have been completed/archived since, so it is no longer in
  // the open-clients list. Keep it selectable or the dropdown would claim "No client".
  const clientOptions =
    task.client && clientName && !clients.some((c) => c._id === task.client)
      ? [...clients, { _id: task.client, name: clientName }]
      : clients;

  const startEdit = () => {
    setDraft({ text: task.text, due: toInputDate(task.dueDate), client: task.client || "", priority: task.priority });
    setEditing(true);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    const text = draft.text.trim();
    if (!text) return;
    onUpdate(task._id, { text, dueDate: fromInputDate(draft.due), client: draft.client, priority: draft.priority });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="task-row task-row-editing">
        <form className="task-edit" onSubmit={saveEdit} onKeyDown={(e) => e.key === "Escape" && setEditing(false)}>
          <input autoFocus maxLength={200} value={draft.text} aria-label="Task text" onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
          <div className="task-edit-row">
            <input type="date" value={draft.due} aria-label="Due date" onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
            <select value={draft.client} aria-label="Client" onChange={(e) => setDraft({ ...draft, client: e.target.value })}>
              <option value="">No client</option>
              {clientOptions.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="planner-seg" role="group" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <button key={p.id} type="button" data-p={p.id} className={draft.priority === p.id ? "on" : ""} aria-pressed={draft.priority === p.id} onClick={() => setDraft({ ...draft, priority: p.id })}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="task-edit-actions">
            <button type="button" className="link-btn task-edit-delete" onClick={() => onDelete(task._id)}>
              Delete task
            </button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!draft.text.trim()}>
              Save
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`task-row ${task.done ? "is-done" : ""} ${isFocus ? "is-focus" : ""}`} data-p={task.priority}>
      <button
        type="button"
        className="task-check"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Mark “${task.text}” as not done` : `Mark “${task.text}” as done`}
        onClick={() => onToggle(task)}
      >
        {task.done && <IconCheck size={14} strokeWidth={3} />}
      </button>

      <div className="task-main">
        <span className="task-text">{task.text}</span>
        <div className="task-meta">
          {!task.done && task.priority !== "normal" && (
            <span className={`task-priority p-${task.priority}`}>
              <IconFlag size={12} />
              {task.priority}
            </span>
          )}
          {due && !task.done && <span className={`badge badge-${due.tone}`}>{due.text}</span>}
          {clientName && <span className="badge task-client">{clientName}</span>}
          {task.focusSessions > 0 && (
            <span className="badge task-sessions" title={`${task.focusSessions} focus session${task.focusSessions === 1 ? "" : "s"}`}>
              ● {task.focusSessions}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        {!task.done && (
          <button type="button" className="icon-btn task-act" onClick={() => onFocus(task)} aria-label="Focus on this task" title="Start a focus session">
            <IconPlay size={15} />
          </button>
        )}
        <button type="button" className="icon-btn task-act" onClick={startEdit} aria-label="Edit task" title="Edit">
          <IconEdit size={15} />
        </button>
        <button type="button" className="icon-btn task-act task-act-danger task-act-delete" onClick={() => onDelete(task._id)} aria-label="Delete task" title="Delete">
          <IconTrash size={15} />
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ focus timer */

function FocusCard({ timer, openTasks }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const label = timer.mode === "focus" ? "Focus" : "Break";
  const state = timer.running ? "running" : timer.paused ? "paused" : "ready";

  return (
    <section className={`planner-card focus-card mode-${timer.mode} is-${state}`} aria-label="Focus timer">
      <div className="planner-card-head">
        <h3>Focus timer</h3>
        <div className="planner-seg planner-seg-sm" role="group" aria-label="Session length">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={timer.preset === p.id ? "on" : ""} disabled={timer.running} aria-pressed={timer.preset === p.id} onClick={() => timer.setPreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

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
    </section>
  );
}

/* ------------------------------------------------------------------ main view */

export default function Planner({ tasksApi, clients, timer, onOpenClients, focusInputSignal, onFocusHandled }) {
  const { tasks, loading, add, update, remove, clearDone } = tasksApi;
  const inputRef = useRef(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDone, setShowDone] = useState(false);

  // "N" / the palette ask to jump straight into the add box.
  useEffect(() => {
    if (!focusInputSignal) return;
    inputRef.current?.focus();
    onFocusHandled?.();
  }, [focusInputSignal, onFocusHandled]);

  const openClients = useMemo(() => clients.filter((c) => !CLOSED.includes(c.status)), [clients]);
  const clientNames = useMemo(() => Object.fromEntries(clients.map((c) => [c._id, c.name])), [clients]);
  const groups = useMemo(() => groupTasks(tasks), [tasks]);
  const events = useMemo(() => clientEvents(clients), [clients]);
  const openTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);

  // Week strip: today..+6. Today also absorbs anything overdue.
  const week = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, 12);
      const match = (value) => {
        const d = daysUntil(value);
        return i === 0 ? d !== null && d <= 0 : d === i;
      };
      return {
        offset: i,
        date,
        tasks: openTasks.filter((t) => match(t.dueDate)),
        events: events.filter((e) => match(e.date))
      };
    });
  }, [openTasks, events]);

  const doneToday = tasks.filter((t) => t.done && isSameDayAsToday(t.doneAt)).length;
  const dueNow = groups.overdue.length + groups.today.length;
  const planned = doneToday + dueNow;
  const pct = planned ? Math.round((doneToday / planned) * 100) : 0;

  const radar = events.filter((e) => daysUntil(e.date) <= 7).slice(0, 6);
  const selected = selectedDay === null ? null : week[selectedDay];
  const radarShown = selected ? selected.events : radar;

  const toggle = (t) => update(t._id, { done: !t.done });
  const focusTask = (t) => {
    timer.focusOn(t._id);
  };

  const renderRows = (list) => (
    <ul className="task-list">
      {list.map((t) => (
        <TaskRow
          key={t._id}
          task={t}
          clientName={t.client ? clientNames[t.client] : ""}
          clients={openClients}
          isFocus={timer.running && timer.mode === "focus" && timer.taskId === t._id}
          onToggle={toggle}
          onUpdate={update}
          onDelete={remove}
          onFocus={focusTask}
        />
      ))}
    </ul>
  );

  const renderSection = (title, tone, list) =>
    list.length === 0 ? null : (
      <section className={`task-section tone-${tone}`} key={title}>
        <h3>
          {title} <span className="count-pill">{list.length}</span>
        </h3>
        {renderRows(list)}
      </section>
    );

  if (loading) return <Loader label="Loading your planner" />;

  const nothingOpen = openTasks.length === 0;

  return (
    <div className="planner">
      <header className="planner-head">
        <div>
          <p className="today-date">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h2>Plan your day</h2>
          <p className="panel-sub">Your to-dos, client deadlines and focus time in one place.</p>
        </div>
        <div className="planner-progress" aria-label="Today's progress">
          <div className="planner-progress-top">
            <span>
              <strong>{doneToday}</strong> of <strong>{planned}</strong> done today
            </span>
            <span className="planner-progress-pct">{planned ? `${pct}%` : "—"}</span>
          </div>
          <div className="planner-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      <QuickAdd clients={openClients} onAdd={add} inputRef={inputRef} />

      <div className="week-strip" role="group" aria-label="Next seven days">
        {week.map((d) => {
          const count = d.tasks.length + d.events.length;
          const on = selectedDay === d.offset;
          return (
            <button key={d.offset} type="button" className={`week-day ${on ? "on" : ""} ${d.offset === 0 ? "is-today" : ""} ${count ? "has-items" : ""}`} aria-pressed={on} onClick={() => setSelectedDay(on ? null : d.offset)}>
              <span className="week-dow">{d.offset === 0 ? "Today" : d.date.toLocaleDateString(undefined, { weekday: "short" })}</span>
              <span className="week-num">{d.date.getDate()}</span>
              <span className="week-count" aria-label={`${count} item${count === 1 ? "" : "s"}`}>{count || "·"}</span>
            </button>
          );
        })}
      </div>

      <div className="planner-grid">
        <div className="planner-main">
          {selected ? (
            <section className="task-section">
              <h3>
                {selected.offset === 0 ? "Today" : selected.date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                <button type="button" className="link-btn planner-clear-day" onClick={() => setSelectedDay(null)}>
                  Show all
                </button>
              </h3>
              {selected.tasks.length === 0 ? <p className="planner-none">No tasks on this day.</p> : renderRows(selected.tasks)}
            </section>
          ) : (
            <>
              {nothingOpen && (
                <div className="panel-empty planner-empty">
                  <p>
                    <strong>All clear.</strong> Add a task above, or press <kbd>N</kbd> from anywhere to jot one down.
                  </p>
                </div>
              )}
              {renderSection("Overdue", "danger", groups.overdue)}
              {renderSection("Today", "warn", groups.today)}
              {renderSection("Upcoming", "info", groups.upcoming)}
              {renderSection("No date", "calm", groups.someday)}
            </>
          )}

          {groups.done.length > 0 && (
            <section className="task-section tone-done">
              <div className="task-done-head">
                <button type="button" className="task-done-toggle" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
                  <span className="task-done-caret" aria-hidden="true">{showDone ? "▾" : "▸"}</span>
                  Completed <span className="count-pill">{groups.done.length}</span>
                </button>
                <button type="button" className="link-btn" onClick={clearDone}>
                  Clear completed
                </button>
              </div>
              {showDone && renderRows(groups.done)}
            </section>
          )}
        </div>

        <aside className="planner-aside">
          <FocusCard timer={timer} openTasks={openTasks} />

          <section className="planner-card radar-card" aria-label="Client radar">
            <div className="planner-card-head">
              <h3>Client radar</h3>
              <button type="button" className="link-btn" onClick={onOpenClients}>
                Open clients
              </button>
            </div>
            {radarShown.length === 0 ? (
              <p className="planner-none">{selected ? "No client events on this day." : "No client deadlines or follow-ups in the next 7 days."}</p>
            ) : (
              <ul className="radar-list">
                {radarShown.map((e) => {
                  const due = dueLabel(e.date);
                  return (
                    <li key={e.key}>
                      <span className={`radar-icon kind-${e.kind}`} aria-hidden="true">
                        {e.kind === "deadline" ? <IconFlag size={14} /> : <IconClock size={14} />}
                      </span>
                      <span className="radar-text">
                        <strong>{e.kind === "deadline" ? "Deadline" : "Follow up"}</strong>
                        <span>{e.label}</span>
                      </span>
                      {due && <span className={`badge badge-${due.tone}`}>{due.text}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
