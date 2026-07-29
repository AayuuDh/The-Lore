# AGENTS.md

The canonical guide for AI agents (and humans) working in this repository. `CLAUDE.md` points here.

## What this is

"The Lore" — a prototype for discovering and reusing AI "skills" across Microsoft 365 teams. A skill is a reusable unit of AI knowledge (a prompt / workflow / agent config) stored as a markdown file. The core loop:

```
user query → /match (embeddings + cosine similarity) → ranked skills → detail view
```

It's a two-process app: a Python FastAPI backend (`matching/`) that serves skills and does matching, and a React/Vite frontend (`ui/`) that calls it. Skills live as data files in `data/`.

## Running locally

The repo's READMEs are written for Windows (`py`, `npm.cmd`). On macOS/Linux use `python`/`npm`. Two terminals:

```bash
# Backend — http://localhost:8000  (Swagger UI at /docs)
python3 -m venv .venv                                          # first time (isolated; nothing global)
.venv/bin/python -m pip install -r matching/requirements.txt   # first time
cd matching && ../.venv/bin/python -m uvicorn main:app --reload

# Frontend — http://localhost:5173
cd ui
npm install                          # first time
npm run dev
```

Or start both at once with `python3 scripts/dev.py` (`py scripts\dev.py` on Windows) — stdlib-only, runs natively on macOS/Linux/Windows, waits for the backend's `/health` before launching Vite, prefixes each side's output, and stops both together. Add `--auth` to run the backend with `REQUIRE_AUTH=true` and exercise the real token flow. It still needs the one-time setup above.

In VS Code: **Run Task → "Setup (run once)"** then **"Start Dev"** (see `.vscode/tasks.json`) — it builds the venv, installs both sides, and launches both servers, with the correct commands per OS.

The backend **boots with no cloud credentials**: Cosmos DB and the Azure-OpenAI features (discovery, drafting, editing) auto-disable or fall back to a local Ollama model when their env vars are unset, and skills come from local `data/skills/*.md`. Copy `matching/.env.example` → `matching/.env` to turn cloud features on. First backend boot downloads a ~60MB embedding model from Hugging Face (needs internet once, then cached). The frontend needs `ui/.env` (copy `ui/.env.example`) with two Entra GUIDs for Microsoft sign-in — the app is gated behind MSAL login and won't render past the login screen without them. Restart Vite after editing `.env`.

Other commands:
- `npm run lint` (in `ui/`) — ESLint
- `npm run build` (in `ui/`) — production build
- `python matching/evaluate.py [--rewrite]` — matching-quality eval harness (top-k recall over `data/test-cases/`)
- `python matching/matcher.py` — quick single-query smoke test
- `python matching/draft_skill.py` — interactive terminal loop for the AI skill-drafting flow

There is no automated test suite; `evaluate.py` is the closest thing (a recall metric, not pass/fail tests).

## Backend architecture (`matching/`)

FastAPI app in `main.py`. The catalog is loaded **once at import time** and held in memory — `skills` and `skills_with_vectors` are the *same list*, so mutating one (e.g. appending a newly-saved skill) is immediately visible to `/match` with no restart. The `vector` field is stripped from every skill before it leaves an endpoint (`_public()`).

