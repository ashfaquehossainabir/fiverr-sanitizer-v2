import { useEffect, useMemo, useRef, useState } from "react";
import { IconSearch } from "./icons.jsx";
import useDebouncedValue from "../hooks/useDebouncedValue.js";

const PER_GROUP_IDLE = 6; // keep the idle list short; typing reveals everything

// Ctrl/Cmd+K quick switcher: jump to a view or tab, drop a template into the
// editor, or search every saved message without touching the mouse.
export default function CommandPalette({ items, onClose, onSearch }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);
  const pending = query !== debouncedQuery; // list is briefly stale while typing
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let list;
    if (q) {
      list = items.filter((i) => `${i.label} ${i.keywords || ""} ${i.group}`.toLowerCase().includes(q));
    } else {
      const seen = {};
      list = items.filter((i) => {
        seen[i.group] = (seen[i.group] || 0) + 1;
        return seen[i.group] <= PER_GROUP_IDLE;
      });
    }
    if (q.length >= 2) {
      list = [
        ...list,
        {
          id: "search-saved",
          group: "Search",
          label: `Search saved messages for “${debouncedQuery.trim()}”`,
          icon: <IconSearch size={16} />,
          run: () => onSearch(debouncedQuery.trim())
        }
      ];
    }
    return list;
  }, [items, debouncedQuery, onSearch]);

  useEffect(() => {
    setActive(0);
  }, [debouncedQuery]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (item) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (pending) return; // don't run an item from a stale list
      run(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = null;

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="palette-input">
          <IconSearch size={18} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to a page, tab or template…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[active] ? `palette-opt-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>

        <ul className="palette-list" id="palette-list" role="listbox" ref={listRef}>
          {results.length === 0 && <li className="palette-empty">Nothing matches “{debouncedQuery}”.</li>}
          {results.map((item, index) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id} role="presentation">
                {header && <p className="palette-group">{header}</p>}
                <button
                  type="button"
                  id={`palette-opt-${index}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  className={`palette-item ${index === active ? "active" : ""}`}
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(item)}
                >
                  <span className="palette-icon">{item.icon}</span>
                  <span className="palette-label">{item.label}</span>
                  {item.hint && <span className="palette-hint">{item.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> select</span>
        </div>
      </div>
    </div>
  );
}
