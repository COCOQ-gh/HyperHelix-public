# Evaluate Checklist

## Preconditions
- [ ] Execute artifacts complete (phase gate).

## V1 — Machine signals
- [ ] Tests / lint / run executed per the validation plan.
- [ ] Framework materials changed? -> `node tools/hyperhelix.mjs validate` passes.
- [ ] Framework materials changed? -> also run framework-review R1-R3 consistency HERE at V1 (routing.yaml `framework_material` requires it) — do not defer the cross-file consistency check to Distill D4 after results are already claimed.
- [ ] Command/spec changed (`.claude/commands/**` or `tools/hyperhelix.mjs`)? -> run `node tools/hyperhelix.mjs update-codex-skill --check`; if stale, run `node tools/hyperhelix.mjs update-codex-skill` to refresh the Codex autocomplete metadata (thin skill; points back to live repo).
- [ ] Detector / validator / anchor-parser changed? Write at least one POSITIVE test (an input that SHOULD be flagged). A negative-only suite cannot catch a silent miss. Example: regex `[A-Z_]+` silently skipped `HH:D7` (digit in name) — only a positive test caught it. (HH-028)
- [ ] No unrun check is claimed as passed.

## V1-S — Secret scan (SECURITY, constitution security axiom / HH-019)
- [ ] Ran the secret scan over the staged diff (routing.yaml `validation.secret_scan`; runnable grep in git-conventions.md commit gate). NOT skippable.
- [ ] No raw credential in the diff: only env-var names (e.g. `SUPABASE_KEY`) or placeholders (e.g. `<your-api-key>`) are committed — never raw API keys, tokens, service-role keys, passwords, signing keys, or connection strings.
- [ ] A detected secret is a hard block: redact / move to env or Secrets, and rotate the key if it was already exposed (history rewrite alone does not invalidate it).

## V2 — Acceptance criteria
- [ ] Every criterion checked; result recorded per criterion.
- [ ] On failure: returned to Execute (or Plan if the plan was wrong) — not patched ad hoc.

## V3 — Human bit
- [ ] accept/reject surfaced to the human only where intent fidelity is in question.

## Note attribution (per application, HH-016)
- [ ] Application = use in a concrete artifact that has a machine check; whole-task / policy-level usage is not a strength nudge.
- [ ] For each PASSING artifact a note helped: nudge that note strength +1 at D7 (`--use`).
- [ ] For each FAILING artifact whose applied note was wrong/insufficient: nudge strength -1 at D7 (`--miss`).
- [ ] Conflicting note guidance: prefer the higher-strength / nearer note; there is no automatic conflict gate.
- [ ] **REQUIRED (HH-053)**: every note marked 適用=✓ in the brief's 取得/適用 table MUST get a `--use`/`--miss` this task (closes the retrieval→application loop). `validate NOTE_ATTRIBUTION` catches a 適用=✓ note whose last_used did not catch up to the brief's `task_index`. 取得-only notes are exempt.

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
- [ ] Verification results recorded in the brief.
