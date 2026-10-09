// HH-071: reproducible structural-cost inventory, independent from CLI output
// and convergence-baseline writes. Missing mandatory inputs fail closed.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function normalizeInventoryPath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//, "");
}

function inventoryFilesUnder(repoRoot, relativeDir, predicate, errors) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) {
    errors.push(`missing required directory: ${normalizeInventoryPath(relativeDir)}`);
    return [];
  }
  const found = [];
  const walk = (absolute) => {
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      const child = path.join(absolute, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) {
        const relative = normalizeInventoryPath(path.relative(repoRoot, child));
        if (predicate(relative)) found.push(relative);
      }
    }
  };
  walk(absoluteDir);
  return found.sort();
}

function inventoryEntry(repoRoot, relative, reasons, errors) {
  const normalized = normalizeInventoryPath(relative);
  const absolute = path.join(repoRoot, normalized);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    errors.push(`missing required file: ${normalized}`);
    return null;
  }
  const text = fs.readFileSync(absolute, "utf8");
  return {
    path: normalized,
    lines: text.split(/\r?\n/).length,
    functions: [...text.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*/gm)].length,
    reasons: [...new Set(reasons)],
  };
}

function addInventoryEntry(repoRoot, entries, relative, reason, errors) {
  const normalized = normalizeInventoryPath(relative);
  if (entries.has(normalized)) {
    entries.get(normalized).reasons = [...new Set([...entries.get(normalized).reasons, reason])];
    return;
  }
  const entry = inventoryEntry(repoRoot, normalized, [reason], errors);
  if (entry) entries.set(normalized, entry);
}

function summarizeInventory(entries) {
  const files = [...entries.values()].sort((a, b) => a.path.localeCompare(b.path));
  return {
    files,
    fileCount: files.length,
    lines: files.reduce((sum, entry) => sum + entry.lines, 0),
    functions: files.reduce((sum, entry) => sum + entry.functions, 0),
  };
}

