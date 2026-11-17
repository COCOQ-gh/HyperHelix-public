// HH-081: the task record carried in the commit body — the ONLY record form since
// stage 4 (docs/hh-081-design-spike.md §5). A commit message carries exactly one
// fenced block
//
//   ```hh-record
//   schema: 1
//   task_id: TASK-main-20261002-009
//   ...
//   ```
//
// validated fail-closed by `finish --message` (before anything irreversible) and by
// `verify --base` (pre-push and CI; each commit against its OWN changed paths).

import { parseYamlStrict, createStrictValidator, compileSchema, validateWithSchema } from "./schema-runtime.mjs";
import { isValidTaskRef, extractNoteIds, COMMIT_RECORD_CONTRACT, FRAMEWORK_EVIDENCE_HEADER_CONTRACT } from "./contracts.mjs";
import { inspectFrameworkEvidenceRecord, isFrameworkEvidencePath } from "./framework-evidence.mjs";

export const COMMIT_RECORD_FENCE = "hh-record";
export const TASK_PHASES = ["search", "plan", "execute", "evaluate", "distill"];
export const EVALUATE_RESULTS = ["Pass", "Fail", "Skip", "Retracted", "Superseded"];

// Transition (HH-081 stage 4): commits authored before this instant may carry the
// retired tasks/ record instead of an hh-record (host projects sync on their own
// schedule; cherry-picks keep the author date). Delete this rule after the window.
export const LEGACY_RECORD_CUTOVER = "2026-11-01T00:00:00Z";
const LEGACY_RECORD_PATH = /^tasks\/(records\/[^/]+\.yaml|TASK-[^/]+\.md)$/;

// HH-083: Distill routing becomes a record field. Each D1/D2 finding names where it went
// (core/routing.yaml routing); standard/full records must carry at least one row, fail-closed.
// Commits authored before the cutover predate the field and are exempt in `verify --base`.
export const DISTILL_ROUTING_CUTOVER = "2026-10-26T01:40:00Z";
export const DISTILL_ROUTING_DEPTHS = new Set(["standard", "full"]);
export const DISTILL_ROUTES = ["note", "anti-pattern", "process-backlog", "amendment", "framework-material", "host-doc", "existing-material", "not-reusable"];
const DISTILL_STEP = { type: "string", pattern: "^D(?:1|2b?|3|4|5|6|7)$" };

// HH-084: S2 evidence. A standard/full record whose notes.retrieved is empty must show the
// tags it queried in phase_evidence.search (e.g. `S2 notes --tags a,b → 0 件(該当なし)`), so
// "queried, nothing applied" is distinguishable from "never queried" — fail-closed in
// finish / verify. The vocabulary (depths, tokens, cutover) is contract data (core/contracts.json).
export const S2_EVIDENCE_CUTOVER = COMMIT_RECORD_CONTRACT.s2Evidence.cutover;
export const S2_EVIDENCE_DEPTHS = new Set(COMMIT_RECORD_CONTRACT.s2Evidence.depths);
export const S2_EVIDENCE_TOKENS = COMMIT_RECORD_CONTRACT.s2Evidence.requiredTokens;

const nonEmptyString = { type: "string", minLength: 1 };
const stringArray = { type: "array", items: nonEmptyString };
const nonNegativeInteger = { type: "integer", minimum: 0 };
// Row keys come from the framework-evidence header contract (core/contracts.json) —
// the record shape and the evidence inspector share one authority.
const FRAMEWORK_CHECK_TYPES = {
  actual_hit_count: nonNegativeInteger,
  classification: {
    type: "object",
    additionalProperties: false,
    required: ["update", "history_allow", "unrelated"],
    properties: { update: nonNegativeInteger, history_allow: nonNegativeInteger, unrelated: nonNegativeInteger },
  },
  exit_code: { type: "integer" },
};
const rowSchema = (keys, types = {}) => ({
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: [...keys],
    properties: Object.fromEntries(keys.map((key) => [key, types[key] ?? { type: "string" }])),
  },
});

const COMMIT_RECORD_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["schema", "task_id", "depth_mode", "contract_impact", "framework_check", "evaluate", "notes"],
  properties: {
    schema: { const: 1 },
    task_id: nonEmptyString,
    depth_mode: nonEmptyString,
    contract_impact: rowSchema(FRAMEWORK_EVIDENCE_HEADER_CONTRACT.contractImpact),
    framework_check: rowSchema(FRAMEWORK_EVIDENCE_HEADER_CONTRACT.frameworkCheck, FRAMEWORK_CHECK_TYPES),
    evaluate: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["criterion", "result"],
        properties: { criterion: nonEmptyString, result: { enum: EVALUATE_RESULTS }, note: { type: "string" } },
      },
    },
    notes: {
      type: "object",
      additionalProperties: false,
      required: ["retrieved", "applied"],
      properties: { retrieved: stringArray, applied: stringArray },
    },
    note_adds: { type: "array", items: { type: "string", pattern: "^N-" } },
    distill_routing: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["finding", "route", "target"],
        properties: { finding: nonEmptyString, route: { enum: DISTILL_ROUTES }, target: nonEmptyString, entry: nonEmptyString },
      },
    },
    distill_deferred: { type: "array", items: DISTILL_STEP },
    distill_backfill: stringArray,
    phase_evidence: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(TASK_PHASES.map((phase) => [phase, stringArray])),
    },
  },
};

