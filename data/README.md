# Data

Skill definitions and test cases.

**Owner:** Trisha
## Subfolders

- `skills/` — one file per skill. Each describes a reusable AI prompt / workflow / agent pattern.
- `test-cases/` — example user queries paired with the skills that *should* match. Used to evaluate matching quality.

## Skill schema (proposed, TODO finalize)

```json
{
  "id": "summarize-meeting-notes",
  "name": "Summarize Meeting Notes",
  "description": "Short one-liner.",
  "tags": ["summarization", "meetings"],
  "use_cases": ["..."],
  "prompt": "...",
  "example_input": "...",
  "example_output": "..."
}
```

## Test case schema (proposed)

```json
{
  "query": "summarize meeting notes",
  "expected_skill_ids": ["summarize-meeting-notes"]
}
```
