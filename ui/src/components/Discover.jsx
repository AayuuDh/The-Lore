import { useState, useRef, useEffect } from "react";
import { ArrowRightIcon, SearchIcon, PaperAirplaneIcon, InfoIcon, PlusIcon, StopIcon, XIcon } from "@primer/octicons-react";
import { discoverSkill } from "../api";
import SkillDetail from "./SkillDetail";
import { useLeaveGuard, ABANDON_INTENTS } from "./LeaveGuard";
import "./Discover.css";

// Starter prompts so the first message is one click away — no blank-page stare.
// Workplace-specific and skill-oriented so the value is obvious at a glance.
const STARTERS = [
  "Prepare for a customer escalation meeting",
  "Create a sprint plan",
  "Analyze customer feedback",
  "Draft a project status update",
];

const GREETING =
  "Search a growing library of AI skills. Describe what you're trying to accomplish, and we'll find the best skill for the job or help you create a new one.";

// Plain-English definition of a "skill" for first-time users, shown in the hero.
const SKILL_DEFINITION =
  "A skill is a reusable AI workflow that helps you complete a specific task like summarizing meetings, drafting documents, analyzing feedback, or creating project plans. Search for what you want to accomplish, and we'll find the right skill for you.";

// Small circular info icon + tooltip that explains what a "skill" means. Opens
// on hover and on click/focus (keyboard + touch friendly), and is announced to
// screen readers via its aria-label.
function SkillInfo() {
  const [open, setOpen] = useState(false);
  return (
    <span className="discover__info">
      <button
        type="button"
        className="discover__info-btn"
        aria-label="What is a skill?"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
      >
        <InfoIcon size={16} />
      </button>
      <span className={`discover__info-pop${open ? " is-open" : ""}`} role="tooltip">
        {SKILL_DEFINITION}
      </span>
    </span>
  );
}

// The AI judges fit in words, not a misleading similarity number.
function confidenceLabel(c) {
  if (c === "high") return "Strong match";
  if (c === "medium") return "Might be a fit";
  return "A stretch";
}

// Chat survives navigating away (e.g. to create a skill) and back, within the
// browser session, so a conversation is never lost mid-flow.
const CHAT_KEY = "discover.chat";
const NEED_KEY = "discover.need";

function loadChat() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAT_KEY)) || [];
  } catch {
    return [];
  }
}

