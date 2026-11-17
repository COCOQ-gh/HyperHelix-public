import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  contractCoverage,
  decodeBranchSlug,
  encodeBranchSlug,
  extractNoteIds,
  findUnconsumedContractFields,
  formatPermanentNoteId,
  numberToSuffix,
  parseNoteId,
} from "../tools/lib/contracts.mjs";
import { gitInRepo, initGitRepo, withTempDir } from "./helpers/repo-fixture.mjs";

test("RT-01: legacy and permanent note ids share one parser", () => {
  assert.deepEqual(parseNoteId("N-001"), { id: "N-001", kind: "legacy", serial: 1 });
  const id = formatPermanentNoteId({ slug: "project/foo-bar", date: "20260717", suffix: "aa" });
  const parsed = parseNoteId(id);
  assert.equal(parsed?.kind, "permanent");
  assert.equal(parsed?.slug, "project/foo-bar");
  assert.equal(parsed?.date, "20260717");
  assert.equal(parsed?.suffixNumber, 27);
  assert.equal(formatPermanentNoteId(parsed), id);
  assert.deepEqual(parseNoteId("N-project-001"), {
    id: "N-project-001",
    kind: "provisional",
    encodedSlug: "project",
    serial: 1,
  });
  assert.equal(parseNoteId("N-main-20260717"), null);
});

test("RT-01: note ids are extracted without duplicate consumers", () => {
  const permanent = formatPermanentNoteId({ slug: "main", date: "20260717", suffix: "a" });
  assert.deepEqual(extractNoteIds(`legacy N-011, permanent ${permanent}, again N-011, bad N-1`), ["N-011", permanent]);
});

test("RT-04: reversible zHH slug encoding prevents normalization collisions", () => {
  const values = ["foo-bar", "foobar", "foo_bar", "fizz", "project/日本語"];
  const encoded = values.map(encodeBranchSlug);
  assert.equal(new Set(encoded.slice(0, 3)).size, 3);
  assert.match(encodeBranchSlug("fizz"), /z7a/);
  assert.deepEqual(encoded.map(decodeBranchSlug), values);
  assert.throws(() => decodeBranchSlug("badz"), /invalid branch slug escape/);
});

test("contract has no dead leaf and the detector flags a positive fixture", () => {
  assert.deepEqual(contractCoverage().unconsumed, []);
  const fixture = { schema_version: 1, identifiers: { unused: { pattern: "x" } } };
  assert.deepEqual(findUnconsumedContractFields(fixture, new Set(["schema_version"])), ["identifiers.unused.pattern"]);
});

test("suffix formatting and temp repository fixture are deterministic", () => {
  assert.equal(numberToSuffix(1), "a");
  assert.equal(numberToSuffix(26), "z");
  assert.equal(numberToSuffix(27), "aa");
  withTempDir((dir) => {
    initGitRepo(dir, "fixture");
    fs.writeFileSync(path.join(dir, "probe.txt"), "ok\n", "utf8");
    gitInRepo(dir, ["add", "probe.txt"]);
    gitInRepo(dir, ["commit", "-m", "fixture"], { stdio: "ignore" });
    assert.equal(gitInRepo(dir, ["branch", "--show-current"], { encoding: "utf8" }).trim(), "fixture");
  });
});
