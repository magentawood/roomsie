#!/bin/sh
# Lists each secret that a workflow reads and GitHub does not have. Git hooks run it after a pull.
# It stays quiet when gh is missing or cannot list secrets, because only admins can.
repo=magentawood/roomsie
cd "$(git rev-parse --show-toplevel)" || exit 0
command -v gh >/dev/null 2>&1 || exit 0
have=$(gh secret list -R "$repo" --json name --jq '.[].name' 2>/dev/null) || exit 0
need=$(grep -ohE 'secrets\.[A-Za-z0-9_]+' .github/workflows/*.yml | sed 's/^secrets\.//' | grep -vx GITHUB_TOKEN | sort -u)
missing=""
for s in $need; do
  printf '%s\n' "$have" | grep -qx "$s" || missing="$missing $s"
done
[ -z "$missing" ] && exit 0
echo "roomsie: GitHub is missing CI secrets that a workflow reads:"
for s in $missing; do
  echo "  $s  ($(grep -lE "secrets\.$s\b" .github/workflows/*.yml | xargs -n1 basename | tr '\n' ' ' | sed 's/ $//'))"
done
echo "Add each one with: gh secret set <NAME> -R $repo"
exit 0
