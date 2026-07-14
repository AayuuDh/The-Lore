import { useState, useRef, useEffect } from "react";
import { ArrowRightIcon, PaperAirplaneIcon, PlusIcon, XIcon } from "@primer/octicons-react";
import { discoverSkill } from "../api";
import SkillDetail from "./SkillDetail";
import "./Discover.css";

// Starter prompts so the first message is one click away — no blank-page stare.
const STARTERS = [
  "Summarize a meeting into action items",
  "Review my code for bugs",
  "Draft a professional email",
  "Turn notes into a project plan",
];

const GREETING =
  "Hey! Tell me what you're trying to get done — in your own words — and I'll find the skill that fits (or help you make one).";

// The AI judges fit in words, not a misleading similarity number.
function confidenceLabel(c) {
  if (c === "high") return "Strong match";
  if (c === "medium") return "Might be a fit";
  return "A stretch";
}

function Discover({ onAddSkills }) {
  // The chat. Each message: { role: "user"|"assistant", content, skill?, confidence?, error? }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // A skill opened as a modal OVER the chat — so the conversation is never lost.
  const [previewId, setPreviewId] = useState(null);
  const endRef = useRef(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

  return (
    <div className="discover">
      <div className="discover__chat">
        {/* Empty state: a warm greeting + one-click starters. */}
        {!started && (
          <div className="discover__greeting">
            <h1 className="discover__headline">The Skills You Need</h1>
            <p className="discover__sub">{GREETING}</p>
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
                    onClick={() => onAddSkills?.(userNeed())}
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
          placeholder={
            started ? "Reply…" : "e.g. summarize a meeting into action items"
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
          aria-label="Send"
        >
          <PaperAirplaneIcon size={18} />
        </button>
      </form>

      {/* An escape hatch that never leaves them stuck. */}
      {started && (
        <button
          className="discover__create-link"
          onClick={() => onAddSkills?.(userNeed())}
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
            <SkillDetail skillId={previewId} onBack={() => setPreviewId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Discover;
