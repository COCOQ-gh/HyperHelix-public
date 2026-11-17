import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { copyFrameworkFixture, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

// LEDGER_ID_UNIQUE exists because a line-oriented merge can duplicate an id with NO
// conflict marker and a clean `git status` (measured 2026-08-23: merging origin/main
// produced 23 anti-pattern rows with four ids twice). Readers that key by id — the
// archive index builds a Map — collapse the duplicate instead of reporting it, so
// counting the ids is the only signal. These fixtures reproduce that shape.

function fixture(callback) {
  return withTempDir((dir) => {
    copyFrameworkFixture(dir);
    initGitRepo(dir);
    return callback(dir);
  });
}

function duplicateRow(file, matcher) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const index = lines.findIndex(matcher);
  assert.ok(index >= 0, `no row matched in ${file}`);
  lines.splice(index + 1, 0, lines[index]);
  fs.writeFileSync(file, lines.join("\n"));
  return lines[index];
}

test("LEDGER_ID_UNIQUE fires on a duplicated anti-pattern id", () => {
  fixture((dir) => {
    const file = path.join(dir, "assets/ai/anti-patterns.md");
    const row = duplicateRow(file, (line) => /^\|\s*AP-\d{3}\s*\|/.test(line));
    const id = row.match(/AP-\d{3}/)[0];

    const result = runCli(dir, ["validate"]);
    assert.match(result.stdout + result.stderr, /LEDGER_ID_UNIQUE/);
    assert.match(result.stdout + result.stderr, new RegExp(`${id}' appears 2 times`));
    assert.notEqual(result.status, 0, "a duplicated id must fail closed");
  });
});

test("LEDGER_ID_UNIQUE fires on a duplicated archived task id", () => {
  fixture((dir) => {
    const file = path.join(dir, "tasks/INDEX.md");
    if (!fs.existsSync(file)) return; // fixture without an archive index: nothing to assert
    duplicateRow(file, (line) => /^\|\s*TASK-[A-Za-z0-9-]+\s*\|/.test(line));

    const result = runCli(dir, ["validate"]);
    assert.match(result.stdout + result.stderr, /LEDGER_ID_UNIQUE/);
  });
});

test("LEDGER_ID_UNIQUE stays silent on the unmodified ledgers", () => {
  fixture((dir) => {
    const result = runCli(dir, ["validate"]);
    assert.doesNotMatch(result.stdout + result.stderr, /LEDGER_ID_UNIQUE/);
  });
});
