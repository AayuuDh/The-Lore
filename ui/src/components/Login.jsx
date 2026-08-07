// ============================================================================
// Login.jsx
// ----------------------------------------------------------------------------
// The screen shown before a visitor starts a local session. It intentionally
// collects no credentials: the button simply continues into the app.
//
// Around that button we wrap a small landing page: a hero that explains what
// The Lore is, what a "skill" is, the kinds of skills you'll find, and a few
// fun stats — so the first thing people see isn't just a bare button.
// ============================================================================

// The logo image. Vite turns this import into a usable URL at build time.
import logo from "../assets/New_logo_Key_lore.png";
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

function Login({ onLogin }) {
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
            width="200"
            height="380"
            alt="The Lore logo"
          />

          <h2 className="login__card-title">Ready to dive in?</h2>
          <p className="login__card-subtitle">
            Continue to start exploring skills. No account is required.
          </p>

          <button
            type="button"
            className="login__button"
            onClick={onLogin}
          >
            Continue
          </button>

          <p className="login__fineprint">
            Your profile is stored locally for this browser.
          </p>
        </section>
      </div>
    </div>
  );
}

export default Login;
