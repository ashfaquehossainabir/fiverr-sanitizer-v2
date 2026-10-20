import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import { IconCopy, IconDownload, IconPin, IconPlus, IconSearch, IconTrash } from "./icons.jsx";

const COLORS = ["plain", "green", "blue", "amber", "rose"];
const MAX_NOTES = 200;
const storageKey = (uid) => `sanitizer_notes_${uid || "anon"}`;
let seq = 0;
const newId = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`;

function load(uid) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(uid)));
    if (Array.isArray(raw)) {
      return raw
        .filter((n) => n && typeof n.id === "string" && typeof n.text === "string")
        .map((n) => ({ id: n.id, text: n.text, color: COLORS.includes(n.color) ? n.color : "plain", pinned: !!n.pinned, updatedAt: n.updatedAt || Date.now() }));
    }
  } catch {
    /* ignore corrupt data */
  }
  return [];
}

const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function NoteCard({ note, onChange, onDelete, onCopy }) {
  const ref = useRef(null);
  // Grow the textarea with its content so a note never needs an inner scrollbar.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 420)}px`;
  }, [note.text]);

  return (
    <li className={`note-card note-${note.color} ${note.pinned ? "is-pinned" : ""}`}>
      {note.pinned && (
        <span className="note-pin-tag">
          <IconPin size={11} /> Pinned
        </span>
      )}
      <textarea ref={ref} value={note.text} onChange={(e) => onChange(note.id, { text: e.target.value })} aria-label="Note text" placeholder="Empty note" rows={3} maxLength={5000} />
      <p className="note-meta">
        {words(note.text)} word{words(note.text) === 1 ? "" : "s"} · {ago(note.updatedAt)}
      </p>
      <div className="note-bar">
        <div className="note-colors" role="group" aria-label="Note colour">
          {COLORS.map((c) => (
            <button key={c} type="button" className={`note-dot dot-${c} ${note.color === c ? "on" : ""}`} aria-label={`${c} colour`} aria-pressed={note.color === c} onClick={() => onChange(note.id, { color: c }, false)} />
          ))}
        </div>
        <div className="note-actions">
          <button type="button" className={`icon-btn note-act ${note.pinned ? "on" : ""}`} onClick={() => onChange(note.id, { pinned: !note.pinned }, false)} aria-pressed={note.pinned} aria-label={note.pinned ? "Unpin note" : "Pin note"} title={note.pinned ? "Unpin" : "Pin to top"}>
            <IconPin size={14} />
          </button>
          <button type="button" className="icon-btn note-act" onClick={() => onCopy(note)} aria-label="Copy note" title="Copy">
            <IconCopy size={14} />
          </button>
          <button type="button" className="icon-btn note-act note-act-danger" onClick={() => onDelete(note)} aria-label="Delete note" title="Delete">
            <IconTrash size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}

// Quick notes for anything that doesn't belong in a task or a template: buyer details,
// ideas, links, rates. Stored on this device, per account.
export default function Notes({ focusSignal, onFocusHandled }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const uid = user?.id || user?._id;
  const [notes, setNotes] = useState(() => load(uid));
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const composerRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(uid), JSON.stringify(notes));
    } catch {
      /* storage can be unavailable */
    }
  }, [notes, uid]);

  useEffect(() => {
    if (!focusSignal) return;
    composerRef.current?.focus();
    onFocusHandled?.();
  }, [focusSignal, onFocusHandled]);

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    if (notes.length >= MAX_NOTES) {
      notify(`You can keep up to ${MAX_NOTES} notes. Delete a few first.`, { tone: "error" });
      return;
    }
    setNotes((list) => [{ id: newId(), text, color: "plain", pinned: false, updatedAt: Date.now() }, ...list]);
    setDraft("");
    notify("Note added");
  };

  const change = (id, patch, touch = true) =>
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, ...patch, ...(touch ? { updatedAt: Date.now() } : {}) } : n)));

  const copy = async (note) => {
    try {
      await navigator.clipboard.writeText(note.text);
      notify("Note copied");
    } catch {
      notify("Could not copy. Select the text and copy it manually.", { tone: "error" });
    }
  };

  const remove = (note) => {
    if (!note.text.trim()) setNotes((list) => list.filter((n) => n.id !== note.id));
    else setPendingDelete(note);
  };

  const exportAll = () => {
    const body = notes.map((n) => `${n.text.trim()}\n`).join("\n---\n\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `notes-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => !q || n.text.toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }, [notes, query]);

  return (
    <div className="notes">
      <header className="planner-head notes-head">
        <div>
          <p className="today-date">{notes.length} note{notes.length === 1 ? "" : "s"}</p>
          <h2>Notes</h2>
          <p className="panel-sub">A scratchpad for buyer details, ideas, links and rates. Saved on this device.</p>
        </div>
        <div className="notes-tools">
          <label className="notes-search">
            <IconSearch size={15} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" aria-label="Search notes" />
          </label>
          <button type="button" className="btn-ghost notes-export" onClick={exportAll} disabled={notes.length === 0} title="Download all notes as .txt">
            <IconDownload size={15} /> <span>Export</span>
          </button>
        </div>
      </header>

      <form
        className="notes-composer"
        onSubmit={(e) => {
          e.preventDefault();
          addNote();
        }}
      >
        <textarea
          ref={composerRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              addNote();
            }
          }}
          placeholder="Write a note…"
          aria-label="New note"
          rows={3}
          maxLength={5000}
        />
        <div className="notes-composer-foot">
          <span className="notes-composer-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to add
          </span>
          <button type="submit" className="btn-primary" disabled={!draft.trim()}>
            <IconPlus size={15} /> Add note
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <div className="panel-empty">
          <p>
            <strong>No notes yet.</strong> Jot down a buyer's preferences, a quote you gave, or a link you will need again.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <div className="panel-empty">
          <p>No notes match “{query}”.</p>
        </div>
      ) : (
        <ul className="notes-grid">
          {shown.map((n) => (
            <NoteCard key={n.id} note={n} onChange={change} onDelete={remove} onCopy={copy} />
          ))}
        </ul>
      )}

      {pendingDelete && (
        <ConfirmModal
          title="Delete this note?"
          message="This note will be removed from this device."
          confirmLabel="Delete"
          variant="danger"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            setNotes((list) => list.filter((n) => n.id !== pendingDelete.id));
            setPendingDelete(null);
            notify("Note deleted");
          }}
        />
      )}
    </div>
  );
}
