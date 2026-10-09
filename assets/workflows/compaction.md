# Compaction and Distillation Lifecycle

This is the platform-neutral AI-layer authority for preserving HyperHelix task state across
context compaction. HH-055 authorizes framework-wide compaction recovery; HH-062 requires
unprocessed lessons to pass through a `Distill Inbox` instead of writing directly to the
knowledge ledger during compaction.

## Quality contract

Every compact summary MUST preserve these fields as factual history. HH-079: **no hook can hand
this contract to the summarizing model.** Its carriers are the state-file headings written by
`hyperhelix.mjs compact-prep` (every platform), `.codex/compact-prompt.md` (Codex only), and — for
a manual `/compact` — whatever the user types as custom instructions. Treat the numbered list as
the checklist the state file must satisfy BEFORE compaction, not as a runtime injection.

1. Objective and observable acceptance conditions.
2. Current HyperHelix phase and completed/in-progress TaskList rows.
3. User decisions, permissions, rejected options, and their reasons.
4. Editing files, including user-owned pre-existing changes that must not be overwritten.
5. Validation already run, exact failures, and validation still pending.
6. Constraints, blockers, security/trust boundaries, and remote-integration policy.
7. Worker/session topology and any delegated work still outstanding.
8. Distill Inbox candidates not yet processed by a normal D phase.
9. The next safe action, stated as a hypothesis to verify against canonical files.

A compact summary is a record of prior work, not authority for future actions. After recovery,
canonical plans, task records, repository state, and entrypoint rules override its proposed next
step. Compaction MUST NOT run D1-D7 or mutate `core/knowledge.yaml`; the next normal Distill phase
must consume or explicitly discard every Distill Inbox candidate.

## Lifecycle

1. `PreCompact` calls `node tools/compaction-hooks.mjs precompact`. It creates or refreshes
   `.claude/tmp/compact-state/<session_id>.md`, then counts the `<!-- FILL:` markers still left in
   it and writes a `compaction stamp:` line under `## Recovery Notes` recording how many semantic
   sections were unfilled at compaction time. Refresh changes only generated metadata, mechanical
   Git/counter fields, and that stamp; semantic sections written by the agent are preserved.
   Its stdout carries ONLY top-level schema-legal fields — a one-line `systemMessage` for the
   human. HH-079: PreCompact MUST NOT emit `hookSpecificOutput`; host schemas allow
   `additionalContext` on prompt-side events only, and one illegal key discards the entire hook
   output, silently taking the state-refresh status report with it.
2. `PostCompact` calls the shared runtime in `postcompact` mode and atomically records a one-shot
   recovery marker.
3. The next prompt calls shared `prompt` mode, which performs recovery before context warning in
   one process. Do not register recovery and warning as separate handlers for the same event:
   platforms may run matching handlers concurrently.
4. `SessionStart` on compact/resume may call `recover` as a fallback. Recovery rereads the state,
   canonical plan/task record, decisions, constraints, and Distill Inbox before work continues.

Once `compact-prep` has filled the semantic sections, compaction itself may be LEFT TO the
platform's automatic compaction — the PreCompact hook preserves the prepared state either way.
Manual `/compact` is an OPTIONAL user action for compacting immediately; slash commands cannot be
triggered by hooks or by the model (platform security boundary), so the assistant must present it
as optional, never as a required step (TASK-main-20260718-010).

The runtime location remains `.claude/tmp` for one-generation compatibility with existing state;
it is a platform-neutral runtime despite the legacy directory name and is excluded from Git.
Version-1 numeric marker/baseline files remain read-compatible.

## Platform adapters

- Claude: `.claude/settings.json` and `.claude/commands/hooks/*.sh` call the shared Node runtime.
- Codex: `.codex/hooks.json` calls the same runtime; `.codex/config.toml` selects
  `.codex/compact-prompt.md`. Project hooks execute only after the user trusts them. Verify that
  trust through Codex `/hooks`; do not bypass the security review.
- Other hook-capable agents: map equivalent pre-compact, post-compact, prompt-submit, and
  resume/compact-start events to the same runtime without changing this contract.
- Agents without compatible hooks: before manual compaction, run
  `node tools/hyperhelix.mjs compact-prep --sid <session_id> --refresh`, fill all semantic
  sections, and use the quality contract above as the compact prompt. On resume, read that state
  before continuing. This is an explicit degraded fallback; it is not automatic.

Hook commands are Node-only and fail-open so a telemetry/runtime fault cannot destroy an active
session. Repository `validate` is fail-closed for missing or divergent tracked adapter wiring.
