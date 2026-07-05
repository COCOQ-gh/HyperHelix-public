# Exception Handling Workflow

Decision flow when the normal loop is obstructed (referenced from core/loop.yaml `exceptions`).

```
problem during a task
  ├─ execution is blocked            -> EX-1
  ├─ requirements / scope changed    -> EX-2
  ├─ task cannot continue            -> EX-3
  ├─ not enough time                 -> EX-4
  └─ solution unknown, trial needed  -> EX-5
  (none of the above -> continue the normal loop)
```

## EX-1 — Block

1. Log the block (content, time, attempted fixes) in the execution log.
2. Classify:
   - **Transient** (external dependency, retryable) -> retry max 3 times; wait 1 / 5 / 15 min.
   - **Fundamental** (a premise broke) -> return to Search S1; update requirements, then re-plan.
   - **Unsolvable** (task itself impossible) -> EX-3.
3. On retry exhaustion: log it, return to Search S1.

## EX-2 — Scope change

1. Append the change to the brief's requirements (keep prior content; never erase history).
2. Classify impact:
   - **Structural** (task structure/order changes) -> redo Plan P1-P6 (incl. P5 validation-plan and P6 change-list).
   - **Criteria-only** (only the bar moves) -> redo P3 (and P6 if the change-list anchors shift).
3. Resume Execute under the updated acceptance criteria.

## EX-3 — Abort

1. Record in the brief: state at abort, done/undone lists, abort reason, resume conditions.
2. Run light Distill triage: D2 (what does this abort teach), D3 (how to not abort for this reason again), D5/D6 (needed or not, with reason).
3. If the lesson is durable, mint a material (D4/D7 still apply to the triaged items).

## EX-4 — Time pressure (light mode)

| Phase | standard/full | light | Risk accepted |
|---|---|---|---|
| Search | S1-S3 | S1 only | missed existing assets, reinvention |
| Plan | P1-P6 | P1, P3, P5, P6 | unhandled risks, missed dependencies |
| Execute | E1-E3 | E2, E3 | coarse changes, hard rollback |
| Evaluate | V1-V3 | V1, V2 | unverified intent fidelity |
| Distill | D1-D7 | D7 + triage of D2/D3/D5/D6 | lessons not assetized |

The columns are `core/loop.yaml` depth modes (the authority): "standard/full" = the full
step set; "light" = `depth_modes.light` (its `minimum_outputs`). micro is smaller still
(HH-022) and needs no EX-4 shortcut. Rules: record the reason for light mode in the brief;
backfill the skipped distill steps in the next unhurried task. Light mode is forbidden for
the cases listed in `core/loop.yaml depth_modes.light.forbidden_when`.

## EX-5 — Exploration loop

1. Plan defines: hypothesis, trial, expected result, check method, cutoff condition.
2. Execute the trial; record the verification result.
3. On failure, append to the failure-case log: hypothesis / trial / expected / actual / reason / lesson / next decision.
4. The NEXT plan must read the failure-case log as input.
5. No new hypothesis, or cutoff reached -> back to Search S2/S3. Still stuck -> EX-3.
6. At Distill, compress the failure-case log into assets/ai/anti-patterns.md.

Rules: failures are artifacts — never delete unsuccessful trials; when retrying a
past failure, state the diff from the previous attempt; anti-pattern entries
optimize for retrieval efficiency, not user readability.
