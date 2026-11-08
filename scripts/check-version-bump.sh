#!/usr/bin/env bash
# Fail unless version.json was bumped relative to a base ref, so every change
# that ships to master moves the hub's version badge.
#
# Usage: scripts/check-version-bump.sh <base-ref>   (e.g. origin/master)
# Fix a failure with: scripts/bump-version.sh
set -euo pipefail

BASE="${1:?usage: $0 <base-ref>}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

extract() { sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'; }

head_ver="$(extract < "$ROOT/version.json")"
base_ver="$(git -C "$ROOT" show "$BASE:version.json" 2>/dev/null | extract || true)"

if ! [[ "$head_ver" =~ ^[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]{2}$ ]]; then
  echo "version.json: '$head_ver' is not YYYY.MM.DD.NN" >&2
  exit 1
fi

# Fixed-width YYYY.MM.DD.NN sorts correctly as a plain string.
if [ -n "$base_ver" ] && ! [[ "$head_ver" > "$base_ver" ]]; then
  echo "version.json not bumped: $head_ver (base $BASE has $base_ver)." >&2
  echo "Run scripts/bump-version.sh and commit version.json." >&2
  exit 1
fi

echo "version ok: ${base_ver:-<none>} -> $head_ver"
