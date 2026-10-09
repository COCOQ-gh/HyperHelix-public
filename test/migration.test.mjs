import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { runCli } from "./helpers/repo-fixture.mjs";

const root = path.dirname(fileURLToPath(new URL("../entrypoint.md", import.meta.url)));

const forbiddenPatterns = [
  /ledger max\+1/i,
  /台帳 max\+1/,
  /Assigns official N-NNN/i,
  /Reflux runs this automatically after cherry-pick/i,
];

function findForbiddenLiveSemantics(text) {
  return forbiddenPatterns.flatMap((pattern) => [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))].map((match) => match[0]));
}

test("RT-10: forbidden live migration semantics are absent from active consumers", () => {
  const files = [
    "README.md",
    "core/loop.yaml",
    "core/routing.yaml",
    "assets/checklists/distill.md",
    "assets/checklists/framework-review.md",
    "assets/workflows/concurrency.md",
    "assets/workflows/git-conventions.md",
    "assets/workflows/sync-conflict-guide.md",
    "tools/hyperhelix.mjs",
  ];
  const activeText = files.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  assert.deepEqual(findForbiddenLiveSemantics(activeText), []);
  assert.equal(findForbiddenLiveSemantics("next-id = ledger " + "max+1").length, 1);
  const history = fs.readFileSync(path.join(root, "amendments.md"), "utf8");
  assert.ok(findForbiddenLiveSemantics(history).length > 0, "history remains outside the live-expression gate");
});

test("adopt-notes is a no-op compatibility alias and reflux has no adopter call", () => {
  const knowledgePath = path.join(root, "core/knowledge.yaml");
  const before = fs.readFileSync(knowledgePath, "utf8");
  const result = runCli(root, ["adopt-notes"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /deprecated compatibility alias/);
  assert.equal(fs.readFileSync(knowledgePath, "utf8"), before);
  const tool = fs.readFileSync(path.join(root, "tools/hyperhelix.mjs"), "utf8");
  assert.doesNotMatch(tool, /if\s*\(adoptNotes\(\)\)/);
});
