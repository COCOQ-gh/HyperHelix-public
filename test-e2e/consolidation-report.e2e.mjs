import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  copyFrameworkFixture,
  gitInRepo,
  initGitRepo,
  runCli,
  withTempDir,
} from "../test/helpers/repo-fixture.mjs";

const BACKLOG = path.join("docs", "process-backlog.md");

// The live docs/process-backlog.md is burned down by every /cycle, so its open count
// is not a test constant. Replace the fixture's copy with a backlog of a KNOWN shape:
// `openRows` priority rows, plus one [ref] row and one closed-section pointer that the
// report must not count.
function writeFixtureBacklog(root, openRows) {
  const rows = Array.from({ length: openRows }, (_, index) =>
    `- [${["high", "med", "low"][index % 3]}] [class:test] fixture row ${index + 1} / source test`);
  fs.writeFileSync(path.join(root, BACKLOG), [
    "# Process backlog (fixture)",
    "",
    "## 未決・繰延(open)",
    ...rows,
    "- [ref] [class:test] reference row / source test",
    "",
    "## 完了・棄却(closed)",
    "- [low] [class:test] history pointer / source test",
    "",
  ].join("\n"), "utf8");
}

function sectionLines(text, start, end) {
  const body = text.split(start)[1]?.split(end)[0] || "";
  return body.split(/\r?\n/).filter((line) => /^  N[^ ]+~N/.test(line));
}

function decisionRows(text) {
  return text.split(/\r?\n/).filter((line) => /^  - \[(?:high|med|low)\] \[class:test\] fixture row/.test(line));
}

test("HH-071: consolidation report bounds note/backlog decisions and --full preserves all", () => {
  withTempDir((root) => {
    initGitRepo(root, "main");
    copyFrameworkFixture(root);
    writeFixtureBacklog(root, 7);
    gitInRepo(root, ["add", "."]);
    gitInRepo(root, ["commit", "-m", "fixture base"], { stdio: "ignore" });

    const bounded = runCli(root, ["consolidation-report"]);
    const full = runCli(root, ["consolidation-report", "--full"]);
    assert.equal(bounded.status, 0, bounded.stdout + bounded.stderr);
    assert.equal(full.status, 0, full.stdout + full.stderr);

    assert.match(bounded.stdout, /R8; bounded/);
    assert.match(bounded.stdout, /open 7 件 \/ ref 1 件/);
    assert.match(bounded.stdout, /decision set: 5\/7 件/);
    assert.equal(decisionRows(bounded.stdout).length, 5);
    assert.match(full.stdout, /R8; full/);
    assert.match(full.stdout, /decision set: 7\/7 件 \(full\)/);
    assert.equal(decisionRows(full.stdout).length, 7);

    // Note merge candidates come from the live ledgers, so the pair count is not a
    // constant either: bounded shows at most 5 and states how many it withheld; --full
    // must show exactly those.
    const boundedPairs = sectionLines(bounded.stdout, "R8a ノート merge", "R8a 規則表面").length;
    const withheld = Number(bounded.stdout.match(/\.\.\.他 (\d+) 対/)?.[1] ?? 0);
    assert.ok(boundedPairs <= 5);
    assert.ok(withheld === 0 || boundedPairs === 5, "pairs are withheld only once the bound is reached");
    assert.equal(sectionLines(full.stdout, "R8a ノート merge", "R8a 規則表面").length, boundedPairs + withheld);
  });
});

test("HH-071: consolidation baseline stays read-only by default and writes only on explicit flag", () => {
  withTempDir((root) => {
    initGitRepo(root, "main");
    copyFrameworkFixture(root);
    gitInRepo(root, ["add", "."]);
    gitInRepo(root, ["commit", "-m", "fixture base"], { stdio: "ignore" });
    const knowledge = path.join(root, "core", "knowledge.yaml");
    const before = fs.readFileSync(knowledge, "utf8");
    // One more open row than the recorded baseline, whatever the live baseline is, so
    // the default run always has a delta it must NOT write.
    const baseline = Number(before.match(/^\s*last_backlog_open_count: (\d+)/m)?.[1]);
    assert.ok(Number.isInteger(baseline), "fixture ledger must carry last_backlog_open_count");
    writeFixtureBacklog(root, baseline + 1);

    const readOnly = runCli(root, ["consolidation-report"]);
    assert.equal(readOnly.status, 0, readOnly.stdout + readOnly.stderr);
    assert.match(readOnly.stdout, new RegExp(`baseline ${baseline} は未更新`));
    assert.equal(fs.readFileSync(knowledge, "utf8"), before);

    const written = runCli(root, ["consolidation-report", "--write-baseline"]);
    assert.equal(written.status, 0, written.stdout + written.stderr);
    assert.match(fs.readFileSync(knowledge, "utf8"), new RegExp(`^\\s*last_backlog_open_count: ${baseline + 1}\\b`, "m"));
  });
});
