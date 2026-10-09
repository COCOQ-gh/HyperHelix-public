// SC-05a (HH-067): knowledge reader tests — the manifest declares the ledger
// set + project ownership, every ledger round-trips the formal parser/schema,
// and cross-ledger semantics (duplicate ids, ownership, playbook/leaf refs,
// orphan ledgers) are fail-closed. SC-RT-09 parity half: the real repo reads green.
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { KNOWLEDGE_CONTRACT } from "../tools/lib/contracts.mjs";
import { loadKnowledge, loadKnowledgeManifest, queryNotes } from "../tools/lib/knowledge.mjs";
import { withTempDir } from "./helpers/repo-fixture.mjs";

const root = path.dirname(fileURLToPath(new URL("../entrypoint.md", import.meta.url)));

const NOTE_DEFAULTS = { text: "t", tags: ["a"], strength: 1, last_used: 0, state: "active" };

function mainLedgerYaml(notes) {
  return [
    "schema_version: 1",
    "counters:",
    "  task_index: 10",
    "  last_framework_review: 10",
    "notes:",
    ...notes.map((n) => `  - ${JSON.stringify({ ...NOTE_DEFAULTS, ...n })}`),
    "",
  ].join("\n");
}

function leafLedgerYaml(notes) {
  return [
    "schema_version: 1",
    "notes:",
    ...notes.map((n) => `  - ${JSON.stringify({ ...NOTE_DEFAULTS, ...n })}`),
    "",
  ].join("\n");
}

function manifestYaml(ledgers) {
  const lines = ["schema_version: 1", "ledgers:"];
  for (const l of ledgers) {
    lines.push(`  - file: ${l.file}`);
    lines.push(`    role: ${l.role}`);
    lines.push(`    projects: [${l.projects.join(", ")}]`);
  }
  return `${lines.join("\n")}\n`;
}

function writeCanon(dir, { manifest, main, leaves = {} }) {
  fs.mkdirSync(path.join(dir, KNOWLEDGE_CONTRACT.ledgerDir), { recursive: true });
  if (manifest !== null) fs.writeFileSync(path.join(dir, KNOWLEDGE_CONTRACT.manifest), manifest, "utf8");
  if (main !== null) fs.writeFileSync(path.join(dir, KNOWLEDGE_CONTRACT.mainLedger), main, "utf8");
  for (const [name, text] of Object.entries(leaves)) {
    fs.writeFileSync(path.join(dir, KNOWLEDGE_CONTRACT.ledgerDir, name), text, "utf8");
  }
}

const BASE_MANIFEST = manifestYaml([
  { file: KNOWLEDGE_CONTRACT.mainLedger, role: "main", projects: ["hyperhelix", "shared"] },
  { file: `${KNOWLEDGE_CONTRACT.ledgerDir}/proj.yaml`, role: "leaf", projects: ["proj"] },
]);

test("SC-RT-09 (reader half): the real repo's manifest + every ledger reads green", () => {
  const loaded = loadKnowledge(root);
  assert.equal(loaded.ok, true, (loaded.errors ?? []).join("; "));
  assert.ok(loaded.value.notes.length >= 87);
  assert.ok(Number.isInteger(loaded.value.counters.task_index));
  const ids = new Set(loaded.value.notes.map((n) => n.id));
  assert.equal(ids.size, loaded.value.notes.length, "note ids are globally unique");
});

test("knowledge reader: valid canon loads notes with source files and counters", () => {
  withTempDir((dir) => {
    writeCanon(dir, {
      manifest: BASE_MANIFEST,
      main: mainLedgerYaml([{ id: "N-001", project: "hyperhelix" }, { id: "N-002" }]),
      leaves: { "proj.yaml": leafLedgerYaml([{ id: "N-003", project: "proj" }]) },
    });
    const loaded = loadKnowledge(dir);
    assert.equal(loaded.ok, true, (loaded.errors ?? []).join("; "));
    assert.equal(loaded.value.notes.length, 3);
    assert.equal(loaded.value.counters.task_index, 10);
    assert.equal(loaded.value.notes[2].sourceFile, `${KNOWLEDGE_CONTRACT.ledgerDir}/proj.yaml`);
  });
});

