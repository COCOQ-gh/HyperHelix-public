import fs from "node:fs";

const contractUrl = new URL("../../core/contracts.json", import.meta.url);
const contract = JSON.parse(fs.readFileSync(contractUrl, "utf8"));
const consumedPaths = new Set();

function contractValue(dottedPath) {
  consumedPaths.add(dottedPath);
  let value = contract;
  for (const part of dottedPath.split(".")) value = value?.[part];
  if (value === undefined) throw new Error(`Missing contract field: ${dottedPath}`);
  return value;
}

function leafPaths(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
}

const schemaVersion = contractValue("schema_version");
if (schemaVersion !== 1) throw new Error(`Unsupported core/contracts.json schema_version: ${schemaVersion}`);

const noteLegacyPattern = contractValue("identifiers.note.legacy_pattern");
const notePermanentPattern = contractValue("identifiers.note.permanent_pattern");
const noteProvisionalPattern = contractValue("identifiers.note.provisional_pattern");
const escapePrefix = contractValue("identifiers.branch_slug.escape_prefix");
const safeAsciiPattern = contractValue("identifiers.branch_slug.safe_ascii_pattern");
const taskLegacyPattern = contractValue("identifiers.task.legacy_pattern");
const taskPermanentPattern = contractValue("identifiers.task.permanent_pattern");
const hhPattern = contractValue("identifiers.hh.pattern");
export const AMENDMENTS_LIFECYCLE = Object.freeze({
  pendingHeading: contractValue("structures.amendments_lifecycle.pending_heading"),
  approvedHeading: contractValue("structures.amendments_lifecycle.approved_heading"),
  requiredConsumers: contractValue("structures.amendments_lifecycle.required_consumers"),
});
// SC-02: framework-evidence path classes and anchor-table headers live in the
// contract, not as JS literals (framework-evidence.mjs is the runtime consumer).
export const FRAMEWORK_EVIDENCE_PATH_CLASS = Object.freeze({
  pathPrefixes: contractValue("structures.framework_evidence.path_prefixes"),
  rootFiles: contractValue("structures.framework_evidence.root_files"),
  bookkeepingExclusions: contractValue("structures.framework_evidence.bookkeeping_exclusions"),
  bookkeepingExclusionPrefixes: contractValue("structures.framework_evidence.bookkeeping_exclusion_prefixes"),
});
export const FRAMEWORK_EVIDENCE_HEADER_CONTRACT = Object.freeze({
  contractImpact: contractValue("structures.framework_evidence.contract_impact_headers"),
  frameworkCheck: contractValue("structures.framework_evidence.framework_check_headers"),
});
// HH-081: the task record lives in the commit body (tools/lib/commit-record.mjs);
// the only task state on disk is the untracked claim sidecar (concurrency.md §2).
export const TASK_CLAIM_CONTRACT = Object.freeze({
  sidecarDir: contractValue("structures.task_claim.sidecar_dir"),
});
// SC-05a: the knowledge manifest declares the ledger list + project ownership;
// the knowledge repository reads every ledger through the formal parser/schema.
export const KNOWLEDGE_CONTRACT = Object.freeze({
  manifest: contractValue("structures.knowledge.manifest"),
  mainLedger: contractValue("structures.knowledge.main_ledger"),
  ledgerDir: contractValue("structures.knowledge.ledger_dir"),
  states: contractValue("structures.knowledge.states"),
  kinds: contractValue("structures.knowledge.kinds"),
  // HH-082 B: soft maximum for the text of notes created on/after `since` (the date in
  // the permanent id). A guideline — validate warns, never errors.
  noteTextSoftMax: Object.freeze({
    chars: contractValue("structures.knowledge.note_text_soft_max.chars"),
    since: contractValue("structures.knowledge.note_text_soft_max.since"),
  }),
});
// SC-04 (HH-067): governance/amendments/ (registry + per-HH bodies) is the
// structured canon for HH lifecycle; amendments.md is the generated view.
export const GOVERNANCE_CONTRACT = Object.freeze({
  registry: contractValue("structures.governance.registry"),
  bodiesDir: contractValue("structures.governance.bodies_dir"),
  viewTemplate: contractValue("structures.governance.view_template"),
  view: contractValue("structures.governance.view"),
  statuses: contractValue("structures.governance.statuses"),
  placeholders: contractValue("structures.governance.placeholders"),
});

