import React, { useState, useEffect } from "react";
import {
  XIcon,
  HomeIcon,
  HomeFillIcon,
  StarIcon,
  PlusIcon,
} 
from "@primer/octicons-react";
import "./Sidebar.css";
import logo from "../assets/logo light.png"
import { getMySkills, getMyHistory } from "../api";

const NAV_ITEMS = [
  { label: "Home", icon: HomeIcon, activeIcon: HomeFillIcon },
  { label: "Add Skill", icon: PlusIcon },
  { label: "Favorited", icon: StarIcon },
];

function Sidebar({ isOpen, onClose, currentPage, onNavigate, userId, onOpenSkill }) {
  // Skills you authored + skills you've recently engaged with, from the backend.
  const [created, setCreated] = useState([]);
  const [recent, setRecent] = useState([]);

  // Refresh whenever the sidebar opens so newly created/used skills show up.
  useEffect(() => {
    if (!isOpen || !userId) return;
    let active = true;
    getMySkills(userId)
      .then((list) => active && setCreated(Array.isArray(list) ? list : []))
      .catch(() => {});
    getMyHistory(userId)
      .then((events) => {
        if (!active) return;
        // Collapse the event log to distinct skills, newest first.
        const seen = new Set();
        const distinct = [];
        for (const e of events || []) {
          if (!seen.has(e.skill_id)) {
            seen.add(e.skill_id);
            distinct.push({ id: e.skill_id, name: e.name });
          }
        }
        setRecent(distinct.slice(0, 6));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, userId]);

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

      {/* Skills you created */}
      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <span className="sidebar__section-title">Created by you</span>
        </div>
        {created.length === 0 ? (
          <p className="sidebar__empty">Skills you add show up here.</p>
        ) : (
          <ul className="sidebar__list">
            {created.slice(0, 6).map((s) => (
              <li key={s.id}>
                <button
                  className="sidebar__skill"
                  onClick={() => onOpenSkill?.(s.id)}
                  title={s.description || s.name}
                >
                  <span className="sidebar__dot" style={{ backgroundColor: "#8957e5" }} />
                  <span className="sidebar__skill-name">{s.name || s.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sidebar__divider" />

      {/* Skills you've recently opened or used */}
      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <span className="sidebar__section-title">Recently used</span>
        </div>
        {recent.length === 0 ? (
          <p className="sidebar__empty">Open a skill and it lands here.</p>
        ) : (
          <ul className="sidebar__list">
            {recent.map((s) => (
              <li key={s.id}>
                <button
                  className="sidebar__skill"
                  onClick={() => onOpenSkill?.(s.id)}
                  title={s.name}
                >
                  <span className="sidebar__dot" style={{ backgroundColor: "#1f6feb" }} />
                  <span className="sidebar__skill-name">{s.name || s.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;