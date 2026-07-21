"""Persistent chat conversation storage in Azure Cosmos DB."""

from datetime import datetime, timezone

from azure.cosmos.exceptions import CosmosResourceNotFoundError

from cosmos_client import get_conversations_container


VALID_CONVERSATION_TYPES = {"discover", "draft"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_messages(messages: list) -> list:
    """Keep only safe, displayable message fields."""
    cleaned = []

    for message in messages or []:
        if not isinstance(message, dict):
            continue

        role = message.get("role")
        content = message.get("content")

        if role not in {"user", "assistant"}:
            continue

        if not isinstance(content, str) or not content.strip():
            continue

        item = {
            "role": role,
            "content": content.strip(),
        }

        # Optional metadata used by Discover.
        for field in (
            "skill_id",
            "skill_name",
            "confidence",
            "suggest_create",
        ):
            value = message.get(field)
            if value is not None:
                item[field] = value

        cleaned.append(item)

    return cleaned


def upsert_conversation(
    user_id: str,
    conversation_id: str,
    conversation_type: str,
    title: str,
    messages: list,
) -> dict:
    """Create a conversation or replace its latest transcript."""
    if not user_id:
        raise ValueError("user_id is required")

    if not conversation_id:
        raise ValueError("conversation_id is required")

    if conversation_type not in VALID_CONVERSATION_TYPES:
        raise ValueError("type must be 'discover' or 'draft'")

    container = get_conversations_container()
    cleaned_messages = _clean_messages(messages)
    now = _now()

    try:
        existing = container.read_item(
            item=conversation_id,
            partition_key=user_id,
        )
        created_at = existing.get("created_at", now)
        pinned = bool(existing.get("pinned", False))
    except CosmosResourceNotFoundError:
        created_at = now
        pinned = False

    first_user_message = next(
        (
            message["content"]
            for message in cleaned_messages
            if message["role"] == "user"
        ),
        "",
    )

    clean_title = (title or first_user_message or "Untitled chat").strip()[:100]

    document = {
        "id": conversation_id,
        "user_id": user_id,
        "type": conversation_type,
        "title": clean_title,
        "preview": first_user_message[:160],
        "message_count": len(cleaned_messages),
        "messages": cleaned_messages,
        "pinned": pinned,
        "created_at": created_at,
        "updated_at": now,
    }

    return container.upsert_item(document)


def list_conversations(user_id: str, limit: int = 100) -> list:
    """Return lightweight conversation summaries, newest first."""
    if not user_id:
        return []

    container = get_conversations_container()

    rows = container.query_items(
        query=(
            "SELECT TOP @limit "
            "c.id, c.type, c.title, c.preview, c.message_count, "
            "c.pinned, c.created_at, c.updated_at "
            "FROM c "
            "WHERE c.user_id = @user_id "
            "ORDER BY c.updated_at DESC"
        ),
        parameters=[
            {"name": "@limit", "value": limit},
            {"name": "@user_id", "value": user_id},
        ],
        partition_key=user_id,
    )

    # Pinned conversations float to the top; the stable sort keeps each group in
    # the newest-first order the query already returned.
    conversations = list(rows)
    conversations.sort(key=lambda c: not c.get("pinned", False))
    return conversations


def get_conversation(user_id: str, conversation_id: str) -> dict | None:
    """Return one full conversation belonging to one user."""
    if not user_id or not conversation_id:
        return None

    container = get_conversations_container()

    try:
        return container.read_item(
            item=conversation_id,
            partition_key=user_id,
        )
    except CosmosResourceNotFoundError:
        return None


def delete_conversation(user_id: str, conversation_id: str) -> bool:
    """Delete one conversation belonging to one user."""
    container = get_conversations_container()

    try:
        container.delete_item(
            item=conversation_id,
            partition_key=user_id,
        )
        return True
    except CosmosResourceNotFoundError:
        return False

def update_conversation(
    user_id: str,
    conversation_id: str,
    title: str | None = None,
    messages: list | None = None,
    pinned: bool | None = None,
) -> dict | None:
    """Update the title, pin state, and/or transcript of an existing conversation."""

    if not user_id:
        raise ValueError("user_id is required")

    if not conversation_id:
        raise ValueError("conversation_id is required")

    container = get_conversations_container()

    try:
        conversation = container.read_item(
            item=conversation_id,
            partition_key=user_id,
        )
    except CosmosResourceNotFoundError:
        return None

    if title is not None:
        clean_title = title.strip()

        if not clean_title:
            raise ValueError("title cannot be empty")

        conversation["title"] = clean_title[:100]

    if messages is not None:
        cleaned_messages = _clean_messages(messages)
        conversation["messages"] = cleaned_messages
        conversation["message_count"] = len(cleaned_messages)

        first_user_message = next(
            (
                message["content"]
                for message in cleaned_messages
                if message["role"] == "user"
            ),
            "",
        )

        conversation["preview"] = first_user_message[:160]

    if pinned is not None:
        conversation["pinned"] = bool(pinned)

    conversation["updated_at"] = _now()

    return container.replace_item(
        item=conversation_id,
        body=conversation,
    )