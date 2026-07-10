import { useEffect, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import {
  ThreeBarsIcon,
  SearchIcon,
  PersonIcon,
  FlameIcon,
  GearIcon,
  StarIcon,
  QuestionIcon,
  SignOutIcon,
} from "@primer/octicons-react";
import logo from "../assets/logo light.png";
import "./TopNav.css";

function TopNav({ onMenuClick, currentPage, streak, username, onOpenProfile }) {
  // The MSAL engine — used to sign the user out.
  const { instance } = useMsal();
  // Whether the profile dropdown is open.
  const [menuOpen, setMenuOpen] = useState(false);
  // Ref around the avatar + menu so we can close it when clicking elsewhere.
  const menuRef = useRef(null);

  // Close the dropdown when the user clicks anywhere outside of it, or presses
  // Escape. Only wire these listeners up while the menu is actually open.
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // Open the existing profile page (the one item with a real destination).
  const handleProfile = () => {
    setMenuOpen(false);
    onOpenProfile();
  };

  // Sign the user out. logoutRedirect clears the MSAL session and sends the
  // browser back to our app URL, where the auth gate in App.jsx swaps the whole
  // UI back to the login landing page (the "Sign in with Microsoft" screen).
  const handleSignOut = () => {
    setMenuOpen(false);
    instance
      .logoutRedirect({ postLogoutRedirectUri: window.location.origin })
      .catch((error) => console.error("Sign-out failed:", error));
  };

  return (
    <header className="topnav">
      {/* Left group */}

      <div className="topnav__left">
        <button
          className="topnav__hamburger"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <ThreeBarsIcon size={16} />
        </button>

        <img
          className="topnav__logo"
          src={logo}
          width="28"
          height="40"
          alt="Logo"
        />

        <span className="topnav__separator">/</span>
        <span className="topnav__page-name">{currentPage}</span>
      </div>

      {/* Center — Search */}
      <div className="topnav__center">
        <div className="topnav__search">
          <SearchIcon size={16} className="topnav__search-icon" />
          <input
            type="text"
            className="topnav__search-input"
            placeholder="Type / to search"
          />
          <span className="topnav__search-shortcut">/</span>
        </div>
      </div>

      {/* Right group */}
      <div className="topnav__right">
        {streak && streak.current > 0 && (
          <div
            className="topnav__streak"
            title={`${streak.current}-day streak \u2014 best: ${streak.longest}`}
            aria-label={`${streak.current} day streak`}
          >
            <FlameIcon size={16} />
            <span>{streak.current}</span>
          </div>
        )}
        {/* Profile avatar + dropdown menu */}
        <div className="topnav__profile" ref={menuRef}>
          <button
            className="topnav__avatar"
            aria-label="Profile menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            title={username ? `Signed in as ${username}` : "Profile"}
          >
            {username && <span className="topnav__username">{username}</span>}
            <PersonIcon size={20} />
          </button>

          {menuOpen && (
            <div className="topnav__menu" role="menu">
              {username && (
                <div className="topnav__menu-header">
                  <span className="topnav__menu-header-label">Signed in as</span>
                  <span className="topnav__menu-header-name">{username}</span>
                </div>
              )}

              <button
                className="topnav__menu-item"
                role="menuitem"
                onClick={handleProfile}
              >
                <PersonIcon size={16} />
                <span>Your profile</span>
              </button>

              <button
                className="topnav__menu-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                <StarIcon size={16} />
                <span>Favorites</span>
              </button>

              <button
                className="topnav__menu-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                <GearIcon size={16} />
                <span>Settings</span>
              </button>

              <button
                className="topnav__menu-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                <QuestionIcon size={16} />
                <span>Help</span>
              </button>

              <div className="topnav__menu-divider" />

              <button
                className="topnav__menu-item topnav__menu-item--signout"
                role="menuitem"
                onClick={handleSignOut}
              >
                <SignOutIcon size={16} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopNav;
