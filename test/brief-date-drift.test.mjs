// TASK-main-20260821-001: positive fixtures (HH-028) for the brief --date freshness warning.
// Origin: a session spanning 2026-07-28 → 08-11 → 08-21 kept passing --date 20260728, so
// five task ids and one governance attestation carried the wrong date. Task ids are
// permanent (HH-065), so the only affordable fix is catching it at creation time.
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { BRIEF_DATE_DRIFT_TOLERANCE_DAYS, briefDateDriftDays, todayStamp } from "../tools/hyperhelix.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "tools/hyperhelix.mjs");
const NOW = new Date(2026, 7, 21); // 2026-08-21, local time (stamps are local-calendar dates)

test("todayStamp renders a zero-padded local YYYYMMDD", () => {
  assert.equal(todayStamp(NOW), "20260821");
  assert.equal(todayStamp(new Date(2026, 0, 5)), "20260105");
});

test("briefDateDriftDays measures whole days, positive when the stamp is stale", () => {
  assert.equal(briefDateDriftDays("20260821", NOW), 0);
  assert.equal(briefDateDriftDays("20260820", NOW), 1);
  assert.equal(briefDateDriftDays("20260728", NOW), 24); // the real drift that caused this task
  assert.equal(briefDateDriftDays("20260823", NOW), -2); // future stamps drift too
});

test("briefDateDriftDays returns null for shapes the caller already rejects", () => {
  for (const bad of ["", null, undefined, "2026-08-21", "202608", "not-a-date"]) {
    assert.equal(briefDateDriftDays(bad, NOW), null, String(bad));
  }
});

test("the tolerance keeps same-day and yesterday quiet but flags a multi-day session", () => {
  assert.equal(BRIEF_DATE_DRIFT_TOLERANCE_DAYS, 2);
  assert.ok(Math.abs(briefDateDriftDays("20260820", NOW)) < BRIEF_DATE_DRIFT_TOLERANCE_DAYS);
  assert.ok(Math.abs(briefDateDriftDays("20260819", NOW)) >= BRIEF_DATE_DRIFT_TOLERANCE_DAYS);
});

// `brief` claims a task id inside the current branch namespace, so it exits 1 on a
// detached HEAD — which is exactly how CI checks out (actions/checkout). The CLI-level
// assertions below therefore only run on a named branch; the drift LOGIC above is
// environment-independent and carries the coverage everywhere.
const headName = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: ROOT, encoding: "utf8" });
const detached = headName.status !== 0 || headName.stdout.trim() === "HEAD";

test("brief warns on a stale --date and stays silent on today (--dry-run: no artifact written)", {
  skip: detached ? "detached HEAD (CI checkout): brief cannot claim a task namespace" : false,
}, () => {
  // The warning goes to stderr, so spawnSync (not execFileSync) is what can observe it.
  const run = (date) => spawnSync(process.execPath, [CLI, "brief", "--date", date, "--dry-run"], {
    cwd: ROOT, encoding: "utf8",
  });

  const stale = run("20200101");
  assert.equal(stale.status, 0, "a stale date warns, it never blocks");
  assert.match(stale.stderr, /WARNING --date 20200101 is \d+ day\(s\) behind today/);
  assert.match(stale.stderr, /cannot be renamed/);
  assert.match(stale.stdout, /\[dry-run\]/); // still reports the would-be artifact

  const fresh = run(todayStamp());
  assert.equal(fresh.status, 0);
  assert.doesNotMatch(fresh.stderr, /WARNING --date/);
});
