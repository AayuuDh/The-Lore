import { useCallback, useEffect, useState } from "react";
import LeftPanel from "./LeftPanel";
import Discover from "./Discover";
import { getConversation, saveConversation } from "../api";
import "./Home.css";

// A stable per-chat id, kept in sessionStorage so the current chat maps to the
// same history entry when navigating away and back within a session.
const CONV_ID_KEY = "discover.convId";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// The home page: the history bar (LeftPanel) beside the discovery chat
// (Discover). Owns the conversation id, the "load this chat" plumbing, and the
// version counter that tells the history list to refresh after a save.
function Home({ onAddSkills, onOpenSkill, onEditSkill, onBrowse, username, userId }) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeId, setActiveId] = useState(
    () => sessionStorage.getItem(CONV_ID_KEY) || newId()
  );
  // Messages to inject into Discover when opening a history item / new chat, and
  // a token that makes each request re-apply even for the same id.
  const [injected, setInjected] = useState(null);
  const [loadToken, setLoadToken] = useState(0);
  // Bumped after every save so the history list refetches and re-sorts.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    sessionStorage.setItem(CONV_ID_KEY, activeId);
  }, [activeId]);

  const handleNewChat = useCallback(() => {
    setActiveId(newId());
    setInjected([]);
    setLoadToken((t) => t + 1);
    setPanelOpen(true);
  }, []);

  const handleOpenConversation = useCallback(
    async (id) => {
      if (!userId) return;
      try {
        const convo = await getConversation(userId, id);
        setActiveId(id);
        setInjected(convo?.messages || []);
        setLoadToken((t) => t + 1);
      } catch {
        /* ignore — a missing conversation just does nothing */
      }
    },
    [userId]
  );

  // Persist the current chat, then refresh the list so the title/order update.
  const handleConversationChange = useCallback(
    async ({ id, title, messages }) => {
      if (!userId || !messages?.length) return;
      await saveConversation(userId, id || activeId, {
        type: "discover",
        title,
        messages,
      });
      setVersion((v) => v + 1);
    },
    [userId, activeId]
  );

  return (
    <div className="home-layout">
      <LeftPanel
        userId={userId}
        open={panelOpen}
        onToggle={() => setPanelOpen((o) => !o)}
        onNewChat={handleNewChat}
        onOpenConversation={handleOpenConversation}
        activeId={activeId}
        version={version}
      />
      <div className="home-layout__main">
        <Discover
          onAddSkills={onAddSkills}
          onOpenSkill={onOpenSkill}
          onEditSkill={onEditSkill}
          onBrowse={onBrowse}
          username={username}
          userId={userId}
          conversationId={activeId}
          injectedMessages={injected}
          loadToken={loadToken}
          onConversationChange={handleConversationChange}
        />
      </div>
    </div>
  );
}

export default Home;
