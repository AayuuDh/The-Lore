"""A small in-process rate limiter for the endpoints that cost real money.

Why this exists
---------------
`/discover`, `/draft-skill`, `/draft-skill/refine` and `/edit-skill` each call
Azure OpenAI on our subscription. They were reachable anonymously from the
public internet with no throttle, so a single script could run up the bill (or
exhaust the deployment's quota and take the feature down for everyone). The
skills endpoints are cheap reads and are deliberately left alone.

Scope and limits (be honest about these)
----------------------------------------
- **In-process.** Counters live in this process's memory, so they reset on
  restart and are not shared across App Service instances. At the current scale
  (Basic B1, single instance) that is fine. If the plan ever scales out, this
  becomes per-instance and the effective limit multiplies by the instance count
  — at which point this should move to Redis or Azure API Management.
- **Not a security boundary.** It blunts casual abuse and runaway loops. It does
  not stop a determined attacker with many source addresses. Authentication is
  the real control; this is defense in depth.

Configuration
-------------
    RATE_LIMIT_LLM=20/60     # 20 requests per 60 seconds per caller (default)
    RATE_LIMIT_LLM=0         # disabled
"""

import os
import time
from collections import defaultdict, deque

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request

import auth

load_dotenv()


def _parse_limit(raw: str) -> tuple[int, int]:
    """Parse "requests/seconds" into a tuple. Falls back to the default on junk.

    Unset, blank and malformed all land here, so this fallback is the single
    place the default limit is written.
    """
    try:
        count, _, window = raw.partition("/")
        return int(count), int(window or 60)
    except ValueError:
        return 20, 60


_LIMIT, _WINDOW = _parse_limit(os.environ.get("RATE_LIMIT_LLM", ""))

# caller key -> timestamps of recent hits, oldest first
_hits: dict[str, deque] = defaultdict(deque)
_last_sweep = 0.0


def _caller_key(request: Request, principal: dict | None) -> str:
    """Identify the caller: their verified id if we have one, else their address.

    A token subject is far better than an IP — it survives NAT (where a whole
    office shares one address and would otherwise share one bucket) and cannot
    be rotated by picking a new source address.

    Falling back to IP: App Service appends the real client address to
    X-Forwarded-For, so the LAST entry is the one the platform observed. A
    client can spoof *earlier* entries by sending its own header, which is
    exactly why we don't read the first one.
    """
    if principal:
        return f"oid:{principal['oid']}"

    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        # strip the ":port" App Service includes, and any spoofed prefix
        return "ip:" + forwarded.split(",")[-1].strip().rsplit(":", 1)[0]
    return "ip:" + (request.client.host if request.client else "unknown")


def _sweep(now: float) -> None:
    """Drop callers with nothing left in the window. Runs once per window.

    Sweeping on elapsed time rather than on dict size matters: a size trigger
    fires on every request once enough callers are active, rescanning the whole
    dict to free nothing, and never reclaims anything at all below the
    threshold.
    """
    global _last_sweep
    if now - _last_sweep <= _WINDOW:
        return
    _last_sweep = now
    cutoff = now - _WINDOW
    for key in [k for k, hits in _hits.items() if hits[-1] <= cutoff]:
        del _hits[key]


def check(request: Request, principal: dict | None = None) -> None:
    """Record one hit and raise 429 if the caller is over their limit."""
    if _LIMIT <= 0:  # explicitly disabled
        return

    now = time.monotonic()  # monotonic: immune to clock adjustments
    _sweep(now)

    bucket = _hits[_caller_key(request, principal)]

    # Drop everything that has aged out of the window, so the deque only ever
    # holds the hits that still count against this caller.
    cutoff = now - _WINDOW
    while bucket and bucket[0] <= cutoff:
        bucket.popleft()

    if len(bucket) >= _LIMIT:
        retry_after = max(1, int(bucket[0] + _WINDOW - now) + 1)
        raise HTTPException(
            status_code=429,
            detail=f"rate limit exceeded ({_LIMIT} requests per {_WINDOW}s)",
            headers={"Retry-After": str(retry_after)},
        )

    bucket.append(now)


def llm_limit(
    request: Request,
    principal: dict | None = Depends(auth.current_principal),
) -> None:
    """Dependency form, for `@app.post(..., dependencies=[Depends(llm_limit)])`.

    Declaring the throttle in the decorator rather than calling it in the
    handler body keeps it visible on the route and consistent with how auth is
    wired — and means a new paid endpoint can't quietly ship unthrottled.
    """
    check(request, principal)
