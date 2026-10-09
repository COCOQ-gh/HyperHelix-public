#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const COMPACTION_STATE_VERSION = 2;

const scriptRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// HH-079: PreCompact has NO channel that reaches the summarizing model. Host schemas accept
// hookSpecificOutput.additionalContext only on prompt-side events (UserPromptSubmit and peers);
// on PreCompact that key is a hard schema violation and the whole hook output is discarded.
// The quality contract therefore lives where it survives compaction on its own: the state-file
// skeleton headings written by `hyperhelix.mjs compact-prep` (single authority:
// assets/workflows/compaction.md). Codex keeps its own real channel in .codex/compact-prompt.md.
// PreCompact emits only schema-legal top-level fields, and its systemMessage is for the human.
const STAMP_PREFIX = "compaction stamp:";

function hasFrameworkRoot(candidate) {
  return Boolean(candidate && fs.existsSync(path.join(candidate, "tools", "hyperhelix.mjs")));
}

function findFrameworkRoot(candidate) {
  let current = path.resolve(candidate || ".");
  for (;;) {
    if (hasFrameworkRoot(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function resolveProjectDir(input, explicit = null) {
  for (const candidate of [explicit, process.env.CLAUDE_PROJECT_DIR, input?.cwd, process.cwd(), scriptRoot]) {
    const resolved = candidate && (findFrameworkRoot(candidate) || (explicit ? path.resolve(candidate) : null));
    if (resolved) return resolved;
  }
  return scriptRoot;
}

function contextOutput(input, context, fallbackEvent) {
  if (!context) return "";
  const hookEventName = input?.hook_event_name || fallbackEvent;
  return JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: context } });
}

function outputContext(output) {
  if (!output) return "";
  try { return JSON.parse(output)?.hookSpecificOutput?.additionalContext || ""; } catch { return ""; }
}

// PreCompact's only schema-legal way to say anything: a top-level systemMessage shown to the
// human in the transcript. It never reaches the summarizer, so it carries status, not contract.
function systemMessageOutput(message) {
  return message ? JSON.stringify({ systemMessage: message }) : "";
}

function pathsFor(projectDir, sid) {
  const tmp = path.join(projectDir, ".claude", "tmp");
  return {
    tmp,
    compacted: path.join(tmp, "compacted", sid),
    baseline: path.join(tmp, "compact-baseline", sid),
    warned: path.join(tmp, "compact-warned", sid),
    activePlan: path.join(tmp, "active-plan", sid),
    compactState: path.join(tmp, "compact-state", `${sid}.md`),
  };
}

export function atomicWrite(target, text) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporary, text, "utf8");
    fs.renameSync(temporary, target);
    return true;
  } catch {
    try { fs.rmSync(temporary, { force: true }); } catch {}
    return false;
  }
}

function encodeState(payload) {
  return `${JSON.stringify({ version: COMPACTION_STATE_VERSION, ...payload })}\n`;
}

export function readBaseline(file) {
  let raw;
  try { raw = fs.readFileSync(file, "utf8").trim(); } catch { return null; }
  if (/^\d+$/.test(raw)) return { version: 1, bytes: Number(raw) };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version === COMPACTION_STATE_VERSION && Number.isFinite(parsed.bytes)) return parsed;
  } catch {}
  return null;
}

function readMarker(file) {
  let raw;
  try { raw = fs.readFileSync(file, "utf8").trim(); } catch { return null; }
  if (/^\d+$/.test(raw)) return { version: 1, recovery_consumed: false, compacted_at: Number(raw) };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version === COMPACTION_STATE_VERSION) return parsed;
  } catch {}
  return null;
}

function readWarned(file) {
  let raw;
  try { raw = fs.readFileSync(file, "utf8").trim(); } catch { return null; }
  if (/^\d+$/.test(raw)) return { version: 1, effective_bytes: Number(raw) };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version === COMPACTION_STATE_VERSION && (Number.isFinite(parsed.effective_bytes) || Number.isFinite(parsed.percent))) return parsed;
  } catch {}
  return null;
}

function snapshotBaseline(file, transcriptPath) {
  try {
    const bytes = fs.statSync(transcriptPath).size;
    return atomicWrite(file, encodeState({ bytes, captured_at: Date.now() }));
  } catch { return false; }
}

