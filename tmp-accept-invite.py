#!/usr/bin/env python3
"""Local-only: list / accept pending GitHub repo invitations for the account whose
credential is stored in the macOS keychain (same pattern as tmp-gh.py).
The token is never printed.

Usage:
  python3 tmp-accept-invite.py              # list pending invitations
  python3 tmp-accept-invite.py --accept     # accept pending invitations (optionally
  python3 tmp-accept-invite.py --accept Billing   # only those matching a repo name)
"""
import json
import subprocess
import sys


def keychain_token() -> str:
    out = subprocess.run(
        ["security", "find-internet-password", "-s", "github.com", "-w"],
        capture_output=True, text=True,
    )
    if out.returncode != 0 or not out.stdout.strip():
        sys.exit("no github.com credential in the keychain")
    return out.stdout.strip()


def api(path, token, method="GET", payload=None):
    args = ["curl", "-s", "-m", "30", "-X", method,
            "-H", f"Authorization: Bearer {token}",
            "-H", "Accept: application/vnd.github+json",
            "-H", "X-GitHub-Api-Version: 2022-11-28"]
    if payload is not None:
        args += ["-H", "Content-Type: application/json", "-d", json.dumps(payload)]
    args.append(path)
    res = subprocess.run(args, capture_output=True, text=True).stdout
    try:
        return json.loads(res)
    except Exception:
        return {"raw": res[:400]}


token = keychain_token()
user = api("https://api.github.com/user", token)
if "login" not in user:
    sys.exit(f"auth failed: {user}")
print("authenticated as:", user["login"])

invites = api("https://api.github.com/user/repository_invitations", token)
if not isinstance(invites, list):
    sys.exit(f"could not list invitations: {invites}")
if not invites:
    print("no pending invitations")

accept = "--accept" in sys.argv
repo_filter = next((a for a in sys.argv[2:] if not a.startswith("--")), None) if accept else None

for inv in invites:
    repo = inv.get("repository", {})
    name, full = repo.get("name", "?"), repo.get("full_name", "?")
    perms = inv.get("permissions", {})
    if not accept:
        print(f"pending: {full} (id {inv['id']}) perms={perms}")
        continue
    if repo_filter and repo_filter.lower() not in name.lower():
        print(f"skipped: {full}")
        continue
    res = api(
        f"https://api.github.com/user/repository_invitations/{inv['id']}",
        token, "PATCH", {"accepted": True},
    )
    ok = "status" in res and res.get("status", "").startswith("2")
    print(("accepted: " if ok else "accept failed: ") + full + ("" if ok else f" → {res}"))