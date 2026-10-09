// SC-07 (HH-067): architecture-gate tests. Every detector ships a POSITIVE
// fixture (SC-RT-13 direct canon access, SC-RT-14 state-extraction reader) and
// negative fixtures (repository's own domain, annotated crossings, exempt/legacy
// adapter files). The real repo must scan clean.
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { scanSourceLines, validateArchitecture } from "../tools/lib/architecture.mjs";

const root = path.dirname(fileURLToPath(new URL("../entrypoint.md", import.meta.url)));
const consumer = { file: "tools/some-tool.mjs" };

test("SC-RT-13: direct canonical access outside the repository is a positive detection", () => {
  const byLiteral = scanSourceLines('const t = fs.readFileSync(path.join(root, "core/knowledge.yaml"), "utf8");', consumer);
  assert.equal(byLiteral.length, 1);
  assert.match(byLiteral[0], /knowledge-canon access/);

  const byAccessor = scanSourceLines("const t = readFile(GOVERNANCE_CONTRACT.registry);", consumer);
  assert.equal(byAccessor.length, 1);
  assert.match(byAccessor[0], /governance-canon access/);

  const byGitShow = scanSourceLines('git(["show", `origin/main:${KNOWLEDGE_CONTRACT.mainLedger}`]);', consumer);
  assert.equal(byGitShow.length, 1);

  const write = scanSourceLines('fs.writeFileSync(path.join(root, "governance/amendments/registry.yaml"), text);', consumer);
  assert.equal(write.length, 1);
  assert.match(write[0], /governance-canon access/);
});

test("SC-RT-13: a repository touching its OWN domain is clean; another domain is not", () => {
  const own = scanSourceLines(
    "const text = fs.readFileSync(path.join(root, KNOWLEDGE_CONTRACT.mainLedger), \"utf8\");",
    { file: "tools/lib/knowledge.mjs" },
  );
  assert.deepEqual(own, []);
  const cross = scanSourceLines(
    "const text = fs.readFileSync(path.join(root, GOVERNANCE_CONTRACT.registry), \"utf8\");",
    { file: "tools/lib/knowledge.mjs" },
  );
  assert.equal(cross.length, 1);
});

test("SC-RT-13: HH:ARCH-ALLOW requires a reason and then suppresses the finding", () => {
  const annotated = scanSourceLines(
    ['// HH:ARCH-ALLOW reason="read-only metrics"', 'const t = readFile(KNOWLEDGE);'].join("\n"),
    consumer,
  );
  assert.deepEqual(annotated, []);
  const inline = scanSourceLines('const t = readFile(KNOWLEDGE); // HH:ARCH-ALLOW reason="read-only metrics"', consumer);
  assert.deepEqual(inline, []);
  const reasonless = scanSourceLines(['// HH:ARCH-ALLOW', 'const t = readFile(KNOWLEDGE);'].join("\n"), consumer);
  assert.equal(reasonless.length, 1);
  assert.match(reasonless[0], /needs a reason/);
});

test("SC-RT-14: state-extraction readers outside the legacy adapter are positive detections", () => {
  for (const source of [
    "const tables = parseMarkdownTables(text);",
    "const cells = splitMarkdownRow(line);",
    "function parseNotes(text) {",
    "function loadAllNotes() {",
  ]) {
    const found = scanSourceLines(source, consumer);
    assert.equal(found.length, 1, source);
    assert.match(found[0], /state-extraction reader/);
  }
});

test("SC-RT-14: no legacy adapter remains (HH-081); annotated call sites are clean", () => {
  assert.equal(
    scanSourceLines("const tables = parseMarkdownTables(text);", { file: "tools/lib/framework-evidence.mjs" }).length,
    1,
    "framework-evidence.mjs is no longer an adapter",
  );
  assert.deepEqual(
    scanSourceLines(
      ['// HH:ARCH-ALLOW reason="tool-owned index file"', 'for (const t of parseMarkdownTables(text)) {}'].join("\n"),
      consumer,
    ),
    [],
  );
});

test("SC-07: the real repo scans clean (annotated crossings only)", () => {
  assert.deepEqual(validateArchitecture(root), []);
});
