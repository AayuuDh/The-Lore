import React from "react";
import "./Footer.css";
import logo from "../assets/logo light.png"

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
          <img
            className="footer__logo"
            src={logo}
            width="28"
            height="40"
            alt="Logo"
          />
          
          <span className = "footer__copyright">&copy; 2026 Microsoft Corporation</span>
        </div>

      </div>
    </footer>
  );
}

export default Footer;