# The Lore

A prototype system for discovering and reusing AI "skills" across Microsoft 365 teams.

## What is a Skill?

A small, reusable unit of AI knowledge — a prompt, workflow, agent config, or repeatable AI-powered process. Skills are meant to be understandable quickly and useful without needing the full project they came from.

## How it works

```
user input  →  matching  →  ranked skills  →  click  →  skill details
```

## Run it locally

Two terminals, then open http://localhost:5173

```powershell
# Terminal 1 — backend (http://localhost:8000)
cd matching; python -m uvicorn main:app --port 8000

# Terminal 2 — frontend (http://localhost:5173)
cd ui; npm.cmd run dev
```

First time only: `cd ui; npm.cmd install`, then copy `ui/.env.example` to `ui/.env` and fill in the two GUIDs (needed for Microsoft sign-in).

Notes: use `npm.cmd` (not `npm`). "Port 5173 already in use" means the frontend is already running — just open the browser. Ctrl+C stops a server.


## Project structure

- `ui/` — React frontend (Person 3: interaction & navigation)
- `matching/` — Python backend, input → skills matching logic (Person 1: core logic)
- `data/` — Skill definitions and test cases (Person 2: data quality)
- `docs/` — Shared design notes and decisions

## Team

Three Microsoft Explore interns. See each folder's README for ownership details.

## Status

Prototype. Not production. No auth, no GitHub integration, no real backend infra yet.
