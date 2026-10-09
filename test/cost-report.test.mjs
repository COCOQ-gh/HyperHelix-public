import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { buildCostInventory, measureReadHead } from "../tools/lib/cost-inventory.mjs";
import { loadKnowledge, setBaselineCounter } from "../tools/lib/knowledge.mjs";
import { copyFrameworkFixture, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

function writeFixtureFile(root, relative, text = "one\ntwo\n") {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, text, "utf8");
}

function minimalInventoryFixture(root) {
  for (const relative of ["constitution.md", "core/loop.yaml", "core/routing.yaml", "core/gates.yaml", "entrypoint.md"]) {
    writeFixtureFile(root, relative);
  }
  writeFixtureFile(root, ".claude/commands/skills/cycle.md");
  writeFixtureFile(root, "assets/checklists/a.md");
  writeFixtureFile(root, "assets/workflows/a.md");
  writeFixtureFile(root, "assets/ai/anti-patterns.md");
  writeFixtureFile(root, "tools/hyperhelix.mjs", 'import "./lib/a.mjs";\nimport "./lib/../lib/a.mjs";\nfunction main() {}\n');
  writeFixtureFile(root, "tools/lib/a.mjs", "export function helper() {}\n");
  writeFixtureFile(root, "tools/standalone.mjs", "export function separate() {}\n");
}

test("IMP-05: cycle mandatory inventory reacts to one added file and tooling imports deduplicate", () => {
  withTempDir((root) => {
    minimalInventoryFixture(root);
    const before = buildCostInventory(root);
    assert.equal(before.ok, true, before.errors.join("\n"));
    assert.equal(before.cycle.mode, "full-fallback");
    assert.equal(before.tooling.files.filter((entry) => entry.path === "tools/lib/a.mjs").length, 1);
    assert.deepEqual(before.tooling.excluded, [{
      path: "tools/standalone.mjs",
      reason: "not reachable from tools/hyperhelix.mjs (separate runtime/test helper)",
    }]);

    writeFixtureFile(root, "assets/checklists/positive.md", "a\nb\nc\n");
    const after = buildCostInventory(root);
    assert.equal(after.ok, true, after.errors.join("\n"));
    assert.equal(after.cycle.fileCount, before.cycle.fileCount + 1);
    assert.equal(after.cycle.lines, before.cycle.lines + 4);
    assert.match(after.cycle.files.find((entry) => entry.path.endsWith("positive.md")).reasons.join(" "), /all checklists/);
  });
});

test("IMP-05: missing mandatory files and broken local imports fail closed", () => {
  withTempDir((root) => {
    minimalInventoryFixture(root);
    fs.rmSync(path.join(root, "entrypoint.md"));
    fs.appendFileSync(path.join(root, "tools", "hyperhelix.mjs"), 'import "./lib/missing.mjs";\n');
    const result = buildCostInventory(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /missing required file: entrypoint\.md/);
    assert.match(result.errors.join("\n"), /missing required file: tools\/lib\/missing\.mjs/);
  });
});

test("HH-073: measureReadHead counts only the text before the boundary and fails closed without one", () => {
  const text = ["# title", "index row", "## 承認待ち(Pending)", "body ".repeat(500)].join("\n");
  const head = measureReadHead(text, "## 承認待ち(Pending)");
  assert.deepEqual(head, { ok: true, lines: 2, chars: "# title\nindex row".length });
  assert.deepEqual(
    measureReadHead("header: 1\ncounters: {}\nnotes:\n  - id: N-001", /^notes:/),
    { ok: true, lines: 2, chars: "header: 1\ncounters: {}".length },
  );
  // Positive detector fixture: a missing boundary must NOT fall back to the whole file or to 0-as-success.
  assert.equal(measureReadHead("no boundary here", "## 承認待ち(Pending)").ok, false);
});

