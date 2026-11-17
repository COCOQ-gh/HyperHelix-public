import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(new URL("../entrypoint.md", import.meta.url)));

test("RT-09: EX-4 references depth_modes without duplicating a live step list", () => {
  const workflow = fs.readFileSync(path.join(root, "assets/workflows/exception-handling.md"), "utf8");
  const ex4 = workflow.match(/## EX-4[\s\S]*?(?=\n## EX-5)/)?.[0] ?? "";

  assert.match(ex4, /core\/loop\.yaml depth_modes\.standard/);
  assert.match(ex4, /depth_modes\.full/);
  assert.match(ex4, /depth_modes\.light/);
  assert.match(ex4, /sole authority/);
  assert.doesNotMatch(ex4, /\b[SP EVD]\d[a-z]?(?:\s*[-–]\s*[SP EVD]\d[a-z]?)?\b/g);
  assert.doesNotMatch(ex4, /\|\s*Phase\s*\|/i);
});

test("RT-09: canonical standard depth retains S4 and E4", () => {
  const loop = fs.readFileSync(path.join(root, "core/loop.yaml"), "utf8");
  const standard = loop.match(/^  standard:\r?\n([\s\S]*?)(?=^  full:)/m)?.[1] ?? "";
  const required = standard.match(/required_steps:\s*\[([^\]]+)\]/)?.[1] ?? "";

  assert.match(required, /(?:^|,\s*)S4(?:,|$)/);
  assert.match(required, /(?:^|,\s*)E4(?:,|$)/);
});
