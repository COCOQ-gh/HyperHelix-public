// SC-05b (HH-067): knowledge WRITE path tests — atomic commit (validate post-state,
// same-dir temp, fsync, fixed-order rename; SC-RT-10 no-partial-visible), the
// structured bump idempotency (counters.last_bump_task), comment/format
// preservation on Document writes, baseline counters, and the stage-based
// counter high-water merge for reflux.
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { KNOWLEDGE_CONTRACT } from "../tools/lib/contracts.mjs";
import {
  commitKnowledgeWrites,
  loadKnowledge,
  mergeCounterHighWater,
  planBump,
  setBaselineCounter,
} from "../tools/lib/knowledge.mjs";
import { withTempDir } from "./helpers/repo-fixture.mjs";

const MAIN = `# header comment — keep me
schema_version: 1
counters:
  # counters comment — keep me
  task_index: 10
  last_framework_review: 5
  last_bump_task: null
  last_always_read_lines: 100  # baseline comment — keep me
notes:
  - id: N-001
    text: "main note"
    tags: [alpha, beta]
    project: hyperhelix
    strength: 2
    last_used: 8
    state: active
`;

const LEAF = `schema_version: 1
notes:
  - id: N-002
    text: "leaf note"
    tags: [alpha]
    project: proj
    strength: 1
    last_used: 3
    state: active
`;

const MANIFEST = `schema_version: 1
ledgers:
  - file: core/knowledge.yaml
    role: main
    projects: [hyperhelix, shared]
  - file: core/knowledge/proj.yaml
    role: leaf
    projects: [proj]
`;

function writeCanon(dir) {
  fs.mkdirSync(path.join(dir, "core", "knowledge"), { recursive: true });
  fs.writeFileSync(path.join(dir, KNOWLEDGE_CONTRACT.mainLedger), MAIN, "utf8");
  fs.writeFileSync(path.join(dir, "core/knowledge/proj.yaml"), LEAF, "utf8");
  fs.writeFileSync(path.join(dir, KNOWLEDGE_CONTRACT.manifest), MANIFEST, "utf8");
}

function tempLeftovers(dir) {
  const out = [];
  for (const rel of ["core", "core/knowledge"]) {
    for (const name of fs.readdirSync(path.join(dir, rel))) {
      if (name.includes(".tmp-")) out.push(`${rel}/${name}`);
    }
  }
  return out;
}

test("SC-RT-10: an invalid candidate write leaves every ledger untouched and no temp files", () => {
  withTempDir((dir) => {
    writeCanon(dir);
    const before = fs.readFileSync(path.join(dir, KNOWLEDGE_CONTRACT.mainLedger), "utf8");
    const leafBefore = fs.readFileSync(path.join(dir, "core/knowledge/proj.yaml"), "utf8");
    // one valid + one schema-invalid write in the same commit -> nothing lands
    const result = commitKnowledgeWrites(dir, [
      { relative: "core/knowledge/proj.yaml", text: LEAF.replace("strength: 1", "strength: high") },
      { relative: KNOWLEDGE_CONTRACT.mainLedger, text: MAIN.replace("task_index: 10", "task_index: 11") },
    ]);
    assert.equal(result.ok, false);
    assert.match(result.errors.join(" "), /must be integer/);
    assert.equal(fs.readFileSync(path.join(dir, KNOWLEDGE_CONTRACT.mainLedger), "utf8"), before);
    assert.equal(fs.readFileSync(path.join(dir, "core/knowledge/proj.yaml"), "utf8"), leafBefore);
    assert.deepEqual(tempLeftovers(dir), []);

    // cross-ledger post-state violation (duplicate id) is also refused
    const dup = commitKnowledgeWrites(dir, [
      { relative: "core/knowledge/proj.yaml", text: LEAF.replace("N-002", "N-001").replace("project: proj", "project: proj") },
    ]);
    assert.equal(dup.ok, false);
    assert.equal(fs.readFileSync(path.join(dir, "core/knowledge/proj.yaml"), "utf8"), leafBefore);

    // an undeclared target is refused outright
    const undeclared = commitKnowledgeWrites(dir, [{ relative: "core/knowledge/other.yaml", text: LEAF }]);
    assert.equal(undeclared.ok, false);
    assert.match(undeclared.errors.join(" "), /not a declared ledger/);
  });
});

