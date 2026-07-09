"""Single source of the Cosmos DB container client.

Reads config from environment (loaded from matching/.env). Uses key auth if
COSMOS_KEY is set, otherwise falls back to Entra RBAC via DefaultAzureCredential
(your `az login` locally, Managed Identity in production).
"""

import os
from functools import lru_cache

from dotenv import load_dotenv
from azure.cosmos import CosmosClient, PartitionKey

load_dotenv()  # reads matching/.env

_ENDPOINT = os.environ["COSMOS_ENDPOINT"]
_DATABASE = os.environ.get("COSMOS_DATABASE", "lore")
_CONTAINER = os.environ.get("COSMOS_CONTAINER", "skills")
_USERS_CONTAINER = os.environ.get("COSMOS_USERS_CONTAINER", "users")
_KEY = os.environ.get("COSMOS_KEY") or None


@lru_cache(maxsize=1)
def _client() -> CosmosClient:
    """Build the Cosmos client once (key auth if COSMOS_KEY is set, else RBAC)."""
    if _KEY:
        return CosmosClient(_ENDPOINT, credential=_KEY)
    from azure.identity import DefaultAzureCredential
    return CosmosClient(_ENDPOINT, credential=DefaultAzureCredential())


@lru_cache(maxsize=1)
def get_container():
    """Return the shared skills container client (built once, then cached)."""
    return _client().get_database_client(_DATABASE).get_container_client(_CONTAINER)


@lru_cache(maxsize=1)
def get_users_container():
    """Return the users/profile container, creating it on first use if missing.

    Partitioned by /id (the stable per-user key from the sign-in provider), so a
    profile is read/written with a single point lookup. create_container_if_not_exists
    means the app self-provisions on first run without a manual portal step.
    """
    database = _client().get_database_client(_DATABASE)
    return database.create_container_if_not_exists(
        id=_USERS_CONTAINER,
        partition_key=PartitionKey(path="/id"),
    )