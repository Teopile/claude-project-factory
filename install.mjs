#!/usr/bin/env node
// Universal installer for Project Factory - macOS, Windows, Linux; any shell.
// Usage:  node install.mjs
import { cpSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const src = dirname(fileURLToPath(import.meta.url))
const dst = join(homedir(), '.claude')

for (const d of ['agents', 'commands', 'project-factory']) {
  mkdirSync(join(dst, d), { recursive: true })
  cpSync(join(src, d), join(dst, d), { recursive: true })
}

console.log(`Project Factory installed to ${dst}`)
console.log('Open Claude Code and run:  /factory "your idea here"')

try { execSync('codex --version', { stdio: 'ignore' }) }
catch { console.log('(Optional) For the Codex co-builder: npm i -g @openai/codex') }