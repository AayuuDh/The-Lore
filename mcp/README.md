# The Lore — MCP server

Use **The Lore from your AI agent** (Claude Desktop, GitHub Copilot CLI, Cursor,
…) instead of opening the website. Your agent can search the skill library and
pull a skill's full instructions right in your chat.

It talks to the live, sign-in-protected Lore API. You sign in once with your
Microsoft account and it just works after that.

---

## What it gives your agent

| Tool | What it does |
| --- | --- |
| `search_skills(query, top_k)` | Find skills matching a plain-English description |
| `get_skill(skill_id)` | Get one skill, including the instructions to follow |
| `list_skills()` | List every skill (id + name + description) |

## Before you start

- **Python 3.10 or newer** installed (`py --version` to check).
- A **Microsoft work account** in the same tenant as The Lore.

---

## Quick start (3 steps)

Open a terminal **in this `mcp/` folder**, then:

```powershell
# 1. Create an isolated environment and install dependencies (first time only)
py -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt

# 2. Sign in with Microsoft — this opens your browser (first time only)
.venv\Scripts\python login.py

# 3. Check it works — should print a few skills
.venv\Scripts\python -c "import asyncio, server; print(asyncio.run(server.search_skills('weekly status update', 3)))"
```

If step 3 prints a list of skills, you're done. Your sign-in is cached under
`~/.the-lore/` and refreshed automatically, so you won't need to log in again.

---

## Use it in Claude Desktop

1. Claude Desktop → **Settings → Developer → Edit Config** (opens
   `claude_desktop_config.json`).
2. Add the `the-lore` entry below. **Use the full path to the `.venv` python you
   created in step 1**, and double backslashes on Windows:

   ```json
   {
     "mcpServers": {
       "the-lore": {
         "command": "C:\\path\\to\\the-lore\\mcp\\.venv\\Scripts\\python.exe",
         "args": ["C:\\path\\to\\the-lore\\mcp\\server.py"]
       }
     }
   }
   ```
3. **Fully restart** Claude Desktop.
4. Ask it: *"Search The Lore for a skill about writing a weekly status update and
   follow it."*

### Other agents (Copilot CLI, Cursor, …)
Point the host at the same command — your `.venv` python running `server.py` — as
an **stdio** MCP server. The three tools appear once it connects.

---

## Troubleshooting

| You see | What it means | Fix |
| --- | --- | --- |
| `Not signed in to The Lore` | No cached token | Run `.venv\Scripts\python login.py` |
| `No module named 'msal'` | Wrong Python (deps missing) | Use the `.venv` python, not global `py` |
| `…may be waking up, try again` | The API was idle and cold-started | Just run it again; it retries automatically |
| `AADSTS9002327` (SPA) | `http://localhost` is on the wrong platform | See app-registration setup below |
| `AADSTS7000218` (needs secret) | App isn't allowed as a public client | See app-registration setup below |

---

## One-time app-registration setup (admin/owner)

A regular user doesn't need this — it's already configured. It's here so whoever
owns the Entra app registration can reproduce it. In **Entra portal → App
registrations → the app → Authentication**:

1. **Add a platform → Mobile and desktop applications**, and add the redirect URI
   **`http://localhost`**. (Not under "Single-page application" or "Web" — those
   cause `AADSTS9002327` / `AADSTS7000218`.)
2. **Advanced settings → Allow public client flows → Yes**.

The `Lore.Read` scope (`api://<client-id>/Lore.Read`) is already exposed for the
web app, so nothing else is needed.

---

## Configuration (optional)

| Env var | Default | Purpose |
| --- | --- | --- |
| `LORE_API_BASE` | deployed API URL | Point at another backend, e.g. `http://localhost:8000` for local dev |
| `LORE_CLIENT_ID` | The Lore app id | Override the Entra app registration |
| `LORE_TENANT_ID` | corp tenant id | Override the tenant |
| `LORE_TOKEN_CACHE` | `~/.the-lore/msal_cache.json` | Where the sign-in is cached |

## Files

- `server.py` — the MCP server (keeps stdout clean for the protocol; never prints)
- `auth.py` — Microsoft interactive sign-in + silent token refresh
- `login.py` — the one-time sign-in you run yourself
- `requirements.txt` — `mcp`, `httpx`, `msal`

## Running against a local backend

Start the backend in `matching/` and set `LORE_API_BASE=http://localhost:8000`.
If that local backend has `REQUIRE_AUTH` off (the default), you don't even need to
sign in — the server just won't send a token, and the local API doesn't require one.
