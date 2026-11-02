#!/bin/sh
# Fast-forwards main to GitHub and tells the user. Never touches uncommitted work or other branches.
exec 2>/dev/null
top=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --show-toplevel) && cd "$top" || exit 0
event=$1

stamp_file=$(git rev-parse --git-path sync-main-stamp)
now=$(date +%s)
last=$(cat "$stamp_file")
case $last in "" | *[!0-9]*) last=0 ;; esac
[ $((now - last)) -lt 120 ] && exit 0
echo "$now" >"$stamp_file"

notify() {
  text=$(printf 'sync-main: %s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"%s","additionalContext":"%s"}}\n' "$text" "$event" "$text"
}

# The hook blocks the message of the user: never prompt, and stop a slow fetch after 8 seconds.
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never
[ -z "$GIT_SSH" ] && export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-$(git config core.sshCommand || echo ssh)} -oBatchMode=yes -oConnectTimeout=5 -oServerAliveInterval=5 -oServerAliveCountMax=1"
git -c maintenance.auto=false -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=5 fetch --no-write-fetch-head origin main >/dev/null &
fetch_pid=$!
(sleep 8; kill "$fetch_pid") >/dev/null &
watcher_pid=$!
wait "$fetch_pid"
fetched=$?
kill "$watcher_pid"
[ "$fetched" -eq 0 ] || exit 0

branch=$(git symbolic-ref --short -q HEAD)
if [ "$branch" = main ]; then
  # No repo hooks: the post-merge hook calls GitHub, and this run must stay fast.
  git -c core.hooksPath=/dev/null merge --ff-only --no-autostash origin/main >/dev/null
else
  # Fast-forward only, and git refuses a main that a different worktree has open.
  git -c maintenance.auto=false fetch --no-write-fetch-head . origin/main:main >/dev/null
fi

# Each worktree hears one time about each new state of GitHub.
github=$(git rev-parse origin/main)
seen_file=$(git rev-parse --git-path sync-main-seen)
seen=$(cat "$seen_file")
[ "$seen" = "$github" ] && exit 0
echo "$github" >"$seen_file"

branch_note=""
[ -n "$branch" ] && [ "$branch" != main ] && branch_note=" Your branch $branch is $(git rev-list --count HEAD..origin/main) commit(s) behind main."
behind=$(git rev-list --count main..origin/main)
if [ "${behind:-0}" -eq 0 ]; then
  # The first run only learns the state.
  [ -z "$seen" ] && exit 0
  moved=$(git rev-list --count "$seen..$github") || moved=some
  notify "main moved $moved commit(s) from GitHub.$branch_note"
  exit 0
fi
ahead=$(git rev-list --count origin/main..main)
if [ "$ahead" -gt 0 ]; then
  why="it has $ahead local commit(s). Save them with git branch <name>, then run git reset --keep origin/main on main"
elif [ "$branch" != main ]; then
  why="a different worktree has it open. Run git pull --ff-only there"
else
  why="the update would change local files. Run git stash -u, then git pull --ff-only"
fi
notify "main is $behind commit(s) behind GitHub and cannot fast-forward: $why.$branch_note"
