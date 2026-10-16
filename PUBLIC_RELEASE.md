# Public Release Checklist

This checklist tracks the work needed before making HyperHelix broadly public.

## Adopted Publication Policy

- License: MIT.
- Publication branch: use a public-clean release line rather than exposing the full internal working history as-is.
- Task briefs: publish `tasks/INDEX.md` and a few representative briefs; reduce or omit the bulk task corpus from the public release line.
- Knowledge notes: keep HyperHelix/shared notes and representative examples; compress project-specific notes into generic public examples/playbooks.
- Project names: anonymize project-specific names in public materials as `Project001`, `Project002`, and subsequent placeholders. The mapping is kept outside the public line; placeholders are assigned in first-publication order and never reused. Files named after a project (for example project knowledge ledgers under `core/knowledge/`) are renamed to the placeholder as well.
- Refresh: the public line is regenerated from the internal development line (not merged), so its history stays free of pre-anonymization content. Each refresh is recorded in the Refresh Log below.
- Pending governance items: keep them visible as Pending, with status clearly labeled.

## Blockers

- [x] Choose and add a license.
- [x] Run a history-wide secret scan before publication. 2026-07-05 local regex scan over `git log --all -G`: no hits.
- [x] Decide whether task briefs in `tasks/` are public audit evidence or should be reduced for the public branch.
- [x] Decide whether project-specific learning notes in `core/knowledge.yaml` remain as examples or need a generic public corpus.
- [x] Run `/cycle` or an equivalent framework review until `node tools/hyperhelix.mjs validate` reports no framework-review warning. 2026-07-05 TASK-20260705-004: `validate` reports 0 error / 0 warning.
- [x] Anonymize project-specific names before publication. 2026-07-05 TASK-20260705-006: current-tree scan has no project-name hits after placeholder replacement; publish from the clean release line, not the full internal history.

## Repository Metadata

- [x] Add `SECURITY.md`.
- [x] Add `CONTRIBUTING.md`.
- [x] Add `CODE_OF_CONDUCT.md`.
- [x] Add `.gitignore`.
- [x] Add GitHub Actions validation workflow.
- [x] Add repository description and topics on GitHub. 2026-07-05: description and topics set on `COCOQ-gh/HyperHelix`.
- [x] Add a first release tag after the blockers are closed. 2026-07-05: first release tag `v0.1.0` targets the anonymized public-clean line.

Suggested GitHub description:

> A self-improving AI-agent process framework built around task loops, learning notes, human-governed amendments, and mechanical validation.

Suggested GitHub topics:

`ai-agents`, `agent-framework`, `llm`, `prompt-engineering`, `process-framework`, `governance`, `validation`, `claude-code`, `codex`

## Documentation

- [x] Update `README.md` with public-user onboarding.
- [x] Review `docs/qiita-draft.md` numbers immediately before publication. 2026-07-05: refreshed task index, HH count, backlog, always-read cost, and validate result. 2026-10-16: re-measured on the refreshed line (see Refresh Log).
- [x] Add a short "what to read first" guide if README remains too dense for new users.

## Verification

- [x] `node tools/hyperhelix.mjs validate` — 2026-07-05: 0 error / 0 warning.
- [x] History-wide secret scan
- [x] Fresh clone smoke test — 2026-07-05: local clone smoke passed with the staged public-release diff applied.
- [x] GitHub Actions green on the public branch — 2026-07-05: validation workflow passed on the public-clean branch.

## Refresh Log

### 2026-10-09 — refresh from the development line

- Source: internal `main` as of 2026-10-07 (228 commits after the first public line). The tree was regenerated and anonymized; the previous public commit remains the parent so the public history is a clean linear line.
- Structural changes carried over: `entrypoint.md` as the platform-neutral entry point, `governance/amendments/` as the structured amendment canon with `amendments.md` generated from it, `core/contracts.json` and `core/knowledge/` leaf ledgers, `tools/lib/`, `test/` and `test-e2e/` suites, and `package.json` (runtime dependencies: `yaml` + `ajv`).
- Placeholders extended to `Project005`–`Project010` for projects that appeared after the first public line. Four project knowledge ledgers were renamed to their placeholders.
- Public-only materials (`LICENSE`, `GETTING_STARTED.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, this file) were re-applied and updated for the current commands; the CI workflow now runs on `public/**` as well as `main`.
- Verification on the regenerated tree: residual project-name scan 0 hits; secret / local-path scan 0 hits; `node tools/hyperhelix.mjs validate` 0 error; `contract-doc --check` and `amendments-doc --check` current; unit suite 195 pass / 1 skipped / 0 fail; e2e suite 10 pass / 0 fail.
- Known follow-ups: `docs/qiita-draft.md` figures were not re-measured for this refresh; project knowledge ledgers are anonymized rather than compressed into generic playbooks.
- Release tag: `v0.2.0` on this refreshed line (CI verify green on ubuntu and windows).

### 2026-10-16 — public documentation update (no regeneration)

- Scope: public-facing explanation materials only (`README.md`, `GETTING_STARTED.md`, `docs/qiita-draft.md`, this file). No framework rule, tool, or governance file changed.
- `docs/qiita-draft.md`: closes the 2026-10-09 follow-up. Figures re-measured (task_index 1138, HH-000–HH-082 all Approved, process-backlog open 14, start-up read cost 59,691 characters, validate 0 error / 0 warning). Descriptions updated for the registry-based amendments canon (HH-067), character-based convergence ratchet (HH-050/073/082), approved R7d split (HH-056), honor-based governance after HH-070, commit-body task records (HH-081), edge-registry validation (HH-075), and permanent note IDs (HH-064). The validator excerpt now quotes the current code.
- `README.md` / `GETTING_STARTED.md`: note-budget wording aligned with HH-053/077, commit-body record and `finish` flow (HH-081), the pre-push hook, and namespaced launcher names (`/skills:helix`).
- Verification: `validate` 0 error / 0 warning; `contract-doc --check` and `amendments-doc --check` current; unit suite 196 pass / 0 fail; e2e suite 10 pass / 0 fail.
- Carry-over: these edits were made on the public line. The next refresh regenerates `README.md` and `docs/` from the internal line, so carry the same updates into the internal line or re-apply them during that refresh.
