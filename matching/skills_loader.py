"""Loads skill definitions from markdown files (frontmatter + body).

Two sources, same format:
- data/skills/         -> our M365 intern skills   (source="m365")
- data/skills-catalog/ -> imported catalog skills  (source="catalog")

Files prefixed with '_' are ignored.
"""

from pathlib import Path

import frontmatter

DATA_DIR = Path(__file__).parent.parent / "data"
SKILLS_DIR = DATA_DIR / "skills"
CATALOG_DIR = DATA_DIR / "skills-catalog"


def _load_folder(folder: Path, source: str) -> list:
    skills = []
    for path in folder.glob("*.md"):
        if path.name.startswith("_"):
            continue
        post = frontmatter.load(path)
        skills.append({
            "id": post.metadata.get("id", path.stem),
            "name": post.metadata.get("name", path.stem),
            "description": post.metadata.get("description", ""),
            "body": post.content,
            "source": source,
        })
    return skills


def load_skills() -> list:
    return _load_folder(SKILLS_DIR, "m365") + _load_folder(CATALOG_DIR, "catalog")
