#!/bin/sh
# Fast-forwards the local main to GitHub, and tells the user when main moved. It never changes uncommitted work or a different branch.
# Claude Code runs it at most once every 2 minutes (.claude/settings.json). $1 is the hook event, for the JSON output.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null && cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
stamp=$(git rev-parse --git-path sync-main-stamp)
[ -n "$(find "$stamp" -mmin -2 2>/dev/null)" ] && exit 0
touch "$stamp"

say() {
  if [ -z "$1" ]; then echo "$2"; return; fi
  text=$(printf '%s' "$2" | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"%s","additionalContext":"%s"}}\n' "$text" "$1" "$text"
}

# A hook holds the message of the user until it ends, so no prompt and no slow connection can stop it.
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never GIT_SSH_COMMAND='ssh -oBatchMode=yes -oConnectTimeout=5'
remote_before=$(git rev-parse -q --verify refs/remotes/origin/main)
git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=5 fetch -q origin main 2>/dev/null || exit 0
remote_after=$(git rev-parse -q --verify refs/remotes/origin/main)
[ "$remote_before" = "$remote_after" ] && exit 0

branch=$(git symbolic-ref --short -q HEAD)
if [ "$branch" = main ]; then
  git -c core.hooksPath=/dev/null merge -q --ff-only origin/main >/dev/null 2>&1
else
  # Fast-forward only, and git refuses a main that a different worktree has open.
  git fetch -q . origin/main:main 2>/dev/null
fi

moved=$(git rev-list --count "$remote_before..$remote_after" 2>/dev/null || echo some)
behind=$(git rev-list --count main..origin/main)
if [ "$behind" -gt 0 ]; then
  say "$1" "sync-main: main moved $moved commit(s) on GitHub, but the local main cannot fast-forward: it has local changes or commits, or a different worktree has it open. Stash them or move them to a branch, then run git pull --ff-only on main."
elif [ -n "$branch" ] && [ "$branch" != main ]; then
  say "$1" "sync-main: main moved $moved commit(s) on GitHub. Your branch $branch is $(git rev-list --count HEAD..main) commit(s) behind main."
else
  say "$1" "sync-main: main moved $moved commit(s) on GitHub, and the local main is current."
fi
