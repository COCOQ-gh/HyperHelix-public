# Execute Checklist

## Preconditions
- [ ] Plan artifacts complete (phase gate).
- [ ] Execute is MECHANICAL application of the Plan's change-list (P6 / HH-035): apply each unit at its resolved anchor. If you must investigate WHAT or WHERE to change (not just apply), that is a Plan gap — stop and return to Plan via E4.
- [ ] Parallel-S/P freshness (HH-076): every P6 anchor still resolves uniquely at current HEAD (a prior task's Execute may have rewritten it); stale anchor -> back to S4. Disjointness gate per plan.md P6 / concurrency.md §8 L1.

## E1 — Minimal units
- [ ] One minimal unit changed at a time; unrelated changes not bundled.

## E2 — Verify per change
- [ ] Each change checked against its acceptance criterion before the next.
- [ ] Materials applied to each artifact recorded in the task record (feeds D7 / failure attribution).

## E3 — Record
- [ ] Execution log updated (action, result, notes).
- [ ] Exploration failures logged in the failure-case log (hypothesis / trial / expected / actual / reason / lesson / next).

## E4 — Rework / judgment-error gate

When rework or a judgment error is detected during Execute, STOP and fix the
root cause BEFORE continuing. Do not queue the fix — apply it immediately.

- [ ] **Detection triggers**: activate this gate when any of the following occurs
  - Rework (rewriting or re-implementing code already written)
  - Premise error (Search/Plan assumption contradicted by reality)
  - Unnecessary work (producing an artifact that turns out unused)
  - Repeated judgment error of the same kind (2nd+ occurrence)
- [ ] **Root-cause investigation**: identify in one line why the error occurred (insufficient information / missed check / unreferenced pattern / wrong granularity)
- [ ] **Immediate fix**: if the cause is a gap in Search/Plan procedures, update the checklist / anti-pattern / note IN PLACE. Do not queue to TODO § X
  - [ ] **Delegated Execute**: an executor cannot edit core/assets/tasks (agent-roles §2). When E4 fires in a delegated unit, the executor returns the material-fix to the ORCHESTRATOR (who owns those files), who applies it before resuming — the fix is still immediate, just routed to the layer that may edit.
- [ ] **No rework** → record "no rework" explicitly (cannot be skipped)

## Exceptions
- [ ] Blocks, scope changes, aborts, time pressure, exploration handled per assets/workflows/exception-handling.md.

## Exit
- [ ] All planned units done or explicitly deferred; execution log and failure-case log current.
