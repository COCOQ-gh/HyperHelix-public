// SC-05a (HH-067 / structured-canon-migration-plan): the knowledge READER.
// Canon: core/knowledge/manifest.yaml (ledger list + project ownership) plus the
// ledgers it declares (main = counters + hyperhelix/shared notes; leaves = one
// project each). Every ledger is read through the formal YAML parser + Ajv strict
// schema — never the legacy line-regex parser. This module is read-only in
// SC-05a (dual-read / legacy-write): the write path and the live consumers
// (notes/next-id/bump/sync/reflux/report) move here in SC-05b, and the legacy
// parser is retired in SC-05c.
// fail-closed: parse/schema/semantic errors return ok:false; consumers must error.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseDocument } from "yaml";
import {
  parseYamlStrict,
  createStrictValidator,
  compileSchema,
  validateWithSchema,
  dispatchSchemaVersion,
} from "./schema-runtime.mjs";
import { KNOWLEDGE_CONTRACT, parseNoteId, assertNewWriteAllowed } from "./contracts.mjs";

const nonEmptyString = { type: "string", minLength: 1 };

const MANIFEST_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "ledgers"],
  properties: {
    schema_version: { type: "integer" },
    ledgers: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "role", "projects"],
        properties: {
          file: nonEmptyString,
          role: { enum: ["main", "leaf"] },
          projects: { type: "array", minItems: 1, items: nonEmptyString },
        },
      },
    },
  },
};

const NOTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "text", "tags", "strength", "last_used", "state"],
  properties: {
    id: nonEmptyString,
    text: nonEmptyString,
    tags: { type: "array", minItems: 1, items: nonEmptyString },
    project: nonEmptyString,
    strength: { type: "integer" },
    last_used: { type: "integer", minimum: 0 },
    state: { enum: KNOWLEDGE_CONTRACT.states },
    kind: { enum: KNOWLEDGE_CONTRACT.kinds },
    leaves: { type: "array", minItems: 1, items: nonEmptyString },
    topic: nonEmptyString,
  },
};

const COUNTERS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["task_index", "last_framework_review"],
  properties: {
    task_index: { type: "integer", minimum: 0 },
    last_framework_review: { type: "integer", minimum: 0 },
    // SC-05b: bump idempotency provenance as a structured field (the legacy
    // `# +1 <taskId>` inline-comment state is retired — machine values never
    // live in prose, HH-067 boundary principle).
    last_bump_task: { type: ["string", "null"] },
    last_always_read_lines: { type: ["integer", "null"] },
    // HH-073: the always-read ratchet gauge in characters. Optional/null so ledgers
    // written before the unit migration stay readable; the first /cycle seeds it.
    last_always_read_chars: { type: ["integer", "null"] },
    // HH-082 A: index-read heads (amendments.md view head + knowledge.yaml header) in
    // characters; judged together with last_always_read_chars.
    last_index_read_chars: { type: ["integer", "null"] },
    last_backlog_open_count: { type: ["integer", "null"] },
    // HH-080: review-count producer. Optional/null so pre-HH-080 ledgers on other
    // branches stay readable; absent counts as 0 at the first review bump.
    review_ordinal: { type: ["integer", "null"], minimum: 0 },
  },
};

const MAIN_LEDGER_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "counters", "notes"],
  properties: {
    schema_version: { type: "integer" },
    counters: COUNTERS_SCHEMA,
    notes: { type: "array", items: NOTE_SCHEMA },
  },
};

const LEAF_LEDGER_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "notes"],
  properties: {
    schema_version: { type: "integer" },
    notes: { type: "array", items: NOTE_SCHEMA },
  },
};

const ajv = createStrictValidator();
const validateManifestSchema = compileSchema(ajv, MANIFEST_SCHEMA);
const validateMainLedgerSchema = compileSchema(ajv, MAIN_LEDGER_SCHEMA);
const validateLeafLedgerSchema = compileSchema(ajv, LEAF_LEDGER_SCHEMA);
const SUPPORTED_VERSIONS = { 1: true };

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/");
}

function parseVersioned(text, validateFn, source) {
  const parsed = parseYamlStrict(text, { source });
  if (!parsed.ok) return parsed;
  const version = dispatchSchemaVersion(SUPPORTED_VERSIONS, parsed.value?.schema_version, { source });
  if (!version.ok) return version;
  const checked = validateWithSchema(validateFn, parsed.value, { source });
  if (!checked.ok) return checked;
  return { ok: true, value: parsed.value };
}

