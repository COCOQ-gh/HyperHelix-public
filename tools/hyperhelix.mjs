#!/usr/bin/env node
// HyperHelix framework validator + counter bump (HH-016 simplified model).
// Knowledge is a flat learning-note ledger (core/knowledge.yaml): notes with a
// strength sort-hint, no tiers/scopes/recompute/orphan/theta. This tool only
// validates structure and applies a task's counter/strength deltas.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";
import {
  AMENDMENTS_LIFECYCLE,
  EPOCH_CONTRACT,
  EPOCH_DOMAINS,
  GOVERNANCE_CONTRACT,
  branchNamespaceFromName,
  contractCoverage,
  domainEpoch,
  encodeBranchSlug,
  epochAllowsLegacyRead,
  extractHhIds,
  extractTaskIds,
  formatHhId,
  formatPermanentNoteId,
  formatTaskId,
  numberToSuffix,
  parseHhId,
  parseNoteId,
  parseTaskId,
  isValidTaskRef,
} from "./lib/contracts.mjs";
import {
  EPOCH_PARITY_STATE,
  advanceEpoch,
  applyMigrationRepairs,
  migrateCanon,
} from "./lib/migration.mjs";
import {
  checkFrameworkEvidenceGate,
  isFrameworkEvidencePath,
} from "./lib/framework-evidence.mjs";
import {
  amendmentsViewDrift,
  governanceScanFiles,
  loadGovernanceRegistry,
  maxHhSerial,
  parseGovernanceRegistryText,
  writeAmendmentsView,
} from "./lib/governance.mjs";
import {
  commitKnowledgeWrites,
  loadKnowledge,
  mergeCounterHighWater,
  parseLedgerNotesText,
  planBump,
  queryNotes,
  setBaselineCounter,
} from "./lib/knowledge.mjs";
import {
  CORE_LOOP,
  CORE_ROUTING,
  CORE_GATES,
  loadLoop,
  loadRouting,
  loadGates,
  depthModeNames,
} from "./lib/core-model.mjs";
import { KNOWLEDGE_CONTRACT } from "./lib/contracts.mjs";
import { checkTypedEdges } from "./lib/edge-model.mjs";
import { validateArchitecture } from "./lib/architecture.mjs";
import {
  governancePaths,
  prSafeSegment,
  publisherReady,
  pullRequestDisposition,
} from "./lib/pr-policy.mjs";
import { TASK_CLAIM_CONTRACT } from "./lib/contracts.mjs";
import { planCaptureTransaction } from "./lib/capture-transaction.mjs";
import {
  captureReviewSnapshot,
  classifyReviewSession,
} from "./lib/review-session.mjs";
import {
  assessVerificationReuse,
  attestVerificationReceipt,
  createVerificationSnapshot,
  sha256,
} from "./lib/verification-receipt.mjs";
import { countOpenBacklogItems, selectOpenBacklogItems } from "./lib/consolidation-report.mjs";
import { buildCostInventory, measureReadHead } from "./lib/cost-inventory.mjs";
import { cleanGitEnv } from "./lib/git-env.mjs";
import {
  TASK_PHASES,
  commitRecordErrors,
  distillCaptureGap,
  isLegacyRecordedCommit,
  unattributedAppliedNotes,
} from "./lib/commit-record.mjs";

const root = process.cwd();
// SC-07: canonical domain paths come from the contract/repository accessors —
// duplicated path literals in consumers are an architecture violation (ARCH).
const KNOWLEDGE = KNOWLEDGE_CONTRACT.mainLedger;
const KNOWLEDGE_DIR = KNOWLEDGE_CONTRACT.ledgerDir;
const GATES = CORE_GATES;
// HH:ARCH-ALLOW reason="bootstrap self-reference: the contract file cannot name itself through an accessor"
const CONTRACTS = "core/contracts.json";
const CONTRACT_DOC = "docs/generated/contracts.md";
const requiredFiles = [
  "constitution.md",
  GOVERNANCE_CONTRACT.view,
  GOVERNANCE_CONTRACT.registry,
  GOVERNANCE_CONTRACT.viewTemplate,
  CORE_LOOP,
  CORE_ROUTING,
  KNOWLEDGE,
  GATES,
  CONTRACTS,
  "AGENTS.md",
  "CLAUDE.md",
  "entrypoint.md",
  "assets/workflows/compaction.md",
  ".claude/settings.json",
  ".codex/hooks.json",
  ".codex/config.toml",
  ".codex/compact-prompt.md",
];

function readFile(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

function git(args, options = {}) {
  return execFileSync("git", ["-c", "core.excludesfile=", ...args], { cwd: root, ...options });
}

// --- session claim sidecars (AP-016 mechanical guard, 2026-08-24) -----------
// The record's exclusive create (wx) is the mutex; the sidecar records WHICH
// session won it. Same-tree parallel sessions share tasks/records/, so finish
// can verify ownership BEFORE any irreversible step instead of post-commit
// forensics (measured: 4 collisions in one day — a foreign session overwrote a
// claimed record, finish committed it cleanly, and bump idempotency silently
// absorbed the second task's task_index increment). Sidecars are untracked by
// design (.gitignore tasks/records/.claims/); an absent sidecar means a
// pre-guard record or another tree -> warn-only for backward compatibility.
function claimSidecarPath(taskId) {
  return path.join(root, TASK_CLAIM_CONTRACT.sidecarDir, `${taskId}.sid`);
}
function writeClaimSidecar(taskId, { exclusive = false } = {}) {
  const claimValue = crypto.randomBytes(8).toString("hex");
  fs.mkdirSync(path.dirname(claimSidecarPath(taskId)), { recursive: true });
  // Exclusive create makes the sidecar itself the mutex when no record file exists (HH-081 stage 2).
  fs.writeFileSync(claimSidecarPath(taskId), `${claimValue}\n`, { encoding: "utf8", flag: exclusive ? "wx" : "w" });
  return claimValue;
}

// HH-081 stage 2: claim a task whose record will live in its commit body. No tasks/
// file is written; the exclusive claim sidecar is the mutex, and an hh-record
// skeleton is printed for the commit message (git-conventions『Commit-body record』).
function briefCommitRecord(taskId, mode, dryRun) {
  if (!isValidTaskRef(taskId)) {
    console.error(`brief: 不正なタスクID '${taskId}'(TASK-… または GH-<n>)。`);
    process.exitCode = 1;
    return;
  }
  const fence = "```";
  const skeleton = [
    `${fence}hh-record`,
    "schema: 1",
    `task_id: ${taskId}`,
    `depth_mode: ${mode}`,
    "contract_impact: []   # framework パスに触れるなら行が必須(task record と同じ列)",
    "framework_check: []   # 同上",
    "evaluate: []",
    "notes:",
    "  retrieved: []",
    "  applied: []",
    "phase_evidence:",
    ...TASK_PHASES.map((phase) => `  ${phase}: []`),
    fence,
  ].join("\n");
  if (dryRun) {
    console.log(`[dry-run] would claim ${taskId} (commit-record, no tasks/ file).\n\n${skeleton}`);
    return;
  }
  let claimValue;
  try {
    claimValue = writeClaimSidecar(taskId, { exclusive: true });
  } catch (e) {
    if (e && e.code === "EEXIST") {
      console.error(`brief: ${taskId} は既に claim されています(並行セッションの可能性 — 別 ID で再実行すること。AP-016)。`);
      process.exitCode = 1;
      return;
    }
    throw e;
  }
  console.log(`Claimed ${taskId} (commit-record — no tasks/ file; HH-081).`);
  console.log("Put this block in the commit message passed to `finish --message` (fill it as the task progresses):\n");
  console.log(skeleton);
  console.log("");
  announceClaim(taskId, claimValue);
}
function announceClaim(taskId, token) {
  console.log(`claim token: ${token} — finish --task ${taskId} --sid ${token} で所有権を照合(concurrency.md §2 / AP-016)。token はこのセッション内で保持する。`);
}

function currentBranchNamespace() {
  const branch = git(["symbolic-ref", "--short", "HEAD"], { encoding: "utf8" }).trim();
  return branchNamespaceFromName(branch);
}

function error(code, message, line = null) {
  return { level: "error", code, message, line };
}
function warn(code, message, line = null) {
  return { level: "warn", code, message, line };
}
function info(code, message, line = null) {
  return { level: "info", code, message, line };
}

// SC-05c: the legacy fixed-schema line readers (schemaVersion/counter/parseNotes/
// ledgerFiles/loadAllNotes) are RETIRED — every knowledge consumer reads through
// tools/lib/knowledge.mjs (formal parser + strict schema). Rollback: one git
// revert restores them (rehearsed in TASK-main-20260717-013).

// --- task-list validation (unchanged from prior tool; orthogonal and useful) ---


// SC-07: the Markdown-table reader lives in the legacy adapter module
// (tools/lib/framework-evidence.mjs); each call site here is an annotated
// legacy/tool-owned surface, never domain canon state.


// --- active scan: removed/old-term drift detection (改善アイデア.md 案3) ---
// Scans ACTIVE materials for HH-016-removed vocabulary. History (amendments.md,
// tasks/**), DEPRECATED-marked files, fenced code blocks, and HH:ACTIVE-SCAN-ALLOW
// regions are excluded. The scanner detects drift in current explanations; it
// never punishes history or the detection spec itself.

const REMOVED_TERMS = [
  { re: /\b(PATTERN|PRINCIPLE|OBSERVATION)\.[A-Z]/, label: "old tiered-material ID (HH-016 replaced materials with note IDs)" },
  { re: /\btasks_since_tuning\b/, label: "removed counter (HH-016)" },
  { re: /\btuning_signals\b/, label: "removed counter (HH-016)" },
  { re: /\bid_seq\b/, label: "removed counter (HH-016)" },
  { re: /\brecompute\s+--(write|check)\b/, label: "removed recompute command (HH-016)" },
  { re: /recent\s*へ反映/, label: "old strength-update phrasing (HH-016: use --use/--miss)" },
  { re: /\blayer_active_cap\b/, label: "removed gate (HH-002)" },
  { re: /\borphan_window\b/, label: "removed gate (HH-016)" },
];

// File globs (active = error; tools = warn). History and deprecated excluded.
function activeScanFiles() {
  const out = [];
  const walk = (rel, exts) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = `${rel}/${ent.name}`;
      if (ent.isDirectory()) walk(childRel, exts);
      else if (exts.some((e) => ent.name.endsWith(e))) out.push({ file: childRel, level: "error" });
    }
  };
  // HH-055/060 made platform hook adapters and .github/** (CI + CODEOWNERS) framework
  // materials — keep this enumeration aligned with the sync/reflux FW path set (N-019).
  // SC-04: governance/ is DELIBERATELY absent here — HH bodies are history (like
  // amendments.md, excluded below); CONFLICT_MARKER covers them via governanceScanFiles.
  for (const f of ["README.md", "AGENTS.md", "CLAUDE.md", "entrypoint.md", ".claude/settings.json", ".github/CODEOWNERS"]) {
    if (fs.existsSync(path.join(root, f))) out.push({ file: f, level: "error" });
  }
  walk("docs", [".md"]);
  walk("assets", [".md"]);
  walk("core", [".yaml"]);
  walk(".claude/commands", [".md"]);
  walk(".codex", [".md", ".json", ".toml"]);
  walk(".github", [".md", ".yml", ".yaml"]);
  // tools: removed terms may legitimately appear as string literals -> warn only
  walk("tools", [".mjs"]);
  return out.map((e) => (e.file.startsWith("tools/") ? { ...e, level: "warn" } : e));
}

function activeScan() {
  const issues = [];
  const HISTORY = new Set([GOVERNANCE_CONTRACT.view]);
  for (const { file, level } of activeScanFiles()) {
    if (HISTORY.has(file) || file.startsWith("tasks/")) continue;
    const text = readFile(file);
    const lines = text.split(/\r?\n/);
    // file-level exclusion (first 20 lines): DEPRECATED docs, or a reference/history
    // file that opts out with HH:ACTIVE-SCAN-ALLOW-FILE (e.g. founding design record,
    // failure catalog — they cite pre-migration terms as history by nature).
    if (lines.slice(0, 20).some((l) => /DEPRECATED|HH:ACTIVE-SCAN-ALLOW-FILE/.test(l))) continue;
    let inFence = false;
    let inAllow = false;
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      if (/^\s*```/.test(l)) { inFence = !inFence; continue; }
      // range allow markers: open `HH:ACTIVE-SCAN-ALLOW` / close `/HH:ACTIVE-SCAN-ALLOW`
      // (markdown <!-- ... --> or YAML # ... form). Close is checked first so a line
      // bearing the closing slash never re-opens; -FILE is a file-level marker, not a range.
      if (/\/HH:ACTIVE-SCAN-ALLOW\b/.test(l)) { inAllow = false; continue; }
      if (/HH:ACTIVE-SCAN-ALLOW\b/.test(l) && !/-FILE/.test(l)) { inAllow = true; continue; }
      if (inFence || inAllow) continue;
      const inQuote = /^\s*>/.test(l);
      for (const { re, label } of REMOVED_TERMS) {
        if (re.test(l)) {
          const mk = inQuote ? info : (level === "warn" ? warn : error);
          issues.push(mk("ACTIVE_SCAN", `${file}: removed term — ${label} [${l.trim().slice(0, 60)}]`, i + 1));
          break; // one finding per line is enough
        }
      }
    }
  }
  return issues;
}

// --- brief anchors (改善アイデア.md 構造問題A) ---
// Machine-editable regions delimited by <!-- HH:NAME version=N --> ... <!-- /HH:NAME -->.
// Tools edit only inside an anchor; this parser/validator enforces the contract.


// Unresolved merge conflict markers in active materials (HH-044): a botched
// merge/sync can commit `<<<<<<< ` / `>>>>>>> ` lines into a core file and slip
// past every other guard (e.g. SYNC-20260622 left markers in knowledge.yaml,
// undetected until 2026-06-27). Scan column-0 git markers; the bare `=======`
// is skipped to avoid false-positives on markdown setext headings.
function validateConflictMarkers() {
  const issues = [];
  const files = [...new Set([...activeScanFiles().map((e) => e.file), ...governanceScanFiles(root), GOVERNANCE_CONTRACT.view, "constitution.md"])];
  for (const file of files) {
    if (!fs.existsSync(path.join(root, file))) continue;
    readFile(file).split(/\r?\n/).forEach((line, i) => {
      if (/^(<{7}|>{7}) /.test(line)) {
        issues.push(error("CONFLICT_MARKER", `${file}:${i + 1} 未解決のマージ競合マーカーが残存している`, i + 1));
      }
    });
  }
  return issues;
}

// --- validate ---

function commandHooks(config, event) {
  const groups = config?.hooks?.[event];
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group) => Array.isArray(group?.hooks) ? group.hooks : [])
    .filter((hook) => hook?.type === "command");
}

function validatePlatformCompaction() {
  const issues = [];
  const parseJson = (relative) => {
    try { return JSON.parse(readFile(relative)); }
    catch (cause) {
      issues.push(error("PLATFORM_COMPACTION", `${relative} must be valid JSON: ${cause.message}`));
      return null;
    }
  };

  const codexPath = ".codex/hooks.json";
  if (fs.existsSync(path.join(root, codexPath))) {
    const codex = parseJson(codexPath);
    if (codex) {
      for (const [event, mode] of [["PreCompact", "precompact"], ["PostCompact", "postcompact"], ["UserPromptSubmit", "prompt"], ["SessionStart", "recover"]]) {
        const hooks = commandHooks(codex, event);
        if (hooks.length !== 1) issues.push(error("PLATFORM_COMPACTION", `${codexPath} ${event} must have exactly one command hook; found ${hooks.length}`));
        for (const hook of hooks) {
          if (!String(hook.command || "").includes("git rev-parse --show-toplevel")
              || !String(hook.command || "").includes("tools/compaction-hooks.mjs")
              || !String(hook.command || "").trim().endsWith(mode)) {
            issues.push(error("PLATFORM_COMPACTION", `${codexPath} ${event} must call shared mode '${mode}'`));
          }
          if (!String(hook.commandWindows || "").includes("git rev-parse --show-toplevel")
              || !String(hook.commandWindows || "").includes("tools/compaction-hooks.mjs")
              || !String(hook.commandWindows || "").replace(/\"$/, "").trim().endsWith(mode)) {
            issues.push(error("PLATFORM_COMPACTION", `${codexPath} ${event} must define commandWindows for shared mode '${mode}'`));
          }
        }
      }
      if (codex.hooks?.PreCompact?.[0]?.matcher !== "manual|auto" || codex.hooks?.PostCompact?.[0]?.matcher !== "manual|auto") {
        issues.push(error("PLATFORM_COMPACTION", `${codexPath} compact matchers must cover manual|auto`));
      }
      if (codex.hooks?.SessionStart?.[0]?.matcher !== "compact|resume") {
        issues.push(error("PLATFORM_COMPACTION", `${codexPath} SessionStart matcher must cover compact|resume`));
      }
    }
  }

  const claudePath = ".claude/settings.json";
  if (fs.existsSync(path.join(root, claudePath))) {
    const claude = parseJson(claudePath);
    if (claude) {
      for (const event of ["PreCompact", "PostCompact", "UserPromptSubmit"]) {
        const hooks = commandHooks(claude, event);
        if (hooks.length !== 1) issues.push(error("PLATFORM_COMPACTION", `${claudePath} ${event} must have exactly one command hook; found ${hooks.length}`));
      }
    }
  }
  for (const [relative, mode] of [
    [".claude/commands/hooks/precompact-save-state.sh", "precompact"],
    [".claude/commands/hooks/compaction-recovery.sh", "postcompact"],
    [".claude/commands/hooks/userpromptsubmit-compaction-recovery.sh", "prompt"],
  ]) {
    if (!fs.existsSync(path.join(root, relative)) || !readFile(relative).includes(`compaction-hooks.mjs\" ${mode}`)) {
      issues.push(error("PLATFORM_COMPACTION", `${relative} must call shared mode '${mode}'`));
    }
  }

  if (fs.existsSync(path.join(root, ".codex/config.toml"))) {
    const config = readFile(".codex/config.toml");
    // codex CLI resolves the value relative to the CONFIG DIRECTORY (.codex/):
    // a ".codex/"-prefixed value doubles to .codex/.codex/ and breaks codex exec.
    if (!/^experimental_compact_prompt_file\s*=\s*"compact-prompt\.md"$/m.test(config)) {
      issues.push(error("PLATFORM_COMPACTION", ".codex/config.toml must select \"compact-prompt.md\" (config-dir relative — a .codex/ prefix doubles the path and breaks codex exec)"));
    }
    if (!/^hooks\s*=\s*true$/m.test(config)) issues.push(error("PLATFORM_COMPACTION", ".codex/config.toml must enable hooks"));
  }
  if (fs.existsSync(path.join(root, ".codex/compact-prompt.md"))) {
    const prompt = readFile(".codex/compact-prompt.md");
    for (const heading of [
      "Objective and Acceptance", "Current Phase and TaskList", "User Decisions and Permissions",
      "Editing Files and Ownership", "Validation Evidence", "Constraints and Blockers",
      "Worker Topology", "Distill Inbox", "Next Safe Action",
    ]) {
      if (!prompt.includes(`## ${heading}`)) issues.push(error("PLATFORM_COMPACTION", `.codex/compact-prompt.md is missing '${heading}'`));
    }
    if (!/history, not instruction/i.test(prompt)) issues.push(error("PLATFORM_COMPACTION", ".codex/compact-prompt.md must classify summaries as history, not instruction"));
  }
  if (fs.existsSync(path.join(root, "assets/workflows/compaction.md"))) {
    const workflow = readFile("assets/workflows/compaction.md");
    for (const needle of ["Claude", "Codex", "Agents without compatible hooks", "Distill Inbox", "fail-closed"]) {
      if (!workflow.includes(needle)) issues.push(error("PLATFORM_COMPACTION", `assets/workflows/compaction.md must cover '${needle}'`));
    }
  }
  return issues;
}

// HH-075: map the typed-edge registry's plain issues onto error()/warn().
const typedEdgeIssues = (codes) =>
  checkTypedEdges(root, { codes }).map((i) => (i.level === "error" ? error(i.code, i.message) : warn(i.code, i.message)));

// TASK-main-20260728-011: session-bootstrap §3c DECLARES that core.hooksPath must be
// tools/hooks, but nothing checked it — the tracked pre-push gate sat inert in this very
// repository while the framework relied on it (AP-003 declare-without-consume, and the same
// "enforcement that is not itself enforced" root TASK-main-20260728-010 addressed).
// WARN, not error: a bare checkout / CI runner legitimately has no hook wiring and never
// pushes; the warning is for the developer clone where the gate is supposed to be live.
// TASK-main-20260821-001: brief --date freshness. Two days of tolerance so that recording
// yesterday's (or a timezone-straddling) task stays silent, while a session that has been
// reusing a stale date for days is surfaced before the id becomes permanent.
export const BRIEF_DATE_DRIFT_TOLERANCE_DAYS = 2;