function Discover({ onAddSkills, onEditSkill, onBrowse, userId }) {
  // The chat. Each message: { role, content, skill?, confidence?, suggestCreate?, error? }
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // The agent's clean one-line summary of the specific need — carried into Add
  // Skill so the draft starts from a tidy description, not the raw transcript.
  const [latestNeed, setLatestNeed] = useState(
    () => sessionStorage.getItem(NEED_KEY) || ""
  );
  // A skill opened as a modal OVER the chat — so the conversation is never lost.
  const [previewId, setPreviewId] = useState(null);
  // The escape-hatch button's dynamic lead-in (see the effect below). Empty at
  // first so the button starts as just "Create a new skill →".
  const [createHint, setCreateHint] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const requestControllerRef = useRef(null);
  // Skips the newest-message auto-scroll on the very first render so landing on
  // /home (fresh login or refresh) stays at the top instead of jumping down.
  const didMountRef = useRef(false);

  // Keep the newest message in view as the conversation grows — but not on the
  // initial mount, which would scroll the page to the bottom on load.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // On first open, start at the top and put the cursor in the search bar so it's
  // ready to type into. preventScroll keeps focusing the (low-on-page) input
  // from yanking the window down. autoFocus alone can be unreliable across renders.
  useEffect(() => {
    window.scrollTo(0, 0);
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => () => requestControllerRef.current?.abort(), []);

  // Persist the conversation (and the clean need) for this browser session.
  useEffect(() => {
    sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  }, [messages]);
  useEffect(() => {
    sessionStorage.setItem(NEED_KEY, latestNeed);
  }, [latestNeed]);

  // Send a message and get the guide's reply (with a recommended skill, maybe).
  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const history = [...messages, { role: "user", content }];
    setMessages(history);
    setInput("");
    setLoading(true);
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      // Send the whole conversation so the guide keeps full context.
      const convo = history.map((m) => ({ role: m.role, content: m.content }));
      const data = await discoverSkill(convo, controller.signal);
      if (data.need) setLatestNeed(data.need);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Here's what I found.",
          skill: data.best || null,
          confidence: data.confidence,
          suggestCreate: Boolean(data.suggest_create),
        },
      ]);
    } catch (error) {
      if (error.name === "AbortError") return;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't reach the discovery service — is the backend running?",
          error: true,
        },
      ]);
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setLoading(false);
      }
    }
  }

  function stopResponse() {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    setLoading(false);
    inputRef.current?.focus();
  }

  const started = messages.length > 0;

  // Clear the whole conversation and its saved session state — the "start over"
  // reset the leave guard runs when the user confirms leaving mid-chat.
  const resetConversation = () => {
    setMessages([]);
    setInput("");
    setLatestNeed("");
    setPreviewId(null);
    setCreateHint("");
    sessionStorage.removeItem(CHAT_KEY);
    sessionStorage.removeItem(NEED_KEY);
  };

  // While a conversation is in progress, any navigation home first confirms via
  // the shared modal (keyed by DISCOVER_CONVERSATION). When there's no
  // conversation yet, isActive is false and home navigation passes straight
  // through with no prompt.
  useLeaveGuard(ABANDON_INTENTS.DISCOVER_CONVERSATION, started, resetConversation);

  // The wording the escape-hatch button *should* show, given how the search is
  // going. Escalates by how many distinct skills have been surfaced; if none
  // have after a few turns, it nudges instead. Empty = no lead-in yet.
  const createHintTarget = (() => {
    const distinctSkills = new Set(
      messages.filter((m) => m.skill).map((m) => m.skill.id)
    ).size;
    const userTurns = messages.filter((m) => m.role === "user").length;
    if (distinctSkills > 1) return "None of these fit? ";
    if (distinctSkills === 1) return "Not a good fit? ";
    if (userTurns >= 2) return "Not finding it? ";
    return "";
  })();

  // Apply the lead-in on a short delay so it eases in a beat after the
  // conversation moves, rather than snapping in the instant a message lands.
  // When the target is "" (e.g. conversation cleared) it eases back out too.
  useEffect(() => {
    const timer = setTimeout(() => setCreateHint(createHintTarget), 2500);
    return () => clearTimeout(timer);
  }, [createHintTarget]);

  // A one-line summary of what the person was looking for — carried into Add
  // Skill so the draft starts from their actual need, not a blank box.
  const userNeed = () =>
    messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(". ");

  // Prefer the agent's clean summary of the need; fall back to the raw turns
  // only if the agent hasn't distilled one yet.
  const createSeed = () => latestNeed || userNeed();

  return (
    <div className={`discover${started ? "" : " discover--intro"}`}>
      <div className="discover__chat">
        {/* Empty state: a warm greeting + one-click starters. */}
        {!started && (
          <div className="discover__greeting">
            <h1 className="discover__headline">
              Find the Right Skill
              <SkillInfo />
            </h1>
            <p className="discover__sub">{GREETING}</p>
          </div>
        )}

        {/* The conversation. */}
        {messages.map((m, i) => (
          <div key={i} className={`discover__msg discover__msg--${m.role}`}>
            <div
              className={`discover__bubble${
                m.error ? " discover__bubble--error" : ""
              }`}
            >
              <p className="discover__bubble-text">{m.content}</p>

              {/* When the guide names a skill, show it as a card in-line. */}
              {m.skill && (
                <div className="discover__skillcard">
                  <div className="discover__skillcard-top">
                    <span className="discover__skillcard-name">
                      {m.skill.name || m.skill.id}
                    </span>
                    {m.confidence && (
                      <span
                        className={`discover__conf discover__conf--${m.confidence}`}
                      >
                        {confidenceLabel(m.confidence)}
                      </span>
                    )}
                  </div>
                  <button
                    className="discover__use"
                    onClick={() => setPreviewId(m.skill.id)}
                  >
                    Open this skill <ArrowRightIcon size={14} />
                  </button>
                </div>
              )}

              {/* Nothing fit — a clear, breathable call to create it. */}
              {m.suggestCreate && !m.skill && (
                <div className="discover__create-cta">
                  <button
                    className="discover__create-btn"
                    onClick={() => onAddSkills?.(createSeed())}
                  >
                    <PlusIcon size={16} /> Create this skill
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* The guide is thinking. */}
        {loading && (
          <div className="discover__msg discover__msg--assistant">
            <div className="discover__bubble discover__bubble--thinking">
              <span className="discover__thinking-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Composer, pinned at the bottom — always ready for the next message. */}
      <form
        className="discover__composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          className="discover__composer-input"
          ref={inputRef}
          placeholder={
            started ? "Reply…" : "What are you trying to accomplish?"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Message the discovery guide"
        />
        <button
          className={`discover__send${loading ? " discover__send--stop" : ""}`}
          type={loading ? "button" : "submit"}
          onClick={loading ? stopResponse : undefined}
          disabled={!loading && !input.trim()}
          aria-label={loading ? "Stop response" : started ? "Send" : "Search"}
        >
          {loading ? <StopIcon size={18} /> : started ? <PaperAirplaneIcon size={18} /> : <SearchIcon size={18} />}
        </button>
      </form>

      {/* Suggested starter prompts, shown directly beneath the search bar. */}
      {!started && (
        <div className="discover__starters">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              className="discover__chip"
              onClick={() => send(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Three clear entry points on the home page: search (above), browse the
          library, or jump straight into creating a new skill. */}
      {!started && (
        <div className="discover__cta-row">
          <button
            type="button"
            className="discover__cta discover__cta--secondary"
            onClick={() => onBrowse?.()}
          >
            <SearchIcon size={16} /> Browse Skills
          </button>
          <button
            type="button"
            className="discover__cta discover__cta--primary"
            onClick={() => onAddSkills?.()}
          >
            <PlusIcon size={16} /> Create Skill
          </button>
        </div>
      )}

      {/* An escape hatch that never leaves them stuck. The lead-in escalates as
          the conversation goes (see createHint), starting as just the base label. */}
      {started && (
        <button
          className="discover__create-link"
          onClick={() => onAddSkills?.(createSeed())}
        >
          {createHint}Create a new skill →
        </button>
      )}

      {/* Skill preview modal — opens over the chat so the conversation stays put. */}
      {previewId && (
        <div className="discover__modal" onClick={() => setPreviewId(null)}>
          <div
            className="discover__modal-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="discover__modal-close"
              onClick={() => setPreviewId(null)}
              aria-label="Close"
            >
              <XIcon size={18} />
            </button>
            <SkillDetail
              skillId={previewId}
              onBack={() => setPreviewId(null)}
              onEdit={onEditSkill}
              userId={userId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Discover;
