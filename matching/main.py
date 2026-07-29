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

Authentication
--------------
Auth is enforced app-wide by a single dependency (see auth.py), not per route,
so endpoints added later are covered without anyone remembering to opt in. With
REQUIRE_AUTH unset — the default, and how local dev runs — the principal is None
and the API behaves exactly as it always has. With REQUIRE_AUTH=true every
endpoint requires an Entra bearer token and the caller's identity comes from the
token's `oid` claim rather than a user_id in the request body.

Two paths sit outside that gate, both deliberately:
    /health   always open — the deploy health check has no token to present
    /docs     open only when auth is off, so a protected API doesn't publish
              its full schema to anonymous callers (also /redoc, /openapi.json)
"""

import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from starlette.responses import JSONResponse
# from contextlib import asynccontextmanager

import auth
import ratelimit
from matcher import match, precompute_skill_vectors
from rerank import converse
from skills_loader import load_skills, save_skill, load_skills_by_author
from fastapi.middleware.cors import CORSMiddleware
from query_rewriter import rewrite_query
from draft_skill import start_draft, refine_draft
from edit_skill import edit_skill as ai_edit_skill
from events import record_event, skill_metrics, user_history, all_metrics
from users import get_user, ensure_user, update_user, UsernameTakenError

load_dotenv()


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # The Copilot client boots lazily on the first draft, so there's nothing to
#     # do on startup. On shutdown we stop its background subprocess cleanly.
#     yield
#     await shutdown_client()


# app = FastAPI(lifespan=lifespan)
#
# The auth dependency is declared here, once, rather than on each route: a route
# that forgets it would be silently unauthenticated, and that gap only shows up
# in production after REQUIRE_AUTH is turned on. Declaring it app-wide means new
# endpoints are covered by construction. Endpoints that need the caller's
# identity still take `principal` as a parameter; FastAPI caches dependencies
# per request, so it resolves exactly once either way.
#
# The interactive explorer is switched OFF whenever auth is on. FastAPI registers
# /docs, /redoc and /openapi.json as plain Starlette routes rather than APIRoutes,
# so app-level dependencies do NOT cover them — a protected API would still have
# published its full schema (every route, every model field) to anyone who asked.
# No data leaks either way, but it is free reconnaissance, so it goes away in the
# configuration where it would matter. Locally, where auth is off, /docs stays.
_DOCS_ENABLED = not auth.REQUIRE_AUTH

app = FastAPI(
    dependencies=[Depends(auth.current_principal)],
    docs_url="/docs" if _DOCS_ENABLED else None,
    redoc_url="/redoc" if _DOCS_ENABLED else None,
    openapi_url="/openapi.json" if _DOCS_ENABLED else None,
)

if not auth.REQUIRE_AUTH:
    # Say it out loud. Otherwise "is this deployment protected?" can only be
    # answered by reading env config, and the code reads as though it is.
    print("[auth] REQUIRE_AUTH is off — every endpoint is unauthenticated")


# --- Health check ----------------------------------------------------------
async def _health(request):
    """Liveness probe for the post-deploy check in .github/workflows/deploy.yml.

    Registered as a plain Starlette route, not an @app.get, and that is the
    whole point: app-level dependencies only apply to APIRoutes, so this is the
    one path that stays reachable without a token. A normal route would 401 the
    moment REQUIRE_AUTH is turned on and every deploy would fail its health
    check — the same mechanism that exempts /docs, used deliberately here.

    Returns a fixed payload. It deliberately does not touch the catalog, Cosmos,
    or the embedding model, so it answers "is the process serving?" and nothing
    an unauthenticated caller could mine.
    """
    return JSONResponse({"status": "ok"})


app.add_route("/health", _health, methods=["GET"], include_in_schema=False)


# --- CORS ------------------------------------------------------------------
# The browser origins allowed to call this API. This used to be ["*"], which let
# any page on the internet make cross-origin calls on a visitor's behalf.
#
# These are the only two front ends that exist today: the Static Web App and the
# Vite dev server. Verified against Azure — `the-lore-web` has no custom domain
# and only the `default` environment, so there are no preview origins to allow.
# If someone adds a custom domain or turns on PR preview builds, this list is
# what will break first; extend it via ALLOWED_ORIGINS rather than reverting to
# a wildcard.
_DEFAULT_ORIGINS = [
    "https://polite-cliff-021fe9a1e.7.azurestaticapps.net",  # the-lore-web
    "http://localhost:5173",                                 # Vite dev server
]
_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
] or _DEFAULT_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
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
    force: bool = False  # "Create skill now": draft immediately, skip the question floor


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
    forked_from: str | None = None  # id of the skill this was copied/forked from


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


@app.post("/discover", dependencies=[Depends(ratelimit.llm_limit)])
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
def add_skill_endpoint(
    req: SaveSkillRequest,
    principal: dict | None = Depends(auth.current_principal),
):
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

    # The author is the verified token subject when auth is on. Before this, the
    # id came from the request body, so the profile gate below could be
    # satisfied by anyone: POST /users mints a profile for ANY string, so a
    # caller could create an identity and then publish as it. Taking the id from
    # the token closes that path.
    user_id = auth.resolve_user_id(principal, req.user_id)

    # Gate: you may only publish a skill once a public username has been chosen
    # and the contact preference has been decided.
    if not user_id:
        raise HTTPException(status_code=400, detail="sign-in required to add a skill")
    profile = get_user(user_id)
    if profile is None:
        raise HTTPException(status_code=400, detail="complete your profile before adding a skill")
    if not profile.get("username"):
        raise HTTPException(
            status_code=400,
            detail="choose a username before adding a skill",
        )
    if profile.get("contactable") is None:
        raise HTTPException(
            status_code=400,
            detail="choose whether you'd like to be contacted before adding a skill",
        )
    payload["created_by"] = profile["username"]
    payload["created_by_id"] = user_id

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
def ensure_user_endpoint(
    req: EnsureUserRequest,
    principal: dict | None = Depends(auth.current_principal),
):
    """Fetch-or-create the signed-in user's profile.

    Call this right after sign-in. On the first call for a user it mints a unique
    anonymous username and returns { "profile": {...}, "is_new": true } so the UI
    can show first-time onboarding. Later calls return the existing profile with
    "is_new": false.
    """
    # With auth on, the body's user_id is ignored entirely: you can only ever
    # create or fetch your own profile. This is what stops the endpoint from
    # being a free identity factory for arbitrary strings.
    user_id = auth.resolve_user_id(principal, req.user_id)
    try:
        profile, is_new = ensure_user(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"profile": profile, "is_new": is_new}


@app.get("/users/{user_id}")
def get_user_endpoint(user_id: str):
    """Return one user's public profile (404 if they have no profile yet).

    Readable by any authenticated caller: the UI shows a skill's author and, if
    they opted in, how to reach them.
    """
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


@app.get("/users/{user_id}/history")
def user_history_endpoint(
    user_id: str,
    principal: dict | None = Depends(auth.current_principal),
):
    """This user's OWN recent activity (skills they viewed/used/favorited).

    Returns only their own events — never anyone else's — enriched with each
    skill's current name for display. This is per-user history/trends data.
    """
    # The docstring above promised "never anyone else's", but until now nothing
    # enforced it: knowing a GUID was enough to read that person's history.
    auth.require_self(principal, user_id)
    names = {s["id"]: s.get("name", s["id"]) for s in skills}
    return [
        {**event, "name": names.get(event["skill_id"], event["skill_id"])}
        for event in user_history(user_id)
    ]


@app.patch("/users/{user_id}")
def update_user_endpoint(
    user_id: str,
    req: UpdateUserRequest,
    principal: dict | None = Depends(auth.current_principal),
):
    """Update a profile. Only the fields you send are changed.

    Changing the username enforces uniqueness (409 if the handle is taken).
    Everything except the username is optional and may be left blank.
    """
    auth.require_self(principal, user_id)
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
def record_event_endpoint(
    req: EventRequest,
    principal: dict | None = Depends(auth.current_principal),
):
    """Log one usage event (view / use / favorite / unfavorite). Fire-and-forget:
    the client doesn't wait on the result. Silently no-ops without Cosmos."""
    # Events are attributed to the verified caller, so nobody can write history
    # into someone else's activity log.
    user_id = auth.resolve_user_id(principal, req.user_id)
    try:
        record_event(req.skill_id, user_id, req.type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return None


@app.get("/skills/{id}/metrics")
def skill_metrics_endpoint(id: str):
    """Global usage counts for one skill: { views, uses, favorites }. Counts only
    — never reveals who did anything."""
    return skill_metrics(id)


@app.get("/metrics")
def all_metrics_endpoint():
    """Global usage counts for every skill: { skill_id: {views, uses, favorites} }.
    Counts only. Used by the catalog to size the bento grid by real engagement."""
    return all_metrics()


@app.post("/draft-skill", dependencies=[Depends(ratelimit.llm_limit)])
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


@app.post("/draft-skill/refine", dependencies=[Depends(ratelimit.llm_limit)])
async def refine_skill_endpoint(req: RefineSkillRequest):
    """Later turns: continue the interview — answer a question or refine the draft.

    Body: { "session_id": ..., "message": "the user's answer or change request" }
    Returns the same envelope shape as /draft-skill (a question or a draft).
    """
    try:
        session_id, result = await refine_draft(req.session_id, req.message, req.force)
        return {"session_id": session_id, **result}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"refine failed: {exc}")


@app.post("/edit-skill", dependencies=[Depends(ratelimit.llm_limit)])
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

