import { IconEdit, IconChart, IconUsers, IconQuote, IconSearch } from "./icons.jsx";

const ITEMS = [
  { id: "workspace", label: "Write", Icon: IconEdit },
  { id: "overview", label: "Overview", Icon: IconChart },
  { id: "clients", label: "Clients", Icon: IconUsers },
  { id: "templates", label: "Templates", Icon: IconQuote },
  { id: "search", label: "Search", Icon: IconSearch }
];

// Thumb-friendly navigation for phones and small tablets (hidden on desktop,
// where the sidebar does this job).
export default function BottomNav({ view, onChangeView, followUpCount = 0 }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`bottom-nav-btn ${view === id ? "active" : ""}`}
          onClick={() => onChangeView(id)}
          aria-current={view === id ? "page" : undefined}
        >
          <span className="bottom-nav-icon">
            <Icon size={20} />
            {id === "clients" && followUpCount > 0 && <span className="bottom-nav-badge">{followUpCount}</span>}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
