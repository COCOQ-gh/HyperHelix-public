// TASK-main-20260728-011: positive fixture (HH-028) for the HOOKS_PATH guard.
// The guard exists because session-bootstrap §3c DECLARED the wiring while nothing checked
// it — this very repository ran with an inert pre-push gate. Config is injected through
// GIT_CONFIG_* env vars so the test never mutates the repository's own config.
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "tools/hyperhelix.mjs");

function validateWithHooksPath(value) {
  const env = { ...process.env };
  if (value === null) delete env.GIT_CONFIG_COUNT;
  else Object.assign(env, { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "core.hooksPath", GIT_CONFIG_VALUE_0: value });
  // validate exits 0 while only warnings are present, so stdout is the assertion surface.
  return execFileSync(process.execPath, [CLI, "validate"], { cwd: ROOT, encoding: "utf8", env });
}

test("HOOKS_PATH fires when core.hooksPath points somewhere other than tools/hooks", () => {
  const out = validateWithHooksPath("bogus/path");
  assert.match(out, /WARN HOOKS_PATH/);
  assert.match(out, /core\.hooksPath is bogus\/path, not 'tools\/hooks'/);
  assert.match(out, /INERT here/);
  assert.match(out, /session-bootstrap §3c/);
});

test("HOOKS_PATH stays silent when the tracked hooks path is wired", () => {
  const out = validateWithHooksPath("tools/hooks");
  assert.doesNotMatch(out, /HOOKS_PATH/);
});

test("HOOKS_PATH is a warning, never a hard error (bare checkouts / CI never push)", () => {
  const out = validateWithHooksPath("bogus/path");
  assert.doesNotMatch(out, /ERROR HOOKS_PATH/);
  assert.match(out, /^0 error\(s\)/m);
});
