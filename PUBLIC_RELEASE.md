# Public Release Checklist

This checklist tracks the work needed before making HyperHelix broadly public.

## Adopted Publication Policy

- License: MIT.
- Publication branch: use a public-clean release line rather than exposing the full internal working history as-is.
- Task briefs: publish `tasks/INDEX.md` and a few representative briefs; reduce or omit the bulk task corpus from the public release line.
- Knowledge notes: keep HyperHelix/shared notes and representative examples; compress project-specific notes into generic public examples/playbooks.
- Project names: anonymize project-specific names in public materials as `Project001`, `Project002`, and subsequent placeholders.
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
- [x] Review `docs/qiita-draft.md` numbers immediately before publication. 2026-07-05: refreshed task index, HH count, backlog, always-read cost, and validate result.
- [x] Add a short "what to read first" guide if README remains too dense for new users.

## Verification

- [x] `node tools/hyperhelix.mjs validate` — 2026-07-05: 0 error / 0 warning.
- [x] History-wide secret scan
- [x] Fresh clone smoke test — 2026-07-05: local clone smoke passed with the staged public-release diff applied.
- [x] GitHub Actions green on the public branch — 2026-07-05: validation workflow passed on the public-clean branch.
