import { PlayIcon } from "@primer/octicons-react";
import "./HomePage.css";

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

function HomePage({ onDiscoverSkills, onAddSkills }) {
  return (
    <div className="homepage">
      {/* Welcome Card */}
      <div className="homepage__welcome">
        <h1 className="homepage__welcome-heading">
          <span role="img" aria-label="wave">👋</span> Welcome back, User!
        </h1>
        <p className="homepage__welcome-text">
          Here&rsquo;s what&rsquo;s happening across your skills and projects.
          Explore new workflows, manage your requests, and stay up to date with
          your team&rsquo;s latest contributions.
        </p>
      </div>

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