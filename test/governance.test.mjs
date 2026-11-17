// SC-04 (HH-067): governance repository tests — SC-RT-07 (heading/view changes
// never affect lifecycle state) and SC-RT-08 (status/attestation/supersedes
// inconsistencies are rejected), plus render/drift round-trip and the allocator max.
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { GOVERNANCE_CONTRACT } from "../tools/lib/contracts.mjs";
import {
  amendmentsViewDrift,
  loadGovernanceRegistry,
  maxHhSerial,
  parseGovernanceRegistryText,
  renderAmendmentsView,
  templateSanityErrors,
  writeAmendmentsView,
} from "../tools/lib/governance.mjs";
import { withTempDir } from "./helpers/repo-fixture.mjs";

const TEMPLATE = [
  "# amendments.md — test view",
  "",
  "{{INDEX_TABLE}}",
  "",
  "## 承認待ち(Pending)",
  "",
  "{{PENDING_BODIES}}",
  "",
  "## 承認済みログ(新しい裁可が上、創設 HH-000 が末尾)",
  "",
  "{{APPROVED_BODIES}}",
  "",
].join("\n");

function registryYaml(entries) {
  const lines = ["schema_version: 1", "entries:"];
  for (const e of entries) {
    lines.push(`  - id: ${e.id}`);
    lines.push(`    title: ${JSON.stringify(e.title ?? "t")}`);
    lines.push(`    type: ${JSON.stringify(e.type ?? "統治変更")}`);
    lines.push(`    status: ${e.status ?? "Approved"}`);
    if (e.status_label) lines.push(`    status_label: ${JSON.stringify(e.status_label)}`);
    lines.push(`    ratified_by: ${e.ratified_by === undefined ? "COCOQ-gh" : JSON.stringify(e.ratified_by)}`);
    lines.push(`    ratified_at: ${e.ratified_at === undefined ? '"2026-07-17"' : JSON.stringify(e.ratified_at)}`);
    lines.push(`    supersedes: [${(e.supersedes ?? []).join(", ")}]`);
    lines.push(`    body: bodies/${e.id}.md`);
  }
  return `${lines.join("\n")}\n`;
}

function writeCanon(dir, entries, { template = TEMPLATE, bodies = true } = {}) {
  const gov = path.join(dir, path.dirname(GOVERNANCE_CONTRACT.registry));
  fs.rmSync(path.join(dir, GOVERNANCE_CONTRACT.bodiesDir), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, GOVERNANCE_CONTRACT.bodiesDir), { recursive: true });
  fs.writeFileSync(path.join(dir, GOVERNANCE_CONTRACT.registry), registryYaml(entries), "utf8");
  fs.writeFileSync(path.join(dir, GOVERNANCE_CONTRACT.viewTemplate), template, "utf8");
  if (bodies) {
    for (const e of entries) {
      fs.writeFileSync(path.join(dir, GOVERNANCE_CONTRACT.bodiesDir, `${e.id}.md`), `## ${e.id} — ${e.title ?? "t"}\n\nbody of ${e.id}\n`, "utf8");
    }
  }
  return gov;
}

test("governance round-trip: render is deterministic and the written view has no drift", () => {
  withTempDir((dir) => {
    writeCanon(dir, [
      { id: "HH-000", title: "founding" },
      { id: "HH-001", title: "pending one", status: "Pending", ratified_by: null, ratified_at: null },
      { id: "HH-002", title: "supersedes 000", supersedes: ["HH-000"] },
    ]);
    const first = renderAmendmentsView(dir);
    assert.equal(first.ok, true, (first.errors ?? []).join("; "));
    const second = renderAmendmentsView(dir);
    assert.equal(first.text, second.text);
    // index ascending, log descending (HH-000 last), pending only under Pending
    const indexPos = [0, 1, 2].map((n) => first.text.indexOf(`| HH-00${n} |`));
    assert.ok(indexPos[0] < indexPos[1] && indexPos[1] < indexPos[2]);
    const approvedIdx = first.text.indexOf("## 承認済みログ");
    assert.ok(first.text.indexOf("body of HH-001") < approvedIdx, "pending body stays in the Pending section");
    assert.ok(first.text.indexOf("body of HH-002", approvedIdx) < first.text.indexOf("body of HH-000", approvedIdx));
    const written = writeAmendmentsView(dir);
    assert.equal(written.ok, true);
    assert.equal(amendmentsViewDrift(dir).drifted, false);
  });
});

