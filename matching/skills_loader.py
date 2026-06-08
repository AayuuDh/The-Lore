"""Loads skill definitions from markdown files (frontmatter + body).

Reads every .md in data/skills/. Files prefixed with '_' are ignored.
"""

from pathlib import Path

import frontmatter

SKILLS_DIR = Path(__file__).parent.parent / "data" / "skills"


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
