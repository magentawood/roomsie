#!/usr/bin/env bash
# sync-session.sh — copy the live Claude Code transcript for this session into the repo.
# Run this before committing, so the repo always carries the latest state of the session.
#
# Usage:  ./tools/sync-session.sh
#
# No network, no Remote Control. Pure file copy.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_ID="$(cat "$REPO_ROOT/session/SESSION_ID" | tr -d '[:space:]')"
DEST="$REPO_ROOT/session/transcript/session.jsonl"

# Find the transcript wherever Claude Code put it (the project dir is derived
# from the cwd the session STARTED in, which may not be this repo).
SRC="$(find "$HOME/.claude/projects" -maxdepth 2 -name "${SESSION_ID}.jsonl" -type f 2>/dev/null | head -1)"

if [ -z "$SRC" ]; then
  echo "error: no transcript found for session ${SESSION_ID} under ~/.claude/projects" >&2
  echo "       is this the machine the session ran on?" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
cp "$SRC" "$DEST"

LINES="$(wc -l < "$DEST" | tr -d '[:space:]')"
BYTES="$(wc -c < "$DEST" | tr -d '[:space:]')"
echo "synced ${LINES} messages (${BYTES} bytes)"
echo "  from ${SRC}"
echo "  to   ${DEST}"
echo
echo "next:  git add session/transcript/session.jsonl && git commit"
