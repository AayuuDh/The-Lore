"""User profiles: anonymous usernames + optional contact details.

Every signed-in person gets ONE profile document in the Cosmos `users`
container, keyed by the stable id their sign-in provider gives us (the MSAL
account's localAccountId). The profile holds:

    id             - the stable per-user key (partition key)
    username       - a Reddit-style anonymous handle, e.g. "AnonymousPanda"
    username_lower - the same, lowercased, so uniqueness checks are case-insensitive
    contactable    - None (undecided) | True | False. Whether other users may be
                     told how to reach this person to ask about their skills.
    contact_email  - optional free-text contact fields (all default to "")
    contact_phone
    contact_other
    created_at     - ISO timestamp

The username is generated randomly (adjective + noun + maybe a number) and is
NEVER derived from the person's real name or Microsoft alias, so it stays
anonymous like Google Docs' "Anonymous Panda". It is guaranteed unique: we retry
generation (and add digits) until we find a handle no one else has.
"""

import random
from datetime import datetime, timezone

from azure.cosmos.exceptions import CosmosResourceNotFoundError

from cosmos_client import get_users_container


# Word banks for the "AdjectiveNoun" handle. Kept broad (not just animals) so the
# space is large and names feel varied, closer to what Reddit generates.
_ADJECTIVES = [
    "Anonymous", "Brave", "Clever", "Curious", "Daring", "Eager", "Fuzzy",
    "Gentle", "Happy", "Jolly", "Keen", "Lucky", "Mellow", "Nimble", "Plucky",
    "Quiet", "Rapid", "Sunny", "Swift", "Witty", "Zesty", "Cosmic", "Electric",
    "Golden", "Hidden", "Silent", "Velvet", "Wandering", "Radiant", "Turbo",
    "Vivid", "Whimsical", "Zephyr", "Luminous", "Mystic", "Nova", "Quantum",
    "Stellar", "Vortex", "Aurora", "Blazing", "Celestial", "Ethereal", "Galactic",
    "Harmonic", "Infinite", "Luminescent", "Nebulous", "Radiant", "Spectral",
    "Transcendent", "Vibrant", "Whispering", "Zenith", "Aetherial", "Chimerical",
    "Ecliptic", "Frosted", "Gossamer", "Hallowed",
]

_NOUNS = [
    "Panda", "Tiger", "Falcon", "Otter", "Fox", "Wolf", "Heron", "Lynx",
    "Comet", "Nebula", "Quartz", "Cipher", "Pixel", "Maple", "River", "Ember",
    "Harbor", "Lantern", "Meadow", "Summit", "Willow", "Cobra", "Dragon",
    "Phoenix", "Raven", "Badger", "Marmot", "Puffin", "Walrus", "Beacon",
    "Canyon", "Dune", "Oasis", "Prairie", "Tundra", "Vortex", "Zephyr",
    "Aurora", "Blizzard", "Cyclone", "Eclipse", "Horizon", "Monsoon", "Tempest",
    "Whirlwind", "Zeppelin", "Basilisk", "Chimera", "Golem", "Kraken", "Leviathan", "Minotaur", "Sphinx",
    "Wendigo", "Yeti", "Griffin", "Hydra", "Pegasus", "Sasquatch", "Troll",
    "Vampire", "Werewolf", "Zombie", "Banshee",
]

# How many random handles to try before we start appending numbers.
_MAX_PLAIN_TRIES = 12


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _random_handle(with_number: bool = False) -> str:
    """Return one random AdjectiveNoun handle, optionally with a trailing number."""
    handle = random.choice(_ADJECTIVES) + random.choice(_NOUNS)
    if with_number:
        handle += str(random.randint(1, 9999))
    return handle


def _username_taken(container, username_lower: str, *, exclude_id: str = None) -> bool:
    """True if some OTHER user already owns this (case-insensitive) username."""
    query = "SELECT c.id FROM c WHERE c.username_lower = @u"
    params = [{"name": "@u", "value": username_lower}]
    for item in container.query_items(
        query=query, parameters=params, enable_cross_partition_query=True
    ):
        if item["id"] != exclude_id:
            return True
    return False


