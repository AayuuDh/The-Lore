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

import requests
from dotenv import load_dotenv
from openai import AsyncAzureOpenAI

load_dotenv()

_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT")
_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT")
_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21")
_KEY = os.environ.get("AZURE_OPENAI_API_KEY") or None

# Local fallback: when Azure OpenAI isn't configured, draft with a local Ollama
# model instead so the feature still works for local development/demos.
_OLLAMA_URL = "http://localhost:11434/api/chat"
_OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")

# Use Azure only when we have an endpoint, a deployment, and an API key.
# Otherwise fall back to Ollama. (The Entra/RBAC path needs azure-identity,
# which isn't installed for local ARM dev.)
_USE_AZURE = bool(_ENDPOINT) and bool(_DEPLOYMENT) and bool(_KEY)


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


# Only build the Azure client when we're actually going to use it.
_client = _make_client() if _USE_AZURE else None


def _ask_ollama(messages: list) -> str:
    """Local fallback chat completion via Ollama. Returns the reply text."""
    resp = requests.post(
        _OLLAMA_URL,
        json={
            "model": _OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.4},
        },
        timeout=180,
    )
    resp.raise_for_status()
    return resp.json()["message"]["content"]


# session_id -> full chat history (the conversation so far)
_sessions: dict[str, list] = {}


SYSTEM_PROMPT = """You are a knowledge-extraction interviewer. Your mission is
NOT to write a generic AI prompt -- it is to INTERVIEW a person and capture the
organizational, experiential, and team-specific knowledge locked in their head:
expertise, hidden context, real workflows, internal tooling, and hard-won
lessons that a generic AI could never produce from public information.

Act as if you know NOTHING about this person's team, tools, or domain. Be
genuinely curious. Dig for the tacit knowledge people forget to write down.

=== HOW THE CONVERSATION WORKS ===
This is a two-phase, multi-turn conversation:

PHASE 1 -- INTERVIEW. You ask questions, ONE at a time, to uncover the knowledge
below. Ask natural, specific follow-ups that react to what they just said. Never
dump the whole checklist at once. Probe for stories, specifics, names of real
tools/systems/repos, and the "why" behind decisions. Keep asking until you have
substantive answers covering EVERY required area (a short or vague answer is a
cue to follow up, not to move on).

Required knowledge to extract before you may draft:
  1.  What the skill is called.
  2.  What problem it solves.
  3.  Who it is for (audience/role).
  4.  Which team / org / workspace it was created for.
  5.  The real project, workflow, or process that led to its creation.
  6.  Internal tools, systems, dashboards, repos, or documents it relies on.
  7.  Team-specific terminology or acronyms needed to understand it.
  8.  Knowledge it captures that is NOT obvious from documentation.
  9.  Mistakes new team members commonly make that this skill prevents.
  10. Required inputs.
  11. The output it produces.
  12. When someone SHOULD use it.
  13. When someone should NOT use it.
  14. A concrete real-world example.
  15. How another team could adapt it.

Prioritize organizational and experiential knowledge over prompt text. If an
answer sounds like something a public chatbot already knows, push for the
insider version: "What would a new hire get wrong here?", "What isn't written
down anywhere?", "Which internal system does that actually run against?".

PHASE 2 -- DRAFT. Only once you have real, specific answers across all required
areas (or the user explicitly tells you to draft now / stop asking), produce the
structured skill profile. If the user forces an early draft, fill what you can
and leave honest gaps rather than inventing details. After the first draft, treat
every further message as a refinement request and re-emit the COMPLETE profile.

=== OUTPUT PROTOCOL (STRICT) ===
EVERY reply is exactly ONE JSON object and nothing else -- no prose, no code
fences, no leading or trailing text. It must be one of these two shapes:

While interviewing:
{"type": "question", "message": "<your single next question, warm and specific>"}

When ready to draft (or when refining an existing draft):
{
  "type": "draft",
  "skill": {
    "id": "<kebab-case id derived from the name>",
    "name": "<short human-readable title>",
    "description": "<one tight search-friendly paragraph: the problem, the audience, and when to use it>",
    "profile": {
      "problem": "<the problem it solves>",
      "audience": "<who it is for>",
      "team_context": "<the team/org and the real project or workflow that led to it>",
      "workspace_context": "<the workspace/environment it lives in>",
      "embedded_knowledge": "<the non-obvious, experiential knowledge this captures>",
      "required_inputs": ["<input>", "..."],
      "workflow": "<the step-by-step workflow / instructions>",
      "expected_outputs": ["<output>", "..."],
      "internal_dependencies": ["<internal tool/system/repo/doc>", "..."],
      "common_pitfalls": ["<mistake this skill prevents>", "..."],
      "example_usage": "<a concrete real-world example>",
      "adaptation_notes": "<how another team could adapt it>",
      "tags": ["<keyword>", "..."]
    }
  }
}

Use the profile values the user actually gave you. Do not fabricate internal
tools, terminology, or teams -- if something is genuinely unknown, say so plainly
in that field. List fields may be empty arrays if truly nothing applies.
"""