test("planBump: structured idempotency, late attribution, and per-note skip", () => {
  withTempDir((dir) => {
    writeCanon(dir);
    const first = planBump(dir, { taskId: "TASK-20260717-100", uses: ["N-001"], misses: [], review: true });
    assert.equal(first.ok, true, (first.errors ?? []).join("; "));
    assert.equal(first.value.from, 10);
    assert.equal(first.value.to, 11);
    assert.equal(first.value.alreadyBumped, false);
    assert.equal(commitKnowledgeWrites(dir, first.value.writes).ok, true);
    const state = loadKnowledge(dir);
    assert.equal(state.value.counters.task_index, 11);
    assert.equal(state.value.counters.last_framework_review, 11);
    assert.equal(state.value.counters.last_bump_task, "TASK-20260717-100");
    const note = state.value.notes.find((n) => n.id === "N-001");
    assert.equal(note.strength, 3);
    assert.equal(note.last_used, 11);

    // re-run for the SAME task: counter held, nudged note skipped, new note nudged (late attribution)
    const rerun = planBump(dir, { taskId: "TASK-20260717-100", uses: ["N-001", "N-002"], misses: [], review: false });
    assert.equal(rerun.ok, true);
    assert.equal(rerun.value.alreadyBumped, true);
    assert.equal(rerun.value.to, 11);
    assert.equal(rerun.value.counterChanged, false);
    assert.match(rerun.value.log.join(" "), /N-001: 既に last_used=11/);
    assert.deepEqual(rerun.value.changedNoteFiles, ["core/knowledge/proj.yaml"]);
    assert.equal(commitKnowledgeWrites(dir, rerun.value.writes).ok, true);
    const after = loadKnowledge(dir);
    assert.equal(after.value.counters.task_index, 11);
    assert.equal(after.value.notes.find((n) => n.id === "N-001").strength, 3, "no double nudge");
    assert.equal(after.value.notes.find((n) => n.id === "N-002").last_used, 11);

    // unknown note id fails closed
    const unknown = planBump(dir, { taskId: "TASK-20260717-101", uses: ["N-999"], misses: [] });
    assert.equal(unknown.ok, false);
    assert.match(unknown.errors.join(" "), /unknown note in --use: N-999/);
  });
});

