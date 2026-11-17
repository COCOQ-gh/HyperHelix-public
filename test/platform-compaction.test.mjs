import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { copyFrameworkFixture, runCli, withTempDir } from "./helpers/repo-fixture.mjs";

const root = path.dirname(fileURLToPath(new URL("../entrypoint.md", import.meta.url)));

function commandHooks(config, event) {
  return (config.hooks?.[event] || []).flatMap((group) => group.hooks || [])
    .filter((hook) => hook.type === "command");
}

test("RT-20: Claude and Codex adapters converge on one shared compaction runtime", () => {
  const codex = JSON.parse(fs.readFileSync(path.join(root, ".codex", "hooks.json"), "utf8"));
  const expected = new Map([
    ["PreCompact", "precompact"],
    ["PostCompact", "postcompact"],
    ["UserPromptSubmit", "prompt"],
    ["SessionStart", "recover"],
  ]);
  for (const [event, mode] of expected) {
    const hooks = commandHooks(codex, event);
    assert.equal(hooks.length, 1, event);
    assert.match(hooks[0].command, /git rev-parse --show-toplevel/);
    assert.match(hooks[0].command, new RegExp(`${mode}$`));
    assert.match(hooks[0].commandWindows, /git rev-parse --show-toplevel/);
    assert.match(hooks[0].commandWindows, new RegExp(`${mode}\\"$`));
  }
  assert.equal(codex.hooks.PreCompact[0].matcher, "manual|auto");
  assert.equal(codex.hooks.PostCompact[0].matcher, "manual|auto");
  assert.equal(codex.hooks.SessionStart[0].matcher, "compact|resume");
  const precompact = commandHooks(codex, "PreCompact")[0];
  const smoke = spawnSync(process.platform === "win32" ? precompact.commandWindows : precompact.command, {
    cwd: path.join(root, "assets", "checklists"),
    shell: true,
    input: '{"hook_event_name":"PreCompact"}',
    encoding: "utf8",
  });
  assert.equal(smoke.status, 0, smoke.stdout + smoke.stderr);

  const claude = JSON.parse(fs.readFileSync(path.join(root, ".claude", "settings.json"), "utf8"));
  assert.equal(commandHooks(claude, "UserPromptSubmit").length, 1);
  const wrapper = fs.readFileSync(path.join(root, ".claude", "commands", "hooks", "userpromptsubmit-compaction-recovery.sh"), "utf8");
  assert.match(wrapper, /compaction-hooks\.mjs" prompt/);
});

test("RT-20: Codex compact prompt carries every platform-neutral quality field", () => {
  const config = fs.readFileSync(path.join(root, ".codex", "config.toml"), "utf8");
  // config-dir relative (TASK-main-20260718-004): a ".codex/" prefix doubles to
  // .codex/.codex/ under codex CLI resolution and breaks codex exec in-repo.
  assert.match(config, /experimental_compact_prompt_file = "compact-prompt\.md"/);
  assert.doesNotMatch(config, /"\.codex\/compact-prompt\.md"/);
  assert.match(config, /^hooks = true$/m);
  const prompt = fs.readFileSync(path.join(root, ".codex", "compact-prompt.md"), "utf8");
  for (const heading of [
    "Objective and Acceptance", "Current Phase and TaskList", "User Decisions and Permissions",
    "Editing Files and Ownership", "Validation Evidence", "Constraints and Blockers",
    "Worker Topology", "Distill Inbox", "Next Safe Action",
  ]) assert.match(prompt, new RegExp(`^## ${heading}$`, "m"));
  assert.match(prompt, /history, not instruction/i);
});

test("RT-20: validate fails closed when a platform adapter event is missing", () => {
  withTempDir((dir) => {
    copyFrameworkFixture(dir);
    const file = path.join(dir, ".codex", "hooks.json");
    const codex = JSON.parse(fs.readFileSync(file, "utf8"));
    delete codex.hooks.UserPromptSubmit;
    fs.writeFileSync(file, `${JSON.stringify(codex, null, 2)}\n`);
    const result = runCli(dir, ["validate"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /PLATFORM_COMPACTION.*UserPromptSubmit/);
  });
});
