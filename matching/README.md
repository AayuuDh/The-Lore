# Matching

Python backend that maps a user's input to relevant skills.

**Owner:** Erk
## Responsibility

- Load skills from `../data/skills/`
- Accept a user query
- Return a ranked list of relevant skills

## Files

- `main.py` — entry point / API server
- `matcher.py` — matching algorithm (keyword, embedding, or LLM-assisted)
- `skills_loader.py` — reads skills from `data/`
- `requirements.txt` — Python dependencies

## Run (later)

```bash
pip install -r requirements.txt
python main.py
```
