import React from "react";
import "./Footer.css";

const LINKS = [
  "Terms",
  "Privacy",
  "Security",
  "Status",
  "Docs",
  "Contact",
  "Manage cookies",
  "Do not share my personal information",
];

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__top">
          <svg
            className="footer__logo"
            width="24"
            height="24"
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M16 2L28 9.5V22.5L16 30L4 22.5V9.5L16 2Z"
              stroke="#7d8590"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M16 8L22 11.5V18.5L16 22L10 18.5V11.5L16 8Z"
              fill="#7d8590"
            />
          </svg>
          <ul className="footer__links">
            {LINKS.map((link) => (
              <li key={link}>
                <a href="#" className="footer__link">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer__bottom">
          <span>&copy; 2026 Microsoft Corporation</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;