# The Lore — MCP server

Use **The Lore from your AI agent** (Claude Desktop, GitHub Copilot CLI, Cursor,
…) instead of opening the website. Your agent can search the skill library and
pull a skill's full instructions right in your chat.

It talks directly to your local Lore API. No account or token is required.

---

## What it gives your agent

| Tool | What it does |
| --- | --- |
| `search_skills(query, top_k)` | Find skills matching a plain-English description |
| `get_skill(skill_id)` | Get one skill, including the instructions to follow |
| `list_skills()` | List every skill (id + name + description) |

## Before you start

- **Python 3.10 or newer** installed (`py --version` to check).
- The local backend running at `http://localhost:8000`.

---

## Quick start

Open a terminal **in this `mcp/` folder**, then:

```powershell
# 1. Create an isolated environment and install dependencies (first time only)
py -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt

# 2. Check it works — should print a few skills
.venv\Scripts\python -c "import asyncio, server; print(asyncio.run(server.search_skills('weekly status update', 3)))"
```

If step 2 prints a list of skills, you're done.

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
| `…may be waking up, try again` | The API was idle and cold-started | Just run it again; it retries automatically |

---

## Configuration (optional)

| Env var | Default | Purpose |
| --- | --- | --- |
| `LORE_API_BASE` | `http://localhost:8000` | Point at another backend |

## Files

- `server.py` — the MCP server (keeps stdout clean for the protocol; never prints)
- `requirements.txt` — `mcp`, `httpx`

## Running against a local backend

Start the backend in `matching/`. Set `LORE_API_BASE` only when using a different
host or port.
