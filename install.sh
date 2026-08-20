#!/usr/bin/env bash
# Install claude-kit skills, hooks and status line into ~/.claude.
#
#   ./install.sh                       # copy all skills
#   ./install.sh --link --statusline   # symlink skills, install the status line too
#   ./install.sh --skills wrap,ui-verify
#   ./install.sh --dry-run
#
# Existing files are backed up to <name>.bak-<date>, never overwritten silently.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SKILLS_DIR="$CLAUDE_DIR/skills"
STAMP="$(date +%Y-%m-%d)"

LINK=0; STATUSLINE=0; DRY=0; ONLY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --link)       LINK=1 ;;
    --statusline) STATUSLINE=1 ;;
    --dry-run)    DRY=1 ;;
    --skills)     ONLY="${2:-}"; shift ;;
    -h|--help)    sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

run() { if [ "$DRY" = 1 ]; then echo "  would: $*"; else "$@"; fi; }

[ -d "$CLAUDE_DIR" ] || { echo "No Claude Code config at $CLAUDE_DIR. Run Claude Code once first." >&2; exit 1; }
mkdir -p "$SKILLS_DIR"

echo
echo "Installing skills into $SKILLS_DIR"

for src in "$REPO_ROOT"/skills/*/; do
  name="$(basename "$src")"
  if [ -n "$ONLY" ] && ! printf '%s' ",$ONLY," | grep -q ",$name,"; then continue; fi

  target="$SKILLS_DIR/$name"
  if [ -L "$target" ]; then
    run rm "$target"
  elif [ -e "$target" ]; then
    backup="$target.bak-$STAMP"
    [ -e "$backup" ] && run rm -rf "$backup"
    run mv "$target" "$backup"
    echo "  backed up existing $name -> $(basename "$backup")"
  fi

  if [ "$LINK" = 1 ]; then
    run ln -s "${src%/}" "$target"
    echo "  linked  $name"
  else
    run cp -r "${src%/}" "$target"
    echo "  copied  $name"
  fi
done

if [ "$STATUSLINE" = 1 ]; then
  echo
  echo "Installing status line"
  src="$REPO_ROOT/statusline/statusline.js"
  dest="$CLAUDE_DIR/statusline.js"
  [ -f "$src" ] || { echo "statusline/statusline.js missing" >&2; exit 1; }
  [ -e "$dest" ] && { run cp "$dest" "$dest.bak-$STAMP"; echo "  backed up existing statusline.js"; }
  run cp "$src" "$dest"
  echo "  installed statusline.js"
  echo
  echo "  Add this to $CLAUDE_DIR/settings.json:"
  echo "    \"statusLine\": { \"type\": \"command\", \"command\": \"node \\\"$dest\\\"\" }"
fi

echo
echo "Done. Restart Claude Code to pick up the changes."
[ "$STATUSLINE" = 1 ] || echo "Tip: re-run with --statusline for the usage-aware status line."
