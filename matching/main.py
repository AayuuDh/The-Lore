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
from contextlib import asynccontextmanager

from matcher import match, precompute_skill_vectors
from skills_loader import load_skills, save_skill
from fastapi.middleware.cors import CORSMiddleware
from query_rewriter import rewrite_query
from draft_skill import start_draft, refine_draft, shutdown_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    # The Copilot client boots lazily on the first draft, so there's nothing to
    # do on startup. On shutdown we stop its background subprocess cleanly.
    yield
    await shutdown_client()


app = FastAPI(lifespan=lifespan)

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


class RefineSkillRequest(BaseModel):
    """Shape of the JSON body POSTed to /draft-skill/refine."""
    session_id: str     # the conversation to continue (from a previous response)
    message: str        # the change to apply, e.g. "make the instructions shorter"


class SaveSkillRequest(BaseModel):
    """Shape of the JSON body POSTed to /skills (the approved skill to save)."""
    id: str             # kebab-case id; becomes the filename data/skills/<id>.md
    name: str           # human-readable title
    description: str     # one paragraph used for search matching
    body: str           # markdown body (## Instructions, ## Example, ...)


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


@app.post("/skills")
def add_skill_endpoint(req: SaveSkillRequest):
    """Save an approved skill to disk AND make it searchable right away.

    Writes data/skills/<id>.md, then embeds the skill and appends it to the
    live in-memory catalog. No restart needed: a browser refresh will find it.
    If the id is already taken it is auto-suffixed (e.g. 'meeting-notes-2'); the
    response carries the final id. 400 if the id is invalid (not kebab-case).
    """
    try:
        saved = save_skill(req.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Attach the embedding vector in place, then add to the shared catalog.
    # `skills` and `skills_with_vectors` are the same list, so /match sees it too.
    precompute_skill_vectors([saved])
    skills.append(saved)
    return _public(saved)


@app.get("/skills/{id}")
def get_skill(id: str):
    """Return the full data for one skill by its id (used by detail pages)."""
    for skill in skills:
        if skill["id"] == id:
            return _public(skill)
    raise HTTPException(status_code=404, detail=f"skill not found: {id}")


@app.post("/draft-skill")
async def draft_skill_endpoint(req: DraftSkillRequest):
    """Turn 1 of the conversation: draft a skill from a plain-English description.

    Returns { "session_id": ..., "skill": { id, name, description, body } }.
    Keep the session_id and pass it to /draft-skill/refine to ask for changes.
    """
    try:
        session_id, skill = await start_draft(req.description)
        return {"session_id": session_id, "skill": skill}
    except Exception as exc:
        # The model reply could be unparseable, or the SDK runtime could fail.
        raise HTTPException(status_code=502, detail=f"draft failed: {exc}")


@app.post("/draft-skill/refine")
async def refine_skill_endpoint(req: RefineSkillRequest):
    """Later turns: continue the same conversation and apply a change.

    Body: { "session_id": ..., "message": "make the instructions shorter" }
    Returns the same shape as /draft-skill, with the updated skill.
    """
    try:
        session_id, skill = await refine_draft(req.session_id, req.message)
        return {"session_id": session_id, "skill": skill}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"refine failed: {exc}")

