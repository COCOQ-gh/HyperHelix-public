// HH-082 B: positive fixture (HH-028) for the NOTE_TEXT_LENGTH guideline. A note created
// on/after the contract's `since` date warns past the soft maximum; older notes are
// grandfathered and archived notes are ignored. It is a warning, never an error.
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { KNOWLEDGE_CONTRACT } from "../tools/lib/contracts.mjs";
import { copyFrameworkFixture, initGitRepo, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

const { chars, since } = KNOWLEDGE_CONTRACT.noteTextSoftMax;

function addNote(root, { id, length, state = "active" }) {
  const ledger = path.join(root, KNOWLEDGE_CONTRACT.mainLedger);
  const note = [
    `  - id: ${id}`,
    `    text: "${"x".repeat(length)}"`,
    "    tags: [fixture]",
    "    project: hyperhelix",
    "    strength: 1",
    "    last_used: 1",
    `    state: ${state}`,
  ].join("\n");
  fs.writeFileSync(ledger, fs.readFileSync(ledger, "utf8").replace(/^notes:$/m, `notes:\n${note}`));
}

function validateIn(setup) {
  return withTempDir((root) => {
    initGitRepo(root, "main");
    copyFrameworkFixture(root);
    setup(root);
    return runCli(root, ["validate"]).stdout;
  });
}

test("NOTE_TEXT_LENGTH warns for a new note past the soft maximum, and only as a warning", () => {
  const out = validateIn((root) => addNote(root, { id: `N-fixture-${since}a`, length: chars + 1 }));
  assert.match(out, new RegExp(`WARN NOTE_TEXT_LENGTH note 'N-fixture-${since}a' text is ${chars + 1} characters`));
  assert.doesNotMatch(out, /ERROR NOTE_TEXT_LENGTH/);
  assert.match(out, /^0 error\(s\)/m);
});

test("NOTE_TEXT_LENGTH stays silent at the limit, for grandfathered notes, and for archived notes", () => {
  assert.doesNotMatch(validateIn((root) => addNote(root, { id: `N-fixture-${since}a`, length: chars })), /NOTE_TEXT_LENGTH/);
  assert.doesNotMatch(validateIn((root) => addNote(root, { id: "N-fixture-20260101a", length: chars + 500 })), /NOTE_TEXT_LENGTH/);
  assert.doesNotMatch(
    validateIn((root) => addNote(root, { id: `N-fixture-${since}b`, length: chars + 500, state: "archived" })),
    /NOTE_TEXT_LENGTH/,
  );
});
