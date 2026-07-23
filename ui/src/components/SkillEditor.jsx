import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  SparkleFillIcon,
  CheckIcon,
} from "@primer/octicons-react";
import { editSkill, saveSkill } from "../api";
import "./SkillEditor.css";

// A short blockquote we drop at the top of a fork's body so the lineage is
// visible right in the skill. Kept simple and markdown-native.
function copiedFromNote(sourceId) {
  return `> _Copied from \`${sourceId}\`._\n\n`;
}

// Build the working copy the editor starts from. A fork gets a "(copy)" name, a
// derived id, and the lineage note prepended; a fresh draft is used as-is.
function initialWorkingSkill(skill, mode) {
  const base = {
    id: skill?.id || "",
    name: skill?.name || "",
    description: skill?.description || "",
    body: skill?.body || "",
  };
  if (mode !== "fork") return base;
  return {
    ...base,
    id: base.id ? `${base.id}-copy` : "",
    name: base.name ? `${base.name} (copy)` : "",
    body: copiedFromNote(skill?.id || "unknown") + base.body,
    forked_from: skill?.id || "",
  };
}

// A couple of one-click instructions to make the side agent feel alive.
const AGENT_STARTERS = [
  "Make the workflow steps tighter",
  "Add a concrete real-world example",
  "Fix the grammar and tighten the wording",
];

