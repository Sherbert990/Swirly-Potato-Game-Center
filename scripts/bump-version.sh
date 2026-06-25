#!/usr/bin/env bash
# Bump the app version in version.json.
#
# Scheme: YYYY.MM.DD.NN
#   - YYYY.MM.DD is today's date.
#   - NN is a 2-digit counter that increments on each bump within the same day.
#   - When the date changes, NN resets to 01.
#
# Usage: scripts/bump-version.sh        (writes the next version to version.json)
#        scripts/bump-version.sh --print (just echo the next version, don't write)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE="$ROOT/version.json"
TODAY="$(date +%Y.%m.%d)"

current=""
if [ -f "$FILE" ]; then
  # pull the value out of {"version": "..."} without needing jq
  current="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$FILE")"
fi

cur_date="${current%.*}"   # everything before the last dot
cur_num="${current##*.}"   # the last segment

if [ "$cur_date" = "$TODAY" ] && [[ "$cur_num" =~ ^[0-9]+$ ]]; then
  next_num=$((10#$cur_num + 1))
else
  next_num=1
fi

next="$(printf '%s.%02d' "$TODAY" "$next_num")"

if [ "${1:-}" = "--print" ]; then
  echo "$next"
  exit 0
fi

printf '{"version": "%s"}\n' "$next" > "$FILE"
echo "version -> $next"
