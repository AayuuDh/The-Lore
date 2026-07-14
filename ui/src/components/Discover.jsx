import { useState } from "react";
import { SearchIcon, ArrowRightIcon, PlusIcon } from "@primer/octicons-react";
import { matchSkills } from "../api";
import "./Discover.css";

// Starter prompts kill "blank-page paralysis" (funnel stage 3): people don't
// have to think of what to type — they can just click a real example.
const STARTERS = [
  "Summarize a meeting into action items",
  "Review my code for bugs",
  "Draft a professional email",
  "Turn notes into a project plan",
];

// A cosine score (0–1) shown as a friendlier percentage.
function matchPercent(score) {
  return Math.max(1, Math.round((score || 0) * 100));
}

// Trim a long backend description to a short "why it fits" line.
function shortWhy(description = "") {
  const clean = description.trim();
  if (!clean) return "";
  return clean.length > 160 ? `${clean.slice(0, 160).trimEnd()}…` : clean;
}

function Discover({ onOpenSkill, onAddSkills }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // null = haven't searched yet
  const [error, setError] = useState("");

  async function runSearch(q) {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    setLoading(true);
    setError("");
    try {
      const ranked = await matchSkills(text);
      setResults(ranked.map((r) => ({ ...r.skill, score: r.score })));
    } catch {
      setError("Couldn't reach the search service. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  const best = results && results.length ? results[0] : null;
  const alternatives = results ? results.slice(1, 3) : [];

  return (
    <div className="discover">
      {/* ── HERO: the one thing on screen (funnel stage 2→3) ── */}
      <section className={`discover__hero${results ? " discover__hero--compact" : ""}`}>
        <h1 className="discover__headline">The Skills You Need</h1>
        <p className="discover__sub">
          Describe what you&rsquo;re trying to do — we&rsquo;ll match you to the
          right skill.
        </p>

        <form
          className="discover__search"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
        >
          <SearchIcon size={20} className="discover__search-icon" />
          <input
            className="discover__input"
            placeholder="e.g. summarize a meeting into action items"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Describe what you need a skill for"
            autoFocus
          />
          <button className="discover__go" type="submit" disabled={loading}>
            {loading ? "Finding…" : "Find"}
          </button>
        </form>

        {/* Starters only before the first search, so they don't clutter results. */}
        {!results && (
          <div className="discover__starters">
            <span className="discover__starters-label">Try:</span>
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                className="discover__chip"
                onClick={() => runSearch(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <div className="discover__error">{error}</div>}

      {/* ── RESULT: a reasoned recommendation, not a wall (funnel 4→5→6) ── */}
      {best && (
        <section className="discover__result">
          <div className="discover__best">
            <div className="discover__best-top">
              <span className="discover__badge">Best fit</span>
              <span className="discover__match">{matchPercent(best.score)}% match</span>
            </div>
            <h2 className="discover__best-name">{best.name || best.id}</h2>
            <p className="discover__best-why">{shortWhy(best.description)}</p>
            <div className="discover__actions">
              <button
                className="discover__use"
                onClick={() => onOpenSkill?.(best.id)}
              >
                Use this skill <ArrowRightIcon size={16} />
              </button>
              <button
                className="discover__create"
                onClick={() => onAddSkills?.()}
              >
                Not quite — create one
              </button>
            </div>
          </div>

          {alternatives.length > 0 && (
            <div className="discover__alts">
              <h3 className="discover__alts-title">Other close matches</h3>
              {alternatives.map((s) => (
                <button
                  key={s.id}
                  className="discover__alt"
                  onClick={() => onOpenSkill?.(s.id)}
                >
                  <span className="discover__alt-name">{s.name || s.id}</span>
                  <span className="discover__alt-match">
                    {matchPercent(s.score)}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* No dead ends: if nothing matched, offer the create path. */}
      {results && !best && !error && (
        <section className="discover__empty">
          <p className="discover__empty-text">
            No skill fits that yet — want to be the one who makes it?
          </p>
          <button className="discover__use" onClick={() => onAddSkills?.()}>
            <PlusIcon size={16} /> Create this skill
          </button>
        </section>
      )}
    </div>
  );
}

export default Discover;
