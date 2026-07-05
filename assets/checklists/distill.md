# Distill Checklist

## Preconditions
- [ ] Evaluate artifacts complete (phase gate).

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
- [ ] Human-gate items written as amendments.md proposals (HH-NNN), NOT applied.
- [ ] Framework materials changed? -> framework-review.md R1-R3 consistency check done.

## D5 — Slim AI-facing materials
- [ ] Duplicates merged, stale criteria dropped, one-off detail archived (or "no slimming needed" recorded with reason).
- [ ] Reproducibility / verifiability / safety information kept.

## D6 — Anti-patterns
- [ ] Confirmed failure cases added to assets/ai/anti-patterns.md per its schema (or "none" recorded).
- [ ] **Mandatory if re-occurrence**: if this task fixed a pattern that was previously fixed and broke again, AP registration is REQUIRED — "none" is not valid here (TASK-288: SETBGCOLOR fixed TASK-270 → re-broke TASK-286 → its AP was registered only at TASK-288; delay = 2 tasks).
- [ ] **Mandatory on first-time self-rework/failure (HH-043)**: 再発でなくても、(i) 自分の直近タスクが招いた不具合の修正(手戻り/regression), または (ii) 誤前提に起因し再発しうる失敗 を含むなら、**note または AP の新規登録が必須**(『none』『変更なし』不可)。既存資材で足ると判断する場合は、その資材の**該当文を引用**して明示する(無検証の『参照 N-xxx』は不可)。validate の `DISTILL_CAPTURE` が最新ブリーフでこれを検査する(恒久資材=新規 N-NNN / AP-NNN / process-backlog / HH-NNN)。

## D7 — Counters & notes (HH-016 note ledger; core/knowledge.yaml header is the single authority)
- [ ] counters.task_index +1 (`node tools/hyperhelix.mjs bump --task ID`).
- [ ] AT MOST ONE note move: add a new note (id from counters.next_note_id, then next_note_id +1; set `project:` = current project slug or `shared`, HH-032) OR nudge an existing note's strength +/-1 with last_used (`--use` / `--miss`). "No change" is a valid outcome **except when D6 の手戻り/失敗必須(HH-043)に該当する場合**(その場合は新規 note か AP が必須)。
- [ ] **ノート帰属の閉ループ(HH-053)**: ブリーフの取得/適用表で `適用=✓` としたノートは、このタスクで `bump --use`(効いた)/ `--miss`(誤り/不足)を**必ず**実行する(strength ±1 + last_used 更新)。BRIEF_META に `task_index`(bump 後値)を記す。validate `NOTE_ATTRIBUTION` が「適用=✓ なのに last_used < task_index」を warn する。取得のみ(適用=—)のノートは対象外。「効いたか」を記録しないと台帳は write-only ログ化する。
- [ ] HH-045 playbook tier (OPTIONAL): a new note may be a `kind: playbook` (authoritative topic note with `leaves: [N-…]`) or a `kind: leaf` (`topic: N-…` pointing to its playbook); plain notes omit all three. Folding scattered leaves into one playbook is a /cycle R8 consolidation (human-gated), not a per-task move.
- [ ] Important/durable lesson? Lift it BY HAND into constitution.md or file an amendments.md proposal — there is no automatic promotion.
- [ ] `node tools/hyperhelix.mjs validate` passes.

## Exit
- [ ] Lessons recorded in the brief; task summary fields ready (core/loop.yaml `task_summary`).
- [ ] Task committed per assets/workflows/git-conventions.md (validate passed; working tree clean).
