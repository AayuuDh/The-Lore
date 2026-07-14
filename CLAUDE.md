# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
cd matching
pip install -r requirements.txt      # first time
uvicorn main:app --reload

# Frontend — http://localhost:5173
cd ui
npm install                          # first time
npm run dev
```

First backend boot downloads a ~60MB embedding model from Hugging Face (needs internet once, then cached). The frontend needs `ui/.env` (copy `ui/.env.example`) with two Entra GUIDs for Microsoft sign-in — the app is gated behind MSAL login and won't render past the login screen without them. Restart Vite after editing `.env`.

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
- `skills_loader.py` — the storage layer, with **two backends chosen at runtime by the `COSMOS_KEY` env var**: if set, reads/writes **Azure Cosmos DB** (via `cosmos_client.py`); if unset (the default for local dev), transparently falls back to markdown-with-frontmatter files in `data/skills/*.md` (files starting with `_` are ignored). So interns can run locally with no cloud credentials. `save_skill()` is the write path; on the local backend `_safe_id()` enforces kebab-case so a skill id can never become a path like `../secrets`, and `_unique_path()` auto-suffixes collisions (`meeting-notes-2`) so a save never overwrites.
- `matcher.py` — ranking only (cosine similarity). Knows about vectors, not how they're made. `precompute_skill_vectors()` attaches vectors in place.
- `embeddings.py` — the only place that produces vectors. Uses `model2vec` (`potion-base-8M`) locally; comments note an intended swap to Azure OpenAI.
- `draft_skill.py` — AI skill drafting via the **GitHub Copilot SDK**. Multi-turn: `start_draft()` opens a session, `refine_draft(session_id, ...)` continues it. Conversation memory lives in the Copilot runtime (persisted to disk, resumed by `session_id`), *not* in this server. One shared `CopilotClient` subprocess boots lazily and is stopped on app shutdown (`lifespan`).
- `query_rewriter.py` — optional query preprocessing via a **local Ollama** server (`llama3.2:3b` at `localhost:11434`). Off by default; enabled per-request with `rewrite: true` on `/match` or `--rewrite` on `evaluate.py`. Requires Ollama running or it will error.

Key endpoints: `POST /match`, `GET /skills`, `GET /skills/{id}`, `POST /skills` (save + embed live), `POST /draft-skill`, `POST /draft-skill/refine`. CORS is wide open (`allow_origins=["*"]`) — prototype only.

## Frontend architecture (`ui/`)

React 19 + Vite + Primer (GitHub's design system) + MSAL for auth.

- **No router despite `react-router-dom` being installed.** Navigation is manual: `App.jsx` holds a `currentPage` string in state and switches between `HomePage` / `SkillsPage` / `AddSkillPage`.
- **Auth gate:** `App.jsx` uses MSAL's `useIsAuthenticated()`. If false it returns *only* `<Login />` and stops; login flips the hook, re-renders, and reveals the app. Auth config is centralized in `src/authConfig.js` (reads `VITE_MSAL_*` from env).
- **All backend calls go through `src/api.js`** — thin `fetch` wrappers over the FastAPI endpoints. Base URL is `VITE_API_BASE_URL` or defaults to `http://localhost:8000`.
- The Add-Skill page drives the draft → refine → edit → save conversation against the `/draft-skill*` and `/skills` endpoints.

## Data (`data/`)

- `skills/*.md` — the **local-dev store** (used when `COSMOS_KEY` is unset; production/`main` reads the same skills from Cosmos DB — see Backend architecture). One skill per file. Frontmatter keys `id`, `name`, `description` (description is what matching embeds, so it's rich — problem + when-to-use + example prompts), plus a markdown body (`## Instructions`, `## Example`). **Ignore the JSON schema in `data/README.md`** — it's an out-of-date "proposed" format; the real format is frontmatter markdown as loaded by `skills_loader.py`.
- `test-cases/*.json` — `{ "query": ..., "expected_skill_ids": [...] }`, one or a list per file, `_`-prefixed files skipped. Consumed by `evaluate.py`.

## Governance (`.github/` and `contrib/`)

This is a Microsoft "Start Right" repo. `.github/` holds governance-as-code: `acl/access.yml` (team roles), `policies/jit.yml` (just-in-time admin access), `compliance/inventory.yml`, `ISSUE_TEMPLATE/JitAccess.yml`. The `main` branch and these governance files are protected by rulesets — direct pushes are blocked and admin-only changes need temporary JIT access. `contrib/skills/repo-governance-jit-rulesets/SKILL.md` documents/reproduces that setup (bash + PowerShell scripts). Do work on branches and open PRs; don't expect to push to `main`.
