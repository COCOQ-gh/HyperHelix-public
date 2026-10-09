# Task-List Schema

Purpose: define the Plan-phase `task-list` artifact. "TODO list" is an
accepted user-facing alias; the framework-facing name is `task-list`.

The task-list is not a loose note. It is the executable checklist that connects
Plan P1/P2/P3 to Execute E1/E2 and Evaluate V2.

## Required Shape

The task-list is a working artifact of the session (HH-081: no task file is written). Keep
it wherever the session tracks work — a table in chat, a WO, a todo tool — in this shape.
The commit's hh-record carries its outcome: one `phase_evidence.plan` line naming the units,
and one `evaluate` row per acceptance check.

| Field | Required | Meaning |
|---|---|---|
| id | yes | Stable row id within the task, e.g. `TL-001`. |
| order | yes | Integer execution order after dependency sorting. |
| title | yes | One minimal unit of work. |
| status | yes | One of the fixed status values below. |
| depends_on | yes | ARRAY of task-list ids, e.g. `[TL-001, TL-002]`; use `[]` when there is none. |
| acceptance_check | yes | Observable check that proves this unit is done. |
| evidence | yes | Evidence reference after completion, or `pending`. |

Optional fields are allowed only when they reduce ambiguity for the current
task, for example `risk`, `owner`, or `rollback`.

## P6 Mechanical Change-List (HH-035)

For implementation tasks, Plan also produces a mechanical change-list — a COMPANION
table to the task-list (one row per edit) so Execute applies without discovery:

| Field | Required | Meaning |
|---|---|---|
| unit | yes | task-list id this edit serves (e.g. `TL-001`), or `-`. |
| target | yes | file path to edit. |
| anchor | yes | a UNIQUE existing string/line to match (the edit point), or `new file`. |
| change | yes | the new content, or the transform to apply at the anchor. |

> 英日対応: `target` = 対象ファイル / `anchor` = 一意の旧テキスト(`new file`) / `change` = 新内容・変換。

A unit whose target/anchor cannot be resolved is NOT ready for Execute — return to
Search S4 for the missing anchor (HH-037: P6 composes from S4, does not re-investigate),
or route a genuine unknown to EX-5/spike. Non-editing tasks (spike/review) omit it.

## Status Vocabulary

| Status | Meaning | Required Extra Evidence |
|---|---|---|
| todo | Planned and not started. | none |
| doing | Currently being changed or verified. | at most one row may be `doing` |
| blocked | Cannot proceed under the current plan. | blocker and resume condition in Execute log; handle via EX-1 if persistent |
| done | Acceptance check passed. | evidence must point to the check/result |
| deferred | Deliberately moved out of this task. | reason and destination/follow-up |
| canceled | No longer valid because scope or plan changed. | reason and replacement, if any |

## Transition Rules

- `todo -> doing -> done` is the normal path.
- `todo|doing -> blocked` when EX-1 applies.
- `todo|doing|blocked -> deferred` only when scope or time constraints justify it.
- `todo|doing|blocked -> canceled` only after EX-2 changes the plan.
- `done` is terminal unless Evaluate later fails; then reopen as `doing` and
  record the reason in the execution log.
- Status changes must be incremental: update the task-list as each unit changes
  state, not only at task end.

## Completion Rules

A task-list row may be marked `done` only when all are true:

1. The unit's acceptance_check has been run or explicitly judged not applicable.
2. The result is recorded in Execute or Evaluate artifacts.
3. The evidence field points to the result, command, diff, file, or brief row.

If the acceptance_check is skipped, the row cannot be `done` until the skip is
recorded under Evaluate skips with reason, residual risk, and fallback check.

## Relationship To Other Artifacts

- P1 creates rows by decomposing the task into minimal units.
- P2 sets `order` and `depends_on`.
- P3 fills `acceptance_check`.
- E1/E2 update `status` and `evidence`.
- V2 checks that every non-deferred/non-canceled row satisfies its acceptance_check.
- D7 does not update the task-list except for recording deferred follow-up
  lessons if the task ends early.