// SC-06: domain epoch state machine (structured-canon-migration-plan 移行規則).
// The contract declares each domain's CURRENT epoch; consumers gate reads/writes
// through the accessors below. Unknown domain / unknown (future) state = fail-closed.
export const EPOCH_CONTRACT = Object.freeze({
  states: Object.freeze(contractValue("structures.epochs.states")),
  domains: Object.freeze({
    governance: contractValue("structures.epochs.domains.governance"),
    knowledge: contractValue("structures.epochs.domains.knowledge"),
  }),
});
export const EPOCH_DOMAINS = Object.freeze(Object.keys(EPOCH_CONTRACT.domains));

function epochStateIndex(state) {
  const index = EPOCH_CONTRACT.states.indexOf(state);
  if (index < 0) throw new Error(`epoch: unknown state '${state}' — fail-closed (contract states: ${EPOCH_CONTRACT.states.join(", ")})`);
  return index;
}

export function domainEpoch(domain, { epochs = EPOCH_CONTRACT.domains } = {}) {
  const state = epochs?.[domain];
  if (typeof state !== "string") throw new Error(`epoch: domain '${domain}' declares no epoch — fail-closed`);
  const index = EPOCH_CONTRACT.states.indexOf(state);
  if (index < 0) throw new Error(`epoch: domain '${domain}' declares unknown/future state '${state}' — fail-closed`);
  return { domain, state, index };
}

// State-machine boundaries (plan "Domain state machine"): new-canon writes start
// at dual-read-new-write; legacy writes end after dual-read-legacy-write; legacy
// reads end after semantic-parity-confirmed.
export function epochAllowsNewWrite(domain, options = {}) {
  return domainEpoch(domain, options).index >= epochStateIndex("dual-read-new-write");
}
export function epochAllowsLegacyWrite(domain, options = {}) {
  return domainEpoch(domain, options).index <= epochStateIndex("dual-read-legacy-write");
}
export function epochAllowsLegacyRead(domain, options = {}) {
  return domainEpoch(domain, options).index <= epochStateIndex("semantic-parity-confirmed");
}
export function assertNewWriteAllowed(domain, options = {}) {
  const epoch = domainEpoch(domain, options);
  if (epoch.index < epochStateIndex("dual-read-new-write")) {
    throw new Error(`epoch: domain '${domain}' is at '${epoch.state}' — structured-canon writes are not enabled yet (fail-closed)`);
  }
  return epoch;
}

const noteLegacyRe = new RegExp(noteLegacyPattern);
const notePermanentRe = new RegExp(notePermanentPattern);
const noteProvisionalRe = new RegExp(noteProvisionalPattern);
const safeAsciiRe = new RegExp(safeAsciiPattern);
const taskLegacyRe = new RegExp(taskLegacyPattern);
const taskPermanentRe = new RegExp(taskPermanentPattern);
const hhRe = new RegExp(hhPattern);
const hexByteRe = /^[0-9a-f]{2}$/;

function suffixToNumber(suffix) {
  let value = 0;
  for (const ch of suffix) value = value * 26 + ch.charCodeAt(0) - 96;
  return value;
}

export function numberToSuffix(value) {
  if (!Number.isInteger(value) || value < 1) throw new Error("suffix number must be a positive integer");
  let next = value;
  let suffix = "";
  while (next > 0) {
    next -= 1;
    suffix = String.fromCharCode(97 + (next % 26)) + suffix;
    next = Math.floor(next / 26);
  }
  return suffix;
}

export function encodeBranchSlug(rawSlug) {
  if (typeof rawSlug !== "string" || rawSlug.length === 0) throw new Error("branch slug must be a non-empty string");
  const bytes = new TextEncoder().encode(rawSlug);
  let encoded = "";
  for (const byte of bytes) {
    const char = String.fromCharCode(byte);
    if (safeAsciiRe.test(char) && char !== escapePrefix) encoded += char;
    else encoded += `${escapePrefix}${byte.toString(16).padStart(2, "0")}`;
  }
  return encoded;
}

export function decodeBranchSlug(encodedSlug) {
  if (typeof encodedSlug !== "string" || encodedSlug.length === 0) throw new Error("encoded branch slug must be non-empty");
  const bytes = [];
  for (let index = 0; index < encodedSlug.length;) {
    const char = encodedSlug[index];
    if (char === escapePrefix) {
      const hex = encodedSlug.slice(index + 1, index + 3);
      if (!hexByteRe.test(hex)) throw new Error(`invalid branch slug escape at offset ${index}`);
      bytes.push(Number.parseInt(hex, 16));
      index += 3;
      continue;
    }
    if (!safeAsciiRe.test(char)) throw new Error(`invalid branch slug character at offset ${index}`);
    bytes.push(char.charCodeAt(0));
    index += 1;
  }
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  if (encodeBranchSlug(decoded) !== encodedSlug) throw new Error("branch slug is not canonically encoded");
  return decoded;
}

