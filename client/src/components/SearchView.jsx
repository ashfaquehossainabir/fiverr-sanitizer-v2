import { useEffect, useState } from "react";
import api from "../api/axios.js";
import Loader from "./Loader.jsx";

const fmt = (d) =>
  new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });

// Search every saved message across all tabs, e.g. "what did I tell Anna about the deadline?"
export default function SearchView({ onOpenTab, onError, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/search", { params: { q } });
        if (!cancelled) setResults(data.results);
      } catch (err) {
        onError?.(err.response?.data?.message || "Search failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, onError]);

  const copy = async (m) => {
    await navigator.clipboard.writeText(m.sanitizedText);
    setCopiedId(m._id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Search</h2>
          <p className="panel-sub">Find any message you have saved, across every tab.</p>
        </div>
      </div>

      <input
        autoFocus
        className="panel-search search-big"
        type="search"
        placeholder="Type at least 2 characters…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <Loader label="Searching" />}

      {results && !loading && results.length === 0 && (
        <div className="panel-empty"><p>No saved messages contain “{query.trim()}”.</p></div>
      )}

      {results && results.length > 0 && (
        <div className="result-list">
          {results.map((m) => (
            <article className="item-card" key={m._id}>
              <header>
                <div>
                  <span className="badge">{m.tab?.name || "Deleted tab"}</span>{" "}
                  {m.client && <span className="badge badge-ok">{m.client.name}</span>}
                </div>
                <span className="muted">{fmt(m.createdAt)}</span>
              </header>
              <p className="item-body">{m.sanitizedText}</p>
              <footer>
                <span />
                <div className="item-actions">
                  <button type="button" onClick={() => copy(m)}>{copiedId === m._id ? "Copied!" : "Copy"}</button>
                  {m.tab?._id && <button type="button" onClick={() => onOpenTab(m.tab._id)}>Open tab</button>}
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
