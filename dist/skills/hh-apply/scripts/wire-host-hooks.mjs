#!/usr/bin/env node
// hh-apply: wire the nested HyperHelix compaction hooks into the HOST's .claude/settings.json.
// Usage: node wire-host-hooks.mjs --host <dir> --nest <relpath> [--dry-run]
//
// Why a script: the host may already have a settings.json with its own permissions, env and
// hooks. Hand-merging JSON is where wiring breaks (a trailing comma, a lost permissions block).
// This merges idempotently: other keys and other hooks are preserved; an event that already
// calls compaction-hooks.mjs is left alone and reported.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i !== -1 && i + 1 < args.length ? args[i + 1] : null; };
const host = flag("--host");
const nest = flag("--nest");
const dryRun = args.includes("--dry-run");
if (!host || !nest) {
  console.error("usage: node wire-host-hooks.mjs --host <dir> --nest <relpath> [--dry-run]");
  process.exit(1);
}
const hookScript = path.join(host, nest, "tools", "compaction-hooks.mjs");
if (!fs.existsSync(hookScript)) {
  console.error(`wire-host-hooks: ${hookScript} does not exist — clone/bootstrap the nested framework first.`);
  process.exit(1);
}

// Same three events, same modes, as the nested-layout contract in
// <nest>/assets/workflows/session-bootstrap.md §3b (node only — jq is not guaranteed).
const EVENTS = { PreCompact: "precompact", PostCompact: "postcompact", UserPromptSubmit: "prompt" };
const commandFor = (mode) => `node "$CLAUDE_PROJECT_DIR/${nest}/tools/compaction-hooks.mjs" ${mode}`;

const settingsPath = path.join(host, ".claude", "settings.json");
let settings = {};
if (fs.existsSync(settingsPath)) {
  const text = fs.readFileSync(settingsPath, "utf8");
  try { settings = JSON.parse(text); } catch (err) {
    console.error(`wire-host-hooks: ${settingsPath} is not valid JSON (${err.message}) — fix it by hand first; nothing was written.`);
    process.exit(1);
  }
}
settings.hooks ??= {};
const report = [];
for (const [event, mode] of Object.entries(EVENTS)) {
  const groups = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [];
  const already = groups.some((group) => (group.hooks ?? []).some((hook) => String(hook.command ?? "").includes("compaction-hooks.mjs")));
  if (already) { report.push(`${event}: already wired (left unchanged)`); continue; }
  groups.push({ hooks: [{ type: "command", command: commandFor(mode) }] });
  settings.hooks[event] = groups;
  report.push(`${event}: ${dryRun ? "[dry] would add" : "added"} ${commandFor(mode)}`);
}

if (!dryRun) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
}
console.log(`${dryRun ? "[dry] " : ""}${settingsPath}\n` + report.map((line) => `  ${line}`).join("\n"));
