import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { copyFrameworkFixture, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

// /cycle TASK-Project003z2dlabz2dh-20260831-001 (R4 usability finding, measured):
// `listArg` resolved a flag with `args.indexOf(flag)`, so a REPEATED flag
// (`--use A --use B`, `--tags a --tags b`) silently dropped everything after the
// first occurrence. The failure is quiet at the call site — for `bump --use` it
// only surfaces later, as a NOTE_ATTRIBUTION warning from `validate`.
// These are POSITIVE fixtures: each asserts the SECOND occurrence took effect.

const MAIN = `schema_version: 1
counters:
  task_index: 10
  last_framework_review: 5
  review_ordinal: 1
  last_bump_task: TASK-fixture-20260101-001
  last_always_read_lines: 100
  last_backlog_open_count: 1
notes:
  - id: N-fixture-20260101a
    text: "alpha only"
    tags: [alpha, project:fixture]
    project: fixture
    strength: 1
    last_used: 1
    state: active
  - id: N-fixture-20260101b
    text: "beta only"
    tags: [beta, project:fixture]
    project: fixture
    strength: 1
    last_used: 2
    state: active
`;

const MANIFEST = `schema_version: 1
ledgers:
  - file: core/knowledge.yaml
    role: main
    projects: [fixture, hyperhelix, shared]
`;

function fixtureLedger(dir) {
  fs.rmSync(path.join(dir, "core", "knowledge"), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "core", "knowledge"), { recursive: true });
  fs.writeFileSync(path.join(dir, "core", "knowledge.yaml"), MAIN, "utf8");
  fs.writeFileSync(path.join(dir, "core", "knowledge", "manifest.yaml"), MANIFEST, "utf8");
}

test("RT-21: `notes --tags a --tags b` unions both occurrences (repeated flag not dropped)", () => {
  withTempDir((dir) => {
    initGitRepo(dir, "project/fixture");
    copyFrameworkFixture(dir);
    fixtureLedger(dir);

    const both = runCli(dir, ["notes", "--tags", "alpha", "--tags", "beta", "--project", "fixture"]);
    assert.equal(both.status, 0, both.stderr);
    // The second occurrence must contribute: the beta-only note has to appear.
    assert.match(both.stdout, /N-fixture-20260101b/, "second --tags occurrence was dropped");
    assert.match(both.stdout, /N-fixture-20260101a/, "first --tags occurrence was dropped");

    // Control: a single flag still behaves as before (no union side effect).
    const alphaOnly = runCli(dir, ["notes", "--tags", "alpha", "--project", "fixture"]);
    assert.equal(alphaOnly.status, 0, alphaOnly.stderr);
    assert.doesNotMatch(alphaOnly.stdout, /N-fixture-20260101b/, "single --tags leaked an unmatched note");
  });
});

test("RT-22: `bump --use A --use B` attributes BOTH notes (repeated flag not dropped)", () => {
  withTempDir((dir) => {
    initGitRepo(dir, "project/fixture");
    copyFrameworkFixture(dir);
    fixtureLedger(dir);

    const result = runCli(dir, [
      "bump", "--task", "TASK-fixture-20260101-002",
      "--use", "N-fixture-20260101a",
      "--use", "N-fixture-20260101b",
    ]);
    assert.equal(result.status, 0, result.stderr);

    const ledger = fs.readFileSync(path.join(dir, "core", "knowledge.yaml"), "utf8");
    // Both notes must have been nudged to the new task_index.
    assert.match(ledger, /id: N-fixture-20260101a[\s\S]*?last_used: 11/, "first --use did not apply");
    assert.match(ledger, /id: N-fixture-20260101b[\s\S]*?last_used: 11/, "second --use was dropped");
  });
});
