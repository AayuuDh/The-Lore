// SKILL DETAIL PAGE  (URL: "/skills/:id")
//
// This is the payoff of URL routing: the page reads the ":id" straight out
// of the address bar with useParams(), fetches that one skill, and renders
// its markdown body. Because the id lives in the URL, this page is
// bookmarkable and the browser Back button just works.

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { getSkill } from "../api.js";
import { categoryOf } from "../components/SkillCard.jsx";

export default function SkillPage() {
  // useParams() pulls the wildcard from the URL. App.jsx declared the route
  // as path="/skills/:id", so here `id` === whatever is in the address bar.
  const { id } = useParams();
  const navigate = useNavigate();   // lets us go back to the list in code

  const [skill, setSkill] = useState(null);
  const [error, setError] = useState(null);

  // Re-fetch whenever the id changes (e.g. navigating from one skill to another).
  useEffect(() => {
    setSkill(null);
    setError(null);
    getSkill(id)
      .then(setSkill)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="empty">
        <h2>Couldn't load that skill</h2>
        <p className="muted">"{id}" — {error}</p>
        <Link to="/explore" className="btn">Back to explore</Link>
      </div>
    );
  }
  if (!skill) return <div className="loading"><span className="spinner" /> Loading {id}…</div>;

  return (
    <article className="detail">
      <button className="crumb" onClick={() => navigate(-1)}>← Back</button>

      <div className="detail-head">
        <span className={`chip chip-${categoryOf(skill.id).toLowerCase()}`}>{categoryOf(skill.id)}</span>
        <h1>{skill.name}</h1>
        <p className="detail-desc muted">{skill.description}</p>
        <code className="detail-id">{skill.id}</code>
      </div>

      <div className="detail-body">
        {/* The skill's markdown body, rendered as formatted HTML. */}
        <div className="markdown">
          <ReactMarkdown>{skill.body}</ReactMarkdown>
        </div>
      </div>

      <div className="detail-foot">
        <Link to="/explore" className="btn-ghost">← All skills</Link>
      </div>
    </article>
  );
}
