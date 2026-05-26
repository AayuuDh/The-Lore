# The Lore

A prototype system for discovering and reusing AI "skills" across Microsoft 365 teams.

## What is a Skill?

A small, reusable unit of AI knowledge — a prompt, workflow, agent config, or repeatable AI-powered process. Skills are meant to be understandable quickly and useful without needing the full project they came from.

## How it works

```
user input  →  matching  →  ranked skills  →  click  →  skill details
```

## Project structure

- `ui/` — React frontend (Person 3: interaction & navigation)
- `matching/` — Python backend, input → skills matching logic (Person 1: core logic)
- `data/` — Skill definitions and test cases (Person 2: data quality)
- `docs/` — Shared design notes and decisions

## Team

Three Microsoft Explore interns. See each folder's README for ownership details.

## Status

Prototype. Not production. No auth, no GitHub integration, no real backend infra yet.
