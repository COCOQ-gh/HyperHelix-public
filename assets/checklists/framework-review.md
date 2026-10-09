# Framework Review Checklist

Run full R1-R8 when any trigger fires (core/loop.yaml `meta_strand.review_triggers`):
every 5 tasks / judgment hesitation / same problem twice. A framework-material change
alone runs local R1-R3 at that task's V1 (`assets/checklists/evaluate.md`); it does not
immediately repeat a full R1-R8 review.
Findings are handled through the normal loop; durable lessons are recorded as
notes (HH-016) tagged `scope:framework` (HH-032 convention).

## R1 — Core vs detail consistency
- [ ] Phase steps/artifacts/exit conditions match between core/loop.yaml and assets/checklists/*.
- [ ] EX-1..EX-5 match between core/loop.yaml and assets/workflows/exception-handling.md.
- [ ] Every file path and section referenced from core/ and entry points exists (paths: `REF_PATH_EXISTS` checks them mechanically; sections remain a manual check).
- [ ] Declare↔consume + omission sweep (AP-003 — the most-recurring miss). For each material CHANGED
  since the last review:
  - (a) every NEW declaration — a gate param, a record/template field, a named marker, a destination
    reference ("queue to X" / "record in Y"), or a "the rule requires Z" check — has a CONSUMER in the
    same or a wired material;
  - (a2) every STEP that CONSUMES an input (an anchor, a prior artifact, a classification) has an
    upstream step/phase that PRODUCES it (HH-037);
  - (a3) when ADDING a new artifact or step, wire ALL its consumers in the SAME change — phase_gate
    evidence, depth_modes required_steps/minimum_outputs, EX redo ranges, and the relevant schema
    (HH-035/036);
  - (a4) when REMOVING a material, rewire or remove every reference to it in the SAME change;
  - (b) every reference resolves to a definition;
  - (c) omission: a rule that enumerates states/cases covers ALL of them (e.g. S2 retrieval vs note
    state active/archived).
  - Worked misses: dead gate param (strength_start) / field without template (execution_mode) /
    dangling destination ("project TODO"; routing -> the retired templates directory, 2026-10-02) /
    declared action without a consumer (prune) / omission (S2 active-only) / step input without a
    producer (P6 anchors, HH-037 — caught only by the (a2) lens, by no mechanical check).
  - The guards below cover the mechanical subset only. Semantic/omission cases warrant a periodic
    adversarial audit (Codex survey; see process-backlog).

### R1 mechanical guards (`validate` unless noted; partial)

Every guard code `validate` can emit beyond the basic file/schema checks is listed here
(`CHECK_DOC_CONSISTENCY` enforces that). E = a row of the typed-edge registry
`tools/lib/edge-model.mjs` (HH-075: one generic checker).

| Code | Level | Checks |
|---|---|---|
| `GATE_DEAD_CONFIG` (E) | warn | every core/gates.yaml param has a consumer |
| `CORE_MODEL` | error | loop/routing/gates parse under the formal parser + strict schema; fail-closed on parse/schema/version errors |
| `PHASE_CONSISTENCY` (E) | error/warn | loop phase_gate evidence ↔ phase artifacts (HH-036) |
| `STEP_CONSISTENCY` (E) | error | depth-mode required_steps ↔ defined steps (HH-037) |
| `TOOL_DOC_CONSISTENCY` (E) | warn | CLI subcommand ↔ material |
| `CHECK_DOC_CONSISTENCY` (E) | warn | validate guard code ↔ this table |
| `NOTE_FIELD_SCHEMA` (E) | warn | knowledge.yaml note-field header ↔ data |
| `REF_PATH_EXISTS` (E) | warn | a repository path (file with extension, or directory with trailing slash) named in entry points / core loop-routing-gates / checklists / workflows / launch commands exists. Globs and placeholders are skipped; ledgers and the anti-pattern catalog are out of scope (they cite retired paths as history) |
| `AMEND_LIFECYCLE_CONSUMER` (E) | error | Pending/Approved section contract ↔ its routing / review-only / tool consumers |
| `CONTRACT_DEAD_FIELD` | error | core/contracts.json leaf ↔ runtime consumer |
| `LEDGER_ID_UNIQUE` | error | duplicate ids a line-merge can create (anti-patterns AP ids, tasks/INDEX.md task ids). Uniqueness only: a renumber that leaves old citations pointing elsewhere is NOT detected |
| `CONFLICT_MARKER` | error | unresolved merge-conflict markers in active materials (HH-044) |
| `PROVISIONAL_NOTE_ID` | error | deprecated provisional note ids on main; migrate at the producer with `next-id` (HH-064) |
| `NOTE_TEXT_LENGTH` | warn | an active note created on/after the contract's `since` date whose text exceeds the soft maximum (core/contracts.json `note_text_soft_max`; older notes are grandfathered) (HH-082) |
| `NOTE_ID_CONTINUITY` | warn | a note id published on origin/main is missing locally (rename / unratified delete). Runs when origin/main is an ancestor; archived notes keep their id (HH-064) |
| `KNOWLEDGE_READER` | error | knowledge manifest + every declared ledger: parse, schema, duplicate id, project ownership, playbook↔leaf references, orphan ledger. The repository in tools/lib/knowledge.mjs is the only read/write path (atomic writes) |
| `GOV_REGISTRY` | error | governance registry schema + semantics: duplicate id, status ↔ attestation, supersedes references, body mapping, orphan body. The registry is the HH lifecycle canon |
| `GOV_VIEW_DRIFT` | error | amendments.md is byte-identical to the view generated from registry + bodies + view-template (catches hand edits and staleness) |
| `AMEND_RATIFIED_BY_EMPTY` | warn | an Approved HH without attestation fields. Detects a MISSING record, never a forged one (HH-042/046) |
| `EPOCH` | error | every domain (governance, knowledge) declares a known epoch; unknown/future fails closed. `migrate-canon --check/--apply` reports closure and advances one safe step only when green |
| `ARCH` | error | (1) direct fs/git access naming a canonical domain path outside its repository module; (2) Markdown-table/state readers (re-introduction tripwire). Intentional crossings carry `HH:ARCH-ALLOW reason="..."`. Access through a variable is NOT detected (tripwire, by design) |
| `PLATFORM_COMPACTION` | error | Claude/Codex compaction adapters, shared runtime modes, compact prompt, Windows commands are complete |
| `HOOKS_PATH` | warn | core.hooksPath is tools/hooks; otherwise the tracked pre-push gate is INERT in this clone (session-bootstrap §3c) |
| `NESTED_HOOKS_MISSING` | warn | nested layout (a git repo above the root) whose host .claude/settings.json is missing or does not reference compaction-hooks.mjs (session-bootstrap §3b) |
| `DISTILL_CAPTURE` | warn (`finish` / `verify --base`) | an hh-record reports rework but its commit adds no durable material (note_adds / anti-patterns / process-backlog / amendment) (HH-043) |
| active-scan | error (warn under tools/) | retired terms in active materials outside declared `HH:ACTIVE-SCAN-ALLOW` regions |

The hh-record checks (schema, note attribution, declared note adds, evidence rows) run in `finish` /
`verify --base`, not in `validate` (HH-081).

## R2 — Schema consistency
- [ ] Framework changes map authority/producer/consumer/docs/templates/compatibility/tests in the hh-record `contract_impact` rows; each `framework_check` row maps explicitly to R2.
- [ ] Distill steps (D1-D7) numbering matches core/loop.yaml / distill.md.
- [ ] Anti-pattern schema matches between distill.md D6 and assets/ai/anti-patterns.md.
- [ ] Counter rules match between core/knowledge.yaml header and evaluate.md / distill.md.

## R3 — Mechanical integrity
- [ ] `node tools/hyperhelix.mjs validate` passes with zero errors (L1 Structure).
- [ ] `node tools/hyperhelix.mjs contract-doc --check` and the `finish --message` preflight (or `verify --base <ref>` in pre-push / CI) pass; L2-L4を未実行のまま全体整合を主張しない。
- [ ] Framework path changes have complete evidence anchors; exact searches classify every hit and tracked tests include a positive detector fixture where applicable.
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

## Branch context (shared by R6 + R7d-ROI + external-value gate — HH-021/025/038/056)
> On `main`, framework development IS the purpose → ROI / anti-self-purpose **enforcement is STOPPED**
> (user-directed improvement, /cycle, /sync; the HUMAN decides when to switch to a project branch;
> constitution axiom-5 "improvement exists to make artifacts" still holds). This covers R6, **R7d-ROI**,
> AND the HH-048 external-value gate (HH-052). **EXCEPTION (HH-056): R7d-frame (the adversarial-analogy
> / stirrup detector) is main ACTIVE** — it is the one anti-lock-in lens that must run on main, because
> frame fixation is most dangerous during self-referential framework work; only its ROI half was ever
> the reason HH-038 stopped R7d. On `project/variant`, real project work is expected → all **ACTIVE**.
> **Measurement continues on both branches; only enforcement differs.** (HH-021 CONTEXT-DEFERRED is
> superseded by HH-025 STOPPED.)

## R6 — Anti-self-purpose (HH-018/021/025; branch context above)
- [ ] State per branch context: main → record `n/a (main: R6 STOPPED)`. project/variant → ACTIVE (below).
- [ ] ACTIVE only — Record the consecutive framework-only cycle count as a NUMBER, not prose (AP-004).
- [ ] ACTIVE only — Enforcement: if the last 3 cycles were all framework-only, the next task MUST be a real task (recorded).
- [ ] ACTIVE only — If no external-artifact task ran recently, R4 is marked "unverified (awaiting real task)".
- [ ] Review-only records (HH-023/068) do NOT add to the framework-only count (session-owned repository write-set is empty, not a cycle). Pre-existing/verified-foreign dirtiness alone does not count; any owned write is a real task, and missing/ambiguous ownership evidence fails closed per review-only.md.

## R7 — Systemic value / absence / frame (HH-026)
Catches what R1-R6 structurally miss — omission, cost-without-value, frame lock-in.
Stance: "what would a first-time reader find absurd?" Each subcheck outputs a NUMBER or
fixed-form evidence, never satisfiable prose (AP-004). Measurement is tool-backed: run
`node tools/hyperhelix.mjs cost-report` first; record its output in the /cycle brief.
Cadence: R7a/R7b/R7f every /cycle; R7c/R7d-ROI/R7d-frame/R7e every 5th review OR when a mandatory-read
material exceeds 300 lines.
**How to count "every 5th review" (HH-080)**: this review's ordinal = `counters.review_ordinal` + 1
(the producer is `bump --review`, which applies the +1 at this review's own D7; high-water on merge,
HH-057 semantics — the absolute value has no cross-branch meaning). Run these lenses when that ordinal
is a multiple of 5, and record the ordinal you computed as a NUMBER. (The 2026-08-23 manual derivation
from prior /cycle records is retired — it implemented alternation, not 1-in-5, and broke when records
were archived.) The "必読" source of truth is the reading-order tiers (entrypoint.md, HH-059).
- [ ] R7a Fixed cost: record cost-report's startup total and `/cycle` mandatory total. Included files carry reasons. The ratchet gauge is the STARTUP-READ character total = always-read (`last_always_read_chars`, HH-073) + index-read heads (`last_index_read_chars`, HH-082 A: amendments.md before the Pending heading; knowledge.yaml before `notes:`). `last_always_read_lines` is recorded alongside. Only `/cycle --write-baseline` writes these baselines. Plain cost-report is read-only. A mandatory-read material >300 lines without index is a finding; tasks/ stays search-excluded.
  - **Ratchet (HH-050/073, `core/gates.yaml convergence_ratchet.always_read_streak_k`)**: judged on the startup-read CHARACTER total — if it rose ▲ for K consecutive /cycle (read the trend from prior /cycle records), this /cycle MUST run a D5 slim BEFORE adding any startup-read text. Slim where the growth is: always-read materials, or the index-read heads (index titles over 120 characters, digest duplication, the knowledge.yaml header). Transition (HH-073 item 3): a K-streak in always-read LINES also fires until characters have judged 2 /cycle; the /cycle that observes that demotes lines to information-only by deleting this sentence. Record the streak length (number, both units during the transition) and the slim done, or "streak < K".
- [ ] R7b Unindexed bulk: cost-report's R7b list. Any entry (mandatory-read, >300 lines, no index) = finding → propose an index/tiering.
- [ ] R7c External value (every 5th / on trigger): for the batch, record cost AND one concrete external-value signal (artifact adopted downstream / future cost reduced / human intervention replaced). No identifiable external value for the cost = finding (recorded on main too; R6-STOPPED removes enforcement, not measurement).
  - **External-value gate (HH-048; main exception HH-052, `core/gates.yaml external_value_gate.cycle_interval_n`)**: every N /cycle, a real-project CONSUMPTION task (project/* branch, exercising the framework) should have run since the last one, with its external-value signal recorded. Per Branch context (above): **main → STOPPED** — record the /cycle count since last consumption as MEASUREMENT ONLY; do NOT mark R4 (the human decides when to switch to a project branch, same as R6/R7d; HH-025/038/052). **project/variant → ACTIVE** — if no consumption task ran within N /cycle, mark R4 "unverified — awaiting real-project consumption". Operationalizes axiom-5 without contradicting main's framework-dev purpose.
- [ ] R7d-ROI Self-reference / ROI (every 5th / on trigger): DELEGATED to the external-value gate (R7c / HH-048/052) — real-project application and ROI verification are measured there, NOT here. Record `n/a (delegated to R7c external-value gate)`. Per branch context: main → STOPPED (single authority = external_value_gate); project/variant → ACTIVE via R7c. (HH-056 split R7d: ROI half lives in R7c.)
- [ ] R7d-frame Adversarial analogy / stirrup detector (every 5th / on trigger; HH-056, supersedes HH-038 for the frame half): **main ACTIVE** (the one lens NOT stopped on main — frame lock-in is most dangerous during self-referential work). State fixed-form (AP-004): (a) the competing frame that would REJECT this design, (b) a simpler / different-category way to build it, (c) the property the current design lacks under (a), (d) whether an existing external tool / batch runner / external app could REPLACE or streamline a hand-built mechanism (validate / sync / note ledger / search) — form: target mechanism → candidate external tool → lines/steps saved (NUMBER), or "no replacement candidate". Do NOT use "unapplied to a real project / ROI unproven" as a rejection reason (that is R7d-ROI / R7c's domain). Output at most ONE simplification/restructuring candidate, NOT an HH addition (the stirrup is subtraction, not accretion).
  - **別モデル委託を推奨 (HH-056, 2026-07-08)**: delegate (a)-(d) to a DIFFERENT-MODEL agent via a task WO (agent-roles.md) — frame lock-in is the orchestrator's own blind spot, and a same-model self-critique shares it; an independent model's perspective breaks it best. Recommended, not mandatory: if delegation is unavailable, the orchestrator runs it and records that. The delegate answers fixed-form (a-d); the orchestrator adjudicates the finding.
  - Per branch context (above): main → **ACTIVE** (do NOT record STOPPED); project/variant → ACTIVE.
- [ ] R7e Accumulation inventory (every 5th / on trigger): list mandatory costs added since last R7, each with a value-justification (measured where possible) and a re-justification date. Record cost-report's CLI-reachable tooling surface (included files / lines / top-level functions) and its explicitly excluded `tools/**/*.mjs`; this is observation only and adds no threshold. "正当" without evidence is rejected.
- [ ] R7f Self-measurement: record R7's own overhead (cost-report run + R7 record lines). If R7 itself exceeds budget, that is a finding (lower the cadence).

## R8 — Consolidation / redundancy (HH-040)
Catches the ACTION-side gap R1-R7 miss: local improvements accrete into redundant, superseded,
or bloated rules with no GLOBAL cleanup. Measurement is tool-backed: run
`node tools/hyperhelix.mjs consolidation-report` first; record its output in the /cycle brief.
Each subcheck outputs a NUMBER or fixed evidence, never satisfiable prose (AP-004).
Default is bounded (note candidates <=5, backlog decision rows <=5). Use `--full` every 5th
review (ordinal per R7's HH-080 cadence note above),
on explicit full sweep, >300-line/ratchet trigger, or same-problem-twice; it emits all
candidates. R8b/R8d are evaluated in that full sweep.
Authority for the consolidation workflow itself: `assets/workflows/consolidation.md`.
- [ ] R8a Redundancy clusters: decide each row in the bounded decision set (duplicate rule / stale deprecated / note-merge / bloat) as DRY-to-one-authority + pointer, or "accept (reason)". In `--full`, decide every emitted cluster. An emitted row without a decision = finding.
- [ ] R8b HH-set supersession (every 5th / on trigger): for each report supersession or lifecycle-drift cluster, propose collapse to ONE rule + historical footnote, or the correct section move, via an amendments.md HH. Mass-consolidation / history rewrite = HUMAN GATE (routing). Output candidate HH ids, not prose.
- [ ] R8c Backlog burn-down (**rows marked `dest:main` are OUT of this branch's burn obligation and need no re-justification — `consolidation-report` prints the burnable-here count; the ratchet compares burnable-here numbers. Authority: consolidation.md**): each emitted decision row (default priority/oldest top 5; `--full` all open rows) is PROCESSED or RE-JUSTIFIED with a date + root-cause class. An item carried >3 cycles without re-justification is forced into the next full sweep. Net open count is still measured across ALL rows and recorded in `last_backlog_open_count` only with `--write-baseline`; growing = finding.
  - **Ratchet (HH-050, `core/gates.yaml convergence_ratchet.backlog_streak_k` / `backlog_burn_m`)**: if the open count rose ▲ for K consecutive /cycle (read the trend from prior /cycle briefs), this /cycle MUST PROCESS >= M open items BEFORE any net add. Record the streak length (number) and items burned, or "streak < K". A gauge that only measures is ceremony; the ratchet makes rising monotonicity self-correcting.
- [ ] R8d Cross-task emergent pattern (every 5th / on trigger): tally the root-cause `class:` of recent backlog items — **rows marked `dest:main` are EXCLUDED from the tally, exactly as they are from R8c's burn obligation** (authority: consolidation.md `dest:main` section; wired 2026-08-30 /cycle ordinal 15, having been declared for both gauges in 2026-08-24 but implemented only for R8c) — a class recurring >=K (default 3) = mint ONE consolidation task (cross-task same-problem-twice). Record BOTH counts (all-rows and burnable-here), not prose.
  - **Exit condition (2026-08-23 /cycle, measured)**: if a consolidation task for that class ALREADY ran and the count did NOT drop, do NOT re-mint — the lens has no exit otherwise. (Measured: `enforcement-gap` fired at 8, TASK-Project001-20260821-016 re-justified all 8 without closing any, and it fired again at 7.) Instead do ONE of: (i) PROCESS >= 2 rows of that class this cycle (close or drop with a reason), or (ii) record that the class is legitimately large — a real standing property of the framework, not an accretion — with the reason. Re-minting a task whose predecessor changed nothing is ceremony.
- [ ] R8e Self-measurement (R7f sibling): record R8's own overhead. If the consolidation ceremony costs more than the bloat it removes, LOWER the cadence — an anti-bloat lens that bloats is self-defeating.

## Completion
- [ ] Per-check results (R1..R8, pass or finding) recorded in the brief — a bare "R1-R8 done" claim is not evidence.
- [ ] Findings routed via Distill D1-D7, or "no issues" recorded.
- [ ] Note prune (core/gates.yaml human_actions — a HUMAN action at /cycle): glance low-strength / stale notes; archive any (set state: archived), or record "no prune". This is the sole live consumer of the declared prune action; it is a glance, not a mandatory edit.
- [ ] D5 slimming trigger (HH-036 — D5 is NOT a per-standard-task burden; this /cycle glance IS its trigger): glance whether any base material grew or duplicated since the last /cycle (cost-report R7e helps); slim it (D5), or record "no slimming needed". Satisfies R5's "D5 ran recently".
- [ ] counters.last_framework_review set to the current counters.task_index (core/knowledge.yaml).
- [ ] Next review trigger recorded.
