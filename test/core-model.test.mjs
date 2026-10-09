// SC-02 acceptance: core/loop|routing|gates are read ONLY through the core-model
// repository (formal parser + strict schema). Fixtures cover presentation
// invariance, unknown fields, type violations, and the regex-free guarantee.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  loadLoop,
  loadRouting,
  loadGates,
  checkCoreDocument,
  gateParameterKeys,
  depthModeNames,
  CORE_GATES,
  CORE_LOOP,
} from "../tools/lib/core-model.mjs";
import { isFrameworkEvidencePath } from "../tools/lib/framework-evidence.mjs";

test("live core files load green through the core model", () => {
  for (const [name, load] of [["loop", loadLoop], ["routing", loadRouting], ["gates", loadGates]]) {
    const r = load();
    assert.equal(r.ok, true, `${name}: ${JSON.stringify(r.errors ?? [])}`);
  }
});

test("gate parameter keys match the known scalar leaves (dead-config guard input)", () => {
  const gates = loadGates();
  assert.deepEqual(
    gateParameterKeys(gates.value).sort(),
    ["always_read_streak_k", "backlog_burn_m", "backlog_streak_k", "cycle_interval_n", "project_scope", "top_n"],
  );
});

test("depth-mode vocabulary comes from loop.yaml (single authority for brief --mode)", () => {
  const loop = loadLoop();
  assert.deepEqual(depthModeNames(loop.value).sort(), ["full", "light", "micro", "spike", "standard"]);
});

test("SC-RT-01: gates key order / comments / spacing do not change the model", () => {
  const original = fs.readFileSync(CORE_GATES, "utf8");
  const a = checkCoreDocument(CORE_GATES, original);
  // rebuild with sections reordered and comments stripped
  const reordered = [
    "schema_version: 1",
    "human_actions: [lift_to_rule, prune]",
    "external_value_gate:",
    "  cycle_interval_n: 3",
    "convergence_ratchet:",
    "  backlog_streak_k: 3",
    "  backlog_burn_m: 2",
    "  always_read_streak_k: 3",
    "search:",
    "  top_n: 6",
    "  project_scope: current+shared",
    "",
  ].join("\n");
  const b = checkCoreDocument(CORE_GATES, reordered);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.deepEqual(a.value, b.value);
});

test("unknown fields and type violations fail closed with instance paths", () => {
  const gatesText = fs.readFileSync(CORE_GATES, "utf8");
  const unknown = checkCoreDocument(CORE_GATES, `${gatesText}\nmystery_section:\n  x: 1\n`);
  assert.equal(unknown.ok, false);
  assert.match(unknown.errors[0], /must NOT have additional properties \('mystery_section'\)/);

  const wrongType = checkCoreDocument(CORE_GATES, gatesText.replace(/top_n: 6/, "top_n: six"));
  assert.equal(wrongType.ok, false);
  assert.match(wrongType.errors[0], /\/search\/top_n: must be integer/);

  const badVersion = checkCoreDocument(CORE_GATES, gatesText.replace(/schema_version: 1/, "schema_version: 99"));
  assert.equal(badVersion.ok, false);
  assert.match(badVersion.errors[0], /schema_version 99 is not supported/);

  const dupKey = checkCoreDocument(CORE_GATES, `${gatesText}\nschema_version: 1\n`);
  assert.equal(dupKey.ok, false);
});

test("loop model rejects a dangling depth-mode step reference at the schema/consumer boundary", () => {
  // schema allows any step-id-shaped string; the STEP_CONSISTENCY validator
  // consumes the model — here we verify the model exposes what it needs.
  const loop = loadLoop().value;
  const defined = new Set(Object.values(loop.phases).flatMap((p) => Object.keys(p.steps)));
  for (const mode of Object.values(loop.depth_modes)) {
    for (const step of Array.isArray(mode.required_steps) ? mode.required_steps : []) {
      assert.equal(defined.has(step), true, `dangling step ${step}`);
    }
  }
});

test("SC-02: no line-regex extraction of loop/routing/gates remains in the CLI", () => {
  const source = fs.readFileSync("tools/hyperhelix.mjs", "utf8");
  for (const forbidden of [
    'readFile(GATES)',
    'readFile("core/loop.yaml")',
    'readFile("core/routing.yaml")',
    "top_n:\\s*",
    "artifacts:\\s*",
    "schemaVersion(gatesText)",
  ]) {
    assert.equal(source.includes(forbidden), false, `forbidden reader survives: ${forbidden}`);
  }
});

test("framework-evidence path classes come from the contract (leaf ledgers are bookkeeping)", () => {
  assert.equal(isFrameworkEvidencePath("core/knowledge.yaml"), false);
  assert.equal(isFrameworkEvidencePath("core/knowledge/Project007.yaml"), false);
  assert.equal(isFrameworkEvidencePath("core/loop.yaml"), true);
  assert.equal(isFrameworkEvidencePath("tools/lib/core-model.mjs"), true);
  assert.equal(isFrameworkEvidencePath("tasks/TASK-main-20260717-008.md"), false);
});
