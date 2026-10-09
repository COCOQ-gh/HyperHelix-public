import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  branchNamespaceFromName,
  extractTaskIds,
  formatHhId,
  formatTaskId,
  parseHhId,
  parseTaskId,
} from "../tools/lib/contracts.mjs";
import { gitInRepo, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

const root = path.dirname(fileURLToPath(new URL("../entrypoint.md", import.meta.url)));

function prepareBriefFixture(dir, branch) {
  initGitRepo(dir, branch);
  fs.mkdirSync(path.join(dir, "tasks"), { recursive: true });
  // SC-02: brief reads the depth-mode vocabulary from core/loop.yaml (core model)
  fs.mkdirSync(path.join(dir, "core"), { recursive: true });
  fs.copyFileSync(path.join(root, "core/loop.yaml"), path.join(dir, "core", "loop.yaml"));
}

function writeAmendments(dir, serial) {
  fs.writeFileSync(path.join(dir, "amendments.md"), `# amendments\n\n## HH-${String(serial).padStart(3, "0")} — fixture\n`, "utf8");
}

// SC-04: the allocator reads the governance registry (amendments.md is a view).
function writeGovernanceRegistry(dir, serial) {
  const id = `HH-${String(serial).padStart(3, "0")}`;
  fs.mkdirSync(path.join(dir, "governance/amendments/bodies"), { recursive: true });
  fs.writeFileSync(path.join(dir, "governance/amendments/registry.yaml"), [
    "schema_version: 1",
    "entries:",
    `  - id: ${id}`,
    "    title: fixture",
    "    type: fixture",
    "    status: Approved",
    "    ratified_by: tester",
    '    ratified_at: "2026-07-17"',
    "    supersedes: []",
    `    body: bodies/${id}.md`,
    "",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(dir, `governance/amendments/bodies/${id}.md`), `## ${id} — fixture\n`, "utf8");
}

test("RT-11: legacy/new task ids share one parser and keep branch namespaces distinct", () => {
  assert.deepEqual(parseTaskId("TASK-20260717-007"), {
    id: "TASK-20260717-007",
    kind: "legacy",
    encodedSlug: null,
    slug: null,
    date: "20260717",
    serial: 7,
  });
  const dashed = formatTaskId({ slug: "foo-bar", date: "20260717", serial: 1 });
  const plain = formatTaskId({ slug: "foobar", date: "20260717", serial: 1 });
  const underscored = formatTaskId({ slug: "foo_bar", date: "20260717", serial: 1 });
  assert.equal(new Set([dashed, plain, underscored]).size, 3);
  assert.equal(parseTaskId(dashed)?.slug, "foo-bar");
  assert.deepEqual(extractTaskIds(`${dashed} ${plain} TASK-bad`), [dashed, plain]);
  assert.equal(branchNamespaceFromName("project/era"), "era");
  assert.equal(branchNamespaceFromName("variant/codex"), "codex");
  assert.equal(branchNamespaceFromName("codex/fi-03"), "codex/fi-03");
});

test("RT-11: brief --date emits branch-scoped serial 001 without cross-branch collision", () => {
  withTempDir((base) => {
    const ids = [];
    for (const branch of ["foo-bar", "foobar"]) {
      const dir = path.join(base, branch);
      fs.mkdirSync(dir);
      prepareBriefFixture(dir, branch);
      const result = runCli(dir, ["brief", "--date", "20260717", "--mode", "standard", "--title", "fixture"]);
      assert.equal(result.status, 0, result.stderr);
      // HH-081 stage 4: plain brief claims a commit-record task — sidecar only, no task file.
      const name = result.stdout.match(/Claimed (TASK-\S+)/)?.[1];
      assert.ok(name, result.stdout);
      assert.equal(parseTaskId(name)?.serial, 1);
      assert.ok(fs.existsSync(path.join(dir, "tasks", "records", ".claims", `${name}.sid`)), "claim sidecar is the lock");
      const yamls = fs.existsSync(path.join(dir, "tasks", "records"))
        ? fs.readdirSync(path.join(dir, "tasks", "records")).filter((n) => n.endsWith(".yaml")) : [];
      assert.deepEqual(yamls, [], "no task record file is written");
      assert.equal(fs.existsSync(path.join(dir, "tasks", `${name}.md`)), false, "no brief file is written");
      ids.push(name);
    }
    assert.equal(new Set(ids).size, 2);
  });
});

test("RT-12: HH parser and formatter preserve the readable ordinal", () => {
  assert.deepEqual(parseHhId("HH-066"), { id: "HH-066", serial: 66 });
  assert.equal(formatHhId(67), "HH-067");
  assert.equal(parseHhId("HH-67"), null);
});

test("RT-12: next-hh-id uses origin max and refuses silent fetch fallback", () => {
  withTempDir((base) => {
    const remote = path.join(base, "remote.git");
    const seed = path.join(base, "seed");
    const work = path.join(base, "work");
    fs.mkdirSync(remote); fs.mkdirSync(seed); fs.mkdirSync(work);
    gitInRepo(remote, ["init", "--bare"], { stdio: "ignore" });
    initGitRepo(seed, "main");
    writeGovernanceRegistry(seed, 70);
    gitInRepo(seed, ["add", "governance"]);
    gitInRepo(seed, ["commit", "-m", "remote fixture"], { stdio: "ignore" });
    gitInRepo(seed, ["remote", "add", "origin", remote]);
    gitInRepo(seed, ["push", "-u", "origin", "main"], { stdio: "ignore" });

    initGitRepo(work, "main");
    writeGovernanceRegistry(work, 66);
    gitInRepo(work, ["add", "governance"]);
    gitInRepo(work, ["commit", "-m", "local fixture"], { stdio: "ignore" });
    gitInRepo(work, ["remote", "add", "origin", remote]);
    const remoteResult = runCli(work, ["next-hh-id"]);
    assert.equal(remoteResult.status, 0, remoteResult.stderr);
    assert.equal(remoteResult.stdout.trim(), "HH-071");

    // pre-SC-04 remote (no registry pushed yet): legacy amendments.md read-only fallback
    const legacyRemote = path.join(base, "legacy.git");
    const legacySeed = path.join(base, "legacy-seed");
    fs.mkdirSync(legacyRemote); fs.mkdirSync(legacySeed);
    gitInRepo(legacyRemote, ["init", "--bare"], { stdio: "ignore" });
    initGitRepo(legacySeed, "main");
    writeAmendments(legacySeed, 72);
    gitInRepo(legacySeed, ["add", "amendments.md"]);
    gitInRepo(legacySeed, ["commit", "-m", "legacy remote fixture"], { stdio: "ignore" });
    gitInRepo(legacySeed, ["remote", "add", "origin", legacyRemote]);
    gitInRepo(legacySeed, ["push", "-u", "origin", "main"], { stdio: "ignore" });
    gitInRepo(work, ["remote", "set-url", "origin", legacyRemote]);
    const legacyResult = runCli(work, ["next-hh-id"]);
    assert.equal(legacyResult.status, 0, legacyResult.stderr);
    assert.equal(legacyResult.stdout.trim(), "HH-073");
    assert.match(legacyResult.stderr, /registry 未移行/);

    gitInRepo(work, ["remote", "set-url", "origin", path.join(base, "missing.git")]);
    const failed = runCli(work, ["next-hh-id"]);
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /採番しません/);
    const offline = runCli(work, ["next-hh-id", "--offline"]);
    assert.equal(offline.status, 0);
    assert.equal(offline.stdout.trim(), "HH-067");
    assert.match(offline.stderr, /WARNING --offline/);
  });
});

test("RT-12: next-hh-id folds in open origin/hyperhelix/* PR branch registries (advisory, best-effort)", () => {
  withTempDir((base) => {
    const remote = path.join(base, "remote.git");
    const seed = path.join(base, "seed");
    const work = path.join(base, "work");
    fs.mkdirSync(remote); fs.mkdirSync(seed); fs.mkdirSync(work);
    gitInRepo(remote, ["init", "--bare"], { stdio: "ignore" });
    initGitRepo(seed, "main");
    writeGovernanceRegistry(seed, 70);
    gitInRepo(seed, ["add", "governance"]);
    gitInRepo(seed, ["commit", "-m", "remote main fixture"], { stdio: "ignore" });
    gitInRepo(seed, ["remote", "add", "origin", remote]);
    gitInRepo(seed, ["push", "-u", "origin", "main"], { stdio: "ignore" });

    // POSITIVE case: an unmerged PR branch carries a HIGHER Pending HH than origin/main.
    // Without the fold-in, next-hh-id would return HH-071 (origin/main+1) and collide
    // with the PR branch's already-allocated HH-080 once it merges (the 2026-07-19 incident).
    gitInRepo(seed, ["checkout", "-b", "hyperhelix/reflux-fixture-hh080"], { stdio: "ignore" });
    writeGovernanceRegistry(seed, 80);
    gitInRepo(seed, ["add", "governance"]);
    gitInRepo(seed, ["commit", "-m", "PR branch fixture: Pending HH-080"], { stdio: "ignore" });
    gitInRepo(seed, ["push", "-u", "origin", "hyperhelix/reflux-fixture-hh080"], { stdio: "ignore" });

    // negative-robustness case: a second open branch has an unparseable registry —
    // must be skipped (advisory), never fail-closed the whole allocation.
    gitInRepo(seed, ["checkout", "main"], { stdio: "ignore" });
    gitInRepo(seed, ["checkout", "-b", "hyperhelix/sync-fixture-broken"], { stdio: "ignore" });
    fs.writeFileSync(path.join(seed, "governance/amendments/registry.yaml"), "not: [valid, yaml", "utf8");
    gitInRepo(seed, ["add", "governance"]);
    gitInRepo(seed, ["commit", "-m", "PR branch fixture: broken registry"], { stdio: "ignore" });
    gitInRepo(seed, ["push", "-u", "origin", "hyperhelix/sync-fixture-broken"], { stdio: "ignore" });

    initGitRepo(work, "main");
    writeGovernanceRegistry(work, 66);
    gitInRepo(work, ["add", "governance"]);
    gitInRepo(work, ["commit", "-m", "local fixture"], { stdio: "ignore" });
    gitInRepo(work, ["remote", "add", "origin", remote]);

    const result = runCli(work, ["next-hh-id"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "HH-081", "must fold in the PR branch's HH-080, not just origin/main's HH-070");
    assert.match(result.stderr, /sync-fixture-broken.*invalid.*skip/, "the broken branch must be reported as skipped, not fatal");

    // --offline must skip the PR-branch scan entirely (and the origin/main check).
    const offline = runCli(work, ["next-hh-id", "--offline"]);
    assert.equal(offline.status, 0);
    assert.equal(offline.stdout.trim(), "HH-067", "offline must ignore both origin/main and PR branches");
  });
});

test("task-id consumers do not redeclare the legacy-only regex", () => {
  const tool = fs.readFileSync(path.join(root, "tools/hyperhelix.mjs"), "utf8");
  assert.doesNotMatch(tool, /\^TASK-\\d/);
  assert.doesNotMatch(tool, /taskId\.match\(\/\^TASK/);
});
