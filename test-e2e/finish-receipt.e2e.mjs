import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  copyFrameworkFixture,
  gitInRepo,
  initGitRepo,
  runCli,
  withTempDir,
} from "../test/helpers/repo-fixture.mjs";

const taskId = "TASK-main-20260719-900";
const FENCE = "```";

// HH-081: the task record is the hh-record block of the commit message. The probe lives
// under tools/ (a framework evidence path), so the block must carry complete rows.
const message = [
  `${taskId}: receipt fixture`,
  "",
  `${FENCE}hh-record`,
  "schema: 1",
  `task_id: ${taskId}`,
  "depth_mode: full",
  "contract_impact:",
  "  - contract: finish receipt fixture",
  "    change_kind: modify",
  "    authority: HH-071",
  "    old_new: double behavior to receipt reuse",
  "    producer: finish",
  "    consumer: post-bump verify",
  "    docs_templates: fixture record",
  "    legacy_allowlist: none",
  "    forbidden_live_expressions: unattested skip",
  "    tracked_tests: finish-receipt.e2e.mjs",
  "framework_check:",
  "  - exact_command: node --test test-e2e/finish-receipt.e2e.mjs",
  "    scope_exclusion: fixture",
  "    expected: pass",
  "    actual_hit_count: 0",
  "    classification: {update: 0, history_allow: 0, unrelated: 0}",
  "    exit_code: 0",
  "    r2_mapping: R2 receipt integration",
  "    r3_result: Pass",
  "evaluate:",
  "  - {criterion: single behavior execution, result: Pass}",
  "notes: {retrieved: [], applied: []}",
  FENCE,
  "",
].join("\n");

function prepareFixture(dir) {
  initGitRepo(dir, "main");
  copyFrameworkFixture(dir);
  gitInRepo(dir, ["add", "."]);
  gitInRepo(dir, ["commit", "-m", "fixture base"], { stdio: "ignore" });
  fs.writeFileSync(path.join(dir, "tools", "probe.txt"), "receipt integration\n", "utf8");
}

test("finish executes behavior once and reports post-bump L3 as receipt REUSED", () => {
  withTempDir((dir) => {
    prepareFixture(dir);
    const runtimeDir = path.join(dir, ".claude", "tmp");
    fs.mkdirSync(runtimeDir, { recursive: true });
    const behaviorLog = path.join(runtimeDir, "behavior-runs.log");
    const result = runCli(dir, [
      "finish", "--task", taskId, "--path", "tools/probe.txt",
      "--commit", "--message", message,
    ], { env: { HH_TEST_BEHAVIOR_LOG: behaviorLog } });

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /post-bump behavior input unchanged/);
    assert.match(result.stdout, /\[L3 Behavior\] REUSED — receipt [0-9a-f]{12}/);
    assert.equal(fs.readFileSync(behaviorLog, "utf8").trim().split(/\r?\n/).length, 1);
    assert.equal(gitInRepo(dir, ["rev-list", "--count", "HEAD"], { encoding: "utf8" }).trim(), "2");
    assert.equal(gitInRepo(dir, ["status", "--porcelain"], { encoding: "utf8" }).trim(), "");
    // The record travels in the commit body, and that commit satisfies the CI-side gate.
    const body = gitInRepo(dir, ["log", "-1", "--format=%B"], { encoding: "utf8" });
    assert.match(body, new RegExp(`${FENCE}hh-record\\r?\\nschema: 1\\r?\\ntask_id: ${taskId}`));
    assert.deepEqual(
      gitInRepo(dir, ["show", "--name-only", "--format=", "HEAD"], { encoding: "utf8" }).trim().split(/\r?\n/).sort(),
      ["core/knowledge.yaml", "tools/probe.txt"],
    );
  });
});
