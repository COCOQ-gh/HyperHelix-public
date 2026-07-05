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

const root = process.cwd();
const KNOWLEDGE = "core/knowledge.yaml";
const GATES = "core/gates.yaml";
const requiredFiles = [
  "constitution.md",
  "amendments.md",
  "core/loop.yaml",
  "core/routing.yaml",
  KNOWLEDGE,
  GATES,
  "AGENTS.md",
  "CLAUDE.md",
];
const validStates = new Set(["active", "archived"]);

function readFile(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

function git(args, options = {}) {
  return execFileSync("git", ["-c", "core.excludesfile=", ...args], { cwd: root, ...options });
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

// --- minimal YAML readers (fixed schema, not a general parser) ---

function schemaVersion(text) {
  const m = text.match(/^schema_version:\s*(\d+)/m);
  return m ? Number(m[1]) : undefined;
}

function counter(text, key) {
  const re = new RegExp(`^  ${key}:\\s*(-?\\d+)`, "m");
  const m = text.match(re);
  return m ? Number(m[1]) : undefined;
}

function parseNotes(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^notes:\s*$/.test(l));
  const notes = [];
  if (start === -1) return { notes, lines, notesStart: -1 };
  let cur = null;
  let i = start + 1;
  for (; i < lines.length; i += 1) {
    const l = lines[i];
    if (/^[^\s#]/.test(l)) break; // next top-level key ends the notes block
    const idm = l.match(/^  - id:\s*(\S+)/);
    if (idm) {
      if (cur) notes.push(cur);
      cur = { id: idm[1], line: i + 1, lineNumbers: { id: i } };
      continue;
    }
    if (!cur) continue;
    const fm = l.match(/^    ([a-z_]+):\s*(.*)$/);
    if (!fm) continue;
    const [, k, rawV] = fm;
    cur.lineNumbers[k] = i;
    const v = rawV.trim();
    if (k === "strength" || k === "last_used") cur[k] = Number(v);
    else if (k === "state") cur.state = v;
    else if (k === "tags") cur.tags = v.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "text") cur.text = v.replace(/^"|"$/g, "");
    else if (k === "project") cur.project = v;   // HH-032: optional scope (absent = shared)
    else if (k === "kind") cur.kind = v;         // HH-045 index tier: playbook | leaf
    else if (k === "topic") cur.topic = v;       // HH-045 leaf -> its playbook id
    else if (k === "leaves") cur.leaves = v.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean); // HH-045 playbook -> leaf ids
  }
  if (cur) notes.push(cur);
  return { notes, lines, notesStart: start };
}

// --- task-list validation (unchanged from prior tool; orthogonal and useful) ---

function taskBriefFiles() {
  const dir = path.join(root, "tasks");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => /^TASK-\d{8}-\d{3}\.md$/.test(name))
    .sort()
    .map((name) => path.join("tasks", name));
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
}

function isMarkdownSeparator(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseMarkdownTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  for (let i = 0; i < lines.length - 1; i += 1) {
    const header = splitMarkdownRow(lines[i]);
    const separator = splitMarkdownRow(lines[i + 1]);
    if (!header || !separator || header.length !== separator.length || !isMarkdownSeparator(separator)) continue;
    const rows = [];
    let end = i + 2;
    for (; end < lines.length; end += 1) {
      const cells = splitMarkdownRow(lines[end]);
      if (!cells || cells.length !== header.length) break;
      rows.push({ cells, line: end + 1 });
    }
    tables.push({ header, rows, line: i + 1 });
    i = end - 1;
  }
  return tables;
}

function validateTaskLists() {
  const issues = [];
  const requiredColumns = ["id", "order", "title", "status", "depends_on", "acceptance_check", "evidence"];
  const validStatuses = new Set(["todo", "doing", "blocked", "done", "deferred", "canceled"]);

  for (const file of taskBriefFiles()) {
    const text = readFile(file);
    if (!text.includes("Task-list schema:")) continue;
    const tables = parseMarkdownTables(text);
    const taskLists = tables.filter((table) => requiredColumns.every((column) => table.header.includes(column)));
    if (taskLists.length === 0) {
      issues.push(error("TASK_LIST", `${file} references task-list schema but has no task-list table`));
      continue;
    }
    for (const table of taskLists) {
      const index = new Map(table.header.map((column, i) => [column, i]));
      const ids = new Set();
      let doingCount = 0;
      for (const row of table.rows) {
        const get = (column) => row.cells[index.get(column)] ?? "";
        const id = get("id");
        const where = row.line;
        if (!/^TL-\d{3}$/.test(id)) issues.push(error("TASK_LIST", `${file}: task-list id '${id}' must be TL-NNN`, where));
        if (ids.has(id)) issues.push(error("TASK_LIST", `${file}: duplicate task-list id '${id}'`, where));
        ids.add(id);
        if (!/^[1-9]\d*$/.test(get("order"))) issues.push(error("TASK_LIST", `${file}: ${id} order must be a positive integer`, where));
        if (!validStatuses.has(get("status"))) issues.push(error("TASK_LIST", `${file}: ${id} status '${get("status")}' is not valid`, where));
        if (get("status") === "doing") doingCount += 1;
        if (get("depends_on") === "") issues.push(error("TASK_LIST", `${file}: ${id} depends_on is required`, where));
        if (get("acceptance_check") === "" && get("status") !== "deferred" && get("status") !== "canceled") {
          issues.push(error("TASK_LIST", `${file}: ${id} acceptance_check is required`, where));
        }
        if (get("evidence") === "") issues.push(error("TASK_LIST", `${file}: ${id} evidence is required`, where));
        if (get("status") === "done" && ["pending", "—", "-"].includes(get("evidence"))) {
          issues.push(error("TASK_LIST", `${file}: ${id} done rows must point evidence at a result`, where));
        }
      }
      if (doingCount > 1) issues.push(error("TASK_LIST", `${file}: at most one task-list row may be doing`, table.line));
      for (const row of table.rows) {
        const id = row.cells[index.get("id")] ?? "";
        const dependsOn = row.cells[index.get("depends_on")] ?? "";
        if (dependsOn === "none" || dependsOn === "") continue;
        for (const dep of dependsOn.split(",").map((p) => p.trim()).filter(Boolean)) {
          if (!ids.has(dep)) issues.push(error("TASK_LIST", `${file}: ${id} depends on unknown row '${dep}'`, row.line));
        }
      }
    }
  }
  return issues;
}

// --- active scan: removed/old-term drift detection (改善アイデア.md 案3) ---
// Scans ACTIVE materials for HH-016-removed vocabulary. History (amendments.md,
// tasks/**), DEPRECATED-marked files, fenced code blocks, and HH:ACTIVE-SCAN-ALLOW
// regions are excluded. The scanner detects drift in current explanations; it
// never punishes history or the detection spec itself.

const REMOVED_TERMS = [
  { re: /\b(PATTERN|PRINCIPLE|OBSERVATION)\.[A-Z]/, label: "old tiered-material ID (HH-016 replaced materials with N-NNN notes)" },
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
  for (const f of ["README.md", "AGENTS.md", "CLAUDE.md"]) {
    if (fs.existsSync(path.join(root, f))) out.push({ file: f, level: "error" });
  }
  walk("docs", [".md"]);
  walk("assets", [".md"]);
  walk("core", [".yaml"]);
  walk(".claude/commands", [".md"]);
  // tools: removed terms may legitimately appear as string literals -> warn only
  walk("tools", [".mjs"]);
  return out.map((e) => (e.file.startsWith("tools/") ? { ...e, level: "warn" } : e));
}

