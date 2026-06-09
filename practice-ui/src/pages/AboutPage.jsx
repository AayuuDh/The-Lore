// ABOUT PAGE (URL "/about") — static content, pure routing target.

import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <div className="about">
      <span className="pill">About</span>
      <h1>One library for every reusable skill.</h1>
      <p className="lead muted">
        Teams keep rebuilding the same things — meeting summarizers, status-update
        drafts, deployment recipes. The Lore makes them discoverable so the next
        person can reuse instead of reinvent.
      </p>

      <div className="about-grid">
        <div className="about-card">
          <h3>How matching works</h3>
          <p className="muted">
            Every skill is embedded into a 256-dimension vector with a small,
            fast model. Your query is embedded the same way, and we rank skills
            by cosine similarity — closeness in meaning, not keyword overlap.
          </p>
        </div>
        <div className="about-card">
          <h3>What's a skill</h3>
          <p className="muted">
            A markdown document: a short description for search, plus a body with
            instructions and examples. Small enough to read, structured enough to
            rank.
          </p>
        </div>
        <div className="about-card">
          <h3>This sandbox</h3>
          <p className="muted">
            A frontend-only playground for practicing page routing. It talks to
            the real matching API but changes nothing on the backend.
          </p>
        </div>
      </div>

      <Link to="/explore" className="btn btn-lg">Try it now →</Link>
    </div>
  );
}
