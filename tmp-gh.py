#!/usr/bin/env python3
"""Local-only: talk to the GitHub API using the credential already stored in the
macOS keychain by the git credential helper. The token is never printed."""
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
print("authenticated as:", user["login"], "| id", user["id"], "| type", user.get("type"))

if len(sys.argv) > 1 and sys.argv[1] == "create":
    name = sys.argv[2]
    private = "--public" not in sys.argv
    body = {
        "name": name,
        "description": sys.argv[3] if len(sys.argv) > 3 else "",
        "private": private,
        "has_issues": True,
        "has_wiki": False,
        "auto_init": False,
    }
    created = api("https://api.github.com/user/repos", token, "POST", body)
    if "html_url" not in created:
        sys.exit(f"create failed: {created}")
    print("created:", created["html_url"], "| private:", created["private"], "| default branch:", created.get("default_branch"))
