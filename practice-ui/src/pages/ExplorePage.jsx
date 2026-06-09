// EXPLORE PAGE (URL "/explore") — search + browse.
// On load: GET /skills (full list). On submit: POST /match (ranked).
// Category chips filter the currently-shown list client-side.

import { useState, useEffect, useMemo } from "react";
import { searchSkills, getAllSkills } from "../api.js";
import SkillCard, { categoryOf } from "../components/SkillCard.jsx";

const CATEGORIES = ["All", "Workplace", "Dev", "React", "Design", "Tauri", "Deploy"];

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);      // [{ skill, score }]
  const [cat, setCat] = useState("All");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAllSkills()
      .then((data) => setItems(data.map((skill) => ({ skill, score: null }))))
      .catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchSkills(query);
      setItems(results);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(
    () => (cat === "All" ? items : items.filter(({ skill }) => categoryOf(skill.id) === cat)),
    [items, cat]
  );

  return (
    <div className="explore">
      <div className="explore-head">
        <h1>Explore skills</h1>
        <p className="muted">
          {searched ? "Ranked by match to your query." : "Browse the full library or search by intent."}
        </p>
      </div>

      <form className="searchbar" onSubmit={handleSubmit}>
        <span className="search-icon">⌕</span>
        <input
          className="search-input"
          placeholder="e.g. summarize my meeting notes into action items"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" type="submit">{loading ? "Searching…" : "Search"}</button>
      </form>

      <div className="chips">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={c === cat ? "chip-btn active" : "chip-btn"}
            onClick={() => setCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {error && <p className="error">Backend error: {error}. Is uvicorn running on :8000?</p>}

      <p className="result-count muted">{visible.length} skill{visible.length === 1 ? "" : "s"}</p>

      <div className="card-grid">
        {visible.map(({ skill, score }) => (
          <SkillCard key={skill.id} skill={skill} score={score} />
        ))}
      </div>
    </div>
  );
}
