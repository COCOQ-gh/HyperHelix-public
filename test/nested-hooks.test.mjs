// TASK-Project001-20260823-0XX: positive fixture (HH-028) for the NESTED_HOOKS_MISSING guard.
// process-backlog class:enforcement-gap (N-Project001-20260818b): when HyperHelix is nested
// under a host project's own git repo, the only hooks Claude Code actually loads live in
// the HOST's .claude/settings.json — the copy inside this repo is inert there. This guard
// detects the nesting generically (a git repo one level above `root`) and warns if the
// host has no compaction-hooks.mjs wiring.
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cliPath, copyFrameworkFixture, gitInRepo, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

function runValidate(nestedDir) {
  return execFileSync(process.execPath, [cliPath, "validate"], { cwd: nestedDir, encoding: "utf8" });
}

function makeNestedFixture(dir) {
  initGitRepo(dir, "main"); // the HOST repo
  const nested = path.join(dir, "doc", "HyperHelix");
  fs.mkdirSync(nested, { recursive: true });
  copyFrameworkFixture(nested);
  initGitRepo(nested, "main"); // HyperHelix's OWN separate git repo, one level down
  return nested;
}

test("NESTED_HOOKS_MISSING fires when the host has no .claude/settings.json at all", () => {
  withTempDir((dir) => {
    const nested = makeNestedFixture(dir);
    const out = runValidate(nested);
    assert.match(out, /WARN NESTED_HOOKS_MISSING/);
    assert.match(out, /does not exist/);
    assert.match(out, /session-bootstrap\.md §3b/);
  });
});

test("NESTED_HOOKS_MISSING fires when the host settings.json exists but omits compaction-hooks.mjs", () => {
  withTempDir((dir) => {
    const nested = makeNestedFixture(dir);
    fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".claude", "settings.json"), JSON.stringify({ hooks: {} }));
    const out = runValidate(nested);
    assert.match(out, /WARN NESTED_HOOKS_MISSING/);
    assert.match(out, /does not reference compaction-hooks\.mjs/);
  });
});

test("NESTED_HOOKS_MISSING stays silent when the host settings.json references compaction-hooks.mjs", () => {
  withTempDir((dir) => {
    const nested = makeNestedFixture(dir);
    fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".claude", "settings.json"),
      JSON.stringify({ hooks: { PreCompact: [{ hooks: [{ command: "node doc/HyperHelix/tools/compaction-hooks.mjs precompact" }] }] } }),
    );
    const out = runValidate(nested);
    assert.doesNotMatch(out, /NESTED_HOOKS_MISSING/);
  });
});

test("NESTED_HOOKS_MISSING stays silent when HyperHelix is NOT nested (no git repo above root)", () => {
  withTempDir((dir) => {
    initGitRepo(dir, "main");
    copyFrameworkFixture(dir);
    const out = runValidate(dir);
    assert.doesNotMatch(out, /NESTED_HOOKS_MISSING/);
  });
});

// Regression (TASK-main-20261002-016): the nesting probe runs `git -C <parent> rev-parse`,
// which fails in the normal non-nested layout. Its `fatal: not a git repository` must not
// leak to stderr next to a clean "0 error(s)" report.
test("non-nested validate does not leak the nesting probe's git error to stderr", () => {
  withTempDir((dir) => {
    initGitRepo(dir, "main");
    copyFrameworkFixture(dir);
    const result = runCli(dir, ["validate"]);
    assert.doesNotMatch(result.stderr, /not a git repository/);
  });
});

test("NESTED_HOOKS_MISSING is a warning, never a hard error", () => {
  withTempDir((dir) => {
    const nested = makeNestedFixture(dir);
    const out = runValidate(nested);
    assert.doesNotMatch(out, /ERROR NESTED_HOOKS_MISSING/);
    assert.match(out, /^0 error\(s\)/m);
  });
});
