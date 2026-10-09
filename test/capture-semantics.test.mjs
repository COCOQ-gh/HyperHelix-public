import assert from "node:assert/strict";
import test from "node:test";

import { planCaptureTransaction } from "../tools/lib/capture-transaction.mjs";
import { loadLoop, loadRouting } from "../tools/lib/core-model.mjs";

function models() {
  const routing = loadRouting();
  const loop = loadLoop();
  assert.equal(routing.ok, true, routing.errors?.join("; "));
  assert.equal(loop.ok, true, loop.errors?.join("; "));
  return { parking: routing.value.significant_discovery_parking, loop: loop.value };
}

test("HH-068 capture fixtures select standard without weakening micro", () => {
  const { parking, loop } = models();
  const fixtures = [
    ["rule", "rule-axiom-theta-touch"],
    ["axiom", "rule-axiom-theta-touch"],
    ["theta", "rule-axiom-theta-touch"],
    ["gate touch", "rule-axiom-theta-touch"],
    ["material contradiction", "material-contradiction-or-blindspot"],
  ];
  for (const [name, trigger] of fixtures) {
    const plan = planCaptureTransaction(parking, {
      trigger,
      artifactType: "non-governance",
      capturedArtifact: `fixtures/${name.replaceAll(" ", "-")}.md`,
    });
    assert.equal(plan.capture_depth, "standard", name);
    assert.equal(plan.disposition, "separate-task", name);
    assert.equal(plan.remediation_task_id, "pending", name);
    assert.equal(plan.remediation_in_capture, false, name);
  }

  assert.deepEqual(loop.depth_modes.micro.use_when, [
    "typo-fix",
    "link-fix",
    "heading-number-fix",
    "obvious-removed-term-replacement",
    "readme-1-2-line",
  ]);
  for (const forbidden of ["durable-rule-likely", "any-logic-change", "any-gate-or-axiom-touch"]) {
    assert.ok(loop.depth_modes.micro.forbidden_when.includes(forbidden));
  }
});

test("HH-068 Pending HH capture is full and cannot activate consumers", () => {
  const { parking } = models();
  const plan = planCaptureTransaction(parking, {
    trigger: "rule-axiom-theta-touch",
    artifactType: "pending-hh",
    capturedArtifact: "governance/amendments/bodies/HH-999.md",
  });
  assert.equal(plan.capture_depth, "full");
  assert.equal(plan.consumer_activation, "inactive-until-approved-and-separate-implementation-task");
  assert.equal(plan.remediation_in_capture, false);
  assert.match(parking.transaction.pending_hh_consumer, /MUST NOT activate/);
  assert.deepEqual(parking.transaction.capture_record, [
    "capture_task_id",
    "capture_depth",
    "captured_artifact",
    "remediation_task_id_or_pending",
  ]);
});

test("HH-068 folding requires sufficient depth, scope, and no overlap", () => {
  const { parking } = models();
  const base = {
    trigger: "material-contradiction-or-blindspot",
    artifactType: "non-governance",
    capturedArtifact: "docs/process-backlog.md",
  };
  const folded = planCaptureTransaction(parking, {
    ...base,
    currentTask: { id: "TASK-main-20260718-999", depth: "standard", scopeIncluded: true, writeOverlap: false },
  });
  assert.equal(folded.disposition, "fold-current-task");
  assert.equal(folded.capture_task_id, "TASK-main-20260718-999");

  for (const currentTask of [
    { id: "TASK-main-20260718-999", depth: "micro", scopeIncluded: true, writeOverlap: false },
    { id: "TASK-main-20260718-999", depth: "light", scopeIncluded: true, writeOverlap: false },
    { id: "TASK-main-20260718-999", depth: "full", scopeIncluded: false, writeOverlap: false },
    { id: "TASK-main-20260718-999", depth: "full", scopeIncluded: true, writeOverlap: true },
  ]) {
    assert.equal(planCaptureTransaction(parking, { ...base, currentTask }).disposition, "separate-task");
  }

  const fullCaptureInStandard = planCaptureTransaction(parking, {
    ...base,
    artifactType: "pending-hh",
    capturedArtifact: "governance/amendments/bodies/HH-999.md",
    currentTask: { id: "TASK-main-20260718-999", depth: "standard", scopeIncluded: true, writeOverlap: false },
  });
  assert.equal(fullCaptureInStandard.disposition, "separate-task");
});