def generate_username(container) -> str:
    """Return a fresh handle that no existing user owns.

    Tries plain "AdjectiveNoun" handles first for readability; if those keep
    colliding (or after a cap), it adds random digits to widen the space so the
    loop always terminates quickly.
    """
    for attempt in range(_MAX_PLAIN_TRIES + 40):
        candidate = _random_handle(with_number=attempt >= _MAX_PLAIN_TRIES)
        if not _username_taken(container, candidate.lower()):
            return candidate
    # Extremely unlikely fallback: guarantee uniqueness with a timestamp suffix.
    return _random_handle(with_number=True) + str(int(datetime.now().timestamp()))


def _public(doc: dict) -> dict:
    """Strip internal fields before returning a profile to the client."""
    return {
        "id": doc["id"],
        "username": doc.get("username", ""),
        "contactable": doc.get("contactable"),
        "contact_email": doc.get("contact_email", ""),
        "contact_phone": doc.get("contact_phone", ""),
        "contact_other": doc.get("contact_other", ""),
    }


def get_user(user_id: str) -> dict | None:
    """Return the public profile for user_id, or None if they have no profile yet."""
    container = get_users_container()
    try:
        doc = container.read_item(item=user_id, partition_key=user_id)
    except CosmosResourceNotFoundError:
        return None
    return _public(doc)


def ensure_user(user_id: str) -> tuple[dict, bool]:
    """Return (profile, is_new) for user_id, creating a profile if none exists.

    On first sight of a user we mint a unique anonymous username and store an
    otherwise-empty profile. `is_new` lets the caller decide whether to show the
    first-time onboarding screen.
    """
    if not (user_id or "").strip():
        raise ValueError("user_id is required")

    container = get_users_container()
    try:
        doc = container.read_item(item=user_id, partition_key=user_id)
        return _public(doc), False
    except CosmosResourceNotFoundError:
        pass

    username = generate_username(container)
    doc = {
        "id": user_id,
        "username": username,
        "username_lower": username.lower(),
        "contactable": None,        # undecided until the user chooses
        "contact_email": "",
        "contact_phone": "",
        "contact_other": "",
        "created_at": _now_iso(),
    }
    container.create_item(doc)
    return _public(doc), True


class UsernameTakenError(Exception):
    """Raised when a requested username is already owned by another user."""


def update_user(user_id: str, fields: dict) -> dict:
    """Apply partial updates to a profile and return the new public profile.

    Only known fields are touched. Changing the username enforces case-insensitive
    uniqueness (raises UsernameTakenError on collision) and rejects blanks.
    """
    container = get_users_container()
    try:
        doc = container.read_item(item=user_id, partition_key=user_id)
    except CosmosResourceNotFoundError:
        # Be forgiving: if somehow called before ensure_user, mint the profile.
        doc, _ = ensure_user(user_id)
        doc = container.read_item(item=user_id, partition_key=user_id)

    if "username" in fields and fields["username"] is not None:
        new_name = str(fields["username"]).strip()
        if not new_name:
            raise ValueError("username cannot be empty")
        if len(new_name) > 40:
            raise ValueError("username is too long (max 40 characters)")
        if new_name.lower() != doc.get("username_lower"):
            if _username_taken(container, new_name.lower(), exclude_id=user_id):
                raise UsernameTakenError(new_name)
            doc["username"] = new_name
            doc["username_lower"] = new_name.lower()

    if "contactable" in fields:
        value = fields["contactable"]
        # Accept None (undecided) or a strict boolean; ignore anything else.
        doc["contactable"] = value if value is None or isinstance(value, bool) else bool(value)

    for key in ("contact_email", "contact_phone", "contact_other"):
        if key in fields and fields[key] is not None:
            doc[key] = str(fields[key]).strip()

    container.replace_item(item=doc["id"], body=doc)
    return _public(doc)