const validateCommitRecordSchema = compileSchema(createStrictValidator(), COMMIT_RECORD_SCHEMA);
const FENCE_RE = new RegExp("^```" + COMMIT_RECORD_FENCE + "[ \\t]*\\r?\\n([\\s\\S]*?)\\r?\\n```[ \\t]*$", "gm");

// Returns { present: false } or { present: true, ok, value?, errors }.
export function extractCommitRecord(message, { source = "<commit>" } = {}) {
  const blocks = [...String(message ?? "").matchAll(FENCE_RE)];
  if (blocks.length === 0) return { present: false };
  if (blocks.length > 1) {
    return { present: true, ok: false, errors: [`${source}: expected at most 1 ${COMMIT_RECORD_FENCE} block, found ${blocks.length}`] };
  }
  const parsed = parseYamlStrict(blocks[0][1], { source });
  if (!parsed.ok) return { present: true, ok: false, errors: parsed.errors };
  const checked = validateWithSchema(validateCommitRecordSchema, parsed.value, { source });
  if (!checked.ok) return { present: true, ok: false, errors: checked.errors };
  const errors = [];
  if (!isValidTaskRef(parsed.value.task_id)) errors.push(`${source}: task_id ${parsed.value.task_id} is not a valid task id`);
  return { present: true, ok: errors.length === 0, value: parsed.value, errors };
}

// Semantic checks against the commit's OWN change set: evidence rows are required
// only when this commit touched framework paths (own-diff attribution is exact here —
// the record and the change live in the same commit), and every declared note add
// must exist in the ledgers (the former NOTE_MOVE_MATERIALIZED intent).
// depthModes: the vocabulary's single authority is core/loop.yaml (SC-02) — callers pass it.
export function checkCommitRecord(record, { changedPaths = [], noteIds = new Set(), depthModes = null, authorDate = null, source = "<commit>" } = {}) {
  const requireRows = changedPaths.some(isFrameworkEvidencePath);
  const errors = inspectFrameworkEvidenceRecord(record, { requireRows }).errors.map((message) => `${source}: ${message}`);
  if (depthModes && !depthModes.has(record.depth_mode)) errors.push(`${source}: depth_mode ${record.depth_mode} is not a core/loop.yaml depth mode`);
  for (const id of record.note_adds ?? []) {
    if (!noteIds.has(id)) errors.push(`${source}: note_adds declares ${id} but no ledger contains it`);
  }
  errors.push(...distillRoutingErrors(record, { noteIds, authorDate, source }));
  errors.push(...s2EvidenceErrors(record, { authorDate, source }));
  return errors;
}

// HH-084: S2 evidence = at least one retrieved note id, or one phase_evidence.search line that
// carries every required token (the S2 command with the tags queried).
export function hasS2Evidence(record) {
  if ((record.notes?.retrieved ?? []).length > 0) return true;
  const lines = record.phase_evidence?.search ?? [];
  return lines.some((line) => S2_EVIDENCE_TOKENS.every((token) => String(line).includes(token)));
}

// HH-084 items 1-3: required for standard/full records authored at/after S2_EVIDENCE_CUTOVER;
// light / micro are never blocked here (finish shows them instead — item 2).
export function s2EvidenceErrors(record, { authorDate = null, source = "<commit>" } = {}) {
  const exempt = authorDate && Date.parse(authorDate) < Date.parse(S2_EVIDENCE_CUTOVER);
  if (exempt || !S2_EVIDENCE_DEPTHS.has(record.depth_mode) || hasS2Evidence(record)) return [];
  const tokens = S2_EVIDENCE_TOKENS.map((token) => `"${token}"`).join(" and ");
  return [`${source}: depth_mode ${record.depth_mode} requires S2 evidence — notes.retrieved is empty, so phase_evidence.search must carry the tags queried, e.g. "S2 notes --tags a,b → 0 件(該当なし)" (a line with ${tokens}; HH-084)`];
}

