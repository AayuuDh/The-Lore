# Product Requirements: AI Add-Skill

**The Lore**  |  Owner: Erk (PM)  |  Status: In progress (building for real, not a throwaway prototype)

## 1. Problem

Adding a new skill to the catalog currently means hand-writing a markdown file
with correct frontmatter (`id`, `name`, `description`) and a structured body.
That is a barrier for non-technical contributors and produces inconsistent
skill quality, which directly affects matching accuracy.

## 2. Goal

Let a user describe a skill in plain, messy language and have AI iteratively
shape it into a well-structured skill (proper frontmatter + body) through a
back-and-forth chat. Once approved, the skill is saved into the catalog so it
becomes searchable.

## 3. Non-goals (explicitly out of scope)

- **NOT** editing or deleting existing skills (creation only).
- **NOT** user accounts / per-user skill ownership beyond what exists.
- **NOT** building a general-purpose agent framework; this is one focused
  skill-authoring agent.

> Note: persistence (whether saved skills live only on the server's disk vs.
> being committed to the shared repo) is now an open question, since we are
> building for real and a local-only file is lost on restart. See section 6.

## 4. User flow

1. User opens Add Skill and types a rough description of the skill.
2. AI responds with a structured draft and/or clarifying questions.
3. User and AI go back and forth until the skill reads well.
4. User approves the final draft.
5. System saves it as a `data/skills/<id>.md` file with valid frontmatter; it
   then appears in the catalog.

## 5. Requirements

- Chat UI with multi-turn conversation state (React).
- Backend endpoint that takes raw text + conversation and returns a structured
  skill (`id`, `name`, `description`, `body`).
- LLM access through the **Copilot SDK** (Python supported), the sanctioned path
  for a real tool/agent. Sandbox is explicitly NOT used here, since Sandbox is
  for prototyping only and this is being built for real.
- Backend endpoint that writes an approved skill to `data/skills/<id>.md` with
  valid frontmatter.
- Generated `id` must be a unique kebab-case slug; handle collisions.
- Saved skill must match the existing format so the loader and matcher pick it
  up with no other changes.

## 6. Open questions

- **Platform confirmed:** Copilot SDK (over Work IQ / Graph) because this is a
  conversational agent that takes an action, and it supports Python. Still need
  mentor sign-off that Add-Skill counts as a "real tool" requiring this rather
  than Sandbox.
- **Persistence:** now that we're building for real, a local-only `.md` file is
  lost when the server restarts. Do saved skills need to persist to the shared
  repo (commit/PR), or is server-local storage acceptable for now? → decide with
  mentor.
- **LLM call location:** frontend vs. backend. Leaning backend: the save step
  must be backend anyway, and credentials stay server-side.
- Do we need a review/approval step before a skill goes live, or is self-serve
  creation acceptable?

## 7. Milestones (build order)

- **M1:** Backend `POST /draft-skill` returning a HARDCODED structured skill
  (prove the flow end-to-end, no LLM yet).
- **M2:** Swap the hardcoded response for a real Copilot SDK LLM call.
- **M3:** Backend `POST /skills` that writes the approved `.md` file.
- **M4:** Build the chat UI and wire the back-and-forth.
- **M5:** Polish (loading states, errors, empty states).
