import "./Footer.css";
import logo from "../assets/New_logo_Key_lore.png"
import { TEAMS_CHAT_URL } from "../config";
import { Link } from "react-router-dom";

// Each link needs a real destination in `href`. Links still pointing at the
// placeholder "#" are filtered out below so we don't show dead links.
const LINKS = [
  { label: "About", href: "/about" },
  { label: "Terms", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Security", href: "#" },
  { label: "Status", href: "#" },
  { label: "GitHub", href: "https://github.com/x3-design/the-lore" },
  { label: "Contact Us", href: TEAMS_CHAT_URL },
  { label: "Manage cookies", href: "#" },
  { label: "Do not share my personal information", href: "#" },
];

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__top">

          <ul className="footer__links">
              
             
            {LINKS.filter((link) => link.href !== "#").map((link) => (
              <li key={link.label}>
                {link.href.startsWith("/") ? (
                  <Link to={link.href} className="footer__link">
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    className="footer__link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}

          </ul>
        </div>
        
        <div className="footer__bottom">
          <img
            className="footer__logo"
            src={logo}
            width="24"
            height="45"
            alt="Logo"
          />
          
          <span className = "footer__copyright">&copy; 2026 Microsoft Corporation</span>
        </div>

      </div>
    </footer>
  );
}

export default Footer;