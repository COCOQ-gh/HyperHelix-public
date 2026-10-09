// SC-06 (HH-067): domain epoch state machine + migrate-canon closure tests.
// SC-RT-11: legacy read allowed in dual-read states, legacy/new writes gated by
// the declared epoch, unknown/future/missing epoch fail-closed.
// SC-RT-12: total === converted + rejected and equivalent === converted (100%)
// on the real repo; a NEW-epoch brief without a record is rejected + legacy-live.
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  EPOCH_CONTRACT,
  EPOCH_DOMAINS,
  domainEpoch,
  epochAllowsLegacyRead,
  epochAllowsLegacyWrite,
  epochAllowsNewWrite,
  assertNewWriteAllowed,
} from "../tools/lib/contracts.mjs";
import {
  advanceEpoch,
  applyMigrationRepairs,
  migrateCanon,
} from "../tools/lib/migration.mjs";
import { commitKnowledgeWrites } from "../tools/lib/knowledge.mjs";
import { writeAmendmentsView } from "../tools/lib/governance.mjs";
import { withTempDir } from "./helpers/repo-fixture.mjs";

const root = path.dirname(fileURLToPath(new URL("../entrypoint.md", import.meta.url)));

test("SC-RT-11: the epoch contract declares a known state for every domain", () => {
  assert.deepEqual([...EPOCH_DOMAINS].sort(), ["governance", "knowledge"]);
  for (const domain of EPOCH_DOMAINS) {
    const epoch = domainEpoch(domain);
    assert.ok(EPOCH_CONTRACT.states.includes(epoch.state));
  }
});

test("SC-RT-11: unknown domain, missing epoch, and future/unknown state are fail-closed", () => {
  assert.throws(() => domainEpoch("nonexistent-domain"), /declares no epoch/);
  assert.throws(() => domainEpoch("sample", { epochs: {} }), /declares no epoch/);
  assert.throws(() => domainEpoch("sample", { epochs: { sample: "epoch-99-from-the-future" } }), /unknown\/future state/);
  assert.throws(() => domainEpoch("sample", { epochs: { sample: 7 } }), /declares no epoch/);
});

test("SC-RT-11: state-machine boundaries (legacy read / legacy write / new write)", () => {
  const at = (state) => ({ epochs: { sample: state } });
  // legacy read: allowed through semantic-parity-confirmed, gone after cutover
  assert.equal(epochAllowsLegacyRead("sample", at("legacy-read-write")), true);
  assert.equal(epochAllowsLegacyRead("sample", at("dual-read-new-write")), true);
  assert.equal(epochAllowsLegacyRead("sample", at("semantic-parity-confirmed")), true);
  assert.equal(epochAllowsLegacyRead("sample", at("new-read-write")), false);
  assert.equal(epochAllowsLegacyRead("sample", at("legacy-adapter-removed")), false);
  // legacy write: rejected from dual-read-new-write on (single-write, no dual-write)
  assert.equal(epochAllowsLegacyWrite("sample", at("dual-read-legacy-write")), true);
  assert.equal(epochAllowsLegacyWrite("sample", at("dual-read-new-write")), false);
  // new-canon write: starts at dual-read-new-write
  assert.equal(epochAllowsNewWrite("sample", at("dual-read-legacy-write")), false);
  assert.equal(epochAllowsNewWrite("sample", at("dual-read-new-write")), true);
  assert.throws(() => assertNewWriteAllowed("sample", at("legacy-read-write")), /not enabled yet/);
  assert.equal(assertNewWriteAllowed("sample", at("legacy-adapter-removed")).state, "legacy-adapter-removed");
});

test("SC-RT-11: repository write layers refuse structured writes in a legacy epoch", () => {
  withTempDir((dir) => {
    const committed = commitKnowledgeWrites(dir, [{ relative: "core/knowledge.yaml", text: "x" }], {
      epochs: { knowledge: "legacy-read-write" },
    });
    assert.equal(committed.ok, false);
    assert.match(committed.errors.join(" "), /not enabled yet/);

    const written = writeAmendmentsView(dir, { epochs: { governance: "dual-read-legacy-write" } });
    assert.equal(written.ok, false);
    assert.match(written.errors.join(" "), /not enabled yet/);

  });
});

test("SC-RT-12: the real repo migrates green (rejected=0, legacy-live=0, equivalence 100%)", () => {
  const outcome = migrateCanon(root);
  assert.equal(outcome.ok, true, JSON.stringify(outcome.results.map((r) => ({ domain: r.domain, counts: r.counts, issues: r.issues })), null, 2));
  for (const result of outcome.results) {
    const c = result.counts;
    assert.equal(c.total, c.converted + c.rejected, `${result.domain}: total = converted + rejected`);
    assert.equal(c.equivalent, c.converted, `${result.domain}: equivalence must be 100%`);
    assert.equal(c.rejected, 0);
    assert.equal(c.legacyLive, 0);
  }
  const byDomain = Object.fromEntries(outcome.results.map((r) => [r.domain, r.counts]));
  // HH-081: the task record lives in the commit body; a tasks/ record file on main
  // is a regression (stage 3 archived them all and reflux strips tasks/).
  const recordsDir = path.join(root, "tasks", "records");
  const liveRecords = fs.existsSync(recordsDir) ? fs.readdirSync(recordsDir).filter((name) => name.endsWith(".yaml")) : [];
  assert.deepEqual(liveRecords, [], "no tasks/records/*.yaml on main");
  const liveBriefs = fs.readdirSync(path.join(root, "tasks")).filter((name) => /^TASK-[A-Za-z0-9]+-\d{8}-\d{3}\.md$/.test(name));
  assert.deepEqual(liveBriefs, [], "no tasks/TASK-*.md briefs on main");
  assert.ok(byDomain.governance.total >= 68);
  assert.ok(byDomain.knowledge.total >= 87);
});

test("advanceEpoch: forward-only, single-occurrence, atomic, layout-preserving", () => {
  withTempDir((dir) => {
    fs.mkdirSync(path.join(dir, "core"), { recursive: true });
    const text = [
      "{",
      '  "structures": {',
      '    "epochs": {',
      '      "domains": {',
      '        "governance": "dual-read-new-write"',
      "      }",
      "    }",
      "  }",
      "}",
      "",
    ].join("\n");
    fs.writeFileSync(path.join(dir, "core", "contracts.json"), text, "utf8");

    const unknown = advanceEpoch(dir, "governance", "epoch-99");
    assert.equal(unknown.ok, false);
    assert.match(unknown.errors.join(" "), /unknown target state/);

    const backward = advanceEpoch(dir, "governance", "legacy-read-write");
    assert.equal(backward.ok, false);
    assert.match(backward.errors.join(" "), /must move forward/);

    const advanced = advanceEpoch(dir, "governance", "semantic-parity-confirmed");
    assert.equal(advanced.ok, true, (advanced.errors ?? []).join("; "));
    assert.equal(advanced.from, "dual-read-new-write");
    const nextText = fs.readFileSync(path.join(dir, "core", "contracts.json"), "utf8");
    assert.equal(nextText, text.replace('"governance": "dual-read-new-write"', '"governance": "semantic-parity-confirmed"'));

    // idempotent re-run refuses (already at the target = not forward)
    const again = advanceEpoch(dir, "governance", "semantic-parity-confirmed");
    assert.equal(again.ok, false);
    assert.match(again.errors.join(" "), /must move forward/);
  });
});
