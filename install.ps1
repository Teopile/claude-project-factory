# Project Factory installer (Windows / PowerShell)
# Copies the agents, /factory command, and engine into ~/.claude/
$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$dst = Join-Path $env:USERPROFILE '.claude'

New-Item -ItemType Directory -Force (Join-Path $dst 'agents') | Out-Null
New-Item -ItemType Directory -Force (Join-Path $dst 'commands') | Out-Null
New-Item -ItemType Directory -Force (Join-Path $dst 'project-factory') | Out-Null

Copy-Item (Join-Path $src 'agents\*')  (Join-Path $dst 'agents')  -Recurse -Force
Copy-Item (Join-Path $src 'commands\*') (Join-Path $dst 'commands') -Recurse -Force
Copy-Item (Join-Path $src 'project-factory\*') (Join-Path $dst 'project-factory') -Recurse -Force

Write-Host "Project Factory installed to $dst"
Write-Host "Open Claude Code and run:  /factory ""your idea here"""
if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Write-Host "(Optional) For the Codex co-builder: npm i -g @openai/codex"
}
