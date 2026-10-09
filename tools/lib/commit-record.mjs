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
import { isValidTaskRef, extractNoteIds, FRAMEWORK_EVIDENCE_HEADER_CONTRACT } from "./contracts.mjs";
import { inspectFrameworkEvidenceRecord, isFrameworkEvidencePath } from "./framework-evidence.mjs";

export const COMMIT_RECORD_FENCE = "hh-record";
export const TASK_PHASES = ["search", "plan", "execute", "evaluate", "distill"];
export const EVALUATE_RESULTS = ["Pass", "Fail", "Skip", "Retracted", "Superseded"];

// Transition (HH-081 stage 4): commits authored before this instant may carry the
// retired tasks/ record instead of an hh-record (host projects sync on their own
// schedule; cherry-picks keep the author date). Delete this rule after the window.
export const LEGACY_RECORD_CUTOVER = "2026-11-01T00:00:00Z";
const LEGACY_RECORD_PATH = /^tasks\/(records\/[^/]+\.yaml|TASK-[^/]+\.md)$/;

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
export function checkCommitRecord(record, { changedPaths = [], noteIds = new Set(), depthModes = null, source = "<commit>" } = {}) {
  const requireRows = changedPaths.some(isFrameworkEvidencePath);
  const errors = inspectFrameworkEvidenceRecord(record, { requireRows }).errors.map((message) => `${source}: ${message}`);
  if (depthModes && !depthModes.has(record.depth_mode)) errors.push(`${source}: depth_mode ${record.depth_mode} is not a core/loop.yaml depth mode`);
  for (const id of record.note_adds ?? []) {
    if (!noteIds.has(id)) errors.push(`${source}: note_adds declares ${id} but no ledger contains it`);
  }
  return errors;
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
