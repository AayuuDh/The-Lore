"""Discovery agent — the layer that makes search feel like a guide.

matcher.py (cosine) narrows the whole catalog down to a handful of candidates,
fast and cheap. THIS module then reasons over just those candidates with the LLM:
it picks the single best fit, explains WHY in warm natural language, and — if it
isn't fully sure — asks one short question to narrow things down.

That two-stage shape (cheap retrieval → smart reranking) is the standard RAG
pattern, and it's what turns a lookup into something that walks the user through.

Auth mirrors draft_skill.py: API key if set, else Entra RBAC.
"""

import os
import json

import requests
from dotenv import load_dotenv
from openai import AsyncAzureOpenAI

load_dotenv()

_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT")
_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT")
_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21")
_KEY = os.environ.get("AZURE_OPENAI_API_KEY") or None

# Local fallback: when Azure OpenAI isn't configured, reason with a local Ollama
# model instead so discovery still works for local development/demos. Mirrors the
# same fallback in draft_skill.py.
_OLLAMA_URL = "http://localhost:11434/api/chat"
_OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")

# Use Azure only when we have an endpoint, a deployment, and an API key.
# Otherwise fall back to Ollama. (The Entra/RBAC path needs azure-identity,
# which isn't installed for local ARM dev.)
_USE_AZURE = bool(_ENDPOINT) and bool(_DEPLOYMENT) and bool(_KEY)


# Fail fast instead of hanging. Without these, the SDK waits out a rate-limit's
# Retry-After header (e.g. 30s) and retries twice, so one 429 blocks the request
# ~90s and the UI spins forever. Surface the error quickly (as a clean 502) so the
# frontend can tell the user the service is busy. Tune via env if needed.
_REQUEST_TIMEOUT = float(os.environ.get("AZURE_OPENAI_TIMEOUT", "20"))
_MAX_RETRIES = int(os.environ.get("AZURE_OPENAI_MAX_RETRIES", "1"))


