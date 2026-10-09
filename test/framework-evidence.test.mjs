import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { AMENDMENTS_LIFECYCLE } from "../tools/lib/contracts.mjs";
import { isFrameworkEvidencePath } from "../tools/lib/framework-evidence.mjs";
import {
  copyFrameworkFixture,
  gitInRepo,
  initGitRepo,
  runCli,
  withTempDir,
} from "./helpers/repo-fixture.mjs";

// HH-081 stage 4: framework evidence lives in the commit-body hh-record that
// finish validates before anything irreversible.
const FENCE = "```";
const ROWS = `contract_impact:
  - contract: evidence gate
    change_kind: modify
    authority: core contracts
    old_new: optional to required
    producer: finish
    consumer: verify
    docs_templates: git-conventions
    legacy_allowlist: n/a
    forbidden_live_expressions: n/a
    tracked_tests: RT-14 and RT-15
framework_check:
  - exact_command: rg -n contract core
    scope_exclusion: core only
    expected: one tracked declaration
    actual_hit_count: 1
    classification:
      update: 1
      history_allow: 0
      unrelated: 0
    exit_code: 0
    r2_mapping: R2 schema mapped
    r3_result: Pass`;

function message(taskId, rows) {
  return `${taskId}: probe\n\n${FENCE}hh-record\nschema: 1\ntask_id: ${taskId}\ndepth_mode: standard\n${rows}\nevaluate: []\nnotes:\n  retrieved: []\n  applied: []\n${FENCE}\n`;
}

function prepareFinishFixture(dir) {
  initGitRepo(dir, "main");
  copyFrameworkFixture(dir);
  gitInRepo(dir, ["add", "."]);
  gitInRepo(dir, ["commit", "-m", "fixture base"], { stdio: "ignore" });
  fs.writeFileSync(path.join(dir, "tools", "probe.txt"), "framework change\n", "utf8");
}

test("framework evidence path classes", () => {
  assert.equal(isFrameworkEvidencePath("tools/probe.txt"), true);
  assert.equal(isFrameworkEvidencePath("tools\\probe.txt"), true);
  assert.equal(isFrameworkEvidencePath("test/probe.test.mjs"), true);
  assert.equal(isFrameworkEvidencePath(".claude/settings.json"), true);
  assert.equal(isFrameworkEvidencePath(".codex/hooks.json"), true);
  assert.equal(isFrameworkEvidencePath("tasks/TASK-x.md"), false);
  assert.equal(isFrameworkEvidencePath("src/project-code.js"), false);
});

test("RT-14: a framework change whose hh-record lacks evidence rows fails the finish gate", () => {
  withTempDir((dir) => {
    prepareFinishFixture(dir);
    const result = runCli(dir, ["finish", "--task", "GH-1", "--path", "tools/probe.txt",
      "--message", message("GH-1", "contract_impact: []\nframework_check: []")]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /CONTRACT_IMPACT: at least one row is required/);
    assert.doesNotMatch(result.stdout, /pre-flight 通過/);
  });
});

test("RT-15: complete classified evidence in the hh-record passes the finish preflight", () => {
  withTempDir((dir) => {
    prepareFinishFixture(dir);
    const result = runCli(dir, ["finish", "--task", "GH-1", "--path", "tools/probe.txt", "--message", message("GH-1", ROWS)]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /pre-flight 通過/);
  });
});

test("RT-15: the amendments lifecycle inventory is fail-closed", () => {
  const root = path.dirname(fileURLToPath(new URL("../entrypoint.md", import.meta.url)));
  const amendments = fs.readFileSync(path.join(root, "amendments.md"), "utf8");
  assert.ok(amendments.includes(AMENDMENTS_LIFECYCLE.pendingHeading));
  assert.ok(amendments.includes(AMENDMENTS_LIFECYCLE.approvedHeading));
  for (const consumer of AMENDMENTS_LIFECYCLE.requiredConsumers) {
    const text = fs.readFileSync(path.join(root, consumer.path), "utf8");
    assert.ok(text.split(consumer.needle).length - 1 >= consumer.min_hits, consumer.path);
  }
});
