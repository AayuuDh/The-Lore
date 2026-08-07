#!/usr/bin/env python3
"""Start the backend and frontend together for local testing.

    python3 scripts/dev.py

On Windows use `py scripts\\dev.py` (or `python`). Complements the VS Code
"Start Dev" task for people working in a terminal.

Why Python and not a shell script
---------------------------------
POSIX sh does not run natively on Windows — cmd.exe and PowerShell cannot
execute it, so a .sh file would need Git Bash or WSL there. This repo already
requires Python (backend) and Node (frontend) on every platform, so a stdlib-only
Python script is the one form that runs natively on all three. It also avoids the
genuinely hard parts of doing this in shell: killing a process *tree* portably,
checking a port without lsof, and prefixing interleaved output.

Runs from anywhere: paths are resolved from this file's location, not the
current directory. That matters because the backend must start with matching/ as
its working directory — main.py imports its siblings as top-level modules
(`from matcher import match`), so launching from the repo root
fails on those imports.
"""

from __future__ import annotations

import argparse
import os
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IS_WINDOWS = os.name == "nt"

def venv_python() -> Path:
    """Path to the venv interpreter. Windows puts it in Scripts/, POSIX in bin/."""
    if IS_WINDOWS:
        return ROOT / ".venv" / "Scripts" / "python.exe"
    return ROOT / ".venv" / "bin" / "python"


def npm_command() -> str:
    """npm is a .cmd shim on Windows; exec-ing bare "npm" there fails."""
    return "npm.cmd" if IS_WINDOWS else "npm"


def port_is_free(port: int) -> bool:
    """True if nothing is listening on `port`.

    Checks both stacks on purpose: Vite binds IPv6 localhost (::1) by default
    while uvicorn binds IPv4, so testing only one would miss a live server and
    then fail confusingly at bind time.
    """
    for family, host in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")):
        try:
            with socket.socket(family, socket.SOCK_STREAM) as sock:
                sock.settimeout(0.4)
                if sock.connect_ex((host, port)) == 0:
                    return False
        except OSError:
            continue  # this stack isn't available; the other one still counts
    return True


def preflight(args) -> None:
    """Fail with the command that fixes it, rather than a stack trace."""
    python = venv_python()
    if not python.exists():
        sys.exit(
            f"No virtualenv at {ROOT / '.venv'} — run:\n"
            f"  python3 -m venv .venv\n"
            f"  {python} -m pip install -r matching/requirements.txt"
        )

    probe = subprocess.run(
        [str(python), "-c", "import fastapi"],
        capture_output=True,
    )
    if probe.returncode != 0:
        sys.exit(
            "Backend dependencies missing — run:\n"
            f"  {python} -m pip install -r matching/requirements.txt"
        )

    if not (ROOT / "ui" / "node_modules").is_dir():
        sys.exit("Frontend dependencies missing — run:  cd ui && npm install")

    for label, port in (("backend", args.api_port), ("frontend", args.web_port)):
        if not port_is_free(port):
            sys.exit(
                f"Port {port} ({label}) is already in use. Stop whatever holds it, "
                f"or pass --api-port / --web-port."
            )


def spawn(command: list[str], cwd: Path, env: dict, prefix: str) -> subprocess.Popen:
    """Start a child process in its own group, with output prefixed.

    Its own group matters for shutdown: `uvicorn --reload` and `npm run dev` each
    spawn a worker, and killing only the parent leaves that worker holding the
    port so the next run fails preflight. A dedicated group lets us signal the
    whole tree at once.
    """
    kwargs = {}
    if IS_WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True  # setsid: new process group

    process = subprocess.Popen(
        command,
        cwd=str(cwd),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,  # line buffered, so output appears as it happens
        **kwargs,
    )

    def pump() -> None:
        for line in process.stdout:
            sys.stdout.write(f"{prefix} {line}")
            sys.stdout.flush()

    threading.Thread(target=pump, daemon=True).start()
    return process


