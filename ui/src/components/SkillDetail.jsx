import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeftIcon, DownloadIcon } from "@primer/octicons-react";
import { getSkill } from "../api";
import "./SkillDetail.css";

// Rebuild the original markdown file (YAML frontmatter + body) from a skill.
function buildSkillMarkdown(skill) {
  const escapeYaml = (value) =>
    `"${String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

  const frontmatter = [
    "---",
    `id: ${skill.id ?? ""}`,
    `name: ${escapeYaml(skill.name)}`,
    `description: ${escapeYaml(skill.description)}`,
    `owner: ${escapeYaml(skill.owner ?? "")}`,
    "---",
  ].join("\n");

  const body = (skill.body || "").trim();
  return `${frontmatter}\n\n${body}\n`;
}

function downloadSkill(skill) {
  const markdown = buildSkillMarkdown(skill);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${skill.id || skill.name || "skill"}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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
            <div className="skill-detail__header-top">
              <h1 className="skill-detail__title">{skill.name || skill.id}</h1>
              <button
                className="skill-detail__download"
                onClick={() => downloadSkill(skill)}
                title="Download this skill as a Markdown file"
              >
                <DownloadIcon size={16} />
                <span>Download .md</span>
              </button>
            </div>
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
