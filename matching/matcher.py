"""Matching logic: user query -> ranked list of skills.

Knows about vectors and ranking. Does NOT know how vectors are produced
(that lives in embeddings.py).
"""

import math

from embeddings import embed
from skills_loader import load_skills


def skill_to_text(skill: dict) -> str:
    return " ".join([
        skill["name"],
        skill["problem"],
        skill["when_to_use"],
        " ".join(skill["tags"]),
        " ".join(skill["use_cases"]),
    ])


def cosine_similarity(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b)) / (
        math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(x * x for x in b))
    )


def precompute_skill_vectors(skills: list) -> list:
    """Attach a 'vector' field to each skill in place. Returns the same list."""
    for skill in skills:
        skill["vector"] = embed(skill_to_text(skill))
    return skills


def match(query: str, skills_with_vectors: list, top_k: int = 10) -> list:
    """Return top_k (skill, score) tuples ranked by cosine similarity to query."""
    query_vec = embed(query)
    scored = [
        (skill, cosine_similarity(skill["vector"], query_vec))
        for skill in skills_with_vectors
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored[:top_k]


if __name__ == "__main__":
    skills = precompute_skill_vectors(load_skills())
    query = "i want to condense my long meetings to notes for summary"
    matched = match(query, skills)
    best_skill, best_score = matched[0]
    print(f"best match: {best_skill['id']} (score {best_score:.3f})")
