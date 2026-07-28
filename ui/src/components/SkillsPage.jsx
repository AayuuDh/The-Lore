import { useEffect, useMemo, useState } from "react";
import { SearchIcon, ArrowLeftIcon, XIcon, StarIcon, StarFillIcon, AlertIcon, EyeIcon, ZapIcon, PlusIcon } from "@primer/octicons-react";
import { getSkills, matchSkills, getAllMetrics } from "../api";
import { getFavorites, toggleFavorite } from "../favorites";
import { recordView } from "../recentlyViewed";
import { getCategory, getAllCategories } from "../categories";
import SkillDetail from "./SkillDetail";
import "./SkillsPage.css";

// The backend `description` is a long paragraph with usage hints.
// Keep only a short, card-friendly snippet (first sentence, capped length).
function shortDescription(description = "", maxLen = 140) {
  const clean = description.trim();
  if (!clean) return "No description available.";
  const firstSentence = clean.split(/(?<=[.!?])\s/)[0];
  const snippet = firstSentence.length > maxLen ? clean.slice(0, maxLen) : firstSentence;
  return snippet.length < clean.length ? `${snippet.replace(/[.\s]+$/, "")}…` : snippet;
}

function sortByName(skills) {
  return [...skills].sort((a, b) =>
    (a.name || a.id).localeCompare(b.name || b.id)
  );
}

// Minimum cosine similarity for a result to count as a real match. Below this,
// the ranking is just noise (every skill scores a little), so we'd rather tell
// the user nothing fits and offer to create the skill than show 30 non-matches.
// This embedding model scores an exact phrase match at ~0.69 and the Add-Skill
// near-duplicate gate uses 0.55, so this floor is deliberately conservative.
const RELEVANCE_THRESHOLD = 0.4;

// Percentile rank (0..1) of each value in an array — robust to outliers, so one
// mega-popular skill can't blow out the scale, and sizing stays stable as numbers grow.
function percentiles(values) {
  const n = values.length;
  if (n === 0) return [];
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const pct = new Array(n).fill(0);
  order.forEach(([, origIdx], rank) => {
    pct[origIdx] = n <= 1 ? 1 : rank / (n - 1);
  });
  return pct;
}

// Bento layout: order skills by PROMINENCE (view count + description length, as
// percentiles) so viewed/rich skills lead — then apply a repeating size RHYTHM
// so a mix of big/medium/small tiles appears across the WHOLE grid, tail
// included. Sizing the rhythm by position (not by score) is what prevents a
// smushed run of small tiles at the end. Returns skills tagged _size + _metrics.
function bentoLayout(skills, metricsMap) {
  if (skills.length === 0) return [];
  const views = skills.map((s) => metricsMap[s.id]?.views || 0);
  const len = skills.map((s) => s.description?.length || 0);
  const viewsPct = percentiles(views);
  const lenPct = percentiles(len);

  const items = skills.map((s, i) => ({
    skill: s,
    metrics: metricsMap[s.id] || { views: 0, uses: 0, favorites: 0 },
    prominence: 0.5 * viewsPct[i] + 0.5 * lenPct[i],
  }));

  // Most prominent (viewed + rich) first, so they lead and land on the big slots.
  items.sort((a, b) => b.prominence - a.prominence);

  // A repeating rhythm of tile sizes — every 10 tiles has 1 lg, 2 wide, 2 tall,
  // 5 sm. Because it repeats, every region of the grid stays varied, so there is
  // no uniform tail.
  const PATTERN = ["lg", "sm", "tall", "sm", "wide", "sm", "tall", "sm", "wide", "sm"];
  return items.map((it, i) => ({
    ...it.skill,
    _size: PATTERN[i % PATTERN.length],
    _metrics: it.metrics,
  }));
}