function SkillEditor({
  initialSkill,
  mode = "new",
  userId,
  profile,
  onRequireProfile,
  onBack,
}) {
  const [skill, setSkill] = useState(() => initialWorkingSkill(initialSkill, mode));
  const [bodyPreview, setBodyPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [error, setError] = useState(null);

  // --- Side agent (the "editor vibe" AI assistant) ---------------------------
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentInput, setAgentInput] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const agentEndRef = useRef(null);

  const isFork = mode === "fork";

  // Keep the agent transcript pinned to the latest message.
  useEffect(() => {
    agentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages, agentBusy]);

  function updateField(field, value) {
    setSkill((prev) => ({ ...prev, [field]: value }));
  }

  // --- Ask the side agent to apply one change, then auto-apply the result -----
  async function runAgent(instruction) {
    const text = (instruction || "").trim();
    if (!text || agentBusy) return;

    setAgentMessages((prev) => [...prev, { role: "user", content: text }]);
    setAgentInput("");
    setAgentBusy(true);
    setError(null);

    // A little conversational memory: the turns so far.
    const history = agentMessages.slice(-6);
    try {
      const updated = await editSkill(skill, text, history, userId);
      setSkill((prev) => ({
        ...prev,
        name: updated.name,
        description: updated.description,
        body: updated.body,
      }));
      setAgentMessages((prev) => [
        ...prev,
        { role: "assistant", content: updated.note || "Done — applied your change." },
      ]);
    } catch (err) {
      setAgentMessages((prev) => [
        ...prev,
        { role: "assistant", content: `I couldn't apply that: ${err.message}` },
      ]);
    } finally {
      setAgentBusy(false);
    }
  }

  function handleAgentSubmit(e) {
    e.preventDefault();
    runAgent(agentInput);
  }

  // --- Save: publish a new skill (edits always fork, never overwrite) ---------
  async function handleSave() {
    // Same gate as Add Skill: you must have decided whether you're contactable.
    if (!profile || profile.contactable === null || profile.contactable === undefined) {
      onRequireProfile?.(
        "Before saving a skill, please choose whether you'd like to be contacted."
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // No duplicate check here: a fork is an intentional copy, and a fresh
      // draft was already checked upstream. The backend auto-numbers the id.
      const saved = await saveSkill(skill, userId);
      setSavedId(saved.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (savedId) {
    return (
      <div className="skill-editor">
        <div className="skill-editor__saved">
          <CheckIcon size={28} />
          <h2>Saved</h2>
          <p>
            Your skill was published as <strong>{savedId}</strong> and is now
            searchable.
          </p>
          <button className="skill-editor__btn" type="button" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="skill-editor">
      <div className="skill-editor__topbar">
        <button className="skill-editor__back" type="button" onClick={onBack}>
          <ArrowLeftIcon size={16} />
          <span>Back</span>
        </button>
        <h1 className="skill-editor__title">
          {isFork ? "Edit skill" : "Skill editor"}
        </h1>
        <button
          className="skill-editor__save"
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : isFork ? "Save as new skill" : "Save skill"}
        </button>
      </div>

      {isFork && (
        <div className="skill-editor__notice">
          Editing creates a <strong>copy</strong>. Saving publishes a new skill and
          leaves the original untouched — the copy links back to it.
        </div>
      )}

      {error && <div className="skill-editor__error">{error}</div>}

      <div className="skill-editor__grid">
        {/* ── LEFT: the editor ── */}
        <section className="skill-editor__pane skill-editor__pane--edit">
          <label className="skill-editor__field">
            <span className="skill-editor__label">ID</span>
            <input
              className="skill-editor__input"
              value={skill.id}
              onChange={(e) => updateField("id", e.target.value)}
            />
            <span className="skill-editor__hint">
              Lowercase letters, numbers, and hyphens. If it&apos;s taken, a number
              is added automatically — you can&apos;t overwrite an existing skill.
            </span>
          </label>

          <label className="skill-editor__field">
            <span className="skill-editor__label">Name</span>
            <input
              className="skill-editor__input"
              value={skill.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </label>

          <label className="skill-editor__field">
            <span className="skill-editor__label">Description</span>
            <textarea
              className="skill-editor__textarea"
              rows={2}
              value={skill.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </label>

          <div className="skill-editor__field">
            <div className="skill-editor__field-header">
              <span className="skill-editor__label">Body (markdown)</span>
              <div className="skill-editor__toggle">
                <button
                  type="button"
                  className={`skill-editor__toggle-btn${!bodyPreview ? " is-active" : ""}`}
                  onClick={() => setBodyPreview(false)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`skill-editor__toggle-btn${bodyPreview ? " is-active" : ""}`}
                  onClick={() => setBodyPreview(true)}
                >
                  Preview
                </button>
              </div>
            </div>
            {bodyPreview ? (
              <div className="skill-editor__preview markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {skill.body || "_Nothing to preview yet._"}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                className="skill-editor__code"
                rows={22}
                value={skill.body}
                onChange={(e) => updateField("body", e.target.value)}
                spellCheck={false}
              />
            )}
          </div>
        </section>

        {/* ── RIGHT: the AI side agent ── */}
        <aside className="skill-editor__pane skill-editor__pane--agent">
          <div className="skill-editor__agent-header">
            <SparkleFillIcon size={16} />
            <span>Editing assistant</span>
          </div>

          <div className="skill-editor__agent-chat">
            {agentMessages.length === 0 && !agentBusy && (
              <div className="skill-editor__agent-empty">
                <p>Tell me how to change this skill and I&apos;ll edit it for you.</p>
                <div className="skill-editor__agent-starters">
                  {AGENT_STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="skill-editor__agent-chip"
                      onClick={() => runAgent(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {agentMessages.map((m, i) => (
              <div
                key={i}
                className={`skill-editor__agent-msg skill-editor__agent-msg--${m.role}`}
              >
                {m.content}
              </div>
            ))}

            {agentBusy && (
              <div className="skill-editor__agent-msg skill-editor__agent-msg--assistant skill-editor__agent-msg--typing">
                Editing…
              </div>
            )}
            <div ref={agentEndRef} />
          </div>

          <form className="skill-editor__agent-form" onSubmit={handleAgentSubmit}>
            <input
              className="skill-editor__agent-input"
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              placeholder="e.g. add a section on common mistakes"
              aria-label="Tell the assistant how to edit this skill"
              disabled={agentBusy}
            />
            <button
              className="skill-editor__agent-send"
              type="submit"
              disabled={agentBusy || !agentInput.trim()}
              aria-label="Send"
            >
              <PaperAirplaneIcon size={16} />
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

export default SkillEditor;
