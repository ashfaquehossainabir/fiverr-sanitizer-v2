import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import TopBar from "../components/TopBar.jsx";
import Editor from "../components/Editor.jsx";
import SavedMessages from "../components/SavedMessages.jsx";
import AccountModal from "../components/AccountModal.jsx";
import Overview from "../components/Overview.jsx";
import Clients from "../components/Clients.jsx";
import Templates from "../components/Templates.jsx";
import SearchView from "../components/SearchView.jsx";
import Loader from "../components/Loader.jsx";
import BottomNav from "../components/BottomNav.jsx";
import CommandPalette from "../components/CommandPalette.jsx";
import ShortcutsModal from "../components/ShortcutsModal.jsx";
import TodayStrip from "../components/TodayStrip.jsx";
import Planner from "../components/Planner.jsx";
import FocusPill from "../components/FocusPill.jsx";
import useTasks from "../hooks/useTasks.js";
import useFocusTimer from "../hooks/useFocusTimer.js";
import { useAuth } from "../context/AuthContext.jsx";
import { openTaskCount } from "../lib/tasks.js";
import { IconEdit, IconChart, IconUsers, IconQuote, IconSearch, IconHash, IconSun, IconUser, IconKeyboard, IconCalendar, IconPlus, IconPlay } from "../components/icons.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { fillTemplate } from "../lib/templateVars.js";
import { isTypingTarget } from "../lib/platform.js";
import { daysUntil } from "../lib/dates.js";

const CLOSED = ["completed", "archived"];

