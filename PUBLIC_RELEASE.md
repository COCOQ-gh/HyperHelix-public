# Public Release Notes

This file states what the public line contains, what it leaves out, and how it was checked.

## What this line is

HyperHelix is developed on a private line and applied to a number of host projects.
This public line carries the framework's own materials: the constitution, the task-loop
definition, the checklists and workflows, the verification tooling with its tests, and the
record of human-ratified amendments. It is rebuilt from the internal line; it is not a mirror
of it, and its history starts from a single commit.

- License: MIT.
- Maintainer handle: `COCOQ-gh`.

## Publication policy: allowlist

Content is published only when it has been confirmed to be about the framework itself.
Content that comes from host projects is left out or reduced to its general lesson. Earlier
attempts to publish the whole internal tree with project names replaced did not hold up under
independent review: examples written from real work carry too many kinds of clue for
substitution to remove reliably.

| Material | On the public line |
|---|---|
| `constitution.md`, `entrypoint.md`, `core/loop.yaml`, `core/routing.yaml`, `core/gates.yaml`, `core/contracts.json` | As on the internal line |
| `assets/checklists/`, `assets/workflows/`, `assets/templates/` | As on the internal line, except that citations of host-project tasks, identifiers and paths are replaced by a plain description ("measured on a host project"). The two task-brief templates are the pre-HH-081 form: the internal line keeps them for reference although HH-081 moved work records into commit bodies |
| `tools/`, `test/`, `test-e2e/` | As on the internal line. Sample data in tests that used host-project names now uses the made-up slug `demo`; comments citing host-project tasks are generalized. One constant listing host-project slugs is empty here |
| `core/knowledge.yaml` (learning notes) | 48 notes: those whose id, text and tags do not touch any host project. The internal ledgers hold about 300 notes. Three of them had a host-project example rewritten in general terms because other notes refer to them |
| Per-project knowledge ledgers under `core/knowledge/` | Not published. `core/knowledge/manifest.yaml` lists the shared ledger only |
| `assets/ai/anti-patterns.md` | 35 of 37 entries, rewritten to the failure type and its remedy only. Occurrence records, citations and examples are removed and the `source` column is empty. Two entries whose lesson was a property of one specific runtime were dropped |
| `governance/amendments/` and the generated `amendments.md` | All 85 amendments (HH-000 to HH-084). In 25 bodies, host-project examples in the background sections were rewritten as summaries that keep the reasoning but not project names, project-named task and note ids, host identifiers, host paths or commit hashes. Task ids of the framework's own line (`TASK-YYYYMMDD-NNN`, `TASK-main-…`) and the default nest path `doc/HyperHelix/` remain. Most keep their measured counts; where the counts and dates of one stretch of work would have identified it (HH-083, HH-084), only the lesson is kept. Four registry titles were reworded the same way. Decisions, ratification metadata and numbering are unchanged |
| `docs/process-backlog.md` | Heading and operating rules only. Individual rows are not published (internal line on 2026-10-26: 17 open, 19 closed) |
| `tasks/INDEX.md` | Heading only. The 536 archived rows are not published: titles describe host-project work and hashes point at commits that are not on this line |
| `core/dictionary.yaml` (deprecated tag dictionary) | Framework vocabulary only |
| Internal planning documents | Four are published under `docs/` (the improvement plan, the idea list, the HH-081 design spike and the design document). Two are not published, nor is a draft article about the framework. Labels of the form `SC-NN` in code comments and amendments are step numbers of one of them, the migration plan ratified by HH-067 |

Consequences a reader should know:

- Identifiers in rewritten examples are descriptions, not the original names.
- Some counters in `core/knowledge.yaml` (task index, review ordinal, convergence baselines)
  are the internal line's values. They describe the internal line, not the notes published here.
- `node tools/hyperhelix.mjs validate` reports one warning, `FRAMEWORK_REVIEW`: the periodic
  framework review is overdue on the internal line. It is not an error.
- Commit messages on the internal line carry one `hh-record` per task. This line has only the
  records of its own commits.

## Verification

Recorded for the first commit of this line (2026-11-16):

- Search over all tracked files for host-project names, project-named task and note ids,
  local paths, e-mail addresses and other known kinds of clue: results are recorded in the
  commit message.
- `validate`, `contract-doc --check`, `amendments-doc --check`, the unit suite and the e2e
  suite: results are recorded in the commit message.
- Independent review: before wider publication, a reviewer that is given this policy but no
  knowledge of the host projects tries to work out what the host projects are from this tree
  alone. A search finding nothing is a regression check, not proof.

## Before publishing elsewhere

- Push this branch only. The local repository it is built in also holds the internal
  branches; never push with `--all` or `--mirror`.
- `INSTALL.md` clones the `main` branch of the public repository, so this branch has to be
  published there as `main` (`public/showcase:main`).
- Task ids, note ids of removed notes, `SYNC-…` ids, review item numbers and line numbers in
  amendment bodies and notes are historical references. Their records are on the internal
  line and cannot be followed from here.
- The governance text describes operating a private repository without branch protection
  ("private/free"). That is the mode the framework was developed under, not a statement
  about the public repository.
