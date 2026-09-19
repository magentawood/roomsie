#!/usr/bin/env bash
# resume-session.sh — install this repo's bundled Claude Code session onto THIS machine,
# so you can pick the conversation up exactly where it left off.
#
# Usage:  ./tools/resume-session.sh
# Then:   claude --resume 
#
# Works with any Claude subscription or account. Nothing is sent anywhere.
# Remote Control is NOT used and must stay off — this is a local file install only.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_ID="$(cat "$REPO_ROOT/session/SESSION_ID" | tr -d '[:space:]')"
SRC="$REPO_ROOT/session/transcript/session.jsonl"

if [ ! -f "$SRC" ]; then
  echo "error: $SRC not found. Is the repo fully cloned?" >&2
  exit 1
fi

# Claude Code stores transcripts per project directory, under a slug made by
# replacing every non-alphanumeric character in the absolute path with a dash.
SLUG="$(printf '%s' "$REPO_ROOT" | sed 's/[^a-zA-Z0-9]/-/g')"
PROJ_DIR="$HOME/.claude/projects/$SLUG"
DEST="$PROJ_DIR/${SESSION_ID}.jsonl"

mkdir -p "$PROJ_DIR"

if [ -f "$DEST" ]; then
  BACKUP="${DEST}.bak.$(date +%Y%m%d%H%M%S)"
  cp "$DEST" "$BACKUP"
  echo "note: existing transcript backed up to $BACKUP"
fi

# Rewrite the original author's absolute paths to this machine's repo path, so
# the resumed session's cwd and file references point somewhere that exists.
python3 - "$SRC" "$DEST" "$REPO_ROOT" <<'PY'
import json, sys

src, dest, repo_root = sys.argv[1], sys.argv[2], sys.argv[3]

# Paths as they existed on the machine the session was recorded on.
ORIGIN_REPO = "/Users/yashmangal/Desktop/roomsie"

rewritten = 0
with open(src) as fin, open(dest, "w") as fout:
    for line in fin:
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            fout.write(line + "\n")
            continue
        if rec.get("cwd"):
            rec["cwd"] = repo_root
            rewritten += 1
        fout.write(json.dumps(rec) + "\n")

print(f"installed {rewritten} anchored messages")
PY

echo
echo "session installed for this project directory:"
echo "  $DEST"
echo
echo "now run, from $REPO_ROOT:"
echo "  claude --resume $SESSION_ID"
echo
echo "if --resume does not list it, just run 'claude' and pick the session from /resume."
