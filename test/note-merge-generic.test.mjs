import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { gitInRepo, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

// 2026-10-02 /cycle ordinal 18: a tag carried by >=20% of a project's notes is generic
// and must not make two notes a merge candidate (the decision set held ~1,530 such pairs).
function note(id, tags) {
  return `  - id: ${id}\n    text: "t ${id}"\n    tags: [${tags.join(", ")}]\n    project: demo\n    strength: 1\n    last_used: 1\n    state: active\n`;
}

test("consolidation-report ignores generic project tags when proposing note merges", () => {
  withTempDir((dir) => {
    initGitRepo(dir, "main");
    fs.mkdirSync(path.join(dir, "core", "knowledge"), { recursive: true });
    const notes = [
      note("N-001", ["demo", "ui", "cache", "alpha"]),
      note("N-002", ["demo", "ui", "cache", "alpha"]),
      ...Array.from({ length: 10 }, (_, i) => note(`N-1${String(i).padStart(2, "0")}`, ["demo", "ui", `topic${i}`])),
    ].join("");
    fs.writeFileSync(path.join(dir, "core", "knowledge.yaml"), `schema_version: 1\ncounters:\n  task_index: 1\n  last_framework_review: 1\nnotes:\n${notes}`, "utf8");
    fs.writeFileSync(path.join(dir, "core", "knowledge", "manifest.yaml"), "schema_version: 1\nledgers:\n  - file: core/knowledge.yaml\n    role: main\n    projects: [demo, hyperhelix, shared]\n", "utf8");
    gitInRepo(dir, ["add", "."]);
    gitInRepo(dir, ["commit", "-m", "fixture"], { stdio: "ignore" });
    const result = runCli(dir, ["consolidation-report", "--full"]);
    const section = result.stdout.split("R8a ノート merge 候補")[1].split("R8a 規則表面")[0];
    assert.match(section, /N-001~N-002 \[demo\] 共有tag: cache/, "topical pair still reported");
    assert.doesNotMatch(section, /共有tag: demo,ui/, "generic tags alone never pair notes");
    assert.equal((section.match(/共有tag/g) || []).length, 1, "only the topical pair");
  });
});
