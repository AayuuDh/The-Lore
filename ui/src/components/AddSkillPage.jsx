import { useState } from "react";
import { PlusIcon, ArrowLeftIcon } from "@primer/octicons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { draftSkill, refineSkill, saveSkill } from "../api";
import "./AddSkillPage.css";

// The very first step: one box where the user types a plain-English description.
function StartForm({ value, onChange, onSubmit, loading }) {
  return (
    <form className="add-skill-page__input-row" onSubmit={onSubmit}>
      <input
        className="add-skill-page__input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. summarize a long meeting transcript into action items"
        aria-label="Describe the skill you want"
        disabled={loading}
      />
      <button className="add-skill-page__start-btn" type="submit" disabled={loading}>
        {loading ? "Drafting..." : "Start"}
      </button>
    </form>
  );
}

function AddSkillPage({ onBackHome, userId, profile, onRequireProfile }) {
  // --- State: the moving parts of this screen --------------------------------
  const [description, setDescription] = useState("");   // the first plain-English line
  const [sessionId, setSessionId] = useState(null);     // conversation handle for the AI
  const [skill, setSkill] = useState(null);             // the current draft { id, name, description, body }
  const [refineText, setRefineText] = useState("");     // the "ask AI to change it" box
  const [loading, setLoading] = useState(false);        // are we waiting on the backend?
  const [savedId, setSavedId] = useState(null);         // set once the skill is saved
  const [error, setError] = useState(null);             // any error message to show
  const [bodyPreview, setBodyPreview] = useState(false); // show rendered markdown vs raw editor

  // --- Turn 1: description -> first draft ------------------------------------
  async function handleStart(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await draftSkill(description);
      setSessionId(res.session_id);   // remember who we're talking to
      setSkill(res.skill);            // show the draft in the editable boxes
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Turn 2+: ask the AI to change the current draft -----------------------
  async function handleRefine(e) {
    e.preventDefault();
    if (!refineText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await refineSkill(sessionId, refineText);
      setSkill(res.skill);     // replace the boxes with the updated draft
      setRefineText("");       // clear the chat box
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Hand-edit: update one field of the draft locally (no AI) ---------------
  function updateField(field, value) {
    setSkill((prev) => ({ ...prev, [field]: value }));
  }

  // --- Save: persist the approved skill --------------------------------------
  async function handleSave() {
    // Gate: you can only publish a skill once your profile is complete enough.
    // The username is auto-generated, but the "may we contact you?" choice must
    // be made first. If it hasn't been, send the user to the profile page.
    if (!profile || profile.contactable === null || profile.contactable === undefined) {
      onRequireProfile(
        "Before adding a skill, please choose whether you'd like to be contacted."
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const saved = await saveSkill(skill, userId);
      setSavedId(saved.id);   // backend may have auto-suffixed the id; trust its answer
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Start over for another skill ------------------------------------------
  function handleReset() {
    setDescription("");
    setSessionId(null);
    setSkill(null);
    setRefineText("");
    setSavedId(null);
    setError(null);
  }

  return (
    <div className="add-skill-page">
      <aside className="add-skill-page__sidebar">
        <div className="add-skill-page__sidebar-header">
          <span className="add-skill-page__sidebar-title">My Skills</span>
          <button className="add-skill-page__plus-btn" type="button" aria-label="Add skill" onClick={handleReset}>
            <PlusIcon size={18} />
          </button>
        </div>
        <div className="add-skill-page__sidebar-empty">Skills you add will appear here</div>
      </aside>

      <main className="add-skill-page__main">
        <button className="add-skill-page__back" onClick={onBackHome}>
          <ArrowLeftIcon size={16} />
          <span>Back to Home</span>
        </button>

        <section className="add-skill-page__hero">
          <p className="add-skill-page__eyebrow">Skill builder</p>
          <h1 className="add-skill-page__title">Add a Skill</h1>
          <p className="add-skill-page__subtitle">
            Describe a skill and I&apos;ll draft it. You can refine it with AI or edit it yourself.
          </p>

          {error && <div className="add-skill-page__error">{error}</div>}

          {/* CASE 1: just saved -> show a confirmation */}
          {savedId ? (
            <div className="add-skill-page__card">
              <h2 className="add-skill-page__question">Saved!</h2>
              <p className="add-skill-page__helptext">
                Your skill was saved as <strong>{savedId}</strong> and is now searchable.
              </p>
              <button className="add-skill-page__save-btn" type="button" onClick={handleReset}>
                Add another skill
              </button>
            </div>
          ) : skill ? (
            /* CASE 2: we have a draft -> editable boxes + refine + save */
            <div className="add-skill-page__card add-skill-page__card--editor">
              <label className="add-skill-page__field">
                <span className="add-skill-page__label">ID</span>
                <input
                  className="add-skill-page__text-input"
                  value={skill.id}
                  onChange={(e) => updateField("id", e.target.value)}
                />
                <span className="add-skill-page__hint">
                  Lowercase letters, numbers, and hyphens. If this id is already taken, a
                  number is added automatically &mdash; you can&apos;t overwrite an existing skill.
                </span>
              </label>

              <label className="add-skill-page__field">
                <span className="add-skill-page__label">Name</span>
                <input
                  className="add-skill-page__text-input"
                  value={skill.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </label>

              <label className="add-skill-page__field">
                <span className="add-skill-page__label">Description</span>
                <textarea
                  className="add-skill-page__textarea"
                  rows={3}
                  value={skill.description}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </label>

              <div className="add-skill-page__field">
                <div className="add-skill-page__field-header">
                  <span className="add-skill-page__label">Body (markdown)</span>
                  <div className="add-skill-page__toggle">
                    <button
                      type="button"
                      className={`add-skill-page__toggle-btn ${!bodyPreview ? "add-skill-page__toggle-btn--active" : ""}`}
                      onClick={() => setBodyPreview(false)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`add-skill-page__toggle-btn ${bodyPreview ? "add-skill-page__toggle-btn--active" : ""}`}
                      onClick={() => setBodyPreview(true)}
                    >
                      Preview
                    </button>
                  </div>
                </div>
                {bodyPreview ? (
                  <div className="add-skill-page__preview">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {skill.body || "_Nothing to preview yet._"}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    className="add-skill-page__textarea"
                    rows={12}
                    value={skill.body}
                    onChange={(e) => updateField("body", e.target.value)}
                  />
                )}
              </div>

              {/* Ask the AI to change the draft */}
              <form className="add-skill-page__refine-row" onSubmit={handleRefine}>
                <input
                  className="add-skill-page__input"
                  value={refineText}
                  onChange={(e) => setRefineText(e.target.value)}
                  placeholder="Ask AI to change it, e.g. 'add a Python example'"
                  disabled={loading}
                />
                <button className="add-skill-page__start-btn" type="submit" disabled={loading}>
                  {loading ? "Working..." : "Refine"}
                </button>
              </form>

              <div className="add-skill-page__actions">
                <button className="add-skill-page__save-btn" type="button" onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save skill"}
                </button>
              </div>
            </div>
          ) : (
            /* CASE 3: nothing yet -> the starting description box */
            <div className="add-skill-page__card">
              <h2 className="add-skill-page__question">What skill would you like to add?</h2>
              <p className="add-skill-page__helptext">
                Describe it in plain English. I&apos;ll draft a full skill you can then edit or refine.
              </p>
              <StartForm
                value={description}
                onChange={setDescription}
                onSubmit={handleStart}
                loading={loading}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AddSkillPage;