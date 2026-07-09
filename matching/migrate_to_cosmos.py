"""One-time seed: copy every data/skills/*.md into Cosmos.

Run once after the container exists:  py migrate_to_cosmos.py
Safe to re-run (upsert overwrites by id, never duplicates).
"""

from pathlib import Path
import frontmatter

from cosmos_client import get_container

SKILLS_DIR = Path(__file__).parent.parent / "data" / "skills"


def main():
    container = get_container()
    count = 0
    for path in SKILLS_DIR.glob("*.md"):
        if path.name.startswith("_"):
            continue
        post = frontmatter.load(path)
        doc = {
            "id": post.metadata.get("id", path.stem),
            "name": post.metadata.get("name", path.stem),
            "description": post.metadata.get("description", ""),
            "body": post.content,
            "created_by": None,
        }
        container.upsert_item(doc)
        count += 1
    print(f"Migrated {count} skills into Cosmos.")


if __name__ == "__main__":
    main()