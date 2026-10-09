import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { distillCaptureGap, isLegacyRecordedCommit, unattributedAppliedNotes, LEGACY_RECORD_CUTOVER } from "../tools/lib/commit-record.mjs";
import { copyFrameworkFixture, gitInRepo, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

// HH-081 stage 4: the hh-record is the only task record.
const FENCE = "```";
const ROWS = "contract_impact:\n  - {contract: c, change_kind: modify, authority: a, old_new: o, producer: p, consumer: c, docs_templates: d, legacy_allowlist: l, forbidden_live_expressions: f, tracked_tests: t}\n"
  + "framework_check:\n  - {exact_command: rg x, scope_exclusion: s, expected: e, actual_hit_count: 1, classification: {update: 1, history_allow: 0, unrelated: 0}, exit_code: 0, r2_mapping: R2 x, r3_result: Pass}";
const msg = (id, extra = "") => `${id}: probe\n\n${FENCE}hh-record\nschema: 1\ntask_id: ${id}\ndepth_mode: standard\n${ROWS}\nevaluate: []\nnotes: {retrieved: [], applied: []}\n${extra}${FENCE}\n`;

function fixture(dir) {
  initGitRepo(dir, "main");
  copyFrameworkFixture(dir);
  gitInRepo(dir, ["add", "."]);
  gitInRepo(dir, ["commit", "-m", "fixture base"], { stdio: "ignore" });
}

test("unattributedAppliedNotes / distillCaptureGap / isLegacyRecordedCommit", () => {
  const record = { notes: { applied: ["N-011", "N-038 (partial)"] }, phase_evidence: {} };
  assert.deepEqual(unattributedAppliedNotes(record, new Set(["N-011"])), ["N-038"]);
  assert.deepEqual(unattributedAppliedNotes(record, new Set(["N-011", "N-038"])), []);

  assert.equal(distillCaptureGap({ phase_evidence: { execute: ["E4 手戻りなし"] } }), null, "negation is not rework");
  assert.match(distillCaptureGap({ phase_evidence: { execute: ["E4 手戻り 1 件"] } }, ["tools/x.mjs"]), /durable material/);
  assert.equal(distillCaptureGap({ phase_evidence: { execute: ["手戻り 1 件"] } }, ["assets/ai/anti-patterns.md"]), null);
  assert.equal(distillCaptureGap({ phase_evidence: { execute: ["手戻り 1 件"] }, note_adds: ["N-x"] }, []), null);

  const before = new Date(Date.parse(LEGACY_RECORD_CUTOVER) - 1000).toISOString();
  const after = new Date(Date.parse(LEGACY_RECORD_CUTOVER) + 1000).toISOString();
  assert.equal(isLegacyRecordedCommit(before, ["core/loop.yaml", "tasks/records/TASK-main-20261001-001.yaml"]), true);
  assert.equal(isLegacyRecordedCommit(after, ["core/loop.yaml", "tasks/records/TASK-main-20261001-001.yaml"]), false);
  assert.equal(isLegacyRecordedCommit(before, ["core/loop.yaml"]), false, "no legacy record, no cover");
});

test("finish rejects an applied note that was not attributed, and accepts it with --use", () => {
  withTempDir((dir) => {
    fixture(dir);
    fs.writeFileSync(path.join(dir, "tools", "probe.txt"), "x\n", "utf8");
    const applied = msg("GH-3").replace("applied: []", "applied: [N-011]");
    const missing = runCli(dir, ["finish", "--task", "GH-3", "--path", "tools/probe.txt", "--message", applied]);
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /N-011 が --use\/--miss で帰属されていません/);
    const ok = runCli(dir, ["finish", "--task", "GH-3", "--use", "N-011", "--path", "tools/probe.txt", "--message", applied]);
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /pre-flight 通過/);
  });
});

test("verify --base warns DISTILL_CAPTURE without failing, and honours the legacy cutover", () => {
  withTempDir((dir) => {
    fixture(dir);
    fs.appendFileSync(path.join(dir, "README.md"), "\nrework\n", "utf8");
    gitInRepo(dir, ["add", "README.md"]);
    gitInRepo(dir, ["commit", "-F", "-"], { input: msg("GH-4", "phase_evidence: {execute: [E4 手戻り 1 件]}\n"), stdio: ["pipe", "ignore", "ignore"] });
    const warned = runCli(dir, ["verify", "--base", "HEAD^"]);
    assert.equal(warned.status, 0, warned.stdout + warned.stderr);
    assert.match(warned.stdout + warned.stderr, /DISTILL_CAPTURE/);

    // A block-less framework commit carrying a retired tasks/ record is covered only before the cutover.
    fs.mkdirSync(path.join(dir, "tasks", "records"), { recursive: true });
    fs.appendFileSync(path.join(dir, "README.md"), "\nlegacy\n", "utf8");
    fs.writeFileSync(path.join(dir, "tasks", "records", "TASK-main-20261001-001.yaml"), "x: 1\n", "utf8");
    gitInRepo(dir, ["add", "README.md", "tasks"]);
    const early = new Date(Date.parse(LEGACY_RECORD_CUTOVER) - 86400000).toISOString();
    gitInRepo(dir, ["commit", "-m", "TASK-main-20261001-001: legacy"], { stdio: "ignore", env: { ...process.env, GIT_AUTHOR_DATE: early } });
    const legacy = runCli(dir, ["verify", "--base", "HEAD^"]);
    assert.equal(legacy.status, 0, legacy.stdout + legacy.stderr);

    fs.appendFileSync(path.join(dir, "README.md"), "\nlate\n", "utf8");
    fs.writeFileSync(path.join(dir, "tasks", "records", "TASK-main-20261101-001.yaml"), "x: 2\n", "utf8");
    gitInRepo(dir, ["add", "README.md", "tasks"]);
    const late = new Date(Date.parse(LEGACY_RECORD_CUTOVER) + 86400000).toISOString();
    gitInRepo(dir, ["commit", "-m", "TASK-main-20261101-001: too late"], { stdio: "ignore", env: { ...process.env, GIT_AUTHOR_DATE: late } });
    const rejected = runCli(dir, ["verify", "--base", "HEAD^"]);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stdout, /without an hh-record/);
  });
});

test("verify --staged without a record fails on framework paths; bump --update-brief is retired", () => {
  withTempDir((dir) => {
    fixture(dir);
    fs.appendFileSync(path.join(dir, "README.md"), "\nx\n", "utf8");
    gitInRepo(dir, ["add", "README.md"]);
    const staged = runCli(dir, ["verify", "--staged"]);
    assert.notEqual(staged.status, 0);
    assert.match(staged.stdout, /no hh-record/);

    const bump = runCli(dir, ["bump", "--task", "GH-5", "--update-brief"]);
    assert.equal(bump.status, 0, bump.stdout + bump.stderr);
    assert.match(bump.stderr, /--update-brief は廃止/);
  });
});
