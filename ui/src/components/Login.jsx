// ============================================================================
// Login.jsx
// ----------------------------------------------------------------------------
// The screen shown when nobody is signed in. Its core job is a single button
// that kicks off the Microsoft sign-in. It does NOT collect a username or
// password itself (that's the whole point of OAuth: the user types their
// credentials on Microsoft's page, never on ours).
//
// Around that button we wrap a small landing page: a hero that explains what
// The Lore is, what a "skill" is, the kinds of skills you'll find, and a few
// fun stats — so the first thing people see isn't just a bare button.
// ============================================================================

import { useState } from "react";
// useMsal is a React hook that gives us the shared MSAL engine (from the
// MsalProvider in main.jsx) so we can trigger login from this component.
import { useMsal } from "@azure/msal-react";
// The logo image. Vite turns this import into a usable URL at build time.
import logo from "../assets/logo light.png";
// The scopes/permissions object we defined in authConfig.js.
import { loginRequest } from "../authConfig";
import { TEAMS_CHAT_URL } from "../config";
import "./Login.css";

// The categories of skills people can discover, shown as playful chips so the
// login screen actually says what The Lore is full of.
const SKILL_CATEGORIES = [
  { emoji: "📝", label: "Writing" },
  { emoji: "💻", label: "Coding" },
  { emoji: "📊", label: "Data" },
  { emoji: "🗓️", label: "Meetings" },
  { emoji: "🗺️", label: "Planning" },
  { emoji: "🎨", label: "Design" },
];

// Short "what is a skill" explainers. Keeps the hero from being one big wall of
// text and gives each idea room to breathe.
const HIGHLIGHTS = [
  {
    emoji: "🧩",
    title: "Bite-sized know-how",
    desc: "A skill is a small, reusable unit of AI knowledge, think of it like a prompt, workflow, or agent config you can grab and run.",
  },
  {
    emoji: "🔍",
    title: "Discover fast",
    desc: "Describe what you're trying to do and get a ranked list of skills that already solve it. No reinventing the wheel.",
  },
  {
    emoji: "🚀",
    title: "Share yours",
    desc: "Package a workflow that works for you and pass it to the whole team in a couple of clicks.",
  },
];

// Fun little stat strip. Numbers are illustrative for the prototype.
const STATS = [
  { value: "6+", label: "Categories" },
  { value: "1-click", label: "To reuse" },
  { value: "∞", label: "Ideas to share" },
];

function Login() {
  // Pull `instance` (the MSAL engine) out of the hook. The { } is object
  // destructuring: useMsal() returns an object and we grab just that field.
  const { instance } = useMsal();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Runs when the user clicks the sign-in button.
  const handleSignIn = () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    // loginRedirect navigates THIS SAME TAB to Microsoft, then Microsoft sends
    // the user back to our redirectUri. We chose redirect over popup because a
    // popup relies on window.opener messaging, which browsers (COOP) sever when
    // the popup visits Microsoft's domain, leaving it stuck open. Redirect has
    // no second window, so nothing to sever. The result is read automatically
    // by MsalProvider on return, which flips useIsAuthenticated() to true.
    // .catch handles the rare case the redirect call itself throws.
    instance.loginRedirect(loginRequest).catch((error) => {
      console.error("Sign-in failed:", error);
      setIsSigningIn(false);
    });
  };

  return (
    <div className="login">
      <div className="login__grid">
        {/* ---- Left: the story / what is The Lore ---- */}
        <section className="login__hero">
          <span className="login__badge">✨ Your team&rsquo;s AI skill library</span>

          <h1 className="login__title">
            Welcome to <span className="login__title-accent">The Lore</span>
          </h1>

          <p className="login__subtitle">
            Discover, reuse, and share AI <strong>skills</strong> across your
            team.
          </p>

          <div className="login__chips">
            {SKILL_CATEGORIES.map((cat) => (
              <span className="login__chip" key={cat.label}>
                <span aria-hidden="true">{cat.emoji}</span> {cat.label}
              </span>
            ))}
          </div>

          <ul className="login__highlights">
            {HIGHLIGHTS.map((item) => (
              <li className="login__highlight" key={item.title}>
                <span className="login__highlight-emoji" aria-hidden="true">
                  {item.emoji}
                </span>
                <div>
                  <h3 className="login__highlight-title">{item.title}</h3>
                  <p className="login__highlight-desc">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="login__stats">
            {STATS.map((stat) => (
              <div className="login__stat" key={stat.label}>
                <span className="login__stat-value">{stat.value}</span>
                <span className="login__stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Right: the actual sign-in card ---- */}
        <section className="login__card">
          <img
            className="login__logo"
            src={logo}
            width="130"
            height="180"
            alt="The Lore logo"
          />

          <h2 className="login__card-title">Ready to dive in?</h2>
          <p className="login__card-subtitle">
            Sign in with your Microsoft account to start exploring skills.
          </p>

          <button
            type="button"
            className="login__button"
            onClick={handleSignIn}
            disabled={isSigningIn}
          >
            <MicrosoftLogo />
            {isSigningIn ? "Redirecting…" : "Sign in with Microsoft"}
          </button>

          <p className="login__fineprint">
            Want to know more before signing into the lore?
            <br />
            <a
              href={TEAMS_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Join our Teams chat
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

// Tiny inline Microsoft 4-square logo so the button reads as an official
// sign-in without pulling in an image asset.
function MicrosoftLogo() {
  return (
    <svg
      className="login__ms-logo"
      width="18"
      height="18"
      viewBox="0 0 21 21"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default Login;
