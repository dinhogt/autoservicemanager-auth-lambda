#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
fail=0
echo "== Secret scan (tracked files) =="
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo "FAIL: .env is tracked by git"; fail=1
fi
patterns=('AKIA[0-9A-Z]{16}' 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' 'sk_live_[0-9a-zA-Z]+')
for pattern in "${patterns[@]}"; do
  matches="$(git grep -l -E "$pattern" -- ':!*.lock' ':!*.md' 2>/dev/null || true)"
  if [ -n "$matches" ]; then
    echo "FAIL: secret pattern:"; echo "$matches"; fail=1
  fi
done
if [ -f yarn.lock ]; then
  echo "== Yarn audit (dependencies, moderate+) =="
  audit_out="$(yarn audit --groups dependencies --level moderate 2>&1)" || true
  echo "$audit_out"
  if echo "$audit_out" | grep -oE '[0-9]+ (Moderate|High|Critical)' | grep -qvE '^0 '; then
    echo "FAIL: yarn audit reported moderate+ vulnerabilities"; fail=1
  fi
fi
if [ "$fail" -ne 0 ]; then exit 1; fi
echo "PASS: security gate"