function activeScan() {
  const issues = [];
  const HISTORY = new Set(["amendments.md"]);
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

const ANCHOR_TOOL_VERSION = 1; // highest anchor version this tool knows how to edit

function parseAnchors(text) {
  const lines = text.split(/\r?\n/);
  const open = /<!--\s*HH:([A-Z0-9_]+)\s+version=(\d+)\s*-->/;
  const close = /<!--\s*\/HH:([A-Z0-9_]+)\s*-->/;
  const anchors = []; // {name, version, startLine, endLine}
  const issues = [];
  let cur = null;
  for (let i = 0; i < lines.length; i += 1) {
    const o = lines[i].match(open);
    const c = lines[i].match(close);
    if (o) {
      if (cur) { issues.push(error("ANCHOR", `nested/unclosed anchor HH:${cur.name} before HH:${o[1]}`, i + 1)); }
      cur = { name: o[1], version: Number(o[2]), startLine: i + 1, endLine: null };
      continue;
    }
    if (c) {
      if (!cur) { issues.push(error("ANCHOR", `closing /HH:${c[1]} without an open`, i + 1)); continue; }
      if (cur.name !== c[1]) { issues.push(error("ANCHOR", `mismatched close /HH:${c[1]} (open was HH:${cur.name})`, i + 1)); }
      cur.endLine = i + 1;
      anchors.push(cur);
      cur = null;
    }
  }
  if (cur) issues.push(error("ANCHOR", `unclosed anchor HH:${cur.name}`, cur.startLine));
  // duplicate same-name anchors in one file are an error (ambiguous edit target)
  const seen = new Map();
  for (const a of anchors) {
    if (seen.has(a.name)) issues.push(error("ANCHOR", `duplicate anchor HH:${a.name}`, a.startLine));
    seen.set(a.name, a);
  }
  return { anchors, issues, lines };
}

function validateAnchors() {
  const issues = [];
  for (const file of taskBriefFiles()) {
    const text = readFile(file);
    if (!/<!--\s*HH:[A-Z0-9_]+\s+version=/.test(text)) continue; // un-anchored brief: skip (legacy)
    issues.push(...parseAnchors(text).issues.map((iss) => ({ ...iss, message: `${file}: ${iss.message}` })));
  }
  return issues;
}

// Replace the body BETWEEN an anchor's open/close markers. Version fail-closed
// (改善アイデア.md 構造問題A): refuse to edit an anchor newer than this tool knows.
// Returns {ok, text} or {ok:false, reason}. Never searches outside the anchor.
function updateAnchorBody(text, name, bodyLines) {
  const { anchors, issues } = parseAnchors(text);
  if (issues.length) return { ok: false, reason: `anchor structure errors: ${issues.map((i) => i.message).join("; ")}` };
  const a = anchors.find((x) => x.name === name);
  if (!a) return { ok: false, reason: `anchor HH:${name} not found (no body search — un-anchored or legacy brief)` };
  if (a.version > ANCHOR_TOOL_VERSION) {
    return { ok: false, reason: `anchor HH:${name} is version ${a.version} > tool ${ANCHOR_TOOL_VERSION}; refusing to edit (fail-closed)` };
  }
  const lines = text.split(/\r?\n/);
  const before = lines.slice(0, a.startLine); // through the open marker
  const after = lines.slice(a.endLine - 1);   // from the close marker
  return { ok: true, text: [...before, ...bodyLines, ...after].join("\n") };
}

function briefPathForTask(taskId) {
  const p = path.join("tasks", `${taskId}.md`);
  return fs.existsSync(path.join(root, p)) ? p : null;
}

// Distill capture closure (HH-043): the most-recent task brief is checked at
// task-close. If it detected a process-failure signal (D2b 検知=有) or is rework
// (手戻り/revert/regression), the lesson MUST be materialized into a durable,
// indexed artifact — a new note (新規 N-NNN), an anti-pattern (AP-NNN), a
// process-backlog queue line, or an amendment (HH-NNN). A bare "参照 N-xxx" is
// NOT closure. Older briefs are grandfathered (only the latest is checked).
function validateDistillCapture() {
  const issues = [];
  const briefs = taskBriefFiles();
  if (briefs.length === 0) return issues;
  const file = briefs[briefs.length - 1];
  const text = readFile(file);
  let detected = false;
  const d2bIdx = text.search(/###\s*D2b\b/);
  if (d2bIdx >= 0) {
    const after = text.slice(d2bIdx);
    const endRel = after.slice(1).search(/\n###\s|\n##\s|<!--\s*HH:D7/);
    const section = endRel >= 0 ? after.slice(0, endRel + 1) : after;
    for (const tbl of parseMarkdownTables(section)) {
      const ki = tbl.header.findIndex((h) => /検知/.test(h));
      if (ki < 0) continue;
      for (const r of tbl.rows) {
        if (/^有/.test((r.cells[ki] || "").trim())) detected = true;
      }
    }
  }
  const reworkKw = /手戻り|リグレッション|regression|revert/i.test(text);
  if (!detected && !reworkKw) return issues;
  const durable = /新規\s*N-\d{3}/.test(text) || /AP-\d{3}/.test(text)
    || /process-backlog|プロセスバックログ/.test(text) || /HH-\d{3}/.test(text);
  if (!durable) {
    issues.push(warn("DISTILL_CAPTURE", `${file}: 失敗/手戻りシグナル(D2b 検知=有 or rework)を検出したが恒久資材(新規 N-NNN / AP-NNN / process-backlog / HH-NNN)が無い — 教訓を資材化、または既存資材で足る場合はその該当文を引用して明示すること(distill.md D6/D7, HH-043)`));
  }
  return issues;
}

// Unresolved merge conflict markers in active materials (HH-044): a botched
// merge/sync can commit `<<<<<<< ` / `>>>>>>> ` lines into a core file and slip
// past every other guard (e.g. SYNC-20260622 left markers in knowledge.yaml,
// undetected until 2026-06-27). Scan column-0 git markers; the bare `=======`
// is skipped to avoid false-positives on markdown setext headings.
function validateConflictMarkers() {
  const issues = [];
  const files = [...new Set([...activeScanFiles().map((e) => e.file), "amendments.md", "constitution.md"])];
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

function validate() {
  const issues = [];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(root, file))) issues.push(error("MISSING_FILE", `${file} is missing`));
  }

  const agents = fs.existsSync(path.join(root, "AGENTS.md")) ? readFile("AGENTS.md") : "";
  const claude = fs.existsSync(path.join(root, "CLAUDE.md")) ? readFile("CLAUDE.md") : "";
  for (const [name, text] of [["AGENTS.md", agents], ["CLAUDE.md", claude]]) {
    if (!text.includes("constitution.md")) {
      issues.push(error("ENTRYPOINT", `${name} must point to constitution.md`));
    }
    if (!text.includes("ルール本体ではありません")) {
      issues.push(warn("ENTRYPOINT", `${name} should explicitly stay non-authoritative`));
    }
  }

  const knowledgeText = readFile(KNOWLEDGE);
  const gatesText = readFile(GATES);
  if (schemaVersion(knowledgeText) !== 1) issues.push(error("SCHEMA", `${KNOWLEDGE} schema_version should be 1`));
  if (schemaVersion(gatesText) !== 1) issues.push(error("SCHEMA", `${GATES} schema_version should be 1`));

  const taskIndex = counter(knowledgeText, "task_index");
  const lastReview = counter(knowledgeText, "last_framework_review");
  const nextNoteId = counter(knowledgeText, "next_note_id");
  for (const [key, val] of [["task_index", taskIndex], ["last_framework_review", lastReview], ["next_note_id", nextNoteId]]) {
    if (!Number.isFinite(val)) issues.push(error("COUNTER", `counters.${key} missing or non-integer`));
  }

  const { notes } = parseNotes(knowledgeText);
  const ids = new Set();
  let maxNum = 0;
  for (const n of notes) {
    const m = n.id?.match(/^N-(\d{3})$/);
    if (!m) issues.push(error("NOTE_ID", `${n.id ?? "<missing>"} must match N-NNN`, n.line));
    else maxNum = Math.max(maxNum, Number(m[1]));
    if (ids.has(n.id)) issues.push(error("NOTE_ID", `${n.id} is duplicated`, n.line));
    ids.add(n.id);
    if (!n.text || n.text.trim() === "") issues.push(error("NOTE_FIELD", `${n.id} text is empty`, n.line));
    if (!Array.isArray(n.tags) || n.tags.length < 1) issues.push(error("NOTE_FIELD", `${n.id} needs >=1 tag`, n.line));
    if (!Number.isFinite(n.strength)) issues.push(error("NOTE_FIELD", `${n.id} strength must be an integer`, n.line));
    if (!Number.isFinite(n.last_used)) issues.push(error("NOTE_FIELD", `${n.id} last_used must be an integer`, n.line));
    if (!validStates.has(n.state)) issues.push(error("NOTE_FIELD", `${n.id} state must be active|archived`, n.line));
  }
  if (Number.isFinite(nextNoteId) && nextNoteId <= maxNum) {
    issues.push(error("COUNTER", `counters.next_note_id=${nextNoteId} must be > max note ${maxNum} (ids never reused)`));
  }

  if (Number.isFinite(taskIndex) && Number.isFinite(lastReview) && taskIndex - lastReview >= 5) {
    issues.push(warn("FRAMEWORK_REVIEW", `task_index=${taskIndex} and last_framework_review=${lastReview}; run assets/checklists/framework-review.md`));
  }

  issues.push(...validateTaskLists());
  issues.push(...activeScan());
  issues.push(...validateAnchors());
  issues.push(...validateAmendmentsIndex());
  issues.push(...validateAmendRatifiedBy());
  issues.push(...validateGateConsumption());
  issues.push(...validatePhaseConsistency());
  issues.push(...validateStepConsistency());
  issues.push(...validateArchiveIndex());
  issues.push(...validateToolDoc());
  issues.push(...validateCheckDoc());
  issues.push(...validateNoteFieldSchema());
  issues.push(...validateDistillCapture());
  issues.push(...validateNoteAttribution());
  issues.push(...validateConflictMarkers());
  return issues;
}

// amendments.md index completeness (HH-024): every `## HH-NNN` body entry must
// have a row in the index table, and vice versa (exact bidirectional match), so
// the index can be read instead of the whole log without missing an entry.
function validateAmendmentsIndex() {
  const issues = [];
  if (!fs.existsSync(path.join(root, "amendments.md"))) return issues;
  const text = readFile("amendments.md");
  const headings = new Set();
  for (const m of text.matchAll(/^##\s+HH-(\d+)\b/gm)) headings.add(Number(m[1]));
  const indexed = new Set();
  for (const m of text.matchAll(/^\|\s*HH-(\d+)\s*\|/gm)) indexed.add(Number(m[1]));
  for (const n of headings) {
    if (!indexed.has(n)) issues.push(error("AMEND_INDEX", `amendments.md: HH-${String(n).padStart(3, "0")} has a body entry but no index row (HH-024)`));
  }
  for (const n of indexed) {
    if (!headings.has(n)) issues.push(error("AMEND_INDEX", `amendments.md: HH-${String(n).padStart(3, "0")} is in the index but has no body entry`));
  }
  return issues;
}

// Ratified-by ATTESTATION-COMPLETENESS guard (HH-042; role clarified by HH-046 arm B):
// every Approved HH entry in 承認済みログ must carry a non-empty **ratified_by:** field.
// This checks ATTESTATION COMPLETENESS (the human's self-attested approval is recorded),
// NOT technical enforcement — on a solo repo the AI holds commit access and could forge
// the field, so governance is honor-based BY DESIGN (constitution 統治の公理). The guard
// catches a MISSING attestation, never a forged one. Warn (not error): non-blocking.
function validateAmendRatifiedBy() {
  const issues = [];
  if (!fs.existsSync(path.join(root, "amendments.md"))) return issues;
  const text = readFile("amendments.md");
  const logIdx = text.indexOf("## 承認済みログ");
  if (logIdx === -1) return issues;
  const logSection = text.slice(logIdx);
  const entries = [...logSection.matchAll(/^## (HH-\d+)\b/gm)];
  for (let i = 0; i < entries.length; i++) {
    const start = entries[i].index;
    const end = i + 1 < entries.length ? entries[i + 1].index : logSection.length;
    const body = logSection.slice(start, end);
    const hhId = entries[i][1];
    if (!/\*\*Status:\*\*\s*Approved/i.test(body)) continue;
    const m = body.match(/\*\*ratified_by:\*\*\s*(.*)/);
    const val = m ? m[1].trim() : "";
    if (!m || val === "" || val.startsWith("(")) {
      issues.push(warn("AMEND_RATIFIED_BY_EMPTY", `amendments.md: ${hhId} is Approved but ratified_by (self-attested approval) is empty — record the human attester (HH-046: attestation completeness, not enforcement)`));
    }
  }
  return issues;
}

// Dead-config guard (AP-003, TASK-20260620-014): every PARAMETER leaf in
// core/gates.yaml (the theta file, amendment-protected) must be consumed somewhere
// in core/assets/tools. A declared-but-unread gate param is dead config (e.g.
// notes.strength_start before HH-033). Mechanical catch for the DETERMINISTIC subset
// of declare<->consume; semantic / omission AP-003 is handled by framework-review R1.
function validateGateConsumption() {
  const issues = [];
  if (!fs.existsSync(path.join(root, GATES))) return issues;
  // indented "  key: scalar" leaf params only (skip top-level keys, lists, comments)
  const params = [...readFile(GATES).matchAll(/^\s{2,}([A-Za-z_]\w*):\s*\S/gm)].map((m) => m[1]);
  if (params.length === 0) return issues;
  const corpus = [];
  const walk = (rel, exts) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = `${rel}/${ent.name}`;
      if (ent.isDirectory()) walk(childRel, exts);
      else if (exts.some((e) => ent.name.endsWith(e)) && childRel !== GATES) corpus.push(readFile(childRel));
    }
  };
  walk("core", [".yaml", ".md"]);
  walk("assets", [".md"]);
  walk("tools", [".mjs"]);
  const hay = corpus.join("\n");
  for (const key of params) {
    if (!hay.includes(key)) {
      issues.push(warn("GATE_DEAD_CONFIG", `core/gates.yaml param '${key}' is declared but referenced nowhere in core/assets/tools — dead config? (AP-003: wire a consumer in the same change, or remove it via a theta amendment)`));
    }
  }
  return issues;
}

// Phase-model consistency (HH-036 / TASK-20260620-022): catch declare<->consume holes
// WITHIN the loop model — a phase produces an artifact that the NEXT phase's gate does
// not check, or a gate references a non-existent artifact. These are exactly the holes
// (plan gate missing retrieved-materials, execute gate missing change-list, evaluate gate
// missing failure-case-log) that NO existing check saw. Mechanical; the semantic
// "checklist says mandatory but required_steps omits it" gap stays in framework-review R1.
function validatePhaseConsistency() {
  const issues = [];
  const text = readFile("core/loop.yaml");
  const PHASES = ["search", "plan", "execute", "evaluate", "distill"];
  const CONDITIONAL = new Set(["risk-list"]);     // HH-036: intentionally not gated by the next phase
  const GATE_ONLY = new Set(["task-request"]);    // gate evidence that is not a produced artifact
  const artLists = [...text.matchAll(/^\s+artifacts:\s*\[([^\]]*)\]/gm)]
    .map((m) => m[1].split(",").map((s) => s.trim()).filter(Boolean));
  const gates = {};
  for (const m of text.matchAll(/^\s+(search|plan|execute|evaluate|distill):\s*\{requires:[^}]*evidence:\s*\[([^\]]*)\]\}/gm)) {
    gates[m[1]] = m[2].split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (artLists.length !== 5 || Object.keys(gates).length !== 5) {
    issues.push(warn("PHASE_CONSISTENCY", `loop.yaml phases/phase_gate could not be parsed (got ${artLists.length} artifact lists, ${Object.keys(gates).length} gates; expected 5 each)`));
    return issues;
  }
  const artByPhase = {}; PHASES.forEach((p, i) => (artByPhase[p] = artLists[i]));
  const allArts = new Set(Object.values(artByPhase).flat());
  // (1) dangling evidence: every gate-evidence name is a real artifact or a gate-only literal
  for (const [phase, ev] of Object.entries(gates)) {
    for (const name of ev) {
      if (!allArts.has(name) && !GATE_ONLY.has(name)) {
        issues.push(error("PHASE_CONSISTENCY", `phase_gate ${phase} evidence '${name}' is not a produced artifact (typo or renamed artifact?)`));
      }
    }
  }
  // (2) coverage: each phase's non-conditional artifacts appear in the NEXT phase's gate
  for (let i = 0; i < PHASES.length - 1; i++) {
    const phase = PHASES[i], next = PHASES[i + 1];
    const nextEv = new Set(gates[next] || []);
    for (const a of artByPhase[phase]) {
      if (!CONDITIONAL.has(a) && !nextEv.has(a)) {
        issues.push(warn("PHASE_CONSISTENCY", `artifact '${a}' produced by ${phase} is not gated by ${next} (declare<->consume gap — add to phase_gate ${next} evidence, or mark conditional; HH-036)`));
      }
    }
  }
  return issues;
}

// Step consistency (HH-037 / TASK-20260620-026): every step id referenced by a depth
// mode's required_steps / minimum_outputs must be DEFINED in the phases block. Catches
// the STRUCTURED subset of step-list drift (e.g. adding S4 to required_steps but never
// defining it). NOTE: it does NOT catch HH-037's actual gap (a step that CONSUMES an
// input no upstream step PRODUCES — anchors) — that semantic cross-phase dependency
// resists a cheap mechanical check and stays in framework-review R1 + the adversarial audit.
function validateStepConsistency() {
  const issues = [];
  const text = readFile("core/loop.yaml");
  const pStart = text.indexOf("\nphases:");
  const pEnd = text.indexOf("\n# --- exceptions");
  const dStart = text.indexOf("depth_modes:");
  const dEnd = text.indexOf("# --- phase gate");
  if (pStart < 0 || pEnd < 0 || dStart < 0 || dEnd < 0) {
    issues.push(warn("STEP_CONSISTENCY", "loop.yaml phases/depth_modes blocks could not be located"));
    return issues;
  }
  const stepRe = /^\s+([SPEVD]\d[a-z]?):\s/gm;
  const defined = new Set([...text.slice(pStart, pEnd).matchAll(stepRe)].map((m) => m[1]));
  const depthBlock = text.slice(dStart, dEnd);
  const referenced = new Set();
  for (const m of depthBlock.matchAll(/(?:required_steps|minimum_outputs):\s*\[([^\]]*)\]/g)) {
    for (const s of m[1].split(",").map((x) => x.trim())) {
      if (/^[SPEVD]\d[a-z]?$/.test(s)) referenced.add(s);
    }
  }
  for (const s of referenced) {
    if (!defined.has(s)) {
      issues.push(error("STEP_CONSISTENCY", `depth_modes references step '${s}' that is not defined in loop.yaml phases (dangling step ref; define it or fix the required_steps/minimum_outputs list)`));
    }
  }
  return issues;
}

