"""Loads skill definitions from the data/ folder."""

from pathlib import Path
SKILLS_DIR = Path(__file__).parent.parent / "data" / "skills"
import json

def load_skills() -> list:
    result = []
    for path in SKILLS_DIR.glob("*.json"):
      # path is a Path object pointing at one .json file
      if path.name.startswith("_"):
          continue
      with open(path) as f:
          skill = json.load(f)
      result.append(skill)
    return result
      # append skill to your list
            
