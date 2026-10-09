import test from "node:test";
import assert from "node:assert/strict";

import { countOpenBacklogItems, selectOpenBacklogItems } from "../tools/lib/consolidation-report.mjs";

const OPEN = "## 未決・繰延(open)";
const CLOSED = "## 完了・棄却(closed)";

test("R8c counts only active burn-down rows inside the open section", () => {
  const result = countOpenBacklogItems([
    "# Backlog",
    "intro prose and standing practices live here",
    OPEN,
    "- [high] first",
    "- [med] second",
    "- [ref] reference-only",
    CLOSED,
    "- [low] historical-pointer",
  ].join("\n"));

  // exact shape on purpose: a silently added/removed field must fail here.
  // burnableHere/mainDestined were added by the R8c dest marker (2026-08-24 /cycle);
  // mainLineage by the main-lineage burnability fix (2026-10-02 /cycle ordinal 18).
  assert.deepEqual(result, { ok: true, count: 2, mainDestinedCount: 0, burnableHereCount: 2, mainLineage: false, referenceCount: 1 });
});

test("R8c rejects a priority row above the open heading (silently-uncounted row)", () => {
  // TASK-main-20260728-010: an Project001 [high] row placed above the standing-practices
  // heading was never counted and never selected for burn-down — invisible, not just misplaced.
  const result = countOpenBacklogItems([
    "# Backlog",
    "- [high] stray-above-open",
    OPEN,
    "- [med] counted",
    CLOSED,
  ].join("\n"));

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /1 priority row\(s\) sit ABOVE/);
  // Rows below the closed heading remain legitimate history pointers.
  const withHistory = countOpenBacklogItems([OPEN, "- [med] counted", CLOSED, "- [low] pointer"].join("\n"));
  assert.equal(withHistory.ok, true);
});

test("R8c rejects malformed boundaries and completed rows left in open", () => {
  const cases = [
    ["missing closed", `${OPEN}\n- [high] item`, /closed.*found 0/],
    ["reversed", `${CLOSED}\n${OPEN}`, /open heading must precede closed/],
    ["duplicate open", `${OPEN}\n${OPEN}\n${CLOSED}`, /open.*found 2/],
    ["completed in open", `${OPEN}\n- ~~[low] done~~\n${CLOSED}`, /completed row/],
  ];

  for (const [name, input, expected] of cases) {
    const result = countOpenBacklogItems(input);
    assert.equal(result.ok, false, name);
    assert.match(result.errors.join("\n"), expected, name);
  }
});

test("HH-071: bounded backlog selection prioritizes high/med then oldest and full preserves all", () => {
  const input = [
    OPEN,
    "- [low] [class:x] low 2024-01-01",
    "- [med] [class:x] newer 2026-07-01",
    "- [high] [class:x] high 2026-07-18",
    "- [med] [class:x] oldest 2025-01-01",
    "- [low] [class:x] other",
    "- [med] [class:x] third 2026-01-01",
    CLOSED,
  ].join("\n");
  const bounded = selectOpenBacklogItems(input, { limit: 5 });
  assert.equal(bounded.ok, true);
  assert.equal(bounded.total, 6);
  assert.equal(bounded.items.length, 5);
  assert.match(bounded.items[0].text, /\[high\]/);
  assert.match(bounded.items[1].text, /oldest/);
  assert.equal(selectOpenBacklogItems(input, { full: true }).items.length, 6);
});
