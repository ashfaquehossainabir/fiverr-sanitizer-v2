import { useCallback, useEffect, useState } from "react";
import api from "../api/axios.js";
import Sidebar from "../components/Sidebar.jsx";
import TopBar from "../components/TopBar.jsx";
import Editor from "../components/Editor.jsx";
import SavedMessages from "../components/SavedMessages.jsx";
import AccountModal from "../components/AccountModal.jsx";
import Loader from "../components/Loader.jsx";

export default function Dashboard() {
  const [tabs, setTabs] = useState([]);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [activeTabId, setActiveTabId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

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
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not delete the tab.");
    }
  };

  const handleSaveMessage = async ({ originalText, sanitizedText }) => {
    if (!activeTabId) {
      setErrorBanner("Create or select a tab before saving a message.");
      throw new Error("No active tab");
    }
    setSaving(true);
    try {
      const { data } = await api.post(`/tabs/${activeTabId}/messages`, {
        originalText,
        sanitizedText
      });
      setMessages((prev) => [data.message, ...prev]);
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not save this message.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeTabId) return;
    try {
      await api.delete(`/tabs/${activeTabId}/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      setErrorBanner(err.response?.data?.message || "Could not delete the saved message.");
    }
  };

  return (
    <div className="dashboard-shell">
      <Sidebar
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
          activeTabName={activeTab?.name}
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

          {tabsLoading ? (
            <div className="dashboard-loading">
              <Loader label="Loading your workspace" />
            </div>
          ) : tabs.length === 0 ? (
            <div className="dashboard-loading">
              You don&apos;t have any tabs yet. Use <strong>+ New Tab</strong> in the sidebar to create your first one.
            </div>
          ) : (
            <>
              <Editor onSaveMessage={handleSaveMessage} saving={saving} />

              <section className="saved-messages-section">
                <h2>Saved Messages {activeTab ? `in "${activeTab.name}"` : ""}</h2>
                <SavedMessages
                  messages={messages}
                  loading={messagesLoading}
                  onDelete={handleDeleteMessage}
                />
              </section>
            </>
          )}
        </div>
      </div>

      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
