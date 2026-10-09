import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { copyFrameworkFixture, gitInRepo, initGitRepo, installFakeGh, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

// /cycle 2026-10-02 (backlog enforcement-gap): a commit that ships a detector WITH
// its positive test must stay a reflux candidate — test/ is framework material here.
test("reflux classifies a tools+test commit as framework-only and a game file as project", () => {
  withTempDir((base) => {
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
    gitInRepo(work, ["switch", "-c", "project/test"], { stdio: "ignore" });

    fs.mkdirSync(path.join(work, "test"), { recursive: true });
    fs.writeFileSync(path.join(work, "test", "detector.test.mjs"), "// positive fixture\n", "utf8");
    fs.appendFileSync(path.join(work, "tools", "hyperhelix.mjs"), "\n// detector\n", "utf8");
    gitInRepo(work, ["add", "test", "tools"]);
    gitInRepo(work, ["commit", "-m", "detector with test"], { stdio: "ignore" });

    fs.writeFileSync(path.join(work, "GAME.ERB"), "PRINTL x\n", "utf8");
    gitInRepo(work, ["add", "GAME.ERB"]);
    gitInRepo(work, ["commit", "-m", "game change"], { stdio: "ignore" });

    const result = runCli(work, ["reflux"]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const [candidates, excluded] = result.stdout.split("除外(");
    assert.match(candidates, /detector with test/);
    assert.match(excluded, /game change/);
    assert.doesNotMatch(excluded, /detector with test/);
  });
});

// HH-081 stage 3 (D8): task records never reflux. A framework commit that also carries a
// tasks/ record stays a candidate; --apply strips the tasks/ part; a tasks-only commit is excluded.
test("reflux keeps framework+record commits, drops their tasks/ part, and excludes tasks-only commits", () => {
  withTempDir((base) => {
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
    gitInRepo(work, ["switch", "-c", "project/test"], { stdio: "ignore" });

    fs.mkdirSync(path.join(work, "tasks", "records"), { recursive: true });
    fs.appendFileSync(path.join(work, "README.md"), "\nframework change\n", "utf8");
    fs.writeFileSync(path.join(work, "tasks", "records", "TASK-test-20261002-001.yaml"), "x: 1\n", "utf8");
    gitInRepo(work, ["add", "README.md", "tasks"]);
    gitInRepo(work, ["commit", "-m", "framework with record"], { stdio: "ignore" });
    fs.writeFileSync(path.join(work, "tasks", "records", "TASK-test-20261002-002.yaml"), "x: 2\n", "utf8");
    gitInRepo(work, ["add", "tasks"]);
    gitInRepo(work, ["commit", "-m", "record only"], { stdio: "ignore" });

    const dry = runCli(work, ["reflux"]);
    assert.equal(dry.status, 0, dry.stdout + dry.stderr);
    const [candidates, excluded] = dry.stdout.split("除外(");
    assert.match(candidates, /framework with record.*tasks\/ の作業記録は還元時に除外/);
    assert.match(excluded, /record only/);

    fs.writeFileSync(path.join(remote, "hooks", "pre-receive"), "#!/bin/sh\nexit 1\n", "utf8");
    fs.chmodSync(path.join(remote, "hooks", "pre-receive"), 0o755);
    const fake = installFakeGh(base);
    const applied = runCli(work, ["reflux", "--apply"], { env: fake.env });
    assert.match(applied.stdout, /tasks\/ の変更 1 件を除外/);
    const staging = gitInRepo(work, ["branch", "--list", "hyperhelix/reflux-*", "--format=%(refname:short)"], { encoding: "utf8" }).trim();
    assert.ok(staging, "staging branch exists");
    const tree = gitInRepo(work, ["ls-tree", "-r", "--name-only", staging], { encoding: "utf8" });
    assert.doesNotMatch(tree, /tasks\/records\/TASK-test-20261002-00[12]\.yaml/, "no task record reached the reflux branch");
    assert.match(gitInRepo(work, ["show", `${staging}:README.md`], { encoding: "utf8" }), /framework change/);
  });
});
