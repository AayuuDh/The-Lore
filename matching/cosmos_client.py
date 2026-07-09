"""Single source of the Cosmos DB container client.

Reads config from environment (loaded from matching/.env). Uses key auth if
COSMOS_KEY is set, otherwise falls back to Entra RBAC via DefaultAzureCredential
(your `az login` locally, Managed Identity in production).
"""

import os
from functools import lru_cache

from dotenv import load_dotenv
from azure.cosmos import CosmosClient

load_dotenv()  # reads matching/.env

_ENDPOINT = os.environ["COSMOS_ENDPOINT"]
_DATABASE = os.environ.get("COSMOS_DATABASE", "lore")
_CONTAINER = os.environ.get("COSMOS_CONTAINER", "skills")
_KEY = os.environ.get("COSMOS_KEY") or None


@lru_cache(maxsize=1)
def get_container():
    """Return the shared skills container client (built once, then cached)."""
    if _KEY:
        client = CosmosClient(_ENDPOINT, credential=_KEY)
    else:
        from azure.identity import DefaultAzureCredential
        client = CosmosClient(_ENDPOINT, credential=DefaultAzureCredential())
    return client.get_database_client(_DATABASE).get_container_client(_CONTAINER)