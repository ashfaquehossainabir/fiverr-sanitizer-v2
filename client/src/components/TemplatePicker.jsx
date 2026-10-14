import { useEffect, useMemo, useRef, useState } from "react";
import { autoFillValues, extractVariables, fillTemplate } from "../lib/templateVars.js";

// Popover (bottom sheet on phones) that drops a saved quick-reply straight into
// the editor. Placeholders such as {{client}} / {{project}} / {{deadline}} are
// filled automatically from the client the message is linked to; only the ones
// we can't know are asked for.
export default function TemplatePicker({ templates, client, onInsert, onClose, onManage }) {
  const [query, setQuery] = useState("");
  const [filling, setFilling] = useState(null); // { template, values, missing }
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    const onDown = (e) => {
      if (!e.target.closest?.(".tpl-wrap")) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...templates].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    return q ? list.filter((t) => `${t.title} ${t.category} ${t.body}`.toLowerCase().includes(q)) : list;
  }, [templates, query]);

  const choose = (template) => {
    const vars = extractVariables(template.body);
    const values = autoFillValues(vars, client);
    const missing = vars.filter((v) => !values[v]);
    if (missing.length === 0) {
      onInsert(fillTemplate(template.body, values), template);
      return;
    }
    setFilling({ template, values, missing });
  };

  if (filling) {
    return (
      <div className="tpl-pop" role="dialog" aria-label="Fill in template details">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onInsert(fillTemplate(filling.template.body, filling.values), filling.template);
          }}
        >
          <p className="tpl-pop-title">{filling.template.title}</p>
          {filling.missing.map((key, i) => (
            <label key={key} className="tpl-field">
              <span>{key}</span>
              <input
                autoFocus={i === 0}
                value={filling.values[key]}
                onChange={(e) =>
                  setFilling({ ...filling, values: { ...filling.values, [key]: e.target.value } })
                }
              />
            </label>
          ))}
          <p className="tpl-pop-hint">Blank fields stay as placeholders you can finish in the editor.</p>
          <div className="tpl-pop-actions">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setFilling(null)}>
              Back
            </button>
            <button type="submit" className="btn-primary btn-sm">
              Insert
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="tpl-pop" role="dialog" aria-label="Insert a template">
      <input
        ref={searchRef}
        className="tpl-search"
        type="search"
        placeholder="Search templates…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {client && <p className="tpl-pop-hint">Auto-filling details for <strong>{client.name}</strong></p>}

      {templates.length === 0 ? (
        <div className="tpl-empty">
          <p>No templates yet.</p>
          <button type="button" className="btn-primary btn-sm" onClick={onManage}>
            Create templates
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="tpl-empty"><p>No templates match “{query}”.</p></div>
      ) : (
        <ul className="tpl-list">
          {visible.map((t) => (
            <li key={t._id}>
              <button type="button" onClick={() => choose(t)}>
                <span className="tpl-item-top">
                  <strong>{t.title}</strong>
                  <span className="badge">{t.category}</span>
                </span>
                <span className="tpl-item-body">{t.body}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
