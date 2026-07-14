"""AI side-agent for the skill editor.

Unlike the interview in draft_skill.py, this is a lightweight, mostly stateless
helper: the editor sends the CURRENT skill plus a plain-English instruction, and
we return the FULL updated skill. The frontend applies the result immediately
(Cursor-style), so there is no server-side session to track.

We reuse the Azure OpenAI client and JSON extractor already built in
draft_skill.py so there is a single place that owns Azure config.
"""

from draft_skill import _client, _DEPLOYMENT, extract_json


_EDIT_SYSTEM = """You are an inline editing assistant inside a skill editor. A
skill is a reusable, organization-specific how-to, stored as markdown.

The user gives you the CURRENT skill (name, description, markdown body) and one
instruction describing a change they want. Apply the instruction and return the
COMPLETE updated skill — not a diff, the whole thing.

Rules:
- Change only what the instruction asks for. Preserve everything else verbatim,
  including markdown headings and structure, unless the instruction says to
  change them.
- Do NOT invent organizational facts, tool names, teams, or specifics that are
  not already in the skill. If the instruction needs information you cannot
  know, leave a clear [placeholder] rather than making something up.
- Keep the writing tight and practical. Never add filler.
- If a "Copied from ..." note is present at the top of the body, leave it in
  place.

Reply with exactly ONE JSON object and nothing else — no prose, no code fences:
{
  "name": "<updated name>",
  "description": "<updated one-line description>",
  "body": "<the full updated markdown body>",
  "note": "<one short sentence describing what you changed>"
}
"""


async def edit_skill(skill: dict, instruction: str, history: list | None = None) -> dict:
    """Apply `instruction` to `skill` and return the updated skill.

    `history` is an optional list of prior {role, content} turns so the agent has
    a little conversational memory within an editing session; it is fine to omit.
    """
    skill = skill or {}
    current = (
        "Current skill:\n"
        f"name: {skill.get('name', '')}\n"
        f"description: {skill.get('description', '')}\n\n"
        "body (markdown):\n"
        f"{skill.get('body', '')}"
    )

    messages = [{"role": "system", "content": _EDIT_SYSTEM}]
    for turn in history or []:
        role = turn.get("role")
        content = turn.get("content")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append(
        {"role": "user", "content": f"{current}\n\nInstruction: {instruction}"}
    )

    resp = await _client.chat.completions.create(model=_DEPLOYMENT, messages=messages)
    data = extract_json(resp.choices[0].message.content)

    # Fall back to the incoming values so a partial reply never wipes a field.
    return {
        "name": (data.get("name") or skill.get("name") or "").strip(),
        "description": (data.get("description") or skill.get("description") or "").strip(),
        "body": data.get("body") or skill.get("body") or "",
        "note": (data.get("note") or "").strip(),
    }