def terminate(process: subprocess.Popen | None) -> None:
    """Stop a child and everything it spawned, on any platform.

    Deliberately does NOT skip when process.poll() is not None. A dead parent
    does not mean a dead tree: `uvicorn --reload` runs a reloader that spawns
    the actual server, and the worker can outlive its parent still holding the
    port. Early-returning here left port 8000 bound and made the next run fail
    preflight. Signal the group regardless, and treat "already gone" as success.
    """
    if process is None:
        return
    try:
        if IS_WINDOWS:
            # taskkill /T walks the tree; there is no process-group signal that
            # reliably reaches a detached grandchild on Windows.
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(process.pid)],
                capture_output=True,
            )
        else:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
    except ProcessLookupError:
        pass  # the whole group is already gone; nothing to do
    except (OSError, subprocess.SubprocessError):
        try:
            process.terminate()  # fall back to just the parent
        except OSError:
            pass

    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
    except OSError:
        pass


def wait_for_ports(ports, timeout: int = 10) -> None:
    """Block until the ports are actually released.

    The OS does not free a listening socket the instant the process dies, and
    exiting before it does makes an immediate re-run fail preflight with "port
    already in use" — which reads as a bug in the script rather than a race.
    """
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if all(port_is_free(port) for port in ports):
            return
        time.sleep(0.3)


def wait_for_backend(port: int, process: subprocess.Popen, timeout: int = 120) -> bool:
    """Block until /health answers, so the first page load doesn't race startup.

    A cold start downloads a ~60MB embedding model, which is why the timeout is
    generous.
    """
    url = f"http://127.0.0.1:{port}/health"
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            return False  # it died during startup; the log above says why
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return True
        except (urllib.error.URLError, OSError):
            pass
        time.sleep(1)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run the Lore backend and frontend together."
    )
    parser.add_argument("--api-port", type=int, default=8000)
    parser.add_argument("--web-port", type=int, default=5173)
    args = parser.parse_args()

    # Ctrl-C already arrives as KeyboardInterrupt, but a plain SIGTERM (a
    # supervisor, a `kill`, an IDE's stop button) would end the process without
    # unwinding — skipping the finally block below and orphaning both servers
    # with the ports still bound. Turn it into the same exception so one cleanup
    # path covers every way this script can be asked to stop.
    def on_sigterm(_signum, _frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, on_sigterm)

    preflight(args)

    env = os.environ.copy()
    print(f"==> API docs at http://localhost:{args.api_port}/docs")

    backend = frontend = None
    try:
        backend = spawn(
            [
                str(venv_python()),
                "-m",
                "uvicorn",
                "main:app",
                "--reload",
                "--port",
                str(args.api_port),
            ],
            cwd=ROOT / "matching",
            env=env,
            prefix="[api]",
        )

        print("==> waiting for the backend to answer /health ...")
        if not wait_for_backend(args.api_port, backend):
            print("backend did not become healthy — see the [api] output above",
                  file=sys.stderr)
            return 1
        print(f"==> backend   http://localhost:{args.api_port}")

        frontend = spawn(
            [npm_command(), "run", "dev", "--", "--port", str(args.web_port)],
            cwd=ROOT / "ui",
            env=env,
            prefix="[web]",
        )
        print(f"==> frontend  http://localhost:{args.web_port}")
        print("==> Ctrl-C stops both")

        # Exit as soon as EITHER side dies, so a crashed backend takes the
        # frontend down with it instead of leaving half a stack running.
        while backend.poll() is None and frontend.poll() is None:
            time.sleep(0.5)
        print("==> one side exited — shutting the other down")
        return 1
    except KeyboardInterrupt:
        print("\n==> stopping")
        return 0
    finally:
        terminate(frontend)
        terminate(backend)
        # Don't return until the ports are actually released, so re-running
        # immediately doesn't trip the preflight check on a race.
        wait_for_ports([args.api_port, args.web_port])


if __name__ == "__main__":
    sys.exit(main())
