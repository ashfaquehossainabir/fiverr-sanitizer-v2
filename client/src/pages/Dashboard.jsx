import { useCallback, useEffect, useMemo, useState } from "react";
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

const CLOSED = ["completed", "archived"];

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

export default function Dashboard() {
  const [view, setView] = useState("workspace");

  const [tabs, setTabs] = useState([]);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [activeTabId, setActiveTabId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState([]);
  const [loadedText, setLoadedText] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  // Stable identity matters: child panels list this in effect dependencies.
  const reportError = useCallback((msg) => setErrorBanner(msg), []);

  const activeTab = tabs.find((t) => t._id === activeTabId) || null;

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

  const handleClientsChanged = useCallback(() => {
    loadClients();
    setRefreshKey((k) => k + 1);
  }, [loadClients]);

  const loadMessages = useCallback(async (tabId) => {
    if (!tabId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    try {
      const { data } = await api.get(`/tabs/${tabId}/messages`);
      setMessages(data.messages);
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not load saved messages.");
    } finally {
      setMessagesLoading(false);
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
      setTabs((prev) => {
        const next = prev.filter((t) => t._id !== tabId);
        if (activeTabId === tabId) {
          setActiveTabId(next.length > 0 ? next[0]._id : null);
        }
        return next;
      });
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
      setMessages((prev) => [data.message, ...prev]);
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
  const followUpCount = useMemo(() => {
    const limit = endOfToday();
    return clients.filter(
      (c) => c.followUpAt && !CLOSED.includes(c.status) && new Date(c.followUpAt).getTime() <= limit
    ).length;
  }, [clients]);

  const HEADINGS = {
    workspace: ["Workspace", activeTab?.name || ""],
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
        <Editor
          onSaveMessage={handleSaveMessage}
          saving={saving}
          loadedText={loadedText}
          clients={linkableClients}
        />

        {tabs.length === 0 ? (
          <div className="dashboard-loading workspace-note">
            Want to keep your sanitized messages? Use <strong>+ New Tab</strong> in the sidebar to
            create your first tab. You can sanitize and copy without one.
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
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCreateTab={handleCreateTab}
        onRenameTab={handleRenameTab}
        onDeleteTab={handleDeleteTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="dashboard-main">
        <TopBar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          onAvatarClick={() => setAccountOpen(true)}
        />

        <div className="dashboard-content">
          {errorBanner && (
            <div className="dashboard-error-banner">
              <span>{errorBanner}</span>
              <button type="button" onClick={() => setErrorBanner("")}>✕</button>
            </div>
          )}

          {view === "workspace" && renderWorkspace()}
          {view === "overview" && (
            <Overview refreshKey={refreshKey} onOpenClients={openClients} onError={reportError} />
          )}
          {view === "clients" && <Clients onError={reportError} onChanged={handleClientsChanged} />}
          {view === "templates" && <Templates onUseTemplate={handleUseTemplate} onError={reportError} />}
          {view === "search" && <SearchView onOpenTab={openTabFromSearch} onError={reportError} />}
        </div>
      </div>

      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
