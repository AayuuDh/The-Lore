import { useEffect, useRef, useState } from "react";
import { PlusIcon, ArrowLeftIcon } from "@primer/octicons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { draftSkill, refineSkill, saveSkill, matchSkills, getMySkills } from "../api";
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

// Given ranked matches, return the strongest one that looks like a
// near-duplicate ({ skill, score }), or null. Intentionally lightweight: we use
// this both for the non-blocking nudge and the pre-save check.
function findSimilar(ranked) {
  const top = ranked && ranked[0];
  if (top && top.score >= SIMILAR_THRESHOLD) {
    return { skill: top.skill, score: top.score };
  }
  return null;
}

function AddSkillPage({ onBackHome, userId, profile, onRequireProfile, initialDescription = "", onGoToEditor, onOpenSkill }) {
  // --- State: the moving parts of this screen --------------------------------
  const [input, setInput] = useState("");               // the chat box
  const [sessionId, setSessionId] = useState(null);     // conversation handle for the AI
  const [messages, setMessages] = useState([]);         // the interview transcript
  const [skill, setSkill] = useState(null);             // the current draft, once the AI produces one
  const [loading, setLoading] = useState(false);        // waiting on the AI?
  const [savedId, setSavedId] = useState(null);         // set once the skill is saved
  const [error, setError] = useState(null);             // any error message to show
  const [bodyPreview, setBodyPreview] = useState(true); // show rendered markdown vs raw editor
  const [duplicate, setDuplicate] = useState(null);     // near-duplicate found before saving
  const [checkingDup, setCheckingDup] = useState(false); // running the pre-save duplicate check?
  const [similar, setSimilar] = useState(null);         // non-blocking "may already exist" nudge

  const transcriptRef = useRef(null);
  const started = messages.length > 0 || sessionId !== null;

  // Keep the transcript scrolled to the latest message.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, skill]);

  function pushMessage(role, text) {
    setMessages((prev) => [...prev, { role, text }]);
  }

  // --- Non-blocking nudge: does a similar skill already exist? ----------------
  // Runs once, on the first user message. Never blocks the interview — it just
  // surfaces an "already exists?" banner the user can ignore.
  async function checkSimilar(text) {
    try {
      const ranked = await matchSkills(text, 8);
      setSimilar(findSimilar(ranked));
    } catch {
      // A failed check shouldn't get in the way of the conversation.
    }
  }

  // --- Send one turn: opens the interview, or answers/refines afterwards ------
  async function sendTurn(rawText) {
    const text = (rawText || "").trim();
    if (!text || loading) return;

    const firstTurn = !sessionId;
    pushMessage("user", text);
    setInput("");
    setLoading(true);
    setError(null);
    setDuplicate(null); // any new turn invalidates a prior pre-save check

    // On the opening turn, check for an existing similar skill in parallel.
    if (firstTurn) checkSimilar(text);

    try {
      const res = firstTurn
        ? await draftSkill(text)
        : await refineSkill(sessionId, text);
      setSessionId(res.session_id);

      if (res.type === "draft" && res.skill) {
        // Draft is ready — hand straight off to the full editor. It's a cleaner
        // surface than an inline panel, and its AI side-agent takes it from here.
        if (onGoToEditor) {
          onGoToEditor(res.skill);
          return;
        }
        setSkill(res.skill);
        pushMessage(
          "assistant",
          "I've drafted your skill from what you told me. Review and edit it below, keep refining it here, or save it when it looks right."
        );
      } else {
        pushMessage("assistant", res.message || "Could you tell me a bit more?");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    sendTurn(input);
  }

  // If we arrived here from Discover ("Create this skill"), open the interview
  // automatically with the context the user already gave us — no retyping.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    const seed = (initialDescription || "").trim();
    if (seed) {
      seededRef.current = true;
      sendTurn(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDescription]);

  // --- Hand-edit: update one field of the draft locally (no AI) ---------------
  function updateField(field, value) {
    setSkill((prev) => ({ ...prev, [field]: value }));
    setDuplicate(null); // any edit invalidates a previous duplicate check
  }

  // --- Save: search the catalog for a near-duplicate before publishing --------
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
        const dup = findSimilar(ranked);
        // Only warn if it's a strong match to a *different* skill.
        if (dup && normalize(dup.skill.name) !== normalize(skill.name)) {
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
    setInput("");
    setSessionId(null);
    setMessages([]);
    setSkill(null);
    setSavedId(null);
    setError(null);
    setDuplicate(null);
    setSimilar(null);
  }

  // "My Skills" sidebar: the skills this user has authored. Refetched whenever a
  // new skill is saved so the list stays current.
  const [mySkills, setMySkills] = useState([]);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    getMySkills(userId)
      .then((list) => active && setMySkills(Array.isArray(list) ? list : []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, savedId]);

  const placeholder = skill
    ? "Answer, or ask AI to refine — e.g. 'add a real example'"
    : started
    ? "Type your answer…"
    : "e.g. how our team triages incoming support escalations";

  return (
    <div className="add-skill-page">
      <aside className="add-skill-page__sidebar">
        <div className="add-skill-page__sidebar-header">
          <span className="add-skill-page__sidebar-title">My Skills</span>
          <button className="add-skill-page__plus-btn" type="button" aria-label="Add skill" onClick={handleReset}>
            <PlusIcon size={18} />
          </button>
        </div>
        {mySkills.length === 0 ? (
          <div className="add-skill-page__sidebar-empty">Skills you add will appear here</div>
        ) : (
          <ul className="add-skill-page__sidebar-list">
            {mySkills.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="add-skill-page__sidebar-item"
                  onClick={() => onOpenSkill?.(s.id)}
                  title={s.description || s.name}
                >
                  {s.name || s.id}
                </button>
              </li>
            ))}
          </ul>
        )}
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
            I&apos;ll interview you to capture the knowledge behind this skill &mdash; the
            context, tools, and hard-won lessons a generic AI could never guess.
          </p>

          {error && <div className="add-skill-page__error">{error}</div>}

          {savedId ? (
            /* CASE 1: just saved -> show a confirmation */
            <div className="add-skill-page__card">
              <h2 className="add-skill-page__question">Saved!</h2>
              <p className="add-skill-page__helptext">
                Your skill was saved as <strong>{savedId}</strong> and is now searchable.
              </p>
              <button className="add-skill-page__save-btn" type="button" onClick={handleReset}>
                Add another skill
              </button>
            </div>
          ) : (
            /* CASE 2: the interview -> transcript + optional draft editor + input */
            <div className="add-skill-page__card">
              {!started && (
                <>
                  <h2 className="add-skill-page__question">What skill would you like to capture?</h2>
                  <p className="add-skill-page__helptext">
                    Describe it in a sentence to get started. I&apos;ll ask follow-up
                    questions to draw out the details, then draft a full skill profile.
                  </p>
                </>
              )}

              {started && (
                <div className="add-skill-page__transcript" ref={transcriptRef}>
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`add-skill-page__msg add-skill-page__msg--${m.role}`}
                    >
                      <span className="add-skill-page__msg-role">
                        {m.role === "assistant" ? "Interviewer" : "You"}
                      </span>
                      <div className="add-skill-page__msg-text">{m.text}</div>
                    </div>
                  ))}
                  {loading && (
                    <div className="add-skill-page__msg add-skill-page__msg--assistant">
                      <span className="add-skill-page__msg-role">Interviewer</span>
                      <div className="add-skill-page__msg-text add-skill-page__msg-text--typing">
                        Thinking…
                      </div>
                    </div>
                  )}
                </div>
              )}

              {similar && (
                <div className="add-skill-page__dup add-skill-page__dup--info" role="status">
                  <p className="add-skill-page__dup-title">
                    A similar skill may already exist &mdash; &ldquo;{similar.skill.name}&rdquo;
                    {typeof similar.score === "number" &&
                      ` (${Math.round(similar.score * 100)}% match)`}
                  </p>
                  {similar.skill.description && (
                    <p className="add-skill-page__dup-desc">{similar.skill.description}</p>
                  )}
                  <p className="add-skill-page__dup-hint">
                    You can keep going if what you&apos;re capturing is genuinely different, or
                    stop and use the existing one.
                  </p>
                  <div className="add-skill-page__actions">
                    <button
                      className="add-skill-page__ghost-btn"
                      type="button"
                      onClick={() => setSimilar(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* The chat box: opens the interview, answers questions, or refines. */}
              <form className="add-skill-page__input-row" onSubmit={handleSend}>
                <input
                  className="add-skill-page__input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholder}
                  aria-label="Your message to the interviewer"
                  disabled={loading}
                />
                <button className="add-skill-page__start-btn" type="submit" disabled={loading}>
                  {loading ? "Working…" : started ? "Send" : "Start"}
                </button>
              </form>

              {/* Once the AI produces a draft, show the editable profile below. */}
              {skill && (
                <div className="add-skill-page__card add-skill-page__card--editor">
                  <h3 className="add-skill-page__editor-title">Drafted skill profile</h3>

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
                      <span className="add-skill-page__label">Skill profile (markdown)</span>
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
                        rows={16}
                        value={skill.body}
                        onChange={(e) => updateField("body", e.target.value)}
                      />
                    )}
                  </div>

                  {duplicate && (
                    <div className="add-skill-page__dup" role="alert">
                      <p className="add-skill-page__dup-title">
                        A very similar skill already exists
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
                          {loading ? "Saving…" : "Save anyway"}
                        </button>
                      </>
                    ) : (
                      <>
                        {onGoToEditor && (
                          <button
                            className="add-skill-page__ghost-btn"
                            type="button"
                            onClick={() => onGoToEditor(skill)}
                            disabled={loading || checkingDup}
                          >
                            Open in editor
                          </button>
                        )}
                        <button
                          className="add-skill-page__save-btn"
                          type="button"
                          onClick={handleSave}
                          disabled={loading || checkingDup}
                        >
                          {checkingDup ? "Checking for duplicates…" : loading ? "Saving…" : "Save skill"}
                        </button>
                      </>
                    )}
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
