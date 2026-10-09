// SC-04 (HH-067 / structured-canon-migration-plan): the governance repository.
// Canon: governance/amendments/registry.yaml (HH lifecycle state: id, title, type,
// status, ratified_by, ratified_at, supersedes, body path) plus
// governance/amendments/bodies/HH-NNN.md (verbatim historical body text — NEVER
// machine-parsed) and governance/amendments/view-template.md (human intent prose
// with generated placeholders). amendments.md is a DETERMINISTIC GENERATED VIEW:
// hand edits are forbidden and detected as byte drift (fail-closed).
// Lifecycle state comes ONLY from the registry — Pending/Approved headings and
// **Status:** lines in bodies/views are display, never execution state (SC-RT-07).

import fs from "node:fs";
import path from "node:path";
import {
  parseYamlStrict,
  createStrictValidator,
  compileSchema,
  validateWithSchema,
  dispatchSchemaVersion,
} from "./schema-runtime.mjs";
import { GOVERNANCE_CONTRACT, AMENDMENTS_LIFECYCLE, parseHhId, assertNewWriteAllowed } from "./contracts.mjs";

const nonEmptyString = { type: "string", minLength: 1 };

const REGISTRY_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "entries"],
  properties: {
    schema_version: { type: "integer" },
    entries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "type", "status", "ratified_by", "ratified_at", "supersedes", "body"],
        properties: {
          id: { type: "string", pattern: "^HH-\\d{3}$" },
          title: nonEmptyString,
          type: nonEmptyString,
          status: { enum: GOVERNANCE_CONTRACT.statuses },
          status_label: nonEmptyString,
          ratified_by: { type: ["string", "null"] },
          ratified_at: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          supersedes: { type: "array", items: { type: "string", pattern: "^HH-\\d{3}$" } },
          body: nonEmptyString,
        },
      },
    },
  },
};

const ajv = createStrictValidator();
const validateRegistrySchema = compileSchema(ajv, REGISTRY_SCHEMA);
const SUPPORTED_VERSIONS = { 1: true };

export function hhSerial(id) {
  return parseHhId(id)?.serial ?? -1;
}

export function maxHhSerial(entries) {
  return entries.reduce((max, entry) => Math.max(max, hhSerial(entry.id)), 0);
}

function expectedBodyPath(id) {
  const bodiesLeaf = path.posix.basename(GOVERNANCE_CONTRACT.bodiesDir);
  return `${bodiesLeaf}/${id}.md`;
}

// Cross-field rules on the parsed registry object only (no filesystem):
// duplicate ids, status<->attestation consistency, supersedes reference
// integrity, deterministic body-path mapping. Returns { errors, warnings }.
export function semanticRegistryIssues(registry, source) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  for (const entry of registry.entries) {
    if (ids.has(entry.id)) errors.push(`${source}: duplicate entry id '${entry.id}'`);
    ids.add(entry.id);
    if (entry.body !== expectedBodyPath(entry.id)) {
      errors.push(`${source}: ${entry.id} body must be '${expectedBodyPath(entry.id)}' (got '${entry.body}')`);
    }
    if (entry.status === "Pending" && (entry.ratified_by !== null || entry.ratified_at !== null)) {
      errors.push(`${source}: ${entry.id} is Pending but carries ratification attestation (status/attestation inconsistency)`);
    }
    if (entry.status === "Approved" && (!entry.ratified_by || !entry.ratified_at)) {
      warnings.push(`${source}: ${entry.id} is Approved but ratified_by/ratified_at (self-attested approval) is empty — record the human attester (HH-046: attestation completeness, not enforcement)`);
    }
  }
  for (const entry of registry.entries) {
    for (const target of entry.supersedes) {
      if (target === entry.id) errors.push(`${source}: ${entry.id} cannot supersede itself`);
      else if (!ids.has(target)) errors.push(`${source}: ${entry.id} supersedes unknown entry '${target}'`);
    }
  }
  return { errors, warnings };
}

