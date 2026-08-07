# The Lore

A prototype system for discovering and reusing AI "skills" across Microsoft 365 teams.

## What is a Skill?

A small, reusable unit of AI knowledge — a prompt, workflow, agent config, or repeatable AI-powered process. Skills are meant to be understandable quickly and useful without needing the full project they came from.

## How it works

```
user input  →  matching  →  ranked skills  →  click  →  skill details
```

## Run it locally

### Backend setup (first time only)

Install Python 3.10 or newer, then install the Python packages from the backend
requirements file:

```powershell
cd matching
py -m pip install -r requirements.txt
```

Create the backend environment file before starting the API:

```powershell
Copy-Item .env.example .env
```

Fill in the values in `matching/.env`. `COSMOS_ENDPOINT` is required when the
backend starts. A `COSMOS_KEY` is needed for profile endpoints and other Cosmos
DB operations. If you leave the key blank, those operations use Microsoft Entra
authentication instead and require the appropriate Azure login and permissions.

The matching and browse endpoints can use the local skill files in
`../data/skills`. The draft-skill feature additionally needs either the Azure
OpenAI variables in `.env` or a local Ollama installation with the configured
model. Ollama is not required just to browse or match skills.

### Start both services

Use two terminals, then open http://localhost:5173. The backend command must be
run from the `matching` directory because `main.py` is located there:

```powershell
# Terminal 1 — backend (http://localhost:8000)
cd matching
py -m uvicorn main:app --reload --port 8000

# Terminal 2 — frontend (http://localhost:5173)
cd ui
npm.cmd install                    # first time only
npm.cmd run dev
```

The first page is a local welcome screen. Click **Continue**; no account,
tenant, or token configuration is required.

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
