#!/bin/sh
# Never touches uncommitted work or a different branch. $1 is the hook event name. With no event (a run by hand), it prints plain text.
exec 2>/dev/null
top=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --show-toplevel) || exit 0
cd "$top" || exit 0
event=$1

# At most one run in 2 minutes.
stamp=$(git rev-parse --git-path sync-main-stamp)
now=$(date +%s)
last=$(cat "$stamp")
case $last in "" | *[!0-9]*) last=0 ;; esac
[ $((now - last)) -lt 120 ] && exit 0
echo "$now" >"$stamp"

notify() {
  if [ -z "$event" ]; then echo "sync-main: $1"; return; fi
  text=$(printf 'sync-main: %s' "$1" | sed 's/"/\\"/g')
  printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"%s","additionalContext":"%s"}}\n' "$text" "$event" "$text"
}

# The hook blocks the message of the user: never prompt, and stop a slow fetch after 8 seconds.
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-$(git config core.sshCommand || echo ssh)} -oBatchMode=yes"
git fetch origin main >/dev/null &
fetch=$!
(sleep 8; kill "$fetch") >/dev/null &
watcher=$!
wait "$fetch" || exit 0
kill "$watcher"

main_before=$(git rev-parse -q --verify refs/heads/main)
branch=$(git symbolic-ref --short -q HEAD)
if [ "$branch" = main ]; then
  # No repo hooks: the post-merge hook calls GitHub, and this run must stay fast.
  git -c core.hooksPath=/dev/null merge --ff-only origin/main >/dev/null
else
  # Fast-forward only, and git refuses a main that a different worktree has open.
  git fetch . origin/main:main >/dev/null
fi
main_after=$(git rev-parse -q --verify refs/heads/main)
note=""
[ -n "$branch" ] && [ "$branch" != main ] && note=" Your branch $branch is $(git rev-list --count HEAD..origin/main) commit(s) behind main."

if [ "$main_before" != "$main_after" ]; then
  moved=some
  [ -n "$main_before" ] && moved=$(git rev-list --count "$main_before..$main_after")
  notify "main moved $moved commit(s) from GitHub.$note"
  exit 0
fi
behind=$(git rev-list --count main..origin/main)
[ "${behind:-0}" -gt 0 ] || exit 0

# Say it one time for each new state of GitHub.
told=$(git rev-parse --git-path sync-main-told)
[ "$(cat "$told")" = "$(git rev-parse origin/main)" ] && exit 0
git rev-parse origin/main >"$told"
ahead=$(git rev-list --count origin/main..main)
if [ "$ahead" -gt 0 ]; then
  why="it has $ahead local commit(s). Move them to a branch, then run git pull --ff-only on main"
elif [ "$branch" != main ] && git worktree list --porcelain | grep -qx 'branch refs/heads/main'; then
  why="a different worktree has it open, and its session updates it"
else
  why="the update would change files that have uncommitted changes. Stash them, then run git pull --ff-only"
fi
notify "main is $behind commit(s) behind GitHub and cannot fast-forward: $why.$note"
