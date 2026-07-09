import React from "react";
import {
  XIcon,
  HomeIcon,
  HomeFillIcon,
  TableIcon,
  GitPullRequestIcon,
  BookmarkIcon,
  CommentDiscussionIcon,
  ZapIcon,
  PlusIcon,
} 
from "@primer/octicons-react";
import "./Sidebar.css";
import logo from "../assets/logo light.png"

const NAV_ITEMS = [
  { label: "Home", icon: HomeIcon, activeIcon: HomeFillIcon },
  { label: "Projects", icon: TableIcon },
  { label: "Requests", icon: GitPullRequestIcon },
  { label: "Saved", icon: BookmarkIcon },
  { label: "Copilot", icon: CommentDiscussionIcon },
  { label: "Spark", icon: ZapIcon },
];

const TOP_SKILLS = [
  { name: "Skill 1", color: "#3fb950" },
  { name: "Skill 2", color: "#1f6feb" },
  { name: "Skill 3", color: "#8957e5" },
  { name: "Skill 4", color: "#d29922" },
];

const TOP_PROJECTS = [
  { name: "Project 1", color: "#3fb950" },
  { name: "Project 2", color: "#1f6feb" },
  { name: "Project 3", color: "#d29922" },
];

function Sidebar({ isOpen, onClose, currentPage, onNavigate }) {
  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      {/* Header */}
      <div className="sidebar__header">
        <div className="sidebar__logo">

          <img
            className="topnav__logo"
            src={logo}
            width="28"
            height="40"
            alt="Logo"
          />
        
        <span className="sidebar__the-lore">The Lore</span>

        </div>
        
        <button className="sidebar__close" onClick={onClose} aria-label="Close sidebar">
          <XIcon size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.label;
          const Icon =
            isActive && item.activeIcon ? item.activeIcon : item.icon;
          return (
            <button
              key={item.label}
              className={`sidebar__nav-item ${isActive ? "sidebar__nav-item--active" : ""}`}
              onClick={() => onNavigate(item.label)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar__divider" />

      {/* Top Skills */}
      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <span className="sidebar__section-title">Top Skills</span>
          <button
            className="sidebar__section-btn"
            aria-label="Add skill"
            onClick={() => onNavigate("Add Skill")}
          >
            <PlusIcon size={16} />
          </button>
        </div>
        <ul className="sidebar__list">
          {TOP_SKILLS.map((s) => (
            <li key={s.name} className="sidebar__list-item">
              <span
                className="sidebar__dot"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.name}</span>
            </li>
          ))}
          <li className="sidebar__show-more">Show more</li>
        </ul>
      </div>

      <div className="sidebar__divider" />

      {/* Top Projects */}
      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <span className="sidebar__section-title">Top Projects</span>
          <button className="sidebar__section-btn" aria-label="Add project">
            <PlusIcon size={16} />
          </button>
        </div>
        <ul className="sidebar__list">
          {TOP_PROJECTS.map((p) => (
            <li key={p.name} className="sidebar__list-item">
              <span
                className="sidebar__dot"
                style={{ backgroundColor: p.color }}
              />
              <span>{p.name}</span>
            </li>
          ))}
          <li className="sidebar__show-more">Show more</li>
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;