export default function Dashboard() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { notify } = useToast();
  const { user } = useAuth();
  const [view, setView] = useState("workspace");

  const [tabs, setTabs] = useState([]);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [activeTabId, setActiveTabId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState([]);
  const [loadedText, setLoadedText] = useState(null);
  const [insertRequest, setInsertRequest] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [searchSeed, setSearchSeed] = useState({ id: 0, q: "" });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [plannerFocus, setPlannerFocus] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  // Stable identity matters: child panels list this in effect dependencies.
  const reportError = useCallback((msg) => setErrorBanner(msg), []);

  const activeTab = tabs.find((t) => t._id === activeTabId) || null;

  const tasksApi = useTasks(reportError);
  const taskCount = useMemo(() => openTaskCount(tasksApi.tasks), [tasksApi.tasks]);

  const handleTimerComplete = useCallback(
    (evt) => {
      if (evt.kind === "focus") {
        notify(`Focus session done. Take a ${evt.restMinutes}-minute break.`, { duration: 5000 });
        if (evt.taskId) tasksApi.addFocusSession(evt.taskId);
      } else {
        notify("Break over. Ready for the next session?", { duration: 5000 });
      }
    },
    [notify, tasksApi.addFocusSession]
  );
  const timer = useFocusTimer(user?.id || user?._id, handleTimerComplete);

  const openPlanner = useCallback(() => setView("planner"), []);
  const openNewTask = useCallback(() => {
    setView("planner");
    setPlannerFocus((n) => n + 1);
  }, []);

  const loadTabs = useCallback(async () => {
    setTabsLoading(true);
    try {
      const { data } = await api.get("/tabs");
      setTabs(data.tabs);
      if (data.tabs.length > 0) {
        setActiveTabId((current) => current || data.tabs[0]._id);
      }
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not load your tabs.");
    } finally {
      setTabsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  const loadClients = useCallback(async () => {
    try {
      const { data } = await api.get("/clients");
      setClients(data.clients);
    } catch {
      /* the Clients view reports its own errors; this list is a convenience */
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const loadTemplates = useCallback(async () => {
    try {
      const { data } = await api.get("/templates");
      setTemplates(data.templates);
    } catch {
      /* the picker simply shows no templates; the Templates view reports its own errors */
    }
  }, []);

  // Refresh whenever the user changes page so edits made in the Templates view
  // are available in the editor's quick-insert straight away.
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates, view]);

  // New page, start at the top (matters on phones, where the page scrolls).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const handleClientsChanged = useCallback(() => {
    loadClients();
    setRefreshKey((k) => k + 1);
  }, [loadClients]);

  // Switching tabs quickly fires overlapping requests; only the newest one may
  // write to state, otherwise a slow reply shows another tab's messages.
  const messagesReq = useRef(0);
  const loadMessages = useCallback(async (tabId) => {
    const requestId = ++messagesReq.current;
    if (!tabId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }
    setMessagesLoading(true);
    try {
      const { data } = await api.get(`/tabs/${tabId}/messages`);
      if (requestId === messagesReq.current) setMessages(data.messages);
    } catch (err) {
      if (requestId === messagesReq.current) {
        setMessages([]);
        setErrorBanner(err.response?.data?.message || "Could not load saved messages.");
      }
    } finally {
      if (requestId === messagesReq.current) setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages(activeTabId);
  }, [activeTabId, loadMessages]);

  const handleCreateTab = async (name) => {
    try {
      const { data } = await api.post("/tabs", { name });
      setTabs((prev) => [...prev, data.tab]);
      setActiveTabId(data.tab._id);
      setView("workspace");
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not create the tab.");
    }
  };

  const handleRenameTab = async (tabId, name) => {
    try {
      const { data } = await api.put(`/tabs/${tabId}`, { name });
      setTabs((prev) => prev.map((t) => (t._id === tabId ? data.tab : t)));
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not rename the tab.");
    }
  };

  const handleDeleteTab = async (tabId) => {
    try {
      await api.delete(`/tabs/${tabId}`);
      // No state updates inside another setter's callback (they run twice in StrictMode).
      const next = tabs.filter((t) => t._id !== tabId);
      setTabs(next);
      if (activeTabId === tabId) setActiveTabId(next.length > 0 ? next[0]._id : null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not delete the tab.");
    }
  };

  const handleSaveMessage = async ({ originalText, sanitizedText, client }) => {
    if (!activeTabId) {
      setErrorBanner("Create or select a tab before saving a message.");
      throw new Error("No active tab");
    }
    setSaving(true);
    try {
      const { data } = await api.post(`/tabs/${activeTabId}/messages`, {
        originalText,
        sanitizedText,
        client
      });
      // Keep the server's order: pinned messages first, then newest.
      setMessages((prev) =>
        [data.message, ...prev].sort(
          (a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt)
        )
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not save this message.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (message) => {
    try {
      const { data } = await api.put(`/tabs/${activeTabId}/messages/${message._id}`, {
        pinned: !message.pinned
      });
      setMessages((prev) =>
        prev
          .map((m) => (m._id === message._id ? data.message : m))
          // Same ordering the server uses: pinned first, then newest.
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt))
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not update this message.");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeTabId) return;
    try {
      await api.delete(`/tabs/${activeTabId}/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not delete the saved message.");
    }
  };

  const handleUseTemplate = (text) => {
    setLoadedText({ id: Date.now(), text });
    setView("workspace");
  };

  const handleReuseMessage = (text) => {
    setLoadedText({ id: Date.now(), text, label: "Saved message loaded." });
    setView("workspace");
  };

  const handleTemplateUsed = useCallback(async (templateId) => {
    try {
      const { data } = await api.post(`/templates/${templateId}/use`);
      setTemplates((prev) => prev.map((t) => (t._id === templateId ? data.template : t)));
    } catch {
      /* usage counter is best-effort */
    }
  }, []);

  const insertTemplateFromPalette = useCallback(
    (template) => {
      setInsertRequest({ id: Date.now(), text: fillTemplate(template.body, {}) });
      setView("workspace");
      handleTemplateUsed(template._id);
      notify(`Inserted “${template.title}”`);
    },
    [handleTemplateUsed, notify]
  );

  const openSearchFor = useCallback((q) => {
    setSearchSeed({ id: Date.now(), q });
    setView("search");
  }, []);

  const openTabFromSearch = (tabId) => {
    setActiveTabId(tabId);
    setView("workspace");
  };

  const openClients = useCallback(() => setView("clients"), []);

  const clientNames = useMemo(
    () => Object.fromEntries(clients.map((c) => [c._id, c.name])),
    [clients]
  );
  const linkableClients = useMemo(() => clients.filter((c) => !CLOSED.includes(c.status)), [clients]);
  const followUpCount = useMemo(
    () => clients.filter((c) => c.followUpAt && !CLOSED.includes(c.status) && daysUntil(c.followUpAt) <= 0).length,
    [clients]
  );

  /* Ctrl/Cmd+K opens the palette from anywhere; "?" opens the shortcut list. */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !isTypingTarget(document.activeElement)) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      // "N" = new task, unless the user is typing or a dialog is open.
      if (
        (e.key === "n" || e.key === "N") &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        !isTypingTarget(document.activeElement) &&
        !document.querySelector(".confirm-backdrop, .palette-backdrop, .modal-backdrop, .view-message-backdrop")
      ) {
        e.preventDefault();
        openNewTask();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNewTask]);

  const paletteItems = useMemo(() => {
    const go = (id, label, hint, Icon) => ({
      id: `go-${id}`,
      group: "Go to",
      label,
      hint,
      icon: <Icon size={16} />,
      run: () => setView(id)
    });
    const byUse = [...templates].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    return [
      go("workspace", "Workspace", "Write and sanitize", IconEdit),
      go("planner", "Planner", "Tasks, focus timer, week view", IconCalendar),
      go("overview", "Overview", "Goals, stats, calculator", IconChart),
      go("clients", "Clients & orders", "Deadlines and follow-ups", IconUsers),
      go("templates", "Templates", "Quick replies", IconQuote),
      go("search", "Search saved messages", "Across every tab", IconSearch),
      ...tabs.map((t) => ({
        id: `tab-${t._id}`,
        group: "Tabs",
        label: t.name,
        hint: "Open tab",
        keywords: "tab",
        icon: <IconHash size={16} />,
        run: () => {
          setActiveTabId(t._id);
          setView("workspace");
        }
      })),
      ...byUse.map((t) => ({
        id: `tpl-${t._id}`,
        group: "Insert template",
        label: t.title,
        hint: t.category,
        keywords: t.body,
        icon: <IconQuote size={16} />,
        run: () => insertTemplateFromPalette(t)
      })),
      { id: "act-task", group: "Actions", label: "Add a task", hint: "N", keywords: "todo new reminder", icon: <IconPlus size={16} />, run: openNewTask },
      {
        id: "act-focus",
        group: "Actions",
        label: timer.running ? "Pause the focus timer" : "Start a focus session",
        keywords: "pomodoro timer focus break",
        icon: <IconPlay size={16} />,
        run: () => {
          if (timer.running) timer.pause();
          else timer.start();
          setView("planner");
        }
      },
      {
        id: "act-theme",
        group: "Actions",
        label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        keywords: "theme appearance dark light",
        icon: <IconSun size={16} />,
        run: toggleTheme
      },
      { id: "act-account", group: "Actions", label: "Account settings", icon: <IconUser size={16} />, run: () => setAccountOpen(true) },
      { id: "act-keys", group: "Actions", label: "Keyboard shortcuts", hint: "?", icon: <IconKeyboard size={16} />, run: () => setShortcutsOpen(true) }
    ];
  }, [tabs, templates, theme, toggleTheme, insertTemplateFromPalette, openNewTask, timer]);

  const HEADINGS = {
    workspace: ["Workspace", activeTab?.name || ""],
    planner: ["Planner", ""],
    overview: ["Overview", ""],
    clients: ["Clients", ""],
    templates: ["Templates", ""],
    search: ["Search", ""]
  };
  const [title, subtitle] = HEADINGS[view];

  const renderWorkspace = () => {
    if (tabsLoading) {
      return (
        <div className="dashboard-loading">
          <Loader label="Loading your workspace" />
        </div>
      );
    }
    return (
      <>
        <TodayStrip clients={clients} tasks={tasksApi.tasks} onOpenClients={openClients} onOpenPlanner={openPlanner} />

        <Editor
          onSaveMessage={handleSaveMessage}
          saving={saving}
          loadedText={loadedText}
          insertRequest={insertRequest}
          clients={linkableClients}
          templates={templates}
          onTemplateUsed={handleTemplateUsed}
          onManageTemplates={() => setView("templates")}
        />

        {tabs.length === 0 ? (
          <div className="dashboard-loading workspace-note">
            <p>Want to keep your sanitized messages? Create a tab to save them in. You can sanitize and copy without one.</p>
            <button type="button" className="btn-primary" onClick={() => handleCreateTab("General")}>
              Create a “General” tab
            </button>
          </div>
        ) : (
          <section className="saved-messages-section">
            <div className="section-head">
              <h2>Saved messages</h2>
              <span className="count-pill">{messages.length}</span>
              {activeTab && <span className="section-tab"># {activeTab.name}</span>}
            </div>
            <SavedMessages
              messages={messages}
              loading={messagesLoading}
              onDelete={handleDeleteMessage}
              onTogglePin={handleTogglePin}
              onReuse={handleReuseMessage}
              tabName={activeTab?.name || ""}
              clientNames={clientNames}
            />
          </section>
        )}
      </>
    );
  };

  return (
    <div className="dashboard-shell">
      <Sidebar
        view={view}
        onChangeView={setView}
        followUpCount={followUpCount}
        taskCount={taskCount}
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCreateTab={handleCreateTab}
        onRenameTab={handleRenameTab}
        onDeleteTab={handleDeleteTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAccount={() => setAccountOpen(true)}
      />

      <div className="dashboard-main">
        <TopBar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          onAvatarClick={() => setAccountOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />

        <div className="dashboard-content">
          {errorBanner && (
            <div className="dashboard-error-banner">
              <span>{errorBanner}</span>
              <button type="button" onClick={() => setErrorBanner("")}>✕</button>
            </div>
          )}

          {view === "workspace" && renderWorkspace()}
          {view === "planner" && (
            <Planner
              tasksApi={tasksApi}
              clients={clients}
              timer={timer}
              onOpenClients={openClients}
              focusInputSignal={plannerFocus}
              onFocusHandled={() => setPlannerFocus(0)}
            />
          )}
          {view === "overview" && (
            <Overview refreshKey={refreshKey} onOpenClients={openClients} onError={reportError} />
          )}
          {view === "clients" && <Clients onError={reportError} onChanged={handleClientsChanged} />}
          {view === "templates" && <Templates onUseTemplate={handleUseTemplate} onError={reportError} />}
          {view === "search" && (
            <SearchView key={searchSeed.id} initialQuery={searchSeed.q} onOpenTab={openTabFromSearch} onError={reportError} />
          )}
        </div>
      </div>

      <BottomNav view={view} onChangeView={setView} followUpCount={followUpCount} taskCount={taskCount} />
      {view !== "planner" && <FocusPill timer={timer} onOpen={openPlanner} />}

      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      {paletteOpen && (
        <CommandPalette items={paletteItems} onClose={() => setPaletteOpen(false)} onSearch={openSearchFor} />
      )}
    </div>
  );
}