// Parse + schema + semantic checks on registry TEXT (no body-file existence
// checks — used for the local file and for origin/main text in next-hh-id).
export function parseGovernanceRegistryText(text, { source = GOVERNANCE_CONTRACT.registry } = {}) {
  const parsed = parseYamlStrict(text, { source });
  if (!parsed.ok) return { ...parsed, warnings: [] };
  const version = dispatchSchemaVersion(SUPPORTED_VERSIONS, parsed.value?.schema_version, { source });
  if (!version.ok) return { ...version, warnings: [] };
  const checked = validateWithSchema(validateRegistrySchema, parsed.value, { source });
  if (!checked.ok) return { ...checked, warnings: [] };
  const semantic = semanticRegistryIssues(parsed.value, source);
  if (semantic.errors.length) return { ok: false, errors: semantic.errors, warnings: semantic.warnings };
  return { ok: true, value: parsed.value, warnings: semantic.warnings };
}

// Full repository load: registry text checks + body files exist and are
// non-empty + no orphan body file outside the registry (index completeness).
export function loadGovernanceRegistry(root = process.cwd()) {
  const source = GOVERNANCE_CONTRACT.registry;
  const absolute = path.join(root, source);
  if (!fs.existsSync(absolute)) return { ok: false, errors: [`${source}: registry is missing — fail-closed`], warnings: [] };
  const loaded = parseGovernanceRegistryText(fs.readFileSync(absolute, "utf8"), { source });
  if (!loaded.ok) return loaded;
  const errors = [];
  const referenced = new Set();
  for (const entry of loaded.value.entries) {
    const bodyRelative = `${GOVERNANCE_CONTRACT.bodiesDir}/${entry.id}.md`;
    referenced.add(`${entry.id}.md`);
    const bodyAbsolute = path.join(root, bodyRelative);
    if (!fs.existsSync(bodyAbsolute)) errors.push(`${source}: ${entry.id} body file ${bodyRelative} is missing`);
    else if (fs.readFileSync(bodyAbsolute, "utf8").trim() === "") errors.push(`${source}: ${entry.id} body file ${bodyRelative} is empty`);
  }
  const bodiesAbsolute = path.join(root, GOVERNANCE_CONTRACT.bodiesDir);
  if (fs.existsSync(bodiesAbsolute)) {
    for (const name of fs.readdirSync(bodiesAbsolute)) {
      if (name.endsWith(".md") && !referenced.has(name)) {
        errors.push(`${GOVERNANCE_CONTRACT.bodiesDir}/${name}: body file has no registry entry (orphan)`);
      }
    }
  }
  if (errors.length) return { ok: false, errors: [...errors], warnings: loaded.warnings };
  return { ok: true, value: loaded.value, warnings: loaded.warnings };
}

// --- deterministic view rendering (amendments.md) ---

const EMPTY_PENDING_LINE = "現在なし。lifecycle の固定 anchor であるため、空でも本ヘッダを削除しない(HH-066 / TASK-20260717-003)。";

function indexCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, " ").trim();
}

function renderIndexTable(entries) {
  const rows = [...entries].sort((a, b) => hhSerial(a.id) - hhSerial(b.id))
    .map((e) => `| ${e.id} | ${indexCell(e.title)} | ${indexCell(e.type)} | ${indexCell(e.status_label ?? e.status)} |`);
  return ["| 番号 | 表題(=効果の要約) | 種別 | Status |", "|------|------|------|--------|", ...rows].join("\n");
}

function renderBodies(entries, root) {
  return [...entries].sort((a, b) => hhSerial(b.id) - hhSerial(a.id))
    .map((e) => fs.readFileSync(path.join(root, GOVERNANCE_CONTRACT.bodiesDir, `${e.id}.md`), "utf8").trimEnd())
    .join("\n\n");
}

// The template must contain each generated placeholder exactly once, the two
// lifecycle headings (AMENDMENTS_LIFECYCLE contract) exactly once each, and the
// Pending heading before the Approved heading. Fail-closed on any deviation.
export function templateSanityErrors(template) {
  const errors = [];
  for (const placeholder of GOVERNANCE_CONTRACT.placeholders) {
    const count = template.split(placeholder).length - 1;
    if (count !== 1) errors.push(`${GOVERNANCE_CONTRACT.viewTemplate}: placeholder ${placeholder} must appear exactly once; found ${count}`);
  }
  const pendingIndex = template.indexOf(AMENDMENTS_LIFECYCLE.pendingHeading);
  const approvedIndex = template.indexOf(AMENDMENTS_LIFECYCLE.approvedHeading);
  if (pendingIndex === -1) errors.push(`${GOVERNANCE_CONTRACT.viewTemplate}: Pending heading is missing`);
  if (approvedIndex === -1) errors.push(`${GOVERNANCE_CONTRACT.viewTemplate}: Approved heading is missing`);
  if (pendingIndex !== -1 && approvedIndex !== -1 && pendingIndex >= approvedIndex) {
    errors.push(`${GOVERNANCE_CONTRACT.viewTemplate}: Pending heading must precede Approved heading`);
  }
  return errors;
}

