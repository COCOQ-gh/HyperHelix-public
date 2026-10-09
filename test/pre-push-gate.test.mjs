// TASK-main-20260728-010: the pre-push hook is the local stand-in for the CI gate.
// Contract test (text + shell parse) — the BEHAVIOR of each layer is already covered by
// verify.test.mjs / framework-evidence.test.mjs; the hook is glue, so testing it by running
// validate+verify would duplicate ~20s of work in the suite (test-pyramid speed, HH-071).
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = path.join(ROOT, "tools/hooks/pre-push");
const text = fs.readFileSync(HOOK, "utf8");

test("pre-push hook is valid POSIX shell", () => {
  // sh -n parses without executing; a syntax error here would silently disable the gate
  // on every push (the hook runs under git's own sh).
  execFileSync("sh", ["-n", HOOK], { stdio: "pipe" });
});

test("pre-push hard-blocks on validate failure (L1)", () => {
  assert.match(text, /if ! node tools\/hyperhelix\.mjs validate; then/);
  assert.match(text, /validate failed — push blocked/);
});

test("pre-push runs the CI-equivalent verify gate and blocks on failure (L1-L4)", () => {
  // The whole point: the L4 evidence gate must fire BEFORE the push, not at CI.
  assert.match(text, /node tools\/hyperhelix\.mjs verify --base "\$base"/);
  assert.match(text, /verify --base \$base failed — push blocked/);
  const verifyLine = text.split("\n").findIndex((l) => l.includes('verify --base "$base"'));
  const blockLine = text.split("\n").findIndex((l) => l.includes("verify --base $base failed"));
  assert.ok(verifyLine >= 0 && blockLine > verifyLine, "the block message follows the verify call");
});

test("pre-push derives the base from merge-base, not the possibly-stale origin/main ref", () => {
  assert.match(text, /base=\$\(git merge-base origin\/main HEAD/);
  // A stale origin/main would widen the range to already-merged commits and could block a
  // legitimate push; merge-base keeps it at exactly the unmerged commits.
  assert.doesNotMatch(text, /verify --base origin\/main/);
});

test("the verify trigger carries no duplicated framework path list (AP-003 drift guard)", () => {
  // isFrameworkEvidencePath is the single authority for what counts as framework-relevant.
  // A path list guarding the verify call would be a second, silently-drifting copy of it.
  const trigger = text.slice(text.indexOf("base=$(git merge-base"), text.indexOf("verify --base"));
  assert.doesNotMatch(trigger, /core assets tools docs/);
  // The reflux WARNING (non-blocking, different purpose) may keep its own path list.
  assert.match(text, /WARNING — framework changes not on origin\/main/);
});
