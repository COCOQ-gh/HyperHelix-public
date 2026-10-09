# Agent Roles — Orchestrator / Executor

Founded by HH-011 and merged into main. This workflow runs inside the SAME
five-phase loop, gates, and human window; it only defines WHO does what inside them.
Branch model: assets/workflows/git-conventions.md.

## 1. Roles

| Role | Invocation context | Owns |
|---|---|---|
| Orchestrator | Primary session, not invoked with a Work Order | phase gates, briefs, Search/Plan, work-order issuing, evidence re-verification, D1-D3 (analysis/proposals), D4-D7, counters (core/knowledge.yaml), amendments, commits |
| Executor | Session invoked with a Work Order | Execute units per P6 change-list; run planned V1 machine checks and report raw output; evaluate planned V2 acceptance criteria when a task-type WO is used (§3b, HH-041); nothing else |

Entry point: entrypoint.md is the single platform-neutral canon (HH-059); CLAUDE.md /
AGENTS.md are thin redirects to it. Role is determined by INVOCATION CONTEXT, not
platform: a session invoked WITH a work order = executor (scope-restricted, §2);
any primary session = orchestrator. Platform names never fix the role.

Executor model selection — **the user's `~/.codex/config.toml` default is the rule; do NOT
pin a model from memory** (2026-08-25, user-specified; supersedes the 2026-06-19 spark/5.5
split). Model names in a checklist go stale silently while the config keeps moving: the entry
here named `gpt-5.3-codex-spark` / `gpt-5.5` for weeks after the default became
`gpt-5.6-sol` (reasoning effort `xhigh`).
- **Default: omit `-m`** — `codex exec -C <repo> --sandbox workspace-write "..."` inherits the
  user's configured model and effort. This is correct for both rote and complex work.
- Pin `-m` ONLY when you have a measured reason to deviate for this one dispatch, and say
  which model and why in the task record.
- Before pinning anything, READ the current default (`~/.codex/config.toml`) rather than
  recalling it.

## 2. Hard boundaries (executor)

