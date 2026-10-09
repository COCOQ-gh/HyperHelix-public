import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  captureReviewSnapshot,
  classifyReviewSession,
  reviewSnapshotDigest,
} from "../tools/lib/review-session.mjs";
import {
  gitInRepo,
  initGitRepo,
  runCli,
  withTempDir,
} from "./helpers/repo-fixture.mjs";

const HEAD = "a".repeat(40);

function entry(repoPath, worktree = "file:one", index = "index:one", code = " M") {
  return { code, path: repoPath, index_fingerprint: index, worktree_fingerprint: worktree };
}

function snapshot(paths = [], head = HEAD) {
  const value = { schema_version: 1, head, paths };
  return { ...value, snapshot_digest: reviewSnapshotDigest(value) };
}

function journal(baseline, { owned = [], foreign = [] } = {}) {
  return {
    schema_version: 1,
    baseline_digest: baseline.snapshot_digest,
    owned_paths: owned,
    foreign_paths: foreign,
  };
}

test("HH-068 clean and isolated equality qualify as review-only", () => {
  const baseline = snapshot();
  assert.equal(classifyReviewSession({ baseline, end: snapshot(), journal: journal(baseline) }).verdict, "review-only");
  const isolated = classifyReviewSession({ baseline, end: snapshot(), journal: journal(baseline), isolated: true });
  assert.equal(isolated.verdict, "review-only");
  assert.equal(isolated.exit_code, 0);
});

test("HH-068 unchanged pre-existing dirtiness does not fail", () => {
  const baseline = snapshot([entry("foreign.txt")]);
  const result = classifyReviewSession({
    baseline,
    end: snapshot([entry("foreign.txt")]),
    journal: journal(baseline),
  });
  assert.equal(result.verdict, "review-only");
});

test("HH-068 any recorded owned write requires a task even with equal end state", () => {
  const baseline = snapshot();
  const result = classifyReviewSession({
    baseline,
    end: snapshot(),
    journal: journal(baseline, { owned: ["owned.txt"] }),
  });
  assert.equal(result.verdict, "task-required");
  assert.equal(result.exit_code, 2);
});

test("HH-068 newly added foreign path passes only with explicit ownership", () => {
  const baseline = snapshot();
  const end = snapshot([entry("foreign.txt", "file:foreign", "untracked", "??")]);
  const known = classifyReviewSession({ baseline, end, journal: journal(baseline, { foreign: ["foreign.txt"] }) });
  assert.equal(known.verdict, "review-only");
  assert.equal(known.reasons[0].code, "foreign-delta-only");

  const unknown = classifyReviewSession({ baseline, end, journal: journal(baseline) });
  assert.equal(unknown.verdict, "unverified");
  assert.equal(unknown.exit_code, 3);
});

test("HH-068 ambiguous same-path delta and unavailable baseline fail closed", () => {
  const baseline = snapshot([entry("shared.txt", "file:before")]);
  const changed = snapshot([entry("shared.txt", "file:after")]);
  const ambiguous = classifyReviewSession({
    baseline,
    end: changed,
    journal: journal(baseline, { foreign: ["shared.txt"] }),
  });
  assert.equal(ambiguous.verdict, "unverified");
  assert.equal(ambiguous.reasons[0].code, "ambiguous-same-path-delta");

  const unavailable = classifyReviewSession({ baseline: null, end: snapshot(), journal: null });
  assert.equal(unavailable.verdict, "unverified");
  assert.equal(unavailable.reasons[0].code, "baseline-unavailable");
});

test("HH-068 review-snapshot/check CLI proves zero-write and detects owned write", () => withTempDir((container) => {
  const repo = path.join(container, "repo");
  fs.mkdirSync(repo);
  initGitRepo(repo);
  fs.writeFileSync(path.join(repo, "seed.txt"), "seed\n", "utf8");
  gitInRepo(repo, ["add", "seed.txt"]);
  gitInRepo(repo, ["commit", "-m", "seed"], { stdio: "ignore" });

  const captured = runCli(repo, ["review-snapshot"]);
  assert.equal(captured.status, 0, captured.stderr);
  const baseline = JSON.parse(captured.stdout);
  assert.deepEqual(captureReviewSnapshot(repo), baseline);
  const baselinePath = path.join(container, "baseline.json");
  const journalPath = path.join(container, "journal.json");
  fs.writeFileSync(baselinePath, JSON.stringify(baseline), "utf8");
  fs.writeFileSync(journalPath, JSON.stringify(journal(baseline)), "utf8");

  const clean = runCli(repo, ["review-check", "--baseline", baselinePath, "--journal", journalPath, "--isolated"]);
  assert.equal(clean.status, 0, clean.stderr);
  assert.equal(JSON.parse(clean.stdout).verdict, "review-only");

  fs.writeFileSync(path.join(repo, "owned.txt"), "owned\n", "utf8");
  fs.writeFileSync(journalPath, JSON.stringify(journal(baseline, { owned: ["owned.txt"] })), "utf8");
  const owned = runCli(repo, ["review-check", "--baseline", baselinePath, "--journal", journalPath]);
  assert.equal(owned.status, 2, owned.stderr);
  assert.equal(JSON.parse(owned.stdout).verdict, "task-required");
}));