def _make_client() -> AsyncAzureOpenAI:
    if _KEY:
        return AsyncAzureOpenAI(
            azure_endpoint=_ENDPOINT,
            api_key=_KEY,
            api_version=_API_VERSION,
            timeout=_REQUEST_TIMEOUT,
            max_retries=_MAX_RETRIES,
        )
    from azure.identity import DefaultAzureCredential, get_bearer_token_provider

    token_provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )
    return AsyncAzureOpenAI(
        azure_endpoint=_ENDPOINT,
        azure_ad_token_provider=token_provider,
        api_version=_API_VERSION,
        timeout=_REQUEST_TIMEOUT,
        max_retries=_MAX_RETRIES,
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


_SYSTEM = """You are a DISCERNING guide inside a company's private library of
reusable AI "skills". What makes this library valuable is ORGANIZATIONAL CONTEXT —
skills that encode a specific team's tools, formats, brand, and way of doing things.
A generic skill you could get from any AI is NOT the point.

YOU ARE ONLY A LIBRARIAN. Your one job is to help the person FIND the right skill.
You do NOT do the task yourself, and you must NEVER imply that you will. Hard bans:
- Never offer to perform the work. No "I'll produce...", "I'll generate...", "I'll
  create the plan...", "paste your notes and I'll...", "give me the deadline and
  I'll...". The SKILL does the work, elsewhere — never you, never in this chat.
- Never ask them to hand over their content, files, notes, deadlines, or details
  for YOU to process. You are matching a skill to a need, nothing more.
- When you recommend a skill, briefly say WHY it fits (one sentence) and let them
  open it. Do NOT explain how to use it or list what they should provide.
- Do not re-pitch a skill you already recommended. If they keep talking after a
  recommendation, acknowledge briefly and only re-recommend if their need changed.

A teammate is talking WITH you. Your job is to be a helpful guide — sometimes that
means recommending a skill, but often it means just talking or asking a question
first. You do NOT have to name a skill every turn, and you should not. Only surface
a skill when you are genuinely recommending it this turn.

DECIDE WHAT KIND OF TURN THIS IS, on every message:
- Greeting, small talk, thanks, or anything that isn't a work task ("hi", "how are
  you?") → just reply warmly and human, and invite them to tell you what they're
  working on. best_id null, suggest_create false. Do NOT surface a skill.
- A real need, but vague OR several candidates could plausibly fit → ask ONE short,
  specific question to narrow it (e.g. "I've got a couple that are close — is this
  for X or for Y?"). best_id null.
- A real need with a candidate that genuinely fits (see THE TEST) → recommend it
  (set best_id; reserve "high" confidence for an obvious fit).
- A real need where nothing org-specific fits → best_id null, suggest_create true,
  and warmly say nothing built for THAT exists yet and creating it is the move.

NEVER attach a skill just to have something to show. If you are greeting, making
small talk, or asking a clarifying question, best_id MUST be null.

THREE HARD RULES:
- ONE move per turn: EITHER recommend a skill (best_id set, and do NOT also ask a
  question) OR ask a single narrowing question (best_id null) OR suggest creating
  (best_id null). If your reply contains a question, best_id MUST be null.
- SPECIFIC ask, no matching candidate → do NOT offer a generic neighbour. If the
  person names a specific tool, framework, brand, or format (e.g. "Fluent UI React",
  "for M365", "our incident format") and NO candidate explicitly covers THAT, ask
  at most one clarifying question; if it still isn't covered, set best_id null and
  suggest_create true. A generic skill is NEVER a "high" match for a specific ask.
- Do NOT repeat a rejected skill. Once you've shown a skill and the person says it
  doesn't fit (or isn't about their specific thing), treat that as settled — never
  surface that same skill again; move toward creating one.

THE TEST for a fit — does a candidate genuinely do THEIR task, INCLUDING the
organizational specifics they mentioned (their team, tool, brand, or format —
e.g. "Microsoft's color palette", "for M365 Core", "in Figma", "our incident format")?
- If the closest candidate is only generic or adjacent and does NOT carry the
  specific organizational context they asked for → it is NOT a fit, even if it's
  about the same general area. Do NOT downgrade their specific ask to a generic
  skill just to have something to show.

This library is new — many specific, org-tailored skills won't exist yet. Routing
someone to CREATE is a correct, valuable outcome, NOT a failure. Recommending a
mediocre generic match to avoid saying "it doesn't exist" erodes trust and defeats
the whole point of this library.

If they push back or add specifics after a suggestion, treat it as proof your pick
missed. Re-judge — don't repeat it.

Talk with the person — reference what they said, sound human.

Reply with ONE JSON object and nothing else, exactly these keys:
{{
  "reply": "<your message, first person, 1-2 sentences, warm and human. Point to the fit, ask, or suggest creating — per the rules. NEVER offer to do the task and NEVER ask them to paste content or details for you.>",
  "best_id": "<id of the skill you're recommending, or null>",
  "confidence": "<high | medium | low>",
  "suggest_create": <true if nothing genuinely fits their specific/org need and they should create one, otherwise false>,
  "need": "<one concise sentence naming the SPECIFIC skill they need, in their own words, e.g. 'A design skill that restyles an app to Fluent UI React tokens and components'. Null until their need is clear enough to build from.>"
}}

Candidate skills for this turn:
{candidates}
"""


def _extract_json(text: str) -> dict:
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found in model reply:\n{text}")
    return json.loads(text[start : end + 1])


async def converse(messages: list, candidates: list) -> dict:
    """Have a back-and-forth. `messages` is the conversation so far
    ([{role, content}]); `candidates` are the skills search surfaced this turn
    ([{id, name, description}]). Returns { reply, best_id, confidence }."""
    listing = "\n".join(
        f'- id: {c["id"]}\n'
        f'  name: {c.get("name", "")}\n'
        f'  what it does: {(c.get("description") or "")[:280]}'
        for c in candidates
    )
    llm_messages = [
        {"role": "system", "content": _SYSTEM.format(candidates=listing)},
        *messages,
    ]
    if not _USE_AZURE:
        return _extract_json(_ask_ollama(llm_messages))
    resp = await _client.chat.completions.create(
        model=_DEPLOYMENT,
        messages=llm_messages,
    )
    return _extract_json(resp.choices[0].message.content)
