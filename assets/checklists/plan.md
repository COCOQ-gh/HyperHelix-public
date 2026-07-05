# Plan Checklist

## Preconditions
- [ ] Search artifacts complete (phase gate).

## P1 — Decompose
- [ ] Units are minimal: independently verifiable and rollbackable.
- [ ] No unit bundles unrelated changes.
- [ ] Task-list rows follow assets/workflows/task-list-schema.md.

## P2 — Order
- [ ] Dependencies identified; execution order set.
- [ ] Each task-list row has stable id, order, status, depends_on, acceptance_check, and evidence.

## P3 — Acceptance criteria
- [ ] Each unit has an observable completion condition and a check method.
- [ ] Every non-deferred/non-canceled task-list row has an acceptance_check.
- [ ] Recorded IN the task-list `acceptance_check` column — no separate completion-condition table (brief lightweighting L1; the column is the single source). The `acceptance-criteria` artifact named in loop.yaml/phase_gate IS this column, not a separate document.

## P4 — Risks (conditional — 該当時; HH-036)
- [ ] Risks listed with countermeasures WHEN the task has material risk; a low-risk task records "no significant risk" instead. risk-list is a conditional artifact, not a mandatory one (consistent with standard.required_steps omitting P4).
- [ ] Unknown-solution work planned as exploration loop (EX-5) with a cutoff condition.

## P5 — Validation plan (BEFORE any edit)
- [ ] Check types chosen per core/routing.yaml `validation.by_change_type`.
- [ ] Mixed-type tasks: classify PER UNIT; the task's validation set is the UNION of each unit's change-type checks (the brief's single `<type>` is shorthand — record per-unit types when they differ).
- [ ] Anticipated skips recorded with reason and residual risk.

## P6 — Mechanical change-list (BEFORE Execute; HH-035)
- [ ] Each Execute unit resolved to a mechanical change: target file + exact anchor (existing text/line to match) + new content or transform.
- [ ] Execute will APPLY this list, not discover. P6 COMPOSES the change-list from the S4 target-state survey (HH-037); it does not re-investigate. A unit whose target/anchor cannot be resolved is not ready — return to Search S4 for the missing anchor, or route a genuine unknown to EX-5/spike.
- [ ] (Discovery surfacing mid-Execute = a P6 gap → E4 returns to Plan.)
- [ ] **Capability-addition wiring gate (HH-039)**: if this change ADDS a tool subcommand, a validate check, a knowledge.yaml schema field, or ratifies an HH, the change-list MUST also include the edits that wire its CONSUMERS — the materials / procedures / enumerations that reference it (e.g. new subcommand → README + the checklist that invokes it; new validate guard → framework-review R1; new note field → D7 procedure). L1 validators (TOOL_DOC_CONSISTENCY / CHECK_DOC_CONSISTENCY / NOTE_FIELD_SCHEMA) enforce the mechanical subset; this gate covers the rest.

## Exit
- [ ] Artifacts present: work plan, task list, acceptance criteria, risk list, validation plan, mechanical change-list.
