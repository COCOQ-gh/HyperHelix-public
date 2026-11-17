import { FRAMEWORK_EVIDENCE_PATH_CLASS } from "./contracts.mjs";

// SC-02: the path classes are contract values (core/contracts.json), consumed
// here — no duplicated JS literals. HH-081 stage 4: evidence rows live in the
// commit-body hh-record (tools/lib/commit-record.mjs); the Markdown brief/anchor
// readers that used to live here were retired with the task-record subsystem.
const FRAMEWORK_PREFIXES = FRAMEWORK_EVIDENCE_PATH_CLASS.pathPrefixes;
const FRAMEWORK_ROOT_FILES = new Set(FRAMEWORK_EVIDENCE_PATH_CLASS.rootFiles);
const BOOKKEEPING_EXCLUSIONS = new Set(FRAMEWORK_EVIDENCE_PATH_CLASS.bookkeepingExclusions);
const BOOKKEEPING_EXCLUSION_PREFIXES = FRAMEWORK_EVIDENCE_PATH_CLASS.bookkeepingExclusionPrefixes;

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isFrameworkEvidencePath(value) {
  const relative = normalizePath(value);
  if (!relative || relative.startsWith("tasks/") || BOOKKEEPING_EXCLUSIONS.has(relative)) return false;
  // Leaf note ledgers are D7 bookkeeping like core/knowledge.yaml itself
  // (HH-045 (2) multi-file split; contract modify recorded in SC-02's brief).
  if (BOOKKEEPING_EXCLUSION_PREFIXES.some((prefix) => relative.startsWith(prefix))) return false;
  return FRAMEWORK_ROOT_FILES.has(relative) || FRAMEWORK_PREFIXES.some((prefix) => relative.startsWith(prefix));
}

function incomplete(cell) {
  return !cell || /^(?:pending|tbd|todo|\(記入\)|<.+>)$/i.test(cell);
}

// Evidence completeness of a structured record (contract_impact / framework_check rows).
// `requireRows`: a record must CARRY rows only when its own change touched framework
// paths; rows it does carry are always validated.
export function inspectFrameworkEvidenceRecord(record, { requireRows = true } = {}) {
  const errors = [];
  if (requireRows && record.contract_impact.length === 0) errors.push("CONTRACT_IMPACT: at least one row is required");
  for (const [index, row] of record.contract_impact.entries()) {
    if (Object.values(row).some((value) => incomplete(String(value).trim()))) {
      errors.push(`CONTRACT_IMPACT row ${index + 1}: incomplete`);
    }
  }
  if (requireRows && record.framework_check.length === 0) errors.push("FRAMEWORK_CHECK: at least one row is required");
  for (const [index, row] of record.framework_check.entries()) {
    const textFields = [row.exact_command, row.scope_exclusion, row.expected, row.r2_mapping, row.r3_result];
    if (textFields.some((value) => incomplete(String(value).trim()))) {
      errors.push(`FRAMEWORK_CHECK row ${index + 1}: incomplete`);
      continue;
    }
    const { update, history_allow, unrelated } = row.classification;
    if (update + history_allow + unrelated !== row.actual_hit_count) {
      errors.push(`FRAMEWORK_CHECK row ${index + 1}: every hit must be classified`);
    }
    if (row.exit_code !== 0) errors.push(`FRAMEWORK_CHECK row ${index + 1}: exit_code must be 0`);
    if (!/^R2\b/i.test(row.r2_mapping)) errors.push(`FRAMEWORK_CHECK row ${index + 1}: R2 mapping is required`);
    if (!/^pass$/i.test(row.r3_result)) errors.push(`FRAMEWORK_CHECK row ${index + 1}: R3 result must be Pass`);
  }
  return { ok: errors.length === 0, errors };
}

export function checkFrameworkEvidenceGate(changedPaths, record) {
  const frameworkPaths = [...new Set(changedPaths.map(normalizePath).filter(isFrameworkEvidencePath))].sort();
  if (frameworkPaths.length === 0) return { ok: true, frameworkPaths, errors: [] };
  if (!record) return { ok: false, frameworkPaths, errors: ["no hh-record for a framework change"] };
  return { ...inspectFrameworkEvidenceRecord(record), frameworkPaths };
}
