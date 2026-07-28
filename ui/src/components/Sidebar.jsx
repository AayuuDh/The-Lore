import { useState, useEffect } from "react";
import {
  HomeIcon,
  HomeFillIcon,
  StarIcon,
  PlusIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} 
from "@primer/octicons-react";
import "./Sidebar.css";
import logo from "../assets/New_logo_Key_lore.png"
import { getMySkills, getMyHistory, getSkills } from "../api";
import { getFavorites } from "../favorites";
import { getCategory, getCategoryColor } from "../categories";

const SEEN_KEY = "sidebar.seen";

function loadSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY)) || {};
  } catch {
    return {};
  }
}

const NAV_ITEMS = [
  { label: "Home", icon: HomeIcon, activeIcon: HomeFillIcon },
  { label: "Add Skill", icon: PlusIcon },
  { label: "Favorited", icon: StarIcon },
];

function Sidebar({ isOpen, currentPage, onNavigate, userId, onOpenSkill }) {
  // The three lists: skills you made, favorited, and recently used.
  const [yours, setYours] = useState([]);
  const [favs, setFavs] = useState([]);
  const [recent, setRecent] = useState([]);
  // Which sections are expanded.
  const [open, setOpen] = useState({ yours: true, favs: true, recent: true });
  // Ids the user has already seen per section — drives the "new" dot.
  const [seen, setSeen] = useState(loadSeen);

  // Refresh whenever the sidebar opens so new skills/activity show up.
  useEffect(() => {
    if (!isOpen || !userId) return;
    let active = true;
    Promise.all([
      getSkills().catch(() => []),
      getMySkills(userId).catch(() => []),
      getMyHistory(userId).catch(() => []),
    ]).then(([all, created, history]) => {
      if (!active) return;
      // id -> full skill, so favorites/recent get names + categories too.
      const map = {};
      (all || []).forEach((s) => {
        map[s.id] = s;
      });

      setYours((created || []).map((s) => map[s.id] || s));

      const favIds = getFavorites();
      setFavs(favIds.map((id) => map[id]).filter(Boolean));

      const seenIds = new Set();
      const distinct = [];
      for (const e of history || []) {
        if (!seenIds.has(e.skill_id)) {
          seenIds.add(e.skill_id);
          distinct.push(map[e.skill_id] || { id: e.skill_id, name: e.name });
        }
      }
      setRecent(distinct.slice(0, 8));
    });
    return () => {
      active = false;
    };
  }, [isOpen, userId]);

  // Mark a section's items as seen (clears its "new" dot) and remember it.
  function markSeen(key, ids) {
    setSeen((prev) => {
      const next = { ...prev, [key]: ids };
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function toggleSection(key, items) {
    setOpen((o) => {
      const nowOpen = !o[key];
      if (nowOpen) markSeen(key, items.map((i) => i.id));
      return { ...o, [key]: nowOpen };
    });
  }

  // A section has "new" content if it holds an id the user hasn't seen there.
  function hasNew(key, items) {
    const known = seen[key] || [];
    return items.some((i) => !known.includes(i.id));
  }

  // One collapsible, chevron-headed section with a "new" dot and color-coded
  // skill dots (colored by the skill's category).
  function renderSection(key, title, items, emptyAction) {
    const expanded = open[key];
    return (
      <div className="sidebar__section" key={key}>
        <button
          className="sidebar__section-header"
          onClick={() => toggleSection(key, items)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
          <span className="sidebar__section-title">{title}</span>
          {hasNew(key, items) && <span className="sidebar__new-dot" title="New" />}
        </button>
        {expanded &&
          (items.length === 0 ? (
            <button
              className="sidebar__empty-link"
              onClick={() => onNavigate(emptyAction.page)}
            >
              {emptyAction.icon}
              <span>{emptyAction.label}</span>
            </button>
          ) : (
            <ul className="sidebar__list">
              {items.map((s) => (
                <li key={s.id}>
                  <button
                    className="sidebar__skill"
                    onClick={() => onOpenSkill?.(s.id)}
                    title={s.description || s.name}
                  >
                    <span
                      className="sidebar__dot"
                      style={{ backgroundColor: getCategoryColor(getCategory(s)) }}
                    />
                    <span className="sidebar__skill-name">{s.name || s.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
      </div>
    );
  }

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      {/* Header */}
      <div className="sidebar__header">
        <div className="sidebar__logo">

          <img
            className="topnav__logo"
            src={logo}
            width="25"
            height="45"
            alt="Logo"
          />
        
        <span className="sidebar__the-lore">The Lore</span>

        </div>

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

      {renderSection("yours", "My Skills", yours, { label: "Create a new skill", page: "Add Skill", icon: <PlusIcon size={12} /> })}
      {renderSection("favs", "Favorites", favs, { label: "Browse skills to favorite", page: "Skills", icon: <ArrowRightIcon size={12} /> })}
      {renderSection("recent", "Recent", recent, { label: "Browse skills", page: "Skills", icon: <ArrowRightIcon size={12} /> })}
    </aside>
  );
}

export default Sidebar;