"""Drafting skills with Azure OpenAI -- as a back-and-forth conversation.

Multi-turn flow:
  1. start_draft(description)                    -> (session_id, skill)
  2. refine_draft(session_id, "make it shorter") -> (session_id, skill)

We keep each conversation's message history in memory, keyed by session_id.
Good enough for a prototype on a single backend instance. If the backend
restarts or runs multiple instances, in-flight sessions are lost -- move
_sessions into Cosmos/Redis if that ever matters.

Auth: uses the API key if AZURE_OPENAI_API_KEY is set, otherwise Entra RBAC via
DefaultAzureCredential (your `az login` locally, Managed Identity in production).
"""

import os
import json
import uuid

from dotenv import load_dotenv
from openai import AsyncAzureOpenAI

load_dotenv()

_ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"]
_DEPLOYMENT = os.environ["AZURE_OPENAI_DEPLOYMENT"]
_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21")
_KEY = os.environ.get("AZURE_OPENAI_API_KEY") or None


def _make_client() -> AsyncAzureOpenAI:
    if _KEY:
        return AsyncAzureOpenAI(
            azure_endpoint=_ENDPOINT, api_key=_KEY, api_version=_API_VERSION
        )
    from azure.identity import DefaultAzureCredential, get_bearer_token_provider
    token_provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )
    return AsyncAzureOpenAI(
        azure_endpoint=_ENDPOINT,
        azure_ad_token_provider=token_provider,
        api_version=_API_VERSION,
    )


_client = _make_client()

# session_id -> full chat history (the conversation so far)
_sessions: dict[str, list] = {}


SYSTEM_PROMPT = """You are an expert author of reusable AI "skills" -- small,
self-contained instruction sets that let anyone reliably reproduce a useful
AI-powered task. Your job is to turn a rough description into one polished,
well-structured skill.

This is a multi-turn conversation: I give a description, you draft a skill, then
I ask for changes and you revise. Follow these rules on EVERY reply, including
after a change:

- Output ONE JSON object and nothing else. No prose, no explanations, no code
  fences, no leading or trailing text.
- Always return the COMPLETE current skill, not just the part that changed.
- The JSON must be valid and parseable, using exactly these keys and no others:

{
  "id": "<kebab-case-id: lowercase words joined by single hyphens, derived from the name>",
  "name": "<short, human-readable title in Title Case>",
  "description": "<one tight paragraph covering: the problem it solves, when to use it, and 2-3 concrete example prompts a user might type>",
  "body": "<markdown body with a detailed, step-by-step '## Instructions' section and a realistic '## Example' section showing sample input and the expected output>"
}

Write clear, specific, actionable content -- avoid vague filler. Draft a skill
for this description:
{description}
"""

REFINE_MESSAGE = """Apply this change, then output the COMPLETE updated skill as
one JSON object and nothing else:

{message}
"""


def extract_json(text: str) -> dict:
    """Pull a JSON object out of the model's reply (tolerates stray text/fences)."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found in model reply:\n{text}")
    return json.loads(text[start : end + 1])


async def _ask(messages: list) -> str:
    resp = await _client.chat.completions.create(
        model=_DEPLOYMENT,
        messages=messages,
    )
    return resp.choices[0].message.content


async def start_draft(description: str) -> tuple[str, dict]:
    """Turn 1: open a new conversation and draft a skill."""
    session_id = uuid.uuid4().hex
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Draft a skill for this description:\n{description}"},
    ]
    reply = await _ask(messages)
    messages.append({"role": "assistant", "content": reply})
    _sessions[session_id] = messages
    return session_id, extract_json(reply)


async def refine_draft(session_id: str, message: str) -> tuple[str, dict]:
    """Later turns: resume the conversation and apply a change."""
    messages = _sessions.get(session_id)
    if messages is None:
        raise KeyError(f"unknown session_id: {session_id}")
    messages.append({"role": "user", "content": REFINE_MESSAGE.format(message=message)})
    reply = await _ask(messages)
    messages.append({"role": "assistant", "content": reply})
    return session_id, extract_json(reply)