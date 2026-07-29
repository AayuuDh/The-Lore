"""Bearer-token authentication against Entra ID. OFF by default.

Why this exists
---------------
Until now the backend had no authentication at all. The React UI gates *itself*
behind an MSAL sign-in, but it never sent a token — it sent the signed-in user's
GUID as a plain JSON field (`user_id`) that the server trusted completely. Any
caller could send any GUID, or invent one, because `ensure_user()` mints a
profile for whatever string it's handed. This module is the fix: the identity
now comes from a signature-verified token instead of the request body.

Design constraints (deliberate)
-------------------------------
- **Off by default.** `REQUIRE_AUTH` is unset in local dev, so a fresh clone
  still boots and serves `data/skills/*.md` with zero cloud setup — the property
  the rest of this codebase works hard to preserve. Flip it on in the deployed
  App Service once the Entra scope exists.
- **Never crash at import.** Config is read with `.get()` and PyJWT is imported
  lazily inside the verify path, mirroring `cosmos_client` / `rerank`. A machine
  without PyJWT installed can still run the app with auth off.
- **Fail closed when on.** If `REQUIRE_AUTH` is true but the tenant/audience are
  missing, every request is rejected rather than silently allowed through. A
  half-configured gate is worse than no gate, because it looks like protection.

Configuration
-------------
    REQUIRE_AUTH=true
    ENTRA_TENANT_ID=<directory (tenant) id>
    ENTRA_API_AUDIENCE=api://<application (client) id>

The audience must match the `aud` claim Entra puts in tokens issued for the API
scope. For a scope exposed as `api://<client-id>/Lore.Read`, that is
`api://<client-id>` — or the bare client id, depending on the token version, so
both are accepted.
"""

import os
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import Header, HTTPException
from fastapi.concurrency import run_in_threadpool

load_dotenv()  # ensure the vars are available regardless of import order

# Read with .get() so importing this module never crashes an unconfigured box.
_TENANT_ID = os.environ.get("ENTRA_TENANT_ID")
_AUDIENCE = os.environ.get("ENTRA_API_AUDIENCE")

# Accept the usual truthy spellings so "REQUIRE_AUTH=1" and "REQUIRE_AUTH=true"
# both work — App Service settings are strings and people type both.
_TRUTHY = {"1", "true", "yes", "on"}
REQUIRE_AUTH = os.environ.get("REQUIRE_AUTH", "").strip().lower() in _TRUTHY

# Entra's v2.0 issuer and JWKS endpoints for this tenant. These are only ever
# read after the fail-closed check in current_principal has confirmed the tenant
# is configured, so no None-guard is needed here.
_ISSUER = f"https://login.microsoftonline.com/{_TENANT_ID}/v2.0"
_JWKS_URL = f"https://login.microsoftonline.com/{_TENANT_ID}/discovery/v2.0/keys"

# Entra signs with RS256. Pinning the algorithm list is what stops the classic
# "alg: none" and HMAC-confusion attacks, where a forged token names a weaker
# algorithm and the library obligingly uses it.
_ALGORITHMS = ["RS256"]

# Entra issues v1.0 tokens with `aud` = the bare client id and v2.0 tokens with
# the api:// URI, so accept both rather than guessing which one the app
# registration will produce. Built once — this is per-request otherwise.
_AUDIENCES = [_AUDIENCE, _AUDIENCE.replace("api://", "")] if _AUDIENCE else []


@lru_cache(maxsize=1)
def _get_jwks_client():
    """Return the shared PyJWKClient. Built once, mirroring cosmos_client.

    PyJWT is imported here rather than at module scope so it stays an optional
    dependency while auth is off.

    `cache_keys=True` matters more than it looks: without it PyJWT re-parses the
    whole JWK set into fresh RSA key objects on *every* request (~46us of pure
    rebuild). The default `lifespan=300` would also make one request every five
    minutes pay an inline HTTPS fetch; an unknown key id already triggers a
    refetch, so rotation is handled without the short expiry.
    """
    try:
        from jwt import PyJWKClient
    except ImportError as exc:  # pragma: no cover - config error, not a code path
        raise HTTPException(
            status_code=500,
            detail=(
                "REQUIRE_AUTH is on but PyJWT is not installed; "
                "add PyJWT[crypto] to matching/requirements.txt"
            ),
        ) from exc
    return PyJWKClient(_JWKS_URL, cache_keys=True, lifespan=3600)


def _verify(token: str) -> dict:
    """Verify one bearer token and return its claims. Raises 401 on any failure.

    Blocking (RSA verification, and an HTTPS fetch on first use or key
    rotation), so callers run it off the event loop.
    """
    import jwt  # lazy: keeps PyJWT optional when auth is off

    # Outside the try: a missing PyJWT is a 500 config error, not a bad token.
    jwks_client = _get_jwks_client()
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=_ALGORITHMS,
            audience=_AUDIENCES,
            issuer=_ISSUER,
        )
    except Exception as exc:
        # Deliberately vague to the caller (don't help someone probe for the
        # exact reason a forged token failed), specific in the server log.
        print(f"[auth] token rejected: {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=401, detail="invalid or expired token")


async def current_principal(
    authorization: str | None = Header(default=None),
) -> dict | None:
    """FastAPI dependency: the verified caller, or None when auth is off.

    Returns { "oid": ... } for a valid token.

    Wired app-wide in main.py, so every route — including ones added later — is
    covered without anyone having to remember a decorator.

    With REQUIRE_AUTH off this always returns None and every endpoint behaves
    exactly as it did before — that is what keeps local dev and the current
    deployment working while the Entra scope is still being set up.

    `async def` on purpose: FastAPI runs sync dependencies in a threadpool, so a
    plain `def` here would cost a thread hop on every request to every endpoint
    even in the default configuration, where the body is a single `return None`.
    """
    if not REQUIRE_AUTH:
        return None

    if not (_TENANT_ID and _AUDIENCE):
        # Fail closed: auth was demanded but cannot actually be performed.
        raise HTTPException(
            status_code=500,
            detail="REQUIRE_AUTH is on but ENTRA_TENANT_ID / ENTRA_API_AUDIENCE are unset",
        )

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()
    claims = await run_in_threadpool(_verify, token)  # blocking crypto + I/O

    # `oid` is the user's object id in the tenant — the same value MSAL exposes
    # to the frontend as `account.localAccountId`, which is what existing Cosmos
    # profiles are keyed by. So switching to the claim needs no data migration.
    oid = claims.get("oid") or claims.get("sub")
    if not oid:
        raise HTTPException(status_code=401, detail="token has no subject claim")

    return {"oid": oid}


def resolve_user_id(principal: dict | None, body_user_id: str | None) -> str | None:
    """Return the user id to trust for this request.

    With auth ON the token wins and the request body is ignored entirely — this
    is the whole point, and it is why a caller can no longer act as someone else
    by typing their GUID. With auth OFF we fall back to the body so local dev
    (no Entra, no tokens) keeps working.
    """
    if principal:
        return principal["oid"]
    return body_user_id


def require_self(principal: dict | None, user_id: str) -> None:
    """Raise 403 unless the caller *is* `user_id`. No-op when auth is off.

    The counterpart to resolve_user_id, for ids that arrive in the URL path
    rather than the body: there is nothing to silently override, so a mismatch
    has to be rejected instead. Used on the endpoints that read or write one
    person's private data, so that knowing someone's GUID is no longer enough to
    read their history or edit their profile.
    """
    if principal and principal["oid"] != user_id:
        raise HTTPException(status_code=403, detail="you may only act as yourself")
