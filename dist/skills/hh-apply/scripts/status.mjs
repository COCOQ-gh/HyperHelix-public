#!/usr/bin/env node
// hh-apply: read-only inventory of a host project's HyperHelix wiring.
// Usage: node status.mjs [--host <dir>] [--nest <relpath>]
// Prints one JSON object. Never writes, never touches the network.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i !== -1 && i + 1 < args.length ? args[i + 1] : null; };

function git(cwd, gitArgs) {
  try {
    return execFileSync("git", gitArgs, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const start = path.resolve(flag("--host") || process.cwd());
const hostRoot = git(start, ["rev-parse", "--show-toplevel"]) || start;
const hostIsRepo = Boolean(git(start, ["rev-parse", "--show-toplevel"]));

// A nested HyperHelix checkout is a directory holding entrypoint.md + tools/hyperhelix.mjs.
// Scan two levels below the host root (doc/HyperHelix, HyperHelix, ...), skipping the usual bulk.
const SKIP = new Set(["node_modules", ".git", ".claude", ".codex", "dist", "build", "target", "vendor"]);
function isFrameworkRoot(dir) {
  return fs.existsSync(path.join(dir, "entrypoint.md")) && fs.existsSync(path.join(dir, "tools", "hyperhelix.mjs"));
}
function findNests(root, depth, acc) {
  if (depth < 0) return acc;
  let entries = [];
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return acc; }
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP.has(entry.name)) continue;
    const dir = path.join(root, entry.name);
    if (isFrameworkRoot(dir)) acc.push(dir);
    else findNests(dir, depth - 1, acc);
  }
  return acc;
}

const requestedNest = flag("--nest");
const nestDirs = requestedNest
  ? (isFrameworkRoot(path.join(hostRoot, requestedNest)) ? [path.join(hostRoot, requestedNest)] : [])
  : findNests(hostRoot, 1, []);

const nests = nestDirs.map((dir) => {
  const rel = path.relative(hostRoot, dir).split(path.sep).join("/");
  const branch = git(dir, ["branch", "--show-current"]);
  const originMain = git(dir, ["rev-parse", "--verify", "--quiet", "refs/remotes/origin/main"]);
  const counts = originMain ? git(dir, ["rev-list", "--left-right", "--count", "origin/main...HEAD"]) : null;
  const [behindMain, aheadOfMain] = counts ? counts.split(/\s+/).map(Number) : [null, null];
  const upstream = branch ? git(dir, ["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${branch}`]) : null;
  const upstreamCounts = upstream ? git(dir, ["rev-list", "--left-right", "--count", `origin/${branch}...HEAD`]) : null;
  const [behindUpstream, aheadOfUpstream] = upstreamCounts ? upstreamCounts.split(/\s+/).map(Number) : [null, null];
  return {
    dir,
    nest: rel,
    branch,
    originUrl: git(dir, ["remote", "get-url", "origin"]),
    head: git(dir, ["rev-parse", "--short", "HEAD"]),
    dirty: (git(dir, ["status", "--porcelain"]) || "") !== "",
    hooksPath: git(dir, ["config", "core.hooksPath"]),
    nodeModules: fs.existsSync(path.join(dir, "node_modules", "yaml")),
    behindOriginMain: behindMain,
    aheadOfOriginMain: aheadOfMain,
    projectBranchOnOrigin: Boolean(upstream),
    behindOriginBranch: behindUpstream,
    aheadOfOriginBranch: aheadOfUpstream,
  };
});

// Host-side wiring, judged against the first (or requested) nest when there is one.
const nest = nests[0]?.nest ?? requestedNest ?? null;
const settingsPath = path.join(hostRoot, ".claude", "settings.json");
let settingsText = null;
try { settingsText = fs.readFileSync(settingsPath, "utf8"); } catch {}
const commandsDir = path.join(hostRoot, ".claude", "commands");
const launchers = ["helix.md", "cycle.md", "sync.md", "compact-prep.md"].filter((f) => fs.existsSync(path.join(commandsDir, f)));
const gitignorePath = path.join(hostRoot, ".gitignore");
let gitignoreText = "";
try { gitignoreText = fs.readFileSync(gitignorePath, "utf8"); } catch {}
const claudeMdPath = path.join(hostRoot, "CLAUDE.md");
let claudeMd = "";
try { claudeMd = fs.readFileSync(claudeMdPath, "utf8"); } catch {}

const host = {
  root: hostRoot,
  isRepo: hostIsRepo,
  branch: hostIsRepo ? git(hostRoot, ["branch", "--show-current"]) : null,
  suggestedSlug: path.basename(hostRoot).replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "project",
  settingsExists: settingsText !== null,
  hooksWired: settingsText !== null && settingsText.includes("compaction-hooks.mjs")
    && (nest ? settingsText.includes(`${nest}/tools/compaction-hooks.mjs`) : true),
  launchersPresent: launchers,
  launchersMissing: ["helix.md", "cycle.md", "sync.md", "compact-prep.md"].filter((f) => !launchers.includes(f)),
  gitignoreCoversNest: Boolean(nest) && gitignoreText.split(/\r?\n/).some((line) => {
    const t = line.trim();
    return t === `${nest}/` || t === nest || t === `/${nest}/` || t === `/${nest}`;
  }),
  claudeMdExists: claudeMd !== "",
  claudeMdMentionsNest: Boolean(nest) && claudeMd.includes(`${nest}/entrypoint.md`),
};

console.log(JSON.stringify({ host, nests, nestCount: nests.length }, null, 2));
