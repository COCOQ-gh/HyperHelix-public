import test from "node:test";
import assert from "node:assert/strict";
import {
  governancePaths,
  prSafeSegment,
  publisherReady,
  pullRequestDisposition,
} from "../tools/lib/pr-policy.mjs";

test("governancePaths classifies every governed rule and excludes normal paths", () => {
  const cases = [
    [".github/workflows/validate.yml", true],
    ["constitution.md", true],
    ["amendments.md", true],
    ["core/gates.yaml", true],
    ["governance/amendments/registry.yaml", true],
    ["README.md", false],
  ];

  for (const [file, governed] of cases) {
    assert.deepEqual(governancePaths([file]), governed ? [file] : [], file);
  }
});

test("prSafeSegment normalizes unsafe branch text and applies the fallback", () => {
  assert.equal(prSafeSegment("Project/Feature Name"), "project-feature-name");
  assert.equal(prSafeSegment("---"), "branch");
  assert.equal(prSafeSegment("A".repeat(50)).length, 40);
});

test("pullRequestDisposition is fail-closed and separates manual from automatic completion", () => {
  const cases = [
    [{ checksPassed: false, governedPaths: [] }, "failed"],
    [{ checksPassed: false, governedPaths: ["constitution.md"] }, "failed"],
    [{ checksPassed: true, governedPaths: ["constitution.md"] }, "awaiting-human"],
    [{ checksPassed: true, governedPaths: [] }, "merge"],
  ];

  for (const [input, expected] of cases) {
    assert.equal(pullRequestDisposition(input), expected);
  }
});

test("publisherReady blocks missing GitHub identity before publication", () => {
  assert.equal(publisherReady(null), false);
  assert.equal(publisherReady(""), false);
  assert.equal(publisherReady("  "), false);
  assert.equal(publisherReady("hyperhelix-bot"), true);
});

test("publisher identity cannot bypass governed human handoff", () => {
  assert.equal(pullRequestDisposition({
    checksPassed: true,
    governedPaths: ["constitution.md"],
    publisher: "COCOQ-gh",
  }), "awaiting-human");
});
