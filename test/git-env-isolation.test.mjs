import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import { cleanGitEnv } from "../tools/lib/git-env.mjs";
import { initGitRepo, withTempDir } from "./helpers/repo-fixture.mjs";

test("cleanGitEnv strips repo-locating GIT_* vars and keeps the rest", () => {
  const env = cleanGitEnv({
    GIT_DIR: "/x/.git/worktrees/wt", GIT_INDEX_FILE: "/x/index", GIT_WORK_TREE: "/x",
    GIT_CONFIG_PARAMETERS: "'core.bare'='true'", GIT_CONFIG_KEY_0: "k", GIT_CONFIG_VALUE_0: "v",
    GIT_EDITOR: "true", GIT_TERMINAL_PROMPT: "0", PATH: "/bin",
  });
  assert.deepEqual(Object.keys(env).sort(), ["GIT_EDITOR", "GIT_TERMINAL_PROMPT", "PATH"]);
});

// Regression (TASK-main-20261002-001): inside a linked-worktree hook git exports
// GIT_DIR; fixture git calls used to follow it into the real repository.
test("initGitRepo stays inside its temp dir even when GIT_DIR points elsewhere", () => {
  withTempDir((victim) => {
    execFileSync("git", ["init", "-q", victim], { env: cleanGitEnv() });
    const victimConfig = path.join(victim, ".git", "config");
    const before = fs.readFileSync(victimConfig, "utf8");
    const saved = process.env.GIT_DIR;
    process.env.GIT_DIR = path.join(victim, ".git");
    try {
      withTempDir((fixture) => {
        initGitRepo(fixture);
        assert.ok(fs.existsSync(path.join(fixture, ".git")), "fixture got its own repository");
      });
    } finally {
      if (saved === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = saved;
    }
    assert.equal(fs.readFileSync(victimConfig, "utf8"), before, "victim .git/config untouched");
  });
});