test("SC-RT-07: editing view headings/status text changes drift only, never lifecycle state", () => {
  withTempDir((dir) => {
    writeCanon(dir, [{ id: "HH-000", title: "founding" }]);
    assert.equal(writeAmendmentsView(dir).ok, true);
    const before = loadGovernanceRegistry(dir);
    assert.equal(before.ok, true);
    // hand-edit the generated view: retitle a heading and flip a Status word
    const viewPath = path.join(dir, GOVERNANCE_CONTRACT.view);
    fs.writeFileSync(viewPath, fs.readFileSync(viewPath, "utf8")
      .replace("## 承認待ち(Pending)", "## 承認待ち(Pending・改変)")
      .replace("Approved", "Pending"), "utf8");
    const after = loadGovernanceRegistry(dir);
    assert.equal(after.ok, true);
    assert.deepEqual(after.value, before.value, "registry state is independent of the view text");
    const drift = amendmentsViewDrift(dir);
    assert.equal(drift.drifted, true);
    assert.match(drift.errors.join(" "), /drifts from governance/);
  });
});

test("SC-RT-08: status/attestation/supersedes inconsistencies are rejected", () => {
  withTempDir((dir) => {
    // Pending entry carrying attestation -> error
    writeCanon(dir, [{ id: "HH-001", status: "Pending", ratified_by: "COCOQ-gh", ratified_at: "2026-07-17" }]);
    let loaded = loadGovernanceRegistry(dir);
    assert.equal(loaded.ok, false);
    assert.match(loaded.errors.join(" "), /status\/attestation inconsistency/);

    // supersedes unknown target -> error; self-supersede -> error
    writeCanon(dir, [
      { id: "HH-001", supersedes: ["HH-900"] },
      { id: "HH-002", supersedes: ["HH-002"] },
    ]);
    loaded = loadGovernanceRegistry(dir);
    assert.equal(loaded.ok, false);
    assert.match(loaded.errors.join(" "), /supersedes unknown entry 'HH-900'/);
    assert.match(loaded.errors.join(" "), /cannot supersede itself/);

    // duplicate id -> error
    writeCanon(dir, [{ id: "HH-001" }, { id: "HH-001" }]);
    loaded = loadGovernanceRegistry(dir);
    assert.equal(loaded.ok, false);
    assert.match(loaded.errors.join(" "), /duplicate entry id/);

    // Approved without attestation -> warning (HH-046 attestation completeness), not error
    writeCanon(dir, [{ id: "HH-003", ratified_by: null, ratified_at: null }]);
    loaded = loadGovernanceRegistry(dir);
    assert.equal(loaded.ok, true);
    assert.match(loaded.warnings.join(" "), /HH-003 is Approved but ratified_by/);

    // missing body file -> error; orphan body file -> error
    writeCanon(dir, [{ id: "HH-004" }], { bodies: false });
    fs.writeFileSync(path.join(dir, GOVERNANCE_CONTRACT.bodiesDir, "HH-777.md"), "orphan\n", "utf8");
    loaded = loadGovernanceRegistry(dir);
    assert.equal(loaded.ok, false);
    assert.match(loaded.errors.join(" "), /HH-004 body file .* is missing/);
    assert.match(loaded.errors.join(" "), /HH-777\.md: body file has no registry entry/);
  });
});

test("SC-RT-08 schema: unknown status, coerced types, and unknown fields are rejected", () => {
  const base = { id: "HH-001", title: "t", type: "統治変更", status: "Approved", ratified_by: "x", ratified_at: "2026-07-17", supersedes: [], body: "bodies/HH-001.md" };
  // build via JSON-in-YAML (valid YAML) to keep exact types explicit
  const doc = (entry, version = 1) => `schema_version: ${JSON.stringify(version)}\nentries:\n  - ${JSON.stringify(entry)}\n`;
  assert.equal(parseGovernanceRegistryText(doc(base)).ok, true);
  assert.equal(parseGovernanceRegistryText(doc({ ...base, status: "Ratified" })).ok, false, "unknown status enum");
  assert.equal(parseGovernanceRegistryText(doc({ ...base, extra: 1 })).ok, false, "unknown field");
  assert.equal(parseGovernanceRegistryText(doc({ ...base, ratified_at: "2026/07/17" })).ok, false, "date format");
  assert.equal(parseGovernanceRegistryText(doc(base, "1")).ok, false, "schema_version string '1' is not coerced");
  assert.equal(parseGovernanceRegistryText(doc(base, 2)).ok, false, "future schema_version is fail-closed");
});

test("template sanity is fail-closed and the allocator max reads the registry", () => {
  assert.deepEqual(templateSanityErrors(TEMPLATE), []);
  assert.ok(templateSanityErrors(TEMPLATE.replace("{{INDEX_TABLE}}", "")).length > 0);
  assert.ok(templateSanityErrors(`${TEMPLATE}\n{{PENDING_BODIES}}`).length > 0, "duplicate placeholder");
  assert.ok(templateSanityErrors(TEMPLATE.replace("## 承認待ち(Pending)", "## waiting")).length > 0, "missing pending heading");
  assert.equal(maxHhSerial([{ id: "HH-000" }, { id: "HH-067" }, { id: "HH-012" }]), 67);
});