- Edits ONLY files listed in the work order `scope`.
- NEVER edits: constitution.md, amendments.md, entrypoint.md, core/**, assets/**, tasks/**,
  tools/hyperhelix.mjs, AGENTS.md, CLAUDE.md, .claude/**.
- Never commits, never updates counters, never writes the task brief.
- May READ framework materials for context; change authority stays with the
  orchestrator (two-layer authority is unchanged).
- May run machine-check commands as V1 when a task-type WO specifies them
  (`v1_commands` list only); no other out-of-scope shell execution.
- D1-D3 (failure analysis, proposals, improvement ideas) stays with the
  orchestrator — executor reports facts (V2 pass/fail, E4 flags), never judgment.

## 3. Work order (orchestrator -> executor; one per task-list row)

Delegation is a choice, not an obligation (HH-012): delegate only when the
executor's token savings outweigh the work-order round-trip cost; otherwise the
orchestrator does the unit directly.

```
WO <task-id>/<TL-id>
type:             implementation | survey | trial
state:            pending | running | done | rejected
effort:           low | medium | high | xhigh | max   (default per type; see table below)
token_budget:     <estimated tokens for this unit; from §10d table or explicit override>
tokens_used:      <filled on completion; estimated or measured>
delegate_decision:<delegate | direct | defer, with rate/limit reason when relevant>
limit_snapshot:   <source/confidence/remaining/reset/observed_at, or "none">
issued_at:        YYYY-MM-DD HH:MM (local)
objective:        <one minimal unit (P1)>
scope:            <editable files/dirs — exhaustive; survey/trial: read-only targets>
out_of_scope:     <explicitly forbidden targets/behaviors>
acceptance_check: <observable check (P3)>
validation:       <commands the executor must run before returning>
progress_beacon:  <emit one "[WO-BEAT] <unit>" line per completed unit/check (§9e liveness); "n/a" only for short foreground runs whose harness timeout already detects a hang>
context:          <statements/constraints the orchestrator chose to pass>
```

WO types (HH-012) and default effort:

| type | purpose | edits files? | result shape | default effort |
|---|---|---|---|---|
| implementation | an Execute unit | yes, scope only | §4 (changes + self_checks) | high |
| survey | read-only investigation (S2 / spike) | NO | claims, each with a source `file:line` | medium |
| trial | one EX-5 exploration step (hypothesis -> trial) | yes, scope only | self_checks raw output + outcome vs expected | high |
| task | full task: all E units + V1 machine checks + V2 acceptance reporting (HH-041) | yes, scope only | §4b (impl_log + v1_raw + v2_results + e4_flags) | xhigh |

An implementation WO SHOULD carry the orchestrator's mechanical change-list (P6 / HH-035:
target file + exact anchor + new content/transform) so the executor APPLIES it without
re-investigating WHAT or WHERE — this is what makes Execute delegable. If the executor
must discover the target/anchor itself, the WO was under-planned (tighten it, don't blame).

The `effort` field controls how much thinking depth and token budget the executor
allocates. The orchestrator sets it per WO; omitting it means the type default
above applies. Override guidance: use `low` for mechanical/rote work (bulk renames,
trivial formatting); use `xhigh`/`max` for novel, ambiguous, or safety-critical units.

### 3a. WO authoring rules (measured over 6 delegations, 2026-08-24/25)

In that batch **every discrepancy an executor reported was an ORCHESTRATOR error** — a value
transcribed wrong or a document that had gone stale (an EV pair inverted against its own
design doc; `WHILE < 29` when HEAD read `< 25`; a footer `< 10` that was `< 9`; a figure whose
neutral value the implementation had superseded; a figure drawing an item the code excludes).
The implementation side contributed **zero**. These four rules turn that from luck into structure.

- **State an AUTHORITY ORDER and require dissent.** Rank the sources (design doc > HEAD > this
  WO) and write: *"if they disagree, follow the higher authority and REPORT the disagreement."*
  Without it, a wrong number in the WO enters the code silently; with it, it comes back as a
  report. This fired on 3 of 6 WOs.
- **Do not transcribe specification values or line numbers into the WO — point at where to read
  them.** Line numbers rot fastest: a file under active work moved four times in one session, so
  anchors recorded by an S4 survey were already invalid. Have the executor take anchors as
  STRINGS at HEAD. The one WO written with no numbers at all produced zero orchestrator errors.
- **When a unit's risk concentrates in ONE unknown, make step 1 "measure that unknown" and say
  what to do if it fails** ("if they cannot coexist, STOP and report — do not break either
  side"). Measured: an executor built a throwaway probe (one control button + a real keystroke
  injection), confirmed coexistence, removed the probe, and only then implemented 16 sites.
- **Require a "what I deliberately did NOT change, and why" section in the result.** It is the
  cheapest check on judgment quality: it surfaced 20 lines correctly left alone because renaming
  them would break a different contract, and a material that is only CHECKED rather than
  consumed — which changed what the shipped description had to say.
- **Parallel WOs: assign disjoint name prefixes for anything they both append to.** Two WOs given
  the same shared test file wrote into it simultaneously; the per-WO assert prefixes made the
  commit split mechanical. See concurrency.md §4 for the split itself — and note the prefix is a
  CLASSIFICATION aid, not a separation guarantee (git still fused the appends into one hunk).
- **State where results go**: "report in your final reply; if you need a scratch file, put it under
  <scratch dir>" — otherwise an executor may create a report file at the repository root, which a
  second parallel WO can then overwrite.

### 3b. Task-type WO (HH-041) — one WO covers all E units + V1 + V2 for a task

Use when delegating the full Execute + Verify block to the executor, keeping
D1-D3 with the orchestrator. Reduces round-trips from N (one per TL unit) to
1 per task. The orchestrator issues this after completing Search and Plan (P6
change-list must be fully resolved before issuance).

```
WO <task-id>/TASK
type:             task
state:            pending | running | done | rejected
effort:           xhigh (default; override with reason)
token_budget:     <sum of all unit estimates + V1/V2; see §10d>
tokens_used:      <filled on completion>
delegate_decision:<delegate | direct | defer>
limit_snapshot:   <or "none">
issued_at:        YYYY-MM-DD HH:MM (local)

# Execution units — full P6 change-list (all TL units)
units:
  TL-001: {file: <path>, anchor: <unique old text or "new file">, new_content: <transform>}
  TL-002: ...

# Scope: union of all unit scopes (exhaustive — executor edits ONLY these)
scope:  [<file/dir>, ...]
out_of_scope: [constitution.md, amendments.md, entrypoint.md, core/**, assets/**, tasks/**,
               tools/hyperhelix.mjs, AGENTS.md, CLAUDE.md, .claude/**]

# V1: commands executor must run after ALL E units complete
v1_commands:
  - node tools/hyperhelix.mjs validate
  - <test runner command, if applicable>
  - <secret scan command, if applicable>

# V2: acceptance criteria per unit (from task-list acceptance_check column)
v2_criteria:
  TL-001: <acceptance_check text>
  TL-002: ...

context: <relevant notes, constraints from S2 — what the executor needs to know>
```

E4 handling inside a task WO: if the executor detects a rework/premise-error on a
unit, it flags that unit in `e4_flags` (§4b) and CONTINUES independent units. The
orchestrator resolves the E4, updates the brief, and issues a follow-up WO for the
flagged units only. E4 recovery is local to the affected units; completed units are
not re-issued.

### 3c. Token-efficiency delegation posture (HH-054) — DEFAULT to delegating

To conserve the orchestrator session's tokens, delegation is the DEFAULT posture,
not the exception (this strengthens §3's "delegation is a choice"). The orchestrator's
token sinks are reading large materials, applying edits, and running validate — all
delegable to a separate executor session and budget.

Standard token-saving loop:

1. **S1** (requirements) — orchestrator, small.
2. **survey WO** (HH-012) — the executor READS the target material and returns the exact
   P6 anchors (target file + unique existing string per edit point) + relevant claims
   with `file:line`. The orchestrator does NOT read the large file itself.
3. **P6 composition** — orchestrator composes the mechanical change-list FROM the survey
   return (spot-checking cited `file:line`, HH-012 §5). This is authorship, kept by orch.
4. **task WO** (HH-041) — the executor applies the change-list + runs V1/V2 + reports.
5. **D1-D7** — orchestrator distills, bumps counters, commits (small).

Governance boundary — the orchestrator ALWAYS retains (never delegated):
- S1 requirement/intent judgement; V3 human-bit; D-phase judgement.
- P6 authorship for **constitution / amendments / HH** edits (governance-critical).
- D7 counter bump + the commit; spot-check of every executor return (executor reports
  FACTS only, never judgement — two-layer authority unchanged, §2).

Threshold (when NOT to delegate): if the WO round-trip cost exceeds the executor's token
savings — typically micro / 1–2-edit tasks — the orchestrator does it directly and records
the reason in `delegate_decision` (§3). Codex unavailable / erroring -> §7 degraded mode.

Complementary lever (executor-independent): keep orchestrator briefs and user-facing
output TERSE — signal, not ceremony (N-021 / HH-047). A 100-line brief is itself a token sink.

### 3d. Different-model delegation for adversarial analogy (HH-056) — R7d-frame

The framework-review R7d-frame check (adversarial analogy / stirrup detector) SHOULD be
delegated to a DIFFERENT-MODEL agent, not merely a different context of the same model.
Rationale: frame lock-in is the orchestrator's OWN blind spot; a same-model self-critique
tends to share it, so an independent model's perspective breaks it best (diversity over
redundancy). This is a survey-class WO (read-only reasoning; the delegate produces the
fixed-form (a)-(d) answer, the orchestrator adjudicates the finding — judgement is never
delegated, §2/§3-boundary). Recommended, not mandatory: if a different model is unavailable,
the orchestrator runs it and records that in the /cycle R7d-frame entry. Single authority for
the check itself: assets/checklists/framework-review.md R7d-frame.

## 4. Result (executor -> orchestrator)

```
WO <task-id>/<TL-id> result
changes:     <diff or exhaustive file list>
log:         <actions, decisions, failures — feeds E3 and the EX-5 log>
self_checks: <commands run + raw output>
open:        <questions / blockers>
```

### 4b. Task-type WO result (HH-041)

```
WO <task-id>/TASK result
type:       task
impl_log:   # per unit — one entry per TL unit attempted
  TL-001: {status: done | e4_flagged | skipped, changes: <summary>, notes: <any>}
  TL-002: ...
v1_raw:     # raw output of each v1_commands entry
  validate: <raw output>
  tests:    <raw output or "not applicable">
  secret_scan: <raw output or "not applicable">
v2_results: # per TL unit
  TL-001: {criterion: <acceptance_check text>, result: pass | fail, notes: <any>}
  TL-002: ...
e4_flags:   # empty list if none; one entry per E4-detected unit
  - unit: TL-NNN
    issue: <one-line root cause>
    blocked_units: [TL-NNN, ...]  # units that depended on this one
open: <questions / blockers for orchestrator>
```

## 5. Verification rules (orchestrator)

- Executor results are UNTRUSTED until reviewed. The executor MUST run the
  planned V1 commands and V2 criteria and return their raw evidence; a summary
  without raw command output is not evidence. `never_claim_unrun_checks_passed`
  applies across agents.
- The orchestrator MUST inspect all returned raw evidence, then independently
  re-run failed or skipped checks, checks covering high-risk changes, and at
  least one representative boundary case for each changed behavior. It MAY
  sample additional passing checks when risk warrants. It neither blindly
  re-runs every passing command nor accepts executor output without a re-check.
- V2 checks each task-list row's acceptance_check; a failing row returns the
  work order (revised) or goes back to Plan. Failures land in the
  failure-case log (EX-5 schema: hypothesis / trial / expected / actual).
- A scope violation in a result -> REJECT the whole result and log a failure
  case; never cherry-pick from a violating result.
- survey results (HH-012): adopt into S2 only after spot-checking the cited
  sources; a claim without a resolvable `file:line` source is not adopted.
- trial results (HH-012): require raw self_checks output; re-run the trial
  yourself before acting on its outcome (a trial result is a claim, not evidence).
- task results (HH-041): the orchestrator applies the common evidence-review
  and risk-based re-verification rule above to `v1_raw` and `v2_results`.
  Unexpected outcomes (e.g. validate passes on a large multi-file diff) are
  high-risk and therefore require an independent re-run and output inspection.
  E4 flags return affected units to Plan (issue a follow-up WO; §3b). A scope
  violation still triggers whole-result rejection. D1-D3 analysis remains the
  orchestrator's sole responsibility — never delegated even in task-type WOs.
- What HH-012 does NOT change: re-verification, whole-result rejection on scope
  violation, and the orchestrator's monopoly on governance all apply to every
  WO type. Wider delegation scope, not weaker trust.

## 6. Failure attribution and counters

- Only the orchestrator updates core/knowledge.yaml. Notes passed via a
  work order's `context` get strength +1/-1 only when they shaped a concrete
  machine-checked artifact, per that artifact's checks.
- Executor mistakes are process problems (loop axiom): the fix is a clearer
  work order (tighter scope, better acceptance_check), never executor blame.

## 7. Degraded mode

- Executor unavailable, or 3 consecutive rejected results on one work order
  -> EX-1: the orchestrator executes the unit directly, records the
  degradation and reason in the brief, and the loop continues unchanged.

## 8. In-flight queue and plan-ahead

- Default max in-flight work orders per orchestrator session: **3**
  (overridable by explicit user instruction; record the override in the task brief).
- "In-flight" = state `pending` or `running`. State `done` or `rejected` is not counted.
- When the queue is full, the orchestrator completes V+D on the oldest `done` WO
  before issuing a new one.
- The orchestrator updates WO state in the task brief as transitions occur.
- Full plan-ahead pattern and flow: concurrency.md §7.

## 9. Timeout and watchdog (HH-017)

Background-dispatched executor jobs can silently stall (sandbox crash, network
drop, context compaction swallowing the completion notification). The
orchestrator MUST NOT wait passively.

### 9a. Budget

Set a wall-clock budget BEFORE dispatching. Default: **5 minutes** for an
implementation WO on an established pattern (N-008 class); **10 minutes** for
survey/trial or novel work; **30 minutes** for a full-repo review survey
(R1-R7 class — measured twice at 20-30 min, TASK-20260716-009/-016).
Record the budget in the brief's Execute section.

### 9b. Watchdog check

After dispatching a background job, schedule a watchdog check at the budget
deadline (use ScheduleWakeup or equivalent). The check:

1. Read the job's output file / status endpoint.
2. Inspect `git status --short` for expected artifacts.
3. If artifacts exist → proceed to Evaluate (the notification was lost).
4. If no artifacts and no error → extend once (+5 min) and re-check.
5. If still nothing after the extension → escalate (§9c).

### 9c. Escalation

On confirmed timeout:

1. Log the timeout in the task brief (Execute section) with wall-clock elapsed.
2. Attempt ONE re-dispatch with the same WO.
3. If the re-dispatch also times out → EX-1 degraded mode (orchestrator
   executes directly).
4. Record a knowledge note if the failure mode is novel.

### 9d. Autonomous-mode guard

When operating under an autonomous-execution mandate (user sleeping), the
watchdog is MANDATORY — the user cannot intervene. Never enter an unbounded
wait. If ScheduleWakeup is unavailable, poll at the budget deadline inline
before proceeding to the next task.

### 9e. Dispatch-time hang instrumentation (HH-063)

§9a/9b are deadline-based: a job that hangs 30 seconds in still "runs" until the
budget expires. Instrument liveness AT dispatch so a hang surfaces in minutes:

1. **No fire-and-forget.** Every dispatch writes to an observable channel
   (background output file / log). Record the path + issued_at in the brief's
   Execute section.
2. **Progress beacons.** The WO carries `progress_beacon` (§3): the executor
   emits one `[WO-BEAT] <unit>` line per completed unit/check. `n/a` only for
   short foreground runs whose harness timeout already detects a hang.
3. **Liveness watch armed at dispatch.** Standard mechanism:
   `node tools/hyperhelix.mjs wo-watch <output-file> --budget <§9a seconds>`
   run in the background right after dispatching (exit 2 = stall/hang, exit 3 =
   budget exceeded while alive, exit 0 = done marker). Fallback when the tool is
   unavailable: Monitor / until-loop / inline mtime poll. **Stall threshold:
   3 minutes with no new output.** Output growth counts as liveness even
   without beacons (a forgotten beacon must not cause a false kill).

Decision rule: output/beacons flowing → still working, keep waiting within the
§9a budget. No new output ≥ stall threshold → treat as a HANG and start §9c
escalation immediately — do not wait out the remaining budget.

## 10. Effort-based capacity management (TASK-20260616-104)

The WO `effort` field lets the orchestrator right-size token spend per unit.
This is the first step toward capacity-aware task distribution across agents.

### 10a. When to set effort

The orchestrator MUST set `effort` on every WO. Omitting the field is allowed
(type default applies), but an explicit setting is preferred because it forces
the orchestrator to assess the unit's complexity at dispatch time.

### 10b. Choosing effort

| Signal | Suggested effort |
|---|---|
| Rote / mechanical change (bulk rename, formatting) | low |
| Read-only investigation with known search targets | medium |
| Standard implementation on an established pattern | high |
| Novel or ambiguous implementation, multi-file reasoning | xhigh |
| Safety-critical, correctness-critical, or complex logic | max |

Effort interacts with wall-clock budget (§9a): higher effort may need a longer
timeout. When setting `max`, consider extending the budget to 10 min even for
implementation WOs.

### 10c. Applicability

The `effort` field is an Anthropic API parameter (`output_config.effort`, GA).
When the executor is a Claude-family model (via Agent tool or future Claude
executor), the orchestrator passes `effort` directly. When the executor is a
non-Anthropic model (e.g. Codex/OpenAI), `effort` serves as orchestrator
metadata — it records the assessed complexity and informs the orchestrator's
dispatch decisions (e.g. prefer delegating `low`-effort work to save plan quota
for `high`/`max` units the orchestrator handles directly).

### 10d. Token budget estimation (TASK-20260616-105)

The orchestrator assigns `token_budget` at WO creation from the table below.
These are order-of-magnitude estimates — directional, not precise. Calibrate
by comparing against `tokens_used` actuals when available.

| effort | estimated token_budget | typical use |
|---|---|---|
| low | 5K | rote edits, bulk renames |
| medium | 15K | read-only surveys, known-target search |
| high | 30K | standard implementation, single-file reasoning |
| xhigh | 60K | multi-file reasoning, novel patterns |
| max | 120K | safety-critical logic, complex multi-step |

On WO completion (state → `done`), the orchestrator fills `tokens_used`:
- **Measured** (preferred): if the API response includes `usage.input_tokens`
  + `usage.output_tokens`, record the sum.
- **Estimated** (fallback): copy `token_budget` as the estimate. Mark with
  `(est)` so future calibration can distinguish measured from estimated.

### 10e. Session token ledger

The orchestrator maintains a running ledger in the task brief's Execute section
(or in a session-local scratch note when multiple tasks share a session):

```
Session token ledger
ceiling:        <user-set limit or "none" (default: none — tracking only)>
cumulative:     <sum of tokens_used across all completed WOs this session>
in_flight_est:  <sum of token_budget for pending/running WOs>
remaining_est:  ceiling - cumulative - in_flight_est  (if ceiling is set)
```

Update rules:
- On WO issue: add its `token_budget` to `in_flight_est`.
- On WO done: move `tokens_used` from `in_flight_est` to `cumulative`.
- On WO rejected: subtract its `token_budget` from `in_flight_est`.

The ledger is session-local metadata. It is NOT committed to the repo and does
not affect core/knowledge.yaml counters.

### 10f. Dispatch decisions based on capacity

Delegation is decided from BOTH the session token ledger and the candidate
executor's external limits (weekly/daily/project quotas, rate limits, or
provider UI remaining counters). External executor limits override session
estimates: if the target executor is close to its weekly cap, do the work
directly or choose another executor even when the local session ledger has room.

When the session has a `ceiling` set, the orchestrator uses `remaining_est` to
guide dispatch:

| remaining_est | dispatch guidance |
|---|---|
| > 50% of ceiling | normal — dispatch at the WO's natural effort level |
| 20–50% of ceiling | conserve — prefer `medium`/`low` effort; defer `max` units |
| < 20% of ceiling | critical — orchestrator executes directly (degraded §7); delegate only `low`-effort rote work |

Candidate executor external-limit thresholds:

| remaining limit for candidate executor | dispatch guidance |
|---|---|
| unknown | may delegate, but record `limit_unknown`; prefer direct for `xhigh` / `max` work when uncertainty matters |
| > 50% | normal — use the effort-based routing table |
| 20–50% | conserve — delegate only `low` / `medium` work; prefer direct for `high`+ |
| < 20% | do NOT delegate to that executor; choose another executor or orchestrator-direct (§7) |

Use the most constrained relevant window. For example, if a model has 70% daily
quota left but 15% weekly quota left, treat it as `< 20%`. Record the decision
in the WO `delegate_decision` field, e.g. `direct: executor weekly limit 15%`.

Limit sources are not equally authoritative. The orchestrator records a
`limit_snapshot` before dispatch when limit data affects the decision:

```
limit_snapshot
remaining:   <lowest relevant remaining percent, or unknown>
window:      <minute | hourly | daily | weekly | project | session | unknown>
reset_at:    <timestamp if known, or unknown>
source:      <api_header | admin_usage_api | telemetry | provider_ui | user_report | oauth_internal_experimental | unknown>
confidence:  <measured | inferred | user_report | stale | unknown>
observed_at: <timestamp, or unknown>
```

Source priority:
1. Use provider-published measured quota or rate data first (`api_header`,
   `admin_usage_api`) when available for the relevant executor.
2. Use telemetry or usage exports to infer burn rate and remaining session
   budget. Telemetry measures consumption, not necessarily the provider's
   remaining weekly quota; record it as `confidence: inferred`.
3. Use provider UI or user reports for subscription-style counters that are not
   exposed through a stable API. Record `observed_at`; downgrade to
   `confidence: stale` when the value is old enough that the decision could
   materially change before the WO finishes.
4. Treat undocumented OAuth-backed usage endpoints as
   `oauth_internal_experimental`: disabled by default, never required for the
   standard workflow, never store OAuth tokens in repo/session logs, and fall
   back to `unknown` on auth/schema/network failure.
5. If no reliable source exists, record `unknown`; for `high`+ work, prefer
   direct execution or a smaller WO unless the orchestrator records a reason.

Freshness affects dispatch:

| confidence / freshness | dispatch guidance |
|---|---|
| measured and fresh | use the threshold table normally |
| inferred | use thresholds conservatively; avoid `xhigh` / `max` delegation below 50% |
| user_report | accept for low/medium; require a fresh report for high+ |
| stale | treat as `unknown` for high+; low/medium may proceed with `limit_stale` recorded |
| unknown | follow the `unknown` threshold row |

When no ceiling is set, the ledger is informational. The orchestrator is still
encouraged to review `cumulative` periodically and exercise judgment — a session
that has consumed 500K+ tokens should consider whether remaining work justifies
further delegation or should be handled directly.

These thresholds are guidance, not gates. The orchestrator may override them
with a recorded reason (e.g. "remaining 15% but this is the final critical WO").

### 10g. Managed Agents integration — REMOVED 2026-08-24 (/cycle TASK-Project001-20260824-006)

An OPTIONAL, never-implemented integration path (concept mapping, SSE event contract, agent
definition schema, capacity-record shape) occupied 115 lines = 19.1% of this live contract.
A contract for an unbuilt path is not a live contract; it is a design note that every reader
of §1-§9 pays for. Removed as pure subtraction (external review TASK-main-20260823-002 finding ①,
adopted; no ratification needed for a subtraction).

If Managed Agents integration is ever built, recover the specification from git history
(`git log -p -- assets/workflows/agent-roles.md`, last present at commit `8b8916b`) and
re-design it against the runtime that exists at that time — a 2026-06 contract for an
unreleased API would need re-deriving anyway.