test("Document writes preserve comments and legacy-readable formatting", () => {
  withTempDir((dir) => {
    writeCanon(dir);
    const plan = planBump(dir, { taskId: "TASK-20260717-100", uses: [], misses: [], review: false });
    assert.equal(commitKnowledgeWrites(dir, plan.value.writes).ok, true);
    const text = fs.readFileSync(path.join(dir, KNOWLEDGE_CONTRACT.mainLedger), "utf8");
    assert.match(text, /# header comment — keep me/);
    assert.match(text, /# counters comment — keep me/);
    assert.match(text, /# baseline comment — keep me/);
    assert.match(text, /^  task_index: 11$/m, "legacy `^  key: value` shape is preserved");
    assert.match(text, /^    tags: \[alpha, beta\]$/m, "single-line flow tags preserved");
  });
});

test("setBaselineCounter writes atomically through the repository", () => {
  withTempDir((dir) => {
    writeCanon(dir);
    assert.equal(setBaselineCounter(dir, "last_always_read_lines", 123).ok, true);
    const state = loadKnowledge(dir);
    assert.equal(state.value.counters.last_always_read_lines, 123);
    assert.match(fs.readFileSync(path.join(dir, KNOWLEDGE_CONTRACT.mainLedger), "utf8"), /# baseline comment — keep me/);
    // HH-073: the character gauge is a baseline counter too (absent in older ledgers).
    assert.equal(setBaselineCounter(dir, "last_always_read_chars", 4567).ok, true);
    assert.equal(loadKnowledge(dir).value.counters.last_always_read_chars, 4567);
    assert.equal(setBaselineCounter(dir, "last_index_read_chars", 2345).ok, true);
    assert.equal(loadKnowledge(dir).value.counters.last_index_read_chars, 2345);
    assert.equal(setBaselineCounter(dir, "task_index", 999).ok, false, "only baseline counters are writable here");
  });
});

test("HH-080: review_ordinal — produced by review bumps, idempotent, absent-field compat", () => {
  withTempDir((dir) => {
    writeCanon(dir);
    // The fixture canon predates HH-080 (no review_ordinal) — the first review bump
    // must treat the absent field as 0 and land 1 (backward compat with pre-HH-080
    // ledgers on other branches).
    const first = planBump(dir, { taskId: "TASK-20260823-200", uses: [], misses: [], review: true });
    assert.equal(first.ok, true, (first.errors ?? []).join("; "));
    assert.match(first.value.log.join(" "), /review_ordinal -> 1/);
    assert.equal(commitKnowledgeWrites(dir, first.value.writes).ok, true);
    assert.equal(loadKnowledge(dir).value.counters.review_ordinal, 1);

    // Re-running the SAME review task must not double-count the review.
    const rerun = planBump(dir, { taskId: "TASK-20260823-200", uses: [], misses: [], review: true });
    assert.equal(rerun.ok, true);
    if (rerun.value.writes.length) assert.equal(commitKnowledgeWrites(dir, rerun.value.writes).ok, true);
    assert.equal(loadKnowledge(dir).value.counters.review_ordinal, 1, "re-run must not increment the ordinal");

    // A non-review bump leaves the ordinal untouched.
    const plain = planBump(dir, { taskId: "TASK-20260823-201", uses: [], misses: [], review: false });
    assert.equal(plain.ok, true);
    assert.equal(commitKnowledgeWrites(dir, plain.value.writes).ok, true);
    assert.equal(loadKnowledge(dir).value.counters.review_ordinal, 1);

    // The NEXT review task increments to 2.
    const second = planBump(dir, { taskId: "TASK-20260823-202", uses: [], misses: [], review: true });
    assert.equal(second.ok, true);
    assert.equal(commitKnowledgeWrites(dir, second.value.writes).ok, true);
    assert.equal(loadKnowledge(dir).value.counters.review_ordinal, 2);
  });
});

test("HH-080: mergeCounterHighWater takes max of review_ordinal and tolerates one-sided absence", () => {
  const base = (ordinalLine) => [
    "schema_version: 1",
    "counters:",
    "  task_index: 20",
    "  last_framework_review: 18",
    ...(ordinalLine ? [ordinalLine] : []),
    "notes: []",
    "",
  ].join(String.fromCharCode(10));
  const merged = mergeCounterHighWater(base("  review_ordinal: 3"), base("  review_ordinal: 5"));
  assert.equal(merged.ok, true, (merged.errors ?? []).join("; "));
  assert.match(merged.text, /review_ordinal: 5/);
  // One side lacking the field (pre-HH-080 branch) still merges — the present value wins.
  const oneSided = mergeCounterHighWater(base("  review_ordinal: 4"), base(null));
  assert.equal(oneSided.ok, true, (oneSided.errors ?? []).join("; "));
  assert.match(oneSided.text, /review_ordinal: 4/);
});

test("HH-073: mergeCounterHighWater takes max of last_always_read_chars and tolerates one-sided absence", () => {
  const base = (charsLine) => [
    "schema_version: 1",
    "counters:",
    "  task_index: 20",
    "  last_framework_review: 18",
    ...(charsLine ? [charsLine] : []),
    "notes: []",
    "",
  ].join(String.fromCharCode(10));
  const merged = mergeCounterHighWater(base("  last_always_read_chars: 33000"), base("  last_always_read_chars: 34000"));
  assert.equal(merged.ok, true, (merged.errors ?? []).join("; "));
  assert.match(merged.text, /last_always_read_chars: 34000/);
  const oneSided = mergeCounterHighWater(base("  last_always_read_chars: 33000"), base(null));
  assert.equal(oneSided.ok, true, (oneSided.errors ?? []).join("; "));
  assert.match(oneSided.text, /last_always_read_chars: 33000/);
  const index = mergeCounterHighWater(base("  last_index_read_chars: 25000"), base("  last_index_read_chars: 25400"));
  assert.equal(index.ok, true, (index.errors ?? []).join("; "));
  assert.match(index.text, /last_index_read_chars: 25400/);
});

test("mergeCounterHighWater: counter-only conflicts merge by max; note drift refuses", () => {
  const ours = MAIN.replace("task_index: 10", "task_index: 14").replace("last_bump_task: null", "last_bump_task: TASK-20260717-201");
  const theirs = MAIN.replace("task_index: 10", "task_index: 12")
    .replace("last_framework_review: 5", "last_framework_review: 9")
    .replace("last_bump_task: null", "last_bump_task: TASK-20260717-202");
  const merged = mergeCounterHighWater(ours, theirs);
  assert.equal(merged.ok, true, (merged.errors ?? []).join("; "));
  assert.match(merged.text, /task_index: 14\b/);
  assert.match(merged.text, /last_framework_review: 9\b/);
  assert.match(merged.text, /last_bump_task: TASK-20260717-201\b/, "last_bump_task follows the task_index winner");
  assert.match(merged.text, /# counters comment — keep me/);

  const noteDrift = mergeCounterHighWater(ours, theirs.replace("main note", "edited note"));
  assert.equal(noteDrift.ok, false);
  assert.match(noteDrift.errors.join(" "), /not counter-only/);
});
