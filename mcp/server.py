"""The Lore - MCP server.

Exposes The Lore's skill library to any MCP-compatible agent (Claude Desktop,
GitHub Copilot CLI, Cursor, ...) so people can find and pull skills straight
from their editor/CLI instead of opening the website.

It calls the deployed, authenticated Lore API using a token from a one-time
device-code sign-in (run `python login.py` once). stdout is reserved for the MCP
protocol, so this file never prints - auth prompts live in login.py.

Tools:
  search_skills(query, top_k)  - semantic search over the catalog
  get_skill(skill_id)          - one skill, including its instruction body
  list_skills()                - lightweight list of every skill

Env:
  LORE_API_BASE   backend base URL (defaults to the deployed API)
"""

import os
import asyncio

import httpx
from mcp.server import MCPServer

from auth import get_token_silent

LORE_API_BASE = os.environ.get(
    "LORE_API_BASE",
    "https://the-lore-api-e3dghcgkfnfvcxed.westus-01.azurewebsites.net",
).rstrip("/")

mcp = MCPServer("the-lore")

_TIMEOUT = 30.0
_NEEDS_LOGIN = (
    "Not signed in to The Lore. In the mcp/ folder run `python login.py` once to "
    "sign in with Microsoft, then try again."
)


async def _request(method: str, path: str, json: dict | None = None):
    token = get_token_silent()
    if not token:
        raise RuntimeError(_NEEDS_LOGIN)
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{LORE_API_BASE}{path}"
    # The API runs on a Free App Service tier that spins down when idle, so the
    # first request after a lull can fail to connect while it cold-starts. Retry
    # a few times with a short backoff before giving up.
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.request(method, url, json=json, headers=headers)
            if resp.status_code == 401:
                raise RuntimeError(_NEEDS_LOGIN)
            resp.raise_for_status()
            return resp.json()
        except httpx.TransportError as exc:  # connect/read errors — likely a cold start
            last_exc = exc
            await asyncio.sleep(2 * (attempt + 1))
    raise RuntimeError(
        f"Couldn't reach The Lore API at {LORE_API_BASE} — it may be waking up, "
        f"try again in a moment. Last error: {last_exc}"
    )


@mcp.tool()
async def search_skills(query: str, top_k: int = 5) -> list[dict]:
    """Search The Lore's skill library with a natural-language description of
    what you're trying to do. Returns the top matches (id, name, description,
    relevance score). Call get_skill() with an id to get its full instructions."""
    data = await _request("POST", "/match", json={"query": query, "top_k": top_k})
    return [
        {
            "id": item.get("skill", {}).get("id"),
            "name": item.get("skill", {}).get("name"),
            "description": item.get("skill", {}).get("description"),
            "score": round(item.get("score", 0), 3),
        }
        for item in data
    ]


@mcp.tool()
async def get_skill(skill_id: str) -> dict:
    """Fetch one skill by id, including its full instruction body - the reusable
    prompt/workflow an agent should follow. Get ids from search_skills()."""
    skill = await _request("GET", f"/skills/{skill_id}")
    return {
        "id": skill.get("id"),
        "name": skill.get("name"),
        "description": skill.get("description"),
        "body": skill.get("body", ""),
    }


@mcp.tool()
async def list_skills() -> list[dict]:
    """List every skill in The Lore (id, name, description). Prefer search_skills()
    when the user has a specific need; use this to browse what exists."""
    data = await _request("GET", "/skills")
    return [
        {"id": s.get("id"), "name": s.get("name"), "description": s.get("description")}
        for s in data
    ]


def main() -> None:
    mcp.run()  # stdio transport by default


if __name__ == "__main__":
    main()