Module boundaries are deliberate:
- `skills_loader.py` — the storage layer, with **two backends chosen at runtime by the `COSMOS_KEY` env var**: if set, reads/writes **Azure Cosmos DB** (via `cosmos_client.py`); if unset (the default for local dev), transparently falls back to markdown-with-frontmatter files in `data/skills/*.md` (files starting with `_` are ignored). So it runs locally with no cloud credentials. `save_skill()` is the write path; on the local backend `_safe_id()` enforces kebab-case so a skill id can never become a path like `../secrets`, and `_unique_path()` auto-suffixes collisions (`meeting-notes-2`) so a save never overwrites.
- `matcher.py` — ranking only (cosine similarity). Knows about vectors, not how they're made. `precompute_skill_vectors()` attaches vectors in place.
- `embeddings.py` — the only place that produces vectors. Uses `model2vec` (`potion-base-8M`) locally; comments note an intended swap to Azure OpenAI.
- `rerank.py` — the **discovery guide** behind `POST /discover`: after `matcher.py` narrows the catalog by cosine similarity, this reasons over the top candidates with an LLM to recommend the best fit, ask a clarifying question, or suggest creating a new skill. Uses **Azure OpenAI** when `AZURE_OPENAI_*` is set, else falls back to a **local Ollama** model.
- `draft_skill.py` — AI skill drafting run as a multi-turn knowledge-extraction interview (`start_draft`/`refine_draft`, per-`session_id` history held in memory). Same Azure-OpenAI-or-Ollama backend as `rerank.py`. (`edit_skill.py` is the editor's AI side-agent behind `POST /edit-skill`; `draft_skill_with_copilot_sdk.py` is an unused earlier version.)
- `cosmos_client.py` / `users.py` — Cosmos DB client and the user-profile store (`/users` endpoints). Config is read with `.get()` and clients build lazily, so missing `COSMOS_*` / `AZURE_OPENAI_*` disables that feature instead of crashing the server at import.
- `query_rewriter.py` — optional query preprocessing via a local Ollama server. Off by default; enabled per-request with `rewrite: true` on `/match` or `--rewrite` on `evaluate.py`. Requires Ollama running or it will error.
- `auth.py` — bearer-token validation against Entra ID, wired as an **app-level FastAPI dependency** in `main.py` so every route (including ones added later) is covered without per-route opt-in. Gated by `REQUIRE_AUTH`, **off by default**: unset, the principal is `None` and the API behaves as it always has, which is what keeps a fresh clone runnable with no cloud setup. When on, the caller's identity is the token's `oid` claim rather than a `user_id` in the request body. Fails closed if `REQUIRE_AUTH` is set without a tenant/audience.
- `ratelimit.py` — in-process sliding-window throttle, applied via `dependencies=[Depends(ratelimit.llm_limit)]` on the four endpoints that call Azure OpenAI. Per-process only, so it does not coordinate across App Service instances.

Two paths sit outside the auth gate on purpose. `/health` is a plain Starlette route (app-level dependencies only cover `APIRoute`s), so it stays reachable without a token — the post-deploy check in `deploy.yml` polls it and has no token to present. `/docs`, `/redoc` and `/openapi.json` are served only when auth is off; FastAPI registers them as plain Starlette routes too, so an authenticated API would otherwise still publish its full schema to anonymous callers.

Key endpoints: `POST /match`, `POST /discover`, `GET /skills`, `GET /skills/{id}`, `POST /skills` (save + embed live), `POST /users` + `GET/PATCH /users/{id}`, `POST /draft-skill`, `POST /draft-skill/refine`, `POST /edit-skill`. CORS is restricted to the Static Web App origin and the Vite dev server, overridable with `ALLOWED_ORIGINS`.

**The deployed API is currently unauthenticated.** `REQUIRE_AUTH` is off in the App Service because turning it on needs two things that don't exist yet: an API scope exposed on the `The-Lore` app registration, and the frontend actually sending its token (`ui/src/api.js` sends none today, and `authConfig.js` requests only the Graph `User.Read` scope). Until both land, the machinery in `auth.py` is present but inert — the backend on `azurewebsites.net` is reachable by anyone.

## Frontend architecture (`ui/`)

React 19 + Vite + Primer (GitHub's design system) + MSAL for auth.

- **Routing is via `react-router-dom` (v7).** `App.jsx` renders `<Routes>`/`<Route>` and navigates with `useNavigate()`; it derives page title, sidebar highlight, and the active skill/settings section from `useLocation()` + `matchPath()`. Routes include `/home` (Discover), `/browse` and `/browse/:skillId` (SkillsPage), `/favorites`, `/create` and `/create/editor` (AddSkillPage / SkillEditor), `/profile`, `/settings` + `/settings/:section` + `/appearance`, plus `/updates` and `/accessibility`. Unknown paths redirect to `/home`.
- **Auth gate:** `App.jsx` uses MSAL's `useIsAuthenticated()`. If false it renders only the `/login` route (`<Login />`) and returns early; login flips the hook, re-renders, and reveals the full router below. Auth config is centralized in `src/authConfig.js` (reads `VITE_MSAL_*` from env).
- **All backend calls go through `src/api.js`** — thin `fetch` wrappers over the FastAPI endpoints. Base URL is `VITE_API_BASE_URL` or defaults to `http://localhost:8000`. Covers `/match`, `/discover`, `/skills*`, `/draft-skill*`, `/edit-skill`, `/users*`, `/events`, and `/metrics`.
- The Add-Skill / editor flow drives the draft → refine → edit → save conversation against the `/draft-skill*`, `/edit-skill`, and `/skills` endpoints.
- A dev-only Alt/Option-click "click-to-source" inspector is wired in `App.jsx`; it's dead-code-eliminated from production builds via `import.meta.env.DEV`.

## Data (`data/`)

- `skills/*.md` — the **local-dev store** (used when `COSMOS_KEY` is unset; production/`main` reads the same skills from Cosmos DB — see Backend architecture). One skill per file. Frontmatter keys `id`, `name`, `description` (description is what matching embeds, so it's rich — problem + when-to-use + example prompts), plus a markdown body (`## Instructions`, `## Example`). **Ignore the JSON schema in `data/README.md`** — it's an out-of-date "proposed" format; the real format is frontmatter markdown as loaded by `skills_loader.py`.
- `test-cases/*.json` — `{ "query": ..., "expected_skill_ids": [...] }`, one or a list per file, `_`-prefixed files skipped. Consumed by `evaluate.py`.

## Governance (`.github/` and `contrib/`)

This is a Microsoft "Start Right" repo. `.github/` holds governance-as-code: `acl/access.yml` (team roles), `policies/jit.yml` (just-in-time admin access), `compliance/inventory.yml`, `ISSUE_TEMPLATE/JitAccess.yml`. The `main` branch and these governance files are protected by rulesets — direct pushes are blocked and admin-only changes need temporary JIT access. `contrib/skills/repo-governance-jit-rulesets/SKILL.md` documents/reproduces that setup (bash + PowerShell scripts). Do work on branches and open PRs; don't expect to push to `main`.
