# Phase Gate Checklist

Run BEFORE starting any phase (core/loop.yaml `phase_gate`).

## Steps

1. [ ] Classify the task: new or existing.
   - Existing: it is in flight in this session (its claim token and draft hh-record are in hand); a committed task's record is in `git log` (HH-081).
   - New: run `node tools/hyperhelix.mjs brief --date YYYYMMDD ...` to claim `TASK-<encoded-branch-slug>-YYYYMMDD-NNN` (or `--task GH-<n>` in the framework repo). No task file is written.
     **Confirm the claim (AP-016)**: the `Claimed …` line and the `claim token: …` line are visible (never filtered away). A failed/ambiguous claim = stop and pick another id — full protocol: assets/workflows/concurrency.md §2.
   - Every depth, micro included, records its outputs in the commit body's hh-record (assets/workflows/git-conventions.md Commit-body record).
2. [ ] Decide the starting phase. When in doubt, choose the earliest safe phase.
3. [ ] Verify artifacts of all earlier phases exist and meet exit conditions.
   - Empty templates, unfilled tables, unchecked boxes are NOT evidence.
4. [ ] Record the gate decision (starting phase, evidence check result, fallback target, reason) in `phase_evidence.search`.
5. [ ] If evidence is missing, fall back to the earliest incomplete phase.

## Gate table

| Starting phase | Must be complete | Required evidence |
|---|---|---|
| Search | — | task request |
| Plan | Search | requirements, survey notes, unknowns list, retrieved-materials |
| Execute | Search, Plan | work plan, task-list, acceptance criteria, validation plan, change-list |
| Evaluate | Search, Plan, Execute | implementation, execution log, failure-case-log |
| Distill | Search–Evaluate | verification results |

> Conditional evidence (loop.yaml `phase_gate.conditional_evidence`, HH-036): change-list / risk-list are required only for implementation tasks; failure-case-log only when EX-5 exploration occurred. A task that legitimately lacks one records why.
