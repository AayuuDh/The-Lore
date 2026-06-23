"""
Drafting skills with the Copilot SDK -- as a back-and-forth conversation.

The flow is multi-turn:
  1. start_draft(description)                       -> first draft
  2. refine_draft(session_id, "make it shorter")    -> updated draft
  3. ...repeat until the user is happy...

How the "memory" works: the Copilot runtime PERSISTS each conversation to disk
and hands us a session_id. We do NOT keep the conversation in our own server's
memory. Turn 1 creates a new session; later turns resume that session by id, and
the model already remembers everything said before.

We boot ONE CopilotClient for the whole app. Creating it launches the GitHub
Copilot CLI as a background subprocess -- that boot is the slow part, so we do it
once and reuse it for every turn.
"""

import asyncio
import json

from copilot import CopilotClient
from copilot.session_events import AssistantMessageData
from copilot.session import PermissionHandler


# Sent on the FIRST turn only. After this the runtime remembers the rules, so
# follow-up turns don't repeat the whole contract.
FIRST_MESSAGE = """You write reusable AI "skills" for a skill library.

We will go back and forth: I describe a skill, you draft it, then I ask for
changes. EVERY time you reply -- including after a change -- output the COMPLETE
current skill as ONE JSON object and NOTHING else (no prose, no code fences).
Use exactly these keys:

{{
  "id": "<kebab-case-id>",
  "name": "<Human Readable Name>",
  "description": "<one paragraph: the problem, when to use it, and a few example prompts>",
  "body": "<markdown body with a very detailed '## Instructions' section and a '## Example' section>"
}}

Draft a skill for this description:
{description}
"""

# Wrapped around each follow-up message so the model keeps returning the full
# skill as JSON instead of drifting into chit-chat.
REFINE_MESSAGE = """Apply this change, then output the COMPLETE updated skill as
one JSON object and nothing else:

{message}
"""


def extract_json(text: str) -> dict:
    """Pull a JSON object out of the model's reply.

    Models often wrap JSON in ```json ... ``` fences or add a stray sentence,
    so we slice from the first '{' to the last '}' before parsing.
    """
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found in model reply:\n{text}")
    return json.loads(text[start : end + 1])


# --- Shared client ---------------------------------------------------------
# One client (one background subprocess) for the whole app. Started lazily on
# first use, stopped on shutdown.
_client: CopilotClient | None = None


async def get_client() -> CopilotClient:
    """Return the shared CopilotClient, starting its runtime on first call."""
    global _client
    if _client is None:
        _client = CopilotClient()
        await _client.start()
    return _client


async def shutdown_client() -> None:
    """Stop the shared client's runtime. Call this on app shutdown."""
    global _client
    if _client is not None:
        await _client.stop()
        _client = None


async def _ask(session, prompt: str) -> str:
    """Send one message, wait for the model to finish, return its text."""
    event = await session.send_and_wait(prompt)
    if event is None:
        raise RuntimeError("the model did not reply")
    data = event.data
    if not isinstance(data, AssistantMessageData):
        raise RuntimeError(f"unexpected reply type: {type(data).__name__}")
    return data.content


# --- The two turns ---------------------------------------------------------
async def start_draft(description: str) -> tuple[str, dict]:
    """Turn 1: open a new conversation and draft a skill.

    Returns (session_id, skill_dict). Keep the session_id; pass it to
    refine_draft() to continue the same conversation.
    """
    client = await get_client()
    async with await client.create_session(
        on_permission_request=PermissionHandler.approve_all,  # this task needs no tools
        model="auto",  # let Copilot route to an available model
    ) as session:
        text = await _ask(session, FIRST_MESSAGE.format(description=description))
        return session.session_id, extract_json(text)


async def refine_draft(session_id: str, message: str) -> tuple[str, dict]:
    """Later turns: resume the conversation and apply a change.

    The runtime still remembers the whole conversation, so `message` can be as
    short as "make the instructions shorter" or "add a Python example".
    """
    client = await get_client()
    async with await client.resume_session(
        session_id,
        on_permission_request=PermissionHandler.approve_all,
        model="auto",
    ) as session:
        text = await _ask(session, REFINE_MESSAGE.format(message=message))
        return session.session_id, extract_json(text)


# --- Try the back-and-forth in your terminal -------------------------------
# Run:  python draft_skill.py
# Type a description, see the draft, then keep typing changes. 'quit' to stop.
if __name__ == "__main__":
    async def chat() -> None:
        description = input("Describe the skill you want: ")
        session_id, skill = await start_draft(description)
        print("\n=== DRAFT ===")
        print(json.dumps(skill, indent=2))

        while True:
            change = input("\nChange (or 'quit'): ")
            if change.strip().lower() in {"quit", "q", "exit"}:
                break
            session_id, skill = await refine_draft(session_id, change)
            print("\n=== UPDATED DRAFT ===")
            print(json.dumps(skill, indent=2))

        await shutdown_client()
        print("\nDone. Final skill id:", skill.get("id"))

    asyncio.run(chat())
