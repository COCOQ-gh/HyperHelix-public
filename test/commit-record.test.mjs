import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { extractCommitRecord, checkCommitRecord, distillRoutingErrors, openDistillDeferrals, DISTILL_ROUTING_CUTOVER, hasS2Evidence, s2EvidenceErrors, S2_EVIDENCE_CUTOVER } from "../tools/lib/commit-record.mjs";
import { copyFrameworkFixture, gitInRepo, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

// HH-081 stage 1: the task record carried in the commit body (```hh-record).
const FENCE = "```";
const block = (yaml) => `TASK-main-20261002-009: summary\n\n- change\n\n${FENCE}hh-record\n${yaml}\n${FENCE}\n\nCo-Authored-By: x <x@example.invalid>\n`;

const MINIMAL = `schema: 1
task_id: TASK-main-20261002-009
depth_mode: standard
distill_routing: [{finding: probe, route: not-reusable, target: fixture only}]
contract_impact: []
framework_check: []
evaluate:
  - criterion: tests pass
    result: Pass
notes:
  retrieved: []
  applied: []
phase_evidence: {search: ["S2 notes --tags probe → 0 件(該当なし)"]}`;

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
  assert.deepEqual(checkCommitRecord(record, { changedPaths: ["app.src"] }), []);
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

// HH-083: the D3/D4 routing table is a record field, fail-closed for standard/full.
test("standard/full records require distill_routing; rows are checked against the ledgers", () => {
  const record = (yaml) => extractCommitRecord(block(yaml)).value;
  const without = record(MINIMAL.replace(/distill_routing: .*\n/, ""));
  assert.match(checkCommitRecord(without).join("\n"), /requires distill_routing/);
  assert.deepEqual(checkCommitRecord({ ...without, depth_mode: "light" }), [], "light is not required");
  const before = new Date(Date.parse(DISTILL_ROUTING_CUTOVER) - 1000).toISOString();
  assert.deepEqual(distillRoutingErrors(without, { authorDate: before }), [], "commits before the cutover are exempt");

  const noteIds = new Set(["N-demo-20261026b"]);
  const rows = (items) => ({ ...without, distill_routing: items });
  assert.deepEqual(distillRoutingErrors(rows([
    { finding: "f", route: "note", target: "N-demo-20261026b" },
    { finding: "f", route: "anti-pattern", target: "AP-024" },
    { finding: "f", route: "amendment", target: "HH-083" },
    { finding: "f", route: "host-doc", target: "doc/principles.md", entry: "N-demo-20261026b" },
    { finding: "f", route: "not-reusable", target: "one-off" },
  ]), { noteIds }), []);
  const bad = distillRoutingErrors(rows([
    { finding: "f", route: "note", target: "N-demo-20261099z" },
    { finding: "f", route: "note", target: "a lesson" },
    { finding: "f", route: "anti-pattern", target: "anti-patterns.md" },
    { finding: "f", route: "host-doc", target: "doc/principles.md" },
    { finding: "f", route: "host-doc", target: "doc/x.md", entry: "N-demo-20261099z" },
  ]), { noteIds }).join("\n");
  assert.match(bad, /\[0\]\.target cites N-demo-20261099z but no ledger contains it/);
  assert.match(bad, /\[1\]\.target must cite a note id/);
  assert.match(bad, /\[2\]\.target must cite an AP-NNN id/);
  assert.match(bad, /\[3\] routes to a host document; entry must name the note/);
  assert.match(bad, /\[4\]\.entry cites N-demo-20261099z/);

  const unknownRoute = extractCommitRecord(block(MINIMAL.replace("route: not-reusable", "route: chat")));
  assert.equal(unknownRoute.ok, false, "route is a fixed vocabulary");
});

test("light deferrals stay open until a later record names them in distill_backfill", () => {
  const open = openDistillDeferrals([
    { task_id: "TASK-demo-20261025-019", depth_mode: "light", distill_deferred: ["D3", "D4"] },
    { task_id: "TASK-demo-20261026-002", depth_mode: "light", distill_deferred: ["D4"] },
    { task_id: "TASK-demo-20261026-008", depth_mode: "light", distill_deferred: [] },
    { task_id: "TASK-demo-20261026-009", depth_mode: "standard", distill_backfill: ["TASK-demo-20261025-019"] },
  ]);
  assert.deepEqual(open, [{ task_id: "TASK-demo-20261026-002", steps: ["D4"] }]);
  const badStep = extractCommitRecord(block(MINIMAL + "\ndistill_deferred: [D9]"));
  assert.equal(badStep.ok, false);
  assert.match(checkCommitRecord({ ...extractCommitRecord(block(MINIMAL)).value, distill_backfill: ["nope"] }).join("\n"),
    /distill_backfill nope is not a valid task id/);
});

// HH-084: S2 evidence — an empty notes.retrieved needs the tags queried in phase_evidence.search.
test("standard/full records with empty notes.retrieved need an S2 line in phase_evidence.search (HH-084)", () => {
  const record = (yaml) => extractCommitRecord(block(yaml)).value;
  const base = record(MINIMAL);
  assert.deepEqual(checkCommitRecord(base), [], "the fixture carries its S2 line");
  const noLine = record(MINIMAL.replace(/phase_evidence: .*\n?/, ""));
  assert.match(checkCommitRecord(noLine).join("\n"), /requires S2 evidence/);
  assert.deepEqual(checkCommitRecord({ ...noLine, depth_mode: "light" }), [], "light is display only");
  assert.deepEqual(checkCommitRecord({ ...noLine, depth_mode: "micro" }), [], "micro too");
  assert.deepEqual(checkCommitRecord({ ...noLine, notes: { retrieved: ["N-demo-20261026b"], applied: [] } }), [], "a retrieved id is S2 evidence");
  const before = new Date(Date.parse(S2_EVIDENCE_CUTOVER) - 1000).toISOString();
  assert.deepEqual(s2EvidenceErrors(noLine, { authorDate: before }), [], "commits before the cutover are exempt");
  assert.equal(hasS2Evidence({ ...noLine, phase_evidence: { search: ["looked at the ledger"] } }), false, "both tokens are required");
  assert.equal(hasS2Evidence({ ...noLine, phase_evidence: { search: ["S2 notes --tags alpha,beta → 2 件"] } }), true);
  assert.equal(hasS2Evidence({ ...noLine, phase_evidence: { plan: ["S2 notes --tags a"] } }), false, "the line lives in search");
});
