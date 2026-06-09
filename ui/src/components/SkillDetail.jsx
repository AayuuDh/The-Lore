import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeftIcon } from "@primer/octicons-react";
import { getSkill } from "../api";
import "./SkillDetail.css";

function SkillDetail({ skillId, onBack }) {
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getSkill(skillId)
      .then((data) => active && setSkill(data))
      .catch(() => active && setError("Couldn't load this skill."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [skillId]);

  return (
    <div className="skill-detail">
      <button className="skill-detail__back" onClick={onBack}>
        <ArrowLeftIcon size={16} />
        <span>Back to Skills</span>
      </button>

      {loading && <div className="skill-detail__status">Loading…</div>}
      {error && <div className="skill-detail__error">{error}</div>}

      {skill && (
        <article className="skill-detail__card">
          <header className="skill-detail__header">
            <h1 className="skill-detail__title">{skill.name || skill.id}</h1>
            {skill.description && (
              <p className="skill-detail__summary">{skill.description}</p>
            )}
          </header>

          <div className="skill-detail__divider" />

          <div className="skill-detail__body markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {skill.body || "_No additional details provided._"}
            </ReactMarkdown>
          </div>
        </article>
      )}
    </div>
  );
}

export default SkillDetail;
