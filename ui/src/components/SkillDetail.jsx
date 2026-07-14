import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeftIcon, DownloadIcon, CopyIcon, CheckIcon, StarIcon, StarFillIcon, PencilIcon } from "@primer/octicons-react";
import { getSkill } from "../api";
import { isFavorite, toggleFavorite } from "../favorites";
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

function SkillDetail({ skillId, onBack, onEdit }) {
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Tracks the little "Copied!" confirmation after the copy button is pressed.
  const [copied, setCopied] = useState(false);
  // Whether this skill is starred. Seeded from localStorage, and re-checked if
  // we switch to a different skill.
  const [favorited, setFavorited] = useState(() => isFavorite(skillId));

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

  // Keep the star in sync when the skill changes.
  useEffect(() => {
    setFavorited(isFavorite(skillId));
  }, [skillId]);

  // Star/unstar this skill. toggleFavorite saves to localStorage and returns the
  // new list, so we just check whether this id is still in it.
  function handleToggleFavorite() {
    setFavorited(toggleFavorite(skillId).includes(skillId));
  }

  // Copy the skill's body (the actual prompt/instructions) to the clipboard,
  // then flash "Copied!" for a couple of seconds. navigator.clipboard can reject
  // (e.g. missing permission), so we swallow that quietly rather than crash.
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(skill?.body || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — nothing we can do, so stay silent.
    }
  }

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
              <div className="skill-detail__actions">
                {onEdit && (
                  <button
                    className="skill-detail__edit"
                    onClick={() => onEdit(skill)}
                    title="Edit this skill (saves a copy)"
                  >
                    <PencilIcon size={16} />
                    <span>Edit skill</span>
                  </button>
                )}
                <button
                  className={`skill-detail__fav${favorited ? " is-active" : ""}`}
                  onClick={handleToggleFavorite}
                  title={favorited ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={favorited}
                >
                  {favorited ? <StarFillIcon size={16} /> : <StarIcon size={16} />}
                  <span>{favorited ? "Favorited" : "Favorite"}</span>
                </button>
                <button
                  className="skill-detail__copy"
                  onClick={handleCopy}
                  title="Copy this skill's contents to your clipboard"
                >
                  {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
                <button
                  className="skill-detail__download"
                  onClick={() => downloadSkill(skill)}
                  title="Download this skill as a Markdown file"
                >
                  <DownloadIcon size={16} />
                  <span>Download .md</span>
                </button>
              </div>
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