// --- cost-report (R7 / HH-026): structural cost measurement for R7a/R7b/R7e.
// Computes the always-read startup cost, flags unindexed mandatory-read bulk
// (>300 lines, no index marker), and lists large active materials for growth
// visibility. Informational (no exit code); the finding is recorded at R7. ---
const COST_THRESHOLD = 300;
function lineCount(rel) {
  return readFile(rel).split(/\r?\n/).length;
}
function hasIndexMarker(rel) {
  const head = readFile(rel).split(/\r?\n/).slice(0, 40);
  return head.some((l) => /索引|目次|\bindex\b|table of contents/i.test(l));
}
function isExcludedBulk(rel) {
  const head = readFile(rel).split(/\r?\n/).slice(0, 20);
  return head.some((l) => /DEPRECATED|HH:ACTIVE-SCAN-ALLOW-FILE/.test(l));
}
function costReport() {
  const out = [];
  // R7a: always-read tier (HH-024 reading order)
  const ALWAYS = ["constitution.md", "core/loop.yaml", "core/routing.yaml", "core/gates.yaml"];
  let alwaysTotal = 0;
  out.push("HyperHelix cost-report (R7 / HH-026)\n");
  out.push("R7a 常時必読 tier (起動固定費):");
  for (const f of ALWAYS) {
    if (!fs.existsSync(path.join(root, f))) continue;
    const n = lineCount(f); alwaysTotal += n;
    out.push(`  ${f}: ${n}`);
  }
  // R7a trend: read previous baseline, compute diff, write new baseline
  const knRaw = readFile(KNOWLEDGE);
  const prevMatch = knRaw.match(/last_always_read_lines:\s*(\d+|null)/);
  const prev = prevMatch && prevMatch[1] !== 'null' ? parseInt(prevMatch[1]) : null;
  const diffStr = prev === null ? '初回計測・ベースライン記録' :
    alwaysTotal - prev > 0 ? `前回比 +${alwaysTotal - prev} ▲` :
    alwaysTotal - prev < 0 ? `前回比 ${alwaysTotal - prev} ▼` : '前回比 ±0 →';
  out.push(`  合計: ${alwaysTotal} 行  [${diffStr}]`);
  const knUpdated = knRaw.replace(/last_always_read_lines:\s*(\d+|null)/, `last_always_read_lines: ${alwaysTotal}`);
  if (knUpdated !== knRaw) fs.writeFileSync(path.join(root, KNOWLEDGE), knUpdated, 'utf8');
  // index-read materials
  out.push("\n索引読み (索引のみ必読):");
  for (const f of ["amendments.md", "core/knowledge.yaml"]) {
    if (!fs.existsSync(path.join(root, f))) continue;
    out.push(`  ${f}: ${lineCount(f)} 行 (索引/ヘッダのみ必読)`);
  }
  // R7b: unindexed mandatory-read bulk
  const MANDATORY = [...ALWAYS, "amendments.md", "core/knowledge.yaml"];
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
  for (const f of ["README.md", "amendments.md"]) if (fs.existsSync(path.join(root, f)) && lineCount(f) > COST_THRESHOLD) large.push(`  ${f}: ${lineCount(f)} 行`);
  out.push(`\nR7e 大型 active 資材 (>${COST_THRESHOLD}行・伸び監視・情報のみ):`);
  out.push(large.length ? large.sort().join("\n") : "  (なし)");
  // brief overhead (per-task trend)
  const briefs = taskBriefFiles();
  const sum = briefs.reduce((a, f) => a + lineCount(f), 0);
  out.push(`\nブリーフ overhead: ${briefs.length} 件, 平均 ${briefs.length ? Math.round(sum / briefs.length) : 0} 行`);
  // HH-032: note project distribution (multi-project accumulation visibility)
  const { notes: knotes } = parseNotes(readFile(KNOWLEDGE));
  const proj = {};
  for (const n of knotes) { const p = n.project || "shared(absent)"; proj[p] = (proj[p] || 0) + 1; }
  out.push(`\nノート project 分布 (HH-032): ${Object.entries(proj).sort().map(([k, v]) => `${k}:${v}`).join(" / ") || "(なし)"}`);
  console.log(out.join("\n"));
}

