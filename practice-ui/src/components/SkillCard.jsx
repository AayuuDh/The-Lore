// A reusable result card. Pure display — it takes a skill (+ optional score)
// and renders a clickable card that routes to that skill's detail page.

import { Link } from "react-router-dom";

// Infer a human category from the skill id prefix. Frontend-only nicety;
// the backend doesn't send categories, we derive them here.
export function categoryOf(id) {
  if (id.startsWith("tauri")) return "Tauri";
  if (id.startsWith("design")) return "Design";
  if (id.startsWith("react")) return "React";
  if (id.startsWith("pages")) return "Deploy";
  if (id.startsWith("git") || id.startsWith("npm") || id.includes("test") || id.includes("code") || id.includes("file"))
    return "Dev";
  return "Workplace";
}

export default function SkillCard({ skill, score }) {
  return (
    <Link to={`/skills/${skill.id}`} className="card">
      <div className="card-top">
        <span className={`chip chip-${categoryOf(skill.id).toLowerCase()}`}>
          {categoryOf(skill.id)}
        </span>
        {score != null && <span className="card-score">{(score * 100).toFixed(0)}%</span>}
      </div>
      <h3 className="card-title">{skill.name}</h3>
      <p className="card-desc">{skill.description.slice(0, 120)}…</p>
      <span className="card-cta">Open skill →</span>
    </Link>
  );
}
