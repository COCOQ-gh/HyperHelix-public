# Evaluate Checklist

## Preconditions
- [ ] Execute artifacts complete (phase gate).

## V1 — Machine signals
- [ ] Tests / lint / run executed per the validation plan.
- [ ] Framework materials changed? -> the `finish --message` preflight (verify --staged with the hh-record) or `verify --base <ref>` (pre-push / CI) passes L1-L4. `validate` alone proves L1 Structure only and must not be reported as full consistency.
- [ ] Staged whitespace gate -> AFTER explicit staging, the CR-stripped trailing-whitespace count of ADDED lines is 0: `git diff --cached -U0 | grep '^+' | tr -d '\r' | grep -cE '[[:space:]]+$'` (POSIX class — `[ \t]` in an ERE bracket is backslash-and-t, not a tab, and silently matches every line ending in `t`). Plain `git diff --check` omits untracked files, so it is not commit-gate evidence (TASK-main-20260717-001). **Do NOT gate on the length of `git diff --cached --check` output** — in a CRLF repository it is nonzero on every commit (measured 2026-08-26; a gate that is always red is not a gate). Authority + measured numbers: git-conventions.md commit gate.
- [ ] Changed `tools/`, or a flow the e2e suite drives (`finish`, `sync`/`reflux` PR transport, `cost-report`, `consolidation-report`)? -> `npm run test:e2e` passes. CI runs it on both OSes, but L3 (`finish`, `verify`, pre-push) does not, so a local skip surfaces only on the PR. Removing or renaming a command or output line? -> search `test-e2e/` for it as well as `test/`.
- [ ] Contract changed? -> `node tools/hyperhelix.mjs contract-doc --check` passes with no generated-doc drift.
- [ ] Framework materials changed? -> also run framework-review R1-R3 consistency HERE at V1 (routing.yaml `framework_material` requires it) — do not defer the cross-file consistency check to Distill D4 after results are already claimed.
- [ ] Framework materials changed? -> the hh-record `framework_check` rows record each exact command, scope/exclusion, expected result, actual hit count, classification of every hit (`update/history-allow/unrelated`), exit code, R2 mapping, and R3 result. An unclassified hit is Fail, not Skip.
- [ ] Command/spec changed (`.claude/commands/**`, `.codex/**`, `assets/workflows/compaction.md`, or `tools/hyperhelix.mjs`)? -> run `node tools/hyperhelix.mjs update-codex-skill --check`; if stale, run `node tools/hyperhelix.mjs update-codex-skill` to refresh the Codex autocomplete metadata (thin skill; points back to live repo).
- [ ] Detector / validator / anchor-parser changed? Write at least one POSITIVE test (an input that SHOULD be flagged). A negative-only suite cannot catch a silent miss. Example: regex `[A-Z_]+` silently skipped `HH:D7` (digit in name) — only a positive test caught it. (HH-028)
- [ ] No unrun check is claimed as passed.
- [ ] **A machine signal that FAILED is classified before it is fixed** — the (a)/(b)/(c) rule lives in V2
  below and applies to V1 failures too (most failed checks surface HERE, as a red test/assert, not while
  walking the acceptance-criteria list). Measured 2026-08-24 /cycle: uptake was 0/6 tasks in the cycle after
  the rule was added, because it was reachable only by opening this file at the right section.

## V1-S — Secret scan (SECURITY, constitution security axiom / HH-019)
- [ ] Ran the secret scan over the staged diff (routing.yaml `validation.secret_scan`; runnable grep in git-conventions.md commit gate). NOT skippable.
- [ ] No raw credential in the diff: only env-var names (e.g. `SUPABASE_KEY`) or placeholders (e.g. `<your-api-key>`) are committed — never raw API keys, tokens, service-role keys, passwords, signing keys, or connection strings.
- [ ] A detected secret is a hard block: redact / move to env or Secrets, and rotate the key if it was already exposed (history rewrite alone does not invalidate it).

## V2 — Acceptance criteria
- [ ] Every criterion checked; result recorded per criterion.
- [ ] On failure: returned to Execute (or Plan if the plan was wrong) — not patched ad hoc.
- [ ] **Check the PURPOSE, not just the letter of the instruction** (2026-08-26 /cycle ordinal 9; measured):
  a criterion that the literal change satisfies but the stated GOAL does not is NOT met. If the task record
  already says "this may not work" (a recorded doubt about efficacy), that doubt is an OPEN acceptance
  criterion — resolve it, or ask the requester before reporting done. Measured: a request to delete 2 blank
  rows was applied literally while the record noted a padding loop would re-fill them; the screen never got
  shorter and the user spent a round trip re-reporting the same symptom.
- [ ] **Classify every FAILED check before fixing it** (2026-08-24 /cycle; closes the honor-based gap in
  "not patched ad hoc"): record one of **(a) the check itself was wrong** (test/assert logic, fixture, or
  expected value) / **(b) the source was wrong** (fix the root cause) / **(c) worked around** (the check was
  loosened, skipped, or its expected value was widened to make it pass). Put the letter and one line of reason
  in `phase_evidence.evaluate`. **(c) is an anti-pattern**: an expected value that stops being a constant to
  absorb a known-bad condition is the AP-025 shape — take (a) or (b) instead, or record (c) with the residual
  risk under Skips. Distinguishing (a) from (c) matters: correcting a demonstrably wrong check IS (a).

## V3 — Human bit
- [ ] accept/reject surfaced to the human only where intent fidelity is in question.

## Note attribution (per application, HH-016)
- [ ] Application = use in a concrete artifact that has a machine check; whole-task / policy-level usage is not a strength nudge.
- [ ] For each PASSING artifact a note helped: nudge that note strength +1 at D7 (`--use`).
- [ ] For each FAILING artifact whose applied note was wrong/insufficient: nudge strength -1 at D7 (`--miss`).
- [ ] Conflicting note guidance: prefer the higher-strength / nearer note; there is no automatic conflict gate.
- [ ] **REQUIRED (HH-053)**: every note in the hh-record `notes.applied` MUST get a `--use`/`--miss` this task — `finish` fails closed on an unattributed id (HH-081 successor of NOTE_ATTRIBUTION). 取得-only notes are exempt. These attribution nudges are evidence-driven and do NOT count against D7's one-discretionary-move budget (HH-077).

Worked example (moved here from the brief template, L5 — single reference, not carried per-brief):

> | ノートID | 取得 | 適用 | 適用先成果物 |
> |--------|------|------|------|
> | N-001 | ✓ | ✓ | fetch-client.ts |
> | N-002 | ✓ | — | 全体方針のみ(取得のみ) |
> | N-003 | ✓ | — | 調査時の参考のみ |
>
> fetch-client.ts のテストが通り N-001 が具体成果物に効いたら D7 で `bump --task TASK-... --use N-001`。
> 失敗し N-001 の判断が誤り/不足なら `--miss N-001`。取得のみの N-002/N-003 は strength を動かさない。

## Skips
- [ ] Each skipped check reported: what, reason, residual risk, fallback performed.

## Exit
- [ ] Verification results recorded in task record `evaluate` and `phase_evidence.evaluate`.