# What we seed the conversation with when the user hasn't typed anything yet:
# the model should open the interview with its first question.
INTERVIEW_KICKOFF = (
    "I want to capture a skill that preserves my team's knowledge. Begin the "
    "interview and ask me your first question."
)

# Turn 1: the user's opening description. We explicitly ask the model to START
# THE INTERVIEW rather than draft immediately, so it asks a question back.
START_MESSAGE = (
    "Here is what I want to capture, in my own words:\n{description}\n\n"
    "Do NOT draft yet. Treat this as the very start of the interview: acknowledge "
    "briefly and ask me your FIRST question (one question only), following the "
    "output protocol."
)

# Every later turn: the user's answer to your last question, or a refinement of
# an existing draft. We re-state the protocol so the model keeps interviewing
# until it has enough, then emits the full profile.
REFINE_MESSAGE = (
    "{message}\n\n"
    "(Follow the output protocol exactly: reply with ONE JSON object — either "
    '{{"type":"question", ...}} for your next interview question if you still '
    'need more, or {{"type":"draft", ...}} with the COMPLETE skill profile once '
    "you have substantive answers across the required areas.)"
)


# The section headings we render, in order, from the structured profile the
# model returns. Each entry is (profile_key, "Heading", is_list).
_PROFILE_SECTIONS = [
    ("problem", "Problem", False),
    ("audience", "Audience", False),
    ("team_context", "Team Context", False),
    ("workspace_context", "Workspace Context", False),
    ("embedded_knowledge", "Embedded Knowledge", False),
    ("required_inputs", "Required Inputs", True),
    ("workflow", "Workflow / Instructions", False),
    ("expected_outputs", "Expected Outputs", True),
    ("internal_dependencies", "Internal Dependencies", True),
    ("common_pitfalls", "Common Pitfalls", True),
    ("example_usage", "Example Usage", False),
    ("adaptation_notes", "Adaptation Notes", False),
    ("tags", "Tags", True),
]


def profile_to_body(profile: dict) -> str:
    """Render the structured interview profile into a markdown body.

    Skills are stored and displayed as markdown, so we turn the profile the model
    produced into `## Section` blocks. Empty fields are skipped so a partial draft
    doesn't render a wall of blank headings.
    """
    profile = profile or {}
    parts: list[str] = []
    for key, heading, is_list in _PROFILE_SECTIONS:
        value = profile.get(key)
        if is_list:
            items = [str(v).strip() for v in (value or []) if str(v).strip()]
            if not items:
                continue
            body = "\n".join(f"- {item}" for item in items)
        else:
            body = str(value or "").strip()
            if not body:
                continue
        parts.append(f"## {heading}\n\n{body}")
    return "\n\n".join(parts)


def _finalize(reply_json: dict) -> dict:
    """Normalize a model reply into the envelope the API/UI consume.

    Question turn -> {"type": "question", "message": "..."}
    Draft turn    -> {"type": "draft", "skill": {id, name, description, body, profile}}

    The model is instructed to emit a `profile` object; we render it into a
    markdown `body` so the rest of the app (save, search, detail view) works
    unchanged.
    """
    is_draft = reply_json.get("type") == "draft" or "skill" in reply_json
    if not is_draft:
        return {
            "type": "question",
            "message": reply_json.get("message", "").strip(),
        }

    skill = reply_json.get("skill", reply_json) or {}
    profile = skill.get("profile", {}) or {}
    return {
        "type": "draft",
        "skill": {
            "id": (skill.get("id") or "").strip(),
            "name": (skill.get("name") or "").strip(),
            "description": (skill.get("description") or "").strip(),
            "body": profile_to_body(profile),
            "profile": profile,
        },
    }


def extract_json(text: str) -> dict:
    """Pull a JSON object out of the model's reply (tolerates stray text/fences)."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found in model reply:\n{text}")
    return json.loads(text[start : end + 1])


async def _ask(messages: list) -> str:
    # Local fallback path: synchronous Ollama call when Azure isn't configured.
    if not _USE_AZURE:
        return _ask_ollama(messages)
    resp = await _client.chat.completions.create(
        model=_DEPLOYMENT,
        messages=messages,
    )
    return resp.choices[0].message.content


async def start_draft(description: str) -> tuple[str, dict]:
    """Turn 1: open a new interview conversation.

    Returns the session_id plus an envelope: normally a first question, unless the
    user explicitly asked to draft right away.
    """
    session_id = uuid.uuid4().hex
    opening = (description or "").strip() or INTERVIEW_KICKOFF
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": START_MESSAGE.format(description=opening)},
    ]
    reply = await _ask(messages)
    messages.append({"role": "assistant", "content": reply})
    _sessions[session_id] = messages
    return session_id, _finalize(extract_json(reply))


async def refine_draft(session_id: str, message: str) -> tuple[str, dict]:
    """Later turns: resume the interview — answer a question or refine the draft."""
    messages = _sessions.get(session_id)
    if messages is None:
        raise KeyError(f"unknown session_id: {session_id}")
    messages.append({"role": "user", "content": REFINE_MESSAGE.format(message=message)})
    reply = await _ask(messages)
    messages.append({"role": "assistant", "content": reply})
    return session_id, _finalize(extract_json(reply))