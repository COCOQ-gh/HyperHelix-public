import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { runCli, withTempDir } from "./helpers/repo-fixture.mjs";

function writeKnowledge(dir) {
  fs.mkdirSync(path.join(dir, "core", "knowledge"), { recursive: true });
  fs.writeFileSync(path.join(dir, "core", "knowledge.yaml"), `schema_version: 1
counters:
  task_index: 10
  last_framework_review: 5
notes: []
`, "utf8");
  // SC-05a/b: bump goes through the knowledge repository, which requires the manifest.
  fs.writeFileSync(path.join(dir, "core", "knowledge", "manifest.yaml"), `schema_version: 1
ledgers:
  - file: core/knowledge.yaml
    role: main
    projects: [hyperhelix, shared]
`, "utf8");
}

test("RT-17: review bumps the counter; provenance never lands in the ledger (SC-05b)", () => {
  withTempDir((dir) => {
    writeKnowledge(dir);
    const neutral = runCli(dir, ["bump", "--task", "TASK-20260717-001", "--review"]);
    assert.equal(neutral.status, 0, neutral.stderr);
    let knowledge = fs.readFileSync(path.join(dir, "core", "knowledge.yaml"), "utf8");
    assert.match(knowledge, /last_framework_review: 11\b/);
    assert.match(knowledge, /last_bump_task: TASK-20260717-001\b/);
    assert.doesNotMatch(knowledge, /\/cycle/);

    const cycle = runCli(dir, ["bump", "--task", "TASK-20260717-002", "--review", "--review-source", "/cycle"]);
    assert.equal(cycle.status, 0, cycle.stderr);
    assert.match(cycle.stdout, /last_framework_review -> 12 \(\/cycle\)/);
    knowledge = fs.readFileSync(path.join(dir, "core", "knowledge.yaml"), "utf8");
    assert.match(knowledge, /last_framework_review: 12\b/);
    // SC-05b boundary principle: machine/provenance values are structured fields or
    // the task record — never ledger prose. The review source must NOT be written.
    assert.doesNotMatch(knowledge, /\/cycle/);
    assert.doesNotMatch(knowledge, /# framework review/);
  });
});

test("RT-17: review-source without review is nonzero and side-effect free", () => {
  withTempDir((dir) => {
    writeKnowledge(dir);
    const file = path.join(dir, "core", "knowledge.yaml");
    const before = fs.readFileSync(file, "utf8");
    const result = runCli(dir, ["bump", "--task", "TASK-20260717-003", "--review-source", "/cycle"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--review と同時/);
    assert.equal(fs.readFileSync(file, "utf8"), before);
  });
});

test("RT-17: missing review-source value cannot consume the next flag", () => {
  withTempDir((dir) => {
    writeKnowledge(dir);
    const file = path.join(dir, "core", "knowledge.yaml");
    const before = fs.readFileSync(file, "utf8");
    const result = runCli(dir, ["bump", "--task", "TASK-20260717-004", "--review", "--review-source", "--dry-run"]);
    assert.notEqual(result.status, 0);
    assert.equal(fs.readFileSync(file, "utf8"), before);
  });
});

// AP-024 regression (TASK-main-20261002-003): Git Bash turns `/cycle` into
// `C:/Program Files/Git/cycle`; bump/finish must refuse it instead of storing it.
test("AP-024: an MSYS-mangled review-source is rejected before any write", () => {
  withTempDir((dir) => {
    writeKnowledge(dir);
    const file = path.join(dir, "core", "knowledge.yaml");
    const before = fs.readFileSync(file, "utf8");
    const result = runCli(dir, ["bump", "--task", "TASK-20260717-004", "--review", "--review-source", "C:/Program Files/Git/cycle"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /AP-024/);
    assert.equal(fs.readFileSync(file, "utf8"), before);

    const plain = runCli(dir, ["bump", "--task", "TASK-20260717-005", "--review", "--review-source", "cycle"]);
    assert.equal(plain.status, 0, plain.stderr);
    assert.match(plain.stdout, /\(cycle\)/);
  });
});
