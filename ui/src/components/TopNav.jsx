import React from "react";
import { ThreeBarsIcon, SearchIcon, PersonIcon } from "@primer/octicons-react";
import logo from "../assets/logo light.png";
import "./TopNav.css";

function TopNav({ onMenuClick, currentPage }) {
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
        <button className="topnav__avatar" aria-label="Profile">
          <PersonIcon size={20} />
        </button>
      </div>
    </header>
  );
}

export default TopNav;