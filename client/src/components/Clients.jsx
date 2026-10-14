import { useEffect, useState } from "react";
import api from "../api/axios.js";
import ConfirmModal from "./ConfirmModal.jsx";
import Loader from "./Loader.jsx";
import useEscape from "../hooks/useEscape.js";
import { daysUntil, fromInputDate, toInputDate } from "../lib/dates.js";

export const STATUSES = [
  { id: "lead", label: "Lead" },
  { id: "active", label: "In progress" },
  { id: "delivered", label: "Delivered" },
  { id: "revision", label: "Revision" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" }
];

const EMPTY = { name: "", project: "", status: "lead", amount: "", currency: "USD", deadline: "", followUpAt: "", notes: "" };

const CLOSED = ["completed", "archived"];

function dueState(date) {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "danger" };
  if (days === 0) return { text: "today", tone: "warn" };
  if (days <= 2) return { text: `in ${days}d`, tone: "warn" };
  return { text: `in ${days}d`, tone: "ok" };
}

const SORTS = [
  { id: "recent", label: "Recently updated" },
  { id: "deadline", label: "Deadline (soonest)" },
  { id: "followup", label: "Follow-up (soonest)" },
  { id: "amount", label: "Amount (highest)" }
];

// Missing dates sort last.
const dayKey = (v) => {
  const d = daysUntil(v);
  return d === null ? Infinity : d;
};