function SkillsPage({ onBackHome, initialSkillId = null, onEditSkill, userId, initialFavoritesOnly = false, onCreateSkill }) {
  const [allSkills, setAllSkills] = useState([]);
  const [results, setResults] = useState(null); // null = showing full catalog
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  // Seed the open skill from initialSkillId. When the home page's "Jump back in"
  // row navigates here, App passes that skill's id and it opens straight away.
  const [selectedId, setSelectedId] = useState(initialSkillId);
  // The list of starred skill ids. We seed it from localStorage on first render
  // (getFavorites reads what was saved last time), then keep it in React state
  // so the stars on screen update the instant you click them.
  const [favorites, setFavorites] = useState(getFavorites);
  // When true, the grid shows ONLY skills you've starred. Just a view filter,
  // it doesn't change what's saved, it changes what we render.
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(initialFavoritesOnly);
  // The selected category chip (null = All). Only applies in the catalog view.
  const [activeCategory, setActiveCategory] = useState(null);
  // Global usage counts per skill, used to size the bento grid.
  // { id: { views, uses, favorites } }
  const [metrics, setMetrics] = useState({});

  // Follow the nav intent: opening via "Favorited" flips the filter on.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowFavoritesOnly(initialFavoritesOnly);
  }, [initialFavoritesOnly]);

  // Star/unstar a skill. We stop the click from bubbling up to the card button
  // (otherwise clicking the star would also open the skill's detail page).
  // toggleFavorite saves to localStorage AND returns the new list, which we
  // drop into state to re-render the stars.
  function handleToggleFavorite(e, id) {
    e.stopPropagation();
    setFavorites(toggleFavorite(id));
  }

  // Load the full catalog once on mount.
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getSkills()
      .then((data) => {
        if (!active) return;
        setAllSkills(sortByName(data));
        setError("");
      })
      .catch(() => {
        if (active) setError("Couldn't reach the backend. Is the API running on http://localhost:8000?");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Load global metrics once, to size the bento tiles by real engagement.
  useEffect(() => {
    let active = true;
    getAllMetrics()
      .then((m) => active && setMetrics(m && typeof m === "object" ? m : {}))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const alphabetical = useMemo(() => sortByName(allSkills), [allSkills]);

  // The categories that actually appear in the catalog, in fixed display order.
  // We only show a chip if at least one skill falls into that category.
  const availableCategories = useMemo(() => {
    const present = new Set(alphabetical.map((s) => getCategory(s)));
    return getAllCategories().filter((c) => present.has(c));
  }, [alphabetical]);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    setError("");
    try {
      const ranked = await matchSkills(q);
      // ranked is best-first; keep only results that clear the relevance floor.
      // Everything below it is noise, so an empty list here is a genuine "no
      // skill fits" — which the grid turns into a create-this-skill prompt.
      setResults(
        ranked
          .filter((r) => r.score >= RELEVANCE_THRESHOLD)
          .map((r) => ({ ...r.skill, score: r.score }))
      );
    } catch {
      setError("Search failed. Make sure the backend is running.");
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setResults(null);
    setError("");
  }

  const isSearchView = results !== null;
  // Start from either the search results or the full A–Z catalog, then apply the
  // active view filters: favorites (if on) and category (catalog view only).
  const baseSkills = isSearchView ? results : alphabetical;
  const visibleSkills = baseSkills.filter((skill) => {
    if (showFavoritesOnly && !favorites.includes(skill.id)) return false;
    if (!isSearchView && activeCategory && getCategory(skill) !== activeCategory)
      return false;
    return true;
  });

  // Catalog view gets the bento treatment (signal-sized tiles, score-ordered);
  // search results stay uniform so the ranking reads cleanly.
  const displaySkills = isSearchView
    ? visibleSkills.map((s) => ({ ...s, _size: "sm" }))
    : bentoLayout(visibleSkills, metrics);

  if (selectedId) {
    return (
      <SkillDetail
        skillId={selectedId}
        onBack={() => setSelectedId(null)}
        onEdit={onEditSkill}
        userId={userId}
      />
    );
  }

  return (
    <div className="skills-page">
      <button className="skills-page__back" onClick={onBackHome}>
        <ArrowLeftIcon size={16} />
        <span>Back to Home</span>
      </button>

      <header className="skills-page__header">
        <h1 className="skills-page__title">Discover Skills</h1>
        <p className="skills-page__subtitle">
          Browse the catalog or search to find the skills that best match what
          you need.
        </p>
      </header>

      {/* Search for skills */}
      <form className="skills-page__search" onSubmit={handleSearch}>
        <SearchIcon size={18} className="skills-page__search-icon" />
        <input
          type="text"
          className="skills-page__search-input"
          placeholder="Search for skills…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search for skills"
        />
        {query && (
          <button
            type="button"
            className="skills-page__search-clear"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            <XIcon size={16} />
          </button>
        )}
        <button type="submit" className="skills-page__search-btn" disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {/* Status row */}
      <div className="skills-page__status">
        {isSearchView ? (
          visibleSkills.length === 0 ? (
            <span>No matches for&nbsp;“{query.trim()}”</span>
          ) : (
            <span>
              Showing {visibleSkills.length} recommended{" "}
              {visibleSkills.length === 1 ? "skill" : "skills"} for
              &nbsp;“{query.trim()}”
            </span>
          )
        ) : (
          !loading && <span>{alphabetical.length} skills</span>
        )}

        <button
          type="button"
          className={`skills-page__fav-toggle${showFavoritesOnly ? " is-active" : ""}`}
          onClick={() => setShowFavoritesOnly((v) => !v)}
          aria-pressed={showFavoritesOnly}
        >
          {showFavoritesOnly ? <StarFillIcon size={14} /> : <StarIcon size={14} />}
          <span>{showFavoritesOnly ? "Showing favorites" : "My Favorites"}</span>
          {favorites.length > 0 && (
            <span className="skills-page__fav-count">{favorites.length}</span>
          )}
        </button>
      </div>

      {/* Category filter chips — catalog view only. */}
      {!isSearchView && !loading && availableCategories.length > 1 && (
        <div className="skills-page__categories">
          <button
            type="button"
            className={`skills-page__chip${activeCategory === null ? " is-active" : ""}`}
            onClick={() => setActiveCategory(null)}
          >
            All
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`skills-page__chip${activeCategory === cat ? " is-active" : ""}`}
              onClick={() =>
                setActiveCategory((c) => (c === cat ? null : cat))
              }
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="skills-page__error">
          <AlertIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="skills-page__grid">
          {/* Placeholder cards that shimmer while the catalog loads. aria-hidden
              so screen readers skip the fake content. */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="skill-card skill-card--skeleton"
              aria-hidden="true"
            >
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-line--short" />
            </div>
          ))}
        </div>
      ) : (
        <div className={`skills-page__grid${isSearchView ? "" : " skills-page__grid--bento"}`}>
          {displaySkills.map((skill, i) => (
            <button
              key={skill.id}
              className={`skill-card skill-card--${skill._size || "sm"}`}
              onClick={() => {
                // Remember this open so it shows up in "Jump back in", then
                // switch to the detail view.
                recordView(skill);
                setSelectedId(skill.id);
              }}
            >
              {isSearchView && i === 0 && (
                <span className="skill-card__badge">Top match</span>
              )}
              <span
                className="skill-card__fav"
                role="button"
                tabIndex={0}
                aria-label={favorites.includes(skill.id) ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={favorites.includes(skill.id)}
                onClick={(e) => handleToggleFavorite(e, skill.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleToggleFavorite(e, skill.id);
                }}
              >
                {favorites.includes(skill.id) ? (
                  <StarFillIcon size={18} />
                ) : (
                  <StarIcon size={18} />
                )}
              </span>
              <h3 className="skill-card__title">{skill.name || skill.id}</h3>
              <p className="skill-card__desc">
                {shortDescription(
                  skill.description,
                  skill._size === "lg" || skill._size === "tall" ? 260 : 120
                )}
              </p>
              {skill._size !== "sm" &&
                skill._metrics &&
                skill._metrics.views + skill._metrics.uses + skill._metrics.favorites > 0 && (
                  <div className="skill-card__metrics">
                    <span title="Opens">
                      <EyeIcon size={12} /> {skill._metrics.views}
                    </span>
                    <span title="Uses">
                      <ZapIcon size={12} /> {skill._metrics.uses}
                    </span>
                    <span title="Favorites">
                      <StarFillIcon size={12} /> {skill._metrics.favorites}
                    </span>
                  </div>
                )}
            </button>
          ))}
          {visibleSkills.length === 0 && !error && (
            showFavoritesOnly ? (
              <div className="skills-page__empty">
                You haven’t starred any skills yet. Tap the ☆ on a card to add one.
              </div>
            ) : isSearchView ? (
              <div className="skills-page__empty skills-page__empty--create">
                <p className="skills-page__empty-title">
                  There isn’t a skill for “{query.trim()}” yet.
                </p>
                <p className="skills-page__empty-text">
                  Nothing in the catalog matches what you searched for. Want to
                  add it? We’ll start you off with what you typed.
                </p>
                <button
                  type="button"
                  className="skills-page__create-btn"
                  onClick={() => onCreateSkill?.(query.trim())}
                >
                  <PlusIcon size={16} /> Create this skill
                </button>
              </div>
            ) : (
              <div className="skills-page__empty">No matching skills found.</div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default SkillsPage;