// HH-083 items 1-2: the D3/D4 routing table. Required (non-empty) for standard/full records
// authored at/after DISTILL_ROUTING_CUTOVER; when present at any depth, every row is checked:
// a note route cites existing note ids, an AP/HH route cites its id, and a host-doc route
// names an existing note as its S2 entry (`entry`) — host documents are outside S2.
export function distillRoutingErrors(record, { noteIds = new Set(), authorDate = null, source = "<commit>" } = {}) {
  const errors = [];
  const rows = record.distill_routing ?? [];
  const exempt = authorDate && Date.parse(authorDate) < Date.parse(DISTILL_ROUTING_CUTOVER);
  if (!exempt && DISTILL_ROUTING_DEPTHS.has(record.depth_mode) && rows.length === 0) {
    errors.push(`${source}: depth_mode ${record.depth_mode} requires distill_routing (D3/D4: route each D1/D2 finding, or one not-reusable row with the reason — HH-083)`);
  }
  const missingNotes = (text, field, index) => {
    const ids = extractNoteIds(text);
    if (ids.length === 0) return [`${source}: distill_routing[${index}].${field} must cite a note id (N-…)`];
    return ids.filter((id) => !noteIds.has(id)).map((id) => `${source}: distill_routing[${index}].${field} cites ${id} but no ledger contains it`);
  };
  rows.forEach((row, index) => {
    if (row.route === "note") errors.push(...missingNotes(row.target, "target", index));
    if (row.route === "anti-pattern" && !/AP-\d{3}/.test(row.target)) errors.push(`${source}: distill_routing[${index}].target must cite an AP-NNN id`);
    if (row.route === "amendment" && !/HH-\d{3}/.test(row.target)) errors.push(`${source}: distill_routing[${index}].target must cite an HH-NNN id`);
    if (row.route === "host-doc") {
      if (!row.entry) errors.push(`${source}: distill_routing[${index}] routes to a host document; entry must name the note that points to it (S2 cannot see host documents — HH-083)`);
      else errors.push(...missingNotes(row.entry, "entry", index));
    }
  });
  for (const id of record.distill_backfill ?? []) {
    if (!isValidTaskRef(id)) errors.push(`${source}: distill_backfill ${id} is not a valid task id`);
  }
  return errors;
}

// HH-083 item 3: light records list the Distill steps they skipped (distill_deferred); a later
// record names the task ids it backfilled or explicitly discarded (distill_backfill). Returns the
// task ids still open. Display only — never fail-closed (light stays light).
export function openDistillDeferrals(records) {
  const deferred = new Map();
  const closed = new Set();
  for (const record of records) {
    if ((record.distill_deferred ?? []).length > 0) deferred.set(record.task_id, record.distill_deferred);
    for (const id of record.distill_backfill ?? []) closed.add(id);
  }
  return [...deferred].filter(([id]) => !closed.has(id)).map(([task_id, steps]) => ({ task_id, steps }));
}

// Convenience for callers holding a raw message: extract + check in one step.
export function commitRecordErrors(message, context = {}) {
  const extracted = extractCommitRecord(message, context);
  if (!extracted.present) return { present: false, errors: [] };
  if (!extracted.ok) return { present: true, errors: extracted.errors };
  return { present: true, record: extracted.value, errors: checkCommitRecord(extracted.value, context) };
}

// Former NOTE_ATTRIBUTION (HH-053): every note the record says it APPLIED must be
// attributed at this task's D7 (`finish --use/--miss`). Returns the unattributed ids.
export function unattributedAppliedNotes(record, attributedIds) {
  const applied = new Set((record.notes?.applied ?? []).flatMap((entry) => extractNoteIds(entry)));
  return [...applied].filter((id) => !attributedIds.has(id));
}

// Former DISTILL_CAPTURE (HH-043): a record whose evidence reports rework should leave a
// durable material in the SAME commit — a declared note add, or a change to the
// anti-patterns / process-backlog / amendment registry. Template phrases and negations
// ("手戻りなし") are not rework. Returns a message, or null when there is no gap.
const DURABLE_CAPTURE_PATHS = new Set([
  "assets/ai/anti-patterns.md",
  "docs/process-backlog.md",
  "governance/amendments/registry.yaml",
]);
export function distillCaptureGap(record, changedPaths = []) {
  const text = Object.values(record.phase_evidence ?? {}).flat().join("\n")
    .replace(/手戻り\/判断誤りゲート/g, "")
    .replace(/失敗\/手戻りシグナル/g, "")
    .replace(/手戻り(?:シグナル)?(?:な|無|ゼロ| 0|は無)/g, "");
  if (!/手戻り|リグレッション|regression|revert/i.test(text)) return null;
  if ((record.note_adds ?? []).length > 0) return null;
  if (changedPaths.some((file) => DURABLE_CAPTURE_PATHS.has(file))) return null;
  return "phase_evidence reports rework but this commit adds no durable material (note_adds / anti-patterns / process-backlog / amendment) — capture the lesson or cite the existing material (distill.md D6/D7, HH-043)";
}

// Transition rule: a block-less commit authored before the cutover that carries a
// retired tasks/ record is treated as recorded (see LEGACY_RECORD_CUTOVER).
export function isLegacyRecordedCommit(authorDateIso, changedPaths) {
  if (!(Date.parse(authorDateIso) < Date.parse(LEGACY_RECORD_CUTOVER))) return false;
  return changedPaths.some((file) => LEGACY_RECORD_PATH.test(file));
}
