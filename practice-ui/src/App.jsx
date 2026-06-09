// Routing table + shared page shell (navbar always on top, footer at bottom).
// Each <Route> maps one URL to one page component.

import { Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import ExplorePage from "./pages/ExplorePage.jsx";
import SkillPage from "./pages/SkillPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";

export default function App() {
  return (
    <div className="shell">
      <Navbar />

      <main className="main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/skills/:id" element={<SkillPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h2>404</h2>
                <p className="muted">That page drifted into the void.</p>
                <Link to="/" className="btn">Back home</Link>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="footer">
        <span>The Lore</span>
        <span className="muted">routing practice sandbox · frontend only</span>
      </footer>
    </div>
  );
}
