# The Lore — Project Documentation

**Repository:** `x3-design/the-lore`  
**Repository ID:** `1264391833`  
**Description:** Demo 1 repository for the Lore  
**Default branch:** `main`  
**Documentation snapshot:** August 3, 2026  
**Reviewed commit:** `3e92883ab9990490ba7c433e0033f97a0521db49`  
**Project status:** Prototype

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Concepts and User Workflows](#2-key-concepts-and-user-workflows)
3. [System Architecture](#3-system-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Skill Storage and Matching](#6-skill-storage-and-matching)
7. [Authentication, Profiles, and Security](#7-authentication-profiles-and-security)
8. [Local Development](#8-local-development)
9. [API Reference](#9-api-reference)
10. [Testing and Quality Evaluation](#10-testing-and-quality-evaluation)
11. [Deployment](#11-deployment)
12. [Known Limitations and Recommendations](#12-known-limitations-and-recommendations)

---

# 1. Project Overview

## 1.1 Purpose

The Lore is a prototype system for discovering, reusing, creating, and sharing AI-powered “skills” across Microsoft 365 teams.

A skill is a small, reusable unit of AI knowledge. It may represent:

- A reusable prompt
- A step-by-step workflow
- An agent configuration
- A repeatable AI-assisted process
- Instructions for completing a specialized task
- An example-driven pattern that another person can apply

The purpose of the project is to prevent valuable AI knowledge from remaining isolated within individual projects or teams. Instead of requiring users to understand the complete project where a technique was developed, The Lore presents each technique as a self-contained skill that can be discovered and reused.

The project’s basic interaction model is:

```text
User need
   ↓
Natural-language query
   ↓
Semantic matching
   ↓
Ranked skills
   ↓
Skill detail
   ↓
Copy, download, favorite, edit, or reuse
```

The system also includes an AI-assisted discovery experience. Rather than requiring the user to enter a perfect search phrase, the discovery guide can conduct a conversation, retrieve relevant candidates, and recommend the best available skill.

## 1.2 Primary Capabilities

The application supports the following major capabilities:

1. **Browse skills**  
   Users can view the skill catalog and open individual skill details.

2. **Semantic search**  
   User queries are converted into embeddings and compared with precomputed skill vectors.

3. **Conversational discovery**  
   An AI guide evaluates candidate skills and provides a conversational recommendation.

4. **Skill creation**  
   A user can describe a desired skill and participate in a multi-turn drafting interview.

5. **AI-assisted editing**  
   Drafted or copied skills can be refined using natural-language editing instructions.

6. **Skill reuse**  
   Users can copy a skill’s body or download it as a Markdown file.

7. **Favorites**  
   Users can maintain a personal collection of favorite skills.

8. **Profiles and authorship**  
   Signed-in users receive profiles and can publish skills using an anonymous public username.

9. **Usage metrics**  
   The application records views, uses, favorites, and related activity.

10. **Cloud and offline storage modes**  
    Skills can be stored in Azure Cosmos DB or local Markdown files.

## 1.3 Technology Composition

The repository’s language composition is:

| Language | Percentage | Main use |
|---|---:|---|
| JavaScript | 48.1% | React frontend, routing, API client, user interactions |
| Python | 29.7% | FastAPI backend, matching, AI features, storage |
| CSS | 22.1% | Layout, component styling, themes, responsive design |
| HTML | 0.1% | Vite application shell |

## 1.4 Main Technology Stack

### Frontend

- React 19
- Vite 8
- React Router
- Primer React and Primer CSS
- Microsoft Authentication Library, or MSAL
- React Markdown
- GitHub Flavored Markdown support through `remark-gfm`
- Microsoft Clarity analytics

### Backend

- Python 3.10 or newer
- FastAPI
- Uvicorn
- Pydantic request models
- Model2Vec
- Azure Cosmos DB SDK
- Azure OpenAI client
- PyJWT with cryptographic verification
- Python Frontmatter
- Optional local Ollama integration

### Cloud and deployment

- Azure App Service for the backend
- Azure Static Web Apps for the frontend
- Azure Cosmos DB for persistent data
- Azure OpenAI for AI-assisted features
- Microsoft Entra ID for authentication
- GitHub Actions for automated deployment

---

# 2. Key Concepts and User Workflows

## 2.1 Skill Definition

In the current implementation, a skill contains a small set of core fields:

| Field | Purpose |
|---|---|
| `id` | Unique kebab-case identifier |
| `name` | Human-readable skill title |
| `description` | Searchable explanation of the skill |
| `body` | Markdown instructions and examples |
| `created_by` | Public author username, when available |
| `created_by_id` | Stable internal author identifier |
| `forked_from` | Source skill ID when the skill is copied |

The description is especially important because the matching system embeds the skill name and description. A useful description should therefore explain:

- The problem being solved
- When the skill should be used
- Typical input or user intent
- Important domain terminology
- Example requests that should match the skill

The body stores the full reusable content and may contain sections such as:

```markdown
## Instructions

1. Review the source material.
2. Identify the key decisions.
3. Separate decisions from action items.
4. Produce a concise summary.

## Example

### Input

Meeting notes containing decisions, open questions, and assigned tasks.

### Output

A structured summary with decisions, owners, and due dates.
```

## 2.2 Discovering a Skill

The application offers two related discovery mechanisms.

### Direct matching

A user enters a query such as:

```text
I need to turn a long meeting transcript into concise notes.
```

The backend:

1. Embeds the query.
2. Compares it with each precomputed skill vector.
3. Calculates cosine similarity.
4. Sorts the results from highest to lowest similarity.
5. Returns the requested number of results.

### Conversational discovery

The `/discover` workflow uses the complete sequence of user messages.

The backend:

1. Joins the user’s conversation turns.
2. Retrieves the eight most similar skills.
3. Sends a compact candidate list to the discovery agent.
4. Asks the agent to recommend the best candidate.
5. Returns:
   - A conversational reply
   - The selected skill, if one fits
   - A confidence label
   - Whether creating a new skill is recommended
   - A summarized statement of the user’s need

This approach combines fast local semantic retrieval with AI reasoning over a small candidate set.

## 2.3 Creating a Skill

Skill creation is a multi-stage workflow:

```text
Initial description
   ↓
Drafting interview
   ↓
Clarifying questions
   ↓
Generated draft
   ↓
Manual or AI-assisted editing
   ↓
Profile and publishing validation
   ↓
Save
```

The user begins by describing what the skill should do. The backend starts an in-memory drafting session and returns either:

- A follow-up question, or
- A completed draft

Subsequent responses use the session ID so the drafting service can remember prior messages.

The user can also force the system to generate a draft without waiting for additional questions.

## 2.4 Editing and Forking

An existing skill can be opened in the editor as a copy.

When a skill is forked:

- The name receives a “copy” suffix.
- The proposed ID receives a `-copy` suffix.
- The new skill records the original skill in `forked_from`.
- A Markdown note is inserted into the body to preserve visible lineage.

The editor also provides AI starter instructions such as:

- Make the workflow steps tighter.
- Add a concrete real-world example.
- Fix the grammar and tighten the wording.

Saving creates a new skill rather than silently overwriting the original.

## 2.5 Using a Skill

From the detail page, users can:

- Read the rendered Markdown
- Copy the skill body
- Download the skill as a `.md` file
- Add or remove the skill from favorites
- View usage statistics
- Open the skill in the editor

Copying or downloading a skill is recorded as a use. Opening it records a view, and changing its favorite status records a favorite or unfavorite event.

---

# 3. System Architecture

## 3.1 High-Level Architecture

The Lore is a two-process web application:

```text
┌──────────────────────────────────────────────────────────┐
│ React/Vite Frontend                                      │
│                                                          │
│ Login · Discover · Browse · Favorites · Create · Profile │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTPS / JSON
                            │ Optional bearer token
                            ▼
┌──────────────────────────────────────────────────────────┐
│ Python FastAPI Backend                                   │
│                                                          │
│ Matching · Discovery · Drafting · Editing · Profiles     │
│ Metrics · Authentication · Rate limiting                 │
└──────────────┬─────────────────────┬─────────────────────┘
               │                     │
               ▼                     ▼
┌────────────────────────┐  ┌──────────────────────────────┐
│ Skill Storage          │  │ AI and Embedding Services   │
│                        │  │                              │
│ Cosmos DB, or          │  │ Model2Vec                   │
│ local Markdown files   │  │ Azure OpenAI or Ollama      │
└────────────────────────┘  └──────────────────────────────┘
```

## 3.2 Repository Organization

```text
the-lore/
├── .github/
│   ├── workflows/        GitHub Actions deployment automation
│   └── ...               Governance and repository configuration
├── .vscode/              Development tasks and editor configuration
├── contrib/              Repository contribution and governance material
├── data/
│   ├── skills/           Local Markdown skill catalog
│   ├── test-cases/       Matching evaluation cases
│   └── README.md         Data-area notes
├── docs/                 Design notes and architectural documentation
├── matching/
│   ├── main.py           FastAPI application and endpoints
│   ├── matcher.py        Vector similarity and ranking
│   ├── embeddings.py     Model2Vec embedding implementation
│   ├── skills_loader.py  Local/Cosmos storage abstraction
│   ├── cosmos_client.py  Shared Cosmos DB clients
│   ├── rerank.py         Conversational discovery agent
│   ├── draft_skill.py    Multi-turn skill drafting
│   ├── edit_skill.py     AI-assisted skill editing
│   ├── query_rewriter.py Optional query rewriting
│   ├── auth.py           Entra bearer-token validation
│   ├── ratelimit.py      LLM endpoint rate limiting
│   ├── users.py          User profile operations
│   ├── events.py         Usage events and aggregate metrics
│   ├── evaluate.py       Matching-quality evaluation harness
│   └── requirements.txt  Python dependencies
├── scripts/
│   └── dev.py            Cross-platform combined development launcher
├── ui/
│   ├── src/
│   │   ├── main.jsx      Frontend entry point
│   │   ├── App.jsx       Main routes, layout, and auth gate
│   │   ├── api.js        Central backend API client
│   │   ├── authConfig.js MSAL and API-scope configuration
│   │   └── components/   Pages and reusable UI components
│   ├── package.json      Frontend dependencies and scripts
│   └── .env.example      Frontend environment template
├── AGENTS.md             Canonical repository guidance
└── README.md              Project introduction and basic setup
```

## 3.3 Runtime Data Flow

A typical search request follows this sequence:

```text
Discover or browse component
        ↓
ui/src/api.js
        ↓
POST /match
        ↓
matching/main.py
        ↓
matching/matcher.py
        ↓
matching/embeddings.py
        ↓
Sorted matches
        ↓
JSON response
        ↓
React result rendering
```

All frontend backend calls are centralized in `ui/src/api.js`. This provides one place for:

- Base URL configuration
- Access-token attachment
- JSON handling
- Error normalization
- HTTP status propagation

---

# 4. Frontend Architecture

## 4.1 Application Entry Point

`ui/src/main.jsx` is the browser entry point.

Its startup sequence is:

1. Read optional Microsoft Clarity configuration.
2. Initialize the shared MSAL client.
3. Process any authentication redirect response.
4. Restore an active account from the MSAL cache.
5. register a successful-login event handler.
6. Mount React.
7. Wrap the application with:
   - `MsalProvider`
   - `BrowserRouter`
   - React `StrictMode`

MSAL must finish initialization before components using authentication hooks are rendered.

## 4.2 Main Application Component

`ui/src/App.jsx` coordinates:

- Authentication gating
- Routing
- Sidebar state
- Top navigation
- Appearance preferences
- User profile loading
- Onboarding
- Daily streak tracking
- Skill navigation
- Unsaved-work protection
- Footer and feedback components

The component derives the active page and navigation state from the current URL.

## 4.3 Main Routes

Important routes include:

| Route | Purpose |
|---|---|
| `/login` | Microsoft sign-in screen |
| `/home` | Conversational discovery |
| `/browse` | Skill catalog |
| `/browse/:skillId` | Skill detail |
| `/favorites` | Favorited skills |
| `/create` | AI-assisted skill creation |
| `/create/editor` | Skill editor |
| `/profile` | User profile and onboarding |
| `/settings` | General settings |
| `/settings/:section` | Specific settings section |
| `/appearance` | Appearance configuration |
| `/about` | Product information |
| `/updates` | Product and skill updates placeholder |
| `/accessibility` | Accessibility information placeholder |

Unknown authenticated routes redirect to `/home`. Unknown unauthenticated routes redirect to `/login`.

## 4.4 Authentication Gate

The frontend uses `useIsAuthenticated()` from MSAL.

If the user is not authenticated, the application returns early and renders only the login experience. Once sign-in completes, MSAL updates its state, React rerenders, and the complete application router becomes available.

After authentication, the application:

1. Obtains the signed-in account.
2. Uses the account’s local object ID as the stable user key.
3. Calls the backend to fetch or create a profile.
4. Redirects new users to profile onboarding.

## 4.5 API Client

`ui/src/api.js` exposes functions for:

- Listing skills
- Loading a skill
- Matching a query
- Conversational discovery
- Starting and refining a draft
- Editing a skill
- Saving a skill
- Managing profiles
- Recording events
- Retrieving metrics
- Loading user history and authored skills

Before each request, the client attempts to acquire an API access token silently. If successful, it adds:

```http
Authorization: Bearer <access-token>
```

Failed HTTP responses are converted into JavaScript errors. If the backend supplies a human-readable `detail` field, the client uses it as the error message.

## 4.6 Presentation and Accessibility

The UI uses Primer components and styles. It supports:

- Light and dark modes
- Purple and Microsoft 365-inspired themes
- Keyboard-accessible navigation controls
- Accessible labels for icon buttons
- Escape-key handling for menus
- Click-outside handling for popovers
- Markdown rendering with GitHub Flavored Markdown

Appearance preferences are normalized and stored in browser `localStorage`.

The development build also includes an Alt/Option-click component inspector that opens the relevant source location in VS Code. This inspector is removed from production builds.

---

# 5. Backend Architecture

## 5.1 FastAPI Application

`matching/main.py` defines the FastAPI application and its HTTP endpoints.

At startup, the backend:

1. Loads environment variables.
2. Creates the FastAPI application.
3. Configures optional application-wide authentication.
4. Registers an unauthenticated health route.
5. Configures CORS.
6. Loads the skill catalog.
7. Computes embedding vectors.
8. Holds the resulting catalog in memory.

The loaded skills and vectorized skills refer to the same list. When a newly saved skill is appended and given a vector, it becomes searchable immediately without a process restart.

Before returning a skill to a client, the backend strips its private vector field.

## 5.2 Module Responsibilities

### `main.py`

Responsible for:

- API application creation
- Request and response models
- Endpoint definitions
- CORS
- Health checks
- Service coordination
- Public response filtering

### `matcher.py`

Responsible only for ranking.

It:

- Builds searchable text from a skill
- Computes cosine similarity
- Sorts candidates
- Returns the top results

It does not decide how embeddings are generated or where skills are stored.

### `embeddings.py`

Loads the `minishlab/potion-base-8M` Model2Vec model and exposes:

- `embed(text)`
- `embed_batch(texts)`

The first run may download approximately 60 MB of model data from Hugging Face. Later runs use the cached model.

### `skills_loader.py`

Provides a shared storage interface for:

- Loading all skills
- Loading skills by author
- Saving skills

It dynamically selects local Markdown or Azure Cosmos DB storage.

### `rerank.py`

Implements the conversational discovery guide. It reasons over candidates retrieved by vector similarity and returns a user-facing recommendation.

### `draft_skill.py`

Implements the multi-turn skill drafting interview. Conversation history is stored in process memory and indexed by session ID.

### `edit_skill.py`

Applies natural-language modifications to a skill while preserving the skill’s structured fields.

### `query_rewriter.py`

Optionally rewrites user queries before matching. This feature is disabled unless explicitly requested.

### `users.py`

Manages user profiles, public usernames, contact preferences, and username uniqueness.

### `events.py`

Records usage events and generates per-skill or global metrics.

### `auth.py`

Validates Entra bearer tokens when authentication is enabled.

### `ratelimit.py`

Applies an in-process sliding-window limit to AI endpoints that may incur cloud cost.

---

# 6. Skill Storage and Matching

## 6.1 Local Markdown Storage

When `COSMOS_KEY` is absent, the application uses:

```text
data/skills/*.md
```

Files beginning with `_` are ignored.

The effective file format is YAML frontmatter followed by a Markdown body:

```markdown
---
id: summarize-meeting-notes
name: "Summarize Meeting Notes"
description: "Turn long meeting transcripts into concise summaries with decisions and action items."
forked_from:
---

## Instructions

1. Read the complete transcript.
2. Identify decisions and action items.
3. Group related discussion points.
4. Produce a concise summary.

## Example

### Input

A meeting transcript.

### Output

A summary containing decisions, owners, and next steps.
```

The proposed JSON schema in `data/README.md` is historical and does not represent the active loader implementation.

## 6.2 Cosmos DB Storage

When `COSMOS_KEY` is set, the application uses Azure Cosmos DB.

The storage layer creates or accesses separate containers for:

- Skills
- Users
- Events

The default database name is `lore`, and the default skills container is `skills`.

Skill documents include fields such as:

```json
{
  "id": "summarize-meeting-notes",
  "name": "Summarize Meeting Notes",
  "description": "Create structured summaries from long meetings.",
  "body": "## Instructions\n...",
  "created_by": "public-username",
  "created_by_id": "stable-user-id",
  "forked_from": null
}
```

## 6.3 ID Validation

A skill ID must use kebab case:

```text
summarize-meeting-notes
```

Valid IDs contain:

- Lowercase letters
- Digits
- Single hyphens between segments

Characters such as slashes, dots, and path traversal sequences are rejected.

This is both a data-quality rule and a security control because the ID can become a local filename or a Cosmos document key.

If an ID is already used, the application generates a unique suffix:

```text
meeting-notes
meeting-notes-2
meeting-notes-3
```

Existing skills are not overwritten.

## 6.4 Embedding and Ranking

The searchable representation of a skill is:

```text
<skill name> <skill description>
```

The vector for this text is computed once when the catalog loads.

For each query:

1. The query is embedded.
2. Cosine similarity is calculated against every skill vector.
3. The list is sorted in descending order.
4. The first `top_k` entries are returned.

The similarity function is conceptually:

```text
cosine_similarity(A, B) =
    dot(A, B) / (magnitude(A) × magnitude(B))
```

The current implementation performs an in-memory scan of the complete catalog. This is appropriate for a prototype and a relatively small skill collection.

## 6.5 Query Rewriting

The `/match` request includes an optional `rewrite` flag.

When enabled, the user’s original text is processed by the query-rewriting component before embedding. The evaluation harness supports the same behavior through:

```bash
python matching/evaluate.py --rewrite
```

This makes it possible to compare direct matching with rewritten-query matching.

---

# 7. Authentication, Profiles, and Security

## 7.1 Frontend Authentication

The frontend uses Microsoft Entra ID through MSAL.

Required frontend configuration includes:

```dotenv
VITE_MSAL_CLIENT_ID=<application-client-id>
VITE_MSAL_TENANT_ID=<directory-tenant-id>
```

The application requests:

- Microsoft Graph `User.Read`
- The backend’s custom `Lore.Read` API scope

## 7.2 Backend Authentication

Backend authentication is controlled by:

```dotenv
REQUIRE_AUTH=true
ENTRA_TENANT_ID=<tenant-id>
ENTRA_API_AUDIENCE=api://<application-client-id>
```

Authentication is off by default to preserve zero-cloud-configuration local development.

When enabled, the backend:

1. Requires a bearer token.
2. Downloads and caches Entra signing keys.
3. Restricts validation to RS256.
4. Validates the token signature.
5. Validates issuer and audience.
6. Rejects missing or expired tokens.
7. Uses the verified `oid` or subject claim as the user’s identity.

When authentication is enabled, a user ID supplied in the request body is not trusted. The verified token identity takes precedence.

If authentication is required but its tenant or audience is missing, the service fails closed rather than silently allowing requests.

## 7.3 Health and Documentation Routes

`/health` is intentionally registered as a plain Starlette route so it remains available without a bearer token. This allows deployment systems to verify process health regardless of authentication configuration.

FastAPI documentation routes are available only when authentication is disabled:

- `/docs`
- `/redoc`
- `/openapi.json`

This avoids anonymously exposing the API schema when the API is protected.

## 7.4 CORS

Browser access is limited to approved frontend origins. Default origins include:

- The deployed Azure Static Web App
- The local Vite development server

Additional origins can be configured with:

```dotenv
ALLOWED_ORIGINS=https://example.com,https://preview.example.com
```

## 7.5 Rate Limiting

The following AI-powered endpoints are rate-limited:

- `/discover`
- `/draft-skill`
- `/draft-skill/refine`
- `/edit-skill`

The default configuration is:

```dotenv
RATE_LIMIT_LLM=20/60
```

This represents 20 requests per 60 seconds per caller.

The limiter is process-local. Its state:

- Resets after a restart
- Is not shared between instances
- Is not a complete security boundary

For a multi-instance production deployment, a distributed limiter such as Redis or Azure API Management should be used.

## 7.6 Profile Publishing Gate

Publishing requires the user to:

- Be signed in or otherwise identified in local development
- Have a profile
- Choose a public username
- Decide whether they are contactable

This prevents incomplete anonymous profiles from publishing skills without an author identity or contact preference.

---

# 8. Local Development

## 8.1 Prerequisites

Install:

- Git
- Python 3.10 or newer
- Node.js and npm
- Internet access for the first embedding-model download

Optional services:

- Ollama for local AI features
- Azure OpenAI for cloud AI features
- Azure Cosmos DB for shared storage
- Azure CLI for Entra-based Azure authentication

## 8.2 Clone and Enter the Repository

```bash
git clone <repository-url>
cd the-lore
```

## 8.3 Backend Setup

### macOS or Linux

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r matching/requirements.txt
cd matching
../.venv/bin/python -m uvicorn main:app --reload --port 8000
```

### Windows PowerShell

```powershell
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r matching\requirements.txt
cd matching
..\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

The API is available at:

```text
http://localhost:8000
```

When authentication is off, Swagger UI is available at:

```text
http://localhost:8000/docs
```

## 8.4 Frontend Setup

```bash
cd ui
npm install
npm run dev
```

The frontend is available at:

```text
http://localhost:5173
```

On Windows, repository instructions may use:

```powershell
npm.cmd install
npm.cmd run dev
```

## 8.5 Combined Development Launcher

After completing the one-time dependency setup, both services can be started with:

```bash
python3 scripts/dev.py
```

On Windows:

```powershell
py scripts\dev.py
```

To test real bearer-token behavior:

```bash
python3 scripts/dev.py --auth
```

The launcher:

- Starts the backend
- Waits for `/health`
- Starts Vite
- Prefixes backend and frontend output
- Stops both processes together

## 8.6 Backend Environment

Copy the template:

```bash
cp matching/.env.example matching/.env
```

Windows PowerShell:

```powershell
Copy-Item matching\.env.example matching\.env
```

All backend variables are optional for basic local browsing and matching.

Important variables include:

```dotenv
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_API_KEY=

OLLAMA_MODEL=llama3.2:3b

COSMOS_ENDPOINT=
COSMOS_KEY=
COSMOS_DATABASE=lore
COSMOS_CONTAINER=skills
COSMOS_USERS_CONTAINER=users
COSMOS_EVENTS_CONTAINER=events

REQUIRE_AUTH=
ENTRA_TENANT_ID=
ENTRA_API_AUDIENCE=

ALLOWED_ORIGINS=
RATE_LIMIT_LLM=20/60
```

## 8.7 Frontend Environment

Copy the template:

```bash
cp ui/.env.example ui/.env
```

Configure:

```dotenv
VITE_MSAL_CLIENT_ID=<client-id>
VITE_MSAL_TENANT_ID=<tenant-id>
VITE_CLARITY_ID=<optional-clarity-project-id>
VITE_API_BASE_URL=http://localhost:8000
```

Restart Vite after changing `.env` because Vite reads environment variables only at startup.

## 8.8 Common Commands

### Frontend development

```bash
cd ui
npm run dev
```

### Frontend linting

```bash
cd ui
npm run lint
```

### Frontend production build

```bash
cd ui
npm run build
```

### Preview production build

```bash
cd ui
npm run preview
```

### Matching evaluation

```bash
python matching/evaluate.py
```

### Evaluation with query rewriting

```bash
python matching/evaluate.py --rewrite
```

### Matching smoke test

```bash
python matching/matcher.py
```

---

# 9. API Reference

## 9.1 Health

### `GET /health`

Returns a fixed process-liveness response:

```json
{
  "status": "ok"
}
```

## 9.2 Match Skills

### `POST /match`

Request:

```json
{
  "query": "summarize my meeting",
  "top_k": 10,
  "rewrite": false
}
```

Response:

```json
[
  {
    "skill": {
      "id": "summarize-meeting-notes",
      "name": "Summarize Meeting Notes",
      "description": "Create concise summaries from meeting notes.",
      "body": "## Instructions\n..."
    },
    "score": 0.87
  }
]
```

## 9.3 Conversational Discovery

### `POST /discover`

Request:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "I need help reviewing a long meeting transcript."
    }
  ]
}
```

Response:

```json
{
  "reply": "The meeting-summary skill is the strongest fit.",
  "best": {
    "id": "summarize-meeting-notes",
    "name": "Summarize Meeting Notes",
    "description": "Create concise summaries from meeting notes.",
    "body": "## Instructions\n..."
  },
  "confidence": "high",
  "suggest_create": false,
  "need": "Summarize a long meeting transcript"
}
```

## 9.4 List Skills

### `GET /skills`

Returns the public skill catalog.

## 9.5 Get Skill

### `GET /skills/{id}`

Returns one skill or HTTP 404 if the ID does not exist.

## 9.6 Save Skill

### `POST /skills`

Request:

```json
{
  "id": "summarize-meeting-notes",
  "name": "Summarize Meeting Notes",
  "description": "Turn long meeting notes into concise summaries.",
  "body": "## Instructions\n\n1. Read the notes...",
  "user_id": "user-id",
  "forked_from": null
}
```

The backend validates the profile and ID, saves the skill, computes its vector, and adds it to the live catalog.

## 9.7 Start Drafting

### `POST /draft-skill`

Request:

```json
{
  "description": "Create a skill that turns incident notes into a postmortem."
}
```

Possible response:

```json
{
  "session_id": "session-id",
  "type": "question",
  "message": "Who is the intended audience for the postmortem?"
}
```

## 9.8 Refine Draft

### `POST /draft-skill/refine`

Request:

```json
{
  "session_id": "session-id",
  "message": "The audience is engineering leadership.",
  "force": false
}
```

The response contains another question or a generated draft.

## 9.9 Edit Skill

### `POST /edit-skill`

Request:

```json
{
  "skill": {
    "id": "incident-postmortem",
    "name": "Incident Postmortem",
    "description": "Create a structured incident review.",
    "body": "## Instructions\n..."
  },
  "instruction": "Add a section for corrective actions.",
  "history": []
}
```

## 9.10 Profiles and Metrics

The backend also provides endpoints for:

- Creating or retrieving a profile
- Loading a user’s public profile
- Updating a profile
- Listing skills by author
- Recording events
- Retrieving user history
- Retrieving per-skill metrics
- Retrieving global metrics

---

# 10. Testing and Quality Evaluation

## 10.1 Current Test Strategy

The repository does not currently contain a complete automated unit or integration test suite.

The primary quality tool is:

```text
matching/evaluate.py
```

It evaluates semantic matching against JSON test cases under:

```text
data/test-cases/
```

## 10.2 Test Case Format

```json
{
  "query": "summarize meeting notes",
  "expected_skill_ids": [
    "summarize-meeting-notes"
  ]
}
```

A file may contain one case or a list of cases. Files beginning with `_` are skipped.

## 10.3 Evaluation Metrics

The evaluator reports recall at:

- Top 1
- Top 3
- Top 5
- Top 10

A case is considered successful at a particular `k` when at least one expected skill appears in the first `k` results.

The evaluator also prints:

- The query
- Expected skill IDs
- Returned skill IDs
- Similarity scores
- Misses and non-top-one results

## 10.4 Recommended Test Expansion

The project should eventually add:

### Backend unit tests

- Cosine similarity
- Skill ID validation
- Collision suffixing
- Public field filtering
- Profile validation
- Authentication claim handling
- Rate-limit behavior

### Backend integration tests

- `/match`
- `/skills`
- `/discover`
- Draft and refine sessions
- Skill creation
- Profile authorization
- Event metrics

### Frontend tests

- Authentication gate
- Routing
- Search results
- Skill details
- Favorite behavior
- Drafting workflow
- Editor workflow
- Error states
- Accessibility checks

### End-to-end tests

A browser automation suite could validate:

1. Sign in.
2. Complete onboarding.
3. Discover a skill.
4. Open the skill.
5. Favorite and copy it.
6. Draft a new skill.
7. Edit and publish the skill.
8. Confirm that it appears in search.

---

# 11. Deployment

## 11.1 Backend Deployment

The backend is deployed to Azure App Service.

The GitHub Actions workflow:

1. Detects backend changes.
2. Builds or packages the Python service.
3. Deploys it to Azure App Service.
4. Polls the unauthenticated `/health` endpoint.
5. Fails the deployment if the service does not return HTTP 200.

The health check accounts for cold-start time and model loading.

## 11.2 Frontend Deployment

The frontend is deployed to Azure Static Web Apps.

The workflow:

1. Installs Node.js.
2. Runs `npm ci`.
3. Runs `npm run build`.
4. Uploads the generated `ui/dist` directory.
5. Skips an additional cloud-side build because the application is already built.

Vite environment values are compiled into the browser bundle during the build.

## 11.3 Deployment Flow

```text
Push to GitHub
      ↓
GitHub Actions
      ├── Backend changes → Azure App Service
      │                     ↓
      │                  /health check
      │
      └── Frontend changes → Vite build
                             ↓
                         Azure Static Web Apps
```

## 11.4 Production Configuration Considerations

Production configuration should verify:

- `REQUIRE_AUTH=true`
- Correct Entra tenant and API audience
- The API scope exists in the app registration
- The frontend requests the correct scope
- Cosmos credentials or managed identity are valid
- Azure OpenAI configuration is valid
- CORS includes only approved origins
- Rate limits match expected traffic
- Secrets are stored in Azure or GitHub secret storage
- Health checks remain unauthenticated
- Logs do not expose tokens or private profile information

---

# 12. Known Limitations and Recommendations

## 12.1 Prototype Status

The Lore remains a prototype rather than a production-complete service. Some documentation in the repository reflects earlier implementation stages, so the source code and canonical `AGENTS.md` should be treated as more current than older folder READMEs.

## 12.2 In-Memory Catalog

The catalog and vectors are stored in process memory.

Consequences include:

- Every process keeps its own copy.
- A restart reloads and re-embeds the catalog.
- Multiple instances may not immediately share newly created skills.
- Startup cost grows with catalog size.

### Recommendation

For a larger catalog, use:

- Persistent embeddings
- Incremental updates
- A vector-capable search service
- Versioned cache invalidation

## 12.3 In-Memory Drafting Sessions

Draft conversations are held in a process-level dictionary.

Consequences include:

- Sessions disappear after restart.
- Requests routed to another instance may not find the session.
- Memory usage can grow without expiration.

### Recommendation

Move sessions to Cosmos DB or Redis and add:

- Expiration times
- Maximum history limits
- Session ownership validation
- Cleanup jobs

## 12.4 Linear Matching

Every search compares the query with every skill.

This is acceptable for a small prototype catalog, but response time will increase as the catalog grows.

### Recommendation

Adopt approximate nearest-neighbor retrieval or a managed vector index when catalog size requires it.

## 12.5 Rate Limiter Scope

The rate limiter is process-local.

### Recommendation

Use a distributed rate limiter for scaled deployment. Azure API Management, Redis, or an edge gateway could enforce consistent account- and IP-based limits.

## 12.6 Automated Testing

There is no complete automated test suite.

### Recommendation

Prioritize tests around:

1. Authentication and identity boundaries
2. Skill publishing permissions
3. Storage behavior
4. Matching correctness
5. AI response parsing
6. Frontend user workflows

## 12.7 Documentation Consistency

Some older documents describe an obsolete JSON skill format or earlier authentication behavior.

### Recommendation

- Keep `AGENTS.md` as the canonical implementation guide.
- Update folder READMEs when schemas or endpoints change.
- Add an architecture document under `docs/`.
- Add an authoritative skill schema.
- Add short Architecture Decision Records for major design choices.
- Generate API documentation from the FastAPI OpenAPI schema.

## 12.8 Observability

Microsoft Clarity provides browser behavior analytics, and Azure provides service logs, but the project would benefit from more structured operational telemetry.

### Recommendation

Add:

- Correlation IDs
- Structured backend logs
- Request latency metrics
- AI operation latency and failure metrics
- Token and cost monitoring
- Match-result quality dashboards
- Storage error alerts
- Authentication failure alerts

## 12.9 Security Review

The code includes important controls such as bearer-token verification, restricted CORS, kebab-case ID validation, identity resolution from verified claims, and rate limiting.

Before broader production use, complete a formal review covering:

- Authorization for every profile and history endpoint
- Cross-user data exposure
- Prompt injection and unsafe AI output
- Markdown rendering safety
- Event-data retention
- Contact-information privacy
- Secret rotation
- Cosmos DB permissions
- Dependency vulnerability scanning
- Abuse prevention for costly AI endpoints

---

# Conclusion

The Lore demonstrates a practical architecture for sharing reusable AI knowledge within an organization. It combines a React and Vite user interface with a FastAPI backend, local semantic embeddings, conversational AI features, Microsoft authentication, and flexible local or cloud storage.

Its strongest architectural qualities are:

- Clear separation between matching, embeddings, storage, and API layers
- Offline-friendly local development
- Centralized frontend API access
- Markdown-based skill portability
- Support for both direct search and guided discovery
- Publishing controls and skill lineage
- A deployment structure built around Azure services

The main work required for production maturity is persistent session management, distributed rate limiting, scalable vector retrieval, comprehensive automated testing, stronger observability, and continued authentication and authorization hardening.

As a prototype, however, the project already provides a coherent end-to-end experience for discovering, using, creating, editing, and sharing reusable AI skills.