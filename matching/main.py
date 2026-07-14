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
# from contextlib import asynccontextmanager

from matcher import match, precompute_skill_vectors
from rerank import converse
from skills_loader import load_skills, save_skill, load_skills_by_author
from fastapi.middleware.cors import CORSMiddleware
from query_rewriter import rewrite_query
from draft_skill import start_draft, refine_draft
from edit_skill import edit_skill as ai_edit_skill
from events import record_event, skill_metrics
from users import get_user, ensure_user, update_user, UsernameTakenError


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # The Copilot client boots lazily on the first draft, so there's nothing to
#     # do on startup. On shutdown we stop its background subprocess cleanly.
#     yield
#     await shutdown_client()


# app = FastAPI(lifespan=lifespan)
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


class DiscoverRequest(BaseModel):
    """Shape of the JSON body POSTed to /discover — the discovery conversation."""
    messages: list      # [{role: "user" | "assistant", content: str}] so far


class DraftSkillRequest(BaseModel):
    """Shape of the JSON body POSTed to /draft-skill."""
    description: str    # plain-English description of the skill the user wants


class RefineSkillRequest(BaseModel):
    """Shape of the JSON body POSTed to /draft-skill/refine."""
    session_id: str     # the conversation to continue (from a previous response)
    message: str        # the change to apply, e.g. "make the instructions shorter"


class EditSkillRequest(BaseModel):
    """Shape of the JSON body POSTed to /edit-skill — the editor's AI side-agent."""
    skill: dict                 # the current skill being edited: {name, description, body, ...}
    instruction: str            # plain-English change, e.g. "add a concrete example"
    history: list | None = None # optional prior {role, content} turns for context


class EventRequest(BaseModel):
    """Shape of the JSON body POSTed to /events — one usage event to log."""
    skill_id: str               # which skill the event is about
    type: str                   # view | use | favorite | unfavorite
    user_id: str | None = None  # who (stored privately; never returned in aggregates)


class SaveSkillRequest(BaseModel):
    """Shape of the JSON body POSTed to /skills (the approved skill to save)."""
    id: str             # kebab-case id; becomes the filename data/skills/<id>.md
    name: str           # human-readable title
    description: str     # one paragraph used for search matching
    body: str           # markdown body (## Instructions, ## Example, ...)
    user_id: str | None = None  # stable id of the signed-in author (from the UI)


class EnsureUserRequest(BaseModel):
    """Shape of the JSON body POSTed to /users to fetch-or-create a profile."""
    user_id: str        # stable per-user key from the sign-in provider


class UpdateUserRequest(BaseModel):
    """Shape of the JSON body PATCHed to /users/{user_id}. All fields optional."""
    username: str | None = None
    contactable: bool | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    contact_other: str | None = None


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


@app.post("/discover")
async def discover_endpoint(req: DiscoverRequest):
    """Conversational discovery. The whole chat drives retrieval (cosine over the
    joined user turns), then the AI agent (rerank.py) replies like a guide, names
    the best-fit skill, and judges the fit in words. Returns { reply, best,
    confidence } — no misleading similarity numbers."""
    user_text = " ".join(
        m.get("content", "") for m in req.messages if m.get("role") == "user"
    ).strip()
    if not user_text:
        return {
            "reply": "Tell me what you're trying to do and I'll find a skill for it.",
            "best": None,
            "confidence": "low",
        }

    results = match(user_text, skills_with_vectors, 8)
    candidates = [
        {
            "id": skill["id"],
            "name": skill.get("name", ""),
            "description": skill.get("description", ""),
        }
        for skill, _score in results
    ]
    try:
        agent = await converse(req.messages, candidates)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"discovery agent failed: {exc}")

    best_id = agent.get("best_id")
    best = None
    for skill, _score in results:
        if skill["id"] == best_id:
            best = _public(skill)
            break

    return {
        "reply": agent.get("reply", ""),
        "best": best,
        "confidence": agent.get("confidence", "low"),
        "suggest_create": bool(agent.get("suggest_create")),
        "need": agent.get("need") or None,
    }


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

    Authoring requires a profile: the author must have decided whether they are
    contactable (contactable is True/False, not None). The saved skill records
    the author's anonymous username in `created_by`.
    """
    payload = req.model_dump()

    # Gate: you may only publish a skill once your profile is complete enough,
    # i.e. you have a username (always true after ensure_user) AND you've said
    # whether other users may contact you about your skills.
    if not req.user_id:
        raise HTTPException(status_code=400, detail="sign-in required to add a skill")
    profile = get_user(req.user_id)
    if profile is None:
        raise HTTPException(status_code=400, detail="complete your profile before adding a skill")
    if profile.get("contactable") is None:
        raise HTTPException(
            status_code=400,
            detail="choose whether you'd like to be contacted before adding a skill",
        )
    payload["created_by"] = profile["username"]
    payload["created_by_id"] = req.user_id

    try:
        saved = save_skill(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Attach the embedding vector in place, then add to the shared catalog.
    # `skills` and `skills_with_vectors` are the same list, so /match sees it too.
    precompute_skill_vectors([saved])
    skills.append(saved)
    return _public(saved)


# --- User profile endpoints ------------------------------------------------
@app.post("/users")
def ensure_user_endpoint(req: EnsureUserRequest):
    """Fetch-or-create the signed-in user's profile.

    Call this right after sign-in. On the first call for a user it mints a unique
    anonymous username and returns { "profile": {...}, "is_new": true } so the UI
    can show first-time onboarding. Later calls return the existing profile with
    "is_new": false.
    """
    try:
        profile, is_new = ensure_user(req.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"profile": profile, "is_new": is_new}


@app.get("/users/{user_id}")
def get_user_endpoint(user_id: str):
    """Return one user's public profile (404 if they have no profile yet)."""
    profile = get_user(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="profile not found")
    return profile


