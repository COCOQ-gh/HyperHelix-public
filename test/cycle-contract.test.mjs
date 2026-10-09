import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
}

test("HH-071: full review triggers exclude ordinary framework changes while local R1-R3 remains", () => {
  const triggers = read("core/loop.yaml") + read("assets/checklists/framework-review.md");
  assert.doesNotMatch(triggers, /after-framework-material-change|after framework-material change/);
  assert.match(triggers, /every-5-tasks/);
  assert.match(triggers, /judgment-hesitation/);
  assert.match(triggers, /same-problem-twice/);
  assert.match(read("assets/checklists/evaluate.md"), /framework-review R1-R3 consistency HERE at V1/);
});

test("HH-071: cycle launcher uses delta/full read sets and serializes canonical writers", () => {
  const launcher = read(".claude/commands/skills/cycle.md");
  const cost = launcher.indexOf("cost-report --write-baseline");
  const consolidation = launcher.indexOf("consolidation-report --write-baseline");
  assert.ok(cost >= 0 && consolidation > cost);
  assert.match(launcher, /完了を待つ/);
  assert.match(launcher, /並列dispatchしてはならない/);
  assert.match(launcher, /delta基準不能.*full fallback/);
  assert.match(launcher, /note最大5 \+ backlog最大5/);
  // 2026-08-23: cadence は framework-review.md を単一権威とし launcher では再記述しない(TASK-Project001-20260823-024)。
  // 検査の目的は不変 — launcher が full sweep の発火根拠について**沈黙しない**こと。
  assert.match(launcher, /framework-review.md` を単一権威とする/);
  assert.doesNotMatch(launcher, /5-task cadence/); // 再記述の再発(二重定義)を防ぐ
});
