"""Loads and saves skill definitions as markdown files (frontmatter + body).

Reads every .md in data/skills/. Files prefixed with '_' are ignored.
"""

import re
from pathlib import Path

import frontmatter

SKILLS_DIR = Path(__file__).parent.parent / "data" / "skills"

# A valid id is kebab-case: lowercase letters/digits separated by single hyphens.
# We enforce this so a skill id can NEVER turn into a path like "../secrets".
_ID_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def load_skills() -> list:
    skills = []
    for path in SKILLS_DIR.glob("*.md"):
        if path.name.startswith("_"):
            continue
        post = frontmatter.load(path)
        skills.append({
            "id": post.metadata.get("id", path.stem),
            "name": post.metadata.get("name", path.stem),
            "description": post.metadata.get("description", ""),
            "body": post.content,
        })
    return skills


def _safe_id(skill_id: str) -> str:
    """Return a validated kebab-case id, or raise ValueError.

    This is the security gate: the id becomes a filename, so we refuse anything
    that isn't plain kebab-case (no slashes, dots, or path traversal).
    """
    cleaned = (skill_id or "").strip().lower()
    if not _ID_PATTERN.fullmatch(cleaned):
        raise ValueError(
            f"invalid skill id {skill_id!r}; use kebab-case (a-z, 0-9, hyphens)"
        )
    return cleaned


def _unique_path(skill_id: str):
    """Return a (final_id, path) that isn't taken yet.

    If 'meeting-notes' already exists, returns 'meeting-notes-2', then -3, etc.
    This guarantees a save always succeeds without overwriting anything.
    """
    candidate = skill_id
    n = 2
    path = SKILLS_DIR / f"{candidate}.md"
    while path.exists():
        candidate = f"{skill_id}-{n}"
        path = SKILLS_DIR / f"{candidate}.md"
        n += 1
    return candidate, path


def save_skill(skill: dict) -> dict:
    """Write a skill to data/skills/<id>.md and return the normalized skill.

    Raises ValueError if the id is invalid. If the id is already taken, it is
    auto-suffixed (e.g. 'meeting-notes-2') so the save never fails; the returned
    skill carries the final id that was actually used.
    """
    base_id = _safe_id(skill.get("id", ""))
    skill_id, path = _unique_path(base_id)

    post = frontmatter.Post(
        skill.get("body", ""),
        id=skill_id,
        name=skill.get("name") or skill_id,
        description=skill.get("description", ""),
    )
    SKILLS_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(frontmatter.dumps(post), encoding="utf-8")

    return {
        "id": skill_id,
        "name": post.metadata["name"],
        "description": post.metadata["description"],
        "body": post.content,
    }