export function renderAmendmentsView(root = process.cwd()) {
  const loaded = loadGovernanceRegistry(root);
  if (!loaded.ok) return { ok: false, errors: loaded.errors, warnings: loaded.warnings };
  const templateAbsolute = path.join(root, GOVERNANCE_CONTRACT.viewTemplate);
  if (!fs.existsSync(templateAbsolute)) {
    return { ok: false, errors: [`${GOVERNANCE_CONTRACT.viewTemplate}: view template is missing — fail-closed`], warnings: loaded.warnings };
  }
  const template = fs.readFileSync(templateAbsolute, "utf8");
  const sanity = templateSanityErrors(template);
  if (sanity.length) return { ok: false, errors: sanity, warnings: loaded.warnings };
  const entries = loaded.value.entries;
  const pending = entries.filter((e) => e.status === "Pending");
  const logged = entries.filter((e) => e.status !== "Pending");
  const [indexToken, pendingToken, approvedToken] = GOVERNANCE_CONTRACT.placeholders;
  const text = template
    .replace(indexToken, renderIndexTable(entries))
    .replace(pendingToken, pending.length ? renderBodies(pending, root) : EMPTY_PENDING_LINE)
    .replace(approvedToken, renderBodies(logged, root));
  return { ok: true, text: text.endsWith("\n") ? text : `${text}\n`, warnings: loaded.warnings };
}

export function amendmentsViewDrift(root = process.cwd()) {
  const rendered = renderAmendmentsView(root);
  if (!rendered.ok) return { drifted: true, errors: rendered.errors };
  const viewAbsolute = path.join(root, GOVERNANCE_CONTRACT.view);
  if (!fs.existsSync(viewAbsolute)) return { drifted: true, errors: [`${GOVERNANCE_CONTRACT.view}: generated view is missing — run \`hyperhelix.mjs amendments-doc\``] };
  if (fs.readFileSync(viewAbsolute, "utf8") !== rendered.text) {
    return { drifted: true, errors: [`${GOVERNANCE_CONTRACT.view}: drifts from governance/ canon — edit registry/bodies/template, then run \`hyperhelix.mjs amendments-doc\` (hand edits to the view are forbidden)`] };
  }
  return { drifted: false, errors: [] };
}

export function writeAmendmentsView(root = process.cwd(), { epochs = null } = {}) {
  // SC-06: the domain epoch must allow structured-canon writes (fail-closed).
  try { assertNewWriteAllowed("governance", epochs ? { epochs } : {}); }
  catch (err) { return { ok: false, errors: [err.message] }; }
  const rendered = renderAmendmentsView(root);
  if (!rendered.ok) return rendered;
  fs.writeFileSync(path.join(root, GOVERNANCE_CONTRACT.view), rendered.text, "utf8");
  return { ok: true, relative: GOVERNANCE_CONTRACT.view, warnings: rendered.warnings };
}

// Files the integrity scans (e.g. CONFLICT_MARKER) must cover for this domain.
export function governanceScanFiles(root = process.cwd()) {
  const out = [GOVERNANCE_CONTRACT.registry, GOVERNANCE_CONTRACT.viewTemplate];
  const bodiesAbsolute = path.join(root, GOVERNANCE_CONTRACT.bodiesDir);
  if (fs.existsSync(bodiesAbsolute)) {
    for (const name of fs.readdirSync(bodiesAbsolute)) {
      if (name.endsWith(".md")) out.push(`${GOVERNANCE_CONTRACT.bodiesDir}/${name}`);
    }
  }
  return out.filter((relative) => fs.existsSync(path.join(root, relative)));
}