export function todayStamp(now = new Date()) {
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

// Returns whole days between `stamp` (YYYYMMDD) and today — positive when the stamp is in
// the past. null when the stamp is unparseable (the caller already rejected bad shapes).
export function briefDateDriftDays(stamp, now = new Date()) {
  if (!/^\d{8}$/.test(String(stamp || ""))) return null;
  const toUtc = (s) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  const given = toUtc(stamp);
  if (Number.isNaN(given)) return null;
  return Math.round((toUtc(todayStamp(now)) - given) / 86400000);
}

function validateHooksPath() {
  let configured;
  try {
    configured = git(["config", "core.hooksPath"], { encoding: "utf8" }).trim();
  } catch {
    configured = ""; // unset -> git exits non-zero
  }
  if (configured === "tools/hooks") return [];
  const actual = configured || "(unset)";
  return [warn("HOOKS_PATH", `core.hooksPath is ${actual}, not 'tools/hooks' — the tracked pre-push gate (validate + verify --base) is INERT here; run: git config core.hooksPath tools/hooks (session-bootstrap §3c)`)];
}

// process-backlog class:enforcement-gap (N-Project001-20260818b, session-bootstrap.md
// §3b): when HyperHelix is nested under a host project (its own separate git repo
// one level up from `root`), the hooks Claude Code actually loads live in the
// HOST's .claude/settings.json — the copy inside this repo (validateHooksPath
// above) is inert there. Detect nesting generically (a git repo above `root`,
// not env-var-dependent) and warn if the host has no compaction-hooks.mjs wiring.
function detectNestedHostRoot() {
  const parent = path.dirname(root);
  let hostRoot;
  try {
    // stderr is discarded: "no repo above root" is the normal non-nested case, and git's
    // `fatal: not a git repository` would otherwise leak into every validate/brief run.
    hostRoot = execFileSync("git", ["-C", parent, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null; // no git repo above root -> not nested
  }
  if (!hostRoot || path.resolve(hostRoot) === path.resolve(root)) return null;
  return hostRoot;
}

function validateNestedHookWiring() {
  const hostRoot = detectNestedHostRoot();
  if (!hostRoot) return [];
  const hostSettings = path.join(hostRoot, ".claude", "settings.json");
  if (!fs.existsSync(hostSettings)) {
    return [warn("NESTED_HOOKS_MISSING", `nested layout detected (host=${hostRoot}) but ${hostSettings} does not exist — compaction hooks (PreCompact/PostCompact/UserPromptSubmit) will never fire from the host; see assets/workflows/session-bootstrap.md §3b`)];
  }
  let text;
  try {
    text = fs.readFileSync(hostSettings, "utf8");
  } catch {
    return [warn("NESTED_HOOKS_MISSING", `${hostSettings} exists but could not be read — cannot confirm compaction hook wiring; see session-bootstrap.md §3b`)];
  }
  if (!text.includes("compaction-hooks.mjs")) {
    return [warn("NESTED_HOOKS_MISSING", `${hostSettings} exists but does not reference compaction-hooks.mjs — nested compaction hooks (PreCompact/PostCompact/UserPromptSubmit) appear unwired; see session-bootstrap.md §3b`)];
  }
  return [];
}

function validate() {
  const issues = [];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(root, file))) issues.push(error("MISSING_FILE", `${file} is missing`));
  }
  const coverage = contractCoverage();
  if (coverage.unconsumed.length > 0) {
    issues.push(error("CONTRACT_DEAD_FIELD", `core/contracts.json has unconsumed leaf fields: ${coverage.unconsumed.join(", ")}`));
  }

  // HH-059 hierarchy: entrypoint.md is the platform-neutral CANON (must point to
  // constitution.md); platform files (CLAUDE.md / AGENTS.md) are thin redirects
  // (must point to entrypoint.md, must NOT duplicate the reading order).
  const entry = fs.existsSync(path.join(root, "entrypoint.md")) ? readFile("entrypoint.md") : "";
  if (!entry.includes("constitution.md")) {
    issues.push(error("ENTRYPOINT", "entrypoint.md must point to constitution.md"));
  }
  if (!entry.includes("ルール本体ではありません")) {
    issues.push(warn("ENTRYPOINT", "entrypoint.md should explicitly stay non-authoritative"));
  }
  for (const name of ["AGENTS.md", "CLAUDE.md"]) {
    const text = fs.existsSync(path.join(root, name)) ? readFile(name) : "";
    if (!text.includes("entrypoint.md")) {
      issues.push(error("ENTRYPOINT", `${name} must redirect to entrypoint.md (HH-059: platform files are thin redirects)`));
    }
    if (!text.includes("ルール本体ではありません")) {
      issues.push(warn("ENTRYPOINT", `${name} should explicitly stay non-authoritative`));
    }
    if (text.includes("読み込み順序(HH-024")) {
      issues.push(warn("ENTRYPOINT", `${name} duplicates the reading order — entry content lives ONLY in entrypoint.md (HH-059)`));
    }
  }

  // SC-06: every domain must declare a KNOWN epoch state (unknown / future /
  // missing is fail-closed — the write guards and migrate-canon depend on it).
  for (const domain of EPOCH_DOMAINS) {
    try { domainEpoch(domain); } catch (err) { issues.push(error("EPOCH", err.message)); }
  }

  // SC-02: loop/routing/gates go through the core-model repository (formal parser
  // + strict schema; fail-closed).
  for (const load of [loadLoop, loadRouting, loadGates]) {
    const model = load();
    if (!model.ok) for (const message of model.errors) issues.push(error("CORE_MODEL", message));
  }

  // SC-05c: the knowledge canon has ONE inspection point — KNOWLEDGE_READER
  // (validateGovernance-style schema+semantic via the repository). The legacy
  // SCHEMA/COUNTER/NOTE_ID/NOTE_FIELD/next_note_id line-regex checks are subsumed
  // by the strict schema (unknown counters keys, duplicate ids, field shapes).
  // What remains here is branch-dependent or cadence logic on the parsed state.
  const knowledgeState = loadKnowledge(root);
  if (knowledgeState.ok) {
    // HH-061 provisional ids are read-only compatible off main and FORBIDDEN on
    // main. Unknown branch is treated as main (fail-closed).
    let onMain = true;
    try { onMain = git(["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim() === "main"; } catch {}
    if (onMain) {
      for (const n of knowledgeState.value.notes) {
        if (parseNoteId(n.id)?.kind === "provisional") {
          issues.push(error("PROVISIONAL_NOTE_ID", `${n.sourceFile}: ${n.id} is a deprecated HH-061 provisional id — regenerate it with hyperhelix.mjs next-id before merging to main`));
        }
      }
    }
    const { task_index: taskIndex, last_framework_review: lastReview } = knowledgeState.value.counters;
    if (taskIndex - lastReview >= 5) {
      issues.push(warn("FRAMEWORK_REVIEW", `task_index=${taskIndex} and last_framework_review=${lastReview}; run assets/checklists/framework-review.md`));
    }
  }

  issues.push(...validateHooksPath());
  issues.push(...validateNestedHookWiring());
  issues.push(...activeScan());
  // HH-075: the graph-shaped guards are rows of the typed-edge registry
  // (tools/lib/edge-model.mjs). Split calls preserve the legacy issue order
  // around the interleaved non-graph guards.
  issues.push(...typedEdgeIssues(["GATE_DEAD_CONFIG", "PHASE_CONSISTENCY", "STEP_CONSISTENCY"]));
  issues.push(...validateLedgerIdUniqueness());
  issues.push(...typedEdgeIssues(["TOOL_DOC_CONSISTENCY", "CHECK_DOC_CONSISTENCY", "NOTE_FIELD_SCHEMA", "REF_PATH_EXISTS"]));
  issues.push(...validateConflictMarkers());
  issues.push(...validateGovernance());
  issues.push(...validateKnowledgeReader());
  issues.push(...validateNoteTextLength());
  issues.push(...validateNoteIdContinuity());
  // SC-07: architecture gate — direct canon access / state-extraction readers
  // outside their repository or legacy adapter (annotated crossings excepted).
  issues.push(...validateArchitecture(root).map((message) => error("ARCH", message)));
  issues.push(...typedEdgeIssues(["AMEND_LIFECYCLE_CONSUMER"]));
  issues.push(...validatePlatformCompaction());
  return issues;
}

// HH-064 (裁定 2026-07-18 / TASK-main-20260718-005): permanent note ids never
// change. When origin/main is part of local history, every note id published on
// origin/main must still exist locally (state: archived keeps the id; renames
// and hard deletes are human-gated). WARN level by design: a ratified
// correction (e.g. restoring a wrongly renamed id) is legitimately absent
// upstream until pushed — the warning surfaces the difference, the human rules.
function validateNoteIdContinuity() {
  const issues = [];
  try { git(["merge-base", "--is-ancestor", "origin/main", "HEAD"], { stdio: "ignore" }); } catch { return issues; }
  const local = loadKnowledge(root);
  if (!local.ok) return issues; // KNOWLEDGE_READER already reports the canon problem
  const localIds = new Set(local.value.notes.map((n) => n.id));
  const collect = (relative, role) => {
    let text;
    // HH:ARCH-ALLOW reason="read-only origin/main ledger read for the HH-064 id-continuity check; content parsed by the knowledge repository"
    try { text = git(["show", `origin/main:${relative}`], { encoding: "utf8" }); } catch { return; }
    const parsed = parseLedgerNotesText(text, role, { source: `origin/main:${relative}` });
    if (!parsed.ok) return; // an unreadable remote ledger belongs to sync, not continuity
    for (const note of parsed.value.notes) {
      if (!localIds.has(note.id)) {
        issues.push(warn("NOTE_ID_CONTINUITY", `origin/main note id '${note.id}' is missing locally — HH-064 forbids renames/silent deletes (ignore only for a ratified correction awaiting push)`));
      }
    }
  };
  collect(KNOWLEDGE, "main");
  try {
    // HH:ARCH-ALLOW reason="read-only remote leaf-ledger enumeration for the HH-064 id-continuity check"
    const leaves = git(["ls-tree", "--name-only", "origin/main", `${KNOWLEDGE_DIR}/`], { encoding: "utf8" })
      .trim().split(/\r?\n/).filter((file) => file.endsWith(".yaml") && !file.endsWith("/manifest.yaml"));
    for (const leaf of leaves) collect(leaf, "leaf");
  } catch { /* origin/main without a leaf-ledger directory */ }
  return issues;
}

// SC-05a: the knowledge canon (manifest + every declared ledger) must round-trip
// the formal parser/schema — parse errors, schema violations, duplicate ids,
// ownership mismatches, and orphan ledgers are all fail-closed here. The legacy
// line-regex consumers stay live until SC-05b/c (dual-read / legacy-write).
function validateKnowledgeReader() {
  const loaded = loadKnowledge(root);
  if (loaded.ok) return [];
  return loaded.errors.map((message) => error("KNOWLEDGE_READER", message));
}

// HH-082 B: a note is ONE lesson plus when it applies. Notes created on/after the
// contract's `since` date (read from the permanent id) warn past the soft maximum;
// older notes are grandfathered, archived notes are ignored. Guideline, not a gate.
function validateNoteTextLength() {
  const loaded = loadKnowledge(root);
  if (!loaded.ok) return []; // KNOWLEDGE_READER already reports the canon problem
  const { chars, since } = KNOWLEDGE_CONTRACT.noteTextSoftMax;
  const issues = [];
  for (const note of loaded.value.notes) {
    if (note.state === "archived") continue;
    const parsed = parseNoteId(note.id);
    if (parsed?.kind !== "permanent" || parsed.date < since) continue;
    if (note.text.length > chars) {
      issues.push(warn("NOTE_TEXT_LENGTH", `note '${note.id}' text is ${note.text.length} characters (soft max ${chars} for notes created on/after ${since}) — keep the lesson and when it applies; move evidence to a leaf note or the commit hh-record (HH-082)`));
    }
  }
  return issues;
}

// SC-04 (HH-067): HH lifecycle state lives in governance/amendments/registry.yaml;
// amendments.md is a generated view checked by byte drift. Headings and body
// **Status:** lines are never parsed as execution state.
function validateGovernance() {
  const issues = [];
  const loaded = loadGovernanceRegistry(root);
  for (const message of loaded.warnings) issues.push(warn("AMEND_RATIFIED_BY_EMPTY", message));
  if (!loaded.ok) {
    issues.push(...loaded.errors.map((message) => error("GOV_REGISTRY", message)));
    return issues;
  }
  const drift = amendmentsViewDrift(root);
  if (drift.drifted) issues.push(...drift.errors.map((message) => error("GOV_VIEW_DRIFT", message)));
  return issues;
}


function contractLeaves(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) => contractLeaves(child, prefix ? `${prefix}.${key}` : key));
}

export function renderContractDoc(contractObject) {
  const rows = contractLeaves(contractObject).map(([field, value]) => {
    const rendered = JSON.stringify(value).replaceAll("|", "\\u007c").replaceAll("`", "\\u0060");
    return `| \`${field}\` | \`${rendered}\` |`;
  });
  return `# Generated Contract Reference\n\n<!-- GENERATED by: node tools/hyperhelix.mjs contract-doc; edit core/contracts.json, not this file. -->\n\n| field | canonical value |\n|---|---|\n${rows.join("\n")}\n`;
}

function contractDocStatus() {
  // HH:ARCH-ALLOW reason="contract-doc generator renders the contract canon read-only (leaf enumeration needs the raw JSON)"
  const expected = renderContractDoc(JSON.parse(readFile(CONTRACTS)));
  const actual = fs.existsSync(path.join(root, CONTRACT_DOC)) ? readFile(CONTRACT_DOC) : null;
  return { ok: actual === expected, expected };
}

function contractDoc(args) {
  const check = args.includes("--check");
  const status = contractDocStatus();
  if (check) {
    if (!status.ok) {
      console.error(`contract-doc: ${CONTRACT_DOC} is stale or missing.`);
      process.exitCode = 1;
      return;
    }
    console.log(`contract-doc: ${CONTRACT_DOC} is current.`);
    return;
  }
  fs.mkdirSync(path.dirname(path.join(root, CONTRACT_DOC)), { recursive: true });
  fs.writeFileSync(path.join(root, CONTRACT_DOC), status.expected, "utf8");
  console.log(`contract-doc: wrote ${CONTRACT_DOC}.`);
}

// SC-04: deterministic amendments.md generation from the governance canon
// (registry + bodies + view template). --check compares full bytes (drift=fail).
function amendmentsDoc(args) {
  if (args.includes("--check")) {
    const drift = amendmentsViewDrift(root);
    if (drift.drifted) {
      console.error(`amendments-doc: ${GOVERNANCE_CONTRACT.view} is stale/missing or the governance canon is invalid.`);
      for (const message of drift.errors) console.error(`  ${message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`amendments-doc: ${GOVERNANCE_CONTRACT.view} is current.`);
    return;
  }
  const written = writeAmendmentsView(root);
  if (!written.ok) {
    console.error("amendments-doc: governance canon is invalid — not writing (fail-closed).");
    for (const message of written.errors) console.error(`  ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`amendments-doc: wrote ${GOVERNANCE_CONTRACT.view}.`);
}

// SC-06: migrate-canon — per-domain legacy->canon closure. --check reports the
// mandatory counts (total/converted/equivalent/rejected/legacy-live) and writes
// nothing; --apply writes only when green (generated-view repairs are the one
// repairable divergence), then advances each selected green domain one safe
// step (pre-parity domains jump to semantic-parity-confirmed) and refreshes the
// generated contract doc.
function migrateCanonCli(args) {
  const check = args.includes("--check");
  const apply = args.includes("--apply");
  if ((check ? 1 : 0) + (apply ? 1 : 0) !== 1) {
    console.error("migrate-canon: exactly one of --check or --apply is required. [--domain governance,knowledge]");
    process.exitCode = 1;
    return;
  }
  const domainI = args.indexOf("--domain");
  const domains = domainI !== -1 && args[domainI + 1]
    ? args[domainI + 1].split(",").map((s) => s.trim()).filter(Boolean)
    : [...EPOCH_DOMAINS];
  const run = () => migrateCanon(root, { domains });
  let outcome;
  try { outcome = run(); } catch (err) {
    console.error(`migrate-canon: ${err.message}`);
    process.exitCode = 1;
    return;
  }
  for (const result of outcome.results) {
    const c = result.counts;
    console.log(`migrate-canon ${result.domain}: epoch=${result.epoch.state} total=${c.total} converted=${c.converted} equivalent=${c.equivalent} rejected=${c.rejected} legacy-live=${c.legacyLive}`);
    for (const line of result.info) console.log(`  ${line}`);
    for (const line of result.issues) console.error(`  ! ${line}`);
  }
  if (check) {
    if (!outcome.ok) {
      console.error("migrate-canon: NOT green (rejected / legacy-live / equivalence gap) — fail-closed.");
      process.exitCode = 1;
    }
    return;
  }
  if (outcome.results.some((r) => r.counts.rejected > 0 || r.counts.legacyLive > 0)) {
    console.error("migrate-canon: rejected / legacy-live records present — --apply refuses to write (fix them at their producing tool; fail-closed).");
    process.exitCode = 1;
    return;
  }
  const repaired = applyMigrationRepairs(root, outcome.results);
  if (!repaired.ok) {
    for (const message of repaired.errors) console.error(`migrate-canon: ${message}`);
    process.exitCode = 1;
    return;
  }
  if (repaired.written.length) console.log(`migrate-canon: repaired generated views: ${repaired.written.join(", ")}`);
  let recheck;
  try { recheck = run(); } catch (err) {
    console.error(`migrate-canon: ${err.message}`);
    process.exitCode = 1;
    return;
  }
  if (!recheck.ok) {
    console.error("migrate-canon: still not green after view repairs — epoch not advanced (fail-closed).");
    process.exitCode = 1;
    return;
  }
  const parityIndex = EPOCH_CONTRACT.states.indexOf(EPOCH_PARITY_STATE);
  let advancedAny = false;
  for (const result of recheck.results) {
    const targetIndex = result.epoch.index < parityIndex
      ? parityIndex
      : Math.min(result.epoch.index + 1, EPOCH_CONTRACT.states.length - 1);
    if (targetIndex === result.epoch.index) {
      console.log(`migrate-canon ${result.domain}: epoch already final (${result.epoch.state}).`);
      continue;
    }
    const targetState = EPOCH_CONTRACT.states[targetIndex];
    const advanced = advanceEpoch(root, result.domain, targetState);
    if (!advanced.ok) {
      for (const message of advanced.errors) console.error(`migrate-canon: ${message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`migrate-canon ${result.domain}: epoch ${advanced.from} -> ${advanced.to}.`);
    advancedAny = true;
  }
  if (advancedAny) {
    fs.mkdirSync(path.dirname(path.join(root, CONTRACT_DOC)), { recursive: true });
    // HH:ARCH-ALLOW reason="epoch advance refreshes the generated contract doc from the contract canon read-only"
    fs.writeFileSync(path.join(root, CONTRACT_DOC), renderContractDoc(JSON.parse(readFile(CONTRACTS))), "utf8");
    console.log(`migrate-canon: refreshed ${CONTRACT_DOC}.`);
  }
}

// HH-068: capture purpose/depth planning and review-only ownership proof.
// Both commands are read-only. Review evidence is deliberately stored outside
// the repository so producing the proof does not create a repository artifact.
function cliFlagValue(args, flag) {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length && !args[index + 1].startsWith("--")
    ? args[index + 1]
    : null;
}

function validateCliArgs(args, valueFlags, booleanFlags = []) {
  const values = new Set(valueFlags);
  const booleans = new Set(booleanFlags);
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (seen.has(arg)) throw new Error(`duplicate option: ${arg}`);
    seen.add(arg);
    if (values.has(arg)) {
      if (index + 1 >= args.length || args[index + 1].startsWith("--")) throw new Error(`${arg} requires a value`);
      index += 1;
      continue;
    }
    if (booleans.has(arg)) continue;
    throw new Error(`unknown option: ${arg}`);
  }
}

function capturePlanCli(args) {
  const valueFlags = ["--trigger", "--artifact", "--captured-artifact", "--current-task", "--current-depth"];
  const booleanFlags = ["--scope-included", "--write-overlap"];
  try {
    validateCliArgs(args, valueFlags, booleanFlags);
    const routing = loadRouting();
    if (!routing.ok) throw new Error(routing.errors.join("; "));
    const currentTaskId = cliFlagValue(args, "--current-task");
    const currentDepth = cliFlagValue(args, "--current-depth");
    if ((currentTaskId && !currentDepth) || (!currentTaskId && currentDepth)) {
      throw new Error("--current-task and --current-depth must be provided together");
    }
    if (!currentTaskId && (args.includes("--scope-included") || args.includes("--write-overlap"))) {
      throw new Error("current-task scope/overlap flags require --current-task and --current-depth");
    }
    if (currentTaskId && !parseTaskId(currentTaskId)) throw new Error(`invalid --current-task id: ${currentTaskId}`);
    const plan = planCaptureTransaction(routing.value.significant_discovery_parking, {
      trigger: cliFlagValue(args, "--trigger"),
      artifactType: cliFlagValue(args, "--artifact"),
      capturedArtifact: cliFlagValue(args, "--captured-artifact"),
      currentTask: currentTaskId ? {
        id: currentTaskId,
        depth: currentDepth,
        scopeIncluded: args.includes("--scope-included"),
        writeOverlap: args.includes("--write-overlap"),
      } : null,
    });
    console.log(JSON.stringify(plan, null, 2));
  } catch (err) {
    console.error(`capture-plan: ${err.message}`);
    process.exitCode = 1;
  }
}

function reviewSnapshotCli(args) {
  try {
    validateCliArgs(args, []);
    console.log(JSON.stringify(captureReviewSnapshot(root), null, 2));
  } catch (err) {
    console.error(`review-snapshot: unverified — ${err.message}`);
    process.exitCode = 3;
  }
}

function externalEvidencePath(value, label) {
  if (!value) throw new Error(`${label} is required`);
  const absolute = path.resolve(value);
  const relative = path.relative(root, absolute);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error(`${label} must be outside the repository`);
  }
  return absolute;
}

function readExternalJson(value, label) {
  const absolute = externalEvidencePath(value, label);
  const text = fs.readFileSync(absolute, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(text);
}

function reviewCheckCli(args) {
  try {
    validateCliArgs(args, ["--baseline", "--journal"], ["--isolated"]);
    const baseline = readExternalJson(cliFlagValue(args, "--baseline"), "--baseline");
    const journal = readExternalJson(cliFlagValue(args, "--journal"), "--journal");
    const end = captureReviewSnapshot(root);
    const result = classifyReviewSession({ baseline, end, journal, isolated: args.includes("--isolated") });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.exit_code;
  } catch (err) {
    console.error(`review-check: unverified — ${err.message}`);
    process.exitCode = 3;
  }
}

const VERIFICATION_LAYER_ORDER = ["L1 Structure", "L2 Contract", "L3 Behavior", "L4 Evidence"];

export function summarizeVerificationLayers(layerErrors, { reusedLayers = [] } = {}) {
  const reused = new Set(reusedLayers);
  const layers = VERIFICATION_LAYER_ORDER.map((name) => ({
    name,
    errors: [...(layerErrors[name] || [])],
    ok: (layerErrors[name] || []).length === 0,
    reused: reused.has(name) && (layerErrors[name] || []).length === 0,
  }));
  return { ok: layers.every((layer) => layer.ok), layers };
}

function changedAdditionalPath(file) {
  if (!fs.existsSync(path.join(root, file))) return false;
  if (!isGitTracked(file)) return true;
  try {
    git(["diff", "--quiet", "HEAD", "--", file]);
    return false;
  } catch {
    return true;
  }
}

function collectStagedPaths(additionalPaths = []) {
  const changed = new Set(
    git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"], { encoding: "utf8" })
      .split(/\r?\n/).filter(Boolean),
  );
  for (const file of additionalPaths) if (changedAdditionalPath(file)) changed.add(file);
  return [...changed].map((file) => file.replaceAll("\\", "/")).sort();
}


// HH-081 stage 1/2: validate every commit-body record (```hh-record) in the range.
// Each commit is checked against its OWN changed paths. Stage 2: paths changed ONLY
// by commits carrying a record are covered by those records; every other path
// (block-less commits, merge resolutions) stays with the tasks/records gate.
function scanBaseCommitRecords(baseRef) {
  const raw = git(["log", "--format=%x1e%H%x1f%aI%x1f%B%x1f", "--name-only", "--diff-filter=ACMR", `${baseRef}...HEAD`], { encoding: "utf8" });
  const noteIds = currentNoteIds();
  const depthModes = currentDepthModes();
  const errors = [];
  const warnings = [];
  const coveredByRecord = new Set();
  const touchedWithoutRecord = new Set();
  for (const entry of raw.split("\x1e").filter((chunk) => chunk.trim())) {
    const [hash, authorDate = "", body = "", files = ""] = entry.split("\x1f");
    const changedPaths = files.split(/\r?\n/).filter(Boolean).map((file) => file.replaceAll("\\", "/"));
    const source = `commit ${hash.trim().slice(0, 9)}`;
    const result = commitRecordErrors(body, { changedPaths, noteIds, depthModes, source });
    errors.push(...result.errors);
    if (result.record) {
      const gap = distillCaptureGap(result.record, changedPaths);
      if (gap) warnings.push(warn("DISTILL_CAPTURE", `${source}: ${gap}`));
    }
    const covered = result.present || isLegacyRecordedCommit(authorDate.trim(), changedPaths);
    for (const file of changedPaths) (covered ? coveredByRecord : touchedWithoutRecord).add(file);
  }
  return { errors, warnings, coveredByRecord, touchedWithoutRecord };
}

function currentDepthModes() {
  const loaded = loadLoop();
  return loaded.ok ? new Set(depthModeNames(loaded.value)) : null;
}

function currentNoteIds() {
  const loaded = loadKnowledge(root);
  return new Set(loaded.ok ? loaded.value.notes.map((note) => note.id) : []);
}

function collectBasePaths(baseRef) {
  return git(["diff", "--name-only", "--diff-filter=ACMR", `${baseRef}...HEAD`], { encoding: "utf8" })
    .split(/\r?\n/).filter(Boolean).map((file) => file.replaceAll("\\", "/")).sort();
}

function repositoryFileHashes() {
  const listed = git(["ls-files", "-co", "--exclude-standard", "--deduplicate", "-z"], { encoding: "utf8" });
  const hashes = {};
  for (const raw of listed.split("\0").filter(Boolean)) {
    const file = raw.replaceAll("\\", "/");
    const absolute = path.join(root, file);
    hashes[file] = fs.existsSync(absolute) && fs.statSync(absolute).isFile()
      ? sha256(fs.readFileSync(absolute))
      : sha256("<missing>");
  }
  return hashes;
}

function captureVerificationInput(taskId) {
  const lockfile = path.join(root, "package-lock.json");
  if (!fs.existsSync(lockfile)) throw new Error("package-lock.json is missing");
  return createVerificationSnapshot({
    taskId,
    head: git(["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    indexFingerprint: sha256(git(["ls-files", "--stage", "-z"], { encoding: "utf8" })),
    platform: process.platform,
    architecture: process.arch,
    nodeVersion: process.version,
    lockfileHash: sha256(fs.readFileSync(lockfile)),
    fileHashes: repositoryFileHashes(),
  });
}


function behaviorErrors() {
  try {
    if (process.env.HH_TEST_BEHAVIOR_LOG) {
      fs.appendFileSync(process.env.HH_TEST_BEHAVIOR_LOG, "run\n", "utf8");
    }
    // Tests create throwaway repos; a hook-exported GIT_DIR would point their
    // git calls at THIS repository (git-env.mjs).
    const childEnv = cleanGitEnv(process.env);
    delete childEnv.NODE_TEST_CONTEXT;
    execFileSync(process.execPath, ["--test", "--test-concurrency=16"], {
      cwd: root, stdio: "inherit", env: childEnv,
    });
    return [];
  } catch (err) {
    const status = Number.isInteger(err?.status) ? err.status : "unknown";
    return [`node --test exited ${status}`];
  }
}

function runVerify({
  mode,
  baseRef = null,
  additionalPaths = [],
  taskId = null,
  commitRecord = null,
  runBehavior = true,
  behaviorReceipt = null,
}) {
  let changedPaths;
  try {
    changedPaths = mode === "base" ? collectBasePaths(baseRef) : collectStagedPaths(additionalPaths);
  } catch (err) {
    const result = summarizeVerificationLayers({
      "L1 Structure": [`cannot collect ${mode} changes: ${err.message}`],
    });
    for (const layer of result.layers) {
      console.log(`[${layer.name}] ${layer.ok ? "PASS" : "FAIL"}${layer.errors.length ? ` — ${layer.errors.join("; ")}` : ""}`);
    }
    return result;
  }

  let validationIssues;
  try {
    validationIssues = validate();
  } catch (err) {
    validationIssues = [error("VERIFY_L1", `validate crashed: ${err.message}`)];
  }
  const validationErrors = validationIssues.filter((issue) => issue.level === "error");
  const warnings = validationIssues.filter((issue) => issue.level === "warn");
  if (warnings.length) printIssues(warnings);

  const contractErrors = [];
  try {
    if (!contractDocStatus().ok) contractErrors.push(`${CONTRACT_DOC} is stale or missing`);
  } catch (err) {
    contractErrors.push(`contract documentation check failed: ${err.message}`);
  }
  // SC-04: L2 checks the governance canon (registry) and the generated view drift.
  const governanceLoaded = loadGovernanceRegistry(root);
  if (!governanceLoaded.ok) contractErrors.push(...governanceLoaded.errors);
  else {
    const governanceDrift = amendmentsViewDrift(root);
    if (governanceDrift.drifted) contractErrors.push(...governanceDrift.errors);
  }
  // HH-081 stage 4: the hh-record in the commit body is the ONLY task record.
  //   base   — every framework path in the range must be changed only by commits that
  //            carry a valid record (or a pre-cutover legacy tasks/ record); each record is
  //            checked against its OWN commit (scanBaseCommitRecords).
  //   staged — finish passes the record parsed from --message.
  let evidence;
  if (mode === "base") {
    let scan;
    try {
      scan = scanBaseCommitRecords(baseRef);
    } catch (err) {
      // Fail closed: unreadable history covers nothing.
      scan = { errors: [`commit-body records unreadable: ${err.message}`], warnings: [], coveredByRecord: new Set(), touchedWithoutRecord: new Set() };
    }
    if (scan.warnings.length) { printIssues(scan.warnings); warnings.push(...scan.warnings); }
    const frameworkPaths = changedPaths.filter(isFrameworkEvidencePath);
    const uncovered = frameworkPaths.filter((file) => !scan.coveredByRecord.has(file) || scan.touchedWithoutRecord.has(file));
    const errors = [...scan.errors];
    if (uncovered.length) errors.push(`framework paths changed by commits without an hh-record: ${uncovered.join(", ")}`);
    evidence = { ok: errors.length === 0, frameworkPaths, errors };
  } else if (commitRecord) {
    evidence = checkFrameworkEvidenceGate(changedPaths, commitRecord);
  } else {
    const frameworkPaths = changedPaths.filter(isFrameworkEvidencePath);
    evidence = frameworkPaths.length
      ? { ok: false, frameworkPaths, errors: ["no hh-record — run `finish --task <id> --message '<message with the hh-record block>'` (omit --commit for a dry run)"] }
      : { ok: true, frameworkPaths, errors: [] };
  }
  const evidenceErrors = evidence.ok ? [] : [
    `framework evidence gate failed for ${evidence.frameworkPaths.join(", ") || "(unknown)"}`,
    ...evidence.errors,
  ];

  const behaviorReused = !runBehavior && behaviorReceipt?.ok === true;
  const behaviorLayerErrors = runBehavior
    ? behaviorErrors()
    : behaviorReused ? [] : ["L3 was not executed and no verified receipt was supplied"];
  const result = summarizeVerificationLayers({
    "L1 Structure": validationErrors.map((issue) => `${issue.code}: ${issue.message}`),
    "L2 Contract": contractErrors,
    "L3 Behavior": behaviorLayerErrors,
    "L4 Evidence": evidenceErrors,
  }, { reusedLayers: behaviorReused ? ["L3 Behavior"] : [] });
  for (const layer of result.layers) {
    const suffix = layer.errors.length ? ` — ${layer.errors.join("; ")}` : "";
    const state = layer.reused ? "REUSED" : layer.ok ? "PASS" : "FAIL";
    const receiptSuffix = layer.reused && behaviorReceipt?.receiptDigest
      ? ` — receipt ${behaviorReceipt.receiptDigest.slice(0, 12)}` : "";
    console.log(`[${layer.name}] ${state}${receiptSuffix}${suffix}`);
  }
  console.log(`verify (${mode}${baseRef ? ` ${baseRef}` : ""}): ${result.ok ? "PASS" : "FAIL"}; changed=${changedPaths.length}; warnings=${warnings.length}`);
  return result;
}

function verify(args) {
  const staged = args.includes("--staged");
  const baseI = args.indexOf("--base");
  const baseRef = baseI >= 0 ? args[baseI + 1] : null;
  const taskI = args.indexOf("--task");
  const taskId = taskI >= 0 ? args[taskI + 1] : null;
  if ((staged ? 1 : 0) + (baseI >= 0 ? 1 : 0) !== 1 || (baseI >= 0 && !baseRef)
      || (taskI >= 0 && (!taskId || !isValidTaskRef(taskId)))) {
    console.error("verify: exactly one of --staged or --base <ref> is required; --task requires a valid task ID.");
    process.exitCode = 1;
    return;
  }
  const result = runVerify({ mode: staged ? "staged" : "base", baseRef, taskId });
  process.exitCode = result.ok ? 0 : 1;
}

// SC-04: index completeness (HH-024) and ratified-by attestation completeness
// (HH-042/046) are now registry properties — the index table and the log are both
// rendered FROM registry entries (a missing row cannot happen), orphan body files
// are caught by loadGovernanceRegistry, and the AMEND_RATIFIED_BY_EMPTY warning
// comes from the registry's status/attestation fields (validateGovernance).

// HH-075: the dead-config / phase-consistency / step-consistency guards moved to
// the typed-edge registry (tools/lib/edge-model.mjs) with their codes unchanged.

// --- cost-report (R7 / HH-026): structural cost measurement for R7a/R7b/R7e.
// Computes startup + /cycle mandatory read cost, CLI-reachable tooling surface,
// unindexed mandatory-read bulk (>300 lines, no index marker), and large active
// materials. Informational unless its inventory is broken; findings stay at R7. ---
const COST_THRESHOLD = 300;
function lineCount(rel) {
  return readFile(rel).split(/\r?\n/).length;
}

// IMP-05: one reproducible inventory feeds all three structural-cost metrics.
// It deliberately reports reasons and module exclusions; no threshold or gate is
// introduced. A missing mandatory file/local import is an error, never a silent 0.
function hasIndexMarker(rel) {
  const head = readFile(rel).split(/\r?\n/).slice(0, 40);
  return head.some((l) => /索引|目次|\bindex\b|table of contents/i.test(l));
}
function isExcludedBulk(rel) {
  const head = readFile(rel).split(/\r?\n/).slice(0, 20);
  return head.some((l) => /DEPRECATED|HH:ACTIVE-SCAN-ALLOW-FILE/.test(l));
}
// writeBaseline: convergence ベースライン(knowledge.yaml last_always_read_chars / _lines / last_index_read_chars)を更新するか。
// 既定 false = 読み取り専用。/cycle 以外の探索実行がトレンドを消費しないため(TASK-20260715-005)。
function costReport({ writeBaseline = false, fullCycle = false } = {}) {
  const out = [];
  const inventory = buildCostInventory(root, { fullCycle });
  if (!inventory.ok) {
    for (const message of inventory.errors) console.error(`cost-report inventory: ${message}`);
    process.exitCode = 1;
    return;
  }
  // R7a: always-read tier (HH-024 reading order)
  const ALWAYS = inventory.startup.files.map((entry) => entry.path);
  let alwaysTotal = 0;
  out.push("HyperHelix cost-report (R7 / HH-026)\n");
  out.push("R7a 常時必読 tier (起動固定費):");
  // HH-073: lines under-count real reading cost (one long line vs many short ones), so
  // the ratchet gauge is CHARACTERS (last_always_read_chars). Lines stay recorded
  // alongside for trend continuity (HH-073 item 3).
  let alwaysChars = 0;
  for (const entry of inventory.startup.files) {
    alwaysTotal += entry.lines;
    const chars = readFile(entry.path).length;
    alwaysChars += chars;
    out.push(`  ${entry.path}: ${entry.lines} 行 / ${chars} 文字  [include: ${entry.reasons.join(" + ")}]`);
  }
  // R7a trend: read previous baseline, compute diff, write new baseline
  // (SC-05b: counters through the knowledge repository; baseline write is atomic)
  const knowledgeState = loadKnowledge(root);
  if (!knowledgeState.ok) {
    for (const message of knowledgeState.errors) console.error(`cost-report: ${message}`);
    process.exitCode = 1;
    return;
  }
  const prev = knowledgeState.value.counters.last_always_read_lines ?? null;
  const prevChars = knowledgeState.value.counters.last_always_read_chars ?? null;
  const prevIndexChars = knowledgeState.value.counters.last_index_read_chars ?? null;
  const trend = (current, previous) => previous === null ? "baseline 未記録" :
    current - previous > 0 ? `前回比 +${current - previous} ▲` :
    current - previous < 0 ? `前回比 ${current - previous} ▼` : "前回比 ±0 →";
  out.push(`  合計: ${alwaysChars} 文字 [${trend(alwaysChars, prevChars)}] / ${alwaysTotal} 行 [${trend(alwaysTotal, prev)}]`);
  // index-read materials: only the head is read at startup, so the head is measured in
  // the gauge's unit and judged together with the always-read tier (HH-082 A).
  const INDEX_READ = [
    { file: GOVERNANCE_CONTRACT.view, boundary: AMENDMENTS_LIFECYCLE.pendingHeading, upTo: "索引 + digest + 起票ガイド(承認待ち見出しの手前まで)" },
    { file: KNOWLEDGE, boundary: /^notes:/, upTo: "ヘッダ + counters(notes: の手前まで)" },
  ];
  const measureIndexRead = () => {
    const rows = [];
    let chars = 0;
    for (const target of INDEX_READ) {
      if (!fs.existsSync(path.join(root, target.file))) continue;
      const text = readFile(target.file);
      const head = measureReadHead(text, target.boundary);
      if (!head.ok) return { ok: false, error: `${target.file}: index-read boundary not found (${target.upTo})` };
      chars += head.chars;
      const totalLines = text.split(/\r?\n/).length;
      rows.push(`  ${target.file}: 冒頭 ${head.lines} 行 / ${head.chars} 文字 (全 ${totalLines} 行中。${target.upTo})`);
    }
    return { ok: true, rows, chars };
  };
  // Measured BEFORE any baseline write: a missing boundary must abort with nothing written.
  let indexRead = measureIndexRead();
  if (!indexRead.ok) {
    console.error(`cost-report: ${indexRead.error}`);
    process.exitCode = 1;
    return;
  }
  if (writeBaseline) {
    const write = (key, value) => {
      const written = setBaselineCounter(root, key, value);
      if (!written.ok) for (const message of written.errors) console.error(`cost-report: ${message}`);
      return written.ok;
    };
    if (!write("last_always_read_lines", alwaysTotal) || !write("last_always_read_chars", alwaysChars)) {
      process.exitCode = 1;
      return;
    }
    // The baselines live in the knowledge.yaml head, which is itself part of the index-read
    // measurement: writing a value can change its own digit count. Re-measure until the
    // written value equals the measured one (settles in 1-2 passes).
    for (let pass = 0; pass < 4; pass++) {
      indexRead = measureIndexRead();
      if (!indexRead.ok) break;
      const current = loadKnowledge(root);
      if (current.ok && current.value.counters.last_index_read_chars === indexRead.chars) break;
      if (!write("last_index_read_chars", indexRead.chars)) { process.exitCode = 1; return; }
    }
    if (!indexRead.ok) {
      console.error(`cost-report: ${indexRead.error}`);
      process.exitCode = 1;
      return;
    }
  }
  out.push("\n索引読み (冒頭のみ必読):");
  out.push(...indexRead.rows);
  out.push(`  小計: ${indexRead.chars} 文字 [${trend(indexRead.chars, prevIndexChars)}]`);
  const startupChars = alwaysChars + indexRead.chars;
  const prevStartupChars = prevChars === null || prevIndexChars === null ? null : prevChars + prevIndexChars;
  out.push(`\n起動時の実読コスト (常時必読 + 索引読み冒頭): ${startupChars} 文字 [${trend(startupChars, prevStartupChars)}]  (ラチェット判定量・HH-050/073/082)`);
  if (!writeBaseline && (alwaysChars !== prevChars || indexRead.chars !== prevIndexChars || (prev !== null && alwaysTotal !== prev))) {
    // 無音で書かない/無音で捨てない — どちらの状態かを必ず可視化する
    out.push(`  (baseline 常時必読 ${prevChars ?? "未記録"} 文字 / ${prev ?? "未記録"} 行・索引読み ${prevIndexChars ?? "未記録"} 文字 は未更新 — 記録するには --write-baseline を付ける。/cycle 以外の探索実行はトレンドを消費しない)`);
  }
  // IMP-05: /cycle reads the startup tier plus the launcher-mandated checklists,
  // workflows and anti-pattern authority. Every included file carries its reason.
  const cycleMode = inventory.cycle.mode === "delta"
    ? `delta; base=${inventory.cycle.baseRef.slice(0, 12)}`
    : inventory.cycle.mode === "full" ? "full; explicit --full" : `full fallback; ${inventory.cycle.fallbackReason}`;
  out.push(`\nR7a /cycle mandatory read-set (${cycleMode}):`);
  for (const entry of inventory.cycle.files) {
    out.push(`  ${entry.path}: ${entry.lines} 行  [include: ${entry.reasons.join(" + ")}]`);
  }
  out.push(`  合計: ${inventory.cycle.fileCount} files / ${inventory.cycle.lines} 行`);
  // R7b: unindexed mandatory-read bulk
  const MANDATORY = [...ALWAYS, GOVERNANCE_CONTRACT.view, KNOWLEDGE];
  const flags = [];
  for (const f of MANDATORY) {
    if (!fs.existsSync(path.join(root, f)) || isExcludedBulk(f)) continue;
    const n = lineCount(f);
    if (n > COST_THRESHOLD && !hasIndexMarker(f)) flags.push(`  ${f}: ${n} 行  [FLAG: 必読・${COST_THRESHOLD}行超・索引なし]`);
  }
  out.push(`\nR7b 無索引バルク (必読・>${COST_THRESHOLD}行・索引なし):`);
  out.push(flags.length ? flags.join("\n") : "  (なし)");
  // R7e: large active materials (growth visibility, informational)
  const large = [];
  const walk = (rel, exts) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const cr = `${rel}/${ent.name}`;
      if (ent.isDirectory()) walk(cr, exts);
      else if (exts.some((e) => ent.name.endsWith(e)) && lineCount(cr) > COST_THRESHOLD) large.push(`  ${cr}: ${lineCount(cr)} 行`);
    }
  };
  walk("core", [".yaml", ".md"]);
  walk("assets", [".md"]);
  walk("docs", [".md"]);
  for (const f of ["README.md", GOVERNANCE_CONTRACT.view]) if (fs.existsSync(path.join(root, f)) && lineCount(f) > COST_THRESHOLD) large.push(`  ${f}: ${lineCount(f)} 行`);
  out.push(`\nR7e 大型 active 資材 (>${COST_THRESHOLD}行・伸び監視・情報のみ):`);
  out.push(large.length ? large.sort().join("\n") : "  (なし)");
  out.push("\nR7e CLI tooling surface (tools/**/*.mjs):");
  for (const entry of inventory.tooling.files) {
    out.push(`  ${entry.path}: ${entry.lines} 行 / top-level function ${entry.functions}  [include: ${entry.reasons.join(" + ")}]`);
  }
  for (const entry of inventory.tooling.excluded) {
    out.push(`  ${entry.path}  [exclude: ${entry.reason}]`);
  }
  out.push(`  合計(include): ${inventory.tooling.fileCount} files / ${inventory.tooling.lines} 行 / top-level function ${inventory.tooling.functions}`);
  // HH-032: note project distribution (multi-project accumulation visibility)
  const knotes = knowledgeState.value.notes;
  const proj = {};
  for (const n of knotes) { const p = n.project || "shared(absent)"; proj[p] = (proj[p] || 0) + 1; }
  out.push(`\nノート project 分布 (HH-032): ${Object.entries(proj).sort().map(([k, v]) => `${k}:${v}`).join(" / ") || "(なし)"}`);
  console.log(out.join("\n"));
}

// --- bump: one task's counter / strength deltas ---
// node tools/hyperhelix.mjs bump --task ID [--use NOTE-ID,...] [--miss NOTE-ID,...]
//   [--review [--review-source SOURCE]] [--dry-run]
// AP-024: Git Bash rewrites a leading-`/` argument into a Windows path
// (`/cycle` -> `C:/Program Files/Git/cycle`) and the tool used to store it silently
// (measured 4x). A provenance token is never a drive-letter path, so reject it.
function msysMangledReviewSource(value) {
  return typeof value === "string" && /^[A-Za-z]:[\\/]/.test(value);
}

function validReviewSource(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 80
    && !value.startsWith("--") && !/[\r\n\x00-\x1f]/.test(value)
    && !msysMangledReviewSource(value);
}

function reviewSourceHint(value) {
  return msysMangledReviewSource(value)
    ? ` 値 ${value} は Git Bash のパス変換結果です(AP-024)。先頭 / を付けずに渡してください(例: --review-source cycle)。`
    : "";
}

function bump(args) {
  // 事故防止ガード(R4 Finding / TASK-021): --help は説明のみ、--task 無しは
  // カウンタを増やさずエラー終了。bump は task_index を単調増加させる操作(HH-057: high-water
  // 意味論・ブランチ毎に +1)のため、誤起動(`bump --help` 等)で黙って +1 されると検出困難。
  if (args.includes("--help") || args.includes("-h")) {
    help();
    return;
  }
  const taskI = args.indexOf("--task");
  const taskId = taskI !== -1 && taskI + 1 < args.length ? args[taskI + 1] : null;
  if (!taskId || !isValidTaskRef(taskId)) {
    console.error("bump: --taskにはlegacy・branch-scoped・GH-<n> のいずれかの task IDが必須です(不正な場合task_indexは増やしません)。");
    process.exitCode = 1;
    return;
  }
  const dryRun = args.includes("--dry-run");
  const review = args.includes("--review");
  const reviewSourceI = args.indexOf("--review-source");
  const reviewSourceArg = reviewSourceI !== -1 && reviewSourceI + 1 < args.length
    ? args[reviewSourceI + 1] : null;
  if (reviewSourceI !== -1 && (!review || !validReviewSource(reviewSourceArg))) {
    console.error("bump: --review-source は値を伴い、--review と同時に指定してください。" + reviewSourceHint(reviewSourceArg));
    process.exitCode = 1;
    return;
  }
  const reviewSource = review ? (reviewSourceArg || "framework review") : null;
  // 繰り返し指定を許す: `--use A --use B` は `--use A,B` と同義。indexOf 単発だと
  // 2つ目以降が無言で捨てられ、NOTE_ATTRIBUTION が事後に拾うまで気づけない
  // (/cycle TASK-Project003z2dlabz2dh-20260831-001 実測)。
  const listArg = (flag) => {
    const out = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] !== flag || i + 1 >= args.length) continue;
      out.push(...args[i + 1].split(",").map((s) => s.trim()).filter(Boolean));
    }
    return out;
  };
  const uses = listArg("--use");
  const misses = listArg("--miss");
  const log = [];

  // 冪等性ガード(Codex 高所見 / 改善アイデア.md「bump の冪等化」): bump は
  // task_index を単調増加させる不可逆操作(HH-057 high-water)。finish が不可逆ゾーンで
  // 中断→再実行されると二重加算しうる。SC-05b: 判定は counters.last_bump_task
  // (構造化 field)— 旧 `# +1 <taskId>` comment 読みは撤去。
  // TASK-20260706-008: ガード時も --use/--miss は適用する(後追い帰属)。後追いできるのは
  // 直近 bump タスクのみ(それより古い taskId は field 不一致で新規 bump 扱い)。
  const plan = planBump(root, { taskId, uses, misses, review });
  if (!plan.ok) {
    for (const message of plan.errors) console.error(`bump: ${message}`);
    process.exitCode = 1;
    return;
  }
  const { alreadyBumped, from: taskIdx, to: newTaskIndex, writes } = plan.value;
  if (alreadyBumped && uses.length === 0 && misses.length === 0 && !review) {
    console.log(`task_index は既に ${taskId} で bump 済み(冪等性ガード)。変更しません。`);
    return;
  }
  log.push(...plan.value.log);
  if (review) log.push(`last_framework_review -> ${newTaskIndex} (${reviewSource})`);

  console.log(log.join("\n"));

  // HH-081 stage 4: D7 lives in the commit itself (counters diff + hh-record); there is
  // no task file to update. The flag stays accepted so older procedures do not break.
  if (args.includes("--update-brief")) console.warn("[bump] --update-brief は廃止(HH-081 段階4 — 作業記録はコミット本文の hh-record)。無視して続行します。");

  if (dryRun) {
    console.log(`\n[dry-run] counter ledger: ${plan.value.counterChanged ? KNOWLEDGE : "(unchanged)"}; note ledger(s): ${plan.value.changedNoteFiles.join(", ") || "(unchanged)"}; no files changed.`);
    return;
  }
  // SC-05b: all ledger writes go through the repository's atomic commit
  // (validate post-state -> same-dir temp -> fsync -> fixed-order rename).
  const committed = commitKnowledgeWrites(root, writes);
  if (!committed.ok) {
    for (const message of committed.errors) console.error(`bump: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nUpdated ${committed.written.join(", ") || "no ledger files"}. Run 'validate' before commit.`);
}

// --- secret scan (constitution security axiom / HH-019), node port of the
// git-conventions grep heuristic. Scans ADDED lines in `git diff HEAD`. ---
const SECRET_RES = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /AKIA[0-9A-Z]{16}/,
  /\bsk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(api[_-]?key|secret|token|password|passwd|service_role|client_secret)["':= ]+[A-Za-z0-9/_+.-]{16,}/i,
];

function secretHitsFromText(text, source, addedLinesOnly = false) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (addedLinesOnly) {
      if (!line.startsWith("+") || line.startsWith("+++")) continue;
    }
    const body = addedLinesOnly ? line.slice(1) : line;
    if (SECRET_RES.some((re) => re.test(body))) {
      hits.push(`${source}:${i + 1}: ${body.trim().slice(0, 80)}`);
    }
  }
  return hits;
}

function isGitTracked(file) {
  try {
    git(["ls-files", "--error-unmatch", "--", file], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function collectReadableFiles(rel) {
  const abs = path.join(root, rel);
  // Staged deletion: nothing on disk to scan. The removal itself is already covered by
  // the `git diff HEAD` pass in secretScan.
  if (!fs.existsSync(abs)) return [];
  const st = fs.statSync(abs);
  if (st.isFile()) return [rel];
  if (!st.isDirectory()) return [];
  const out = [];
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = `${rel.replace(/\\/g, "/")}/${ent.name}`;
    out.push(...collectReadableFiles(child));
  }
  return out;
}

// A path staged as a DELETION has no file on disk but is a legitimate --path entry:
// `archive-briefs` git-rm's the archived records, and refusing them forced the caller
// onto a manual bump+commit route that skips L3 entirely (measured twice, 2026-08-23).
function stagedDeletions() {
  try {
    return new Set(
      git(["diff", "--cached", "--name-only", "--diff-filter=D"], { encoding: "utf8" })
        .split(/\r?\n/).filter(Boolean).map((file) => file.replaceAll("\\", "/")),
    );
  } catch {
    return new Set();
  }
}

function normalizeStagePaths(paths) {
  const normalized = [];
  const rootAbs = path.resolve(root);
  const deleted = stagedDeletions();
  for (const raw of paths) {
    const rel = String(raw ?? "").trim();
    if (!rel) return { ok: false, reason: "empty --path entry" };
    const abs = path.resolve(root, rel);
    if (abs !== rootAbs && !abs.startsWith(`${rootAbs}${path.sep}`)) {
      return { ok: false, reason: `path escapes workspace: ${rel}` };
    }
    const relFromRoot = path.relative(rootAbs, abs).replace(/\\/g, "/") || ".";
    if (!fs.existsSync(abs) && !deleted.has(relFromRoot)) {
      return { ok: false, reason: `path does not exist and is not a staged deletion: ${rel}` };
    }
    normalized.push(relFromRoot);
  }
  return { ok: true, paths: normalized };
}

function secretScan(paths = []) {
  let diff = "";
  try {
    diff = git(["diff", "HEAD"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return { ok: false, reason: "git diff failed (not a repo or git unavailable)" };
  }
  const hits = secretHitsFromText(diff, "git diff HEAD", true);
  let readableFiles = [];
  try {
    readableFiles = paths.flatMap((p) => collectReadableFiles(p));
  } catch (err) {
    return { ok: false, reason: err.message };
  }
  for (const file of readableFiles) {
    if (isGitTracked(file)) continue;
    try {
      const text = readFile(file);
      hits.push(...secretHitsFromText(text, file, false));
    } catch {
      return { ok: false, reason: `cannot read untracked path for secret scan: ${file}` };
    }
  }
  return { ok: hits.length === 0, hits };
}

// --- finish (改善アイデア.md 案6): compose preflight validate/secret-scan ->
// [irreversible] idempotent bump+brief -> final validate/secret-scan -> commit.
// Fail-closed: any abortable check fails before bump; final checks fail before commit.
// HH-045 (2): finish must stage every ledger file a bump may have touched —
// modified/untracked leaves plus the source files of --use/--miss note ids.
function changedKnowledgeLeafFiles() {
  if (!fs.existsSync(path.join(root, KNOWLEDGE_DIR))) return [];
  try {
    // HH:ARCH-ALLOW reason="read-only git enumeration of changed ledger paths for staging (no content parse)"
    return git(["status", "--porcelain", "--untracked-files=all", "--", KNOWLEDGE_DIR], { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
      .filter((file) => /^core\/knowledge\/[^/]+\.yaml$/.test(file) && fs.existsSync(path.join(root, file)))
      .sort();
  } catch {
    return [];
  }
}

// bump の listArg と同じく繰り返し指定を受ける。片方だけ単発読みにすると
// 「note は両方に適用されるがロックする ledger file は1つ目だけ」という
// declare↔consume のズレになる(AP-003)。
function attributedNoteIds(args) {
  return ["--use", "--miss"].flatMap((flag) => {
    const collected = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] !== flag || i + 1 >= args.length) continue;
      collected.push(...args[i + 1].split(",").map((id) => id.trim()).filter(Boolean));
    }
    return collected;
  });
}

function noteLedgerFilesForBump(args) {
  const ids = attributedNoteIds(args);
  if (!ids.length) return [];
  // SC-05b: finish's pathspec derivation reads through the knowledge repository.
  const loaded = loadKnowledge(root);
  if (!loaded.ok) return [];
  const byId = new Map(loaded.value.notes.map((note) => [note.id, note]));
  return ids.map((id) => byId.get(id)?.sourceFile).filter((file) => file && file !== KNOWLEDGE);
}

function finish(args) {
  if (args.includes("--help") || args.includes("-h")) { help(); return; }
  const taskI = args.indexOf("--task");
  const taskId = taskI !== -1 && taskI + 1 < args.length ? args[taskI + 1] : null;
  if (!taskId || !isValidTaskRef(taskId)) {
    console.error("finish: --taskにはlegacy・branch-scoped・GH-<n> のいずれかの task IDが必須です。");
    process.exitCode = 1;
    return;
  }
  const doCommit = args.includes("--commit");
  const finishReview = args.includes("--review");
  const finishReviewSource = sliceFlag(args, "--review-source");
  const finishReviewSourceValue = finishReviewSource[1] || null;
  if (args.includes("--review-source") && (!finishReview || !validReviewSource(finishReviewSourceValue))) {
    console.error("finish: --review-source は値を伴い、--review と同時に指定してください。不可逆操作前に中断します。" + reviewSourceHint(finishReviewSourceValue));
    process.exitCode = 1;
    return;
  }
  // --- session-claim ownership gate (AP-016 mechanical guard) ---------------
  const sidValue = sliceFlag(args, "--sid")[1] || null;
  {
    const claimPath = claimSidecarPath(taskId);
    if (fs.existsSync(claimPath)) {
      const claimValue = fs.readFileSync(claimPath, "utf8").trim();
      if (!sidValue) {
        console.error("finish: この record は claim token 付きで claim されています。brief が出力した token を --sid で渡してください(所有権照合 — 別セッションの record を finish する事故を防ぐ。concurrency.md §2 / AP-016)。不可逆操作前に中断します。");
        process.exitCode = 1;
        return;
      }
      if (sidValue !== claimValue) {
        console.error("finish: claim token 不一致 — この record は別セッションが claim しています(AP-016)。自分のタスクは brief で別 ID を claim し直し、この record には触れないこと。不可逆操作前に中断します。");
        process.exitCode = 1;
        return;
      }
    } else if (sidValue) {
      console.warn("[finish] claim sidecar が存在しないため --sid は照合できません(guard 導入前の record・別ツリー起源・掃除済みのいずれか)。続行します。");
    } else {
      console.warn("[finish] claim sidecar なし — 所有権は未照合(guard 導入前の record か別ツリー起源)。並行セッション下では brief からの claim を推奨(AP-016)。");
    }
  }
  const msgI = args.indexOf("--message");
  const message = msgI !== -1 && msgI + 1 < args.length ? args[msgI + 1] : null;
  const pathI = args.indexOf("--path");
  const extraPaths = pathI !== -1 && pathI + 1 < args.length
    ? args[pathI + 1].split(",").map((s) => s.trim()).filter(Boolean) : [];

  const ledgerStagePaths = [...new Set([KNOWLEDGE, ...changedKnowledgeLeafFiles(), ...noteLedgerFilesForBump(args)])];
  const stagePathCheck = normalizeStagePaths([...ledgerStagePaths, ...extraPaths]);
  if (!stagePathCheck.ok) {
    console.error(`finish: ${stagePathCheck.reason}。不可逆操作前に中断します(fail-closed)。`);
    process.exitCode = 1;
    return;
  }
  const stagePaths = stagePathCheck.paths;

  // HH-081: the hh-record in --message IS the task record (L4 evidence). It is required,
  // must name this task, and is validated against the paths this commit will carry —
  // all BEFORE anything irreversible.
  if (!message) {
    console.error(`finish: --message に hh-record ブロックを含むコミットメッセージが必須です(HH-081 — git-conventions『Commit-body record』)。不可逆操作前に中断します。`);
    process.exitCode = 1;
    return;
  }
  let staged = [];
  try { staged = git(["diff", "--cached", "--name-only"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean); } catch {}
  const commitPaths = [...new Set([...staged, ...stagePaths].map((file) => file.replaceAll("\\", "/")))];
  const recordCheck = commitRecordErrors(message, { changedPaths: commitPaths, noteIds: currentNoteIds(), depthModes: currentDepthModes(), source: "--message" });
  const recordErrors = [...recordCheck.errors];
  if (!recordCheck.present) recordErrors.push("--message: hh-record ブロックがありません");
  const commitRecord = recordCheck.record ?? null;
  if (commitRecord && commitRecord.task_id !== taskId) recordErrors.push(`--message: hh-record の task_id (${commitRecord.task_id}) が --task ${taskId} と一致しません`);
  // Former NOTE_ATTRIBUTION (HH-053): every applied note is attributed at THIS D7.
  if (commitRecord) {
    const unattributed = unattributedAppliedNotes(commitRecord, new Set(attributedNoteIds(args)));
    if (unattributed.length) recordErrors.push(`--message: notes.applied の ${unattributed.join(", ")} が --use/--miss で帰属されていません(HH-053)`);
    const gap = distillCaptureGap(commitRecord, commitPaths);
    if (gap) console.warn(`[finish] DISTILL_CAPTURE: ${gap}`);
  }
  if (recordErrors.length) {
    for (const error of recordErrors) console.error(`finish: ${error}`);
    console.error("finish: コミット本文の hh-record が不正です。不可逆操作前に中断します(fail-closed)。");
    process.exitCode = 1;
    return;
  }

  // TASK-20260705-004 (/cycle): warn when a Distill-born framework material is dirty
  // but unstaged. finish stages ledger files + brief + --path extras, so a D6
  // anti-pattern (AP-NNN) or a D2b process-backlog line added IN THIS TASK would commit
  // separately (observed TASK-20260705-003 → orphan follow-up commit). Non-blocking:
  // the fix is to pass --path; this only surfaces the omission (tool enhancement, no
  // phase/gate/axiom change → not amendment-class).
  const D6_MATERIALS = ["assets/ai/anti-patterns.md", "docs/process-backlog.md"];
  try {
    const st = git(["status", "--porcelain", "--", ...D6_MATERIALS], { encoding: "utf8" });
    const dirtyUnstaged = st.split("\n").map((l) => l.slice(3).trim()).filter(Boolean)
      .filter((f) => !stagePaths.includes(f));
    if (dirtyUnstaged.length) {
      console.warn(`[finish] 注意: 未ステージの Distill 資材(finish は既定で拾わない): ${dirtyUnstaged.join(" ")}`);
      console.warn(`         このタスクで D6/D2b 追記した場合は --path ${dirtyUnstaged.join(",")} を付けて同一コミットに含めること。`);
    }
  } catch { /* status 取得不能は非致命 */ }

  // --- abortable zone -------------------------------------------------------
  let receiptInput = null;
  try {
    receiptInput = captureVerificationInput(taskId);
  } catch (err) {
    console.warn(`[finish] verification receipt unavailable before full verify: ${err.message}; post-bump L3 will run in full.`);
  }
  console.log("[finish] 1/3 verify --staged ...");
  const verification = runVerify({ mode: "staged", additionalPaths: stagePaths, taskId, commitRecord });
  if (!verification.ok) {
    for (const layer of verification.layers.filter((item) => !item.ok)) {
      for (const message of layer.errors) console.error(`finish: [${layer.name}] ${message}`);
    }
    console.error("\nfinish: layered verify failed. 不可逆操作前に中断します(fail-closed)。");
    process.exitCode = 1;
    return;
  }
  console.log("[finish] 2/3 secret scan (git diff HEAD + untracked stage paths) ...");
  const scan = secretScan(stagePaths);
  if (!scan.ok) {
    if (scan.hits) {
      console.error("finish: 秘密の疑い(HH-019)。コミットせず中断します:");
      for (const h of scan.hits) console.error(`  + ${h}`);
    } else {
      console.error(`finish: 秘密スキャン不能 — ${scan.reason}。中断します(not_skippable)。`);
    }
    process.exitCode = 1;
    return;
  }
  let verifiedReceipt = null;
  if (receiptInput) {
    try {
      const attestation = attestVerificationReceipt(receiptInput, captureVerificationInput(taskId));
      if (attestation.ok) verifiedReceipt = attestation.receipt;
      else console.warn(`[finish] verification receipt not issued: ${attestation.reasons.join("; ")}; post-bump L3 will run in full.`);
    } catch (err) {
      console.warn(`[finish] verification receipt capture failed: ${err.message}; post-bump L3 will run in full.`);
    }
  }

  if (!doCommit) {
    console.log("\n[finish] pre-flight 通過(L1-L4 verify clean / secret clean)。--commit 未指定のため下書きのみ:");
    console.log(`  staged paths (予定): ${stagePaths.join(" ")}`);
    console.log("  commit message: --message の内容(hh-record 検査済み)");
    console.log("  ※ 実行するには同じ引数に --commit を付けて呼ぶ。bump は冪等。");
    return;
  }

  // --- irreversible zone (only after all abortable checks passed) -----------
  console.log("[finish] 3/3 bump (idempotent) + final checks + commit ...");
  bump(["--task", taskId, ...sliceFlag(args, "--use"), ...sliceFlag(args, "--miss"),
    ...(finishReview ? ["--review", ...finishReviewSource] : [])]);
  const bumpAllowlist = [...new Set(ledgerStagePaths.map((file) => file.replaceAll("\\", "/")))];
  let behaviorReceipt = { ok: false, reasons: ["verified receipt unavailable"] };
  if (verifiedReceipt) {
    try {
      behaviorReceipt = assessVerificationReuse({
        receipt: verifiedReceipt,
        current: captureVerificationInput(taskId),
        allowedChangedPaths: bumpAllowlist,
      });
    } catch (err) {
      behaviorReceipt = { ok: false, reasons: [`post-bump receipt capture failed: ${err.message}`] };
    }
  }
  if (behaviorReceipt.ok) {
    console.log(`[finish] post-bump behavior input unchanged; L3 receipt reuse (${behaviorReceipt.changedPaths.join(", ") || "no content delta"}).`);
  } else {
    console.warn(`[finish] post-bump L3 full fallback: ${behaviorReceipt.reasons.join("; ")}`);
  }
  const finalVerification = runVerify({
    mode: "staged",
    additionalPaths: stagePaths,
    taskId,
    commitRecord,
    runBehavior: !behaviorReceipt.ok,
    behaviorReceipt,
  });
  if (!finalVerification.ok) {
    console.error("\nfinish: bump 後の layered verify にエラー。commit せず中断します。bump は冪等です。");
    process.exitCode = 1;
    return;
  }
  const finalScan = secretScan(stagePaths);
  if (!finalScan.ok) {
    if (finalScan.hits) {
      console.error("finish: bump 後の秘密スキャンで疑い。commit せず中断します:");
      for (const h of finalScan.hits) console.error(`  + ${h}`);
    } else {
      console.error(`finish: bump 後の秘密スキャン不能 — ${finalScan.reason}。commit せず中断します。`);
    }
    process.exitCode = 1;
    return;
  }
  try {
    // A path already staged as a deletion is not in the worktree, so `git add` would
    // fail with "pathspec did not match any files". It is already in the index — skip it.
    const alreadyDeleted = stagedDeletions();
    const toAdd = stagePaths.filter((p) => !alreadyDeleted.has(p));
    if (toAdd.length) git(["add", "--", ...toAdd], { stdio: "inherit" });
    git(["commit", "-F", "-"], { input: message, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });
  } catch {
    console.error("finish: git add/commit に失敗。bump は適用済み(冪等)。手動でステージ・コミットしてください。");
    process.exitCode = 1;
    return;
  }
  try { fs.rmSync(claimSidecarPath(taskId), { force: true }); } catch { /* non-fatal cleanup */ }
  console.log("[finish] 完了。");
}

// finish -> bump への転送。繰り返し指定を保存する(単発 slice だと
// `finish --use A --use B` が B を無言で落とす。AP-003 同型)。
function sliceFlag(args, flag) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== flag || i + 1 >= args.length) continue;
    out.push(flag, args[i + 1]);
  }
  return out;
}

// Task ids already used by a commit subject on ANY ref. Unmerged local branches and other
// worktrees share this repository's refs, so their ids are visible here even when HEAD's
// own history does not contain them (AP-016, 5th incident 2026-10-02: two worktrees both
// claimed -020/-021 because the scan read HEAD only).
function committedTaskIdsAllRefs() {
  try {
    return new Set(extractTaskIds(git(["log", "--all", "--format=%s"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })));
  } catch {
    return new Set(); // not a git repo / no history
  }
}

function brief(args) {
  if (args.includes("--help") || args.includes("-h")) { help(); return; }
  const flag = (name) => {
    const i = args.indexOf(name);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  };
  const mode = flag("--mode") || "standard";
  // SC-02: the depth-mode vocabulary's single authority is core/loop.yaml
  // depth_modes (via the core-model repository) — no duplicated JS literal.
  const loopModel = loadLoop();
  if (!loopModel.ok) {
    for (const message of loopModel.errors) console.error(`brief: ${message}`);
    process.exitCode = 1;
    return;
  }
  const validModes = new Set(depthModeNames(loopModel.value));
  if (!validModes.has(mode)) {
    console.error(`brief: 不正な --mode '${mode}'。`);
    console.error(`usage: brief (--task TASK-ID | --date YYYYMMDD) --mode ${[...validModes].join("|")} [--title TITLE] [--project PROJECT]`);
    process.exitCode = 1;
    return;
  }
  let taskId = flag("--task");
  const date = flag("--date"); // YYYYMMDD, used to claim next NNN when --task absent
  if (!taskId) {
    if (!/^\d{8}$/.test(date || "")) {
      console.error("brief: --task <task-id> か --date YYYYMMDD のどちらかが必須です。");
      process.exitCode = 1;
      return;
    }
    // TASK-main-20260821-001: a session that spans days can reuse an earlier --date and
    // stamp a wrong provenance date into a PERMANENT task id (HH-076 was ratified
    // 2026-08-11 but filed under a 20260728 id; ids cannot be renamed, HH-065).
    // WARN only — back-dating yesterday's work is legitimate; the tolerance keeps that quiet.
    const driftDays = briefDateDriftDays(date);
    if (driftDays !== null && Math.abs(driftDays) >= BRIEF_DATE_DRIFT_TOLERANCE_DAYS) {
      console.error(`brief: WARNING --date ${date} is ${driftDays} day(s) behind today (${todayStamp()}) — a permanent task id records this date and cannot be renamed. Use --date ${todayStamp()} unless the back-date is intentional.`);
    }
    let slug;
    try { slug = currentBranchNamespace(); }
    catch {
      console.error("brief: current git branchを解決できずtask namespaceを生成できません。");
      process.exitCode = 1;
      return;
    }
    const encodedSlug = encodeBranchSlug(slug);
    // Claim next free serial inside the branch+date namespace. Live records,
    // briefs and commit subjects all count, including archived/micro tasks.
    let max = 0;
    const dir = path.join(root, "tasks");
    if (fs.existsSync(dir)) {
      for (const name of fs.readdirSync(dir)) {
        const parsed = name.endsWith(".md") ? parseTaskId(name.slice(0, -3)) : null;
        if (parsed?.kind === "permanent" && parsed.encodedSlug === encodedSlug && parsed.date === date) {
          max = Math.max(max, parsed.serial);
        }
      }
    }
    // HH-081: a task leaves no tasks/ file until it commits —
    // its claim sidecar is the only trace, so live claims burn ids too.
    const claimsDir = path.dirname(claimSidecarPath("x"));
    if (fs.existsSync(claimsDir)) {
      for (const name of fs.readdirSync(claimsDir)) {
        const parsed = name.endsWith(".sid") ? parseTaskId(name.slice(0, -4)) : null;
        if (parsed?.kind === "permanent" && parsed.encodedSlug === encodedSlug && parsed.date === date) {
          max = Math.max(max, parsed.serial);
        }
      }
    }
    for (const id of committedTaskIdsAllRefs()) {
      const parsed = parseTaskId(id);
      if (parsed?.kind === "permanent" && parsed.encodedSlug === encodedSlug && parsed.date === date) {
        max = Math.max(max, parsed.serial);
      }
    }
    // Host-repo commit subjects also burn ids (AP-016, 4th incident 2026-08-24:
    // a parallel session used -023/-025 in HOST commits before creating the
    // records; this scan saw neither and re-allocated them). In the nested
    // layout the host repo's log is one directory up.
    try {
      const hostTop = detectNestedHostRoot(); // null when not nested; git's stderr stays quiet
      if (hostTop) {
        const hostLog = execFileSync("git", ["-C", hostTop, "log", "--format=%s"], { encoding: "utf8" });
        for (const id of extractTaskIds(hostLog)) {
          const parsed = parseTaskId(id);
          if (parsed?.kind === "permanent" && parsed.encodedSlug === encodedSlug && parsed.date === date) {
            max = Math.max(max, parsed.serial);
          }
        }
      }
    } catch { /* no host repo — framework sources alone */ }
    taskId = formatTaskId({ slug, date, serial: max + 1 });
  } else if (committedTaskIdsAllRefs().has(taskId)) {
    // An explicit id is only checked against this worktree's claim sidecars, which other
    // worktrees and unmerged branches do not share — the commit subjects on all refs do.
    console.error(`brief: ${taskId} は既にコミットで使われています(このブランチの履歴に無くても、未 merge のブランチや別ワークツリーのコミットを含む全 ref を検査)。別 ID で再実行すること(AP-016)。`);
    process.exitCode = 1;
    return;
  }
  // HH-081 stage 4: every task is a commit-record task (--commit-record is accepted as a no-op).
  briefCommitRecord(taskId, mode, args.includes("--dry-run"));
}


function printIssues(issues) {
  for (const issue of issues) {
    const where = issue.line ? `:${issue.line}` : "";
    console.log(`${issue.level.toUpperCase()} ${issue.code}${where} ${issue.message}`);
  }
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warn").length;
  const infos = issues.filter((i) => i.level === "info").length;
  // info never affects exit code (改善アイデア.md 案3 point 5 / AP-003: wire the
  // consumer when declaring the level). It is reported but not counted as a gate.
  const infoSuffix = infos ? `, ${infos} info` : "";
  console.log(`\n${errors} error(s), ${warnings} warning(s)${infoSuffix}.`);
  return errors;
}

// --- HH-060 Phase 2 / HH-069 / HH-070: validated outbound changes never push directly to main.
// sync/reflux publish a deterministic remote branch and open a PR. Non-governance
// PRs wait for checks and may self-merge; governed paths wait for the same checks,
// then stop for human manual merge. HH-070 requires no branch protection: this
// ordering is tool-enforced and the remaining human prohibitions are honor-based.
// gh is invoked with an argv array (shell=false), and its readiness
// is checked before the first push so a missing/unauthed client cannot strand a
// branch without a PR. ---
function inlineTestGh(args, options) {
  fs.appendFileSync(process.env.HH_TEST_GH_LOG, `${args.join(" ")}\n`, "utf8");
  const fails = (message) => {
    const err = new Error(message);
    err.status = 1;
    throw err;
  };
  if (args[0] === "auth" && args[1] === "status" && process.env.HH_TEST_GH_FAIL_AUTH === "1") {
    fails("fake gh auth failure");
  }
  if (args[0] === "pr" && args[1] === "checks" && process.env.HH_TEST_GH_FAIL_CHECKS === "1") {
    fails("fake gh checks failure");
  }
  let output = "";
  if (args[0] === "api" && args[1] === "user") output = `${process.env.HH_TEST_GH_LOGIN || "hyperhelix-bot"}\n`;
  if (args[0] === "pr" && args[1] === "list" && process.env.HH_TEST_GH_EXISTING_PR) {
    output = `${process.env.HH_TEST_GH_EXISTING_PR}\n`;
  }
  if (args[0] === "pr" && args[1] === "create") output = "https://example.invalid/hyperhelix/pull/1\n";
  return options.encoding ? output : Buffer.from(output);
}

function gh(args, options = {}) {
  if (process.env.NODE_ENV === "test" && process.env.HH_TEST_GH_INLINE === "1") {
    return inlineTestGh(args, options);
  }
  const testWrapper = process.env.NODE_ENV === "test" ? process.env.HH_TEST_GH_WRAPPER : "";
  return execFileSync(testWrapper ? process.execPath : "gh", testWrapper ? [testWrapper, ...args] : args, {
    cwd: root,
    ...options,
  });
}

function ensureGhReady(command) {
  try {
    gh(["--version"], { stdio: "ignore" });
    gh(["auth", "status"], { stdio: "ignore", env: { ...process.env, GH_PROMPT_DISABLED: "1" } });
    const login = gh(["api", "user", "--jq", ".login"], {
      encoding: "utf8", env: { ...process.env, GH_PROMPT_DISABLED: "1" },
    }).trim();
    if (!login) throw new Error("empty GitHub login");
    return login;
  } catch {
    console.error(`${command}: GitHub CLI が未導入または未認証。push 前に \`gh auth status\` を通してください。`);
    process.exitCode = 1;
    return null;
  }
}

function prBranchName(kind, sourceBranch, head = "HEAD") {
  const short = git(["rev-parse", "--short=9", head], { encoding: "utf8" }).trim();
  return `hyperhelix/${kind}-${prSafeSegment(sourceBranch)}-${short}`;
}

function changedPaths(base, head = "HEAD") {
  const text = git(["diff", "--name-only", `${base}...${head}`], { encoding: "utf8" }).trim();
  return text ? text.split(/\r?\n/).filter(Boolean) : [];
}

function findOpenPullRequest(branch) {
  try {
    return gh([
      "pr", "list", "--base", "main", "--head", branch, "--state", "open",
      "--json", "url", "--jq", ".[0].url",
    ], { encoding: "utf8", env: { ...process.env, GH_PROMPT_DISABLED: "1" } }).trim();
  } catch {
    console.error(`PR lookup failed for ${branch}`);
    process.exitCode = 1;
    return null;
  }
}

function createPullRequest(branch, title, body) {
  const existing = findOpenPullRequest(branch);
  if (existing === null) return null;
  if (existing) return existing;
  try {
    return gh([
      "pr", "create", "--base", "main", "--head", branch,
      "--title", title, "--body", body,
    ], { encoding: "utf8", env: { ...process.env, GH_PROMPT_DISABLED: "1" } }).trim();
  } catch {
    console.error(`PR create failed for ${branch}. remote branch は保持されています。`);
    process.exitCode = 1;
    return null;
  }
}

function waitPullRequestChecks(command, url) {
  try {
    gh(["pr", "checks", url, "--watch", "--interval", "10"], {
      stdio: "inherit", env: { ...process.env, GH_PROMPT_DISABLED: "1" },
    });
    return true;
  } catch {
    console.error(`${command}: PR checks に失敗。PR は保持されています: ${url}`);
    process.exitCode = 1;
    return false;
  }
}

function outboundValidationErrors() {
  if (process.env.NODE_ENV === "test" && process.env.HH_TEST_ASSUME_VALID_FRAMEWORK === "1") return [];
  return validate().filter((issue) => issue.level === "error");
}

function finishPullRequest(command, url, governed) {
  console.log(`${command}: PR ${url}`);
  const disposition = pullRequestDisposition({
    checksPassed: waitPullRequestChecks(command, url),
    governedPaths: governed,
  });
  if (disposition === "failed") return "failed";
  if (disposition === "awaiting-human") {
    console.log(`${command}: 人間手動merge待ち(統治対象: ${governed.join(", ")})。CODEOWNER Approveは要求せず、自動mergeもしません。`);
    console.log("  GitHub 上で差分とCI checks成功を確認し、merge commit方式で手動mergeしてください。--admin bypassは使用しません。");
    return "awaiting-human";
  }
  try {
    gh(["pr", "merge", url, "--merge", "--delete-branch"], {
      stdio: "inherit", env: { ...process.env, GH_PROMPT_DISABLED: "1" },
    });
    console.log(`${command}: CI checks 通過後に自己merge済み: ${url}`);
    return "merged";
  } catch {
    console.error(`${command}: PR merge に失敗。PR は保持されています: ${url}`);
    process.exitCode = 1;
    return "failed";
  }
}

function publishPullRequest({ command, branch, title, body, governed, pushHead = "HEAD" }) {
  try {
    git(["push", "-u", "origin", `${pushHead}:refs/heads/${branch}`]);
  } catch {
    console.error(`${command}: PR branch push 拒否。origin/main へは何も push していません。`);
    process.exitCode = 1;
    return "failed";
  }
  const url = createPullRequest(branch, title, body);
  if (!url) return "failed";
  return finishPullRequest(command, url, governed);
}

// --- sync (TASK-20260620-016, HH-034; HH-060 Phase 2 / HH-069 / HH-070): automated B->A
// framework sync with origin/main as the hub. Inbound is ff-only. Outbound is
// validate -> PR branch -> checks -> merge/human handoff; never direct-main push. ---
function sync(args) {
  const dry = args.includes("--dry-run");
  const out = [];
  // BRANCH GUARD (TASK-20260715-007): sync は main 上の local<->origin 同期専用。
  // project/variant 上で走らせると ahead 全体をPR候補にし、project スコープの
  // ブリーフごと main へ流し込む(refluxのframework-only分類を迂回)。
  // project からの還元は reflux(framework-only へ絞る)を使う。fail-closed。
  let branch = "";
  try { branch = git(["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
  if (branch && branch !== "main") {
    console.error(`sync: 現在のブランチは '${branch}' — sync は main 上の local↔origin 同期専用です。`);
    console.error(`  project/variant からの還元は framework-only へ絞る必要があります:`);
    console.error(`    node tools/hyperhelix.mjs reflux            # 候補を確認`);
    console.error(`    node tools/hyperhelix.mjs reflux --apply    # 還元`);
    console.error(`  (sync をこのまま走らせると ahead 全体がPR候補になり、project ブリーフが main へ混入します)`);
    process.exitCode = 1;
    return;
  }
  try { git(["fetch", "origin"]); } catch { console.error("sync: git fetch origin に失敗。"); process.exitCode = 1; return; }
  let counts;
  try { counts = git(["rev-list", "--left-right", "--count", "origin/main...HEAD"], { encoding: "utf8" }).trim(); }
  catch { console.error("sync: origin/main を解決できない(リモート設定/ブランチを確認)。"); process.exitCode = 1; return; }
  const [behind, ahead] = counts.split(/\s+/).map(Number);
  out.push(`fetch 完了。origin/main 比 ahead=${ahead} behind=${behind}`);
  if (behind > 0) {
    if (dry) out.push(`[dry] origin/main を ff-merge(${behind} コミット取り込み)`);
    else {
      try { git(["merge", "--ff-only", "origin/main"]); out.push(`B: origin/main を ${behind} コミット ff 取り込み`); }
      catch {
        console.log(out.join("\n"));
        console.error("sync: ローカル main と origin/main が分岐(ff 不可)。assets/workflows/sync-conflict-guide.md で手動 reconcile してから再実行。push は中止。");
        process.exitCode = 1; return;
      }
    }
  }
  const errs = outboundValidationErrors();
  if (errs.length) {
    console.log(out.join("\n"));
    console.error(`sync: validate に ${errs.length} error。push を中止(解消して再実行)。`);
    for (const e of errs) console.error(`  ${e.code}: ${e.message}`);
    process.exitCode = 1; return;
  }
  out.push("validate: 0 error");
  let aheadNow = 0;
  try { aheadNow = Number(git(["rev-list", "--count", "origin/main..HEAD"], { encoding: "utf8" }).trim()); } catch {}
  if (aheadNow > 0) {
    const prBranch = prBranchName("sync", branch || "main");
    const governed = governancePaths(changedPaths("origin/main"));
    if (dry) {
      out.push(`[dry] ${aheadNow} コミットを ${prBranch} へ push → PR create`);
      out.push(governed.length
        ? `[dry] 統治対象あり(${governed.join(", ")}) → CI checks後に人間手動merge待ち(CODEOWNER Approve不要)`
        : "[dry] CODEOWNERS対象なし → CI checks後に自己merge");
    } else {
      if (!publisherReady(ensureGhReady("sync"))) { console.log(out.join("\n")); return; }
      console.log(out.join("\n"));
      const state = publishPullRequest({
        command: "sync",
        branch: prBranch,
        title: `SYNC: main framework sync (${aheadNow} commits)`,
        body: `HyperHelix /sync generated this PR after validate passed.\n\nSource: main\nCommits: ${aheadNow}\nDirect pushes to main are forbidden by the HH-060/069/070 honor-based tool contract.`,
        governed,
      });
      if (state === "failed") return;
      console.log(`sync 完了(${state})。`);
      return;
    }
  } else out.push("A: PR 対象なし");
  console.log(out.join("\n") + `\nsync 完了${dry ? "(dry-run)" : ""}。`);
}

// --- install-commands (TASK-20260620-016; TASK-20260707-002): reflect the
// .claude/commands launchers into a host project's working-directory root.
// Launchers live BOTH at .claude/commands/*.md and .claude/commands/skills/*.md
// (the skills reorg moved /helix /cycle /sync there); the host destination is
// FLATTENED to .claude/commands/<basename> so slash commands keep their plain
// names (a subdirectory would namespace them). skills/ wins a basename collision.
// Verbatim copy when the host IS a HyperHelix checkout. With --nest <relpath>
// (HyperHelix nested under the host), writes THIN redirect launchers pointing at
// <relpath> as the framework root (env axiom: commands stay thin launchers;
// rules live in the nested repo). ---
function commandSources() {
  const map = new Map(); // basename.md -> srcRel (POSIX, relative to root); later entry wins
  for (const sub of ["", "skills"]) {
    const dir = path.join(root, ".claude", "commands", sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      map.set(f, [".claude/commands", sub, f].filter(Boolean).join("/"));
    }
  }
  return map;
}

function installCommands(args) {
  const to = sliceFlag(args, "--to")[1];
  const nest = sliceFlag(args, "--nest")[1];
  const dry = args.includes("--dry-run");
  if (!to) { console.error("install-commands: --to <hostdir> は必須(反映先=ホストの作業ディレクトリ root)。"); process.exitCode = 1; return; }
  const sources = commandSources();
  if (sources.size === 0) { console.error("install-commands: .claude/commands(/skills) に *.md ランチャーが無い。"); process.exitCode = 1; return; }
  const dstDir = path.join(to, ".claude", "commands");
  const out = [];
  for (const [f, srcRel] of sources) {
    const name = f.replace(/\.md$/, "");
    let content;
    if (nest) {
      const argLine = name === "helix" ? " 次のタスクを実行する: $ARGUMENTS" : "";
      content = `HyperHelix ${name} 起動コマンド(ネスト構成のリダイレクタ)。${argLine}\n\n` +
        `フレームワークは \`${nest}/\` にネストされている。\`${nest}/entrypoint.md\`(正本・HH-059)の ` +
        `ロール判定と読み込み順序に従い、\`${nest}/${srcRel}\` の手順を ` +
        `**\`${nest}\` をルートとして** 実行する(資材・ツールのパスは全て \`${nest}/\` を前置して解決)。\n` +
        `ルール本体はネスト先資材にある(本ファイルは薄い起動コマンド=環境制約の公理)。\n`;
    } else {
      content = fs.readFileSync(path.join(root, srcRel), "utf8");
    }
    if (dry) { out.push(`  [dry] ${path.join(dstDir, f)} ← ${srcRel} (${nest ? "redirect→" + nest : "verbatim"})`); continue; }
    fs.mkdirSync(dstDir, { recursive: true });
    fs.writeFileSync(path.join(dstDir, f), content);
    out.push(`  ${f} ← ${srcRel} (${nest ? "redirect→" + nest : "verbatim"})`);
  }
  console.log(`install-commands: ${sources.size} 件 → ${dstDir}${nest ? ` (nested root: ${nest})` : ""}\n` + out.join("\n"));
}

// --- bootstrap (TASK-20260707-002): one-shot project adoption. Automates the
// manual sequence observed on project/Project010 intake:
// session-bootstrap.md remediation (launchers, nested-repo gitignore) + the
// git-conventions branch model (project/<slug> derives from main) + validate +
// the CLAUDE.md reading-order guide. Idempotent: existing branch -> switch,
// installed launchers -> overwrite (same content), gitignore entry -> skip. ---
function bootstrap(args) {
  const slug = sliceFlag(args, "--project")[1];
  const base = sliceFlag(args, "--base")[1] || "main";
  const dry = args.includes("--dry-run");
  if (!slug || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(slug)) {
    console.error("bootstrap: --project <slug> は必須(英数字・-・_。ブランチ名 project/<slug> になる)。");
    process.exitCode = 1;
    return;
  }
  const hostArg = sliceFlag(args, "--host")[1];
  const host = path.resolve(hostArg || path.dirname(root));
  const nested = path.resolve(host) !== path.resolve(root);
  const nest = nested ? path.relative(host, root).split(path.sep).join("/") : null;
  if (nested && (nest.startsWith("..") || path.isAbsolute(nest))) {
    console.error(`bootstrap: --host はフレームワーク root の祖先ディレクトリを指定する(host=${host}, root=${root})。`);
    process.exitCode = 1;
    return;
  }
  const branch = `project/${slug}`;
  const g = (a, opt = {}) => git(a, { encoding: "utf8", ...opt });
  const exists = (ref) => { try { g(["rev-parse", "--verify", "--quiet", ref]); return true; } catch { return false; } };

  // 1) branch: switch (existing) or create from base
  console.log(`[bootstrap 1/5] ブランチ ${branch}`);
  const current = g(["branch", "--show-current"]).trim();
  if (current === branch) {
    console.log(`  既に ${branch} 上。切替不要。`);
  } else if (exists(`refs/heads/${branch}`)) {
    if (dry) console.log(`  [dry] git switch ${branch}`);
    else { g(["switch", branch], { stdio: "inherit", encoding: undefined }); }
  } else {
    // resolve the derivation point: local base, or origin/<base> on a fresh clone
    let baseRef = base;
    if (!exists(`refs/heads/${base}`)) {
      if (exists(`refs/remotes/origin/${base}`)) {
        baseRef = `origin/${base}`;
        console.log(`  ローカル ${base} が無いため ${baseRef} から派生する。`);
      } else {
        console.error(`bootstrap: base ブランチ '${base}'(origin/${base} も)が無い。--base で派生元を指定する。`);
        process.exitCode = 1;
        return;
      }
    } else {
      // freshness check is best-effort: no credential prompt, never a blocker
      try {
        git(["fetch", "origin", base], { stdio: "ignore", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
        const behind = Number(g(["rev-list", "--count", `${base}..origin/${base}`]).trim());
        if (behind > 0) console.log(`  警告: ${base} は origin/${base} より ${behind} コミット遅れ。/sync で取り込んでから作り直すことを検討。`);
      } catch { console.log("  (origin へ fetch 不可 — ローカル base で続行)"); }
    }
    const dirty = g(["status", "--porcelain"]).trim();
    if (dirty) console.log("  警告: 作業ツリーに未コミット変更あり。切替に持ち越される。");
    if (dry) console.log(`  [dry] git switch -c ${branch} ${baseRef}`);
    else { g(["switch", "-c", branch, baseRef], { stdio: "inherit", encoding: undefined }); }
  }

  // 2) launchers into the host (session-bootstrap step 2 remediation)
  console.log(`[bootstrap 2/5] ランチャー反映 → ${host}`);
  installCommands(["--to", host, ...(nested ? ["--nest", nest] : []), ...(dry ? ["--dry-run"] : [])]);
  if (process.exitCode === 1) return; // installCommands failed hard

  // 3) host .gitignore: keep the nested repo out of the host index (step 4)
  if (nested) {
    console.log("[bootstrap 3/5] ホスト .gitignore(ネストリポジトリ境界)");
    let hostIsRepo = false;
    try {
      execFileSync("git", ["-C", host, "rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
      hostIsRepo = true;
    } catch { console.log("  ホストは git リポジトリではない — .gitignore 整備をスキップ。"); }
    if (hostIsRepo) {
      const giPath = path.join(host, ".gitignore");
      const existing = fs.existsSync(giPath) ? fs.readFileSync(giPath, "utf8") : "";
      const has = existing.split(/\r?\n/).some((l) => {
        const t = l.trim();
        return t === `${nest}/` || t === nest || t === `/${nest}/` || t === `/${nest}`;
      });
      if (has) console.log(`  ${nest}/ は記載済み。`);
      else if (dry) console.log(`  [dry] ${giPath} へ '${nest}/' を追記`);
      else {
        const nl = existing === "" || existing.endsWith("\n") ? "" : "\n";
        fs.appendFileSync(giPath, `${nl}# HyperHelix nested framework repo (session-bootstrap step 4)\n${nest}/\n`);
        console.log(`  ${giPath} へ '${nest}/' を追記した。`);
      }
    }
  } else {
    console.log("[bootstrap 3/5] 非ネスト構成 — .gitignore 整備は不要。");
  }

  // 4) tracked pre-push hook (session-bootstrap §3c)
  console.log("[bootstrap 4/5] hooks: core.hooksPath -> tools/hooks (pre-push enforcement)");
  if (dry) console.log("  [dry] git config core.hooksPath tools/hooks");
  else g(["config", "core.hooksPath", "tools/hooks"]);

  // 5) validate + reading-order guide
  if (dry) console.log("[bootstrap 5/5] [dry] validate はスキップ");
  else {
    console.log("[bootstrap 5/5] validate");
    printIssues(validate());
  }
  const p = nested ? `${nest}/` : "";
  console.log(`
bootstrap 完了。フレームワーク読み込み順序(${p}entrypoint.md 正本 / HH-024・HH-059):
  常時必読: ${p}constitution.md → ${p}core/loop.yaml → ${p}core/routing.yaml → ${p}core/gates.yaml
  索引読み: ${p}amendments.md(冒頭索引) / ${p}core/knowledge.yaml(カウンタ+タグ検索)
  タスク実行: /helix <タスク内容>(ホスト側 .claude/commands/ に反映済み)`);
}

function codexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

const CODEX_SKILL_TRIGGER_WORDS = [
  "slash commands", "/helix", "/cycle", "/sync", "compact-prep",
  "validate", "verify", "contract-doc", "bump", "brief", "finish", "cost-report", "sync",
  "capture-plan", "review-snapshot", "review-check",
  "install-commands", "update-codex-skill", "reflux",
  "consolidation-report",
];

function hyperhelixSkillFiles(repoRoot) {
  const repo = repoRoot.replace(/\\/g, "/");
  const skill = `---
name: hyperhelix-commands
description: HyperHelix command workflows and dispatch guidance. Use when Codex is working in a HyperHelix repository or the user asks to run, install, expose, autocomplete, skillify, update, or choose HyperHelix commands and workflows such as ${CODEX_SKILL_TRIGGER_WORDS.join(", ")}.
---

# HyperHelix Commands

Use this skill as a compact entry point for HyperHelix command workflows. Treat the repository's live files as the authority; this skill is regenerated from the repo and intentionally stays thin.

## Live Authority

- Prefer the current workspace if it contains \`tools/hyperhelix.mjs\`; otherwise use the repository root recorded at generation time: \`${repo}\`.
- Read \`entrypoint.md\` (the platform-neutral canon; AGENTS.md/CLAUDE.md merely redirect to it, HH-059), then follow its role determination and reading order.
- Run \`node tools/hyperhelix.mjs --help\` for the current command list.
- Run \`node tools/hyperhelix.mjs validate\` before claiming framework consistency.

## Layer Map

- Claude slash-command skills live in \`.claude/commands/skills/*.md\` and expose launchers such as \`/helix\`, \`/cycle\`, \`/sync\`, and \`compact-prep\`.
- Platform compaction adapters live in \`.claude/settings.json\` and \`.codex/hooks.json\`; both call the shared runtime and \`assets/workflows/compaction.md\` is the lifecycle authority.
- This Codex skill lives in \`~/.codex/skills/hyperhelix-commands\` and exists for autocomplete/dispatch inside Codex.
- \`node tools/hyperhelix.mjs update-codex-skill --check\` reports whether the Codex skill is stale; without \`--check\` it regenerates it.

## Common Dispatch

- Use \`/helix <task>\` for tracked-file work and normal task loops.
- Use \`/cycle\` for framework review triggers.
- Use \`/sync\` for framework synchronization with \`origin/main\`.
- Use \`node tools/hyperhelix.mjs brief\` (claim a task id), \`bump\`, and \`finish\` (commit with the hh-record task record in the message) for task claims, D7 bookkeeping, and fail-closed completion orchestration.
- Use \`node tools/hyperhelix.mjs reflux\` from project/variant branches to dry-run project-born framework-knowledge reflux before applying.
- Use \`node tools/hyperhelix.mjs consolidation-report\` for R8 redundancy review.
- Use \`node tools/hyperhelix.mjs update-codex-skill\` after HyperHelix command/spec changes so Codex autocomplete metadata is refreshed.

## Safety Defaults

- Do not force-push, rebase, amend, reset, or bypass repo gates unless explicitly requested and allowed by repo rules.
- For push-capable commands, read \`assets/workflows/git-conventions.md\`; automatic push exceptions are command-specific.
- If a HyperHelix tool reports warnings, relay them rather than treating the state as fully clean.
`;
  const yaml = `interface:
  display_name: "HyperHelix Commands"
  short_description: "HyperHelix command workflows"
  default_prompt: "Use $hyperhelix-commands to run the appropriate HyperHelix workflow for this repository."
policy:
  allow_implicit_invocation: true
`;
  return { skill, yaml };
}

function validateCodexSkillTarget(target) {
  const issues = [];
  const rel = target.file.replace(/\\/g, "/");
  const content = target.content;
  if (rel.endsWith("/SKILL.md")) {
    if (!content.startsWith("---\n")) issues.push(`${rel}: missing frontmatter opener`);
    if (!/^name: hyperhelix-commands$/m.test(content)) issues.push(`${rel}: missing skill name`);
    if (!/^description: .{80,}$/m.test(content)) issues.push(`${rel}: missing rich description`);
    if (!content.includes("# HyperHelix Commands")) issues.push(`${rel}: missing title`);
    for (const word of ["brief", "bump", "finish", "consolidation-report", "compact-prep"]) {
      if (!content.includes(word)) issues.push(`${rel}: trigger '${word}' is not represented`);
    }
  } else if (rel.endsWith("/agents/openai.yaml")) {
    if (!content.includes('display_name: "HyperHelix Commands"')) issues.push(`${rel}: missing display_name`);
    if (!content.includes("default_prompt:")) issues.push(`${rel}: missing default_prompt`);
    if (!content.includes("allow_implicit_invocation: true")) issues.push(`${rel}: implicit invocation is not enabled`);
  }
  return issues;
}

function validateCodexSkillTargets(targets) {
  return targets.flatMap(validateCodexSkillTarget);
}

// --- update-codex-skill: regenerate the personal Codex skill that exposes
// HyperHelix command workflows in Codex autocomplete. Details stay thin and point
// back to the live repo so command/spec changes do not fossilize in the skill. ---
function updateCodexSkill(args) {
  const dry = args.includes("--dry-run");
  const check = args.includes("--check");
  const to = sliceFlag(args, "--to")[1] || path.join(codexHome(), "skills");
  const skillDir = path.join(to, "hyperhelix-commands");
  const agentsDir = path.join(skillDir, "agents");
  const { skill, yaml } = hyperhelixSkillFiles(root);
  const targets = [
    { file: path.join(skillDir, "SKILL.md"), content: skill },
    { file: path.join(agentsDir, "openai.yaml"), content: yaml },
  ];
  const generatedIssues = validateCodexSkillTargets(targets);
  if (generatedIssues.length) {
    console.error("update-codex-skill: generated skill is invalid:");
    for (const issue of generatedIssues) console.error(`  - ${issue}`);
    process.exitCode = 1; return;
  }
  if (check) {
    let changed = false;
    const installed = [];
    for (const t of targets) {
      if (!fs.existsSync(t.file)) {
        console.log(`  [missing] ${t.file}`);
        changed = true;
      } else {
        const actual = fs.readFileSync(t.file, "utf8");
        installed.push({ file: t.file, content: actual });
        if (actual !== t.content) {
          console.log(`  [stale] ${t.file}`);
          changed = true;
        }
      }
    }
    const installedIssues = validateCodexSkillTargets(installed);
    for (const issue of installedIssues) console.log(`  [invalid] ${issue}`);
    if (changed || installedIssues.length) {
      console.error("update-codex-skill: Codex skill is stale or invalid. Run `node tools/hyperhelix.mjs update-codex-skill`.");
      process.exitCode = 1; return;
    }
    console.log(`update-codex-skill: ${skillDir} は最新です。`);
    return;
  }
  if (dry) {
    console.log("update-codex-skill: dry-run");
    for (const t of targets) console.log(`  [dry] write ${t.file}`);
    return;
  }
  fs.mkdirSync(agentsDir, { recursive: true });
  for (const t of targets) fs.writeFileSync(t.file, t.content, "utf8");
  const missing = targets.filter((t) => !fs.existsSync(t.file));
  if (missing.length) {
    console.error(`update-codex-skill: 書き込み確認失敗: ${missing.map((m) => m.file).join(", ")}`);
    process.exitCode = 1; return;
  }
  const written = targets.map((t) => ({ file: t.file, content: fs.readFileSync(t.file, "utf8") }));
  const writtenIssues = validateCodexSkillTargets(written);
  if (writtenIssues.length) {
    console.error("update-codex-skill: 書き込み後検証に失敗:");
    for (const issue of writtenIssues) console.error(`  - ${issue}`);
    process.exitCode = 1; return;
  }
  console.log(`update-codex-skill: ${skillDir} を更新しました。Codex の補完反映には新規スレッド/再起動が必要な場合があります。`);
}

// reflux (TASK-20260620-029): automate the project->main framework-knowledge reflux.
// Framework knowledge BORN during project work (learning notes, anti-patterns, D2/D2b
// process lessons, gaps -> HH) MUST reach main — it is the knowledge spiral's feedback
// from real use; discarding it leaves only self-referential improvement. reflux classifies
// the current branch's origin/main..HEAD commits as framework-only (sync heuristic paths)
// vs project, then (with --apply) stages the framework-only ones onto main and pushes
// SC-05b: local notes come from the knowledge repository; origin/main texts are
// parsed with the SAME formal parser (parseLedgerNotesText). git absence stays
// soft (local-only derivation with a notice); an INVALID fetched ledger is a
// hard fail (fail-closed) — throws {exitHard:true} which nextId reports.
function derivePermanentNoteId() {
  let rawSlug = "local";
  try { rawSlug = currentBranchNamespace(); } catch {}
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const encodedSlug = encodeBranchSlug(rawSlug);
  let maxSuffix = 0;
  const collectNotes = (notes) => {
    for (const n of notes) {
      const parsedId = parseNoteId(n.id);
      if (parsedId?.kind !== "permanent" || parsedId.encodedSlug !== encodedSlug || parsedId.date !== date) continue;
      maxSuffix = Math.max(maxSuffix, parsedId.suffixNumber);
    }
  };
  const local = loadKnowledge(root);
  if (!local.ok) {
    const err = new Error(`local knowledge canon is invalid:\n  ${local.errors.join("\n  ")}`);
    err.exitHard = true;
    throw err;
  }
  collectNotes(local.value.notes);
  const collectRemote = (relative, role) => {
    let text;
    try { text = git(["show", `origin/main:${relative}`], { encoding: "utf8" }); }
    catch { return false; } // absent remote file is backward-compatible
    const parsed = parseLedgerNotesText(text, role, { source: `origin/main:${relative}` });
    if (!parsed.ok) {
      const err = new Error(`origin/main ledger is invalid (fail-closed):\n  ${parsed.errors.join("\n  ")}`);
      err.exitHard = true;
      throw err;
    }
    collectNotes(parsed.value.notes);
    return true;
  };
  try { git(["rev-parse", "--verify", "origin/main"], { encoding: "utf8" }); }
  catch {
    console.error("next-id: origin/main の台帳を参照できない(リモート未設定?)— ローカル台帳のみで導出。");
    return formatPermanentNoteId({ slug: rawSlug, date, suffix: numberToSuffix(maxSuffix + 1) });
  }
  collectRemote(KNOWLEDGE, "main");
  try {
    // HH:ARCH-ALLOW reason="read-only remote ledger enumeration for id-collision check (contents parsed by the knowledge repository)"
    const originLeaves = git(["ls-tree", "--name-only", "origin/main", `${KNOWLEDGE_DIR}/`], { encoding: "utf8" })
      .trim().split(/\r?\n/).filter((file) => file.endsWith(".yaml") && !file.endsWith("/manifest.yaml"));
    for (const file of originLeaves) collectRemote(file, "leaf");
  } catch { /* origin/main without a leaf-ledger directory is backward-compatible */ }
  return formatPermanentNoteId({ slug: rawSlug, date, suffix: numberToSuffix(maxSuffix + 1) });
}
function nextId() {
  // Best-effort freshen origin/main first; never silent on failure (N-073).
  try { git(["fetch", "origin"]); } catch { console.error("next-id: git fetch origin 失敗(オフライン?)— 最終 fetch 時点の origin/main で突合。"); }
  try {
    console.log(derivePermanentNoteId());
  } catch (err) {
    if (!err.exitHard) throw err;
    console.error(`next-id: ${err.message}`);
    process.exitCode = 1;
  }
}

// Legacy adapter (read-only): lexical HH-id extraction over a pre-SC-04
// origin/main that has no governance registry yet. Never used for local state.
function maxHhNumberLegacy(text) {
  return extractHhIds(text).reduce((max, id) => Math.max(max, parseHhId(id)?.serial ?? 0), 0);
}

// SC-04: the allocator reads the governance registry, never amendments.md
// headings. fail-closed on an unreadable local or remote registry.
function nextHhId(args) {
  if (args.includes("--help") || args.includes("-h")) { help(); return; }
  const unknown = args.filter((arg) => arg !== "--offline");
  if (unknown.length > 0) {
    console.error(`next-hh-id: unknown argument(s): ${unknown.join(" ")}`);
    process.exitCode = 1;
    return;
  }
  const offline = args.includes("--offline");
  const local = loadGovernanceRegistry(root);
  if (!local.ok) {
    console.error(`next-hh-id: local registry を読めません — 採番しません(fail-closed)。`);
    for (const message of local.errors) console.error(`  ${message}`);
    process.exitCode = 1;
    return;
  }
  let max = maxHhSerial(local.value.entries);
  if (offline) {
    console.error("next-hh-id: WARNING --offline: origin/mainを突合せずlocal maxだけを使用します。");
  } else {
    try {
      git(["fetch", "origin"]);
      let remoteRegistryText = null;
      try {
        // HH:ARCH-ALLOW reason="allocator reads origin/main registry read-only; content parsed by the governance repository"
        remoteRegistryText = git(["show", `origin/main:${GOVERNANCE_CONTRACT.registry}`], { encoding: "utf8" });
      } catch {
        // pre-SC-04 remote: registry not yet pushed — legacy read-only fallback,
        // allowed only while the governance epoch still permits legacy reads (SC-06).
        if (!epochAllowsLegacyRead("governance")) {
          console.error("next-hh-id: origin/main に registry が無く、governance epoch は legacy read を許可しません — 採番しません(fail-closed)。");
          process.exitCode = 1;
          return;
        }
        // HH:ARCH-ALLOW reason="legacy adapter: pre-SC-04 remote fallback, epoch-gated read-only"
        const remoteView = git(["show", `origin/main:${GOVERNANCE_CONTRACT.view}`], { encoding: "utf8" });
        console.error("next-hh-id: origin/main は registry 未移行 — legacy amendments.md を read-only 突合(SC-04 push 後は registry 突合に切替)。");
        max = Math.max(max, maxHhNumberLegacy(remoteView));
      }
      if (remoteRegistryText !== null) {
        const remote = parseGovernanceRegistryText(remoteRegistryText, { source: `origin/main:${GOVERNANCE_CONTRACT.registry}` });
        if (!remote.ok) {
          console.error("next-hh-id: origin/main の registry が invalid — 採番しません(fail-closed)。");
          for (const message of remote.errors) console.error(`  ${message}`);
          process.exitCode = 1;
          return;
        }
        max = Math.max(max, maxHhSerial(remote.value.entries));
      }
    } catch (error) {
      console.error(`next-hh-id: origin/main突合に失敗(${error.message})。採番しません。明示的なlocal fallbackが必要な場合だけ--offlineを指定してください。`);
      process.exitCode = 1;
      return;
    }
    // best-effort: fold in open origin/hyperhelix/* PR branches so an
    // unmerged reflux/sync branch's Pending HH cannot collide with a fresh
    // allocation on another branch (R8c backlog item, 2026-07-19 incident:
    // PR #3's HH-073 collided with a same-numbered fresh allocation).
    // Advisory only — a branch that fails to read/parse never blocks
    // allocation (origin/main above remains the sole fail-closed authority).
    try {
      const branchList = git(["branch", "-r", "--list", "origin/hyperhelix/*"], { encoding: "utf8" });
      const branches = branchList
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.includes("->")); // skip symbolic refs (HEAD aliases)
      for (const branch of branches) {
        try {
          // HH:ARCH-ALLOW reason="allocator reads open PR branch registries read-only; content parsed by the governance repository (same pattern as the origin/main read above)"
          const text = git(["show", `${branch}:${GOVERNANCE_CONTRACT.registry}`], { encoding: "utf8" });
          const parsed = parseGovernanceRegistryText(text, { source: `${branch}:${GOVERNANCE_CONTRACT.registry}` });
          if (parsed.ok) max = Math.max(max, maxHhSerial(parsed.value.entries));
          else console.error(`next-hh-id: WARNING ${branch} の registry が invalid — skip(advisory)。`);
        } catch {
          // branch predates SC-04 registry, or has no registry file — skip silently (advisory).
        }
      }
    } catch (error) {
      console.error(`next-hh-id: WARNING open PR branch 走査に失敗(${error.message}) — origin/main のみで採番します。`);
    }
  }
  console.log(formatHhId(max + 1));
}

// HH-064/FI-02: compatibility alias only. Provisional ids are never silently rewritten;
// validate blocks them on main so their producer must regenerate a permanent id.
function adoptNotes() {
  console.log("adopt-notes: deprecated compatibility alias; no files changed. Use the permanent id from `hyperhelix.mjs next-id` when creating or migrating a note.");
  return false;
}

// HH-063 §9e mechanized: watch a dispatched WO's output file for liveness.
// Terminal states are NEVER silent (N-073): [WO-DONE] exit 0 / [WO-STALL] exit 2 /
// [WO-BUDGET] exit 3. New [WO-BEAT] lines are echoed as they appear.
function woWatch(args) {
  const flagVals = new Set();
  for (const f of ["--stall", "--budget", "--done-marker", "--pid"]) { const i = args.indexOf(f); if (i !== -1) flagVals.add(i + 1); }
  const file = args.find((a, i) => !a.startsWith("--") && !flagVals.has(i));
  const num = (flag, dflt) => { const i = args.indexOf(flag); return i !== -1 && args[i + 1] ? Number(args[i + 1]) : dflt; };
  const stallS = num("--stall", 180), budgetS = num("--budget", 600);
  const pid = num("--pid", 0);
  // Secondary liveness signal (TASK-20260716-016 field calibration): file growth alone
  // is unreliable — codex exec block-buffers stdout on redirect (~8KB flushes), so an
  // alive worker can look stalled for minutes. With --pid, a quiet-but-alive process
  // logs [WO-QUIET] and keeps watching instead of firing a false [WO-STALL].
  const pidAlive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const dmIdx = args.indexOf("--done-marker");
  // Line-anchored: codex exec ECHOES the WO prompt into the output, so an unanchored
  // marker matches the WO's own instruction text ("最終行に [WO-DONE] を出力") and
  // fires a false DONE at 0s (observed on first field use, TASK-20260716-016).
  const doneRe = dmIdx !== -1 && args[dmIdx + 1] ? new RegExp(args[dmIdx + 1], "m") : /^\[WO-DONE\]|^tokens used/im;
  if (!file || !Number.isFinite(stallS) || !Number.isFinite(budgetS)) {
    console.error("usage: wo-watch <output-file> [--stall 180] [--budget 600] [--done-marker <regex>]");
    process.exitCode = 1; return;
  }
  const abs = path.isAbsolute(file) ? file : path.join(root, file);
  const start = Date.now();
  const pollMs = Math.min(5000, Math.max(200, (stallS * 1000) / 3));
  let lastSize = 0, lastGrowth = Date.now(), beatsShown = 0;
  console.log(`wo-watch: ${file} を監視(stall ${stallS}s / budget ${budgetS}s / poll ${Math.round(pollMs)}ms — HH-063 §9e)`);
  const tick = () => {
    const now = Date.now();
    let size = 0;
    try { size = fs.statSync(abs).size; } catch { /* 未出現 = サイズ0 → stall タイマーが配達失敗も拾う */ }
    if (size > lastSize) {
      lastSize = size; lastGrowth = now;
      let text = ""; try { text = fs.readFileSync(abs, "utf8"); } catch {}
      const beats = text.match(/^\[WO-BEAT\].*$/gm) ?? [];
      for (; beatsShown < beats.length; beatsShown++) console.log(beats[beatsShown]);
      if (doneRe.test(text)) {
        console.log(`[WO-DONE] 完了マーカー検出(${Math.round((now - start) / 1000)}s・beat ${beats.length}件)→ Evaluate へ`);
        return;
      }
    }
    if ((now - lastGrowth) / 1000 >= stallS) {
      if (pid && pidAlive()) {
        console.log(`[WO-QUIET] 新規出力なし ${stallS}s だがプロセス ${pid} は生存(バッファリングの可能性)— 継続監視`);
        lastGrowth = now; // re-evaluate after another stall interval
      } else {
        console.log(`[WO-STALL] 新規出力なし ${stallS}s${pid ? `・プロセス ${pid} 消滅` : ""} — ハング扱い(HH-063)。§9c: kill 前にプロセス生存を確認(--pid 未指定時)→ 同一 WO を1回再配達 → 再失敗なら EX-1 直接実行`);
        process.exitCode = 2; return;
      }
    }
    if ((now - start) / 1000 >= budgetS) {
      console.log(`[WO-BUDGET] 予算 ${budgetS}s 超過(出力は継続中)— §9b: 1回だけ延長して再監視するか、§9c を判断`);
      process.exitCode = 3; return;
    }
    setTimeout(tick, pollMs);
  };
  tick();
}

// --- notes: S2 retrieval as a batch tool (TASK-20260708-003) ---
// Deterministically applies the S2 retrieval rules (gates.search + HH-032/045) so the
// model reads exactly the top-N matching notes instead of grepping the 50KB ledger:
// tag overlap match -> active only -> project scope (current+shared; absent==shared) ->
// playbooks first (HH-045 primary target) -> last_used desc (strength desc tiebreak) -> top_n cap.
function notesSearch(args) {
  // 繰り返し指定を許す(bump の listArg と同契約)。未指定は null のまま。
  const listArg = (flag) => {
    const out = [];
    let seen = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] !== flag || i + 1 >= args.length) continue;
      seen = true;
      out.push(...args[i + 1].split(",").map((s) => s.trim()).filter(Boolean));
    }
    return seen ? out : null;
  };
  const strArg = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  };
  const tags = listArg("--tags");
  if (!tags || !tags.length) {
    console.error("notes: --tags a,b,... は必須です(S2 タグ検索。例: notes --tags hooks,compaction --project hyperhelix)。");
    process.exitCode = 1; return;
  }
  const project = strArg("--project"); // current project slug; null = no scoping (--all equivalent)
  // SC-02: top_n comes from the parsed gates model — no regex, no silent default.
  const gatesModel = loadGates();
  if (!gatesModel.ok) {
    for (const message of gatesModel.errors) console.error(`notes: ${message}`);
    process.exitCode = 1;
    return;
  }
  const topNGate = gatesModel.value.search.top_n;
  const topN = Number(strArg("--n")) || topNGate;
  // SC-05b: retrieval goes through the knowledge repository (formal parser),
  // never the legacy line parser. fail-closed on an invalid canon.
  const queried = queryNotes(root, { tags, project, topN });
  if (!queried.ok) {
    for (const message of queried.errors) console.error(`notes: ${message}`);
    process.exitCode = 1;
    return;
  }
  const { matched, top, projectScope } = queried.value;
  // fail-loud project scoping (TASK-Project001-20260821-019): never let a slug that
  // matches no ledger look like "this project simply has no notes".
  if (projectScope && projectScope.requested) {
    if (projectScope.match === "case-insensitive") {
      console.warn(`notes: project '${projectScope.requested}' を台帳の実値 '${projectScope.resolved}' として解決しました(大小無視)。`);
    } else if (projectScope.match === "none") {
      console.warn(`notes: 警告 — project '${projectScope.requested}' はどの台帳にも一致しません。shared ノートのみが対象です(project 固有ノートは素通り)。既知の slug: ${projectScope.known.join(", ") || "(なし)"}`);
    }
  }
  const scopeLabel = projectScope && projectScope.resolved ? `${projectScope.resolved}+shared` : null;
  if (!top.length) { console.log(`notes: 0 match (tags: ${tags.join(",")}${scopeLabel ? `, project: ${scopeLabel}` : ""})`); return; }
  const out = [`notes: ${top.length}/${matched.length} match (top_n=${topN}, order: playbook first, last_used desc)`];
  for (const n of top) {
    const meta = [n.kind, n.project, `str=${n.strength}`, `used=${n.last_used}`].filter(Boolean).join(" ");
    out.push(`\n${n.id} [${meta}] tags: ${(n.tags || []).join(",")}${n.leaves ? ` leaves: ${n.leaves.join(",")}` : ""}`);
    out.push(`  ${n.text}`);
  }
  console.log(out.join("\n"));
}

// --- compact-prep: state-file skeleton generator (TASK-20260708-003) ---
// Batches the mechanical half of the compact-prep skill: path assembly, the 10 required
// headings (incl. Distill Inbox, HH-062), and machine-readable prefill
// (branch/HEAD/status/counters). The model then
// fills only the semantic sections via Edit. Session id stays a HARD GATE: no --sid, no file.
function compactPrep(args) {
  const i = args.indexOf("--sid");
  const sid = i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  const refresh = args.includes("--refresh");
  if (!sid || !/^[0-9a-f-]{8,}$/i.test(sid)) {
    console.error("compact-prep: --sid <session_id> は必須です(推測名で state file を作らない — skill の Hard gate)。");
    process.exitCode = 1; return;
  }
  // TASK-20260716-008: runtime state はプロジェクト直下 .claude/tmp/(git 無視)に置く。
  // グローバル tmp だと複数作業ディレクトリ(クローン)間で state が混線するため。
  const dir = path.join(".claude", "tmp", "compact-state");
  const file = path.join(dir, `${sid}.md`);
  if (fs.existsSync(file) && !refresh) {
    console.log(`compact-prep: 既存 state file があります(上書きしません): ${file}\nEdit で更新してください。`);
    return;
  }
  let branch = "?", head = "?", status = "(unavailable)";
  try { branch = git(["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
  try { head = git(["log", "-1", "--format=%h %s"], { encoding: "utf8" }).trim(); } catch {}
  try { status = git(["status", "--short"], { encoding: "utf8" }).trim() || "(clean)"; } catch {}
  status = status.replace(/\r?\n/g, " | ");
  // SC-05c: counters via the knowledge repository. compact-prep is a rescue tool —
  // an invalid canon degrades the display to "?" instead of blocking the save.
  const compactState = loadKnowledge(root);
  const ti = compactState.ok ? compactState.value.counters.task_index : "?";
  const lfr = compactState.ok ? compactState.value.counters.last_framework_review : "?";
  const generated = new Date().toISOString();
  if (fs.existsSync(file)) {
    let current = fs.readFileSync(file, "utf8");
    const replacements = [
      [/^\(session_id: .*? \/ generated: .*? by hyperhelix\.mjs compact-prep\)$/m, `(session_id: ${sid} / generated: ${generated} by hyperhelix.mjs compact-prep)`],
      [/^git branch:.*$/m, `git branch: ${branch}`],
      [/^HEAD:.*$/m, `HEAD: ${head}`],
      [/^git status:.*$/m, `git status: ${status}`],
      [/^counters:.*$/m, `counters: task_index=${ti} / last_framework_review=${lfr}`],
    ];
    for (const [pattern, replacement] of replacements) {
      if (!pattern.test(current)) {
        console.error(`compact-prep: --refresh を安全に適用できません(機械 field anchor 不在): ${file}`);
        process.exitCode = 1; return;
      }
      current = current.replace(pattern, replacement);
    }
    const temporary = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, current, "utf8");
    fs.renameSync(temporary, file);
    console.log(`compact-prep: state の機械 field を refresh(意味 section 保持): ${file}`);
    return;
  }
  const skeleton = `# Compact Prep State

(session_id: ${sid} / generated: ${generated} by hyperhelix.mjs compact-prep)

## Active Plan

<!-- FILL: plan file パス or「正式 plan なし」+ 作業の一行要約 -->

## Current Phase

<!-- FILL: 現在のフェーズ/ステップ。直近の完了タスク -->

## TaskList Summary

<!-- FILL: in-progress タスクと Pending 事項 -->

## Session Decisions

<!-- FILL: session 中の判断・ユーザー選択・不採用案の理由 -->

## Distill Inbox

<!-- FILL: 未蒸留の知見候補(HH-062 — 台帳には書かない。次の正規 D フェーズで蒸留 or 明示的に破棄)。無ければ「なし」 -->

## Constraints and Blockers

<!-- FILL: 制約・ブロッカー・未完了の検証 -->

## Worker Topology

<!-- FILL: 単独 orch / tmux-bridge pane / codex 委任状態 -->

## Editing Files

git branch: ${branch}
HEAD: ${head}
git status: ${status}
<!-- FILL: 未保存・未検証の注意点があれば追記 -->

## Recovery Notes

counters: task_index=${ti} / last_framework_review=${lfr}
<!-- FILL: 圧縮後の自分への復旧メモ(次にすべきこと・正とすべき資材) -->
`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, skeleton);
  console.log(`compact-prep: skeleton 作成: ${file}\n10見出し + 機械的フィールド(branch/HEAD/status/counters)を prefill 済。<!-- FILL --> を Edit で埋めてください。`);
}

// HH-057: pure merge of a conflicted knowledge.yaml — resolve counter-only conflict blocks
// (task_index / last_framework_review) by high-water max. Returns { ok, text }. ok=false if
// ANY conflict block contains a non-counter line (fail safe: caller hands off to manual guide).
// Exported for tests.
// SC-05b: the counter-only conflict is resolved from the git index STAGES
// (:2 ours / :3 theirs) parsed with the formal parser — never by scanning
// conflict markers with a counter regex. Both sides must agree on everything
// except counters; counters merge by high-water max (HH-057). Returns true only
// if the ONLY unmerged file is core/knowledge.yaml AND the sides differ solely
// in counters; the merged text lands via the repository's atomic write.
function resolveKnowledgeCounterConflict() {
  let unmerged;
  try { unmerged = git(["diff", "--name-only", "--diff-filter=U"], { encoding: "utf8" }).trim().split("\n").filter(Boolean); }
  catch { return false; }
  if (unmerged.length !== 1 || unmerged[0] !== KNOWLEDGE) return false;
  let oursText;
  let theirsText;
  try {
    oursText = git(["show", `:2:${KNOWLEDGE}`], { encoding: "utf8" }); // HH:ARCH-ALLOW reason="counter-conflict resolution reads index stages read-only; parse+write via the knowledge repository"
    theirsText = git(["show", `:3:${KNOWLEDGE}`], { encoding: "utf8" }); // HH:ARCH-ALLOW reason="counter-conflict resolution reads index stages read-only; parse+write via the knowledge repository"
  } catch { return false; }
  const merged = mergeCounterHighWater(oursText, theirsText);
  if (!merged.ok) return false;
  const committed = commitKnowledgeWrites(root, [{ relative: KNOWLEDGE, text: merged.text }]);
  if (!committed.ok) return false;
  git(["add", KNOWLEDGE]); // HH:ARCH-ALLOW reason="stages the ledger already written via commitKnowledgeWrites (no content access)"
  return true;
}

// (HH-034 push path). Dry-run by default. A counter-only cherry-pick conflict is auto-resolved
// by high-water max (HH-057); any other conflict hands off to the manual /sync conflict guide.
function reflux(args) {
  const apply = args.includes("--apply");
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
  if (branch === "main") {
    console.error("reflux: 現在 main。reflux は project/variant → main の還元用です。main 上の同期は `sync` を使ってください。");
    process.exitCode = 1; return;
  }
  try { git(["fetch", "origin"]); } catch { console.error("reflux: git fetch origin に失敗。"); process.exitCode = 1; return; }
  let raw;
  try { raw = git(["log", "origin/main..HEAD", "--format=%H\t%s"], { encoding: "utf8" }).trim(); }
  catch { console.error("reflux: origin/main..HEAD を解決できない(リモート設定を確認)。"); process.exitCode = 1; return; }
  if (!raw) { console.log("reflux: origin/main より先行するコミットなし。還元対象なし。"); return; }
  const FW = [/^core\//, /^assets\//, /^tools\//, /^\.claude\/commands\//, /^\.claude\/settings\.json$/, /^\.codex\//, /^\.github\//, /^docs\//, /^governance\//, /^test\//, /^constitution\.md$/, /^amendments\.md$/, /^CLAUDE\.md$/, /^AGENTS\.md$/, /^entrypoint\.md$/, /^README\.md$/];
  const isFw = (f) => FW.some((re) => re.test(f));
  // HH-081 stage 3 (D8): task records never reflux. tasks/ paths are neutral — a commit
  // whose other files are all framework still qualifies, and --apply drops its tasks/ part.
  const isTasks = (f) => /^tasks\//.test(f);
  const commits =raw.split("\n").map((l) => { const i = l.indexOf("\t"); return { hash: l.slice(0, i), subj: l.slice(i + 1) }; });
  const candidates = [], excluded = [];
  for (const c of commits) {
    const files = git(["show", "--name-only", "--format=", c.hash], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    if (files.some(isFw) && files.every((f) => isFw(f) || isTasks(f))) candidates.push({ ...c, files, tasksBrief: files.some(isTasks) });
    else excluded.push({ ...c, nonFw: files.filter((f) => !isFw(f)) });
  }
  const out = [`reflux: ${branch} → main 還元候補(origin/main..HEAD ${commits.length} コミット)`];
  out.push(`\nframework-only(還元候補 ${candidates.length}):`);
  for (const c of candidates) out.push(`  ${c.hash.slice(0, 9)} ${c.subj}${c.tasksBrief ? "  [tasks/ の作業記録は還元時に除外 — HH-081 段階3]" : ""}`);
  out.push(`\n除外(project コード等 ${excluded.length}):`);
  for (const c of excluded) out.push(`  ${c.hash.slice(0, 9)} ${c.subj}  (非fw: ${c.nonFw.slice(0, 3).join(", ")}${c.nonFw.length > 3 ? "…" : ""})`);
  if (!apply) {
    out.push(`\n候補を確認し、問題なければ \`node tools/hyperhelix.mjs reflux --apply\` で origin/main 起点の専用branchへ cherry-pick + validate + PR。`);
    console.log(out.join("\n")); return;
  }
  if (!candidates.length) { console.log(out.join("\n") + "\n還元候補なし。終了。"); return; }
  console.log(out.join("\n"));
  const prBranch = prBranchName("reflux", branch);
  const allCandidatePaths = [...new Set(candidates.flatMap((c) => c.files))];
  const governed = governancePaths(allCandidatePaths);
  if (!publisherReady(ensureGhReady("reflux"))) return;
  const existing = findOpenPullRequest(prBranch);
  if (existing === null) return;
  if (existing) {
    console.log(`reflux: 既存PRを再開: ${existing}`);
    finishPullRequest("reflux", existing, governed);
    return;
  }
  try {
    git(["show-ref", "--verify", "--quiet", `refs/heads/${prBranch}`]);
    console.error(`reflux: local staging branch ${prBranch} が残っていますが open PR がありません。内容を確認して手動整理してください。`);
    process.exitCode = 1;
    return;
  } catch { /* expected when the deterministic staging branch is unused */ }
  try { git(["checkout", "-b", prBranch, "origin/main"]); }
  catch { console.error("reflux: origin/main 起点の PR staging branch 作成に失敗(未コミットの変更があるか?)。"); process.exitCode = 1; return; }
  const picks = candidates.map((c) => c.hash).reverse(); // oldest-first
  try { git(["cherry-pick", ...picks]); }
  catch {
    // HH-057: counter-only conflicts auto-resolve by high-water max; anything else fails safe.
    let recovered = false;
    while (resolveKnowledgeCounterConflict()) {
      try { git(["cherry-pick", "--continue"], { env: { ...process.env, GIT_EDITOR: "true" } }); recovered = true; break; }
      catch { /* next iteration: another counter-only conflict, or fall through to abort */ }
    }
    if (!recovered) {
      try { git(["cherry-pick", "--abort"]); } catch {}
      git(["checkout", branch]);
      console.error("reflux: cherry-pick conflict(counters 以外 — notes/amendments 等)。自動解決しません — assets/workflows/sync-conflict-guide.md で手動還元してください。");
      process.exitCode = 1; return;
    }
    console.log("reflux: knowledge.yaml counters を high-water max で自動解決(HH-057)。");
  }
  // HH-081 stage 3 (D8): strip every tasks/ change the picks carried, back to origin/main.
  const taskDelta = git(["diff", "--name-only", "origin/main", "HEAD", "--", "tasks/"], { encoding: "utf8" })
    .split(/\r?\n/).filter(Boolean);
  if (taskDelta.length) {
    for (const file of taskDelta) {
      let onMain = true;
      try { git(["cat-file", "-e", `origin/main:${file}`], { stdio: "ignore" }); } catch { onMain = false; }
      if (onMain) git(["checkout", "origin/main", "--", file]);
      else git(["rm", "-q", "-f", "--", file]);
    }
    git(["commit", "-q", "-m", `SYNC: reflux から tasks/ の作業記録 ${taskDelta.length} 件を除外(HH-081 段階3 D8)`]);
    console.log(`reflux: tasks/ の変更 ${taskDelta.length} 件を除外しました(作業記録は還元しない — HH-081 段階3)。`);
  }
  const errs = outboundValidationErrors();
  if (errs.length) {
    console.error(`reflux: cherry-pick 後 validate に ${errs.length} error。push せず ${branch} へ戻ります。staging branch ${prBranch} を手動是正してください。`);
    for (const e of errs) console.error(`  ${e.code}: ${e.message}`);
    git(["checkout", branch]); process.exitCode = 1; return;
  }
  const state = publishPullRequest({
    command: "reflux",
    branch: prBranch,
    title: `SYNC: ${branch} framework reflux (${candidates.length} commits)`,
    body: `HyperHelix reflux generated this PR after framework-only classification and validate passed.\n\nSource: ${branch}\nCandidates: ${candidates.length}\nDirect pushes to main are forbidden by the HH-060/069/070 honor-based tool contract.`,
    governed,
  });
  try { git(["checkout", branch]); }
  catch {
    console.error(`reflux: PR処理後に ${branch} へ戻れませんでした。現在branchを確認してください。`);
    process.exitCode = 1;
    return;
  }
  console.log(`reflux: ${branch} へ戻りました(PR state=${state})。`);
}


// LEDGER_ID_UNIQUE: a line-oriented merge does NOT preserve ID uniqueness. When two
// branches append rows to the same ID ledger in different orders, git resolves it as an
// append and produces DUPLICATE IDs with no conflict marker and a clean `git status`
// (measured 2026-08-23: merging origin/main silently produced 23 AP rows with AP-013 /
// AP-015 / AP-016 / AP-017 twice). Ledgers whose reader keys by id — readArchiveIndex()
// builds a Map — collapse duplicates instead of reporting them, so the corruption is
// invisible from every direction except counting the ids.
// Registry (HH ids) and knowledge (note ids) already have their own duplicate checks;
// these two had none.
// LIMIT — this guard checks UNIQUENESS ONLY. It does NOT catch a reference left dangling
// by a RENUMBER: after AP-017 was renumbered to AP-020 (2026-08-23 main merge), the ids
// stayed unique while 11 historical records kept citing "AP-017", which now means a
// different pattern. Those citations are deliberate (history is never rewritten), and a
// reference-integrity check would fail all of them, so it is NOT added here — the fix
// would be an allowlist, i.e. another ledger. If a renumber ever happens again, record it
// in the renumbered row (as AP-020 does); do not expect this guard to notice.
const ID_LEDGERS = [
  { file: "assets/ai/anti-patterns.md", pattern: /^\|\s*(AP-\d{3})\s*\|/gm, label: "anti-pattern id" },
  { file: "tasks/INDEX.md", pattern: /^\|\s*(TASK-[A-Za-z0-9-]+)\s*\|/gm, label: "archived task id" },
];

function validateLedgerIdUniqueness() {
  const issues = [];
  for (const ledger of ID_LEDGERS) {
    if (!fs.existsSync(path.join(root, ledger.file))) continue;
    const seen = new Map();
    for (const match of readFile(ledger.file).matchAll(ledger.pattern)) {
      seen.set(match[1], (seen.get(match[1]) || 0) + 1);
    }
    for (const [id, count] of seen) {
      if (count > 1) {
        issues.push(error("LEDGER_ID_UNIQUE", `${ledger.file}: ${ledger.label} '${id}' appears ${count} times — a line-merge duplicated it (no conflict marker is produced; count ids after every merge)`));
      }
    }
  }
  return issues;
}


// HH-075: the tool<->doc and check<->doc guards moved to the typed-edge
// registry (tools/lib/edge-model.mjs) with their codes unchanged.


// HH-075: the note schema<->data guard moved to the typed-edge registry
// (tools/lib/edge-model.mjs) with its code unchanged.

// --- consolidation-report (HH-040): redundancy / staleness HINTS for the framework-review
// R8 "consolidation" lens. Informational (no exit code), like cost-report. It only PROPOSES
// candidates; actual merge / delete / rule-rewrite stays an HH proposal + human gate (routing
// mass-consolidation). Signals mirror the debt an accreting rule-set grows: parallel HH growth,
// stale deprecated procedures, fragmented notes, rule-surface bloat, unburned backlog. ---
const CONSOLIDATION_ANCHORS = ["R6", "R7d", "R7", "S4", "P6", "D5", "D2b", "project_scope", "STOPPED", "archive-briefs"];
const PROJECT_SLUGS = ["Project001", "Project002", "Project004"];
// writeBaseline: costReport と同じ規約(既定 = 読み取り専用)。TASK-20260715-005。
function consolidationReport({ writeBaseline = false, full = false } = {}) {
  console.log(`HyperHelix consolidation-report (HH-040 / R8; ${full ? "full" : "bounded"})\n`);

  // R8b — amendment supersession: HH bodies sharing a live anchor (>=3 = collapse candidate).
  // SC-04: the report reads the governance registry + per-HH body files; keyword
  // stats over body TEXT stay informational — lifecycle state comes from the registry.
  console.log("R8b 統廃合候補(amendment supersession):");
  let any8b = false;
  const governance = loadGovernanceRegistry(root);
  const hhBodies = governance.ok
    // HH:ARCH-ALLOW reason="R8 hints read the verbatim HH body prose — bodies are display text, never machine state"
    ? governance.value.entries.map((e) => ({ id: e.id, body: readFile(`${GOVERNANCE_CONTRACT.bodiesDir}/${e.id}.md`) }))
    : [];
  if (!full) {
    console.log("  (bounded default: R8bはperiodic/triggered --full sweepで評価)");
    any8b = true;
  }
  for (const a of full ? CONSOLIDATION_ANCHORS : []) {
    const hits = hhBodies.filter((h) => new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(h.body)).map((h) => h.id);
    if (hits.length >= 3) { console.log(`  anchor '${a}': ${hits.length} HH 触れる — ${hits.join(", ")}(共通方針へ集約候補)`); any8b = true; }
  }
  const explicitSupersedes = full && governance.ok
    ? governance.value.entries.filter((e) => e.supersedes.length).map((e) => `${e.id}→${e.supersedes.join(",")}`)
    : [];
  if (explicitSupersedes.length) { console.log(`  supersedes(registry): ${explicitSupersedes.join(", ")}`); any8b = true; }
  const superseded = full ? hhBodies.filter((h) => /superseded|supersede|reactivat|STOPPED|再活性|巻き戻|統合済|implemented/i.test(h.body)).map((h) => h.id) : [];
  if (superseded.length) { console.log(`  supersession 言及: ${superseded.join(", ")}`); any8b = true; }
  if (full && !governance.ok) {
    for (const message of governance.errors) { console.log(`  registry error: ${message}`); any8b = true; }
  } else if (full) {
    for (const message of amendmentsViewDrift(root).errors) { console.log(`  lifecycle drift: ${message}`); any8b = true; }
  }
  if (!any8b) console.log("  (なし)");

  // R8a — stale deprecated procedures: DEPRECATED banner + imperative words after it.
  console.log("\nR8a stale deprecated(硬アーカイブ候補):");
  const staleHits = [];
  const walkDir = (rel, exts, fn) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = `${rel}/${ent.name}`;
      if (ent.isDirectory()) walkDir(childRel, exts, fn);
      else if (exts.some((e) => ent.name.endsWith(e))) fn(childRel);
    }
  };
  const scanStale = (childRel) => {
    const lines = readFile(childRel).split(/\r?\n/);
    if (/deprecated/i.test(lines.slice(0, 10).join("\n")) && /\b(Fires|Run|Reset|MUST|Execute)\b|発火|実行手順/.test(lines.slice(10).join("\n"))) staleHits.push(childRel);
  };
  walkDir("core", [".yaml", ".md"], scanStale); walkDir("assets", [".md"], scanStale);
  console.log(staleHits.length ? staleHits.map((f) => `  ${f}: DEPRECATED 宣言後に命令形手順が残存`).join("\n") : "  (なし)");

  // R8a — note merge candidates: active notes, same project scope, sharing >=2 tags.
  // SC-05b: notes through the knowledge repository (report is informational, so a
  // broken canon degrades to an error line instead of a crash).
  const knowledgeState = loadKnowledge(root);
  if (!knowledgeState.ok) for (const message of knowledgeState.errors) console.log(`  knowledge canon error: ${message}`);
  const notes = knowledgeState.ok ? knowledgeState.value.notes : [];
  const active = notes.filter((n) => n.state === "active");
  // HH-045: notes already organized under a playbook are consolidated BY DESIGN —
  // a playbook shares tags with its leaves on purpose. Skip playbook↔its-leaf and
  // sibling-leaves-of-the-same-playbook so the index tier does not pollute the report.
  const alreadyOrganized = (X, Y) =>
    X.topic === Y.id || Y.topic === X.id ||
    (X.topic && X.topic === Y.topic) ||
    (X.leaves || []).includes(Y.id) || (Y.leaves || []).includes(X.id);
  // Generic tags (carried by >=20% of a project's active notes, e.g. `Project001`,
  // `browser-extension`, `framework`) say nothing about a shared TOPIC; counting them
  // filled the decision set with ~1,500 false pairs (backlog measurement-gap row,
  // 2026-10-02 /cycle ordinal 18). Only topical tags count toward the >=2 threshold.
  const GENERIC_TAG_SHARE = 0.2;
  const tagCounts = new Map();
  const projectSizes = new Map();
  for (const note of active) {
    const project = note.project || "shared";
    projectSizes.set(project, (projectSizes.get(project) || 0) + 1);
    for (const tag of new Set((note.tags || []).map((t) => String(t).toLowerCase()))) {
      const key = `${project}\u0000${tag}`;
      tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
    }
  }
  const isGeneric = (project, tag) => (tagCounts.get(`${project}\u0000${tag}`) || 0) >= GENERIC_TAG_SHARE * (projectSizes.get(project) || 0)
    && (projectSizes.get(project) || 0) >= 5;
  const pairs = [];
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const A = active[i], B = active[j];
    const project = A.project || "shared";
    if (project !== (B.project || "shared")) continue;
    if (alreadyOrganized(A, B)) continue;
    const ta = new Set((A.tags || []).map((t) => String(t).toLowerCase()));
    const shared = (B.tags || []).map((t) => String(t).toLowerCase()).filter((t) => ta.has(t) && !isGeneric(project, t));
    if (shared.length >= 2) pairs.push(`${A.id}~${B.id} [${project}] 共有tag: ${shared.join(",")}`);
  }
  console.log("\nR8a ノート merge 候補(同 project・tag 重複>=2):");
  const pairLimit = full ? pairs.length : 5;
  console.log(pairs.length ? pairs.slice(0, pairLimit).map((p) => `  ${p}`).join("\n")
    + (pairs.length > pairLimit ? `\n  ...他 ${pairs.length - pairLimit} 対 (${full ? "" : "--fullで全件"})` : "") : "  (なし)");

  // R8a — rule-surface bloat + mis-scoped shared notes.
  console.log("\nR8a 規則表面 bloat / mis-scope:");
  const big = [];
  walkDir("core", [".yaml", ".md"], (r) => { const n = lineCount(r); if (n > 300) big.push(`  ${r}: ${n} 行(>300・tier/appendix 候補)`); });
  walkDir("assets", [".md"], (r) => { const n = lineCount(r); if (n > 300) big.push(`  ${r}: ${n} 行(>300・tier/appendix 候補)`); });
  const misScoped = active.filter((n) => (n.project || "shared") === "shared" && PROJECT_SLUGS.some((s) => new RegExp(s, "i").test((n.text || "") + " " + (n.tags || []).join(" ")))).map((n) => n.id);
  if (misScoped.length) big.push(`  shared なのに project 語混入: ${misScoped.join(", ")}(再スコープ候補)`);
  console.log(big.length ? big.join("\n") : "  (なし)");

  // R8c — backlog burn-down input with convergence trend.
  const bl = fs.existsSync(path.join(root, "docs/process-backlog.md")) ? readFile("docs/process-backlog.md") : "";
  let branchName = "";
  try { branchName = git(["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
  const mainLineage = branchName === "main" || branchName.startsWith("hyperhelix/");
  const backlogCount = countOpenBacklogItems(bl, { mainLineage });
  const prevBl = knowledgeState.ok ? (knowledgeState.value.counters.last_backlog_open_count ?? null) : null;
  if (!backlogCount.ok) {
    console.error("\nR8c process-backlog 焼却対象: 集計不能(backlog contract violation)");
    for (const message of backlogCount.errors) console.error(`  - ${message}`);
    process.exitCode = 1;
  } else {
    const openItems = backlogCount.count;
    const blDiff = prevBl === null ? null : openItems - prevBl;
    const blDiffStr = blDiff === null ? '初回計測・ベースライン記録' :
      blDiff > 0 ? `前回比 +${blDiff} ▲ (backlog 増加)` :
      blDiff < 0 ? `前回比 ${blDiff} ▼ (焼却進行)` : '前回比 ±0 →';
    const refSuffix = backlogCount.referenceCount ? ` / ref ${backlogCount.referenceCount} 件(集計外)` : "";
    const destSuffix = !backlogCount.mainDestinedCount ? ""
      : mainLineage
        ? ` / うち dest:main ${backlogCount.mainDestinedCount} 件(main 系ブランチのため焼却対象)`
        : ` / うち dest:main ${backlogCount.mainDestinedCount} 件(この branch では焼却不能・burn 義務外)→ **このブランチで焼却可能 ${backlogCount.burnableHereCount} 件**`;
    console.log(`\nR8c process-backlog 焼却対象: open ${openItems} 件${refSuffix}${destSuffix}  [${blDiffStr}]`);
    const selected = selectOpenBacklogItems(bl, { full, mainLineage });
    if (selected.ok) {
      console.log(`  decision set: ${selected.items.length}/${selected.total} 件${full ? " (full)" : " (priority上位; --fullで全件)"}`);
      for (const item of selected.items) console.log(`  ${item.text}`);
    }
    if (writeBaseline) {
      const written = setBaselineCounter(root, "last_backlog_open_count", openItems);
      if (!written.ok) {
        for (const message of written.errors) console.error(`consolidation-report: ${message}`);
        process.exitCode = 1;
      }
    } else if (prevBl !== null && openItems !== prevBl) {
      console.log(`  (baseline ${prevBl} は未更新 — 記録するには --write-baseline を付ける。/cycle 以外の探索実行はトレンドを消費しない)`);
    }
  }

  console.log("\n注: 候補の提案のみ。実 merge/削除/規則書換は HH 提案 + 人間ゲート(routing mass-consolidation)。");
}

function help() {
  console.log(`HyperHelix tools (HH-016 note-ledger model)

Usage:
  node tools/hyperhelix.mjs validate
  node tools/hyperhelix.mjs verify (--staged | --base <ref>)
  node tools/hyperhelix.mjs contract-doc [--check]
  node tools/hyperhelix.mjs amendments-doc [--check]
  node tools/hyperhelix.mjs migrate-canon (--check | --apply) [--domain governance,knowledge]
  node tools/hyperhelix.mjs bump   --task <task-id> [--use NOTE-ID,...] [--miss NOTE-ID,...] [--review [--review-source SOURCE]] [--dry-run]
  node tools/hyperhelix.mjs brief  (--task <task-id> | --date YYYYMMDD) [--mode standard] [--title "..."] [--dry-run]
  node tools/hyperhelix.mjs finish --task <task-id> [--use ...] [--miss ...] [--review [--review-source SOURCE]] [--path a,b] --message "<message with hh-record>" [--commit]
  node tools/hyperhelix.mjs cost-report [--write-baseline] [--full]
  node tools/hyperhelix.mjs capture-plan --trigger <fixed-trigger> --artifact <non-governance|pending-hh> --captured-artifact <path> [--current-task ID --current-depth MODE --scope-included] [--write-overlap]
  node tools/hyperhelix.mjs review-snapshot
  node tools/hyperhelix.mjs review-check --baseline <external-json> --journal <external-json> [--isolated]
  node tools/hyperhelix.mjs sync   [--dry-run]
  node tools/hyperhelix.mjs bootstrap --project <slug> [--host <dir>] [--base main] [--dry-run]
  node tools/hyperhelix.mjs install-commands --to <hostdir> [--nest <relpath>] [--dry-run]
  node tools/hyperhelix.mjs update-codex-skill [--to <skillsdir>] [--dry-run|--check]
  node tools/hyperhelix.mjs reflux [--apply]
  node tools/hyperhelix.mjs consolidation-report [--write-baseline] [--full]
  node tools/hyperhelix.mjs next-id
  node tools/hyperhelix.mjs next-hh-id [--offline]
  node tools/hyperhelix.mjs adopt-notes
  node tools/hyperhelix.mjs notes  --tags a,b [--project slug] [--n N]
  node tools/hyperhelix.mjs compact-prep --sid <session_id> [--refresh]
  node tools/hyperhelix.mjs wo-watch <output-file> [--stall 180] [--budget 600] [--done-marker <regex>] [--pid <pid>]

Commands:
  validate   Check required files, entrypoints, schemas, counters, notes,
             the active-term scan (HH-016 removed vocabulary),
             GATE_DEAD_CONFIG (unconsumed gate params), PHASE_CONSISTENCY
             (loop phase_gate evidence <-> phase artifacts; HH-036), and
             STEP_CONSISTENCY (required_steps reference defined phase steps; HH-037).
  verify     Run the fail-closed L1 Structure -> L2 Contract -> L3 Behavior ->
             L4 Evidence chain. --base <ref> checks every commit's hh-record against its
             own changes (pre-push / CI); finish runs --staged with the record from --message.
  contract-doc  Generate docs/generated/contracts.md deterministically from
             core/contracts.json; --check exits non-zero on missing or stale output.
  amendments-doc  Generate amendments.md deterministically from the governance
             canon (governance/amendments/ registry + bodies + view template;
             SC-04/HH-067); --check exits non-zero on drift or an invalid canon.
  migrate-canon  SC-06 domain migration/epoch closure. Per domain (governance /
             knowledge) it reads the legacy surface READ-ONLY,
             checks the structured canon, and reports total / converted /
             equivalent / rejected / legacy-live (invariant: total = converted +
             rejected). --check writes nothing and exits non-zero unless green;
             --apply repairs generated-view drift only, advances dual-read
             each selected green domain one safe epoch step (pre-parity domains
             jump to semantic-parity-confirmed), then refreshes the contract doc.
  bump       Apply one task's deltas: task_index +1 (idempotent per --task;
             re-run on the SAME task applies --use/--miss/--review only =
             late attribution, per-note idempotent; older tasks cannot be
             late-attributed — the guard only knows the latest bump);
             --use/--miss nudge a note strength +/-1; --review sets last_framework_review;
             --review-source records caller provenance (default: neutral "framework review").
  brief      Claim the next free NNN for --date, or take an explicit --task (TASK-… or
             GH-<n>). Writes no task file (HH-081): the exclusive claim sidecar is the lock,
             and an hh-record skeleton is printed for the commit message.
             Prints a per-claim session token; pass it to finish --sid (AP-016 guard).
             --date allocation also scans the HOST repo log in nested layouts.
  finish     Compose completion: preflight validate/secret-scan -> [irreversible]
             idempotent bump -> final validate/secret-scan -> commit.
             --message must carry one hh-record block naming --task; framework paths
             require its contract_impact / framework_check rows, notes.applied must be
             attributed via --use/--miss. Aborts before irreversible work on gaps.
             --commit performs the git commit; without it finish is a dry run.
             --sid <token> proves claim ownership (token printed by brief at claim time);
             REQUIRED when the claim sidecar exists — fails closed on mismatch (AP-016).
  cost-report Structural cost for R7 (HH-026): startup and /cycle mandatory read-sets
             (delta default; --full inventories every workflow; missing delta provenance
             falls back to full),
             index-read heads, CLI-reachable tooling surface (with inclusion/exclusion
             reasons), unindexed mandatory bulk (>300 lines, no index), and large-material
             growth. The ratchet gauge is startup-read characters = always-read +
             index-read heads (HH-073/082). Read-only unless --write-baseline (/cycle only).
  capture-plan HH-068 read-only classifier for a significant-discovery capture.
             It selects standard for non-governance artifacts and full for Pending HH,
             permits folding only into a sufficiently deep in-scope non-overlapping
             current task, and emits the capture/remediation linkage skeleton.
  review-snapshot  HH-068 read-only baseline JSON: HEAD, porcelain-v1 path state,
             content/index fingerprints, and digest. Save it outside the repository.
  review-check  HH-068 fail-closed review-only verdict from an external baseline and
             digest-bound ownership journal. Exit 0=review-only, 2=task-required,
             3=unverified. --isolated requires exact start/end equality.
  sync       Automated B->A framework sync vs origin/main (HH-034/060/069/070): fetch -> ff
             take-in if behind -> validate -> dedicated branch push -> PR if ahead.
             Non-governance PRs wait for checks and self-merge; governance paths also
             wait for checks, then stop for human manual merge (same publisher allowed;
             CODEOWNER approval is not required).
             Never pushes main or uses admin bypass. Branch protection is optional;
             without it, direct-main/force-push prohibitions are honor-based.
             STOPS on divergence / validate error / rejected push. --dry-run plans only.
  bootstrap  One-shot project adoption (run from the HyperHelix root): switch to or
             create project/<slug> from --base (default main; warns when behind
             origin), reflect launchers into the host root (--host, default the
             parent dir), gitignore the nested root in the host repo, validate,
             and print the entrypoint.md reading order (HH-059 canon). Idempotent; --dry-run plans only.
  install-commands  Reflect the .claude/commands launchers (both commands/*.md and
             commands/skills/*.md, flattened to the host's .claude/commands/) into a
             host working-dir root (--to <hostdir>). Verbatim copy, or with --nest
             <relpath> write thin redirect launchers pointing at the nested
             HyperHelix root. --dry-run plans only.
  update-codex-skill  Regenerate the personal Codex skill
             hyperhelix-commands under CODEX_HOME/skills (or ~/.codex/skills).
             The skill is thin and points back to live repo commands/materials so
             autocomplete metadata can be refreshed after HyperHelix changes.
             --check exits non-zero when the installed skill is stale or invalid.
  reflux     Project->main framework-knowledge reflux (run ON a project/variant branch):
             classify origin/main..HEAD commits as framework-only vs project; --apply stages
             the framework-only ones on an origin/main-based PR branch (cherry-pick),
             validates, and publishes a PR (HH-034/060 path). Dry-run by default; a counter-only conflict auto-resolves by
             high-water max (HH-057), other conflicts hand off to
             assets/workflows/sync-conflict-guide.md.
  next-id    Generate a permanent note id (HH-064): N-<proj>-<YYYYMMDD><letters>.
             The branch-derived slug and creation-time suffix make new-note ids
             collision-free; it checks local and origin/main ledgers best-effort.
  next-hh-id Fetch origin and return max(local, origin/main, open origin/hyperhelix/* PR
             branches)+1 as HH-NNN. PR-branch scan is advisory best-effort (unreadable
             branch registries are skipped, never fail-closed); origin/main stays the
             sole fail-closed authority. Fetch/show failure against origin/main is
             nonzero; --offline explicitly allows local-only fallback (skips PR scan too).
  adopt-notes  Deprecated compatibility alias. Prints permanent-id migration guidance;
             never rewrites ids or files. Reflux validates permanent ids before push.
  wo-watch   HH-063 §9e mechanized: wo-watch <output-file> [--stall 180] [--budget 600]
             [--done-marker <regex>] [--pid <pid>]. Watches a dispatched WO's output for
             liveness — echoes new [WO-BEAT] lines; [WO-DONE] exit 0 on the done marker
             (default LINE-ANCHORED "^[WO-DONE]|^tokens used" — codex echoes the WO
             prompt, an unanchored marker false-fires at 0s); [WO-STALL] exit 2 after
             --stall seconds with no new output (hang -> §9c; NOTE codex block-buffers
             ~8KB on redirect, so verify process liveness before killing — pass --pid to
             automate this: quiet-but-alive logs [WO-QUIET] and keeps watching);
             [WO-BUDGET] exit 3 when --budget elapses while output still grows (§9b:
             extend once or judge). Run in the background right after dispatching.
             Git Bash: pass the WINDOWS pid (cat /proc/$!/winpid) — the MSYS $! pid is
             invisible to node's process.kill(pid, 0).
  notes      S2 retrieval as a batch tool: notes --tags a,b [--project slug] [--n N].
             Applies the S2 rules deterministically (active only, current+shared scope
             HH-032, playbooks first HH-045, last_used desc, gates.search.top_n cap) and
             prints exactly the matching notes — no grepping the full ledger.
  compact-prep  Generate the /compact state-file skeleton: compact-prep --sid <session_id> [--refresh].
             Writes .claude/tmp/compact-state/<sid>.md (project-local runtime dir,
             git-ignored) with the 10 required
             headings (incl. Distill Inbox, HH-062) + mechanical prefill
             (branch/HEAD/status/counters). Default never overwrites; --refresh updates only
             generated mechanical fields and preserves semantic sections. --sid is a hard gate
             (no guessed filenames). The model fills the FILL markers.
  consolidation-report (HH-040) Redundancy / staleness HINTS for the framework-review R8
             (bounded default: note/backlog top 5 each; --full emits all candidates),
             consolidation lens: amendment supersession clusters + lifecycle drift, stale
             deprecated procedures, note merge candidates, rule-surface bloat / mis-scoped
             notes, backlog burn-down count. Informational; record at R8. Proposes only —
             mass merge/delete/rule-rewrite stays an HH proposal + human gate.
`);
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") return help();
  if (command === "validate") {
    const errors = printIssues(validate());
    process.exitCode = errors > 0 ? 1 : 0;
    return;
  }
  if (command === "verify") return verify(args);
  if (command === "contract-doc") return contractDoc(args);
  if (command === "amendments-doc") return amendmentsDoc(args);
  if (command === "migrate-canon") return migrateCanonCli(args);
  if (command === "bump") return bump(args);
  if (command === "finish") return finish(args);
  if (command === "brief") return brief(args);
  if (command === "cost-report") return costReport({
    writeBaseline: args.includes("--write-baseline"),
    fullCycle: args.includes("--full"),
  });
  if (command === "capture-plan") return capturePlanCli(args);
  if (command === "review-snapshot") return reviewSnapshotCli(args);
  if (command === "review-check") return reviewCheckCli(args);
  if (command === "sync") return sync(args);
  if (command === "bootstrap") return bootstrap(args);
  if (command === "install-commands") return installCommands(args);
  if (command === "update-codex-skill") return updateCodexSkill(args);
  if (command === "reflux") return reflux(args);
  if (command === "consolidation-report") return consolidationReport({
    writeBaseline: args.includes("--write-baseline"),
    full: args.includes("--full"),
  });
  if (command === "next-id") return nextId();
  if (command === "next-hh-id") return nextHhId(args);
  if (command === "adopt-notes") return void adoptNotes();
  if (command === "wo-watch") return woWatch(args);
  if (command === "notes") return notesSearch(args);
  if (command === "compact-prep") return compactPrep(args);
  help();
  process.exitCode = 1;
}

// Only run the CLI when invoked directly (so tests can `import` the pure helpers).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