// --- bump: one task's counter / strength deltas ---
// node tools/hyperhelix.mjs bump --task ID [--use N-00X,...] [--miss N-00X,...] [--review] [--dry-run]
function bump(args) {
  // 事故防止ガード(R4 Finding / TASK-021): --help は説明のみ、--task 無しは
  // カウンタを増やさずエラー終了。bump は task_index を累積する破壊的操作のため、
  // 誤起動(`bump --help` 等)で黙って +1 されると検出困難。
  if (args.includes("--help") || args.includes("-h")) {
    help();
    return;
  }
  const taskI = args.indexOf("--task");
  const taskId = taskI !== -1 && taskI + 1 < args.length ? args[taskI + 1] : null;
  if (!taskId) {
    console.error("bump: --task TASK-YYYYMMDD-NNN は必須です(指定が無い場合 task_index は増やしません)。");
    process.exitCode = 1;
    return;
  }
  const knowledgeText = readFile(KNOWLEDGE);
  const lines = knowledgeText.split(/\r?\n/);
  const dryRun = args.includes("--dry-run");
  const review = args.includes("--review");
  const listArg = (flag) => {
    const i = args.indexOf(flag);
    if (i === -1 || i + 1 >= args.length) return [];
    return args[i + 1].split(",").map((s) => s.trim()).filter(Boolean);
  };
  const uses = listArg("--use");
  const misses = listArg("--miss");
  const log = [];

  // 冪等性ガード(Codex 高所見 / 改善アイデア.md「bump の冪等化」): bump は
  // task_index を累積する不可逆操作。finish が不可逆ゾーンで中断→再実行されると
  // 二重加算しうる。task_index 行のコメント `# +1 <taskId>` が同一 taskId を
  // 記録していれば、このタスクは既に bump 済みとみなし no-op で抜ける。
  const taskIndexLine = lines.find((l) => /^  task_index:\s*-?\d+/.test(l)) ?? "";
  const lastBumpMatch = taskIndexLine.match(/#\s*\+1\s+(\S+)/);
  if (lastBumpMatch && lastBumpMatch[1] === taskId) {
    console.log(`task_index は既に ${taskId} で bump 済み(冪等性ガード)。変更しません。`);
    return;
  }

  const taskIdx = counter(knowledgeText, "task_index");
  const newTaskIndex = Number(taskIdx) + 1;
  const setCounter = (key, val, comment) => {
    const idx = lines.findIndex((l) => new RegExp(`^  ${key}:\\s*-?\\d+`).test(l));
    if (idx === -1) throw new Error(`counter ${key} not found`);
    lines[idx] = `  ${key}: ${val}${comment ? `   # ${comment}` : ""}`;
  };
  setCounter("task_index", newTaskIndex, `+1 ${taskId}`);
  log.push(`task_index ${taskIdx} -> ${newTaskIndex}`);
  if (review) {
    setCounter("last_framework_review", newTaskIndex, `set by /cycle ${taskId} (high-water)`);
    log.push(`last_framework_review -> ${newTaskIndex}`);
  }

  const { notes } = parseNotes(knowledgeText);
  const byId = new Map(notes.map((n) => [n.id, n]));
  const nudge = (id, delta, label) => {
    const n = byId.get(id);
    if (!n) throw new Error(`unknown note in --${label}: ${id}`);
    const sIdx = n.lineNumbers.strength;
    const luIdx = n.lineNumbers.last_used;
    const newStrength = Number(n.strength) + delta;
    lines[sIdx] = `    strength: ${newStrength}`;
    if (luIdx !== undefined) lines[luIdx] = `    last_used: ${newTaskIndex}`;
    log.push(`${id}: strength ${n.strength} -> ${newStrength}, last_used=${newTaskIndex}`);
  };
  for (const id of uses) nudge(id, +1, "use");
  for (const id of misses) nudge(id, -1, "miss");

  console.log(log.join("\n"));

  // --update-brief (案2 D7 auto-summary): write the actual deltas into the brief's
  // HH:D7 anchor. fail-closed: a missing/newer-version anchor is skipped with a
  // warning, never a blind body search.
  const updateBrief = args.includes("--update-brief");
  let briefWrite = null;
  if (updateBrief) {
    const briefPath = briefPathForTask(taskId);
    if (!briefPath) {
      console.log(`\n[update-brief] skipped: tasks/${taskId}.md not found.`);
    } else {
      const briefText = readFile(briefPath);
      const noteSummary = (uses.length || misses.length)
        ? [...uses.map((id) => `${id} +1`), ...misses.map((id) => `${id} -1`)].join(", ")
        : "変更なし";
      const body = [
        `- [x] counters.task_index +1: ${taskIdx} -> ${newTaskIndex}（\`bump --task ${taskId}\`、意味規則の単一権威は core/knowledge.yaml ヘッダ）`,
        `- [x] ノート1手: ${noteSummary}`,
        ...(review ? [`- [x] last_framework_review -> ${newTaskIndex}（--review）`] : []),
        `- [ ] 重要・恒久の教訓は人手で constitution.md / amendments.md へ昇華(HH-016: 自動昇格なし)`,
        `- [ ] \`node tools/hyperhelix.mjs validate\` パス確認`,
        `- [ ] git コミット(\`assets/workflows/git-conventions.md\` 準拠)`,
      ];
      const res = updateAnchorBody(briefText, "D7", body);
      if (!res.ok) {
        console.log(`\n[update-brief] skipped: ${res.reason}`);
      } else {
        briefWrite = { path: briefPath, text: res.text };
      }
    }
  }

  if (dryRun) {
    console.log("\n[dry-run] no files changed.");
    return;
  }
  fs.writeFileSync(path.join(root, KNOWLEDGE), lines.join("\n"), "utf8");
  if (briefWrite) {
    fs.writeFileSync(path.join(root, briefWrite.path), briefWrite.text, "utf8");
    console.log(`Updated ${briefWrite.path} HH:D7 anchor.`);
  }
  console.log(`\nUpdated ${KNOWLEDGE}. Run 'validate' before commit.`);
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
  if (!fs.existsSync(abs)) throw new Error(`path does not exist: ${rel}`);
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

function normalizeStagePaths(paths) {
  const normalized = [];
  const rootAbs = path.resolve(root);
  for (const raw of paths) {
    const rel = String(raw ?? "").trim();
    if (!rel) return { ok: false, reason: "empty --path entry" };
    const abs = path.resolve(root, rel);
    if (abs !== rootAbs && !abs.startsWith(`${rootAbs}${path.sep}`)) {
      return { ok: false, reason: `path escapes workspace: ${rel}` };
    }
    if (!fs.existsSync(abs)) return { ok: false, reason: `path does not exist: ${rel}` };
    normalized.push(path.relative(rootAbs, abs).replace(/\\/g, "/") || ".");
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
function finish(args) {
  if (args.includes("--help") || args.includes("-h")) { help(); return; }
  const taskI = args.indexOf("--task");
  const taskId = taskI !== -1 && taskI + 1 < args.length ? args[taskI + 1] : null;
  if (!taskId) {
    console.error("finish: --task TASK-YYYYMMDD-NNN は必須です。");
    process.exitCode = 1;
    return;
  }
  const doCommit = args.includes("--commit");
  const msgI = args.indexOf("--message");
  const message = msgI !== -1 && msgI + 1 < args.length ? args[msgI + 1] : null;
  const pathI = args.indexOf("--path");
  const extraPaths = pathI !== -1 && pathI + 1 < args.length
    ? args[pathI + 1].split(",").map((s) => s.trim()).filter(Boolean) : [];

  const briefPath = briefPathForTask(taskId);
  const stagePathCheck = normalizeStagePaths([KNOWLEDGE, ...(briefPath ? [briefPath] : []), ...extraPaths]);
  if (!stagePathCheck.ok) {
    console.error(`finish: ${stagePathCheck.reason}。不可逆操作前に中断します(fail-closed)。`);
    process.exitCode = 1;
    return;
  }
  const stagePaths = stagePathCheck.paths;

  // --- abortable zone -------------------------------------------------------
  console.log("[finish] 1/3 validate ...");
  const issues = validate();
  const errs = issues.filter((i) => i.level === "error");
  if (errs.length) {
    printIssues(issues);
    console.error(`\nfinish: validate に ${errs.length} 件のエラー。不可逆操作前に中断します(fail-closed)。`);
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

  if (!doCommit) {
    console.log("\n[finish] pre-flight 通過(validate clean / secret clean)。--commit 未指定のため下書きのみ:");
    console.log(`  staged paths (予定): ${stagePaths.join(" ")}`);
    console.log(`  commit message 下書き: ${message ?? `${taskId}: <一行要約>`}`);
    console.log("  ※ 実行するには再度 --commit --message \"...\" を付けて呼ぶ。bump は冪等。");
    return;
  }
  if (!message) {
    console.error("finish: --commit には --message \"<TASK-...: 要約>\" が必須です。");
    process.exitCode = 1;
    return;
  }

  // --- irreversible zone (only after all abortable checks passed) -----------
  console.log("[finish] 3/3 bump (idempotent) + final checks + commit ...");
  bump(["--task", taskId, "--update-brief", ...sliceFlag(args, "--use"), ...sliceFlag(args, "--miss"), ...(args.includes("--review") ? ["--review"] : [])]);
  const finalIssues = validate();
  const finalErrs = finalIssues.filter((i) => i.level === "error");
  if (finalErrs.length) {
    printIssues(finalIssues);
    console.error(`\nfinish: bump 後の validate に ${finalErrs.length} 件のエラー。commit せず中断します。bump は冪等です。`);
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
    git(["add", "--", ...stagePaths], { stdio: "inherit" });
    git(["commit", "-F", "-"], { input: message, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });
  } catch {
    console.error("finish: git add/commit に失敗。bump は適用済み(冪等)。手動でステージ・コミットしてください。");
    process.exitCode = 1;
    return;
  }
  console.log("[finish] 完了。");
}

function sliceFlag(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 && i + 1 < args.length ? [flag, args[i + 1]] : [];
}

// --- brief (改善アイデア.md 案1): generate a new anchored task brief from the
// template. Claims the next free NNN for a date (concurrency.md §2) or takes an
// explicit --task. Never overwrites an existing brief. ---
const TEMPLATE = "assets/templates/task-brief.md";
const MICRO_TEMPLATE = "assets/templates/task-brief-micro.md";
function brief(args) {
  if (args.includes("--help") || args.includes("-h")) { help(); return; }
  const flag = (name) => {
    const i = args.indexOf(name);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  };
  let taskId = flag("--task");
  const date = flag("--date"); // YYYYMMDD, used to claim next NNN when --task absent
  if (!taskId) {
    if (!/^\d{8}$/.test(date || "")) {
      console.error("brief: --task TASK-YYYYMMDD-NNN か --date YYYYMMDD のどちらかが必須です。");
      process.exitCode = 1;
      return;
    }
    // claim next free NNN for that date (non-contiguous gaps are fine; bump on collision).
    // Sources of consumed NNN (take max across ALL): (1) live tasks/ brief files,
    // (2) git log TASK-DATE-NNN commit headers — this covers briefless micro tasks
    // (HH-047: a micro consumes an id via commit, no brief file) AND archived briefs
    // (HH-031 Phase2: pruned from the working tree). Scanning tasks/ alone re-issues
    // an already-consumed id (observed TASK-20260705-001/003/005 collisions).
    let max = 0;
    const re = new RegExp(`^TASK-${date}-(\\d{3})\\.md$`);
    const dir = path.join(root, "tasks");
    if (fs.existsSync(dir)) {
      for (const name of fs.readdirSync(dir)) {
        const m = name.match(re);
        if (m) max = Math.max(max, Number(m[1]));
      }
    }
    try {
      const log = git(["log", "--format=%s"], { encoding: "utf8" });
      const gre = new RegExp(`\\bTASK-${date}-(\\d{3})\\b`, "g");
      let gm;
      while ((gm = gre.exec(log)) !== null) max = Math.max(max, Number(gm[1]));
    } catch { /* not a git repo / no history — tasks/ scan alone */ }
    taskId = `TASK-${date}-${String(max + 1).padStart(3, "0")}`;
  }
  if (!/^TASK-\d{8}-\d{3}$/.test(taskId)) {
    console.error(`brief: 不正なタスクID '${taskId}'(TASK-YYYYMMDD-NNN)。`);
    process.exitCode = 1;
    return;
  }
  const briefPath = path.join("tasks", `${taskId}.md`);
  if (fs.existsSync(path.join(root, briefPath))) {
    console.error(`brief: ${briefPath} は既に存在します(上書きしません)。`);
    process.exitCode = 1;
    return;
  }
  const mode = flag("--mode") || "standard";
  const project = flag("--project") || "hyperhelix / framework";
  const title = flag("--title") || "";
  const m = taskId.match(/^TASK-(\d{4})(\d{2})(\d{2})-\d{3}$/);
  const dateStr = `${m[1]}-${m[2]}-${m[3]}`;
  // L6: micro mode uses the short template (minimum_outputs only). Other modes
  // use the lean full template.
  const templateFile = mode === "micro" ? MICRO_TEMPLATE : TEMPLATE;
  const template = readFile(templateFile);
  const body = [
    "| 項目 | 内容 |",
    "|------|------|",
    `| タスクID | ${taskId} |`,
    `| 日付 | ${dateStr} |`,
    `| プロジェクト / ジャンル | ${project} |`,
    `| 深度モード | ${mode} |`,
    "| 委任状態 | n/a |",
  ];
  const res = updateAnchorBody(template, "BRIEF_META", body);
  if (!res.ok) {
    console.error(`brief: テンプレの BRIEF_META アンカー更新に失敗 — ${res.reason}`);
    process.exitCode = 1;
    return;
  }
  let out = res.text;
  if (title) out = out.replace(/^# タスクブリーフ.*$/m, (line) => `${line} — ${title}`);
  if (args.includes("--dry-run")) {
    console.log(`[dry-run] would write ${briefPath}\n`);
    console.log(out.split(/\r?\n/).slice(0, 14).join("\n"));
    return;
  }
  fs.writeFileSync(path.join(root, briefPath), out, "utf8");
  console.log(`Created ${briefPath} (mode=${mode}). Fill Search/Plan before Execute.`);
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

// --- sync (TASK-20260620-016, HH-034): automated B->A framework sync with
// origin/main as the hub. Fully automatic for the SAFE path (fast-forward take-in,
// then push after a passing validate). STOPS for manual resolution on divergence
// (ff impossible), validate errors, or a rejected push — never force-pushes, never
// auto-resolves a counter/notes conflict. Auto-push is gated by validate + ff-only
// safety (HH-034 relaxes the per-push human gate for THIS tool path only). ---
function sync(args) {
  const dry = args.includes("--dry-run");
  const out = [];
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
        console.error("sync: ローカル main と origin/main が分岐(ff 不可)。'/sync' のコンフリクト解決ガイドで手動 reconcile してから再実行。push は中止。");
        process.exitCode = 1; return;
      }
    }
  }
  const errs = validate().filter((i) => i.level === "error");
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
    if (dry) out.push(`[dry] origin main へ ${aheadNow} コミット push`);
    else {
      try { git(["push", "origin", "main"]); out.push(`A: origin main へ ${aheadNow} コミット push`); }
      catch {
        console.log(out.join("\n"));
        console.error("sync: push 拒否(non-fast-forward?)。git fetch して再実行。");
        process.exitCode = 1; return;
      }
    }
  } else out.push("A: push 対象なし");
  console.log(out.join("\n") + `\nsync 完了${dry ? "(dry-run)" : ""}。`);
}

// --- install-commands (TASK-20260620-016): reflect the .claude/commands launchers
// into a host project's working-directory root. Verbatim copy when the host IS a
// HyperHelix checkout. With --nest <relpath> (HyperHelix nested under the host),
// writes THIN redirect launchers pointing at <relpath> as the framework root
// (env axiom: commands stay thin launchers; rules live in the nested repo). ---
function installCommands(args) {
  const to = sliceFlag(args, "--to")[1];
  const nest = sliceFlag(args, "--nest")[1];
  const dry = args.includes("--dry-run");
  if (!to) { console.error("install-commands: --to <hostdir> は必須(反映先=ホストの作業ディレクトリ root)。"); process.exitCode = 1; return; }
  const srcDir = path.join(root, ".claude", "commands");
  if (!fs.existsSync(srcDir)) { console.error("install-commands: .claude/commands が無い。"); process.exitCode = 1; return; }
  const dstDir = path.join(to, ".claude", "commands");
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".md"));
  const out = [];
  for (const f of files) {
    const name = f.replace(/\.md$/, "");
    let content;
    if (nest) {
      const argLine = name === "helix" ? " 次のタスクを実行する: $ARGUMENTS" : "";
      content = `HyperHelix ${name} 起動コマンド(ネスト構成のリダイレクタ)。${argLine}\n\n` +
        `フレームワークは \`${nest}/\` にネストされている。\`${nest}/CLAUDE.md\`(実行エージェントは ` +
        `\`${nest}/AGENTS.md\`)の読み込み順序に従い、\`${nest}/.claude/commands/${name}.md\` の手順を ` +
        `**\`${nest}\` をルートとして** 実行する(資材・ツールのパスは全て \`${nest}/\` を前置して解決)。\n` +
        `ルール本体はネスト先資材にある(本ファイルは薄い起動コマンド=環境制約の公理)。\n`;
    } else {
      content = fs.readFileSync(path.join(srcDir, f), "utf8");
    }
    if (dry) { out.push(`  [dry] ${path.join(dstDir, f)} (${nest ? "redirect→" + nest : "verbatim"})`); continue; }
    fs.mkdirSync(dstDir, { recursive: true });
    fs.writeFileSync(path.join(dstDir, f), content);
    out.push(`  ${f} (${nest ? "redirect→" + nest : "verbatim"})`);
  }
  console.log(`install-commands: ${files.length} 件 → ${dstDir}${nest ? ` (nested root: ${nest})` : ""}\n` + out.join("\n"));
}

function codexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

const CODEX_SKILL_TRIGGER_WORDS = [
  "slash commands", "/helix", "/cycle", "/sync", "compact-prep",
  "validate", "bump", "brief", "finish", "cost-report", "sync",
  "install-commands", "update-codex-skill", "reflux", "archive-briefs",
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
- Read \`AGENTS.md\` or \`CLAUDE.md\` as the role entry point, then follow its reading order.
- Run \`node tools/hyperhelix.mjs --help\` for the current command list.
- Run \`node tools/hyperhelix.mjs validate\` before claiming framework consistency.

## Layer Map

- Claude slash-command skills live in \`.claude/commands/skills/*.md\` and expose launchers such as \`/helix\`, \`/cycle\`, \`/sync\`, and \`compact-prep\`.
- This Codex skill lives in \`~/.codex/skills/hyperhelix-commands\` and exists for autocomplete/dispatch inside Codex.
- \`node tools/hyperhelix.mjs update-codex-skill --check\` reports whether the Codex skill is stale; without \`--check\` it regenerates it.

## Common Dispatch

- Use \`/helix <task>\` for tracked-file work and normal task loops.
- Use \`/cycle\` for framework review triggers.
- Use \`/sync\` for framework synchronization with \`origin/main\`.
- Use \`node tools/hyperhelix.mjs brief\`, \`bump\`, and \`finish\` for task brief creation, D7 bookkeeping, and fail-closed completion orchestration.
- Use \`node tools/hyperhelix.mjs reflux\` from project/variant branches to dry-run project-born framework-knowledge reflux before applying.
- Use \`node tools/hyperhelix.mjs archive-briefs\` and \`consolidation-report\` for task archive pruning and R8 redundancy review.
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
    for (const word of ["brief", "bump", "finish", "archive-briefs", "consolidation-report", "compact-prep"]) {
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
// (HH-034 push path). Dry-run by default. A cherry-pick counter conflict hands off to the
// manual /sync conflict guide (semantic counter reconcile is not auto-resolvable).
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
  const FW = [/^core\//, /^assets\//, /^tools\//, /^\.claude\/commands\//, /^\.claude\/settings\.json$/, /^tasks\//, /^docs\//, /^constitution\.md$/, /^amendments\.md$/, /^CLAUDE\.md$/, /^AGENTS\.md$/, /^README\.md$/];
  const isFw = (f) => FW.some((re) => re.test(f));
  const commits = raw.split("\n").map((l) => { const i = l.indexOf("\t"); return { hash: l.slice(0, i), subj: l.slice(i + 1) }; });
  const candidates = [], excluded = [];
  for (const c of commits) {
    const files = git(["show", "--name-only", "--format=", c.hash], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    if (files.length && files.every(isFw)) candidates.push({ ...c, tasksBrief: files.some((f) => /^tasks\//.test(f)) });
    else excluded.push({ ...c, nonFw: files.filter((f) => !isFw(f)) });
  }
  const out = [`reflux: ${branch} → main 還元候補(origin/main..HEAD ${commits.length} コミット)`];
  out.push(`\nframework-only(還元候補 ${candidates.length}):`);
  for (const c of candidates) out.push(`  ${c.hash.slice(0, 9)} ${c.subj}${c.tasksBrief ? "  [tasks/ ブリーフ含む — project/genre が hyperhelix/framework か確認]" : ""}`);
  out.push(`\n除外(project コード等 ${excluded.length}):`);
  for (const c of excluded) out.push(`  ${c.hash.slice(0, 9)} ${c.subj}  (非fw: ${c.nonFw.slice(0, 3).join(", ")}${c.nonFw.length > 3 ? "…" : ""})`);
  if (!apply) {
    out.push(`\n候補を確認し、問題なければ \`node tools/hyperhelix.mjs reflux --apply\` で main へ staged cherry-pick + validate + push。`);
    out.push(`(docs/ は sync ヒューリスティック非包含のため除外 — 既知 gap)`);
    console.log(out.join("\n")); return;
  }
  if (!candidates.length) { console.log(out.join("\n") + "\n還元候補なし。終了。"); return; }
  console.log(out.join("\n"));
  try { git(["checkout", "main"]); } catch { console.error("reflux: checkout main 失敗(未コミットの変更があるか?)。"); process.exitCode = 1; return; }
  try { git(["merge", "--ff-only", "origin/main"]); }
  catch { git(["checkout", branch]); console.error("reflux: local main を origin/main に ff できない(分岐)。main で `sync` 後に再実行。"); process.exitCode = 1; return; }
  const picks = candidates.map((c) => c.hash).reverse(); // oldest-first
  try { git(["cherry-pick", ...picks]); }
  catch {
    try { git(["cherry-pick", "--abort"]); } catch {}
    git(["checkout", branch]);
    console.error("reflux: cherry-pick conflict(多くは knowledge.yaml カウンタ)。自動解決しません — `/sync` のコンフリクト解決ガイドで手動還元してください。");
    process.exitCode = 1; return;
  }
  const errs = validate().filter((i) => i.level === "error");
  if (errs.length) {
    console.error(`reflux: cherry-pick 後 validate に ${errs.length} error。push せず ${branch} へ戻ります。main を手動是正してください。`);
    for (const e of errs) console.error(`  ${e.code}: ${e.message}`);
    git(["checkout", branch]); process.exitCode = 1; return;
  }
  try { git(["push", "origin", "main"]); console.log(`reflux: ${candidates.length} framework コミットを main へ還元・push 済(HH-034 path)。`); }
  catch { console.error("reflux: push 拒否(non-ff?)。main で `sync`(B→A)してから再試行。"); }
  git(["checkout", branch]);
  console.log(`reflux: ${branch} へ戻りました。`);
}

