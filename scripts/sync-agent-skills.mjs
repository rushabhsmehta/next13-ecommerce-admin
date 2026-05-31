#!/usr/bin/env node
/**
 * Mirror .agents/skills/ → .claude/skills/ (canonical source: .agents).
 * Run after editing project agent skills: node scripts/sync-agent-skills.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, ".agents", "skills");
const dest = join(root, ".claude", "skills");

if (!existsSync(src)) {
  console.error("Missing .agents/skills/");
  process.exit(1);
}

function mirrorDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const fromPath = join(from, name);
    const toPath = join(to, name);
    if (statSync(fromPath).isDirectory()) {
      mirrorDir(fromPath, toPath);
    } else {
      cpSync(fromPath, toPath);
    }
  }
}

if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}
mirrorDir(src, dest);
console.log("Synced .agents/skills/ → .claude/skills/");
