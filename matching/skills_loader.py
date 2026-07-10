"""Loads and saves skill definitions.

Primary store is Cosmos DB. For local development without cloud credentials
(no COSMOS_KEY set), it transparently falls back to markdown files in
data/skills/ so the app runs fully offline.
"""

import os
import re
from pathlib import Path

import frontmatter

SKILLS_DIR = Path(__file__).parent.parent / "data" / "skills"

# A valid id is kebab-case: lowercase letters/digits separated by single hyphens.
# We enforce this so a skill id can NEVER turn into a path like "../secrets".
_ID_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")

# Use Cosmos only when a key is configured. Otherwise fall back to local files.
# (The Entra/RBAC path needs azure-identity, which isn't installed for local dev.)
_USE_COSMOS = bool(os.environ.get("COSMOS_KEY"))


# --- Local markdown store (offline fallback) -------------------------------
def _load_skills_local() -> list:
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


def _unique_path(skill_id: str):
    """Return a (final_id, path) that isn't taken yet (auto-suffix on collision)."""
    candidate = skill_id
    n = 2
    path = SKILLS_DIR / f"{candidate}.md"
    while path.exists():
        candidate = f"{skill_id}-{n}"
        path = SKILLS_DIR / f"{candidate}.md"
        n += 1
    return candidate, path


def _save_skill_local(skill: dict) -> dict:
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


# --- Cosmos store (primary) ------------------------------------------------
def _load_skills_cosmos() -> list:
    from cosmos_client import get_container
    container = get_container()
    items = container.query_items(
        query="SELECT c.id, c.name, c.description, c.body, c.created_by FROM c",
        enable_cross_partition_query=True,
    )
    return [
        {
            "id": item["id"],
            "name": item.get("name", item["id"]),
            "description": item.get("description", ""),
            "body": item.get("body", ""),
            "created_by": item.get("created_by"),
        }
        for item in items
    ]


def _unique_id(container, skill_id: str) -> str:
    """Return an id that isn't taken yet (auto-suffix -2, -3, ... on collision)."""
    from azure.cosmos.exceptions import CosmosResourceNotFoundError
    candidate = skill_id
    n = 2
    while True:
        try:
            container.read_item(item=candidate, partition_key=candidate)
        except CosmosResourceNotFoundError:
            return candidate  # free
        candidate = f"{skill_id}-{n}"
        n += 1


def _save_skill_cosmos(skill: dict) -> dict:
    from cosmos_client import get_container
    container = get_container()
    base_id = _safe_id(skill.get("id", ""))
    skill_id = _unique_id(container, base_id)

    doc = {
        "id": skill_id,
        "name": skill.get("name") or skill_id,
        "description": skill.get("description", ""),
        "body": skill.get("body", ""),
        "created_by": skill.get("created_by"),        # anonymous username, if known
        "created_by_id": skill.get("created_by_id"),  # stable author key, for future lookups
    }
    container.create_item(doc)

    return {
        "id": doc["id"],
        "name": doc["name"],
        "description": doc["description"],
        "body": doc["body"],
        "created_by": doc["created_by"],
    }


def _safe_id(skill_id: str) -> str:
    """Return a validated kebab-case id, or raise ValueError.

    This is the security gate: the id becomes a filename / document key, so we
    refuse anything that isn't plain kebab-case (no slashes, dots, traversal).
    """
    cleaned = (skill_id or "").strip().lower()
    if not _ID_PATTERN.fullmatch(cleaned):
        raise ValueError(
            f"invalid skill id {skill_id!r}; use kebab-case (a-z, 0-9, hyphens)"
        )
    return cleaned


# --- Public API (dispatches to Cosmos or local) ----------------------------
def load_skills() -> list:
    """Read every skill from the active store (Cosmos, or local markdown)."""
    return _load_skills_cosmos() if _USE_COSMOS else _load_skills_local()


def save_skill(skill: dict) -> dict:
    """Persist a skill to the active store and return the normalized skill.

    Raises ValueError if the id is invalid. If the id is already taken it is
    auto-suffixed so the save never overwrites an existing skill.
    """
    return _save_skill_cosmos(skill) if _USE_COSMOS else _save_skill_local(skill)
