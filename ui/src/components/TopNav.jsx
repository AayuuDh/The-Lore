import { useEffect, useRef, useState } from "react";
import {
  ThreeBarsIcon,
  XIcon,
  PersonIcon,
  FlameIcon,
  GearIcon,
  PaintbrushIcon,
  StarIcon,
  QuestionIcon,
  SignOutIcon,
} from "@primer/octicons-react";
import logo from "../assets/New_logo_Key_lore.png";
import { getRecentlyViewed } from "../recentlyViewed";
import { getAchievements, getAchievementSummary } from "../achievements";
import "./TopNav.css";

function TopNav({ onMenuClick, sidebarOpen, currentPage, streak, nickname, username, onHome, onOpenProfile, onOpenSettings, onOpenAppearance, onOpenUpdates, onOpenAccessibility, onOpenSkill, onSignOut }) {
  // Whether the profile dropdown is open.
  const [menuOpen, setMenuOpen] = useState(false);
  // Whether the streak/achievements popup is open.
  const [activityOpen, setActivityOpen] = useState(false);
  // Ref around the avatar + menu so we can close it when clicking elsewhere.
  const menuRef = useRef(null);
  // Ref around the activity button + popup, same purpose.
  const activityRef = useRef(null);

  // Close either dropdown when the user clicks anywhere outside of it, or
  // presses Escape. Only wire these listeners up while something is open.
  useEffect(() => {
    if (!menuOpen && !activityOpen) return;
    const handleClickOutside = (event) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (activityOpen && activityRef.current && !activityRef.current.contains(event.target)) {
        setActivityOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setActivityOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, activityOpen]);

  // Recently-opened skills and badge progress, read fresh each time the popup
  // renders so it never shows stale numbers.
  const recentSkills = getRecentlyViewed();
  const achievements = getAchievements();
  const achievementSummary = getAchievementSummary();

  // Open a skill from the "Jump back in" row and close the popup behind it.
  const handleOpenRecentSkill = (skillId) => {
    setActivityOpen(false);
    onOpenSkill?.(skillId);
  };

  // Open the existing profile page (the one item with a real destination).
  const handleProfile = () => {
    setMenuOpen(false);
    onOpenProfile();
  };

  const handleSettings = () => {
    setMenuOpen(false);
    onOpenSettings();
  };

  const handleAppearance = () => {
    setMenuOpen(false);
    onOpenAppearance();
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    onSignOut();
  };

  return (
    <header className="topnav">
      {/* Left group */}

      <div className="topnav__left">
        <button
          className="topnav__hamburger"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <XIcon size={16} /> : <ThreeBarsIcon size={16} />}
        </button>

        {/* Home. Kept as an anchor (so it looks/acts like a link and supports
            middle-click) but intercepted: onHome runs through the app's leave
            guard, which confirms before abandoning an in-progress conversation. */}
        <a
          className="topnav__logo-link"
          href="/home"
          aria-label="Go to home page"
          onClick={(event) => {
            event.preventDefault();
            onHome?.();
          }}
        >
          <img
            className="topnav__logo"
            src={logo}
            width="24"
            height="45"
            alt=""
          />
        </a>

        <span className="topnav__separator">/</span>
        <span className="topnav__page-name">{currentPage}</span>
      </div>

      {/* Right group */}
      <div className="topnav__right">
        {/* Streak + achievements + recently-opened, all behind one button */}
        <div className="topnav__activity" ref={activityRef}>
          <button
            className="topnav__activity-btn"
            aria-label="Streaks and achievements"
            aria-haspopup="dialog"
            aria-expanded={activityOpen}
            onClick={() => setActivityOpen((open) => !open)}
            title={
              streak && streak.current > 0
                ? `${streak.current}-day streak \u2014 best: ${streak.longest}`
                : "Streaks & achievements"
            }
          >
            <FlameIcon
              size={16}
              className={`topnav__activity-flame${streak && streak.current > 0 ? " is-active" : ""}`}
            />
            {streak && streak.current > 0 && <span>{streak.current}</span>}
          </button>

          {activityOpen && (
            <div className="topnav__activity-panel" role="dialog" aria-label="Your progress">
              <div className="topnav__activity-streak">
                <FlameIcon
                  size={22}
                  className={`topnav__activity-flame${streak && streak.current > 0 ? " is-active" : ""}`}
                />
                <div className="topnav__activity-streak-text">
                  <span className="topnav__activity-streak-current">
                    {streak?.current > 0 ? `${streak.current}-day streak` : "No streak yet"}
                  </span>
                  <span className="topnav__activity-streak-best">
                    Best: {streak?.longest || 0} {streak?.longest === 1 ? "day" : "days"}
                  </span>
                </div>
              </div>

              <div className="topnav__activity-section">
                <h3 className="topnav__activity-section-title">
                  Achievements
                  <span className="topnav__activity-achievements-count">
                    {achievementSummary.earned} / {achievementSummary.total}
                  </span>
                </h3>
                <div className="topnav__activity-badges">
                  {achievements.map((badge) => (
                    <div
                      key={badge.id}
                      className={`topnav__activity-badge${badge.earned ? " is-earned" : " is-locked"}`}
                      title={badge.description}
                    >
                      <span className="topnav__activity-badge-emoji">{badge.emoji}</span>
                      <div className="topnav__activity-badge-text">
                        <span className="topnav__activity-badge-title">{badge.title}</span>
                        <span className="topnav__activity-badge-desc">{badge.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {recentSkills.length > 0 && (
                <div className="topnav__activity-section">
                  <h3 className="topnav__activity-section-title">Jump back in</h3>
                  <div className="topnav__activity-recent-row">
                    {recentSkills.map((skill) => (
                      <button
                        key={skill.id}
                        className="topnav__activity-recent-card"
                        onClick={() => handleOpenRecentSkill(skill.id)}
                        title={skill.description}
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
              <div className="topnav__menu-account">
                <div className="topnav__menu-account-avatar" aria-hidden="true">
                  <PersonIcon size={20} />
                </div>
                <div className="topnav__menu-account-details">
                  <span className="topnav__menu-account-email">Local session</span>
                  <span className="topnav__menu-account-username">
                    {username ? `@${username}` : "Choose a username"}
                  </span>
                  {nickname && <span className="topnav__menu-account-nickname">{nickname}</span>}
                </div>
              </div>

              <button
                className="topnav__menu-item"
                role="menuitem"
                onClick={handleProfile}
              >
                <PersonIcon size={16} />
                <span>Profile</span>
              </button>

              <button
                className="topnav__menu-item"
                role="menuitem"
                onClick={handleSettings}
              >
                <GearIcon size={16} />
                <span>Settings</span>
              </button>

              <button
                className="topnav__menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenUpdates();
                }}
              >
                <StarIcon size={16} />
                <span>Updates</span>
              </button>

              <button
                className="topnav__menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAccessibility();
                }}
              >
                <QuestionIcon size={16} />
                <span>Accessibility</span>
              </button>

              <button
                className="topnav__menu-item"
                role="menuitem"
                onClick={handleAppearance}
              >
                <PaintbrushIcon size={16} />
                <span>Appearance</span>
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
