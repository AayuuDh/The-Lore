"""Skill usage events: an append-only log powering popularity + per-user history.

Each event is one document in the Cosmos `events` container:
    { id, skill_id, user_id, type, ts }

`type` is one of: view, use, download, edit, favorite, unfavorite. We store raw events (not
counters) so totals, unique viewers, and trends can all be computed from the
same log later.

Privacy: events store user_id because per-user history and net-favorites need
it, but the aggregate helpers here return COUNTS ONLY — never a user_id. When
Cosmos isn't configured (local dev), recording no-ops and metrics read as zero.
"""

import os
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()  # ensure COSMOS_KEY is available regardless of import order

# Mirror skills_loader: only use Cosmos when a key is configured.
_USE_COSMOS = bool(os.environ.get("COSMOS_KEY"))

EVENT_TYPES = {"view", "use", "download", "edit", "favorite", "unfavorite"}


def record_event(skill_id: str, user_id: str | None, event_type: str) -> dict | None:
    """Append one event to the log. No-ops (returns None) without Cosmos."""
    if event_type not in EVENT_TYPES:
        raise ValueError(f"unknown event type: {event_type!r}")
    if not skill_id:
        raise ValueError("skill_id is required")
    if not _USE_COSMOS:
        return None

    from cosmos_client import get_events_container
    doc = {
        "id": uuid.uuid4().hex,
        "skill_id": skill_id,
        "user_id": user_id or None,
        "type": event_type,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    get_events_container().create_item(doc)
    return doc


def _count(container, skill_id: str, event_type: str) -> int:
    rows = list(container.query_items(
        query="SELECT VALUE COUNT(1) FROM c WHERE c.skill_id=@s AND c.type=@t",
        parameters=[{"name": "@s", "value": skill_id},
                    {"name": "@t", "value": event_type}],
        partition_key=skill_id,
    ))
    return int(rows[0]) if rows else 0


def _net_favorites(container, skill_id: str) -> int:
    """Distinct users currently favoriting = per-user (favorites - unfavorites) > 0."""
    rows = container.query_items(
        query=(
            "SELECT c.user_id, c.type FROM c WHERE c.skill_id=@s "
            "AND (c.type='favorite' OR c.type='unfavorite')"
        ),
        parameters=[{"name": "@s", "value": skill_id}],
        partition_key=skill_id,
    )
    net: dict[str, int] = {}
    for r in rows:
        uid = r.get("user_id") or "anon"
        net[uid] = net.get(uid, 0) + (1 if r["type"] == "favorite" else -1)
    return sum(1 for v in net.values() if v > 0)


def skill_metrics(skill_id: str) -> dict:
    """Global counts for one skill. Counts only — never any user ids."""
    if not _USE_COSMOS:
        return {"views": 0, "uses": 0, "favorites": 0}
    from cosmos_client import get_events_container
    container = get_events_container()
    return {
        "views": _count(container, skill_id, "view"),
        "uses": _count(container, skill_id, "use") + _count(container, skill_id, "download"),
        "favorites": _net_favorites(container, skill_id),
    }


def user_activity_summary(user_id: str) -> dict:
    """Return one user's activity counts without exposing their event history."""
    empty = {"downloaded": 0, "favorited": 0, "edited": 0}
    if not _USE_COSMOS or not user_id:
        return empty

    from cosmos_client import get_events_container
    rows = get_events_container().query_items(
        query="SELECT c.skill_id, c.type FROM c WHERE c.user_id=@u",
        parameters=[{"name": "@u", "value": user_id}],
        enable_cross_partition_query=True,
    )

    summary = dict(empty)
    favorite_net: dict[str, int] = {}
    for row in rows:
        event_type = row.get("type")
        if event_type == "download":
            summary["downloaded"] += 1
        elif event_type == "edit":
            summary["edited"] += 1
        elif event_type in ("favorite", "unfavorite"):
            skill_id = row.get("skill_id")
            if skill_id:
                favorite_net[skill_id] = favorite_net.get(skill_id, 0) + (
                    1 if event_type == "favorite" else -1
                )
    summary["favorited"] = sum(1 for value in favorite_net.values() if value > 0)
    return summary


def user_history(user_id: str, limit: int = 100) -> list:
    """One user's OWN recent events (their history / trends).

    Cross-partition (events are partitioned by skill_id), newest first. Returns
    only this user's rows — never anyone else's. Empty without Cosmos.
    """
    if not _USE_COSMOS or not user_id:
        return []
    from cosmos_client import get_events_container
    container = get_events_container()
    rows = container.query_items(
        query=(
            "SELECT c.skill_id, c.type, c.ts FROM c WHERE c.user_id=@u "
            "ORDER BY c.ts DESC OFFSET 0 LIMIT @n"
        ),
        parameters=[{"name": "@u", "value": user_id},
                    {"name": "@n", "value": limit}],
        enable_cross_partition_query=True,
    )
    return list(rows)


def all_metrics() -> dict:
    """Global counts for EVERY skill in one pass: { skill_id: {views, uses,
    favorites} }. Counts only, never user ids. Used to size the bento grid.
    Empty without Cosmos.
    """
    if not _USE_COSMOS:
        return {}
    from cosmos_client import get_events_container
    container = get_events_container()
    rows = container.query_items(
        query="SELECT c.skill_id, c.type, c.user_id FROM c",
        enable_cross_partition_query=True,
    )

    counts: dict[str, dict] = {}
    fav_net: dict[str, dict] = {}  # skill_id -> {user_id: net favorites}
    for r in rows:
        sid = r.get("skill_id")
        if not sid:
            continue
        t = r.get("type")
        m = counts.setdefault(sid, {"views": 0, "uses": 0, "favorites": 0})
        if t == "view":
            m["views"] += 1
        elif t in ("use", "download"):
            m["uses"] += 1
        elif t in ("favorite", "unfavorite"):
            uid = r.get("user_id") or "anon"
            per_user = fav_net.setdefault(sid, {})
            per_user[uid] = per_user.get(uid, 0) + (1 if t == "favorite" else -1)

    for sid, per_user in fav_net.items():
        counts.setdefault(sid, {"views": 0, "uses": 0, "favorites": 0})
        counts[sid]["favorites"] = sum(1 for v in per_user.values() if v > 0)

    return counts


