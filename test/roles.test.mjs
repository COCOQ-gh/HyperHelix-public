import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(new URL("../entrypoint.md", import.meta.url)));

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

test("RT-08: active guidance never fixes functional roles to platform names", () => {
  const active = [
    "README.md",
    "entrypoint.md",
    "AGENTS.md",
    "CLAUDE.md",
    "assets/workflows/agent-roles.md",
  ].map(read).join("\n");

  assert.doesNotMatch(active, /\|\s*Orchestrator\s*\|\s*Claude(?:\s|\|)/i);
  assert.doesNotMatch(active, /\|\s*Executor\s*\|\s*Codex(?:\s|\|)/i);
  assert.doesNotMatch(active, /Claude\s*(?:が|=|is)\s*(?:the\s+)?(?:オーケストレータ|orchestrator)/i);
  assert.doesNotMatch(active, /Codex\s*(?:が|=|is)\s*(?:the\s+)?(?:実行エージェント|executor)/i);
});

test("RT-08: one canonical table and one risk-based re-verification rule remain", () => {
  const roles = read("assets/workflows/agent-roles.md");
  const readme = read("README.md");

  assert.match(roles, /\| Role \| Invocation context \| Owns \|/);
  assert.match(roles, /Primary session, not invoked with a Work Order/);
  assert.match(roles, /Session invoked with a Work Order/);
  assert.match(roles, /MUST inspect all returned raw evidence/);
  assert.match(roles, /failed or skipped checks, checks covering high-risk changes/);
  assert.match(roles, /representative boundary case for each changed behavior/);
  assert.doesNotMatch(roles, /re-run every validation\s+command yourself/i);
  assert.doesNotMatch(roles, /rather than re-running all V1 commands/i);
  assert.match(readme, /ロール規約の正本は/);
});
