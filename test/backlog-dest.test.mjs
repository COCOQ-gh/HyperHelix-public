import test from "node:test";
import assert from "node:assert/strict";

import { countOpenBacklogItems, selectOpenBacklogItems } from "../tools/lib/consolidation-report.mjs";

// R8c destination marker (2026-08-24 /cycle, ordinal 5). A project branch's backlog
// carries rows whose remediation lives on `main`; they can never be burned HERE, yet
// the ratchet counted them as accretion and R8d tallied their class. Measured on
// project/Project001: 5 of 22 open rows were explicitly main-destined, and one whole
// class (enforcement-gap) was 100% unburnable here while still firing the gauges.

const OPEN = "## 未決・繰延(open)";
const CLOSED = "## 完了・棄却(closed)";

function backlog(rows) {
  return [OPEN, ...rows, CLOSED, "- history pointer"].join("\n");
}

test("dest:main rows are excluded from the burnable-here count but stay in the open total", () => {
  const text = backlog([
    "- [high] [class:measurement-gap] tool-side gauge / **dest:main**",
    "- [med] [class:drift] doc drift here",
    "- [low] [class:duplication] main-owned note / **dest:main**",
  ]);
  const result = countOpenBacklogItems(text);
  assert.equal(result.ok, true);
  assert.equal(result.count, 3, "global open total keeps every row");
  assert.equal(result.mainDestinedCount, 2);
  assert.equal(result.burnableHereCount, 1);
});

test("an unmarked row defaults to burnable here (exemption must be explicit)", () => {
  const text = backlog([
    "- [med] [class:plumbing] no marker at all",
    "- [med] [class:plumbing] explicitly dest:here",
  ]);
  const result = countOpenBacklogItems(text);
  assert.equal(result.mainDestinedCount, 0);
  assert.equal(result.burnableHereCount, 2);
});

test("selectOpenBacklogItems attaches the destination to each decision row", () => {
  const text = backlog([
    "- [high] [class:enforcement-gap] reflux heuristic / **dest:main**",
    "- [high] [class:bloat] local cleanup",
  ]);
  const selected = selectOpenBacklogItems(text, { full: true });
  assert.equal(selected.ok, true);
  const dests = selected.items.map((item) => item.dest);
  assert.deepEqual(dests.sort(), ["main", null].sort());
});

test("the marker never changes the backlog contract checks", () => {
  const broken = [OPEN, "- [high] [class:drift] fine / **dest:main**", CLOSED].join("\n");
  assert.equal(countOpenBacklogItems(broken).ok, true);
  const stray = ["- [high] [class:drift] above the heading / **dest:main**", OPEN, CLOSED].join("\n");
  const result = countOpenBacklogItems(stray);
  assert.equal(result.ok, false, "a stray row above the heading is still a contract violation");
});

// 2026-10-02 /cycle ordinal 18: on main and its hyperhelix/* PR branches main owns
// dest:main rows, so they are burnable there; off main, burnable rows sort first.
test("main-lineage branches count dest:main rows as burnable; project branches select burnable rows first", () => {
  const text = backlog([
    "- [high] [class:measurement-gap] tool gauge / **dest:main**",
    "- [high] [class:drift] fixable here",
    "- [med] [class:bloat] also here",
  ]);
  assert.equal(countOpenBacklogItems(text, { mainLineage: true }).burnableHereCount, 3);
  assert.equal(countOpenBacklogItems(text).burnableHereCount, 2);
  const project = selectOpenBacklogItems(text, { limit: 2 });
  assert.deepEqual(project.items.map((item) => item.dest), [null, null], "project branch: burnable rows fill the set first");
  const main = selectOpenBacklogItems(text, { limit: 2, mainLineage: true });
  assert.equal(main.items[0].dest, "main", "main lineage: plain priority order");
});
