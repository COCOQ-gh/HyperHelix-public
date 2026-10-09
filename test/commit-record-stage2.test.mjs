import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { parseGithubTaskId, isValidTaskRef } from "../tools/lib/contracts.mjs";
import { copyFrameworkFixture, gitInRepo, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

// HH-081 stage 2: a task whose record lives only in its commit body.
const FENCE = "```";

function fixtureRepo(dir) {
  initGitRepo(dir, "main");
  copyFrameworkFixture(dir);
  gitInRepo(dir, ["add", "."]);
  gitInRepo(dir, ["commit", "-m", "fixture base"], { stdio: "ignore" });
}

function message(taskId, { evidence = true } = {}) {
  const rows = evidence ? `contract_impact:
  - contract: c
    change_kind: modify
    authority: a
    old_new: o
    producer: p
    consumer: c
    docs_templates: n/a
    legacy_allowlist: n/a
    forbidden_live_expressions: n/a
    tracked_tests: t
framework_check:
  - exact_command: rg x
    scope_exclusion: none
    expected: one
    actual_hit_count: 1
    classification:
      update: 1
      history_allow: 0
      unrelated: 0
    exit_code: 0
    r2_mapping: R2 wiring
    r3_result: Pass` : "contract_impact: []\nframework_check: []";
  return `${taskId}: fixture change\n\n${FENCE}hh-record\nschema: 1\ntask_id: ${taskId}\ndepth_mode: standard\n${rows}\nevaluate:\n  - criterion: ok\n    result: Pass\nnotes:\n  retrieved: []\n  applied: []\n${FENCE}\n`;
}

test("GH-<n> is a task ref for commit records but not a tasks/ file id", () => {
  assert.deepEqual(parseGithubTaskId("GH-42"), { id: "GH-42", kind: "github", issue: 42 });
  assert.equal(parseGithubTaskId("GH-0"), null);
  assert.equal(isValidTaskRef("GH-42"), true);
  assert.equal(isValidTaskRef("TASK-main-20261002-001"), true);
  assert.equal(isValidTaskRef("GH-x"), false);
});

test("brief --commit-record claims without a tasks/ file, and live claims burn serials", () => {
  withTempDir((dir) => {
    fixtureRepo(dir);
    const first = runCli(dir, ["brief", "--date", "20261002", "--commit-record"]);
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.match(first.stdout, /Claimed TASK-main-20261002-001/);
    assert.match(first.stdout, /```hh-record[\s\S]*task_id: TASK-main-20261002-001/);
    assert.match(first.stdout, /claim token: [0-9a-f]{16}/);
    assert.equal(fs.existsSync(path.join(dir, "tasks", "records", "TASK-main-20261002-001.yaml")), false);

    const second = runCli(dir, ["brief", "--date", "20261002", "--commit-record"]);
    assert.match(second.stdout, /Claimed TASK-main-20261002-002/, "the uncommitted claim must burn -001");

    const again = runCli(dir, ["brief", "--task", "TASK-main-20261002-001", "--commit-record"]);
    assert.notEqual(again.status, 0);
    assert.match(again.stderr, /既に claim/);
  });
});

test("finish commits a commit-record task: bump, no tasks/ file, and verify --base passes", () => {
  withTempDir((dir) => {
    fixtureRepo(dir);
    const claim = runCli(dir, ["brief", "--task", "GH-7", "--commit-record"]);
    assert.equal(claim.status, 0, claim.stdout + claim.stderr);
    const sid = claim.stdout.match(/claim token: ([0-9a-f]{16})/)[1];

    fs.appendFileSync(path.join(dir, "core", "gates.yaml"), "\n# fixture framework change\n", "utf8");
    gitInRepo(dir, ["add", "core/gates.yaml"]);
    const before = fs.readFileSync(path.join(dir, "core", "knowledge.yaml"), "utf8").match(/task_index: (\d+)/)[1];

    const done = runCli(dir, ["finish", "--task", "GH-7", "--sid", sid, "--commit", "--message", message("GH-7")]);
    assert.equal(done.status, 0, done.stdout + done.stderr);
    const body = gitInRepo(dir, ["log", "-1", "--format=%B"], { encoding: "utf8" });
    assert.match(body, /```hh-record[\s\S]*task_id: GH-7/);
    const files = gitInRepo(dir, ["show", "--name-only", "--format=", "HEAD"], { encoding: "utf8" });
    assert.match(files, /core\/gates\.yaml/);
    assert.doesNotMatch(files, /tasks\//);
    const after = fs.readFileSync(path.join(dir, "core", "knowledge.yaml"), "utf8").match(/task_index: (\d+)/)[1];
    assert.equal(Number(after), Number(before) + 1);
    assert.match(fs.readFileSync(path.join(dir, "core", "knowledge.yaml"), "utf8"), /last_bump_task: GH-7/);

    const verified = runCli(dir, ["verify", "--base", "HEAD^"]);
    assert.equal(verified.status, 0, verified.stdout + verified.stderr);
    assert.match(verified.stdout, /\[L4 Evidence\] PASS/);
  });
});

test("a framework commit with neither a tasks/ record nor an hh-record still fails verify --base", () => {
  withTempDir((dir) => {
    fixtureRepo(dir);
    fs.appendFileSync(path.join(dir, "core", "gates.yaml"), "\n# unrecorded change\n", "utf8");
    gitInRepo(dir, ["add", "core/gates.yaml"]);
    gitInRepo(dir, ["commit", "-m", "TASK-main-20261002-001: no record"], { stdio: "ignore" });
    const result = runCli(dir, ["verify", "--base", "HEAD^"]);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /\[L4 Evidence\] FAIL/);
  });
});

test("finish refuses a commit-record task whose message lacks the block or names another task", () => {
  withTempDir((dir) => {
    fixtureRepo(dir);
    const claim = runCli(dir, ["brief", "--task", "GH-8", "--commit-record"]);
    const sid = claim.stdout.match(/claim token: ([0-9a-f]{16})/)[1];
    const head = gitInRepo(dir, ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

    const bare = runCli(dir, ["finish", "--task", "GH-8", "--sid", sid, "--commit", "--message", "GH-8: no block"]);
    assert.notEqual(bare.status, 0);
    assert.match(bare.stderr, /hh-record ブロックがありません/);

    const other = runCli(dir, ["finish", "--task", "GH-8", "--sid", sid, "--commit", "--message", message("GH-9", { evidence: false })]);
    assert.notEqual(other.status, 0);
    assert.match(other.stderr, /一致しません/);
    assert.equal(gitInRepo(dir, ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), head);
  });
});
