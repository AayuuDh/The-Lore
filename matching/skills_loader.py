"""Loads skill definitions from data/skills/*.json (excluding files prefixed with '_')."""

import json
from pathlib import Path

SKILLS_DIR = Path(__file__).parent.parent / "data" / "skills"


def load_skills() -> list:
    skills = []
    for path in SKILLS_DIR.glob("*.json"):
        if path.name.startswith("_"):
            continue
        with open(path) as f:
            skill = json.load(f)
        skills.append(skill)
    return skills
