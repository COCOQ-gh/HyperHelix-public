import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPACTION_STATE_VERSION,
  contextWindowTokens,
  estimateContextTokens,
  handleContextWarn,
  handlePreCompact,
  handlePostCompact,
  handlePrompt,
  handleRecovery,
  readBaseline,
} from "../tools/compaction-hooks.mjs";
import { copyFrameworkFixture, gitInRepo, initGitRepo, withTempDir } from "./helpers/repo-fixture.mjs";

const warningEnv = {
  HH_CONTEXT_MAX_BYTES: "1000",
  HH_CONTEXT_WARN_PCT: "60",
  HH_CONTEXT_REBASE_PCT: "150",
};

test("RT-13: PostCompact marker hands off recovery then suppresses the same-event warning", () => {
  withTempDir((projectDir) => {
    const sid = "session-v2";
    const transcript = path.join(projectDir, "transcript.jsonl");
    fs.writeFileSync(transcript, Buffer.alloc(800));
    const input = { session_id: sid, transcript_path: transcript };

    handlePostCompact({ session_id: sid }, { projectDir });
    const marker = path.join(projectDir, ".claude", "tmp", "compacted", sid);
    assert.equal(JSON.parse(fs.readFileSync(marker, "utf8")).version, COMPACTION_STATE_VERSION);
    assert.match(handleRecovery(input, { projectDir }), /COMPACTION RECOVERY/);
    assert.equal(readBaseline(path.join(projectDir, ".claude", "tmp", "compact-baseline", sid)).bytes, 800);
    assert.equal(handleContextWarn(input, { projectDir, env: warningEnv }), "");
    assert.equal(fs.existsSync(marker), false);

    fs.appendFileSync(transcript, Buffer.alloc(599));
    assert.equal(handleContextWarn(input, { projectDir, env: warningEnv }), "");
    fs.appendFileSync(transcript, Buffer.alloc(1));
    assert.match(handleContextWarn(input, { projectDir, env: warningEnv }), /CONTEXT 60%/);
  });
});

test("RT-13: one-generation numeric baseline and compact marker remain readable", () => {
  withTempDir((projectDir) => {
    const sid = "session-v1";
    const transcript = path.join(projectDir, "transcript.jsonl");
    fs.writeFileSync(transcript, Buffer.alloc(1100));
    const tmp = path.join(projectDir, ".claude", "tmp");
    fs.mkdirSync(path.join(tmp, "compact-baseline"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "compacted"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "compact-baseline", sid), "500");
    assert.equal(readBaseline(path.join(tmp, "compact-baseline", sid)).version, 1);
    assert.match(handleContextWarn({ session_id: sid, transcript_path: transcript }, { projectDir, env: warningEnv }), /CONTEXT 60%/);

    fs.writeFileSync(path.join(tmp, "compacted", sid), "1700000000000");
    assert.match(handleRecovery({ session_id: sid, transcript_path: transcript }, { projectDir }), /COMPACTION RECOVERY/);
    assert.equal(handleContextWarn({ session_id: sid, transcript_path: transcript }, { projectDir, env: warningEnv }), "");
    assert.equal(readBaseline(path.join(tmp, "compact-baseline", sid)).version, COMPACTION_STATE_VERSION);
  });
});