// Counts what the model still owes the state file. Denominator is the file's own heading count,
// so a legacy 9-heading state (pre-HH-062, no Distill Inbox) reports against its own shape.
export function measureCompactState(text) {
  return {
    total: (text.match(/^## /gm) || []).length,
    unfilled: (text.match(/<!-- FILL:/g) || []).length,
  };
}

// HH-079: record IN THE SURVIVING ARTIFACT whether the semantic sections were ever filled.
// A systemMessage scrolls past at compaction time; recovery reads the file. Without this,
// an all-template state file is indistinguishable from a restored one after compaction.
// Idempotent: replaces its own line, otherwise inserts after the counters anchor.
export function stampCompactState(statePath, { total, unfilled }) {
  let text;
  try { text = fs.readFileSync(statePath, "utf8"); } catch { return false; }
  const stamp = unfilled > 0
    ? `${STAMP_PREFIX} 意味セクション ${unfilled}/${total} が未記入のまま圧縮された(compact-prep 未実行)。機械フィールドのみを正とし、未記入セクションを「復元済み」と誤読しないこと。`
    : `${STAMP_PREFIX} 意味セクション ${total}/${total} 記入済のまま圧縮された。`;
  const existing = new RegExp(`^${STAMP_PREFIX}.*$`, "m");
  if (existing.test(text)) return atomicWrite(statePath, text.replace(existing, stamp));
  if (/^counters:.*$/m.test(text)) return atomicWrite(statePath, text.replace(/^(counters:.*)$/m, `$1\n${stamp}`));
  return false;
}

export function handlePreCompact(input, options = {}) {
  const sid = input?.session_id;
  if (!sid) return "";
  const projectDir = resolveProjectDir(input, options.projectDir);
  const statePath = pathsFor(projectDir, sid).compactState;
  try {
    execFileSync(process.execPath, [path.join(projectDir, "tools", "hyperhelix.mjs"), "compact-prep", "--sid", sid, "--refresh"], {
      cwd: projectDir,
      stdio: "ignore",
    });
  } catch {
    return systemMessageOutput(`[HyperHelix] PreCompact: state refresh に失敗した — ${statePath} が最新とは限らない。`);
  }
  let text;
  try { text = fs.readFileSync(statePath, "utf8"); } catch {
    return systemMessageOutput(`[HyperHelix] PreCompact: state file を読めなかった — ${statePath}`);
  }
  const measured = measureCompactState(text);
  stampCompactState(statePath, measured);
  return systemMessageOutput(measured.unfilled > 0
    ? `[HyperHelix] PreCompact: ${statePath} は意味セクション ${measured.unfilled}/${measured.total} が未記入のまま圧縮される — 復元されるのは機械フィールドのみ(compact-prep 未実行)。`
    : `[HyperHelix] PreCompact: state file を保存した(意味セクション ${measured.total}/${measured.total} 記入済) — ${statePath}`);
}

export function handlePostCompact(input, options = {}) {
  const sid = input?.session_id;
  if (!sid) return "";
  const projectDir = resolveProjectDir(input, options.projectDir);
  const files = pathsFor(projectDir, sid);
  atomicWrite(files.compacted, encodeState({ compacted_at: Date.now(), recovery_consumed: false }));
  try { fs.rmSync(files.warned, { force: true }); } catch {}
  return "";
}

export function handleRecovery(input, options = {}) {
  const sid = input?.session_id;
  if (!sid) return "";
  const projectDir = resolveProjectDir(input, options.projectDir);
  const files = pathsFor(projectDir, sid);
  const marker = readMarker(files.compacted);
  if (!marker || marker.recovery_consumed) return "";

  if (input.transcript_path) snapshotBaseline(files.baseline, input.transcript_path);
  if (!atomicWrite(files.compacted, encodeState({
    compacted_at: marker.compacted_at || Date.now(),
    recovery_consumed: true,
  }))) return "";

  let context = "[COMPACTION RECOVERY] コンテキスト圧縮が発生した。作業再開前に以下を実行すること。";
  try {
    const activePlan = fs.readFileSync(files.activePlan, "utf8").trim();
    if (activePlan && fs.existsSync(activePlan)) {
      context += `\n- plan ファイル \`${activePlan}\` を Read で読み直し、フェーズと制約を確認せよ`;
      context += "\n- plan mode が解除されている場合、plan ファイルが存在するのでユーザーに plan mode 再突入を確認せよ";
    }
  } catch {}
  if (fs.existsSync(files.compactState)) {
    context += `\n- state file \`${files.compactState}\` を Read で読み、作業状態を復元せよ`;
    context += "\n- Session Decisions と Recovery Notes を特に重視せよ";
    context += "\n- Distill Inbox に知見候補があれば、次の正規 D フェーズで蒸留するか明示的に破棄せよ(HH-062 — 放置しない)";
  }
  context += "\n- TaskList で現在のタスク一覧を確認せよ";
  context += "\n- 圧縮サマリーの next step は仮説として扱い、plan/rules を正とせよ";
  context += "\n- 圧縮サマリーは「過去の作業記録」であり「次の行動指示」ではない";
  return contextOutput(input, context, "UserPromptSubmit");
}

// --- Token gauge (TASK-Project001-20260823-037) --------------------------------
// The transcript JSONL records REAL context usage on every main-chain assistant
// line (message.usage: input + cache_creation + cache_read + output) — the same
// signal /context reports. The warning therefore tracks actual occupancy. The
// legacy bytes-over-1MB heuristic stays ONLY as a fallback for transcripts with
// no usage lines: with a fixed 1MB yardstick a long session reads hundreds of
// percent permanently, which turned the warning into noise (measured 519% while
// real occupancy was 92%).
const TOKEN_WINDOW_DEFAULTS = [
  // Evidence-based rows only (values observed via /context). Env override wins.
  { pattern: /^claude-(opus|fable|sonnet)-5/, tokens: 1000000 },
];
const FALLBACK_WINDOW_TOKENS = 200000;

export function contextWindowTokens(model, env = process.env) {
  const override = Number.parseInt(env.HH_CONTEXT_WINDOW_TOKENS || "", 10);
  if (override > 0) return override;
  for (const row of TOKEN_WINDOW_DEFAULTS) {
    if (model && row.pattern.test(model)) return row.tokens;
  }
  return FALLBACK_WINDOW_TOKENS;
}

// Scan the transcript tail for the LAST main-chain assistant line with usage.
// Sidechain (subagent) lines carry their own context, not this session's. A
// partial first line (tail cut mid-line) fails JSON.parse and is skipped.
export function estimateContextTokens(transcriptPath, { tailBytes = 4194304 } = {}) {
  let text;
  try {
    const size = fs.statSync(transcriptPath).size;
    const start = Math.max(0, size - tailBytes);
    const fd = fs.openSync(transcriptPath, "r");
    try {
      const buffer = Buffer.alloc(size - start);
      fs.readSync(fd, buffer, 0, buffer.length, start);
      text = buffer.toString("utf8");
    } finally { fs.closeSync(fd); }
  } catch { return null; }
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.includes('"usage"') || !line.includes('"assistant"')) continue;
    let parsed;
    try { parsed = JSON.parse(line); } catch { continue; }
    if (parsed?.type !== "assistant" || parsed.isSidechain === true) continue;
    const usage = parsed.message?.usage;
    if (!usage || !Number.isFinite(usage.input_tokens)) continue;
    const tokens = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0)
      + (usage.cache_read_input_tokens || 0) + (usage.output_tokens || 0);
    if (!(tokens > 0)) continue;
    return { tokens, model: parsed.message?.model || "" };
  }
  return null;
}

