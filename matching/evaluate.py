"""Evaluation harness: scores the matcher against hand-written test cases.

Run from the repo root:
    python matching/evaluate.py

Reads test cases from data/test-cases/*.json (files prefixed with '_' are skipped).
Each test case looks like:
    { "query": "...", "expected_skill_ids": ["skill-id-1", ...] }

A case is considered correct at top-k if ANY expected id appears in the top-k results.
"""

import json
from pathlib import Path

from matcher import match, precompute_skill_vectors
from skills_loader import load_skills

TEST_CASES_DIR = Path(__file__).parent.parent / "data" / "test-cases"
TOP_KS = [1, 3, 5]


def load_test_cases() -> list:
    """Load every non-underscore .json file in test-cases/. Supports a list of
    cases per file or a single case object."""
    cases = []
    for path in TEST_CASES_DIR.glob("*.json"):
        if path.name.startswith("_"):
            continue
        with open(path) as f:
            data = json.load(f)
        if isinstance(data, list):
            cases.extend(data)
        else:
            cases.append(data)
    return cases


def evaluate(cases: list, skills_with_vectors: list) -> None:
    max_k = max(TOP_KS)
    correct = {k: 0 for k in TOP_KS}
    failures = []

    for case in cases:
        query = case["query"]
        expected = set(case["expected_skill_ids"])
        results = match(query, skills_with_vectors, top_k=max_k)
        result_ids = [skill["id"] for skill, _score in results]

        hit_at = next(
            (i + 1 for i, sid in enumerate(result_ids) if sid in expected),
            None,
        )

        for k in TOP_KS:
            if hit_at is not None and hit_at <= k:
                correct[k] += 1

        scored_ids = [(sid, round(score, 3)) for sid, (_, score) in zip(result_ids, results)]
        status = f"top-{hit_at}" if hit_at else "MISS"
        print(f"[{status:>6}] {query!r}")
        print(f"         expected: {sorted(expected)}")
        print(f"         got:      {scored_ids}")

        if hit_at is None or hit_at > 1:
            failures.append((query, expected, scored_ids))

    total = len(cases)
    print("\n" + "=" * 60)
    print(f"Results over {total} test cases:")
    for k in TOP_KS:
        pct = 100 * correct[k] / total if total else 0
        print(f"  top-{k}: {correct[k]}/{total}  ({pct:.1f}%)")

    if failures:
        print("\nFailures / non-top-1:")
        for query, expected, scored_ids in failures:
            print(f"  query:    {query!r}")
            print(f"  expected: {sorted(expected)}")
            print(f"  got:      {scored_ids}")
            print()


if __name__ == "__main__":
    print("loading skills + computing vectors...")
    skills = precompute_skill_vectors(load_skills())
    print(f"loaded {len(skills)} skills\n")

    cases = load_test_cases()
    print(f"loaded {len(cases)} test cases\n")

    evaluate(cases, skills)
