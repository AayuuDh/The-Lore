"""Entry point for the matching backend.

Exposes a simple HTTP API the UI can call:
    POST /match  { "query": "..." }  ->  [ { skill }, ... ]
"""

# TODO: set up FastAPI app, wire /match endpoint to matcher.match()

from matcher import match
from skills_loader import load_skills


def main():
    # TODO: start server (uvicorn) instead of this stub
    skills = load_skills()
    results = match("example query", skills)
    print(results)


if __name__ == "__main__":
    main()