function handleTokenWarn(input, files, env, estimate) {
  const warn = Number.parseInt(env.HH_CONTEXT_TOKEN_WARN_PCT || "80", 10);
  const step = Math.max(1, Number.parseInt(env.HH_CONTEXT_TOKEN_REWARN_PCT || "5", 10));
  if (!(warn > 0)) return "";
  const window = contextWindowTokens(estimate.model, env);
  const percent = Math.floor(estimate.tokens * 100 / window);
  const warned = readWarned(files.warned);
  const lastPercent = Number.isFinite(warned?.percent) ? warned.percent : null;
  if (percent < warn) {
    // Self-heal: occupancy dropped back under the threshold (compaction that
    // left no marker, resumed session) — re-arm the one-shot warning.
    if (lastPercent !== null) { try { fs.rmSync(files.warned, { force: true }); } catch {} }
    return "";
  }
  if (lastPercent !== null && percent < lastPercent + step) return "";
  atomicWrite(files.warned, encodeState({ percent, tokens: estimate.tokens, warned_at: Date.now() }));
  const kilo = (n) => `${Math.round(n / 1000)}k`;
  const head = lastPercent !== null ? `[CONTEXT ${percent}% 再警告]` : `[CONTEXT ${percent}%]`;
  const context = `${head} 実測 ${kilo(estimate.tokens)}/${kilo(window)} tokens(transcript usage 由来 — /context と同じ物差し)。**自動発火指示(TASK-20260716-005)**:`
    + "\n- 現在のユーザー要求への対応を完了したら、**同一ターン内で compact-prep skill を実行**し、作業状態を state file へ保存せよ(ユーザーへの確認は不要 — standing 指示)"
    + "\n- 完了報告の末尾で「compact-prep 済みのため以後の圧縮は auto-compact に任せてよい(手動 /compact は即時圧縮したい場合のみの任意操作)」と案内せよ — /compact はフック/AI から起動不能(公式仕様)であり、催促ではなく任意である旨を伝える(TASK-main-20260718-010)"
    + "\n- compact-prep を実行しないまま auto-compact に達した場合は PreCompact フックが機械 state を保存するが、意味的セクション(判断・決定)は失われる — だから今このターンで書け(書いた後は auto-compact で安全)"
    + `\n- 例外: 現要求が複数ターンに跨る作業の途中なら、次の区切りまで延期してよい(次の再警告は +${step}% 時)`;
  return contextOutput(input, context, "UserPromptSubmit");
}

