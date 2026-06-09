// Sticky top navigation. The interesting routing bit: useLocation() tells us
// the current URL, so we can highlight whichever nav link is active.
// NavLink does this automatically too (it adds an "active" class), so we use it.

import { NavLink, Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="logo">
          <span className="logo-mark">◆</span>
          <span className="logo-text">The Lore</span>
        </Link>

        <nav className="nav-links">
          {/* NavLink auto-applies "active" when its `to` matches the URL. */}
          <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Home
          </NavLink>
          <NavLink to="/explore" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Explore
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            About
          </NavLink>
        </nav>

        <Link to="/explore" className="nav-cta">Get started</Link>
      </div>
    </header>
  );
}
