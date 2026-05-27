"""Matching logic: user query -> ranked list of skills.

This file only knows about *vectors* and *ranking*. It does NOT know
how the vectors are produced. All embedding logic lives in embeddings.py.

High-level plan:
  1. On startup, embed each skill once (via embed_batch).
  2. On each query, embed the query (via embed) and compute cosine
     similarity against every cached skill vector.
  3. Return the top-K skills sorted by similarity score.
"""

from embeddings import embed, embed_batch  # noqa: F401  (used below once implemented)
from skills_loader import load_skills
# Sample skills for local testing. Real ones will come from data/skills/.
skills = [
    {
        "id": "devils-advocate",
        "name": "Devil's Advocate Reviewer",
        "description": "Pushes back on ideas with critical, adversarial feedback instead of agreeing.",
        "tags": ["critique", "feedback", "review"],
        "use_cases": [
            "Counter yes-man behavior in AI assistants",
            "Stress-test a proposal before sharing it",
            "Challenge assumptions in a design doc",
        ],
    },
    {
        "id": "meeting-summarizer",
        "name": "Meeting Notes Summarizer",
        "description": "Turns long meeting transcripts into concise bullet-point summaries with action items.",
        "tags": ["summarization", "meetings", "productivity"],
        "use_cases": [
            "Summarize a 1-hour meeting transcript",
            "Extract action items from notes",
            "Recap a call for someone who missed it",
        ],
    },
    {
        "id": "code-reviewer",
        "name": "AI Code Reviewer",
        "description": "Reviews a code diff for bugs, style issues, and suggests improvements.",
        "tags": ["code", "review", "engineering"],
        "use_cases": [
            "Pre-review code before opening a PR",
            "Catch common bugs in Python or JavaScript",
            "Suggest cleaner refactors",
        ],
    },
    {
        "id": "design-spec-generator",
        "name": "Design Spec Generator",
        "description": "Drafts a structured design specification from a short feature description.",
        "tags": ["design", "spec", "planning"],
        "use_cases": [
            "Turn a one-line feature idea into a full spec",
            "Generate an outline for a design doc",
            "Bootstrap engineering planning",
        ],
    },
    {
        "id": "tone-rewriter",
        "name": "Tone Rewriter",
        "description": "Rewrites text in a different tone — more formal, more friendly, more assertive, etc.",
        "tags": ["writing", "communication", "tone"],
        "use_cases": [
            "Soften a blunt email",
            "Make a casual message sound more professional",
            "Rewrite feedback to be less harsh",
        ],
    },
    {
        "id": "contrarian-coach",
        "name": "Contrarian Coach",
        "description": "Acts as a critical thinking partner who disagrees on purpose to expose weak reasoning.",
        "tags": ["coaching", "thinking", "feedback"],
        "use_cases": [
            "Sharpen an argument before a presentation",
            "Find holes in your own logic",
            "Train against echo-chamber thinking",
        ],
    },
    {
        "id": "doc-explainer",
        "name": "Technical Doc Explainer",
        "description": "Explains dense technical documentation in plain English with examples.",
        "tags": ["learning", "documentation", "explanation"],
        "use_cases": [
            "Understand an unfamiliar API",
            "Decode a research paper abstract",
            "Onboard onto a new codebase faster",
        ],
    },
]

import math
def skill_to_text(skill: dict) -> str:
    return " ".join([
        skill['id'],
        skill['name'],
        #skill['description'],
        #" ".join(skill['tags']),
        " ".join(skill['use_cases']),
    ])

def cosine_similarity(a: list[float], b: list[float]) -> float:
    return (sum(x * y for x,y in zip(a,b)) /
     (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(x * x for x in b))))


def precompute_skill_vectors(skills: list) -> list:
    newSkills = []
    for skill in skills:
        skill['vector'] = (embed(skill_to_text(skill)))
        newSkills.append(skill)
        print(f'appended {skill}')
    return newSkills
        


def match(query: str, skills_with_vectors: list, top_k: int = 10) -> list:
    """Return the top_k skills most similar to `query`.

    embed the query (single call to embed)
    cosine_similarity(query_vec, each skill["vector"])
    sort by score descending, take top_k
    return list of (skill, score) tuples
    """
    result = []
    queryVec = embed(query)
    for skill in skills_with_vectors:
        score = cosine_similarity(skill['vector'], queryVec)
        result.append((skill, score))
    result.sort(key=lambda pair: pair[1], reverse=True)
    return result[:top_k]
    
    


if __name__ == "__main__":
    skills = load_skills()
    skillVectors = precompute_skill_vectors(skills)
    query = "i need something to rewrite my emails professionally"
    matched = match(query, skillVectors)
    print(f'this is the best match: {((matched[0])[0])['id']} with similarity {((matched[0])[1])}')


