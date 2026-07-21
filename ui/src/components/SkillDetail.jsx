import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeftIcon, DownloadIcon, CopyIcon, CheckIcon, StarIcon, StarFillIcon, PencilIcon, EyeIcon, ZapIcon } from "@primer/octicons-react";
import { getSkill, recordEvent, getSkillMetrics } from "../api";
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

function SkillDetail({ skillId, onBack, onEdit, userId }) {
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Tracks the little "Copied!" confirmation after the copy button is pressed.
  const [copied, setCopied] = useState(false);
  // Global usage counts { views, uses, favorites } for this skill.
  const [metrics, setMetrics] = useState(null);
  // Guards against double-logging a view (React StrictMode invokes effects twice
  // in dev); we only record one view per distinct skill open.
  const viewedRef = useRef(null);
  // Whether this skill is starred. Seeded from localStorage, and re-checked if
  // we switch to a different skill.
  const [favorited, setFavorited] = useState(() => isFavorite(skillId));

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorited(isFavorite(skillId));
  }, [skillId]);

  // On each open: load the current counts and log one view (every open counts).
  useEffect(() => {
    let active = true;
    getSkillMetrics(skillId)
      .then((m) => active && setMetrics(m))
      .catch(() => {});
    if (viewedRef.current !== skillId) {
      viewedRef.current = skillId;
      recordEvent(skillId, "view", userId);
      setMetrics((m) => (m ? { ...m, views: m.views + 1 } : m));
    }
    return () => {
      active = false;
    };
  }, [skillId, userId]);

  // Star/unstar this skill. toggleFavorite saves to localStorage and returns the
  // new list, so we just check whether this id is still in it. We also log the
  // toggle so the global favorite count stays accurate.
  function handleToggleFavorite() {
    const nowFav = toggleFavorite(skillId).includes(skillId);
    setFavorited(nowFav);
    recordEvent(skillId, nowFav ? "favorite" : "unfavorite", userId);
    setMetrics((m) =>
      m ? { ...m, favorites: Math.max(0, m.favorites + (nowFav ? 1 : -1)) } : m
    );
  }

  // Copy the skill's body (the actual prompt/instructions) to the clipboard,
  // then flash "Copied!" for a couple of seconds. navigator.clipboard can reject
  // (e.g. missing permission), so we swallow that quietly rather than crash.
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(skill?.body || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      recordEvent(skillId, "use", userId);
      setMetrics((m) => (m ? { ...m, uses: m.uses + 1 } : m));
    } catch {
      // Clipboard unavailable — nothing we can do, so stay silent.
    }
  }

  // Download the skill as markdown, and count it as a "use" like copy.
  function handleDownload() {
    downloadSkill(skill);
    recordEvent(skillId, "use", userId);
    setMetrics((m) => (m ? { ...m, uses: m.uses + 1 } : m));
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
                  onClick={handleDownload}
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
            {metrics && (
              <div className="skill-detail__metrics">
                <span className="skill-detail__metric" title="Times opened">
                  <EyeIcon size={14} /> {metrics.views}{" "}
                  {metrics.views === 1 ? "view" : "views"}
                </span>
                <span className="skill-detail__metric" title="Times copied or downloaded">
                  <ZapIcon size={14} /> {metrics.uses}{" "}
                  {metrics.uses === 1 ? "use" : "uses"}
                </span>
                <span className="skill-detail__metric" title="People who favorited">
                  <StarFillIcon size={14} /> {metrics.favorites}
                </span>
              </div>
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
