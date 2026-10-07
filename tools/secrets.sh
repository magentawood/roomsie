#!/bin/sh
# Run it before you open a pull request (ADR-0016).
set -e
git fetch --quiet origin main
range="origin/main..HEAD"
if command -v gitleaks >/dev/null 2>&1; then
  exec gitleaks git . --log-opts="$range" --redact --no-banner
fi
exec docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.30.1 git /repo --log-opts="$range" --redact --no-banner
