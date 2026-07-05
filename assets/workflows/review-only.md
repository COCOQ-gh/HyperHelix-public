# Review-Only Record — lightweight "look and report" log (HH-023)

A review-only record is for a request that asks ONLY to inspect and report —
producing NO durable artifact change. It is NOT a task: it does not pass the
five-phase loop, does not increment `counters.task_index`, and does not count
toward the R6 framework-only streak. Ratified by HH-023.

This exists so "ちょっと見て" (just take a look) does not carry the same weight
as a real task or a /cycle. The single authority for review-only is this file.

## 1. Strict precondition — ZERO artifact change

A session qualifies as review-only ONLY if it changes no tracked file at all:
no code, no framework material, no task brief, no counters. The mechanical test
is an empty `git diff` / `git status --short` for tracked files at the end.

If ANY tracked file changes, it is a real task — create a brief, pass the loop,
and increment `task_index` (concurrency.md §3). There is no partial credit.

## 2. What a review-only record may contain

- The question asked and the answer/finding (in the operating language).
- Citations (`file:line`) for every claim, same evidence discipline as a survey.
- A recommendation or next-step list — but recommendations are not changes.

Record it wherever the report naturally lives (chat, an issue, a notes file
OUTSIDE the repo). Do not create a `tasks/TASK-…` brief for a review-only record;
briefs are for loop tasks and are counted.

**EXCEPTION — significant-discovery parking (HH-030).** If a finding matches a
significant-discovery trigger (`core/routing.yaml` `significant_discovery_parking`:
rule/axiom/theta touch, material contradiction or blind spot, human design insight,
or same-problem-twice), you MUST park ONE line into a durable repo file (a candidate
note in `core/knowledge.yaml`, or an `amendments.md` Pending entry if governance-level)
— it must not stay only outside the repo. That park is itself a tracked-file change,
so the session is no longer pure review-only: it becomes a micro task and `task_index`
is incremented per §3 (promotion). This reinforces §4 rather than weakening it — the
finding lands durably instead of evaporating in chat.

## 3. Promotion — the moment you act, it is a task

The instant a finding is implemented (one tracked file changes), the work leaves
review-only and re-enters the normal loop:

- Create/locate a task brief, pass the phase gate, and run the five phases.
- `task_index` is incremented at that task's D7 (never retroactively for the review).
- Durable lessons from the review are distilled in the IMPLEMENTING task's D7
  (note add / strength nudge), not in a separate review record.

## 4. Anti-escape clause (the review's own risk)

Review-only must not become a way to do framework work while dodging R6. The
guard is mechanical and absolute: **a tracked-file change is a task, full stop.**
Relabeling an edit as "review" does not exempt it from `task_index` or R6. If you
find yourself wanting to edit "just one line" under a review-only record, stop —
that is a (micro/light) task.

## 5. Relationship to R6 and CONTEXT-DEFERRED (HH-021)

- Review-only records do not add to the R6 framework-only consecutive count
  (framework-review.md R6): they are not cycles. R6 still measures real
  framework-only TASKS.
- HH-021 already defers the "next task must be real" enforcement in a
  HyperHelix-only workdir. Review-only is orthogonal: it keeps pure inspections
  off the ledger entirely, in any workdir.