export default function Clients({ onError, onChanged }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/clients");
        if (!cancelled) setClients(data.clients);
      } catch (err) {
        onError?.(err.response?.data?.message || "Could not load clients.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY });
  };

  const openEdit = (c) => {
    setEditingId(c._id);
    setForm({
      name: c.name,
      project: c.project,
      status: c.status,
      amount: c.amount || "",
      currency: c.currency,
      deadline: toInputDate(c.deadline),
      followUpAt: toInputDate(c.followUpAt),
      notes: c.notes
    });
  };

  const closeForm = () => setForm(null);
  useEscape(closeForm, Boolean(form));

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      amount: Number(form.amount) || 0,
      deadline: fromInputDate(form.deadline),
      followUpAt: fromInputDate(form.followUpAt)
    };
    try {
      if (editingId) {
        const { data } = await api.put(`/clients/${editingId}`, payload);
        setClients((prev) => prev.map((c) => (c._id === editingId ? data.client : c)));
      } else {
        const { data } = await api.post("/clients", payload);
        setClients((prev) => [data.client, ...prev]);
      }
      setForm(null);
      onChanged?.();
    } catch (err) {
      onError?.(err.response?.data?.message || "Could not save the client.");
    }
  };

  const quickStatus = async (c, status) => {
    try {
      const { data } = await api.put(`/clients/${c._id}`, { status });
      setClients((prev) => prev.map((x) => (x._id === c._id ? data.client : x)));
      onChanged?.();
    } catch (err) {
      onError?.(err.response?.data?.message || "Could not update the status.");
    }
  };

  const snooze = async (c, days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    try {
      const { data } = await api.put(`/clients/${c._id}`, { followUpAt: d.toISOString() });
      setClients((prev) => prev.map((x) => (x._id === c._id ? data.client : x)));
      onChanged?.();
    } catch (err) {
      onError?.(err.response?.data?.message || "Could not set the reminder.");
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/clients/${pendingDelete._id}`);
      setClients((prev) => prev.filter((c) => c._id !== pendingDelete._id));
      onChanged?.();
    } catch (err) {
      onError?.(err.response?.data?.message || "Could not delete the client.");
    } finally {
      setPendingDelete(null);
    }
  };

  if (loading) return <Loader label="Loading clients" />;

  const q = query.trim().toLowerCase();
  const matchesQuery = (c) => !q || `${c.name} ${c.project} ${c.notes}`.toLowerCase().includes(q);
  const counts = { all: clients.length, open: clients.filter((c) => !CLOSED.includes(c.status)).length };
  STATUSES.forEach((st) => {
    counts[st.id] = clients.filter((c) => c.status === st.id).length;
  });

  const sorters = {
    recent: () => 0, // the server already returns most recently updated first
    deadline: (a, b) => dayKey(a.deadline) - dayKey(b.deadline),
    followup: (a, b) => dayKey(a.followUpAt) - dayKey(b.followUpAt),
    amount: (a, b) => (b.amount || 0) - (a.amount || 0)
  };

  const visible = clients
    .filter((c) => (filter === "all" ? true : filter === "open" ? !CLOSED.includes(c.status) : c.status === filter) && matchesQuery(c))
    .sort(sorters[sort]);

  const pipeline = clients.filter((c) => !CLOSED.includes(c.status)).reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Clients &amp; Orders</h2>
          <p className="panel-sub">
            Track every buyer, deadline and follow-up in one place so nothing slips.
            {pipeline > 0 && <> Open pipeline: <strong>{pipeline.toLocaleString()}</strong>.</>}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>+ Add Client</button>
      </div>

      <div className="panel-toolbar">
        <div className="toolbar-row">
          <input className="panel-search" type="search" placeholder="Search clients…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <label className="sort-pick">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        </div>
        <div className="chip-row">
          {[{ id: "open", label: "Open" }, ...STATUSES, { id: "all", label: "All" }].map((st) => (
            <button key={st.id} type="button" className={`chip ${filter === st.id ? "chip-active" : ""}`} onClick={() => setFilter(st.id)}>
              {st.label} <span className="chip-count">{counts[st.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="panel-empty">
          <p>{clients.length === 0 ? "No clients yet. Add your first order to start tracking." : "Nothing matches this filter."}</p>
        </div>
      ) : (
        <div className="card-grid">
          {visible.map((c) => {
            const due = dueState(c.deadline);
            const follow = ["completed", "archived"].includes(c.status) ? null : dueState(c.followUpAt);
            return (
              <article className="item-card" key={c._id}>
                <header>
                  <div>
                    <h3>{c.name}</h3>
                    {c.project && <p className="muted">{c.project}</p>}
                  </div>
                  <select
                    className={`status-select status-${c.status}`}
                    value={c.status}
                    onChange={(e) => quickStatus(c, e.target.value)}
                    aria-label="Status"
                  >
                    {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </header>

                <div className="meta-row">
                  {c.amount > 0 && <span className="badge">{c.currency} {c.amount.toLocaleString()}</span>}
                  {due && c.deadline && !["completed", "archived"].includes(c.status) && (
                    <span className={`badge badge-${due.tone}`}>Deadline {due.text}</span>
                  )}
                  {follow && <span className={`badge badge-${follow.tone}`}>Follow up {follow.text}</span>}
                </div>

                {c.notes && <p className="item-body">{c.notes}</p>}

                <footer>
                  <div className="item-actions item-actions-remind">
                    <span className="muted">Remind</span>
                    <button type="button" onClick={() => snooze(c, 1)}>Tomorrow</button>
                    <button type="button" onClick={() => snooze(c, 3)}>3 days</button>
                  </div>
                  <div className="item-actions">
                    <button type="button" onClick={() => openEdit(c)}>Edit</button>
                    <button type="button" className="danger" onClick={() => setPendingDelete(c)}>Delete</button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {form && (
        <div className="confirm-backdrop" onClick={() => setForm(null)}>
          <form className="modal form-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editingId ? "Edit client" : "Add client"}</h3>
            <label>Client name
              <input required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>Project / order
              <input maxLength={100} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
            </label>
            <div className="form-two">
              <label>Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label>Amount
                <input type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </label>
            </div>
            <div className="form-two">
              <label>Deadline
                <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </label>
              <label>Follow up on
                <input type="date" value={form.followUpAt} onChange={(e) => setForm({ ...form, followUpAt: e.target.value })} />
              </label>
            </div>
            <label>Notes
              <textarea rows={3} maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          title={`Delete ${pendingDelete.name}?`}
          message="The client record is removed. Your saved messages are kept."
          confirmLabel="Delete Client"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
