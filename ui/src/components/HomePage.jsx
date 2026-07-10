import { PlayIcon } from "@primer/octicons-react";
import { getRecentlyViewed, getMostViewed } from "../recentlyViewed";
import { getAchievements, getAchievementSummary } from "../achievements";
import "./HomePage.css";

// Trim a long backend description down to a short, card-friendly snippet.
function shortDescription(description = "") {
  const clean = description.trim();
  if (!clean) return "No description available.";
  return clean.length > 120 ? `${clean.slice(0, 120).trimEnd()}…` : clean;
}

const TIPS = [
  {
    emoji: "🔍",
    title: "Discover Skills",
    desc: "Browse our catalog of skills and workflows to supercharge your productivity.",
  },
  {
    emoji: "🚀",
    title: "Upload skills",
    desc: "Add our own skills to your collection or to public repositories.",
  },
  {
    emoji: "🤝",
    title: "Collaborate",
    desc: "Share and discover skills with your team to build better solutions together.",
  },
];

function HomePage({ onDiscoverSkills, onAddSkills, onOpenSkill, username }) {
  // Read the recently-opened skills once when the home page renders. It remounts
  // every time you navigate back here, so this stays in sync without extra work.
  const recent = getRecentlyViewed();
  // Badges, computed live from your favorites/streak/views.
  const achievements = getAchievements();
  const achievementSummary = getAchievementSummary();
  // Your most-opened skills. Only worth a whole row once there's some history,
  // otherwise it just duplicates "Jump back in".
  const topSkills = getMostViewed(6);
  const showTopSkills = topSkills.length >= 3;

  return (
    <div className="homepage">
      {/* Welcome Card */}
      <div className="homepage__welcome">
        <h1 className="homepage__welcome-heading">
          <span role="img" aria-label="wave">👋</span> Welcome back, {username || "User"}!
        </h1>
        <p className="homepage__welcome-text">
          Here&rsquo;s what&rsquo;s happening across your skills and projects.
          Explore new workflows, manage your requests, and stay up to date with
          your team&rsquo;s latest contributions.
        </p>
      </div>

      {/* Jump back in — only shown once you've opened at least one skill. */}
      {recent.length > 0 && (
        <section className="homepage__recent">
          <h2 className="homepage__section-title">Jump back in</h2>
          <div className="homepage__recent-row">
            {recent.map((skill) => (
              <button
                key={skill.id}
                className="homepage__recent-card"
                onClick={() => onOpenSkill?.(skill.id)}
              >
                <h3 className="homepage__recent-title">{skill.name}</h3>
                <p className="homepage__recent-desc">
                  {shortDescription(skill.description)}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Achievements — earned badges are bright, locked ones are dimmed. */}
      <section className="homepage__achievements">
        <h2 className="homepage__section-title">
          Achievements{" "}
          <span className="homepage__achievements-count">
            {achievementSummary.earned} / {achievementSummary.total}
          </span>
        </h2>
        <div className="homepage__badges-grid">
          {achievements.map((badge) => (
            <div
              key={badge.id}
              className={`homepage__badge${badge.earned ? " is-earned" : " is-locked"}`}
              title={badge.description}
            >
              <span className="homepage__badge-emoji">{badge.emoji}</span>
              <div className="homepage__badge-text">
                <h3 className="homepage__badge-title">{badge.title}</h3>
                <p className="homepage__badge-desc">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Your top skills — most-opened, only once there's enough history. */}
      {showTopSkills && (
        <section className="homepage__recent">
          <h2 className="homepage__section-title">Your top skills</h2>
          <div className="homepage__recent-row">
            {topSkills.map((skill) => (
              <button
                key={skill.id}
                className="homepage__recent-card"
                onClick={() => onOpenSkill?.(skill.id)}
              >
                <h3 className="homepage__recent-title">{skill.name}</h3>
                <p className="homepage__recent-desc">
                  {shortDescription(skill.description)}
                </p>
                <span className="homepage__recent-count">
                  Opened {skill.count} {skill.count === 1 ? "time" : "times"}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Quick Tips */}
      <section className="homepage__tips">
        <h2 className="homepage__section-title">Quick Tips</h2>
        <div className="homepage__tips-grid">
          {TIPS.map((tip) => {
            const isDiscover = tip.title === "Discover Skills";
            const isUpload = tip.title === "Upload skills";
            const isAction = isDiscover || isUpload;
            const onAction = isDiscover ? onDiscoverSkills : onAddSkills;
            return (
              <div
                key={tip.title}
                className={`homepage__tip-card${isAction ? " homepage__tip-card--action" : ""}`}
                onClick={isAction ? onAction : undefined}
                role={isAction ? "button" : undefined}
                tabIndex={isAction ? 0 : undefined}
                onKeyDown={
                  isAction
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onAction?.();
                        }
                      }
                    : undefined
                }
              >
                <span className="homepage__tip-emoji">{tip.emoji}</span>
                <h3 className="homepage__tip-title">{tip.title}</h3>
                <p className="homepage__tip-desc">{tip.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Demo Video Placeholder */}
      <section className="homepage__demo">
        <h2 className="homepage__section-title">Getting Started</h2>
        <div className="homepage__video-placeholder">
          <div className="homepage__play-btn">
            <PlayIcon size={48} />
          </div>
          <span className="homepage__video-label">Watch Demo</span>
        </div>
      </section>

    </div>
  );
}

export default HomePage;