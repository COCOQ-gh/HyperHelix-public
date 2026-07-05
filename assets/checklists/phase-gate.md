# Phase Gate Checklist

Run BEFORE starting any phase (core/loop.yaml `phase_gate`).

## Steps

1. [ ] Classify the task: new or existing.
   - Existing: locate its `tasks/TASK-…` brief.
   - New: copy `assets/templates/task-brief.md` to `tasks/TASK-YYYYMMDD-NNN.md`.
   - New + micro (HH-047): a brief FILE is OPTIONAL — the objective/change/validation/D7 MAY be recorded in the commit message body instead (git-conventions.md "micro commit body"). standard+ always create a file.
2. [ ] Decide the starting phase. When in doubt, choose the earliest safe phase.
3. [ ] Verify artifacts of all earlier phases exist and meet exit conditions.
   - Empty templates, unfilled tables, unchecked boxes are NOT evidence.
4. [ ] Record the gate decision (starting phase, evidence check result, fallback target, reason) in the brief.
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