function resolveCycleWorkflowSet(repoRoot, allWorkflows, fullCycle) {
  if (fullCycle) return { mode: "full", baseRef: null, fallbackReason: null, workflows: allWorkflows };
  try {
    const baseRef = execFileSync("git", [
      "-c", "core.excludesfile=", "log", "-G", "last_framework_review:",
      "--format=%H", "-n", "1", "--", "core/knowledge.yaml",
    ], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    if (!baseRef) throw new Error("last_framework_review commit not found");
    const diffPaths = execFileSync("git", [
      "-c", "core.excludesfile=", "diff", "--name-only", baseRef, "--",
    ], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split(/\r?\n/).filter(Boolean);
    const untracked = execFileSync("git", [
      "-c", "core.excludesfile=", "ls-files", "--others", "--exclude-standard",
    ], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split(/\r?\n/).filter(Boolean);
    const changed = [...new Set([...diffPaths, ...untracked].map(normalizeInventoryPath))];
    const untrackedSet = new Set(untracked.map(normalizeInventoryPath));
    const workflows = new Set([
      "assets/workflows/exception-handling.md",
      "assets/workflows/consolidation.md",
    ]);
    for (const file of changed) {
      if (file.startsWith("assets/workflows/") && file.endsWith(".md")) workflows.add(file);
      if (!/^(?:core\/|entrypoint\.md$|\.claude\/commands\/|assets\/(?:checklists|workflows)\/)/.test(file)) continue;
      const absolute = path.join(repoRoot, file);
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
      const text = untrackedSet.has(file)
        ? fs.readFileSync(absolute, "utf8")
        : execFileSync("git", [
          "-c", "core.excludesfile=", "diff", "--unified=0", baseRef, "--", file,
        ], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
          .split(/\r?\n/).filter((line) => line.startsWith("+") && !line.startsWith("+++"))
          .map((line) => line.slice(1)).join("\n");
      for (const match of text.matchAll(/assets\/workflows\/[A-Za-z0-9._/-]+\.md/g)) workflows.add(match[0]);
    }
    return { mode: "delta", baseRef, fallbackReason: null, workflows: [...workflows].sort() };
  } catch (err) {
    return { mode: "full-fallback", baseRef: null, fallbackReason: err.message, workflows: allWorkflows };
  }
}

// Index-read head: the part of an index-read material a session actually reads at
// startup — everything BEFORE `boundary` (a line equal to the string, or matching the
// RegExp). Pure text measurement, same character unit as the always-read tier (HH-073).
// A missing boundary is an error, never a silent whole-file or zero count.
export function measureReadHead(text, boundary) {
  const lines = String(text).split(/\r?\n/);
  const index = lines.findIndex((line) => (boundary instanceof RegExp ? boundary.test(line) : line.trimEnd() === boundary));
  if (index === -1) return { ok: false, lines: 0, chars: 0 };
  return { ok: true, lines: index, chars: lines.slice(0, index).join("\n").length };
}

export function buildCostInventory(repoRoot, { fullCycle = false } = {}) {
  const errors = [];
  const startupEntries = new Map();
  for (const relative of ["constitution.md", "core/loop.yaml", "core/routing.yaml", "core/gates.yaml"]) {
    addInventoryEntry(repoRoot, startupEntries, relative, "entrypoint.md always-read tier", errors);
  }

  const cycleEntries = new Map();
  addInventoryEntry(repoRoot, cycleEntries, ".claude/commands/skills/cycle.md", "/cycle launcher", errors);
  addInventoryEntry(repoRoot, cycleEntries, "entrypoint.md", "/cycle step 1 entrypoint authority", errors);
  for (const entry of startupEntries.values()) addInventoryEntry(repoRoot, cycleEntries, entry.path, "entrypoint.md always-read tier", errors);
  for (const relative of inventoryFilesUnder(repoRoot, "assets/checklists", (file) => file.endsWith(".md"), errors)) {
    addInventoryEntry(repoRoot, cycleEntries, relative, "/cycle step 1 all checklists", errors);
  }
  const allWorkflows = inventoryFilesUnder(repoRoot, "assets/workflows", (file) => file.endsWith(".md"), errors);
  const cycleWorkflowSet = resolveCycleWorkflowSet(repoRoot, allWorkflows, fullCycle);
  for (const relative of cycleWorkflowSet.workflows) {
    const reason = cycleWorkflowSet.mode === "delta"
      ? "/cycle delta workflow authority"
      : cycleWorkflowSet.mode === "full"
        ? "/cycle --full all workflows"
        : `/cycle full fallback (${cycleWorkflowSet.fallbackReason})`;
    addInventoryEntry(repoRoot, cycleEntries, relative, reason, errors);
  }
  addInventoryEntry(repoRoot, cycleEntries, "assets/ai/anti-patterns.md", "/cycle step 1 anti-pattern authority", errors);

  const toolingEntries = new Map();
  const toolingReasons = new Map([["tools/hyperhelix.mjs", ["cost-report CLI entrypoint"]]]);
  const queue = ["tools/hyperhelix.mjs"];
  while (queue.length) {
    const relative = normalizeInventoryPath(queue.shift());
    if (toolingEntries.has(relative)) continue;
    const entry = inventoryEntry(repoRoot, relative, toolingReasons.get(relative) || ["reachable local CLI import"], errors);
    if (!entry) continue;
    toolingEntries.set(relative, entry);
    const text = fs.readFileSync(path.join(repoRoot, relative), "utf8");
    for (const match of text.matchAll(/(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) continue;
      let target = normalizeInventoryPath(path.posix.normalize(path.posix.join(path.posix.dirname(relative), specifier)));
      if (!path.posix.extname(target)) target += ".mjs";
      if (target === ".." || target.startsWith("../")) {
        errors.push(`${relative}: local import escapes repository: ${specifier}`);
        continue;
      }
      const reason = `reachable local import from ${relative}`;
      toolingReasons.set(target, [...new Set([...(toolingReasons.get(target) || []), reason])]);
      if (toolingEntries.has(target)) toolingEntries.get(target).reasons = [...new Set([...toolingEntries.get(target).reasons, reason])];
      else queue.push(target);
    }
  }
  const allToolModules = inventoryFilesUnder(repoRoot, "tools", (file) => file.endsWith(".mjs"), errors);
  const excluded = allToolModules
    .filter((relative) => !toolingEntries.has(relative))
    .map((relative) => ({ path: relative, reason: "not reachable from tools/hyperhelix.mjs (separate runtime/test helper)" }));

  return {
    ok: errors.length === 0,
    errors,
    startup: summarizeInventory(startupEntries),
    cycle: { ...summarizeInventory(cycleEntries), ...cycleWorkflowSet },
    tooling: { ...summarizeInventory(toolingEntries), excluded },
  };
}
