import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { amendmentsViewDrift, loadGovernanceRegistry } from "../tools/lib/governance.mjs";
import {
  renderContractDoc,
  summarizeVerificationLayers,
} from "../tools/hyperhelix.mjs";
import {
  copyFrameworkFixture,
  gitInRepo,
  initGitRepo,
  runCli,
  withTempDir,
} from "./helpers/repo-fixture.mjs";

const root = path.dirname(fileURLToPath(new URL("../entrypoint.md", import.meta.url)));

test("RT-16: generated contract documentation detects drift", () => {
  const contracts = JSON.parse(fs.readFileSync(path.join(root, "core", "contracts.json"), "utf8"));
  const generated = fs.readFileSync(path.join(root, "docs", "generated", "contracts.md"), "utf8");
  assert.equal(generated, renderContractDoc(contracts));

  withTempDir((dir) => {
    copyFrameworkFixture(dir);
    const current = runCli(dir, ["contract-doc", "--check"]);
    assert.equal(current.status, 0, current.stdout + current.stderr);
    const file = path.join(dir, "core", "contracts.json");
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace('"ledger_dir": "core/knowledge"', '"ledger_dir": "core/knowledge-moved"'));
    const stale = runCli(dir, ["contract-doc", "--check"]);
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /stale or missing/);
  });
});

test("RT-18 (SC-04): governance registry is the lifecycle canon and the view has no drift", () => {
  const loaded = loadGovernanceRegistry(root);
  assert.equal(loaded.ok, true, (loaded.errors ?? []).join("; "));
  assert.deepEqual(loaded.warnings, []);
  assert.ok(loaded.value.entries.length >= 68);
  const drift = amendmentsViewDrift(root);
  assert.deepEqual(drift.errors, []);
  assert.equal(drift.drifted, false);
});

test("each L1-L4 failure independently makes the verification result nonzero", () => {
  const layerNames = ["L1 Structure", "L2 Contract", "L3 Behavior", "L4 Evidence"];
  assert.equal(summarizeVerificationLayers({}).ok, true);
  for (const failed of layerNames) {
    const result = summarizeVerificationLayers({ [failed]: ["fixture failure"] });
    assert.equal(result.ok, false, failed);
    assert.deepEqual(result.layers.filter((layer) => !layer.ok).map((layer) => layer.name), [failed]);
  }
  const reused = summarizeVerificationLayers({}, { reusedLayers: ["L3 Behavior"] });
  assert.equal(reused.ok, true);
  assert.equal(reused.layers.find((layer) => layer.name === "L3 Behavior").reused, true);
  assert.equal(reused.layers.filter((layer) => layer.reused).length, 1);
});

test("verify CLI accepts staged and base modes through the same four layers", () => {
  withTempDir((dir) => {
    initGitRepo(dir, "main");
    copyFrameworkFixture(dir);
    gitInRepo(dir, ["add", "."]);
    gitInRepo(dir, ["commit", "-m", "fixture base"], { stdio: "ignore" });

    // HH-081 stage 4: a non-framework staged change needs no record; a framework
    // change committed with its hh-record passes the base gate.
    fs.writeFileSync(path.join(dir, "notes.txt"), "project file\n");
    gitInRepo(dir, ["add", "notes.txt"]);
    const staged = runCli(dir, ["verify", "--staged"]);
    assert.equal(staged.status, 0, staged.stdout + staged.stderr);
    assert.match(staged.stdout, /\[L1 Structure\] PASS/);
    assert.match(staged.stdout, /\[L4 Evidence\] PASS/);

    fs.appendFileSync(path.join(dir, "README.md"), "\nverify fixture\n");
    gitInRepo(dir, ["add", "README.md"]);
    const fence = "```";
    const rows = "contract_impact:\n  - {contract: c, change_kind: modify, authority: a, old_new: o, producer: p, consumer: c, docs_templates: d, legacy_allowlist: l, forbidden_live_expressions: f, tracked_tests: t}\n"
      + "framework_check:\n  - {exact_command: rg x, scope_exclusion: s, expected: e, actual_hit_count: 1, classification: {update: 1, history_allow: 0, unrelated: 0}, exit_code: 0, r2_mapping: R2 x, r3_result: Pass}";
    const msg = `GH-2: fixture change\n\n${fence}hh-record\nschema: 1\ntask_id: GH-2\ndepth_mode: standard\n${rows}\nevaluate: []\nnotes: {retrieved: [], applied: []}\n${fence}\n`;
    gitInRepo(dir, ["commit", "-F", "-"], { input: msg, stdio: ["pipe", "ignore", "ignore"] });
    const base = runCli(dir, ["verify", "--base", "HEAD^"]);
    assert.equal(base.status, 0, base.stdout + base.stderr);
    assert.match(base.stdout, /verify \(base HEAD\^\): PASS/);
  });
});

test("CI matrix runs the shared base verifier on Windows and Ubuntu", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "validate.yml"), "utf8");
  assert.match(workflow, /ubuntu-latest/);
  assert.match(workflow, /windows-latest/);
  assert.match(workflow, /contract-doc --check/);
  assert.match(workflow, /verify --base/);
  assert.match(workflow, /bash -n \.claude\/commands\/hooks\/\*\.sh/);
});

// The e2e suite is outside L3 (`node --test` discovery does not reach test-e2e/), so CI
// is its only gate. Without these two checks the suite can rot unnoticed again: after
// HH-081 stage 4, 3 of 11 e2e tests were red on main and no gate reported it
// (TASK-main-20261002-022).
test("CI runs the e2e suite, and the e2e script lists every test-e2e file", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "validate.yml"), "utf8");
  assert.match(workflow, /^\s+run: npm run test:e2e$/m);

  const script = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts["test:e2e"];
  const listed = script.split(/\s+/).filter((word) => word.startsWith("test-e2e/")).sort();
  const present = fs.readdirSync(path.join(root, "test-e2e"))
    .filter((name) => name.endsWith(".e2e.mjs")).map((name) => `test-e2e/${name}`).sort();
  assert.ok(present.length > 0, "test-e2e/ must hold the e2e suite");
  // An unlisted file would never run; a listed-but-missing file fails the whole script.
  assert.deepEqual(listed, present);
});
