import React, { useEffect, useMemo, useState } from "react";
import { SearchIcon, ArrowLeftIcon, XIcon, StarIcon, StarFillIcon, AlertIcon } from "@primer/octicons-react";
import { getSkills, matchSkills } from "../api";
import { getFavorites, toggleFavorite } from "../favorites";
import { recordView } from "../recentlyViewed";
import { getCategory, getAllCategories } from "../categories";
import SkillDetail from "./SkillDetail";
import "./SkillsPage.css";

// The backend `description` is a long paragraph with usage hints.
// Keep only a short, card-friendly snippet (first sentence, capped length).
function shortDescription(description = "") {
  const clean = description.trim();
  if (!clean) return "No description available.";
  const firstSentence = clean.split(/(?<=[.!?])\s/)[0];
  const snippet = firstSentence.length > 140 ? clean.slice(0, 140) : firstSentence;
  return snippet.length < clean.length ? `${snippet.replace(/[.\s]+$/, "")}…` : snippet;
}

function sortByName(skills) {
  return [...skills].sort((a, b) =>
    (a.name || a.id).localeCompare(b.name || b.id)
  );
}

function SkillsPage({ onBackHome, initialSkillId = null, onEditSkill, userId }) {
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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  // The selected category chip (null = All). Only applies in the catalog view.
  const [activeCategory, setActiveCategory] = useState(null);

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
      // ranked is best-first; keep only meaningful matches.
      setResults(ranked.map((r) => ({ ...r.skill, score: r.score })));
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
          <span>
            Showing {visibleSkills.length} recommended{" "}
            {visibleSkills.length === 1 ? "skill" : "skills"} for
            &nbsp;“{query.trim()}”
          </span>
        ) : (
          !loading && <span>{alphabetical.length} skills, sorted A–Z</span>
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
        <div className="skills-page__grid">
          {visibleSkills.map((skill, i) => (
            <button
              key={skill.id}
              className="skill-card"
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
              <p className="skill-card__desc">{shortDescription(skill.description)}</p>
            </button>
          ))}
          {visibleSkills.length === 0 && !error && (
            <div className="skills-page__empty">
              {showFavoritesOnly
                ? "You haven’t starred any skills yet. Tap the ☆ on a card to add one."
                : "No matching skills found."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SkillsPage;
