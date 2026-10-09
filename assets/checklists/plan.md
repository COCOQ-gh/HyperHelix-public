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
- [ ] **Host-index folding (2026-08-23 / Project001 §X①)**: if the host project keeps a delegation-ready index (e.g. `doc/project-notes/TODO.md` §0.5), a task that completes or reclassifies one of its units MUST carry the index fold (row removal / summary recount / checkbox / block→completion record / §3 line) as a P6 change-list unit in the SAME commit. Completion is NOT reportable while the index still lists the unit as open — the index is a consumer of the task result (AP-003 declare↔consume applied to project indexes; N-Project001-20260817a).
- [ ] Mixed-type tasks: classify PER UNIT; the task's validation set is the UNION of each unit's change-type checks (the brief's single `<type>` is shorthand — record per-unit types when they differ).
- [ ] Anticipated skips recorded with reason and residual risk.

## P6 — Mechanical change-list (BEFORE Execute; HH-035)
- [ ] Each Execute unit resolved to a mechanical change: target file + exact anchor (existing text/line to match) + new content or transform.
- [ ] Execute will APPLY this list, not discover. P6 COMPOSES the change-list from the S4 target-state survey (HH-037); it does not re-investigate. A unit whose target/anchor cannot be resolved is not ready — return to Search S4 for the missing anchor, or route a genuine unknown to EX-5/spike.
- [ ] (Discovery surfacing mid-Execute = a P6 gap → E4 returns to Plan.)
- [ ] **Parallel-dispatch gate (HH-058)**: before running this task in PARALLEL with another in-flight task (or dispatching executor WOs concurrently), verify the two P6 change-list target-file sets are DISJOINT (knowledge.yaml and each task's own brief excluded — those are serialized by concurrency.md §6). Overlap → serialize. Authority: concurrency.md §8 L1.
- [ ] **Contract Change Gate (add/modify/remove/migrate; supersedes addition-only scope)**: any contract, command, schema, anchor, lifecycle section, validator, or generated-doc contract change MUST inventory authority, old/new, every producer/consumer, docs/templates, legacy allowlist, forbidden live expressions, and tracked tests in the hh-record `contract_impact` rows. Retrieve N-059/N-011/N-019 as the migration bundle. A detector/validator change includes a positive test that proves the detector fires. The P6 change-list wires every listed consumer in the SAME commit; mechanical subsets remain enforced by validators.
- [ ] **Framework evidence gate**: if any path classified by `tools/lib/framework-evidence.mjs isFrameworkEvidencePath` changes, plan the exact R1-R3 commands/search scope and complete the hh-record `framework_check` rows; project code-only tasks require no extra evidence table work.

## Exit
- [ ] Artifacts present: work plan, task list, acceptance criteria, risk list, validation plan, mechanical change-list.
