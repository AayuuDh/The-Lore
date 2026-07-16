import { useState, useRef, useEffect } from "react";
import { ArrowRightIcon, SearchIcon, InfoIcon, PlusIcon, XIcon } from "@primer/octicons-react";
import { discoverSkill } from "../api";
import SkillDetail from "./SkillDetail";
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
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // On first open, put the cursor in the search bar so it's ready to type into —
  // no need to click it first. autoFocus alone can be unreliable across renders.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

    try {
      // Send the whole conversation so the guide keeps full context.
      const convo = history.map((m) => ({ role: m.role, content: m.content }));
      const data = await discoverSkill(convo);
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
    } catch {
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
      setLoading(false);
    }
  }

  const started = messages.length > 0;

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
          autoFocus
        />
        <button
          className="discover__send"
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Search"
        >
          <SearchIcon size={18} />
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

      {/* An escape hatch that never leaves them stuck. */}
      {started && (
        <button
          className="discover__create-link"
          onClick={() => onAddSkills?.(createSeed())}
        >
          None of these fit? Create a new skill →
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