test("manifest semantics: missing/duplicate/orphan/double-main/double-owner are rejected", () => {
  withTempDir((dir) => {
    // missing manifest
    writeCanon(dir, { manifest: null, main: mainLedgerYaml([]) });
    assert.match(loadKnowledgeManifest(dir).errors.join(" "), /manifest is missing/);

    // orphan ledger not declared
    writeCanon(dir, {
      manifest: manifestYaml([{ file: KNOWLEDGE_CONTRACT.mainLedger, role: "main", projects: ["hyperhelix", "shared"] }]),
      main: mainLedgerYaml([]),
      leaves: { "stray.yaml": leafLedgerYaml([]) },
    });
    assert.match(loadKnowledgeManifest(dir).errors.join(" "), /stray\.yaml: ledger file is not declared/);
    fs.rmSync(path.join(dir, KNOWLEDGE_CONTRACT.ledgerDir, "stray.yaml"));

    // declared file missing
    writeCanon(dir, { manifest: BASE_MANIFEST, main: mainLedgerYaml([]) });
    assert.match(loadKnowledgeManifest(dir).errors.join(" "), /proj\.yaml is missing/);

    // two mains / duplicate project owner
    writeCanon(dir, {
      manifest: manifestYaml([
        { file: KNOWLEDGE_CONTRACT.mainLedger, role: "main", projects: ["hyperhelix", "shared"] },
        { file: `${KNOWLEDGE_CONTRACT.ledgerDir}/proj.yaml`, role: "main", projects: ["shared"] },
      ]),
      main: mainLedgerYaml([]),
      leaves: { "proj.yaml": leafLedgerYaml([]) },
    });
    const dup = loadKnowledgeManifest(dir);
    assert.match(dup.errors.join(" "), /exactly one ledger must have role 'main'/);
    assert.match(dup.errors.join(" "), /project 'shared' is owned by both/);
  });
});

test("cross-ledger semantics: duplicate ids, ownership, refs, and kind pairing are rejected", () => {
  withTempDir((dir) => {
    writeCanon(dir, {
      manifest: BASE_MANIFEST,
      main: mainLedgerYaml([
        { id: "N-001", project: "hyperhelix", kind: "playbook", leaves: ["N-900"] },
        { id: "N-002", kind: "leaf" },
        { id: "N-003", topic: "N-001" },
        { id: "bogus" },
      ]),
      leaves: { "proj.yaml": leafLedgerYaml([{ id: "N-001", project: "hyperhelix" }]) },
    });
    const loaded = loadKnowledge(dir);
    assert.equal(loaded.ok, false);
    const joined = loaded.errors.join(" ");
    assert.match(joined, /duplicate note id 'N-001'/);
    assert.match(joined, /has project 'hyperhelix' but this ledger owns \[proj\]/);
    assert.match(joined, /lists unknown leaf 'N-900'/);
    assert.match(joined, /is a leaf but has no topic/);
    assert.match(joined, /carries leaves\/topic without a kind/);
    assert.match(joined, /note id 'bogus' does not match/);
  });
});

test("SC-05c: the legacy line readers stay retired (forbidden live expressions)", () => {
  const tool = fs.readFileSync(path.join(root, "tools/hyperhelix.mjs"), "utf8");
  for (const banned of ["function parseNotes", "function loadAllNotes", "function ledgerFiles", "function schemaVersion", "function counter("]) {
    assert.equal(tool.includes(banned), false, `${banned} must not return to tools/hyperhelix.mjs (SC-05c cutover)`);
  }
});

