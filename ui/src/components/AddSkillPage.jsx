import { useState } from "react";
import { PlusIcon, ArrowLeftIcon } from "@primer/octicons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { draftSkill, refineSkill, saveSkill, matchSkills } from "../api";
import "./AddSkillPage.css";

// If an existing skill scores at/above this cosine similarity, treat it as a
// near-duplicate. This embedding model scores even an exact phrase match at
// ~0.69, so the threshold is deliberately low.
const SIMILAR_THRESHOLD = 0.55;

// Lowercase, strip punctuation to spaces, collapse whitespace so that
// "Summarize Meeting Notes", "summarize meeting notes" and
// "summarize-meeting-notes" all compare equal.
function normalize(s = "") {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function tokenSet(s = "") {
  return new Set(normalize(s).split(" ").filter(Boolean));
}

function isSubset(a, b) {
  if (a.size === 0) return false;
  for (const t of a) if (!b.has(t)) return false;
  return true;
}

// Given the drafted skill and ranked matches, find an existing near-duplicate.
// Returns { skill, kind: "exact" | "similar", score } or null.
function findDuplicate(draft, ranked) {
  const nameNorm = normalize(draft.name);
  const idNorm = normalize(draft.id);
  const nameTokens = tokenSet(draft.name);

  for (const r of ranked) {
    if (normalize(r.skill.name) === nameNorm || normalize(r.skill.id) === idNorm) {
      return { skill: r.skill, kind: "exact", score: r.score };
    }
  }
  for (const r of ranked) {
    const t = tokenSet(r.skill.name);
    if (isSubset(nameTokens, t) || isSubset(t, nameTokens)) {
      return { skill: r.skill, kind: "similar", score: r.score };
    }
  }
  const top = ranked[0];
  if (top && top.score >= SIMILAR_THRESHOLD) {
    return { skill: top.skill, kind: "similar", score: top.score };
  }
  return null;
}

// The very first step: one box where the user types a plain-English description.
function StartForm({ value, onChange, onSubmit, loading, busyLabel = "Working..." }) {
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
        {loading ? busyLabel : "Start"}
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
  const [duplicate, setDuplicate] = useState(null);     // near-duplicate found before saving
  const [checkingDup, setCheckingDup] = useState(false); // running the duplicate check?
  const [preDup, setPreDup] = useState(null);           // near-duplicate found from the description
  const [startChecking, setStartChecking] = useState(false); // checking before drafting?

  // --- Draft: turn the plain-English description into a first draft ----------
  async function runDraft() {
    setLoading(true);
    setError(null);
    try {
      const res = await draftSkill(description);
      setSessionId(res.session_id);   // remember who we're talking to
      setSkill(res.skill);            // show the draft in the editable boxes
      setPreDup(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Turn 1: description -> duplicate check, then first draft ---------------
  async function handleStart(e) {
    e.preventDefault();
    if (!description.trim()) return;
    // Before drafting, check whether the user is describing a skill that already
    // exists. Their own words are the strongest signal, so we match on those.
    setStartChecking(true);
    setError(null);
    try {
      const ranked = await matchSkills(description, 8);
      const dup = findDuplicate({ name: description, id: "" }, ranked);
      if (dup) {
        setPreDup(dup);
        setStartChecking(false);
        return; // warn first; the user can still "Draft anyway"
      }
    } catch {
      // If the check fails, don't block drafting.
    } finally {
      setStartChecking(false);
    }
    await runDraft();
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
      setDuplicate(null);      // new draft -> re-check duplicates on next save
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Hand-edit: update one field of the draft locally (no AI) ---------------
  function updateField(field, value) {
    setSkill((prev) => ({ ...prev, [field]: value }));
    setDuplicate(null); // any edit invalidates a previous duplicate check
  }

  // --- Duplicate check: search the catalog before saving a possible repeat ----
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
    // If the user already acknowledged the duplicate, skip straight to saving.
    if (!duplicate) {
      setCheckingDup(true);
      setError(null);
      try {
        const query = `${skill.name} ${skill.description}`.trim();
        const ranked = await matchSkills(query, 8);
        const dup = findDuplicate(skill, ranked);
        if (dup) {
          setDuplicate(dup);
          setCheckingDup(false);
          return; // pause and let the user confirm before saving a repeat
        }
      } catch {
        // Don't block saving just because the check failed; fall through to save.
      } finally {
        setCheckingDup(false);
      }
    }
    await persistSkill();
  }

  // --- Save: persist the approved skill --------------------------------------
  async function persistSkill() {
    setLoading(true);
    setError(null);
    try {
      const saved = await saveSkill(skill, userId);
      setSavedId(saved.id);   // backend may have auto-suffixed the id; trust its answer
      setDuplicate(null);
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
    setDuplicate(null);
    setPreDup(null);
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

              {duplicate && (
                <div className="add-skill-page__dup" role="alert">
                  <p className="add-skill-page__dup-title">
                    {duplicate.kind === "exact"
                      ? "A skill with this name already exists"
                      : "A very similar skill already exists"}
                    {typeof duplicate.score === "number" &&
                      ` — “${duplicate.skill.name}” (${Math.round(duplicate.score * 100)}% match)`}
                  </p>
                  {duplicate.skill.description && (
                    <p className="add-skill-page__dup-desc">{duplicate.skill.description}</p>
                  )}
                  <p className="add-skill-page__dup-hint">
                    Saving will add a separate skill (the id is auto-numbered). Refine yours to be
                    distinct, or save anyway if it&apos;s genuinely different.
                  </p>
                </div>
              )}

              <div className="add-skill-page__actions">
                {duplicate ? (
                  <>
                    <button
                      className="add-skill-page__ghost-btn"
                      type="button"
                      onClick={() => setDuplicate(null)}
                      disabled={loading}
                    >
                      Keep editing
                    </button>
                    <button
                      className="add-skill-page__save-btn"
                      type="button"
                      onClick={persistSkill}
                      disabled={loading}
                    >
                      {loading ? "Saving..." : "Save anyway"}
                    </button>
                  </>
                ) : (
                  <button
                    className="add-skill-page__save-btn"
                    type="button"
                    onClick={handleSave}
                    disabled={loading || checkingDup}
                  >
                    {checkingDup ? "Checking for duplicates..." : loading ? "Saving..." : "Save skill"}
                  </button>
                )}
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
                onChange={(v) => {
                  setDescription(v);
                  if (preDup) setPreDup(null);
                }}
                onSubmit={handleStart}
                loading={loading || startChecking}
                busyLabel={startChecking ? "Checking..." : "Drafting..."}
              />

              {preDup && (
                <div className="add-skill-page__dup" role="alert">
                  <p className="add-skill-page__dup-title">
                    {preDup.kind === "exact"
                      ? "This skill already exists"
                      : "A very similar skill already exists"}
                    {` — “${preDup.skill.name}”`}
                    {typeof preDup.score === "number" &&
                      ` (${Math.round(preDup.score * 100)}% match)`}
                  </p>
                  {preDup.skill.description && (
                    <p className="add-skill-page__dup-desc">{preDup.skill.description}</p>
                  )}
                  <p className="add-skill-page__dup-hint">
                    You can use the existing skill instead, or draft a new one anyway if what you
                    need is genuinely different.
                  </p>
                  <div className="add-skill-page__actions">
                    <button
                      className="add-skill-page__ghost-btn"
                      type="button"
                      onClick={() => setPreDup(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="add-skill-page__save-btn"
                      type="button"
                      onClick={runDraft}
                      disabled={loading}
                    >
                      {loading ? "Drafting..." : "Draft anyway"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AddSkillPage;