export function parseNoteId(value) {
  if (typeof value !== "string") return null;
  const legacy = value.match(noteLegacyRe);
  if (legacy) return { id: value, kind: "legacy", serial: Number(legacy[1]) };
  const permanent = value.match(notePermanentRe);
  if (permanent) {
    try {
      return {
        id: value,
        kind: "permanent",
        encodedSlug: permanent[1],
        slug: decodeBranchSlug(permanent[1]),
        date: permanent[2],
        suffix: permanent[3],
        suffixNumber: suffixToNumber(permanent[3]),
      };
    } catch {
      return null;
    }
  }
  const provisional = value.match(noteProvisionalRe);
  if (provisional) return { id: value, kind: "provisional", encodedSlug: provisional[1], serial: Number(provisional[2]) };
  return null;
}

export function extractNoteIds(text) {
  if (typeof text !== "string") return [];
  const candidates = text.match(/N-(?:\d{3}|[A-Za-z0-9]+-(?:\d{8}[a-z]+|\d{3}))/g) ?? [];
  return [...new Set(candidates.filter((candidate) => parseNoteId(candidate)))];
}

export function formatPermanentNoteId({ slug, date, suffix }) {
  if (!/^\d{8}$/.test(date || "")) throw new Error("note date must be YYYYMMDD");
  if (!/^[a-z]+$/.test(suffix || "")) throw new Error("note suffix must contain lowercase letters");
  return `N-${encodeBranchSlug(slug)}-${date}${suffix}`;
}

export function branchNamespaceFromName(branchName) {
  if (typeof branchName !== "string" || branchName.length === 0) throw new Error("branch name must be non-empty");
  const namespace = branchName === "main" ? "main" : branchName.replace(/^(project|variant)\//, "");
  if (!namespace) throw new Error("branch namespace must be non-empty");
  return namespace;
}

export function parseTaskId(value) {
  if (typeof value !== "string") return null;
  const legacy = value.match(taskLegacyRe);
  if (legacy) return { id: value, kind: "legacy", encodedSlug: null, slug: null, date: legacy[1], serial: Number(legacy[2]) };
  const permanent = value.match(taskPermanentRe);
  if (!permanent) return null;
  try {
    return {
      id: value,
      kind: "permanent",
      encodedSlug: permanent[1],
      slug: decodeBranchSlug(permanent[1]),
      date: permanent[2],
      serial: Number(permanent[3]),
    };
  } catch {
    return null;
  }
}

// HH-081 stage 2: a framework-repo task may be identified by its GitHub Issue
// number (the Issue is the ID allocator and claim). Kept OUT of parseTaskId on
// purpose — file scans, archive and date-sorted allocation assume the TASK- shape.
// Accepted only where a commit-body record (hh-record) carries the task.
export function parseGithubTaskId(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^GH-([1-9]\d{0,6})$/);
  return match ? { id: value, kind: "github", issue: Number(match[1]) } : null;
}

export function isValidTaskRef(value) {
  return Boolean(parseTaskId(value) || parseGithubTaskId(value));
}

export function extractTaskIds(text) {
  if (typeof text !== "string") return [];
  const candidates = text.match(/TASK-(?:[A-Za-z0-9]+-\d{8}-\d{3}|\d{8}-\d{3})/g) ?? [];
  return [...new Set(candidates.filter((candidate) => parseTaskId(candidate)))];
}

export function formatTaskId({ slug, date, serial }) {
  if (!/^\d{8}$/.test(date || "")) throw new Error("task date must be YYYYMMDD");
  if (!Number.isInteger(serial) || serial < 1 || serial > 999) throw new Error("task serial must be 1..999");
  return `TASK-${encodeBranchSlug(slug)}-${date}-${String(serial).padStart(3, "0")}`;
}

export function parseHhId(value) {
  if (typeof value !== "string") return null;
  const match = value.match(hhRe);
  return match ? { id: value, serial: Number(match[1]) } : null;
}

export function extractHhIds(text) {
  if (typeof text !== "string") return [];
  return [...new Set((text.match(/HH-\d{3}/g) ?? []).filter((candidate) => parseHhId(candidate)))];
}

export function formatHhId(serial) {
  if (!Number.isInteger(serial) || serial < 0 || serial > 999) throw new Error("HH serial must be 0..999");
  return `HH-${String(serial).padStart(3, "0")}`;
}

export function findUnconsumedContractFields(value = contract, usedPaths = consumedPaths) {
  return leafPaths(value).filter((field) => !usedPaths.has(field)).sort();
}

export function contractCoverage() {
  const declared = leafPaths(contract).sort();
  const used = [...consumedPaths].sort();
  return { declared, used, unconsumed: findUnconsumedContractFields(contract, consumedPaths) };
}
