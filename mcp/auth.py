"""Microsoft sign-in for the Lore MCP server.

The deployed Lore API requires a Microsoft Entra bearer token. We authenticate
with MSAL's interactive browser flow (a public client): the user signs in once
on THIS device, and the token is cached and silently refreshed after that.

Interactive (not device-code) is deliberate: corp Conditional Access requires
sign-in from a managed device, and only a browser flow on this machine carries
that device state. Device-code is a cross-device flow and gets blocked.

Split on purpose:
  - login.py calls login_interactive() ONCE (it opens a browser and blocks).
  - server.py calls get_token_silent() on every request (never blocks, never
    prints — an MCP stdio server must keep stdout clean for the protocol).

Client/tenant IDs default to The Lore's app registration. They are NOT secrets
(the same GUIDs ship in the public web bundle); override via env if needed.
"""

import os

import msal

CLIENT_ID = os.environ.get("LORE_CLIENT_ID", "5368ab3e-6c25-4ea2-951c-84651053f287")
TENANT_ID = os.environ.get("LORE_TENANT_ID", "72f988bf-86f1-41af-91ab-2d7cd011db47")
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"

# The permission the API validates. Must match authConfig.js API_SCOPE exactly.
SCOPES = [f"api://{CLIENT_ID}/Lore.Read"]

# Where the signed-in session is cached so the user only logs in once.
_CACHE_PATH = os.environ.get(
    "LORE_TOKEN_CACHE", os.path.join(os.path.expanduser("~"), ".the-lore", "msal_cache.json")
)


def _load_cache() -> msal.SerializableTokenCache:
    cache = msal.SerializableTokenCache()
    if os.path.exists(_CACHE_PATH):
        try:
            with open(_CACHE_PATH, "r", encoding="utf-8") as fh:
                cache.deserialize(fh.read())
        except OSError:
            pass
    return cache


def _save_cache(cache: msal.SerializableTokenCache) -> None:
    if cache.has_state_changed:
        os.makedirs(os.path.dirname(_CACHE_PATH), exist_ok=True)
        with open(_CACHE_PATH, "w", encoding="utf-8") as fh:
            fh.write(cache.serialize())


def _app(cache: msal.SerializableTokenCache) -> msal.PublicClientApplication:
    return msal.PublicClientApplication(CLIENT_ID, authority=AUTHORITY, token_cache=cache)


def get_token_silent() -> str | None:
    """Return a cached/refreshed access token, or None if nobody has signed in
    yet. Never prompts and never blocks — safe to call from the MCP server."""
    cache = _load_cache()
    app = _app(cache)
    accounts = app.get_accounts()
    if not accounts:
        return None
    result = app.acquire_token_silent(SCOPES, account=accounts[0])
    _save_cache(cache)
    if result and "access_token" in result:
        return result["access_token"]
    return None


def login_interactive() -> dict:
    """One-time interactive sign-in. Opens the system browser (which carries the
    managed-device state corp Conditional Access requires), then caches the token.
    Uses a loopback redirect, so the app registration needs http://localhost as a
    "Mobile and desktop applications" redirect URI."""
    cache = _load_cache()
    app = _app(cache)
    result = app.acquire_token_interactive(SCOPES)
    _save_cache(cache)
    if "access_token" not in result:
        raise RuntimeError(result.get("error_description", "sign-in failed"))
    return result
