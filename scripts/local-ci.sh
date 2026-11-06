#!/usr/bin/env bash
# pi-droid local CI — Linux only, powered by basecamp/gh-signoff.
# Mirrors .github/workflows/ci.yml (ubuntu-latest test job).
# Usage:
#   scripts/local-ci.sh               stages: lint build tests
#   scripts/local-ci.sh tests         selected stages only
#   scripts/local-ci.sh --no-signoff  run checks, don't post signoff statuses
#   scripts/local-ci.sh --help        this text
set -euo pipefail

AVAILABLE_STAGES=(lint build tests)
DEFAULT_STAGES=(lint build tests)

_fail()   { printf '✗ %s\n' "$*" >&2; exit 1; }
_log()    { printf '▸ %s\n' "$*"; }
_ok()     { printf '✓ %s\n' "$*"; }
require() { command -v "$1" >/dev/null 2>&1 || _fail "missing '$1'${2:+ — $2}"; }

node_min() {
  require node ""
  local major; major="$(node --version | sed 's/^v//' | cut -d. -f1)"
  [ "$major" -ge "$1" ] || _fail "Node.js >= $1 required (found v$major)"
}

case "$(uname -s)" in
  Linux) ;;
  *) _fail "Linux-only local CI; refusing to run on $(uname -s) (other platforms stay in GitHub Actions)." ;;
esac

NO_SIGNOFF=0
SELECTED=()
while [ $# -gt 0 ]; do
  case "$1" in
    --no-signoff) NO_SIGNOFF=1 ;;
    --list) printf '%s\n' "stages: ${AVAILABLE_STAGES[*]}"; exit 0 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    -*) _fail "unknown option: $1 (try --help)" ;;
    *) SELECTED+=("$1") ;;
  esac
  shift
done
[ ${#SELECTED[@]} -gt 0 ] || SELECTED=("${DEFAULT_STAGES[@]}")

if [ "$NO_SIGNOFF" = 0 ]; then
  require gh ""
  gh extension list 2>/dev/null | grep -qi "gh-signoff" \
    || _fail "gh-signoff extension missing — run: gh extension install basecamp/gh-signoff (or pass --no-signoff)"
fi

prepare() { node_min 22; require npm ""; npm ci; }

# ── stages ────────────────────────────────────────────────────────────────────

stage_lint()  { npm run lint; }
stage_build() { npm run build; }
stage_tests() { npm run test:ci -- --no-file-parallelism --testTimeout=30000 --hookTimeout=30000; }

# ── runner ────────────────────────────────────────────────────────────────────

declare -F prepare >/dev/null && prepare

# Validate all selected stage names before running anything.
for s in "${SELECTED[@]}"; do
  declare -F "stage_$s" >/dev/null || _fail "unknown stage '$s' (stages: ${AVAILABLE_STAGES[*]})"
done

if git status --porcelain | grep -q .; then
  _log "warning: working tree has uncommitted changes — results may not match HEAD"
fi

for s in "${SELECTED[@]}"; do
  _log "stage: $s"
  # Run the stage in a subshell with errexit, OUTSIDE any if-condition context:
  # inside `if ! (...)` bash suppresses errexit, so a failing command mid-stage
  # could be masked and the stage wrongly reported green (bot review P0).
  set +e
  ( set -e; "stage_$s" )
  rc=$?
  set -e
  if [ "$rc" -ne 0 ]; then
    [ "$NO_SIGNOFF" = 0 ] && gh signoff fail "$s" --description "$s failed locally" >/dev/null 2>&1 || true
    _fail "stage '$s' failed"
  fi
  _ok "$s passed"
  if [ "$NO_SIGNOFF" = 0 ]; then
    gh signoff "$s" >/dev/null 2>&1 \
      || printf '⚠ could not post signoff status for %s — is HEAD pushed? gh authorized?\n' "$s" >&2
  fi
done

if [ "$NO_SIGNOFF" = 1 ]; then
  _log "all done — no signoff statuses posted (was --no-signoff)."
else
  _log "all done."
fi
