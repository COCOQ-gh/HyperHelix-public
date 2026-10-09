# Distill Checklist

## Preconditions
- [ ] Evaluate artifacts complete (phase gate).
- [ ] `assets/workflows/compaction.md` の lifecycle に従い、compact state file (`.claude/tmp/compact-state/<sid>.md`; legacy-compatible path) の `## Distill Inbox` を確認(HH-062): 候補があれば本 D フェーズで蒸留するか**明示的に破棄**する。compact 未発生なら n/a。compact 発生が既知なのに state file が無ければ無条件 skip せず、adapter/hook failure として記録・是正する。

## D1 — Success factors
- [ ] Extracted; reusability judged per factor.

## D2 — Failure factors (process problems, never executor problems)
- [ ] Each failure mapped to: originating phase + missing material kind (procedure / criteria / knowledge / tool / automation).
- [ ] Wasted searches identified.

## D2b — Process failure signal scan

Detect cases where a task's successful result exposes a PAST process failure.
When a signal is detected, append one prevention-work line to the framework
process-backlog (docs/process-backlog.md; a host-project task uses that project's
own TODO) — what / why / source task ID.

- [ ] **False blocker**: this task resolved a [!] or out-of-scope item with trivial work → check for similar scope-out decisions elsewhere; queue checklist/AP update (cf. AP-006/N-018)
- [ ] **Unreferenced pattern**: rediscovered a solution pattern already established in a prior task (e.g. hex replacement) without referencing it → queue pattern visibility improvement (note strength nudge / checklist addition)
- [ ] **Search miss**: a dependency discovered during Execute was detectable during Search → queue Search procedure reinforcement
- [ ] **Self-rework**: このタスクが自分の直近タスクが招いた不具合の修正(手戻り/regression/revert)なら、その教訓は D6/D7 で**必ず恒久資材化**する(無検証の『参照 N-xxx』で閉じない)。HH-043。
- [ ] No signal → record "none detected" explicitly (cannot be skipped)

## D3 — Improvements
- [ ] Proposals ordered: recurrence prevention > reusability > effort > implementation cost.
- [ ] Method order considered: procedure fix -> checklist -> template -> automation -> structure change.

## D4 — Route (core/routing.yaml)
- [ ] Each durable finding routed to its destination; existing materials refined over duplicated.
- [ ] Operational cleanup reports (e.g. `clear-logs`) are kept as task working records only; do not promote raw logs or full cleanup summaries. Distill only the durable finding, if any, via the existing routes.
- [ ] Human-gate items written as amendments proposals (HH-NNN): add a `governance/amendments/registry.yaml` entry (status: Pending) + `bodies/HH-NNN.md`, regenerate the view with `hyperhelix.mjs amendments-doc` (SC-04 — never hand-edit amendments.md), NOT applied.
- [ ] Framework materials changed? -> framework-review.md R1-R3 consistency check is represented by complete hh-record `contract_impact` and `framework_check` rows; `finish` consumes them before D7/commit.

## D5 — Slim AI-facing materials
- [ ] Duplicates merged, stale criteria dropped, one-off detail archived (or "no slimming needed" recorded with reason).
- [ ] Reproducibility / verifiability / safety information kept.

## D6 — Anti-patterns
- [ ] Confirmed failure cases added to assets/ai/anti-patterns.md per its schema (or "none" recorded).
- [ ] **Mandatory if re-occurrence**: if this task fixed a pattern that was previously fixed and broke again, AP registration is REQUIRED — "none" is not valid here (TASK-288: SETBGCOLOR fixed TASK-270 → re-broke TASK-286 → its AP was registered only at TASK-288; delay = 2 tasks).
- [ ] **Mandatory on first-time self-rework/failure (HH-043)**: 再発でなくても、(i) 自分の直近タスクが招いた不具合の修正(手戻り/regression), または (ii) 誤前提に起因し再発しうる失敗 を含むなら、**note または AP の新規登録が必須**(『none』『変更なし』不可)。既存資材で足ると判断する場合は、その資材の**該当文を引用**して明示する。`DISTILL_CAPTURE` が最新task artifact（v2は`phase_evidence.distill`）で検査する。

