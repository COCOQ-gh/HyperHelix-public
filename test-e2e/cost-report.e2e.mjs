import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

import { buildCostInventory } from "../tools/lib/cost-inventory.mjs";
import {
  copyFrameworkFixture,
  gitInRepo,
  initGitRepo,
  runCli,
  withTempDir,
} from "../test/helpers/repo-fixture.mjs";

function trackedContentHash(root) {
  const files = gitInRepo(root, ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean).sort();
  const hash = crypto.createHash("sha256");
  for (const relative of files) {
    hash.update(relative.replaceAll("\\", "/"));
    hash.update("\0");
    // On Linux the fixture's node_modules link is a TRACKED symlink (the ignore rule
    // `node_modules/` matches directories only; a Windows junction counts as one, a
    // symlink does not). Its tracked content is the link target, not a file body.
    const absolute = path.join(root, relative);
    hash.update(fs.lstatSync(absolute).isSymbolicLink() ? fs.readlinkSync(absolute) : fs.readFileSync(absolute));
    hash.update("\0");
  }
  return hash.digest("hex");
}

test("HH-071: cycle inventory is delta by default, full on request, and includes changed workflows", () => {
  withTempDir((root) => {
    initGitRepo(root, "main");
    copyFrameworkFixture(root);
    gitInRepo(root, ["add", "."]);
    gitInRepo(root, ["commit", "-m", "fixture review baseline"], { stdio: "ignore" });

    const delta = buildCostInventory(root);
    const full = buildCostInventory(root, { fullCycle: true });
    assert.equal(delta.ok, true, delta.errors.join("\n"));
    assert.equal(delta.cycle.mode, "delta");
    assert.match(delta.cycle.baseRef, /^[0-9a-f]{40}$/);
    assert.equal(full.cycle.mode, "full");
    assert.ok(full.cycle.fileCount > delta.cycle.fileCount);
    assert.ok(delta.cycle.files.some((entry) => entry.path === "assets/workflows/exception-handling.md"));
    assert.ok(delta.cycle.files.some((entry) => entry.path === "assets/workflows/consolidation.md"));

    const changedWorkflow = "assets/workflows/sync-conflict-guide.md";
    fs.appendFileSync(path.join(root, changedWorkflow), "\nchanged workflow fixture\n", "utf8");
    const changed = buildCostInventory(root);
    assert.equal(changed.cycle.mode, "delta");
    assert.ok(changed.cycle.files.some((entry) => entry.path === changedWorkflow));
  });
});

test("IMP-05: default cost-report is tracked-content read-only", () => {
  withTempDir((root) => {
    initGitRepo(root, "main");
    copyFrameworkFixture(root);
    gitInRepo(root, ["add", "."]);
    gitInRepo(root, ["commit", "-m", "fixture base"], { stdio: "ignore" });
    const before = trackedContentHash(root);

    const result = runCli(root, ["cost-report"]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /R7a \/cycle mandatory read-set/);
    assert.match(result.stdout, /R7e CLI tooling surface/);
    assert.equal(trackedContentHash(root), before);
    assert.equal(gitInRepo(root, ["status", "--porcelain"], { encoding: "utf8" }).trim(), "");
  });
});
