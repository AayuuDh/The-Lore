# Matching API

Python backend that takes a user's query and returns matching skills, ranked by how well they fit.

---

## Files

- `main.py` — the API server (FastAPI). Defines the endpoints the UI calls.
- `matcher.py` — ranking logic (cosine similarity over embeddings).
- `skills_loader.py` — reads skills from `../data/skills/*.json`.
- `embeddings.py` — turns text into vectors (uses `model2vec` locally; will swap to Azure OpenAI later).
- `requirements.txt` — Python dependencies.

---

## Running it locally

One time setup:

```powershell
cd matching
pip install -r requirements.txt
```

Start the server (re-run any time you change code):

```powershell
uvicorn main:app --reload
```

You should see:
```
Uvicorn running on http://127.0.0.1:8000
```

Leave it running in that terminal. Open a browser to:

- **http://localhost:8000/docs** — interactive API explorer (Swagger UI). Easiest way to try endpoints by filling out a form. Use this first.
- **http://localhost:8000/skills** — sanity check that the catalog loaded.

Stop the server with `Ctrl+C`.

---

## Endpoints

All endpoints return JSON. Base URL when running locally: `http://localhost:8000`.

### `POST /match`

Find the skills that best match a user's query.

**Request body:**
```json
{
  "query": "summarize my meeting",
  "top_k": 10
}
```
- `query` — required, the user's search text.
- `top_k` — optional, how many results to return (default `10`).

**Response:**
```json
[
  {
    "skill": {
      "id": "summarize-meeting-notes",
      "name": "Summarize Meeting Notes",
      "problem": "...",
      "when_to_use": "...",
      "tags": ["..."],
      "use_cases": ["..."],
      "instructions": "...",
      "example": { "input": "...", "output": "..." },
      "owner": "..."
    },
    "score": 0.87
  },
  ...
]
```

`score` is between roughly 0 and 1 — higher is a better match.

### `GET /skills`

Returns every skill in the catalog. Use this for browse / landing pages.

**Response:** array of skill objects (same shape as `skill` above).

### `GET /skills/{id}`

Returns the full data for one skill, looked up by `id`. Use this for detail pages.

**Example:** `GET /skills/summarize-meeting-notes`

**Response:** one skill object. Returns `404` if the id doesn't exist.

---

## Calling from React

```javascript
// Search
const res = await fetch("http://localhost:8000/match", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "summarize my meeting" }),
});
const results = await res.json();

// Browse all
const all = await fetch("http://localhost:8000/skills").then(r => r.json());

// Detail
const skill = await fetch("http://localhost:8000/skills/summarize-meeting-notes").then(r => r.json());
```

> Heads up: if you hit a CORS error in the browser, ping Erk — easy fix on the backend.

---

## Calling from curl (for debugging)

```powershell
curl -X POST http://localhost:8000/match `
  -H "Content-Type: application/json" `
  -d '{"query": "summarize my meeting"}'

curl http://localhost:8000/skills
curl http://localhost:8000/skills/summarize-meeting-notes
```

---

## Troubleshooting

- **`ModuleNotFoundError: No module named 'fastapi'`** — you forgot `pip install -r requirements.txt`.
- **Port 8000 in use** — start it on a different port: `uvicorn main:app --reload --port 8001`.
- **Server doesn't pick up code changes** — make sure you started it with `--reload`.
- **Server fails on startup with embedding errors** — first run downloads a small model (~60 MB) from Hugging Face. Needs internet the first time, then it's cached.