test("RT-19: PreCompact creates and refreshes mechanical state without erasing semantics", () => {
  withTempDir((projectDir) => {
    initGitRepo(projectDir, "main");
    copyFrameworkFixture(projectDir);
    gitInRepo(projectDir, ["add", "."]);
    gitInRepo(projectDir, ["commit", "-m", "fixture base"], { stdio: "ignore" });

    const sid = "12345678-abcd-1234-abcd-123456789abc";
    const input = { session_id: sid, cwd: projectDir, hook_event_name: "PreCompact" };
    const first = JSON.parse(handlePreCompact(input, { projectDir }));
    // HH-079: PreCompact has no channel to the summarizing model. hookSpecificOutput on this
    // event is a host schema violation that discards the ENTIRE hook output, so the only legal
    // payload is top-level. A fresh skeleton still owes every semantic section.
    assert.deepEqual(Object.keys(first), ["systemMessage"]);
    assert.match(first.systemMessage, /9\/9 が未記入/);

    const state = path.join(projectDir, ".claude", "tmp", "compact-state", `${sid}.md`);
    let text = fs.readFileSync(state, "utf8");
    assert.match(text, /^compaction stamp: 意味セクション 9\/9 が未記入のまま圧縮された/m);
    text = text.replace("<!-- FILL: session 中の判断・ユーザー選択・不採用案の理由 -->", "KEEP-SEMANTIC-DECISION");
    fs.writeFileSync(state, text);
    fs.appendFileSync(path.join(projectDir, "README.md"), "\nrefresh fixture\n");

    const second = JSON.parse(handlePreCompact(input, { projectDir }));
    const refreshed = fs.readFileSync(state, "utf8");
    assert.match(refreshed, /KEEP-SEMANTIC-DECISION/);
    assert.match(refreshed, /git status: M README\.md/);
    assert.equal((refreshed.match(/## Distill Inbox/g) || []).length, 1);
    // The stamp tracks the current count and never accumulates duplicate lines.
    assert.equal((refreshed.match(/^compaction stamp:/gm) || []).length, 1);
    assert.match(refreshed, /^compaction stamp: 意味セクション 8\/9 が未記入のまま圧縮された/m);
    assert.match(second.systemMessage, /8\/9 が未記入/);
  });
});

test("HH-079: a filled state reports clean while prompt-side events keep additionalContext", () => {
  withTempDir((projectDir) => {
    initGitRepo(projectDir, "main");
    copyFrameworkFixture(projectDir);
    gitInRepo(projectDir, ["add", "."]);
    gitInRepo(projectDir, ["commit", "-m", "fixture base"], { stdio: "ignore" });

    const sid = "abcdef01-2345-6789-abcd-ef0123456789";
    const input = { session_id: sid, cwd: projectDir, hook_event_name: "PreCompact" };
    handlePreCompact(input, { projectDir });

    const state = path.join(projectDir, ".claude", "tmp", "compact-state", `${sid}.md`);
    fs.writeFileSync(state, fs.readFileSync(state, "utf8").replace(/<!-- FILL:[^>]*-->/g, "FILLED"));
    const clean = JSON.parse(handlePreCompact(input, { projectDir }));
    assert.deepEqual(Object.keys(clean), ["systemMessage"]);
    assert.match(clean.systemMessage, /9\/9 記入済/);
    assert.match(fs.readFileSync(state, "utf8"), /^compaction stamp: 意味セクション 9\/9 記入済/m);

    // The removal is scoped to PreCompact: events that DO accept additionalContext keep it.
    handlePostCompact({ session_id: sid }, { projectDir });
    const recovered = JSON.parse(handleRecovery({ session_id: sid, hook_event_name: "UserPromptSubmit" }, { projectDir }));
    assert.equal(recovered.hookSpecificOutput.hookEventName, "UserPromptSubmit");
    assert.equal(recovered.systemMessage, undefined);
  });
});

test("RT-19: shared prompt serializes recovery and warning with dynamic hook events", () => {
  withTempDir((projectDir) => {
    const transcript = path.join(projectDir, "transcript.jsonl");
    fs.writeFileSync(transcript, Buffer.alloc(800));

    const sid = "prompt-session";
    handlePostCompact({ session_id: sid }, { projectDir });
    const output = JSON.parse(handlePrompt({
      session_id: sid,
      transcript_path: transcript,
      hook_event_name: "UserPromptSubmit",
    }, { projectDir, env: warningEnv }));
    assert.equal(output.hookSpecificOutput.hookEventName, "UserPromptSubmit");
    assert.match(output.hookSpecificOutput.additionalContext, /COMPACTION RECOVERY/);
    assert.doesNotMatch(output.hookSpecificOutput.additionalContext, /CONTEXT 80%/);
    assert.equal(fs.existsSync(path.join(projectDir, ".claude", "tmp", "compacted", sid)), false);

    const resumeSid = "resume-session";
    handlePostCompact({ session_id: resumeSid }, { projectDir });
    const resume = JSON.parse(handleRecovery({
      session_id: resumeSid,
      transcript_path: transcript,
      hook_event_name: "SessionStart",
    }, { projectDir }));
    assert.equal(resume.hookSpecificOutput.hookEventName, "SessionStart");
  });
});

// --- Token gauge (TASK-Project001-20260823-037) --------------------------------
// The byte-mode RT-13 tests above use Buffer.alloc fixtures (no usage lines),
// so they double as regression coverage for the byte FALLBACK path.

const usageLine = (tokens, { model = "claude-opus-5", sidechain = false } = {}) => JSON.stringify({
  type: "assistant",
  isSidechain: sidechain,
  message: { model, usage: { input_tokens: tokens, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 } },
});

test("TASK-037: token gauge tracks real occupancy, ignores sidechains, re-warns per step", () => {
  withTempDir((projectDir) => {
    const sid = "token-session";
    const transcript = path.join(projectDir, "transcript.jsonl");
    const input = { session_id: sid, transcript_path: transcript };

    fs.writeFileSync(transcript, usageLine(700000) + "\n");
    assert.equal(handleContextWarn(input, { projectDir, env: {} }), "");

    // last MAIN-CHAIN line wins; a later sidechain line must not shadow it
    fs.appendFileSync(transcript, usageLine(820000) + "\n" + usageLine(999000, { sidechain: true }) + "\n");
    assert.match(handleContextWarn(input, { projectDir, env: {} }), /\[CONTEXT 82%\] 実測 820k\/1000k tokens/);

    // +4% is inside the re-warn step: silent; +6% re-warns
    fs.appendFileSync(transcript, usageLine(860000) + "\n");
    assert.equal(handleContextWarn(input, { projectDir, env: {} }), "");
    fs.appendFileSync(transcript, usageLine(880000) + "\n");
    assert.match(handleContextWarn(input, { projectDir, env: {} }), /CONTEXT 88% 再警告/);

    // self-heal: occupancy back under the threshold -> silent AND re-armed
    fs.appendFileSync(transcript, usageLine(100000) + "\n");
    assert.equal(handleContextWarn(input, { projectDir, env: {} }), "");
    assert.equal(fs.existsSync(path.join(projectDir, ".claude", "tmp", "compact-warned", sid)), false);
    fs.appendFileSync(transcript, usageLine(820000) + "\n");
    assert.match(handleContextWarn(input, { projectDir, env: {} }), /\[CONTEXT 82%\]/);
  });
});

test("TASK-037: window resolution — env override > model table > 200k fallback", () => {
  assert.equal(contextWindowTokens("claude-opus-5", {}), 1000000);
  assert.equal(contextWindowTokens("claude-fable-5", {}), 1000000);
  assert.equal(contextWindowTokens("claude-sonnet-5", {}), 1000000);
  assert.equal(contextWindowTokens("claude-haiku-4-5", {}), 200000);
  assert.equal(contextWindowTokens("", {}), 200000);
  assert.equal(contextWindowTokens("claude-opus-5", { HH_CONTEXT_WINDOW_TOKENS: "500000" }), 500000);
  withTempDir((projectDir) => {
    const transcript = path.join(projectDir, "transcript.jsonl");
    fs.writeFileSync(transcript, usageLine(170000, { model: "claude-haiku-4-5" }) + "\n");
    assert.match(
      handleContextWarn({ session_id: "window-session", transcript_path: transcript }, { projectDir, env: {} }),
      /CONTEXT 85%/,
    );
  });
});

test("TASK-037: unreadable or usage-free transcripts yield null (byte-gauge fallback)", () => {
  assert.equal(estimateContextTokens(path.join("no", "such", "file")), null);
  withTempDir((projectDir) => {
    const transcript = path.join(projectDir, "transcript.jsonl");
    fs.writeFileSync(transcript, Buffer.alloc(800));
    assert.equal(estimateContextTokens(transcript), null);
  });
});
