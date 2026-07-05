# Framework Review Checklist

Run when any trigger fires (core/loop.yaml `meta_strand.review_triggers`):
every 5 tasks / after framework-material change / judgment hesitation / same problem twice.
Findings are handled through the normal loop; durable lessons are recorded as
notes (HH-016) tagged `scope:framework` (HH-032 convention).

## R1 — Core vs detail consistency
- [ ] Phase steps/artifacts/exit conditions match between core/loop.yaml and assets/checklists/*.
- [ ] EX-1..EX-5 match between core/loop.yaml and assets/workflows/exception-handling.md.
- [ ] Every file path and section referenced from core/ and entry points exists.
- [ ] Declare↔consume + omission sweep (AP-003 — the most-recurring miss). For each material CHANGED
  since the last review: (a) every NEW declaration — a gate param, a brief/template field, a named
  marker, a destination reference ("queue to X" / "record in Y"), or a "the rule requires Z" check —
  has a CONSUMER in the same or a wired material; (a2) every STEP that CONSUMES an input (an anchor,
  a prior artifact, a classification) has an upstream step/phase that PRODUCES it (HH-037: P6 consumed
  anchors no Search step produced); (a3) when ADDING a new artifact or step, wire ALL its consumers in
  the SAME change — phase_gate evidence, depth_modes required_steps/minimum_outputs, EX redo ranges,
  and the relevant schema/template (HH-035/036: change-list, D2b, D7 were each added without one or
  more of their gate/depth/EX/schema consumers); (b) every reference resolves to a definition;
  (c) omission: a rule that enumerates states/cases covers ALL of them (e.g. S2 retrieval vs note
  state active/archived). Mechanical partial guards: validate `GATE_DEAD_CONFIG` (gate params),
  `PHASE_CONSISTENCY` (loop phase_gate evidence ↔ phase artifacts, HH-036), `STEP_CONSISTENCY`
  (required_steps ↔ defined steps, HH-037), `AMEND_INDEX`, `ARCHIVE_INDEX` (HH-031 Phase2),
  `TOOL_DOC_CONSISTENCY` (CLI subcommand ↔ material), `CHECK_DOC_CONSISTENCY` (validate guard ↔ this list),
  `NOTE_FIELD_SCHEMA` (knowledge.yaml note field header ↔ data), `AMEND_RATIFIED_BY_EMPTY` (HH-042/046 attestation completeness — 承認証跡の記入漏れ検出であり enforcement ではない),
  `DISTILL_CAPTURE` (最新ブリーフの D2b 検知=有/手戻りシグナル ↔ 恒久資材 新規N/AP/backlog/HH の存在, HH-043),
  `CONFLICT_MARKER` (active 資材に未解決マージ競合マーカー `<<<<<<< `/`>>>>>>> ` が残存していないか, HH-044),
  `NOTE_ATTRIBUTION` (最新ブリーフで 適用=✓ のノートが --use/--miss 済み=last_used が BRIEF_META task_index に追いついているか, HH-053),
  active-scan. Worked misses this is meant to
  catch (TASK-20260620-014): strength_start (dead gate param), execution_mode (field without template),
  "project TODO" (dangling destination), prune (declared, no checklist consumer), S2 active-only
  (omission), **P6-anchors without a Search producer (HH-037 — step-input ↔ producer, caught only by the
  (a2) lens, NOT by a mechanical check)**. Semantic/omission cases that resist a mechanical check warrant
  a periodic adversarial audit (Codex survey; see process-backlog).

## R2 — Schema consistency
- [ ] Distill steps (D1-D7) numbering matches core/loop.yaml / distill.md / task-brief template.
- [ ] Anti-pattern schema matches between distill.md D6 and assets/ai/anti-patterns.md.
- [ ] Counter rules match between core/knowledge.yaml header and evaluate.md / distill.md.

## R3 — Mechanical integrity
- [ ] `node tools/hyperhelix.mjs validate` passes with zero errors.
  (HH-016: no recompute/derived-field check — knowledge is a flat note ledger with no derived fields.)

## R4 — Usability
- [ ] Phase-gate decisions were unambiguous in recent tasks.
- [ ] No checklist item was undecidable.
- [ ] No exception fell outside EX-1..EX-5.
- [ ] No distill step left "what do I do here" unanswered.

## R5 — AI-material fitness
- [ ] core/ files stay imperative, tabular, fixed-vocabulary, reference-linked; no background prose creep.
- [ ] User-facing explanation lives in README.md / docs/, not in core/.
- [ ] D5 slimming actually ran on the base documents recently.

## Branch context (shared by R6 + R7d — HH-021/025/038)
> On `main`, framework development IS the purpose → ROI / anti-self-purpose **enforcement is STOPPED**
> (user-directed improvement, /cycle, /sync; the HUMAN decides when to switch to a project branch;
> constitution axiom-5 "improvement exists to make artifacts" still holds). This covers R6, R7d, AND
> the HH-048 external-value gate (HH-052). On `project/variant`, real project work is expected →
> **ACTIVE**. **Measurement continues on both branches; only enforcement differs.** (HH-021
> CONTEXT-DEFERRED is superseded by HH-025 STOPPED.)

## R6 — Anti-self-purpose (HH-018/021/025; branch context above)
- [ ] State per branch context: main → record `n/a (main: R6 STOPPED)`. project/variant → ACTIVE (below).
- [ ] ACTIVE only — Record the consecutive framework-only cycle count as a NUMBER, not prose (AP-004).
- [ ] ACTIVE only — Enforcement: if the last 3 cycles were all framework-only, the next task MUST be a real task (recorded).
- [ ] ACTIVE only — If no external-artifact task ran recently, R4 is marked "unverified (awaiting real task)".
- [ ] Review-only records (HH-023) do NOT add to the framework-only count (zero-artifact inspections, not cycles); any tracked-file change is a real task and counts.

## R7 — Systemic value / absence / frame (HH-026)
Catches what R1-R6 structurally miss — omission, cost-without-value, frame lock-in.
Stance: "what would a first-time reader find absurd?" Each subcheck outputs a NUMBER or
fixed-form evidence, never satisfiable prose (AP-004). Measurement is tool-backed: run
`node tools/hyperhelix.mjs cost-report` first; record its output in the /cycle brief.
Cadence: R7a/R7b/R7f every /cycle; R7c/R7d/R7e every 5th review OR when a mandatory-read
material exceeds 300 lines. The "必読" source of truth is the reading-order tiers (CLAUDE/AGENTS).
- [ ] R7a Fixed cost: record cost-report's always-read total (lines) and brief average; diff vs last run is auto-recorded in knowledge.yaml `last_always_read_lines` (convergence baseline — growing = finding). A mandatory-read material >300 lines without an index = finding. Brief-overhead disposition (HH-031 Phase 1): tasks/ MUST be search-excluded (tasks/.rgignore present); if briefs are on the default grep/glob search path, that is a finding.
  - **Ratchet (HH-050, `core/gates.yaml convergence_ratchet.always_read_streak_k`)**: if the always-read total rose ▲ for K consecutive /cycle (read the trend from prior /cycle briefs), this /cycle MUST run a D5 slim BEFORE adding any mandatory-read lines. Record the streak length (number) and the slim done, or "streak < K".
- [ ] R7b Unindexed bulk: cost-report's R7b list. Any entry (mandatory-read, >300 lines, no index) = finding → propose an index/tiering.
- [ ] R7c External value (every 5th / on trigger): for the batch, record cost AND one concrete external-value signal (artifact adopted downstream / future cost reduced / human intervention replaced). No identifiable external value for the cost = finding (recorded on main too; R6-STOPPED removes enforcement, not measurement).
  - **External-value gate (HH-048; main exception HH-052, `core/gates.yaml external_value_gate.cycle_interval_n`)**: every N /cycle, a real-project CONSUMPTION task (project/* branch, exercising the framework) should have run since the last one, with its external-value signal recorded. Per Branch context (above): **main → STOPPED** — record the /cycle count since last consumption as MEASUREMENT ONLY; do NOT mark R4 (the human decides when to switch to a project branch, same as R6/R7d; HH-025/038/052). **project/variant → ACTIVE** — if no consumption task ran within N /cycle, mark R4 "unverified — awaiting real-project consumption". Operationalizes axiom-5 without contradicting main's framework-dev purpose.
- [ ] R7d Adversarial analogy (every 5th / on trigger): state (a) a supporting analogy, (b) at least one COMPETING analogy that would REJECT the design, (c) the property the design lacks under (b). A single supporting analogy does NOT satisfy R7d. Per branch context (above): main → STOPPED (HH-038), record `n/a (main: R7d STOPPED)`; project/variant → ACTIVE.
- [ ] R7e Accumulation inventory (every 5th / on trigger): list mandatory costs added since last R7, each with a value-justification (measured where possible) and a re-justification date. "正当" without evidence is rejected.
- [ ] R7f Self-measurement: record R7's own overhead (cost-report run + R7 record lines). If R7 itself exceeds budget, that is a finding (lower the cadence).

## R8 — Consolidation / redundancy (HH-040)
Catches the ACTION-side gap R1-R7 miss: local improvements accrete into redundant, superseded,
or bloated rules with no GLOBAL cleanup. Measurement is tool-backed: run
`node tools/hyperhelix.mjs consolidation-report` first; record its output in the /cycle brief.
Each subcheck outputs a NUMBER or fixed evidence, never satisfiable prose (AP-004).
Cadence: R8a/R8c every /cycle; R8b/R8d every 5th review OR when any active material exceeds 300 lines.
Authority for the consolidation workflow itself: `assets/workflows/consolidation.md`.
- [ ] R8a Redundancy clusters: for each report cluster (duplicate rule / stale deprecated / note-merge / bloat), decide DRY-to-one-authority + pointer, or record "accept (reason)". A cluster left without a decision = finding. (This subsumes the D5 duplicate/stale glance below.)
- [ ] R8b HH-set supersession (every 5th / on trigger): for each report supersession or lifecycle-drift cluster, propose collapse to ONE rule + historical footnote, or the correct section move, via an amendments.md HH. Mass-consolidation / history rewrite = HUMAN GATE (routing). Output candidate HH ids, not prose.
- [ ] R8c Backlog burn-down: every open `docs/process-backlog.md` item is either PROCESSED this cycle or RE-JUSTIFIED with a date + root-cause class (mirrors R7e). An item carried >3 cycles with no re-justification = finding. Net change (open count diff vs last run) is auto-recorded in knowledge.yaml `last_backlog_open_count` by consolidation-report; growing = finding.
  - **Ratchet (HH-050, `core/gates.yaml convergence_ratchet.backlog_streak_k` / `backlog_burn_m`)**: if the open count rose ▲ for K consecutive /cycle (read the trend from prior /cycle briefs), this /cycle MUST PROCESS >= M open items BEFORE any net add. Record the streak length (number) and items burned, or "streak < K". A gauge that only measures is ceremony; the ratchet makes rising monotonicity self-correcting.
- [ ] R8d Cross-task emergent pattern (every 5th / on trigger): tally the root-cause `class:` of recent backlog items; a class recurring >=K (default 3) = mint ONE consolidation task (cross-task same-problem-twice). Record the count, not prose.
- [ ] R8e Self-measurement (R7f sibling): record R8's own overhead. If the consolidation ceremony costs more than the bloat it removes, LOWER the cadence — an anti-bloat lens that bloats is self-defeating.

## Completion
- [ ] Per-check results (R1..R8, pass or finding) recorded in the brief — a bare "R1-R8 done" claim is not evidence.
- [ ] Findings routed via Distill D1-D7, or "no issues" recorded.
- [ ] Note prune (core/gates.yaml human_actions — a HUMAN action at /cycle): glance low-strength / stale notes; archive any (set state: archived), or record "no prune". This is the sole live consumer of the declared prune action; it is a glance, not a mandatory edit.
- [ ] D5 slimming trigger (HH-036 — D5 is NOT a per-standard-task burden; this /cycle glance IS its trigger): glance whether any base material grew or duplicated since the last /cycle (cost-report R7e helps); slim it (D5), or record "no slimming needed". Satisfies R5's "D5 ran recently".
- [ ] counters.last_framework_review set to the current counters.task_index (core/knowledge.yaml).
- [ ] Next review trigger recorded.
