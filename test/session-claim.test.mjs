import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { copyFrameworkFixture, gitInRepo, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

// AP-016 mechanical guard (2026-08-24). Motivation: 4 same-day collisions between
// two sessions sharing ONE working tree — a foreign session overwrote a claimed
// record and finish committed it cleanly (the second task's task_index increment
// was then silently absorbed by bump idempotency), and ids used only in HOST
// commit subjects were invisible to brief's allocation scan and got re-issued.
// The guard: brief writes an untracked claim sidecar with a per-claim token;
// finish --sid verifies ownership FAIL-CLOSED when the sidecar exists; brief
// --date also scans the host repo log in the nested layout.

function fixture(callback) {
  return withTempDir((dir) => {
    copyFrameworkFixture(dir);
    initGitRepo(dir);
    gitInRepo(dir, ["add", "-A"]);
    gitInRepo(dir, ["commit", "-q", "-m", "fixture"]);
    return callback(dir);
  });
}

const ID_RE = /TASK-[A-Za-z0-9]+-\d{8}-(\d{3})/;
const TOKEN_RE = /claim token: ([0-9a-f]{16})/;

function briefOnce(dir, date) {
  const result = runCli(dir, ["brief", "--date", date]);
  const out = result.stdout + result.stderr;
  const id = out.match(ID_RE);
  const token = out.match(TOKEN_RE);
  assert.ok(id, `brief must print a created id: ${out}`);
  assert.ok(token, `brief must print a claim token: ${out}`);
  return { id: id[0], token: token[1], out };
}

test("brief issues a claim token and writes the sidecar", () => {
  fixture((dir) => {
    const { id, token } = briefOnce(dir, "20260824");
    const sidecar = path.join(dir, "tasks", "records", ".claims", `${id}.sid`);
    assert.ok(fs.existsSync(sidecar), "claim sidecar must exist");
    assert.equal(fs.readFileSync(sidecar, "utf8").trim(), token);
  });
});

test("finish without --sid on a claimed record fails closed", () => {
  fixture((dir) => {
    const { id } = briefOnce(dir, "20260824");
    const result = runCli(dir, ["finish", "--task", id]);
    const out = result.stdout + result.stderr;
    assert.notEqual(result.status, 0);
    assert.match(out, /--sid/);
    assert.match(out, /不可逆操作前に中断/);
  });
});

test("finish with a MISMATCHED --sid fails closed (foreign session)", () => {
  fixture((dir) => {
    const { id } = briefOnce(dir, "20260824");
    const result = runCli(dir, ["finish", "--task", id, "--sid", "deadbeefdeadbeef"]);
    const out = result.stdout + result.stderr;
    assert.notEqual(result.status, 0);
    assert.match(out, /claim token 不一致/);
  });
});

test("finish with the CORRECT --sid passes the ownership gate", () => {
  fixture((dir) => {
    const { id, token } = briefOnce(dir, "20260824");
    const result = runCli(dir, ["finish", "--task", id, "--sid", token]);
    const out = result.stdout + result.stderr;
    // It may fail LATER (empty evidence), but never on the claim gate.
    assert.doesNotMatch(out, /claim token 不一致/);
    assert.doesNotMatch(out, /claim token 付きで claim されています/);
  });
});

test("brief --date burns ids used only in HOST repo commit subjects (nested layout)", () => {
  withTempDir((hostDir) => {
    // host repo with the framework nested at doc/HyperHelix (ignored by the host)
    initGitRepo(hostDir);
    fs.writeFileSync(path.join(hostDir, "README.md"), "host\n");
    fs.writeFileSync(path.join(hostDir, ".gitignore"), "doc/HyperHelix/\n");
    gitInRepo(hostDir, ["add", "-A"]);
    gitInRepo(hostDir, ["commit", "-q", "-m", "host init"]);

    const fw = path.join(hostDir, "doc", "HyperHelix");
    fs.mkdirSync(fw, { recursive: true });
    copyFrameworkFixture(fw);
    initGitRepo(fw);
    gitInRepo(fw, ["add", "-A"]);
    gitInRepo(fw, ["commit", "-q", "-m", "framework fixture"]);

    const first = briefOnce(fw, "20260824");
    const m = first.id.match(/^TASK-(.+)-(\d{8})-(\d{3})$/);
    assert.ok(m, `id shape: ${first.id}`);
    const slug = m[1];
    const burned = `TASK-${slug}-20260824-${String(Number(m[3]) + 6).padStart(3, "0")}`;

    // the parallel session references the id in a HOST commit, record not yet created
    fs.writeFileSync(path.join(hostDir, "work.txt"), "x\n");
    gitInRepo(hostDir, ["add", "-A"]);
    gitInRepo(hostDir, ["commit", "-q", "-m", `${burned}: host-side use before any record exists`]);

    const second = briefOnce(fw, "20260824");
    const serial2 = Number(second.id.match(/^TASK-.+-\d{8}-(\d{3})$/)[1]);
    assert.equal(serial2, Number(m[3]) + 7,
      `allocation must skip past the host-burned serial (got ${second.id}, burned ${burned})`);
  });
});

// AP-016, 5th incident (2026-10-02): two sessions in separate WORKTREES both claimed
// -020/-021 with explicit `--task`. The claim sidecar is per-worktree and the allocation
// scan read HEAD only, so ids committed on an unmerged branch were invisible. Worktrees
// share the repository's refs — the scan now reads commit subjects on ALL refs.
function commitOnSideBranch(dir, id) {
  gitInRepo(dir, ["checkout", "-q", "-b", "side"]);
  fs.writeFileSync(path.join(dir, "side.txt"), "x\n");
  gitInRepo(dir, ["add", "side.txt"]);
  gitInRepo(dir, ["commit", "-q", "-m", `${id}: work on an unmerged branch`]);
  gitInRepo(dir, ["checkout", "-q", "-"]);
}

test("explicit brief --task fails closed on an id committed on another, unmerged branch", () => {
  fixture((dir) => {
    const taken = "TASK-main-20261002-020";
    commitOnSideBranch(dir, taken);
    const result = runCli(dir, ["brief", "--task", taken]);
    assert.notEqual(result.status, 0, result.stdout);
    assert.match(result.stderr, /既にコミットで使われています/);
    assert.doesNotMatch(result.stdout, /Claimed/);
    assert.equal(fs.existsSync(path.join(dir, "tasks", "records", ".claims", `${taken}.sid`)), false);
    // a free id on the same day is still claimable
    assert.match(runCli(dir, ["brief", "--task", "TASK-main-20261002-021"]).stdout, /Claimed TASK-main-20261002-021/);
  });
});

test("brief --date skips a serial committed on another, unmerged branch", () => {
  fixture((dir) => {
    const first = briefOnce(dir, "20261002");
    const m = first.id.match(/^TASK-(.+)-(\d{8})-(\d{3})$/);
    const burned = `TASK-${m[1]}-20261002-${String(Number(m[3]) + 4).padStart(3, "0")}`;
    commitOnSideBranch(dir, burned);
    const second = briefOnce(dir, "20261002");
    assert.equal(Number(second.id.match(/-(\d{3})$/)[1]), Number(m[3]) + 5,
      `allocation must skip past the side-branch serial (got ${second.id}, burned ${burned})`);
  });
});
