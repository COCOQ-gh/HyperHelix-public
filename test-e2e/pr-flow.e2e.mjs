import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  copyFrameworkFixture,
  gitInRepo,
  initGitRepo,
  installFakeGh,
  runCli,
  withTempDir,
} from "../test/helpers/repo-fixture.mjs";

function initRemoteFixture(base) {
  const remote = path.join(base, "remote.git");
  const work = path.join(base, "work");
  fs.mkdirSync(remote);
  fs.mkdirSync(work);
  gitInRepo(remote, ["init", "--bare"], { stdio: "ignore" });
  initGitRepo(work, "main");
  copyFrameworkFixture(work);
  gitInRepo(work, ["add", "."]);
  gitInRepo(work, ["commit", "-m", "fixture base"], { stdio: "ignore" });
  gitInRepo(work, ["remote", "add", "origin", remote]);
  gitInRepo(work, ["push", "-u", "origin", "main"], { stdio: "ignore" });
  const baseHead = gitInRepo(work, ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  return { remote, work, baseHead };
}

function remoteMain(remote) {
  return gitInRepo(remote, ["rev-parse", "refs/heads/main"], { encoding: "utf8" }).trim();
}

test("HH-070: live PR guidance contains no superseded server-enforcement contract", () => {
  const guidanceFiles = [
    "constitution.md",
    "README.md",
    ".claude/commands/skills/sync.md",
    "assets/workflows/branch-protection-runbook.md",
    "assets/workflows/git-conventions.md",
    "assets/workflows/sync-conflict-guide.md",
    "docs/framework-improvement-plan.md",
    "docs/process-backlog.md",
  ];
  const guidance = guidanceFiles.map((file) => fs.readFileSync(path.resolve(file), "utf8")).join("\n");
  const externalBlockMarker = "[blocked:external-human]";
  const forbidden = [
    ["required", "checks"].join(" "),
    ["Governance paths wait for a human", "CODEOWNERS approval"].join(" "),
    ["Before enabling", "protection"].join(" "),
    ["GOV-01 remains", "open"].join(" "),
    [externalBlockMarker, "GOV-01"].join(" "),
  ];
  for (const expression of forbidden) {
    assert.equal(guidance.includes(expression), false, `superseded guidance remains: ${expression}`);
  }
});

test("HH-071: CI workflow describes branch protection as optional hardening", () => {
  const workflow = fs.readFileSync(path.resolve(".github/workflows/validate.yml"), "utf8");
  assert.match(workflow, /Branch protection is optional hardening/);
  assert.doesNotMatch(workflow, /branch protection の .*指定する/);
  assert.match(workflow, /os: \[ubuntu-latest, windows-latest\]/);
});

describe("isolated PR transport", { concurrency: true }, () => {
test("HH-070: governed sync without branch protection waits for checks then requires manual merge", () => {
  withTempDir((base) => {
    const { remote, work, baseHead } = initRemoteFixture(base);
    fs.appendFileSync(path.join(work, ".github", "CODEOWNERS"), "\n# Control-plane fixture.\n", "utf8");
    gitInRepo(work, ["add", ".github/CODEOWNERS"]);
    gitInRepo(work, ["commit", "-m", "control-plane update"], { stdio: "ignore" });
    const fake = installFakeGh(base);

    const result = runCli(work, ["sync"], {
      env: { ...fake.env, HH_TEST_ASSUME_VALID_FRAMEWORK: "0" },
    });

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /人間手動merge待ち\(統治対象: \.github\/CODEOWNERS\).*CODEOWNER Approveは要求せず/);
    const log = fs.readFileSync(fake.log, "utf8");
    assert.match(log, /pr create/);
    assert.match(log, /pr checks https:\/\/example\.invalid\/hyperhelix\/pull\/1 --watch/);
    assert.doesNotMatch(log, /pr merge/);
    assert.doesNotMatch(log, /api .*protection/);
    assert.equal(remoteMain(remote), baseHead);
  });
});

test("HH-060/069/070: reflux stages on an isolated PR branch and restores the project branch", () => {
  withTempDir((base) => {
    const { remote, work, baseHead } = initRemoteFixture(base);
    gitInRepo(work, ["switch", "-c", "project/test"], { stdio: "ignore" });
    fs.appendFileSync(path.join(work, "README.md"), "\nReflux PR fixture\n", "utf8");
    gitInRepo(work, ["add", "README.md"]);
    gitInRepo(work, ["commit", "-m", "framework candidate"], { stdio: "ignore" });
    const fake = installFakeGh(base);

    const result = runCli(work, ["reflux", "--apply"], { env: fake.env });

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(gitInRepo(work, ["branch", "--show-current"], { encoding: "utf8" }).trim(), "project/test");
    assert.match(result.stdout, /project\/test へ戻りました\(PR state=merged\)/);
    const log = fs.readFileSync(fake.log, "utf8");
    assert.match(log, /pr create --base main --head hyperhelix\/reflux-project-test-/);
    assert.match(log, /pr checks/);
    assert.match(log, /pr merge/);
    assert.equal(remoteMain(remote), baseHead, "reflux must not use local-main/direct-main transport");
  });
});

test("HH-069/070: governed check failure preserves the PR and returns nonzero", () => {
  withTempDir((base) => {
    const { remote, work, baseHead } = initRemoteFixture(base);
    fs.appendFileSync(path.join(work, "constitution.md"), "\nFailing checks fixture.\n", "utf8");
    gitInRepo(work, ["add", "constitution.md"]);
    gitInRepo(work, ["commit", "-m", "governance update"], { stdio: "ignore" });
    const fake = installFakeGh(base);

    const result = runCli(work, ["sync"], { env: { ...fake.env, HH_TEST_GH_FAIL_CHECKS: "1" } });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /PR checks に失敗/);
    const log = fs.readFileSync(fake.log, "utf8");
    assert.match(log, /pr create/);
    assert.match(log, /pr checks/);
    assert.doesNotMatch(log, /pr merge/);
    assert.equal(remoteMain(remote), baseHead);
  });
});
});