test("HH-073: cost-report reports the character gauge and index-read heads; --write-baseline seeds both baselines", () => {
  withTempDir((root) => {
    initGitRepo(root, "main");
    copyFrameworkFixture(root);
    const always = ["constitution.md", "core/loop.yaml", "core/routing.yaml", "core/gates.yaml"];
    const chars = always.reduce((sum, file) => sum + fs.readFileSync(path.join(root, file), "utf8").length, 0);

    // The fixture copies the LIVE ledger, whose baselines hold whatever the last /cycle
    // wrote. Pin them to a sentinel so the assertions below do not depend on that state.
    for (const key of ["last_always_read_lines", "last_always_read_chars", "last_index_read_chars"]) {
      assert.equal(setBaselineCounter(root, key, 1).ok, true);
    }

    const plain = runCli(root, ["cost-report"]);
    assert.equal(plain.status, 0, plain.stdout + plain.stderr);
    assert.ok(plain.stdout.includes(`合計: ${chars} 文字 `), plain.stdout);
    assert.match(plain.stdout, /ラチェット判定量/);
    assert.match(plain.stdout, /amendments\.md: 冒頭 \d+ 行 \/ \d+ 文字/);
    assert.match(plain.stdout, /core\/knowledge\.yaml: 冒頭 \d+ 行 \/ \d+ 文字/);
    const total = Number(plain.stdout.match(/起動時の実読コスト[^:]*: (\d+) 文字/)[1]);
    assert.ok(total > chars, "the real startup cost includes the index-read heads");
    assert.equal(loadKnowledge(root).value.counters.last_always_read_chars, 1, "a plain run never writes the baseline");
    assert.equal(loadKnowledge(root).value.counters.last_index_read_chars, 1, "a plain run never writes the baseline");

    const written = runCli(root, ["cost-report", "--write-baseline"]);
    assert.equal(written.status, 0, written.stdout + written.stderr);
    const counters = loadKnowledge(root).value.counters;
    assert.equal(counters.last_always_read_chars, chars);
    assert.equal(typeof counters.last_always_read_lines, "number");
    // HH-082 A: the index-read baseline is written too. It lives inside the knowledge.yaml head it
    // measures, so the writer must settle on the value a later read reports (no phantom +1 trend).
    const after = runCli(root, ["cost-report"]).stdout;
    const indexChars = Number(after.match(/小計: (\d+) 文字/)[1]);
    assert.equal(counters.last_index_read_chars, indexChars);
    assert.ok(after.includes(`合計: ${chars} 文字 [前回比 ±0 →]`), after);
    assert.ok(after.includes(`小計: ${indexChars} 文字 [前回比 ±0 →]`), after);
    assert.ok(after.includes(`: ${chars + indexChars} 文字 [前回比 ±0 →]  (ラチェット判定量`), after);

    // Positive: growth in an index-read head moves the judged total (the HH-082 blind spot).
    const view = path.join(root, "amendments.md");
    fs.writeFileSync(view, fs.readFileSync(view, "utf8").replace(/^## 承認待ち\(Pending\)$/m, "追加の索引行 0123456789\n## 承認待ち(Pending)"));
    const grown = runCli(root, ["cost-report"]).stdout;
    assert.match(grown, /起動時の実読コスト.*\[前回比 \+\d+ ▲\]/);
  });
});

test("HH-073: cost-report fails closed when an index-read boundary is missing", () => {
  withTempDir((root) => {
    initGitRepo(root, "main");
    copyFrameworkFixture(root);
    const view = path.join(root, "amendments.md");
    // Rewrite the heading LINE (the phrase also occurs in prose above it).
    fs.writeFileSync(view, fs.readFileSync(view, "utf8").replace(/^## 承認待ち\(Pending\)$/m, "## 承認待ち"));
    const result = runCli(root, ["cost-report"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /index-read boundary not found/);
    // Fail closed BEFORE any write: --write-baseline must leave the ledger untouched too.
    const ledger = path.join(root, "core", "knowledge.yaml");
    const before = fs.readFileSync(ledger, "utf8");
    assert.notEqual(runCli(root, ["cost-report", "--write-baseline"]).status, 0);
    assert.equal(fs.readFileSync(ledger, "utf8"), before);
  });
});
