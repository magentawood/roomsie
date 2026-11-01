#!/bin/sh
# Keeps the local main current with GitHub, and says when main moved. Claude Code runs it (.claude/settings.json):
# at the start of a session with --now, and before each message at most once every 2 minutes.
# It fast-forwards main only. It never changes uncommitted work or a different branch.
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
stamp=$(git rev-parse --git-path sync-main-stamp)
[ "$1" != --now ] && [ -n "$(find "$stamp" -mmin -2 2>/dev/null)" ] && exit 0
touch "$stamp"

before=$(git rev-parse -q --verify refs/remotes/origin/main)
branch=$(git symbolic-ref --short -q HEAD)
export GIT_TERMINAL_PROMPT=0
if [ "$branch" = main ]; then
  git fetch -q origin main 2>/dev/null || exit 0
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    [ "$(git rev-list --count HEAD..origin/main)" -gt 0 ] && echo "sync-main: main is behind GitHub, but it has uncommitted changes. Commit them, then run git pull --ff-only."
  else
    git merge -q --ff-only origin/main >/dev/null 2>&1 || echo "sync-main: main has local commits, so it cannot fast-forward to GitHub."
  fi
else
  # Moves main only by a fast-forward, and never while a worktree has main checked out.
  if ! git fetch -q origin main:main 2>/dev/null; then
    git fetch -q origin main 2>/dev/null || exit 0
    git merge-base --is-ancestor main origin/main 2>/dev/null || echo "sync-main: main has local commits, so it cannot fast-forward to GitHub."
  fi
fi

after=$(git rev-parse -q --verify refs/remotes/origin/main)
[ "$before" = "$after" ] && exit 0
echo "sync-main: main moved on GitHub ($(git log --oneline -1 origin/main))."
if [ -n "$branch" ] && [ "$branch" != main ]; then
  behind=$(git rev-list --count HEAD..origin/main)
  [ "$behind" -gt 0 ] && echo "sync-main: $branch is $behind commit(s) behind main. /build-feature rebases it before the review."
fi
exit 0
