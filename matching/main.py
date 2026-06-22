"""The Lore — Matching API.

This is the backend service the UI talks to. Run locally with:
    uvicorn main:app --reload
Then open http://localhost:8000/docs for an interactive API explorer.

Endpoints (all return JSON):

    POST /match
        Find the skills that best match a user's query.
        Body:    { "query": "summarize my meeting", "top_k": 10 }
                 - query  (string, required): what the user typed
                 - top_k  (int, optional, default 10): how many results to return
        Returns: [
            { "skill": { ...skill fields... }, "score": 0.87 },
            ...
        ]
        Note: "vector" is stripped from each skill before returning.

    GET /skills
        Return every skill in the catalog (for a browse/landing view).
        Returns: [ { ...skill fields... }, ... ]

    GET /skills/{id}
        Return the full data for one skill, looked up by its "id".
        Example: GET /skills/summarize-meeting-notes
        Returns: { ...skill fields... }    (404 if id not found)
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from matcher import match, precompute_skill_vectors
from skills_loader import load_skills
from fastapi.middleware.cors import CORSMiddleware
from query_rewriter import rewrite_query
from draft_skill import draft_skill
app = FastAPI()

# WARNING!!!!: tighten allow_origins before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Startup ---------------------------------------------------------------
# Load all skill markdown files and compute their embedding vectors once at boot.
# Every request after this just does fast math on the cached vectors.
skills = load_skills()
skills_with_vectors = precompute_skill_vectors(skills)


def _public(skill: dict) -> dict:
    """Drop the 'vector' field. It's huge and the UI doesn't need it."""
    result = {}
    for key, value in skill.items():
        if key != "vector":
            result[key] = value
    return result


# --- Request shapes --------------------------------------------------------
class MatchRequest(BaseModel):
    """Shape of the JSON body POSTed to /match."""
    query: str          # what the user typed in the search box
    top_k: int = 10     # how many ranked results to return
    rewrite: bool = False


class DraftSkillRequest(BaseModel):
    """Shape of the JSON body POSTed to /draft-skill."""
    description: str    # plain-English description of the skill the user wants


# --- Endpoints -------------------------------------------------------------
@app.post("/match")
def match_endpoint(req: MatchRequest):
    """Rank skills by how well they match `req.query`. Returns top `req.top_k`."""
    if req.rewrite:
        query = rewrite_query(req.query)
    else:
        query = req.query
    results = match(query, skills_with_vectors, req.top_k)
    return [
        {
            "skill": _public(skill),
            "score": score,
        }
        for skill, score in results
    ]


@app.get("/skills")
def list_skills():
    """Return every skill in the catalog (used by browse views)."""
    return [_public(skill) for skill in skills]


@app.get("/skills/{id}")
def get_skill(id: str):
    """Return the full data for one skill by its id (used by detail pages)."""
    for skill in skills:
        if skill["id"] == id:
            return _public(skill)
    raise HTTPException(status_code=404, detail=f"skill not found: {id}")


@app.post("/draft-skill")
async def draft_skill_endpoint(req: DraftSkillRequest):
    """Use the Copilot SDK to draft a skill from a plain-English description.

    Returns a structured skill: { id, name, description, body }.
    This only DRAFTS it; saving to a real .md file is a later step.
    """
    # draft_skill() is a coroutine, so we await it directly (no asyncio.run
    # inside an already-running event loop).
    try:
        return await draft_skill(req.description)
    except Exception as exc:
        # The model reply could be unparseable, or the SDK runtime could fail.
        raise HTTPException(status_code=502, detail=f"draft failed: {exc}")

