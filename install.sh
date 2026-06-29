#!/usr/bin/env bash
# Project Factory installer (macOS / Linux)
# Copies the agents, /factory command, and engine into ~/.claude/
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)"
dst="$HOME/.claude"

mkdir -p "$dst/agents" "$dst/commands" "$dst/project-factory"
cp -Rf "$src"/agents/*  "$dst/agents/"
cp -Rf "$src"/commands/* "$dst/commands/"
cp -Rf "$src"/project-factory/* "$dst/project-factory/"

echo "Project Factory installed to $dst"
echo "Open Claude Code and run:  /factory \"your idea here\""
command -v codex >/dev/null 2>&1 || echo "(Optional) For the Codex co-builder: npm i -g @openai/codex"
