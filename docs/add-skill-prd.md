# Product Requirements: AI Add-Skill

**The Lore**  |  Owner: Erk (PM)  |  Status: Draft

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

- **NOT** automatically committing or pushing skills to GitHub. The MVP writes a
  local markdown file only.
- **NOT** opening pull requests or branching via automation.
- **NOT** editing or deleting existing skills (creation only).
- **NOT** user accounts / per-user skill ownership beyond what exists.

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
- LLM call routed through the sanctioned Sandbox / Substrate platform (not a
  direct third-party API).
- Backend endpoint that writes an approved skill to `data/skills/<id>.md` with
  valid frontmatter.
- Generated `id` must be a unique kebab-case slug; handle collisions.
- Saved skill must match the existing format so the loader and matcher pick it
  up with no other changes.

## 6. Open questions

- Does the Substrate LLM call happen in the Vite frontend or the FastAPI
  backend? (Leaning backend: the save step must be backend anyway, and
  credentials stay server-side.) → ask mentor.
- Which model / endpoint on Substrate, and what is the auth pattern from the
  sandbox template?
- Do we need any review/approval step before a skill goes live, or is self-serve
  creation acceptable for the prototype?

## 7. Milestones (build order)

- **M1:** Backend `POST /draft-skill` returning a HARDCODED structured skill
  (prove the flow end-to-end, no LLM yet).
- **M2:** Swap the hardcoded response for a real Substrate LLM call.
- **M3:** Backend `POST /skills` that writes the approved `.md` file.
- **M4:** Build the chat UI and wire the back-and-forth.
- **M5:** Polish (loading states, errors, empty states).
