# Concurrency — Parallel Sessions on One Branch

Multiple orchestrator sessions may run tasks on the SAME branch at the same time
(e.g. one delegating to Codex while another plans). The loop is per-task and
session-local; this workflow makes every shared-state write collision-free so
parallel work never disrupts the loop. Ratified by HH-015. The cross-BRANCH model
in git-conventions.md is unchanged; this governs same-branch multi-session work.

## 1. Invariant
No two sessions write the same authoritative cell as an absolute value. Shared
state changes by COMMUTATIVE operations (sum / max / append) so any merge order
yields the same result. Then git-merge order never matters and no global lock is needed.

## 2. Task IDs — claim, don't serialize
- IDs stay `TASK-YYYYMMDD-NNN`. NNN need NOT be contiguous; gaps are normal and fine.
- Claim the next free NNN by creating your brief. If at commit time that NNN is
  already taken (committed or another session's brief), bump to the next free NNN.
- Never edit, reuse, or stage another session's brief. A brief belongs to its
  creating session for that task's lifetime.

## 3. Counters — reconcile, never overwrite
core/knowledge.yaml integer counters update by DELTA; conflicts resolve mechanically
(the knowledge.yaml header is the counter-semantics authority):

| counter | kind | concurrent merge rule |
|---|---|---|
| task_index | accumulator (+1 / completed task) | base + Σ(each side's +1) = base + total completed |
| next_note_id | high-water mark | max(both) |
| last_framework_review | high-water mark | max(both) |
| note strength | small last-writer | ±1 nudges; collisions tolerated (re-nudge next task if lost) |
| note last_used | last-writer | newest task_index wins |
| new notes | append | merge both sides' new notes (IDs unique via next_note_id claim) |

- A session writes only its own +delta relative to the value it READ. On a git
  conflict, per cell compute `base + (ours-base) + (theirs-base)`; for marks take
  `max`; append both independently created notes. NEVER paste your stale absolute value over theirs.
- Record your deltas in the brief's D7 so any conflict is reconcilable from the brief.
- After reconciling, run `validate` before continuing.

## 4. Commit discipline (concurrency-safe)
- Stage ONLY the files this task changed, by explicit path, e.g.
  `git add tasks/TASK-YYYYMMDD-NNN.md core/knowledge.yaml <other touched files>`.
- NEVER `git add -A` / `git add .` — it captures other sessions' untracked briefs.
- One task = one commit (unchanged). "Working tree clean" applies to YOUR files
  only; another session's untracked brief is not your leftover.
- On pull/merge conflict in core/knowledge.yaml, resolve by §3, then `validate`.

## 5. Independence
- A task MUST NOT depend on another in-flight session's UNCOMMITTED state.
  Cross-session handoff is only through committed artifacts (briefs, counters).
- No phase requires a global lock; phase gates are per-task and session-local.

## 6. Single-writer operations
- The last_framework_review update is effectively single-writer: run /cycle or
  framework review when no other session is mid-Distill. A conflict means "another
  session already did it" — treat the update as idempotent (the higher value wins).

## 7. Plan-ahead pattern (orchestrator ahead of executor)

When every Execute unit of a task is delegated, the orchestrator may begin
the NEXT task's Search and Plan before the executor finishes. This eliminates
idle wait time without violating loop invariants.

### Flow

```
Orchestrator                        Executor
────────────────────────────────    ──────────────────────────────────
Task A: S → P                       (idle)
  Issue WO A (state: pending)
Task B: S → P                       WO A: pending → running → done
  Issue WO B (state: pending)       WO B: pending → running
Task A: V → D → commit              (WO B still running)
  (task_index +1 at D7)
Task C: S → P                       WO B: done
Task B: V → D → commit
  (task_index +1 at D7)
```

### Invariants

1. **D7 timing**: task_index +1 and note updates happen ONLY when V+D completes
   for that task — never at P completion. A task in "plan done, E delegated" state
   does not yet hold a task_index slot.
2. **Committed artifacts only**: the next task's S/P must read only COMMITTED
   state (§5 unchanged). A task's executor output is not visible until
   the orchestrator has verified it and committed the task.
3. **FIFO on V+D**: when multiple WOs are `done`, process V+D in issue order.
   Skipping ahead is allowed only if tasks are provably independent (different
   files, no artifact dependency).
4. **Brief delegation state**: each brief carries a `委任状態` field (see
   assets/templates/task-brief.md) so the orchestrator can resume reliably
   across context resets.

### Queue discipline

See agent-roles.md §8 for the default queue depth limit (3 in-flight WOs)
and the full-queue protocol.

## Tooling
- `hyperhelix.mjs bump --task ID [--use N-.. | --miss N-..] [--review]` applies one
  task's deltas atomically (task_index +1, optional note strength ±1 and last_used).
  Manual §3 remains the safe fallback for conflict resolution.
