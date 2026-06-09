import React from "react";
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

function HomePage({ onDiscoverSkills }) {
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
            return (
              <div
                key={tip.title}
                className={`homepage__tip-card${isDiscover ? " homepage__tip-card--action" : ""}`}
                onClick={isDiscover ? onDiscoverSkills : undefined}
                role={isDiscover ? "button" : undefined}
                tabIndex={isDiscover ? 0 : undefined}
                onKeyDown={
                  isDiscover
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onDiscoverSkills?.();
                        }
                      }
                    : undefined
                }
              >
                <span className="homepage__tip-emoji">{tip.emoji}</span>
                <h3 className="homepage__tip-title">{tip.title}</h3>
                <p className="homepage__tip-desc">{tip.desc}</p>
                {isDiscover && (
                  <span className="homepage__tip-cta">Explore skills →</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Discover Skills primary button */}
      <section className="homepage__discover">
        
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

      {/* This was for the buttons but since we removed it, we are just keeping the code for reference. */}
      {/* CTA Buttons
      <div className="homepage__cta">
        <button className="homepage__cta-btn homepage__cta-btn--primary">
          Browse Skills
        </button>
        <button className="homepage__cta-btn homepage__cta-btn--secondary">
          Add Skills
        </button>
      </div> */}
    </div>
  );
}

export default HomePage;