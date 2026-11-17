import test from "node:test";
import assert from "node:assert/strict";
import {
  assessVerificationReuse,
  attestVerificationReceipt,
  changedFilePaths,
  createVerificationSnapshot,
  sha256,
} from "../tools/lib/verification-receipt.mjs";

function snapshot(overrides = {}) {
  return createVerificationSnapshot({
    taskId: "TASK-main-20260719-900",
    head: "a".repeat(40),
    indexFingerprint: sha256("index"),
    platform: "win32",
    architecture: "x64",
    nodeVersion: "v24.0.0",
    lockfileHash: sha256("lock"),
    fileHashes: {
      "package.json": sha256("package"),
      "package-lock.json": sha256("lock"),
      "tools/hyperhelix.mjs": sha256("tool"),
      "test/verify.test.mjs": sha256("test"),
      "core/knowledge.yaml": sha256("counter=1"),
      "tasks/records/TASK-main-20260719-900.yaml": sha256("task_index=null"),
      "README.md": sha256("readme"),
    },
    ...overrides,
  });
}

function verifiedReceipt() {
  const before = snapshot();
  const attested = attestVerificationReceipt(before, snapshot());
  assert.equal(attested.ok, true);
  return attested.receipt;
}

test("verification receipt reuses only exact provenance plus explicit bookkeeping changes", () => {
  const receipt = verifiedReceipt();
  const current = snapshot({
    fileHashes: {
      ...receipt.fileHashes,
      "core/knowledge.yaml": sha256("counter=2"),
      "tasks/records/TASK-main-20260719-900.yaml": sha256("task_index=584"),
    },
  });
  const result = assessVerificationReuse({
    receipt,
    current,
    allowedChangedPaths: [
      "core/knowledge.yaml",
      "tasks/records/TASK-main-20260719-900.yaml",
    ],
  });
  assert.equal(result.ok, true, result.reasons.join("; "));
  assert.deepEqual(result.changedPaths, [
    "core/knowledge.yaml",
    "tasks/records/TASK-main-20260719-900.yaml",
  ]);
});

test("receipt binding fails closed for task, HEAD, index, environment, lock, and tool/test inputs", () => {
  const receipt = verifiedReceipt();
  const cases = [
    ["task", snapshot({ taskId: "TASK-main-20260719-901" })],
    ["HEAD", snapshot({ head: "b".repeat(40) })],
    ["index", snapshot({ indexFingerprint: sha256("other index") })],
    ["platform", snapshot({ platform: "linux" })],
    ["architecture", snapshot({ architecture: "arm64" })],
    ["Node", snapshot({ nodeVersion: "v20.0.0" })],
    ["lock", snapshot({ lockfileHash: sha256("other lock") })],
    ["tool", snapshot({
      fileHashes: { ...receipt.fileHashes, "tools/hyperhelix.mjs": sha256("changed tool") },
    })],
    ["test", snapshot({
      fileHashes: { ...receipt.fileHashes, "test/verify.test.mjs": sha256("changed test") },
    })],
  ];
  for (const [name, current] of cases) {
    const result = assessVerificationReuse({ receipt, current, allowedChangedPaths: [] });
    assert.equal(result.ok, false, name);
    assert.ok(result.reasons.length > 0, name);
  }
});

test("unknown changed, added, or removed paths are rejected even when core bookkeeping is allowed", () => {
  const receipt = verifiedReceipt();
  const changed = snapshot({
    fileHashes: {
      ...receipt.fileHashes,
      "README.md": sha256("changed"),
      "docs/unknown.md": sha256("added"),
    },
  });
  const result = assessVerificationReuse({
    receipt,
    current: changed,
    allowedChangedPaths: ["core/knowledge.yaml"],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.unauthorizedPaths, ["README.md", "docs/unknown.md"]);
  assert.deepEqual(changedFilePaths({ a: "1", b: "2" }, { b: "2", c: "3" }), ["a", "c"]);
});

test("missing or unattested receipt and mutation during full verification never reuse", () => {
  assert.equal(assessVerificationReuse({ receipt: null, current: snapshot() }).ok, false);
  assert.equal(assessVerificationReuse({ receipt: snapshot(), current: snapshot() }).ok, false);
  const changedAfterTest = snapshot({
    fileHashes: { ...snapshot().fileHashes, "README.md": sha256("mutated by test") },
  });
  const attestation = attestVerificationReceipt(snapshot(), changedAfterTest);
  assert.equal(attestation.ok, false);
  assert.match(attestation.reasons.join("; "), /workspace changed/);
});
