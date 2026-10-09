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

Do not maintain a second step list here. At the moment EX-4 is invoked, read the
current definitions in `core/loop.yaml depth_modes.standard`,
`depth_modes.full`, and `depth_modes.light`; those fields are the sole authority
for required steps, minimum outputs, and forbidden cases. Record the switch and
reason in the brief, explicitly record every omitted output and its accepted
risk, and backfill skipped Distill work in the next unhurried task. EX-4 cannot
override any `depth_modes.light.forbidden_when` condition. `micro` is a separate
classification (HH-022), not an EX-4 shortcut.

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
