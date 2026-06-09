// LANDING PAGE (URL "/") — the marketing front door.
// Pulls a live skill count from the backend just to make the hero feel real,
// but everything here is navigation-focused: big CTAs that route to /explore.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllSkills } from "../api.js";

const FEATURES = [
  { icon: "⚡", title: "Semantic search", body: "Describe a task in plain words. We match it to the right skill by meaning, not keywords." },
  { icon: "◆", title: "One shared library", body: "Every reusable skill across teams in a single place. Stop rebuilding what already exists." },
  { icon: "✦", title: "Built for interns", body: "From summarizing meetings to shipping a Tauri app — practical skills, ready to use." },
];

const STEPS = [
  { n: "01", title: "Describe it", body: "Type what you're trying to do, however you'd say it out loud." },
  { n: "02", title: "We rank it", body: "An embedding model scores every skill against your intent." },
  { n: "03", title: "Open & reuse", body: "Click through to the full skill with instructions and examples." },
];

export default function LandingPage() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    getAllSkills()
      .then((data) => setCount(data.length))
      .catch(() => setCount(null));
  }, []);

  return (
    <div className="landing">
      {/* HERO */}
      <section className="hero">
        <div className="hero-glow" />
        <span className="pill">✦ {count != null ? `${count} skills indexed` : "skill discovery engine"}</span>
        <h1 className="hero-title">
          Find the skill.<br />
          <span className="grad">Skip the rebuild.</span>
        </h1>
        <p className="hero-sub">
          The Lore is a discovery engine for reusable AI skills. Describe what you
          want to do and instantly surface the right one from across every team.
        </p>
        <div className="hero-actions">
          <Link to="/explore" className="btn btn-lg">Start exploring →</Link>
          <Link to="/about" className="btn-ghost btn-lg">How it works</Link>
        </div>

        <div className="hero-stats">
          <div className="stat"><strong>{count ?? "—"}</strong><span>skills</span></div>
          <div className="stat"><strong>256-d</strong><span>embeddings</span></div>
          <div className="stat"><strong>&lt;50ms</strong><span>ranking</span></div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <h2 className="section-title">Why The Lore</h2>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p className="muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <h2 className="section-title">Three steps</h2>
        <div className="steps">
          {STEPS.map((s) => (
            <div key={s.n} className="step">
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p className="muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band">
        <h2>Ready to find your skill?</h2>
        <Link to="/explore" className="btn btn-lg">Explore the library →</Link>
      </section>
    </div>
  );
}