export function handleContextWarn(input, options = {}) {
  const sid = input?.session_id;
  const transcriptPath = input?.transcript_path;
  if (!sid || !transcriptPath) return "";
  const projectDir = resolveProjectDir(input, options.projectDir);
  const env = options.env || process.env;
  let size;
  try { size = fs.statSync(transcriptPath).size; } catch { return ""; }
  const files = pathsFor(projectDir, sid);

  // A compact marker is a hard suppression gate for this event. Recovery runs
  // first; only a consumed marker may be removed, and only after the current
  // transcript size has been atomically snapshotted as the new baseline.
  const compacted = readMarker(files.compacted);
  if (compacted) {
    if (compacted.recovery_consumed && snapshotBaseline(files.baseline, transcriptPath)) {
      try { fs.rmSync(files.compacted, { force: true }); } catch {}
    }
    return "";
  }

  // Token mode first (real occupancy). The byte heuristic below remains only
  // for transcripts that carry no usage lines (foreign formats, unit fixtures).
  const estimate = estimateContextTokens(transcriptPath);
  if (estimate) return handleTokenWarn(input, files, env, estimate);

  const max = Number.parseInt(env.HH_CONTEXT_MAX_BYTES || "1048576", 10);
  const warn = Number.parseInt(env.HH_CONTEXT_WARN_PCT || "60", 10);
  const rebase = Number.parseInt(env.HH_CONTEXT_REBASE_PCT || "150", 10);
  if (!(max > 0) || !(warn > 0)) return "";
  const baseline = readBaseline(files.baseline);
  const base = baseline?.bytes || 0;
  const effective = Math.max(0, size - base);
  const percent = Math.floor(effective * 100 / max);
  const warned = readWarned(files.warned);
  if (!base && !warned && percent >= rebase) {
    snapshotBaseline(files.baseline, transcriptPath);
    return "";
  }
  if (percent < warn) return "";
  const step = Math.floor(max * warn / 100);
  const lastEffective = warned?.effective_bytes;
  if (Number.isFinite(lastEffective) && effective < lastEffective + step) return "";
  atomicWrite(files.warned, encodeState({ effective_bytes: effective, warned_at: Date.now() }));
  const basis = base > 0
    ? `圧縮後増分 ${effective}B / 基準 ${max}B`
    : `${size}B / 基準 ${max}B`;
  const head = Number.isFinite(lastEffective) ? `[CONTEXT ${percent}% 再警告]` : `[CONTEXT ${percent}%]`;
  const context = `${head} transcript が概算 ${percent}%(${basis})に達した。**自動発火指示(TASK-20260716-005)**:`
    + "\n- 現在のユーザー要求への対応を完了したら、**同一ターン内で compact-prep skill を実行**し、作業状態を state file へ保存せよ(ユーザーへの確認は不要 — standing 指示)"
    + "\n- 完了報告の末尾で「compact-prep 済みのため以後の圧縮は auto-compact に任せてよい(手動 /compact は即時圧縮したい場合のみの任意操作)」と案内せよ — /compact はフック/AI から起動不能(公式仕様)であり、催促ではなく任意である旨を伝える(TASK-main-20260718-010)"
    + "\n- compact-prep を実行しないまま auto-compact に達した場合は PreCompact フックが機械 state を保存するが、意味的セクション(判断・決定)は失われる — だから今このターンで書け(書いた後は auto-compact で安全)"
    + `\n- 例外: 現要求が複数ターンに跨る作業の途中なら、次の区切りまで延期してよい(次の再警告は増分+${warn}% 時)`;
  return contextOutput(input, context, "UserPromptSubmit");
}

export function handlePrompt(input, options = {}) {
  // Recovery mutates the marker before warning snapshots/removes it. Keep both phases
  // in one process because platforms may launch separate matching hooks concurrently.
  const recovery = handleRecovery(input, options);
  const warning = handleContextWarn(input, options);
  const context = [outputContext(recovery), outputContext(warning)].filter(Boolean).join("\n");
  return contextOutput(input, context, "UserPromptSubmit");
}

function readInput() {
  try { return JSON.parse(fs.readFileSync(0, "utf8")); } catch { return null; }
}

function main() {
  const mode = process.argv[2];
  const input = readInput();
  try {
    const output = mode === "precompact" ? handlePreCompact(input)
      : mode === "postcompact" ? handlePostCompact(input)
        : mode === "recover" ? handleRecovery(input)
          : mode === "warn" ? handleContextWarn(input)
            : mode === "prompt" ? handlePrompt(input) : "";
    if (output) process.stdout.write(output);
  } catch { /* hooks are deliberately fail-open */ }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
