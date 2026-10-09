import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { copyFrameworkFixture, gitInRepo, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

// `finish --path` used to reject any path missing from disk. `archive-briefs` git-rm's the
// records it archives, so the two could never run in one task: the caller fell back to a
// manual bump + pathspec commit, which skips L3 entirely. Measured twice on 2026-08-23
// (TASK-Project001-20260823-021 and -024; the second shipped a broken test into the tree).
// A path staged as a deletion is now accepted; a path that is simply absent still is not.

function fixture(callback) {
  return withTempDir((dir) => {
    copyFrameworkFixture(dir);
    initGitRepo(dir);
    gitInRepo(dir, ["add", "-A"]);
    gitInRepo(dir, ["commit", "-q", "-m", "fixture"]);
    return callback(dir);
  });
}

test("finish --path accepts a path staged as a deletion", () => {
  fixture((dir) => {
    const victim = "docs/process-backlog.md";
    assert.ok(fs.existsSync(path.join(dir, victim)), "fixture must ship the file");
    gitInRepo(dir, ["rm", "-q", "--", victim]);

    const result = runCli(dir, ["finish", "--task", "TASK-Project001-20260823-099", "--path", victim]);
    const out = result.stdout + result.stderr;
    // It must fail for a LATER reason (unknown task), never for the path itself.
    assert.doesNotMatch(out, /path does not exist/);
  });
});

test("finish --path still rejects a path that is absent and not staged for deletion", () => {
  fixture((dir) => {
    const result = runCli(dir, ["finish", "--task", "TASK-Project001-20260823-099", "--path", "docs/no-such-file.md"]);
    const out = result.stdout + result.stderr;
    assert.match(out, /not a staged deletion/);
    assert.notEqual(result.status, 0);
  });
});
