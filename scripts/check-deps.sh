#!/usr/bin/env bash
# check-deps.sh — Pre-flight check for the ZIGCE training exercise
# Run from the zigce-plugin repo root before copying the starter directory.
#
# Deliberately does NOT use set -euo pipefail: this script is designed to
# collect all failures and report them at the end, not exit on first failure.

PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  local hint="$3"
  if [ "$result" = "ok" ]; then
    echo "  [ok] $name"
    PASS=$((PASS + 1))
  else
    echo "  [missing] $name — $hint"
    FAIL=$((FAIL + 1))
  fi
}

echo "Checking exercise dependencies..."
echo

# Binary checks using command -v (POSIX-portable, no eval)
command -v git    &>/dev/null && check "git"    "ok" "" || check "git"    "fail" "Install via: brew install git"
command -v claude &>/dev/null && check "claude" "ok" "" || check "claude" "fail" "Install Claude Code: https://claude.ai/code"
command -v gh     &>/dev/null && check "gh (GitHub CLI)" "ok" "" || check "gh (GitHub CLI)" "fail" "Install via: brew install gh"

# gh auth check — gh auth status writes to stderr on failure; suppress all output.
# Avoid GNU `timeout` (not available on macOS by default).
if gh auth status >/dev/null 2>&1; then
  check "gh auth" "ok" ""
else
  check "gh auth" "fail" "Run: gh auth login"
fi

# zigce plugin check — look for the plugin directory in known Claude plugin locations.
# claude /plugin list is interactive-only and cannot be used in scripts.
ZIGCE_FOUND=0
for dir in \
  "$HOME/.claude/plugins/zigce" \
  "$HOME/Library/Application Support/Claude/plugins/zigce" \
  "$(pwd)/plugins/zigce"
do
  if [ -d "$dir" ]; then
    ZIGCE_FOUND=1
    break
  fi
done
if [ "$ZIGCE_FOUND" -eq 1 ]; then
  check "zigce plugin" "ok" ""
else
  check "zigce plugin" "fail" "Install via: claude /plugin install zigce (verify with: claude /plugin list)"
fi

# Version check — validates current checkout matches recommended version
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -n "$REPO_ROOT" ] && [ -f "$REPO_ROOT/.recommended-version" ]; then
  RECOMMENDED=$(tr -d '[:space:]' < "$REPO_ROOT/.recommended-version")
  if [[ ! "$RECOMMENDED" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    check "plugin version" "fail" "Invalid format in .recommended-version: '$RECOMMENDED'"
  else
    CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "none")
    if [ "$CURRENT_TAG" = "$RECOMMENDED" ]; then
      check "plugin version ($CURRENT_TAG)" "ok" ""
    elif [ "$CURRENT_TAG" = "none" ]; then
      check "plugin version" "fail" "Not on a release tag. Expected $RECOMMENDED. Run the update steps in the setup guide."
    else
      check "plugin version ($CURRENT_TAG)" "fail" "Recommended is $RECOMMENDED. Run the update steps to update."
    fi
  fi
fi

echo
if [ "$FAIL" -gt 0 ]; then
  echo "  x $FAIL dependency check(s) failed. Install missing tools and re-run."
  exit 1
else
  echo "  ok All $PASS checks passed. You are ready to start the exercise."
fi