// Manifest semantic rules: exactly one main; no duplicate ledger files; a
// project slug is owned by exactly one ledger; every listed file exists; every
// *.yaml in the ledger dir (except the manifest itself) is listed (no orphan).
export function loadKnowledgeManifest(root = process.cwd()) {
  const source = KNOWLEDGE_CONTRACT.manifest;
  const absolute = path.join(root, source);
  if (!fs.existsSync(absolute)) return { ok: false, errors: [`${source}: manifest is missing — fail-closed`] };
  const loaded = parseVersioned(fs.readFileSync(absolute, "utf8"), validateManifestSchema, source);
  if (!loaded.ok) return loaded;
  const errors = [];
  const files = new Set();
  const owners = new Map();
  const mains = loaded.value.ledgers.filter((l) => l.role === "main");
  if (mains.length !== 1) errors.push(`${source}: exactly one ledger must have role 'main'; found ${mains.length}`);
  else if (normalizePath(mains[0].file) !== KNOWLEDGE_CONTRACT.mainLedger) {
    errors.push(`${source}: the main ledger must be ${KNOWLEDGE_CONTRACT.mainLedger} (got '${mains[0].file}')`);
  }
  for (const ledger of loaded.value.ledgers) {
    const file = normalizePath(ledger.file);
    if (files.has(file)) errors.push(`${source}: duplicate ledger file '${file}'`);
    files.add(file);
    if (!fs.existsSync(path.join(root, file))) errors.push(`${source}: ledger file ${file} is missing`);
    for (const project of ledger.projects) {
      if (owners.has(project)) errors.push(`${source}: project '${project}' is owned by both ${owners.get(project)} and ${file}`);
      owners.set(project, file);
    }
  }
  const dirAbsolute = path.join(root, KNOWLEDGE_CONTRACT.ledgerDir);
  if (fs.existsSync(dirAbsolute)) {
    for (const name of fs.readdirSync(dirAbsolute)) {
      const relative = `${KNOWLEDGE_CONTRACT.ledgerDir}/${name}`;
      if (!name.endsWith(".yaml") || relative === KNOWLEDGE_CONTRACT.manifest) continue;
      if (!files.has(relative)) errors.push(`${relative}: ledger file is not declared in the manifest (orphan — declare it or remove it)`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: loaded.value, owners };
}

const BOM = "﻿";

function stripBom(text) {
  return text.startsWith(BOM) ? text.slice(1) : text;
}

// Full read: manifest + every declared ledger through parser/schema, plus
// cross-ledger semantics — duplicate ids, note-id grammar, project ownership,
// playbook/leaf reference integrity and field pairing. `overrides` (SC-05b)
// substitutes candidate texts by relative path so the writer can validate the
// POST-write state before anything becomes visible.
export function loadKnowledge(root = process.cwd(), { overrides = null } = {}) {
  const manifest = loadKnowledgeManifest(root);
  if (!manifest.ok) return manifest;
  const errors = [];
  const notes = [];
  let counters = null;
  for (const ledger of manifest.value.ledgers) {
    const file = normalizePath(ledger.file);
    const absolute = path.join(root, file);
    const overridden = overrides?.get(file);
    if (overridden === undefined && !fs.existsSync(absolute)) continue; // already reported by the manifest load
    const schema = ledger.role === "main" ? validateMainLedgerSchema : validateLeafLedgerSchema;
    const loaded = parseVersioned(stripBom(overridden ?? fs.readFileSync(absolute, "utf8")), schema, file);
    if (!loaded.ok) { errors.push(...loaded.errors); continue; }
    if (ledger.role === "main") counters = loaded.value.counters;
    for (const note of loaded.value.notes) {
      notes.push({ ...note, sourceFile: file });
      const parsedId = parseNoteId(note.id);
      if (!parsedId) errors.push(`${file}: note id '${note.id}' does not match the note-id contract`);
      const project = note.project ?? "shared";
      if (!ledger.projects.includes(project)) {
        errors.push(`${file}: ${note.id} has project '${project}' but this ledger owns [${ledger.projects.join(", ")}]`);
      }
      if (note.kind === "playbook" && !note.leaves) errors.push(`${file}: ${note.id} is a playbook but has no leaves`);
      if (note.kind === "leaf" && !note.topic) errors.push(`${file}: ${note.id} is a leaf but has no topic`);
      if (!note.kind && (note.leaves || note.topic)) errors.push(`${file}: ${note.id} carries leaves/topic without a kind`);
    }
  }
  const ids = new Map();
  for (const note of notes) {
    if (ids.has(note.id)) errors.push(`duplicate note id '${note.id}' (${ids.get(note.id)} and ${note.sourceFile})`);
    ids.set(note.id, note.sourceFile);
  }
  for (const note of notes) {
    for (const leaf of note.leaves ?? []) {
      if (!ids.has(leaf)) errors.push(`${note.sourceFile}: ${note.id} lists unknown leaf '${leaf}'`);
    }
    if (note.topic && !ids.has(note.topic)) errors.push(`${note.sourceFile}: ${note.id} points to unknown topic '${note.topic}'`);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { manifest: manifest.value, counters, notes } };
}

// Parse ONE ledger's notes from text (no filesystem) — used for origin/main
// texts fetched via `git show` (next-id remote reconciliation). fail-closed.
export function parseLedgerNotesText(text, role, { source = "<ledger>" } = {}) {
  const schema = role === "main" ? validateMainLedgerSchema : validateLeafLedgerSchema;
  const loaded = parseVersioned(stripBom(String(text ?? "")), schema, source);
  if (!loaded.ok) return loaded;
  return { ok: true, value: { notes: loaded.value.notes, counters: loaded.value.counters ?? null } };
}

// --- S2 retrieval (SC-05b: the `notes` command reads through the repository) ---

export function queryNotes(root, { tags, project = null, topN }) {
  const loaded = loadKnowledge(root);
  if (!loaded.ok) return loaded;
  const wantTags = new Set(tags.map((tag) => tag.toLowerCase()));
  // Project scoping is fail-loud (TASK-Project001-20260821-019). Task ids carry the
  // branch slug verbatim (TASK-Project001-…) while ledger `project:` values are the
  // lowercase file slug (Project001), so an exact compare silently collapsed the
  // candidate pool to shared-only with no signal. Resolve case-insensitively and
  // report what happened so the caller can warn instead of returning a quiet 0.
  const known = [...new Set(loaded.value.notes.map((note) => note.project)
    .filter((value) => value && value !== "shared"))].sort();
  let resolved = project;
  let match = "none";
  if (project) {
    if (known.includes(project)) match = "exact";
    else {
      const insensitive = known.filter((value) => value.toLowerCase() === project.toLowerCase());
      if (insensitive.length === 1) { resolved = insensitive[0]; match = "case-insensitive"; }
    }
  }
  const matched = loaded.value.notes.filter((note) => {
    if (note.state !== "active") return false;
    if (resolved && note.project && note.project !== resolved && note.project !== "shared") return false; // absent project == shared
    return note.tags.some((tag) => wantTags.has(tag.toLowerCase()));
  });
  const byRecency = (a, b) => (b.last_used - a.last_used) || (b.strength - a.strength);
  const playbooks = matched.filter((note) => note.kind === "playbook").sort(byRecency);
  const rest = matched.filter((note) => note.kind !== "playbook").sort(byRecency);
  return {
    ok: true,
    value: {
      matched,
      top: [...playbooks, ...rest].slice(0, topN),
      projectScope: { requested: project, resolved, match, known },
    },
  };
}

// --- write layer (SC-05b) ---
// Mutations are Document edits (comments and formatting preserved; verified
// byte-stable on the live ledgers) and every write commits through
// commitKnowledgeWrites: validate ALL candidate texts (schema + cross-ledger
// semantics on the post-state), write same-directory temp files, fsync, then
// rename in fixed order. A failure leaves no partial state visible (SC-RT-10).

const STRINGIFY_OPTIONS = { lineWidth: 0, flowCollectionPadding: false };

function openLedgerDocument(root, relative) {
  const raw = fs.readFileSync(path.join(root, relative), "utf8");
  const bom = raw.startsWith(BOM);
  const doc = parseDocument(bom ? raw.slice(1) : raw, { schema: "core", uniqueKeys: true, merge: false });
  if (doc.errors.length) {
    return { ok: false, errors: doc.errors.map((e) => `${relative}: ${e.code}: ${e.message.split("\n")[0]}`) };
  }
  return { ok: true, doc, bom, relative };
}

function serializeLedgerDocument({ doc, bom }) {
  return (bom ? BOM : "") + doc.toString(STRINGIFY_OPTIONS);
}

// Set a scalar IN PLACE (preserves the node's inline comment and formatting);
// falls back to setIn when the key does not exist yet.
function setScalar(doc, keyPath, value) {
  const node = doc.getIn(keyPath, true);
  if (node && typeof node === "object" && "value" in node) node.value = value;
  else doc.setIn(keyPath, value);
}

export function commitKnowledgeWrites(root, writes, { epochs = null } = {}) {
  if (!writes.length) return { ok: true, written: [] };
  // SC-06: the domain epoch must allow structured-canon writes (fail-closed).
  try { assertNewWriteAllowed("knowledge", epochs ? { epochs } : {}); }
  catch (err) { return { ok: false, errors: [err.message] }; }
  const manifest = loadKnowledgeManifest(root);
  if (!manifest.ok) return manifest;
  const declared = new Set(manifest.value.ledgers.map((ledger) => normalizePath(ledger.file)));
  const errors = [];
  const seen = new Set();
  for (const write of writes) {
    const relative = normalizePath(write.relative);
    if (!declared.has(relative)) errors.push(`${relative}: not a declared ledger — refusing to write`);
    if (seen.has(relative)) errors.push(`${relative}: duplicate write in one commit`);
    seen.add(relative);
  }
  if (errors.length) return { ok: false, errors };
  const post = loadKnowledge(root, { overrides: new Map(writes.map((w) => [normalizePath(w.relative), w.text])) });
  if (!post.ok) return { ok: false, errors: post.errors };
  const ordered = [...writes].sort((a, b) => normalizePath(a.relative).localeCompare(normalizePath(b.relative)));
  const temps = [];
  try {
    for (const write of ordered) {
      const absolute = path.join(root, normalizePath(write.relative));
      const temp = `${absolute}.tmp-${process.pid}`;
      const fd = fs.openSync(temp, "w");
      try {
        fs.writeSync(fd, write.text);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      temps.push({ temp, absolute });
    }
    for (const entry of temps) fs.renameSync(entry.temp, entry.absolute);
  } catch (err) {
    for (const entry of temps) { try { fs.rmSync(entry.temp, { force: true }); } catch { /* best effort */ } }
    return { ok: false, errors: [`atomic write failed — no ledger was replaced beyond the rename point: ${err.message}`] };
  }
  return { ok: true, written: ordered.map((w) => normalizePath(w.relative)) };
}

// One task's counter/strength deltas as candidate texts. Idempotency is the
// structured counters.last_bump_task field (never an inline comment): a re-run
// for the SAME task keeps the counter and applies only late note attribution;
// per-note idempotency skips notes already at last_used == the bump target.
export function planBump(root, { taskId, uses = [], misses = [], review = false }) {
  const loaded = loadKnowledge(root);
  if (!loaded.ok) return loaded;
  const { counters, notes } = loaded.value;
  const alreadyBumped = counters.last_bump_task === taskId;
  const from = counters.task_index;
  const to = alreadyBumped ? from : from + 1;
  const log = [];
  const docs = new Map();
  const errors = [];
  const openDoc = (relative) => {
    if (!docs.has(relative)) {
      const opened = openLedgerDocument(root, relative);
      if (!opened.ok) { errors.push(...opened.errors); return null; }
      docs.set(relative, opened);
    }
    return docs.get(relative);
  };
  const changedNoteFiles = new Set();
  let countersChanged = false;
  const main = openDoc(KNOWLEDGE_CONTRACT.mainLedger);
  if (!main) return { ok: false, errors };
  if (!alreadyBumped) {
    setScalar(main.doc, ["counters", "task_index"], to);
    setScalar(main.doc, ["counters", "last_bump_task"], taskId);
    countersChanged = true;
    log.push(`task_index ${from} -> ${to}`);
  } else {
    log.push(`task_index は既に ${taskId} で bump 済み — カウンタ据置きで --use/--miss/--review のみ適用します(後追い帰属)。`);
  }
  if (review) {
    setScalar(main.doc, ["counters", "last_framework_review"], to);
    // HH-080: count the review itself. Idempotent across re-runs of the same task:
    // once the first run lands, counters.last_framework_review === to and the
    // increment is skipped (mirrors the task_index idempotency above).
    if (counters.last_framework_review !== to) {
      const ordinal = (counters.review_ordinal ?? 0) + 1;
      setScalar(main.doc, ["counters", "review_ordinal"], ordinal);
      log.push(`review_ordinal -> ${ordinal}`);
    }
    countersChanged = true;
  }
  const byId = new Map(notes.map((note) => [note.id, note]));
  const nudge = (id, delta, label) => {
    const note = byId.get(id);
    if (!note) { errors.push(`unknown note in --${label}: ${id}`); return; }
    if (note.last_used === to) { log.push(`${id}: 既に last_used=${to}(このタスクで nudge 済み)— スキップ`); return; }
    const opened = openDoc(note.sourceFile);
    if (!opened) return;
    const index = loaded.value.notes.filter((n) => n.sourceFile === note.sourceFile).indexOf(note);
    setScalar(opened.doc, ["notes", index, "strength"], note.strength + delta);
    setScalar(opened.doc, ["notes", index, "last_used"], to);
    changedNoteFiles.add(note.sourceFile);
    log.push(`${id} [note ledger ${note.sourceFile}]: strength ${note.strength} -> ${note.strength + delta}, last_used=${to}`);
  };
  for (const id of uses) nudge(id, +1, "use");
  for (const id of misses) nudge(id, -1, "miss");
  if (errors.length) return { ok: false, errors };
  const changedFiles = new Set(changedNoteFiles);
  if (countersChanged) changedFiles.add(KNOWLEDGE_CONTRACT.mainLedger);
  const writes = [...changedFiles].map((relative) => ({ relative, text: serializeLedgerDocument(docs.get(relative)) }));
  return {
    ok: true,
    value: {
      alreadyBumped,
      from,
      to,
      log,
      writes,
      counterChanged: countersChanged,
      changedNoteFiles: [...changedNoteFiles],
      noop: !countersChanged && changedNoteFiles.size === 0,
    },
  };
}

// Baseline counters (cost-report / consolidation-report --write-baseline).
export function setBaselineCounter(root, key, value) {
  if (!["last_always_read_lines", "last_always_read_chars", "last_index_read_chars", "last_backlog_open_count"].includes(key)) {
    return { ok: false, errors: [`${key}: not a baseline counter`] };
  }
  const opened = openLedgerDocument(root, KNOWLEDGE_CONTRACT.mainLedger);
  if (!opened.ok) return opened;
  setScalar(opened.doc, ["counters", key], value);
  return commitKnowledgeWrites(root, [{ relative: KNOWLEDGE_CONTRACT.mainLedger, text: serializeLedgerDocument(opened) }]);
}

// High-water merge for a main-ledger merge/cherry-pick conflict (reflux):
// both SIDES (git index stages, not conflict markers) must be formally valid
// and agree on everything except counters; counters merge by max, and
// last_bump_task follows the side whose task_index won.
export function mergeCounterHighWater(oursText, theirsText) {
  const ours = parseVersioned(stripBom(oursText), validateMainLedgerSchema, "ours(core/knowledge.yaml stage 2)");
  if (!ours.ok) return ours;
  const theirs = parseVersioned(stripBom(theirsText), validateMainLedgerSchema, "theirs(core/knowledge.yaml stage 3)");
  if (!theirs.ok) return theirs;
  const stripCounters = (value) => ({ ...value, counters: null });
  if (JSON.stringify(stripCounters(ours.value)) !== JSON.stringify(stripCounters(theirs.value))) {
    return { ok: false, errors: ["conflict is not counter-only (notes or structure differ) — resolve manually"] };
  }
  const bom = oursText.startsWith(BOM);
  const doc = parseDocument(stripBom(oursText), { schema: "core", uniqueKeys: true, merge: false });
  const numericMax = (key) => {
    const a = ours.value.counters[key];
    const b = theirs.value.counters[key];
    if (a === null || a === undefined) return b ?? null;
    if (b === null || b === undefined) return a;
    return Math.max(a, b);
  };
  for (const key of ["task_index", "last_framework_review", "review_ordinal", "last_always_read_lines", "last_always_read_chars", "last_index_read_chars", "last_backlog_open_count"]) {
    const merged = numericMax(key);
    if (merged !== null && (ours.value.counters[key] !== undefined || theirs.value.counters[key] !== undefined)) {
      setScalar(doc, ["counters", key], merged);
    }
  }
  const winner = (theirs.value.counters.task_index ?? 0) > (ours.value.counters.task_index ?? 0) ? theirs : ours;
  if (winner.value.counters.last_bump_task !== undefined) {
    setScalar(doc, ["counters", "last_bump_task"], winner.value.counters.last_bump_task);
  }
  return { ok: true, text: (bom ? BOM : "") + doc.toString(STRINGIFY_OPTIONS) };
}