test("schema strictness: unknown fields, bad enums, and coerced types are rejected", () => {
  withTempDir((dir) => {
    const cases = [
      [{ id: "N-010", extra: 1 }, /additional properties/i],
      [{ id: "N-011", state: "retired" }, /equal to one of the allowed values/],
      [{ id: "N-012", strength: "1" }, /must be integer/],
      [{ id: "N-013", tags: [] }, /fewer than 1 items/],
    ];
    for (const [note, pattern] of cases) {
      writeCanon(dir, { manifest: BASE_MANIFEST, main: mainLedgerYaml([note]), leaves: { "proj.yaml": leafLedgerYaml([]) } });
      const loaded = loadKnowledge(dir);
      assert.equal(loaded.ok, false, JSON.stringify(note));
      assert.match(loaded.errors.join(" "), pattern, JSON.stringify(note));
    }
    // future schema_version is fail-closed
    writeCanon(dir, {
      manifest: BASE_MANIFEST,
      main: mainLedgerYaml([]).replace("schema_version: 1", "schema_version: 2"),
      leaves: { "proj.yaml": leafLedgerYaml([]) },
    });
    assert.match(loadKnowledge(dir).errors.join(" "), /schema_version 2 is not supported/);
  });
});

// TASK-Project001-20260821-019: --project scoping is fail-loud. Task ids carry the branch
// slug verbatim (TASK-Project001-…) while ledger `project:` values are the lowercase file
// slug (Project001), so an exact compare silently returned shared-only. These are POSITIVE
// tests (HH-028): each one FAILS against the pre-fix exact-compare implementation.
test("queryNotes: a case-mismatched --project resolves to the ledger slug (was: silent shared-only)", () => {
  withTempDir((dir) => {
    writeCanon(dir, {
      manifest: BASE_MANIFEST,
      main: mainLedgerYaml([{ id: "N-001", project: "shared", tags: ["x"] }]),
      leaves: { "proj.yaml": leafLedgerYaml([{ id: "N-002", project: "proj", tags: ["x"] }]) },
    });
    const q = queryNotes(dir, { tags: ["x"], project: "PROJ", topN: 10 });
    assert.equal(q.ok, true, (q.errors ?? []).join("; "));
    assert.equal(q.value.projectScope.match, "case-insensitive");
    assert.equal(q.value.projectScope.resolved, "proj");
    // the project-owned note must be in scope — the pre-fix code returned shared only
    assert.deepEqual(q.value.matched.map((n) => n.id).sort(), ["N-001", "N-002"]);
  });
});

test("queryNotes: an unknown --project is reported, not silently narrowed", () => {
  withTempDir((dir) => {
    writeCanon(dir, {
      manifest: BASE_MANIFEST,
      main: mainLedgerYaml([{ id: "N-001", project: "shared", tags: ["x"] }]),
      leaves: { "proj.yaml": leafLedgerYaml([{ id: "N-002", project: "proj", tags: ["x"] }]) },
    });
    const q = queryNotes(dir, { tags: ["x"], project: "nosuch", topN: 10 });
    assert.equal(q.ok, true, (q.errors ?? []).join("; "));
    assert.equal(q.value.projectScope.match, "none");
    assert.deepEqual(q.value.projectScope.known, ["proj"]);
    assert.deepEqual(q.value.matched.map((n) => n.id), ["N-001"]);
  });
});

test("queryNotes: an exact --project keeps its existing behaviour (no regression)", () => {
  withTempDir((dir) => {
    writeCanon(dir, {
      manifest: BASE_MANIFEST,
      main: mainLedgerYaml([{ id: "N-001", project: "shared", tags: ["x"] }]),
      leaves: { "proj.yaml": leafLedgerYaml([{ id: "N-002", project: "proj", tags: ["x"] }]) },
    });
    const q = queryNotes(dir, { tags: ["x"], project: "proj", topN: 10 });
    assert.equal(q.value.projectScope.match, "exact");
    assert.deepEqual(q.value.matched.map((n) => n.id).sort(), ["N-001", "N-002"]);
  });
});