// --- HH-031 Phase2: brief archival (working-tree prune, git-history retained) ---
const ARCHIVE_INDEX = "tasks/INDEX.md";
const ARCHIVE_KEEP_DEFAULT = 30;

function parseBriefForIndex(taskId, text) {
  const dm = taskId.match(/^TASK-(\d{4})(\d{2})(\d{2})-\d{3}$/);
  const date = dm ? `${dm[1]}-${dm[2]}-${dm[3]}` : "";
  const year = dm ? dm[1] : "unknown";
  const clean = (s, n) => ((s || "-").replace(/\r?\n/g, " ").replace(/\|/g, "／").trim().slice(0, n) || "-");
  const title = clean((text.match(/^#\s+(.+)$/m) || [])[1], 70);
  const genre = clean((text.match(/プロジェクト\s*\/\s*ジャンル\s*\|\s*([^|]+?)\s*\|/) || [])[1], 30);
  const sum = clean((text.match(/^>\s*(.+)$/m) || [])[1], 70);
  return { taskId, date, year, title, genre, sum };
}

function readArchiveIndex() {
  const map = new Map();
  if (!fs.existsSync(path.join(root, ARCHIVE_INDEX))) return map;
  const text = readFile(ARCHIVE_INDEX);
  const re = /^\|\s*(TASK-\d{8}-\d{3})\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([0-9a-fA-F]{7,40})\s*\|\s*([^|]*)\|/gm;
  for (const m of text.matchAll(re)) {
    const id = m[1]; const dm = id.match(/^TASK-(\d{4})/);
    map.set(id, { date: m[2].trim(), year: dm ? dm[1] : "unknown", title: m[3].trim(), genre: m[4].trim(), hash: m[5].trim(), sum: m[6].trim() });
  }
  return map;
}

function writeArchiveIndex(map) {
  const byYear = new Map();
  for (const [id, r] of map) { if (!byYear.has(r.year)) byYear.set(r.year, []); byYear.get(r.year).push({ id, ...r }); }
  const lines = [
    "# tasks/INDEX.md — アーカイブ済みブリーフ目録 (HH-031 Phase2)",
    "",
    "> archival mode で working-tree から間引いたタスクブリーフの manifest。本文は git 履歴に保持。",
    "> 復元: `git show <hash>:tasks/<task-id>.md`（doc/HyperHelix にて）。INDEX=アーカイブ分のみ(live は tasks/ に存在)。",
    "> 生成/更新: `node tools/hyperhelix.mjs archive-briefs`。手動編集しない。",
    "",
  ];
  for (const y of [...byYear.keys()].sort()) {
    lines.push(`## ${y}`, "", "| task-id | date | title | genre | hash | summary |", "|---|---|---|---|---|---|");
    for (const r of byYear.get(y).sort((a, b) => a.id.localeCompare(b.id))) {
      lines.push(`| ${r.id} | ${r.date} | ${r.title} | ${r.genre} | ${r.hash} | ${r.sum} |`);
    }
    lines.push("");
  }
  fs.writeFileSync(path.join(root, ARCHIVE_INDEX), lines.join("\n"));
}

function lastCommitHash(relPath) {
  try { return git(["log", "-1", "--format=%H", "--", relPath], { encoding: "utf8" }).trim() || null; }
  catch { return null; }
}
function workingTreeClean(relPath) {
  try { return git(["status", "--porcelain", "--", relPath], { encoding: "utf8" }).trim() === ""; }
  catch { return false; }
}

function archiveBriefs(args) {
  const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const keep = Number(flag("--keep")) > 0 ? Number(flag("--keep")) : ARCHIVE_KEEP_DEFAULT;
  const dryRun = args.includes("--dry-run");
  const briefs = taskBriefFiles(); // sorted ascending by task-id
  if (briefs.length <= keep) { console.log(`[archive-briefs] live ${briefs.length} <= keep ${keep}; nothing to archive.`); return; }
  const toArchive = briefs.slice(0, briefs.length - keep);
  const index = readArchiveIndex();
  const archived = [], skipped = [];
  for (const rel of toArchive) {
    const taskId = path.basename(rel, ".md");
    if (!workingTreeClean(rel)) { skipped.push(`${taskId} (uncommitted)`); continue; }   // (b) HH-015 並行安全
    const hash = lastCommitHash(rel);
    if (!hash) { skipped.push(`${taskId} (no commit history)`); continue; }
    const meta = parseBriefForIndex(taskId, readFile(rel));
    index.set(taskId, { date: meta.date, year: meta.year, title: meta.title, genre: meta.genre, hash, sum: meta.sum });
    archived.push({ rel, taskId });
  }
  if (!archived.length) { console.log(`[archive-briefs] nothing archivable (skipped ${skipped.length}).`); return; }
  if (dryRun) {
    console.log(`[archive-briefs] DRY-RUN keep=${keep}: would archive ${archived.length}, skip ${skipped.length}.`);
    console.log("  " + archived.map((a) => a.taskId).join(", "));
    if (skipped.length) console.log("  skipped: " + skipped.join(", "));
    return;
  }
  writeArchiveIndex(index);
  for (const a of archived) git(["rm", "--quiet", "--", a.rel]);   // (c) archival mode 専用削除
  git(["add", "--", ARCHIVE_INDEX]);
  console.log(`[archive-briefs] archived ${archived.length} -> ${ARCHIVE_INDEX} (kept ${keep} live). skipped ${skipped.length}.`);
  if (skipped.length) console.log("  skipped: " + skipped.join(", "));
  console.log("  本文は git 履歴に保持。復元: git show <hash>:tasks/<task-id>.md");
}

// (d) git-backed integrity: archived briefs must not collide with live and must carry a hash
function validateArchiveIndex() {
  const issues = [];
  if (!fs.existsSync(path.join(root, ARCHIVE_INDEX))) return issues;
  const index = readArchiveIndex();
  const live = new Set(taskBriefFiles().map((f) => path.basename(f, ".md")));
  for (const [id, r] of index) {
    if (live.has(id)) issues.push(error("ARCHIVE_INDEX", `${id} is both live (tasks/) and archived (INDEX) — collision`));
    if (!/^[0-9a-fA-F]{7,40}$/.test(r.hash || "")) issues.push(error("ARCHIVE_INDEX", `${id} archived hash missing/invalid (HH-031)`));
  }
  return issues;
}

// Tool<->doc consistency (TASK-20260620-036, xref-prevention L1): every CLI subcommand
// in the dispatch (`command === "x"`) must be referenced by name in at least one MATERIAL
// (not the tool itself), so a newly added subcommand cannot ship undocumented. This is the
// install-commands/reflux ORPHAN class — cross-file AP-003. Forward direction only.
function validateToolDoc() {
  const issues = [];
  const toolText = readFile("tools/hyperhelix.mjs");
  const subs = [...new Set([...toolText.matchAll(/command === "([a-z][a-z-]*)"/g)].map((m) => m[1]))];
  if (subs.length === 0) { issues.push(warn("TOOL_DOC_CONSISTENCY", "no subcommands parsed from tools/hyperhelix.mjs dispatch")); return issues; }
  const corpus = [];
  for (const rel of ["README.md", "AGENTS.md", "CLAUDE.md", "amendments.md"]) {
    if (fs.existsSync(path.join(root, rel))) corpus.push(readFile(rel));
  }
  const walk = (rel) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = `${rel}/${ent.name}`;
      if (ent.isDirectory()) walk(childRel);
      else if (ent.name.endsWith(".md") || ent.name.endsWith(".yaml")) corpus.push(readFile(childRel));
    }
  };
  walk("core"); walk("assets"); walk(".claude/commands");
  const hay = corpus.join("\n");
  for (const s of subs) {
    if (!hay.includes(s)) {
      issues.push(warn("TOOL_DOC_CONSISTENCY", `hyperhelix.mjs subcommand '${s}' is referenced by no material (README/core/assets/.claude/commands) — orphan tool? (AP-003: document it where operators look, or remove the subcommand)`));
    }
  }
  return issues;
}

// Check<->doc consistency (xref-prevention L1): every CONSISTENCY-GUARD validate check
// (all emitted codes minus the basic schema checks) must be enumerated in
// framework-review.md so a newly added guard is documented where reviewers look. This is
// the ARCHIVE_INDEX-missing-from-R1 class. The BASIC set is hand-maintained; any NEW code
// is treated as a guard automatically (fail-closed toward documenting it).
function validateCheckDoc() {
  const issues = [];
  if (!fs.existsSync(path.join(root, "assets/checklists/framework-review.md"))) return issues;
  const toolText = readFile("tools/hyperhelix.mjs");
  const BASIC = new Set(["MISSING_FILE", "ENTRYPOINT", "SCHEMA", "COUNTER", "NOTE_ID", "NOTE_FIELD", "FRAMEWORK_REVIEW", "TASK_LIST", "ANCHOR", "ACTIVE_SCAN"]);
  const codes = [...new Set([...toolText.matchAll(/(?:error|warn)\("([A-Z_]+)"/g)].map((m) => m[1]))];
  const review = readFile("assets/checklists/framework-review.md");
  for (const c of codes.filter((c) => !BASIC.has(c))) {
    if (!review.includes(c)) {
      issues.push(warn("CHECK_DOC_CONSISTENCY", `validate guard '${c}' is not listed in assets/checklists/framework-review.md R1 mechanical guards — reviewers won't know it exists (add it to the R1 guard enumeration, or add it to BASIC if it is a low-level schema check)`));
    }
  }
  return issues;
}

// Note-attribution guard (HH-053): closes the retrieval->application loop. Every note
// marked 適用=✓ in the LATEST brief's 取得/適用 table must have been --use/--miss'd for
// this task — i.e. its last_used has caught up to the brief's own task_index (recorded in
// BRIEF_META). Otherwise the ledger is a write-only log (strength/last_used never move) and
// "did this note help?" is never recorded. Grandfathers briefs lacking a machine-readable
// task_index (older format). Warn (not error): non-blocking, like DISTILL_CAPTURE.
function validateNoteAttribution() {
  const issues = [];
  const briefs = taskBriefFiles();
  if (briefs.length === 0) return issues;
  const file = briefs[briefs.length - 1];
  const text = readFile(file);
  const tiMatch = text.match(/\|\s*task_index\s*\|\s*(\d+)\s*\|/);
  if (!tiMatch) return issues; // grandfather: brief without machine-readable task_index
  const briefTi = Number(tiMatch[1]);
  const { notes } = parseNotes(readFile(KNOWLEDGE));
  const byId = new Map(notes.map((n) => [n.id, n]));
  for (const tbl of parseMarkdownTables(text)) {
    const idCol = tbl.header.findIndex((h) => /ノートID|note.?id/i.test(h));
    const appCol = tbl.header.findIndex((h) => /適用/.test(h));
    if (idCol < 0 || appCol < 0) continue;
    for (const r of tbl.rows) {
      const idm = (r.cells[idCol] || "").match(/N-\d{3}/);
      if (!idm) continue;
      if (!/[✓✔]/.test(r.cells[appCol] || "")) continue;
      const n = byId.get(idm[0]);
      if (n && Number.isFinite(n.last_used) && n.last_used < briefTi) {
        issues.push(warn("NOTE_ATTRIBUTION", `${file}: ${idm[0]} is 適用=✓ but was not --use/--miss'd this task (last_used=${n.last_used} < task_index=${briefTi}); run bump --use/--miss (HH-053 closes the retrieval→application loop)`));
      }
    }
  }
  return issues;
}

// Note schema<->data consistency (xref-prevention L1): the header NOTE FIELDS list and
// the field keys actually used by notes must match BOTH ways — a field documented but
// unused, or used but undocumented, is schema drift (the project:-field-added-without-
// wiring class, schema side). The PROCEDURAL side (D7 must instruct setting an
// operator-set field) is governed by the capability-wiring gate (HH-039), not mechanical.
function validateNoteFieldSchema() {
  const issues = [];
  const text = readFile(KNOWLEDGE);
  const s = text.indexOf("NOTE FIELDS");
  const e = text.indexOf("PER-TASK", s);
  if (s < 0 || e < 0) { issues.push(warn("NOTE_FIELD_SCHEMA", `${KNOWLEDGE} header NOTE FIELDS block not found`)); return issues; }
  const declared = new Set([...text.slice(s, e).matchAll(/^#[ \t]{2,}([a-z_]+)[ \t]*:/gm)].map((m) => m[1]));
  const ni = text.indexOf("\nnotes:");
  const used = new Set([...text.slice(ni < 0 ? 0 : ni + 1).matchAll(/^[ \t]+-?[ \t]*([a-z_]+):/gm)].map((m) => m[1]));
  if (declared.size === 0 || used.size === 0) { issues.push(warn("NOTE_FIELD_SCHEMA", `could not parse declared (${declared.size}) / used (${used.size}) note fields`)); return issues; }
  for (const d of declared) {
    if (!used.has(d)) issues.push(warn("NOTE_FIELD_SCHEMA", `header documents note field '${d}' but no note uses it (phantom field — remove from header or use it)`));
  }
  for (const u of used) {
    if (!declared.has(u)) issues.push(warn("NOTE_FIELD_SCHEMA", `note field '${u}' is used but not in the header NOTE FIELDS list (undocumented field — document it, and wire its D7 procedure per HH-039)`));
  }
  return issues;
}

// --- consolidation-report (HH-040): redundancy / staleness HINTS for the framework-review
// R8 "consolidation" lens. Informational (no exit code), like cost-report. It only PROPOSES
// candidates; actual merge / delete / rule-rewrite stays an HH proposal + human gate (routing
// mass-consolidation). Signals mirror the debt an accreting rule-set grows: parallel HH growth,
// stale deprecated procedures, fragmented notes, rule-surface bloat, unburned backlog. ---
const CONSOLIDATION_ANCHORS = ["R6", "R7d", "R7", "S4", "P6", "D5", "D2b", "project_scope", "STOPPED", "archive-briefs"];
const PROJECT_SLUGS = ["Project001", "Project002", "Project004"];
function consolidationReport() {
  console.log("HyperHelix consolidation-report (HH-040 / R8)\n");

  // R8b — amendment supersession: HH bodies sharing a live anchor (>=3 = collapse candidate)
  // + lifecycle drift (Approved body physically under the Pending header).
  const amd = fs.existsSync(path.join(root, "amendments.md")) ? readFile("amendments.md") : "";
  const parts = amd.split(/^## (HH-\d+)\b/gm);
  const hhBodies = [];
  for (let i = 1; i < parts.length; i += 2) hhBodies.push({ id: parts[i], body: parts[i + 1] || "" });
  console.log("R8b 統廃合候補(amendment supersession):");
  let any8b = false;
  for (const a of CONSOLIDATION_ANCHORS) {
    const hits = hhBodies.filter((h) => new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(h.body)).map((h) => h.id);
    if (hits.length >= 3) { console.log(`  anchor '${a}': ${hits.length} HH 触れる — ${hits.join(", ")}(共通方針へ集約候補)`); any8b = true; }
  }
  const superseded = hhBodies.filter((h) => /superseded|supersede|reactivat|STOPPED|再活性|巻き戻|統合済|implemented/i.test(h.body)).map((h) => h.id);
  if (superseded.length) { console.log(`  supersession 言及: ${superseded.join(", ")}`); any8b = true; }
  const pIdx = amd.indexOf("## 承認待ち");
  const aIdx = amd.indexOf("## 承認済みログ");
  if (pIdx >= 0 && aIdx > pIdx) {
    const misplaced = [...amd.slice(pIdx, aIdx).matchAll(/^## (HH-\d+)\b[\s\S]*?\*\*Status:\*\*\s*([A-Za-z]+)/gm)]
      .filter((m) => /Approved/i.test(m[2])).map((m) => m[1]);
    if (misplaced.length) { console.log(`  lifecycle drift: Approved だが「承認待ち」節下 — ${misplaced.join(", ")}(承認済みログへ移動・人間ゲート)`); any8b = true; }
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
  const { notes } = parseNotes(readFile(KNOWLEDGE));
  const active = notes.filter((n) => n.state === "active");
  // HH-045: notes already organized under a playbook are consolidated BY DESIGN —
  // a playbook shares tags with its leaves on purpose. Skip playbook↔its-leaf and
  // sibling-leaves-of-the-same-playbook so the index tier does not pollute the report.
  const alreadyOrganized = (X, Y) =>
    X.topic === Y.id || Y.topic === X.id ||
    (X.topic && X.topic === Y.topic) ||
    (X.leaves || []).includes(Y.id) || (Y.leaves || []).includes(X.id);
  const pairs = [];
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const A = active[i], B = active[j];
    if ((A.project || "shared") !== (B.project || "shared")) continue;
    if (alreadyOrganized(A, B)) continue;
    const ta = new Set((A.tags || []).map((t) => String(t).toLowerCase()));
    const shared = (B.tags || []).map((t) => String(t).toLowerCase()).filter((t) => ta.has(t));
    if (shared.length >= 2) pairs.push(`${A.id}~${B.id} [${A.project || "shared"}] 共有tag: ${shared.join(",")}`);
  }
  console.log("\nR8a ノート merge 候補(同 project・tag 重複>=2):");
  console.log(pairs.length ? pairs.slice(0, 20).map((p) => `  ${p}`).join("\n") + (pairs.length > 20 ? `\n  ...他 ${pairs.length - 20} 対` : "") : "  (なし)");

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
  const openItems = [...bl.matchAll(/^- \[(high|med|low)\]/gm)].length;
  const knRawBl = readFile(KNOWLEDGE);
  const prevBlMatch = knRawBl.match(/last_backlog_open_count:\s*(\d+|null)/);
  const prevBl = prevBlMatch && prevBlMatch[1] !== 'null' ? parseInt(prevBlMatch[1]) : null;
  const blDiff = prevBl === null ? null : openItems - prevBl;
  const blDiffStr = blDiff === null ? '初回計測・ベースライン記録' :
    blDiff > 0 ? `前回比 +${blDiff} ▲ (backlog 増加)` :
    blDiff < 0 ? `前回比 ${blDiff} ▼ (焼却進行)` : '前回比 ±0 →';
  console.log(`\nR8c process-backlog 焼却対象: open ${openItems} 件  [${blDiffStr}]`);
  const knUpdatedBl = knRawBl.replace(/last_backlog_open_count:\s*(\d+|null)/, `last_backlog_open_count: ${openItems}`);
  if (knUpdatedBl !== knRawBl) fs.writeFileSync(path.join(root, KNOWLEDGE), knUpdatedBl, 'utf8');

  console.log("\n注: 候補の提案のみ。実 merge/削除/規則書換は HH 提案 + 人間ゲート(routing mass-consolidation)。");
}

function help() {
  console.log(`HyperHelix tools (HH-016 note-ledger model)

Usage:
  node tools/hyperhelix.mjs validate
  node tools/hyperhelix.mjs bump   --task TASK-YYYYMMDD-NNN [--use N-00X,...] [--miss N-00X,...] [--review] [--update-brief] [--dry-run]
  node tools/hyperhelix.mjs brief  (--task TASK-YYYYMMDD-NNN | --date YYYYMMDD) [--mode standard] [--title "..."] [--project "..."] [--dry-run]
  node tools/hyperhelix.mjs finish --task TASK-YYYYMMDD-NNN [--use ...] [--miss ...] [--review] [--path a,b] [--commit --message "..."]
  node tools/hyperhelix.mjs cost-report
  node tools/hyperhelix.mjs sync   [--dry-run]
  node tools/hyperhelix.mjs install-commands --to <hostdir> [--nest <relpath>] [--dry-run]
  node tools/hyperhelix.mjs update-codex-skill [--to <skillsdir>] [--dry-run|--check]
  node tools/hyperhelix.mjs reflux [--apply]
  node tools/hyperhelix.mjs archive-briefs [--keep N] [--dry-run]
  node tools/hyperhelix.mjs consolidation-report

Commands:
  validate   Check required files, entrypoints, schemas, counters, notes, task-lists,
             brief anchors, the active-term scan (HH-016 removed vocabulary),
             GATE_DEAD_CONFIG (unconsumed gate params), PHASE_CONSISTENCY
             (loop phase_gate evidence <-> phase artifacts; HH-036), and
             STEP_CONSISTENCY (required_steps reference defined phase steps; HH-037).
  bump       Apply one task's deltas: task_index +1 (idempotent per --task);
             --use/--miss nudge a note strength +/-1; --review sets last_framework_review;
             --update-brief writes the deltas into the brief's HH:D7 anchor (fail-closed).
  brief      Generate a new anchored task brief from the template. Claims the next free
             NNN for --date, or takes an explicit --task. Never overwrites.
             --mode micro uses the short template (assets/templates/task-brief-micro.md).
  finish     Compose completion: preflight validate/secret-scan -> [irreversible]
             idempotent bump+brief -> final validate/secret-scan -> commit.
             Aborts before commit on final check failures.
             --commit performs the git commit (requires --message); otherwise prints a draft.
  cost-report Structural cost for R7 (HH-026): always-read startup lines, unindexed
             mandatory bulk (>300 lines, no index) flags, large-material growth, brief
             overhead. Informational; record the output in the /cycle brief at R7.
  sync       Automated B->A framework sync vs origin/main (HH-034): fetch -> ff take-in
             if behind -> validate -> push if ahead. Auto-push gated by a passing
             validate + ff-only safety; STOPS on divergence / validate error / rejected
             push (never force-pushes, never auto-resolves a conflict). --dry-run plans only.
  install-commands  Reflect .claude/commands/*.md into a host working-dir root
             (--to <hostdir>). Verbatim copy, or with --nest <relpath> write thin
             redirect launchers pointing at the nested HyperHelix root. --dry-run plans only.
  update-codex-skill  Regenerate the personal Codex skill
             hyperhelix-commands under CODEX_HOME/skills (or ~/.codex/skills).
             The skill is thin and points back to live repo commands/materials so
             autocomplete metadata can be refreshed after HyperHelix changes.
             --check exits non-zero when the installed skill is stale or invalid.
  reflux     Project->main framework-knowledge reflux (run ON a project/variant branch):
             classify origin/main..HEAD commits as framework-only vs project; --apply stages
             the framework-only ones onto main (ff + cherry-pick), validates, and pushes
             (HH-034 path). Dry-run by default; a counter conflict hands off to /sync's guide.
  archive-briefs (HH-031 Phase2) Prune old task briefs from the working tree while
             keeping them in git history. Keeps the newest --keep N (default 30) live;
             archives only committed+clean briefs (HH-015 safe) into tasks/INDEX.md
             (year-sharded: task-id|date|title|genre|hash|summary). Restore a brief with
             git show <hash>:tasks/<task-id>.md. Archival mode only — NOT run in /cycle.
  consolidation-report (HH-040) Redundancy / staleness HINTS for the framework-review R8
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
  if (command === "bump") return bump(args);
  if (command === "finish") return finish(args);
  if (command === "brief") return brief(args);
  if (command === "cost-report") return costReport();
  if (command === "sync") return sync(args);
  if (command === "install-commands") return installCommands(args);
  if (command === "update-codex-skill") return updateCodexSkill(args);
  if (command === "reflux") return reflux(args);
  if (command === "archive-briefs") return archiveBriefs(args);
  if (command === "consolidation-report") return consolidationReport();
  help();
  process.exitCode = 1;
}

main();
