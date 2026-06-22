"""
Standalone test: ask the Copilot SDK to draft a skill from a plain-English description.

This is a SCRATCH script to prove the SDK works before we wire it into FastAPI.
Run it directly:

    python draft_skill.py

The SDK is an "agent runtime": creating a CopilotClient launches the GitHub
Copilot CLI in the background and talks to it. It is async and event-driven, so
we don't get a return value from send() -- instead we listen for events and
collect the answer when it arrives.
"""

import asyncio
import json

from copilot import CopilotClient
from copilot.session_events import AssistantMessageData, SessionIdleData
from copilot.session import PermissionHandler


# What we want the model to produce. We ask for a JSON object whose fields map
# onto our skill file: id/name/description become the frontmatter, and `body`
# is the markdown body (the ## Instructions and ## Example sections).
PROMPT_TEMPLATE = """You write reusable AI "skills" for a skill library.

Given a short description of what a user wants to do, output ONE skill as a
single JSON object and NOTHING else (no prose, no code fences). Use exactly
these keys:

{{
  "id": "<kebab-case-id>",
  "name": "<Human Readable Name>",
  "description": "<one paragraph: the problem, when to use it, and a few example prompts>",
  "body": "<markdown body containing a very detailed '## Instructions' section and a '## Example' section, possibly with code or scripts, or diagrams, workflows, whatever you think is best.>"
}}

Description to turn into a skill:
{description}
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


async def draft_skill(description: str) -> dict:
    """Send the description to Copilot and return a parsed skill dict."""
    # `async with` starts the background runtime and cleans it up when done.
    async with CopilotClient() as client:
        async with await client.create_session(
            on_permission_request=PermissionHandler.approve_all,  # this task needs no tools
            model="auto",  # let Copilot route to an available model
        ) as session:
            # The SDK streams events at us. We use these two:
            #   AssistantMessageData -> the answer text arrived
            #   SessionIdleData      -> the model is finished, stop waiting
            done = asyncio.Event()
            result = {"text": ""}

            def on_event(event):
                match event.data:
                    case AssistantMessageData() as data:
                        result["text"] = data.content
                    case SessionIdleData():
                        done.set()

            session.on(on_event)
            await session.send(PROMPT_TEMPLATE.format(description=description))
            await done.wait()  # block until SessionIdle fires
            return extract_json(result["text"])


if __name__ == "__main__":
    test_description = "Help me create a clean workflow for a RAG system that has a script that, given a query, filters down the top 10 matches of a query, then AI picks the best match"
    skill = asyncio.run(draft_skill(test_description))
    print("=== PARSED SKILL ===", flush=True)
    print(json.dumps(skill, indent=2), flush=True)
    with open("draft_output.txt", "w", encoding="utf-8") as f:
        f.write(json.dumps(skill, indent=2))
