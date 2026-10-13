import { useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import ConfirmModal from "./ConfirmModal.jsx";
import Loader from "./Loader.jsx";
import { extractVariables, fillTemplate, STARTER_TEMPLATES } from "../lib/templateVars.js";

const EMPTY = { title: "", category: "General", body: "" };

export default function Templates({ onUseTemplate, onError }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed, object = create/edit
  const [editingId, setEditingId] = useState(null);
  const [filling, setFilling] = useState(null); // { template, values }
  const [pendingDelete, setPendingDelete] = useState(null);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/templates");
        if (!cancelled) setTemplates(data.templates);
      } catch (err) {
        onError?.(err.response?.data?.message || "Could not load templates.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const categories = useMemo(() => ["All", ...new Set(templates.map((t) => t.category))], [templates]);

  const visible = templates.filter(
    (t) =>
      (category === "All" || t.category === category) &&
      (!query.trim() || `${t.title} ${t.body}`.toLowerCase().includes(query.trim().toLowerCase()))
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY });
  };

  const openEdit = (t) => {
    setEditingId(t._id);
    setForm({ title: t.title, category: t.category, body: t.body });
  };

  const saveForm = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { data } = await api.put(`/templates/${editingId}`, form);
        setTemplates((prev) => prev.map((t) => (t._id === editingId ? data.template : t)));
      } else {
        const { data } = await api.post("/templates", form);
        setTemplates((prev) => [data.template, ...prev]);
      }
      setForm(null);
    } catch (err) {
      onError?.(err.response?.data?.message || "Could not save the template.");
    }
  };

  const addStarters = async () => {
    try {
      const created = [];
      for (const t of STARTER_TEMPLATES) {
        const { data } = await api.post("/templates", t);
        created.push(data.template);
      }
      setTemplates((prev) => [...created, ...prev]);
    } catch (err) {
      onError?.(err.response?.data?.message || "Could not add starter templates.");
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/templates/${pendingDelete._id}`);
      setTemplates((prev) => prev.filter((t) => t._id !== pendingDelete._id));
    } catch (err) {
      onError?.(err.response?.data?.message || "Could not delete the template.");
    } finally {
      setPendingDelete(null);
    }
  };

  const startUse = (t) => {
    const vars = extractVariables(t.body);
    if (vars.length === 0) return finishUse(t, t.body);
    setFilling({ template: t, values: Object.fromEntries(vars.map((v) => [v, ""])) });
  };

  const finishUse = async (t, text) => {
    onUseTemplate(text);
    setFilling(null);
    try {
      const { data } = await api.post(`/templates/${t._id}/use`);
      setTemplates((prev) => prev.map((x) => (x._id === t._id ? data.template : x)));
    } catch {
      /* usage counter is best-effort */
    }
  };

  if (loading) return <Loader label="Loading templates" />;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Quick Reply Templates</h2>
          <p className="panel-sub">
            Save the messages you send again and again. Use <code>{"{{client}}"}</code>-style placeholders and
            fill them in with one click.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>+ New Template</button>
      </div>

      {templates.length > 0 && (
        <div className="panel-toolbar">
          <input
            className="panel-search"
            type="search"
            placeholder="Search templates…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chip-row">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${category === c ? "chip-active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="panel-empty">
          <p>No templates yet. Start with a ready-made set of professional replies, or create your own.</p>
          <button type="button" className="btn-primary" onClick={addStarters}>Add 6 starter templates</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="panel-empty"><p>No templates match your search.</p></div>
      ) : (
        <div className="card-grid">
          {visible.map((t) => (
            <article className="item-card" key={t._id}>
              <header>
                <h3>{t.title}</h3>
                <span className="badge">{t.category}</span>
              </header>
              <p className="item-body">{t.body}</p>
              <footer>
                <span className="muted">Used {t.usageCount}×</span>
                <div className="item-actions">
                  <button type="button" onClick={() => startUse(t)}>Use</button>
                  <button type="button" onClick={() => openEdit(t)}>Edit</button>
                  <button type="button" className="danger" onClick={() => setPendingDelete(t)}>Delete</button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}

      {form && (
        <div className="confirm-backdrop" onClick={() => setForm(null)}>
          <form className="modal form-modal" onClick={(e) => e.stopPropagation()} onSubmit={saveForm}>
            <h3>{editingId ? "Edit template" : "New template"}</h3>
            <label>Title
              <input required maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>Category
              <input maxLength={30} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </label>
            <label>Message
              <textarea
                required
                rows={7}
                maxLength={3000}
                placeholder="Hi {{client}}, your {{project}} is ready…"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}

      {filling && (
        <div className="confirm-backdrop" onClick={() => setFilling(null)}>
          <form
            className="modal form-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              finishUse(filling.template, fillTemplate(filling.template.body, filling.values));
            }}
          >
            <h3>Fill in the details</h3>
            {Object.keys(filling.values).map((key, i) => (
              <label key={key}>{key}
                <input
                  autoFocus={i === 0}
                  value={filling.values[key]}
                  onChange={(e) => setFilling({ ...filling, values: { ...filling.values, [key]: e.target.value } })}
                />
              </label>
            ))}
            <p className="muted">Empty fields stay as placeholders so you can finish them in the editor.</p>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setFilling(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Send to editor</button>
            </div>
          </form>
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          title={`Delete "${pendingDelete.title}"?`}
          message="This template will be permanently removed."
          confirmLabel="Delete Template"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