## D7 — Counters & notes (HH-016 note ledger; core/knowledge.yaml header is the single authority)
- [ ] counters.task_index +1 (`node tools/hyperhelix.mjs bump --task ID`).
- [ ] **Note materialization closes the loop (AP-016)**: writing the note INTO the ledger file is the move; the hh-record's `note_adds` entry is only its declaration. Order: write to `core/knowledge[.yaml|/<project>.yaml]` → verify it landed (`grep -c "id: <the-id>"` = 1) → then declare it in `note_adds`. `bump` never appends notes. `finish` / `verify --base` fail closed on a declared-but-absent id.
- [ ] AT MOST ONE **DISCRETIONARY** note move (HH-077): add a new note using the permanent id from `hyperhelix.mjs next-id` (HH-064; set `project:` = current project slug or `shared`, HH-032) OR a strength +/-1 nudge made for a reason OTHER than HH-053 attribution. "No change" is a valid outcome **except when D6 の手戻り/失敗必須(HH-043)に該当する場合**(その場合は新規 note か AP が必須)。
- [ ] **ノート帰属の閉ループ(HH-053)**: hh-record の `notes.applied` に置いたノートは、このタスクの `finish --use`/`--miss` で必ず帰属させる(未帰属なら finish が fail-closed)。取得のみは対象外。**この帰属 nudge は証拠駆動の必須操作であり、上の「裁量的移動 最大1件」の枠には数えない(HH-077)** — 既存ノートを適用しつつ新規ノートも生んだタスクは add 1件と帰属 nudge の両方を行ってよい。
- [ ] New note text = ONE lesson + when it applies, within the soft maximum (core/knowledge.yaml header; `validate` warns `NOTE_TEXT_LENGTH`, HH-082). Evidence goes to a leaf note or this commit's hh-record.
- [ ] HH-045 playbook tier (OPTIONAL): a new note may be a `kind: playbook` (authoritative topic note with `leaves: [N-…]`) or a `kind: leaf` (`topic: N-…` pointing to its playbook); plain notes omit all three. Folding scattered leaves into one playbook is a /cycle R8 consolidation (human-gated), not a per-task move.
- [ ] Important/durable lesson? Lift it BY HAND into constitution.md or file an amendments.md proposal — there is no automatic promotion.
- [ ] `node tools/hyperhelix.mjs validate` passes.

## Exit
- [ ] Lessons recorded in `phase_evidence.distill`; task summary fields ready (core/loop.yaml `task_summary`).
- [ ] **Commit through `finish` (the enforcing entry point)**: `node tools/hyperhelix.mjs finish --task <id> [--use/--miss …] [--review] [--path a,b] --commit --message "<TASK-…: 要約>"`.
  It runs, fail-closed and in order: `verify --staged` (L1-L4) → secret scan → `bump` (idempotent) → post-bump verify + secret scan → pathspec `git add`/`git commit`.
  Running the steps by hand is the FALLBACK, not the default — the enforcement backlog (`class:enforcement-gap`) exists because hand-run steps get skipped and evidence fields stay empty.
  **Deleting files in the same task (renames, removals)**: `--path` rejects a path that no longer
  exists, so pass the parent DIRECTORY (`--path tasks`) — `git add <dir>` stages the deletions too and the
  whole L1-L4 chain still runs (measured: commit `8519e46` carried 40 deletions through `finish`). Never fall
  back to hand-run `bump` + manual commit for this — that is exactly how L3 stops running. Under PARALLEL
  sessions prefer the narrowest directory that still covers your deletions (concurrency.md §4).
  **Scope**: `finish` commits in the HyperHelix repository only. A host-project commit (game code / project docs) stays a manual pathspec commit per git-conventions.md.
- [ ] Task committed per assets/workflows/git-conventions.md (validate passed; working tree clean).
