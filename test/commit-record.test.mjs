import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { extractCommitRecord, checkCommitRecord } from "../tools/lib/commit-record.mjs";
import { copyFrameworkFixture, gitInRepo, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

// HH-081 stage 1: the task record carried in the commit body (```hh-record).
const FENCE = "```";
const block = (yaml) => `TASK-main-20261002-009: summary\n\n- change\n\n${FENCE}hh-record\n${yaml}\n${FENCE}\n\nCo-Authored-By: x <x@example.invalid>\n`;

const MINIMAL = `schema: 1
task_id: TASK-main-20261002-009
depth_mode: standard
contract_impact: []
framework_check: []
evaluate:
  - criterion: tests pass
    result: Pass
notes:
  retrieved: []
  applied: []`;

const WITH_EVIDENCE = `${MINIMAL.replace("contract_impact: []", `contract_impact:
  - contract: c
    change_kind: modify
    authority: a
    old_new: o
    producer: p
    consumer: c
    docs_templates: n/a
    legacy_allowlist: n/a
    forbidden_live_expressions: n/a
    tracked_tests: t`).replace("framework_check: []", `framework_check:
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
    r3_result: Pass`)}
note_adds:
  - N-main-20261002a`;

test("a message without an hh-record block is not a record (parallel run leaves it alone)", () => {
  assert.deepEqual(extractCommitRecord("TASK-x: plain message\n\nbody"), { present: false });
});

test("a well-formed block parses; malformed ones fail closed", () => {
  const ok = extractCommitRecord(block(MINIMAL));
  assert.equal(ok.present, true);
  assert.equal(ok.ok, true, (ok.errors || []).join("; "));
  assert.equal(ok.value.task_id, "TASK-main-20261002-009");

  const missing = extractCommitRecord(block(MINIMAL.replace("depth_mode: standard\n", "")));
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join("\n"), /depth_mode/);

  const badId = extractCommitRecord(block(MINIMAL.replace("TASK-main-20261002-009", "not-a-task")));
  assert.equal(badId.ok, false);
  assert.match(badId.errors.join("\n"), /not a valid task id/);

  const twice = extractCommitRecord(block(MINIMAL) + block(MINIMAL));
  assert.equal(twice.ok, false);
  assert.match(twice.errors.join("\n"), /at most 1/);
});

test("evidence rows are required only when the commit itself touches framework paths", () => {
  const record = extractCommitRecord(block(MINIMAL)).value;
  assert.deepEqual(checkCommitRecord(record, { changedPaths: ["GAME.ERB"] }), []);
  const errors = checkCommitRecord(record, { changedPaths: ["tools/hyperhelix.mjs"] });
  assert.match(errors.join("\n"), /CONTRACT_IMPACT: at least one row is required/);
  assert.match(errors.join("\n"), /FRAMEWORK_CHECK: at least one row is required/);

  const full = extractCommitRecord(block(WITH_EVIDENCE));
  assert.equal(full.ok, true, (full.errors || []).join("; "));
  const noteIds = new Set(["N-main-20261002a"]);
  assert.deepEqual(checkCommitRecord(full.value, { changedPaths: ["tools/hyperhelix.mjs"], noteIds }), []);
  assert.match(checkCommitRecord(full.value, { changedPaths: ["tools/hyperhelix.mjs"], noteIds: new Set() }).join("\n"),
    /note_adds declares N-main-20261002a but no ledger contains it/);
});

test("verify --base fails on a malformed commit-body record and passes on a valid one", () => {
  withTempDir((dir) => {
    initGitRepo(dir, "main");
    copyFrameworkFixture(dir);
    gitInRepo(dir, ["add", "."]);
    gitInRepo(dir, ["commit", "-m", "fixture base"], { stdio: "ignore" });

    fs.writeFileSync(path.join(dir, "notes.txt"), "one\n", "utf8");
    gitInRepo(dir, ["add", "notes.txt"]);
    gitInRepo(dir, ["commit", "-F", "-"], { input: block(MINIMAL.replace("schema: 1", "schema: 2")), stdio: ["pipe", "ignore", "ignore"] });
    const bad = runCli(dir, ["verify", "--base", "HEAD^"]);
    assert.notEqual(bad.status, 0, bad.stdout + bad.stderr);
    assert.match(bad.stdout, /\[L4 Evidence\] FAIL — .*commit [0-9a-f]{9}/);

    gitInRepo(dir, ["commit", "--amend", "-F", "-"], { input: block(MINIMAL), stdio: ["pipe", "ignore", "ignore"] });
    const good = runCli(dir, ["verify", "--base", "HEAD^"]);
    assert.equal(good.status, 0, good.stdout + good.stderr);
    assert.match(good.stdout, /\[L4 Evidence\] PASS/);
  });
});

test("finish rejects a malformed hh-record in --message before anything irreversible", () => {
  withTempDir((dir) => {
    initGitRepo(dir, "main");
    copyFrameworkFixture(dir);
    gitInRepo(dir, ["add", "."]);
    gitInRepo(dir, ["commit", "-m", "fixture base"], { stdio: "ignore" });
    const knowledge = path.join(dir, "core", "knowledge.yaml");
    const before = fs.readFileSync(knowledge, "utf8");
    const head = gitInRepo(dir, ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

    const result = runCli(dir, ["finish", "--task", "TASK-main-20261002-009", "--commit", "--message",
      block(MINIMAL.replace("depth_mode: standard", "depth_mode: huge"))]);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /hh-record/);
    assert.equal(fs.readFileSync(knowledge, "utf8"), before, "no bump happened");
    assert.equal(gitInRepo(dir, ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), head, "no commit happened");
  });
});
