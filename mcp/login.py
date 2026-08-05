"""One-time Microsoft sign-in for the Lore MCP server.

Run this once in a terminal:  python login.py

It opens your browser to sign in with your Microsoft account. The token is then
cached so the MCP server can call the Lore API on your behalf (silently refreshed
after that).
"""

import sys

from auth import login_interactive


def main() -> int:
    try:
        login_interactive()
    except Exception as exc:  # noqa: BLE001 - surface any sign-in failure plainly
        print(f"Sign-in failed: {exc}", file=sys.stderr)
        return 1
    print("\nSigned in. The Lore MCP server can now reach the API.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
