// HH-064 (裁定 2026-07-18): permanent note ids never change. The continuity
// guard warns when an id published on origin/main is missing locally (rename /
// silent hard-delete detection). Warn level: a ratified correction awaiting
// push is a legitimate interim.
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { withTempDir, copyFrameworkFixture, initGitRepo, gitInRepo, runCli } from "./helpers/repo-fixture.mjs";

test("HH-064: a note id published on origin/main cannot vanish locally (warn)", () => {
  withTempDir((dir) => {
    copyFrameworkFixture(dir);
    initGitRepo(dir);
    gitInRepo(dir, ["add", "-A"]);
    gitInRepo(dir, ["commit", "-q", "-m", "seed"]);
    gitInRepo(dir, ["update-ref", "refs/remotes/origin/main", "HEAD"]);

    // in sync with origin/main: no continuity warning
    const clean = runCli(dir, ["validate"]);
    assert.doesNotMatch(clean.stdout + clean.stderr, /NOTE_ID_CONTINUITY/);

    // rename a published permanent id -> the guard flags the vanished id
    const ledgerPath = path.join(dir, "core", "knowledge.yaml");
    const text = fs.readFileSync(ledgerPath, "utf8");
    assert.ok(text.includes("id: N-Project007-20260717a"), "fixture carries the restored id");
    fs.writeFileSync(ledgerPath, text.replace("id: N-Project007-20260717a", "id: N-Project007-20260718zz"), "utf8");
    const renamed = runCli(dir, ["validate"]);
    assert.match(renamed.stdout + renamed.stderr, /NOTE_ID_CONTINUITY.*N-Project007-20260717a.*missing locally/);
  });
});
