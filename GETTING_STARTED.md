# Getting Started

This guide is for readers who want to try HyperHelix without first reading every framework file.

## 1. Read the Entry Point

Start with `AGENTS.md` or `CLAUDE.md`. These files are launch guides only: they point agents to the authoritative materials instead of duplicating rules.

## 2. Run the Validator

HyperHelix uses a local Node.js validator and has no package install step for the core checks.

```powershell
node tools\hyperhelix.mjs validate
```

Expected result for a clean framework state is `0 error(s)`. Warnings should be read and reported rather than ignored.

## 3. Understand the Loop

The core task loop is:

```text
Search -> Plan -> Execute -> Evaluate -> Distill
```

The detailed definition lives in `core/loop.yaml`. Checklists in `assets/checklists/` turn the loop into practical steps.

## 4. Try a Small Task

Use `/helix <task>` when the slash command is installed in your agent environment. If not, follow the reading order in `AGENTS.md`, then use the phase gate checklist:

```text
assets/checklists/phase-gate.md
```

Keep the first task small and reversible. The goal is to see the evidence flow, not to exercise every governance feature at once.

## 5. Public-Release Notes

This branch is prepared for its first public release. The adopted publication policy and verification record are tracked in `PUBLIC_RELEASE.md`.

Important current choices:

- License: MIT.
- Task briefs: publish the index plus representative examples, not the entire internal task corpus.
- Knowledge notes: keep HyperHelix/shared notes and representative examples; compress project-specific notes into generic public examples/playbooks before broad publication.
- Pending governance items remain visible as Pending.