@app.get("/users/{user_id}/skills")
def user_skills_endpoint(user_id: str):
    """List the skills a user has authored — powers their 'My Skills' view.

    Lightweight shape (id, name, description). Anyone can read a user's authored
    skills since skills are public; only counts, never viewers, stay private.
    """
    return load_skills_by_author(user_id)


@app.patch("/users/{user_id}")
def update_user_endpoint(user_id: str, req: UpdateUserRequest):
    """Update a profile. Only the fields you send are changed.

    Changing the username enforces uniqueness (409 if the handle is taken).
    Everything except the username is optional and may be left blank.
    """
    # exclude_unset so omitting a field means "leave it as-is", while explicitly
    # sending contactable=false is still recorded as a real decision.
    fields = req.model_dump(exclude_unset=True)
    try:
        return update_user(user_id, fields)
    except UsernameTakenError:
        raise HTTPException(status_code=409, detail="that username is already taken")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/skills/{id}")
def get_skill(id: str):
    """Return the full data for one skill by its id (used by detail pages)."""
    for skill in skills:
        if skill["id"] == id:
            return _public(skill)
    raise HTTPException(status_code=404, detail=f"skill not found: {id}")


@app.post("/events", status_code=204)
def record_event_endpoint(req: EventRequest):
    """Log one usage event (view / use / favorite / unfavorite). Fire-and-forget:
    the client doesn't wait on the result. Silently no-ops without Cosmos."""
    try:
        record_event(req.skill_id, req.user_id, req.type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return None


@app.get("/skills/{id}/metrics")
def skill_metrics_endpoint(id: str):
    """Global usage counts for one skill: { views, uses, favorites }. Counts only
    — never reveals who did anything."""
    return skill_metrics(id)


@app.post("/draft-skill")
async def draft_skill_endpoint(req: DraftSkillRequest):
    """Turn 1 of the interview: open a conversation from a plain-English description.

    Returns an envelope:
      - { "session_id": ..., "type": "question", "message": "..." }  (usual case)
      - { "session_id": ..., "type": "draft", "skill": { id, name, description, body, profile } }
    Keep the session_id and pass it to /draft-skill/refine to answer or refine.
    """
    try:
        session_id, result = await start_draft(req.description)
        return {"session_id": session_id, **result}
    except Exception as exc:
        # The model reply could be unparseable, or the SDK runtime could fail.
        raise HTTPException(status_code=502, detail=f"draft failed: {exc}")


@app.post("/draft-skill/refine")
async def refine_skill_endpoint(req: RefineSkillRequest):
    """Later turns: continue the interview — answer a question or refine the draft.

    Body: { "session_id": ..., "message": "the user's answer or change request" }
    Returns the same envelope shape as /draft-skill (a question or a draft).
    """
    try:
        session_id, result = await refine_draft(req.session_id, req.message)
        return {"session_id": session_id, **result}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"refine failed: {exc}")


@app.post("/edit-skill")
async def edit_skill_endpoint(req: EditSkillRequest):
    """The skill editor's AI side-agent: apply one instruction to the current skill.

    Body: { "skill": { name, description, body, ... }, "instruction": "...",
            "history": [ {role, content}, ... ] (optional) }
    Returns the full updated skill: { name, description, body, note }.
    Stateless — the frontend holds the working copy and sends it each turn.
    """
    try:
        return await ai_edit_skill(req.skill, req.instruction, req.history)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"edit failed: {exc}")

