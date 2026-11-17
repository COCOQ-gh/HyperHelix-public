import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { copyFrameworkFixture, gitInRepo, initGitRepo, installFakeGh, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

test("RT-06: invalid brief depth exits nonzero, prints usage, and creates no file", () => {
  withTempDir((dir) => {
    initGitRepo(dir, "feature/test");
    fs.mkdirSync(path.join(dir, "tasks"));
    // SC-02: brief reads the depth-mode vocabulary from core/loop.yaml (core model)
    fs.mkdirSync(path.join(dir, "core"));
    fs.copyFileSync(new URL("../core/loop.yaml", import.meta.url), path.join(dir, "core", "loop.yaml"));
    const result = runCli(dir, ["brief", "--date", "20260717", "--mode", "warp"]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /不正な --mode 'warp'/);
    assert.match(result.stderr, /usage: brief .*micro\|light\|standard\|full\|spike/);
    assert.deepEqual(fs.readdirSync(path.join(dir, "tasks")), []);
  });
});

test("RT-07: reflux push rejection exits nonzero", () => {
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
    fs.appendFileSync(path.join(work, "README.md"), "\nreflux fixture\n", "utf8");
    gitInRepo(work, ["add", "README.md"]);
    gitInRepo(work, ["commit", "-m", "framework candidate"], { stdio: "ignore" });

    const hook = path.join(remote, "hooks", "pre-receive");
    fs.writeFileSync(hook, "#!/bin/sh\nexit 1\n", "utf8");
    fs.chmodSync(hook, 0o755);
    const fake = installFakeGh(base);

    const result = runCli(work, ["reflux", "--apply"], { env: fake.env });
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /push 拒否/);
    assert.equal(gitInRepo(work, ["branch", "--show-current"], { encoding: "utf8" }).trim(), "project/test");
  });
});
