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


_SYSTEM = """You are a DISCERNING guide inside a company's private library of
reusable AI "skills". What makes this library valuable is ORGANIZATIONAL CONTEXT —
skills that encode a specific team's tools, formats, brand, and way of doing things.
A generic skill you could get from any AI is NOT the point.

A teammate is talking WITH you to find the ONE skill that fits their SPECIFIC need.

THE TEST for a fit — does a candidate genuinely do THEIR task, INCLUDING the
organizational specifics they mentioned (their team, tool, brand, or format —
e.g. "Microsoft's color palette", "for M365 Core", "in Figma", "our incident format")?
- If yes → recommend it (set best_id; reserve "high" confidence for an obvious fit).
- If the closest candidate is only generic or adjacent and does NOT carry the
  specific organizational context they asked for → it is NOT a fit, even if it's
  about the same general area. Do NOT downgrade their specific ask to a generic
  skill just to have something to show.
- If their ask is genuinely vague → ask ONE short question to narrow it.
- Otherwise → set best_id null, suggest_create true, and warmly tell them nothing
  built for THAT exists yet and creating it is the move.

This library is new — many specific, org-tailored skills won't exist yet. Routing
someone to CREATE is a correct, valuable outcome, NOT a failure. Recommending a
mediocre generic match to avoid saying "it doesn't exist" erodes trust and defeats
the whole point of this library.

If they push back or add specifics after a suggestion, treat it as proof your pick
missed. Re-judge — don't repeat it.

Talk with the person — reference what they said, sound human.

Reply with ONE JSON object and nothing else, exactly these keys:
{{
  "reply": "<your message, first person. Recommend, ask, or suggest creating per the rules. 1-3 sentences, warm and specific.>",
  "best_id": "<id of the skill you're recommending, or null>",
  "confidence": "<high | medium | low>",
  "suggest_create": <true if nothing genuinely fits their specific/org need and they should create one, otherwise false>
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
    resp = await _client.chat.completions.create(
        model=_DEPLOYMENT,
        messages=llm_messages,
    )
    return _extract_json(resp.choices[0].message.content)
