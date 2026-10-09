# Concurrency — Parallel Sessions on One Branch

Multiple orchestrator sessions may run tasks on the SAME branch at the same time
(e.g. one delegating to Codex while another plans). The loop is per-task and
session-local; this workflow makes every shared-state write collision-free so
parallel work never disrupts the loop. Ratified by HH-015. The cross-BRANCH model
in git-conventions.md is unchanged; this governs same-branch multi-session work.

## 1. Invariant
No two sessions write the same authoritative cell as an absolute value. Shared
state changes by COMMUTATIVE operations (sum / max / append) so any merge order
yields the same result. Then git-merge order never matters and no global lock is needed.

## 2. Task IDs — permanent branch namespace, exclusive claim protocol (AP-016)
- New ids are `TASK-<encoded-branch-slug>-YYYYMMDD-NNN` from `hyperhelix.mjs brief --date`; legacy `TASK-YYYYMMDD-NNN` remains read compatible. The reversible `zHH` slug namespace prevents cross-branch collisions (HH-065).
- NNN is branch+date local and need NOT be contiguous; gaps are normal and fine. A framework-repo
  `GH-<n>` id is allocated by GitHub (the Issue number) and needs no scan.
- **Claim ONLY through the `brief` tool.** No task file exists (HH-081: the record rides in the commit
  body), so the claim sidecar `tasks/records/.claims/<id>.sid` (untracked, gitignored) is created
  EXCLUSIVELY (`wx`) and is itself the mutex: when two sessions race on the same free NNN, the second
  create fails with EEXIST instead of silently sharing the id (AP-016: three collisions in one batch,
  one landed in history). `brief --date` counts live sidecars when allocating NNN.
- **Confirm the claim before using the id**: the `brief` stdout shows its `Claimed …` and
  `claim token: …` lines. Do NOT pipe the output into a filter that can eat them (`| grep -c …`);
  a run without a visible `Claimed` is a FAILED claim — stop and pick another id.
- **Claim token — the mechanical ownership gate (2026-08-24)**: keep the token in-session and pass it to
  `finish --task <id> --sid <token>`. When the sidecar exists, finish FAILS CLOSED on a missing or
  mismatched token — committing under a foreign session's id is stopped at the enforcing gate instead of
  being found by post-commit forensics (measured motivation, 2026-08-24: `bump` idempotency on a shared
  id silently absorbed a second task's `task_index` increment). Sidecar absent → warn-only (other
  trees); finish deletes its own sidecar after a successful commit.
- **An id is BURNED once it is referenced anywhere, not once it is committed**: never write a task id
  into ANY commit message (HOST repo included) or document before `brief` has confirmed the claim.
  `brief --date` scans live sidecars, legacy tasks/ names, the framework log AND the host repo log
  (nested layout, 2026-08-24) — but an id typed by hand ahead of a claim is invisible to every scanner
  until it lands in a commit (measured: two host commits carried unclaimed ids; the scanner re-issued
  one and a hand-written "next number" misattributed another).
- When another same-branch session is KNOWN to be active, claim an NNN well clear of the
  current tip (10+ ahead is fine — gaps are normal); `brief --task <explicit-id>` performs the same
  exclusive claim.
- **What the claim gate does NOT give you (R7d-frame adjudication, 2026-08-24)**: the gate makes a lost
  claim LOUD, not parallel claims SAFE — the session that claimed first owns the id and the loser
  renumbers. (The 2026-08-24 alternative of append-only record fragments is moot since HH-081: there is
  no shared record file left, each record lives in its own commit.)
- If a claim conflict is discovered only at commit time (id already in committed history with a
  different subject), do not rewrite history: renumber your task to a fresh id and note the collision
  in your hh-record.

## 3. Counters and note ledgers — high-water, per-file union (HH-057 / HH-045)
The main `core/knowledge.yaml` holds the schema/header, counters, and shared +
hyperhelix notes. Project notes live in `core/knowledge/<project>.yaml`; new notes
append to the file matching their `project:` field. The main-ledger counters are
HIGH-WATER marks, not cross-branch accumulators (its header is the counter-semantics
authority):

| counter | kind | concurrent merge rule |
|---|---|---|
| task_index | high-water (branch-local +1 / task) | **max(both)** — reflux auto-resolves (HH-057) |
| last_framework_review | high-water mark | max(both) |
| review_ordinal | high-water (branch-local +1 / review; HH-080) | max(both) |
| next_note_id | **NOT USED** (not stored) | n/a — permanent ids generated at creation (HH-064) |
| note strength | small last-writer | ±1 nudges; collisions tolerated (re-nudge next task if lost) |
| note last_used | last-writer | newest task_index wins |
| new notes | append to the project-matching ledger file | merge both sides by per-file union (HH-064 id rule below) |

- **HH-057**: task_index is no longer an accumulator (no `base + Σδ` formula). On a
  main-ledger counter conflict take `max` per counter; `reflux` does this automatically
  (`resolveKnowledgeCounterConflict`). This auto-resolution applies only to
  `core/knowledge.yaml`; resolve leaf-ledger conflicts manually by the
  sync-conflict-guide rules. The absolute value carries no cross-branch meaning — it
  exists only for cadence + note recency ordering.
- **Note id rule (HH-064)** — sequential max+1 allocation collided in three real cases
  (Project004, Project007 N-062..066, 2026-07-16 N-079). Current rule:
  - on all branches, new notes take permanent `N-<proj>-<YYYYMMDD><letters>` ids via
    `next-id` (branch-derived slug; collision-free by construction);
  - legacy `N-NNN` ids remain valid and are never renumbered;
  - merge is the per-file union of both sides' notes (HH-045 (2) multi-file ledgers): no renumbering and no `[[ref]]` rewriting;
  - `adopt-notes` is a deprecated no-op alias; provisional leftovers fail main validation and must be regenerated at their producer.
- After reconciling, run `validate` before continuing.

## 4. Commit discipline (concurrency-safe; HH-058 pathspec commit)
- Stage ONLY the files this task changed, by explicit path, e.g.
  `git add core/knowledge.yaml <other touched files>` (`finish --path` does this for you).
- NEVER `git add -A` / `git add .` while another session shares the tree — it captures that session's untracked files.
- **Commit with an explicit pathspec (HH-058)**: `git commit -m <msg> -- <the same explicit paths>`.
  A bare `git commit` commits the WHOLE shared index — if another session staged its
  files between your `add` and your `commit`, a bare commit sweeps them in. The
  pathspec form commits only your files regardless of what else is staged.
- **Exception — a file you SHARE with another live session (HH-078)**: pathspec commit
  reads the WORKING TREE, so on a co-edited file it commits the other session's hunks
  too (this is the AP-018 mechanism — the rule above causes the accident it looks like
  it prevents). When another session is editing the same file, stage HUNKS instead and
  commit with NO pathspec (non-interactive; `git add -p` is unavailable here):
  1. `git diff -- <shared-file> > all.patch`
  2. split on `@@` and keep ONLY your own hunks → `mine.patch`
  3. `git apply --cached mine.patch` (no `--recount` needed — dropping an earlier hunk
     leaves later `@@` offsets stale, and git relocates them by context; verified 2026-08-22)
  4. `git diff --cached --name-only` MUST equal exactly your own paths
     (`git restore --staged <foreign>` if not) — this replaces the pathspec guard
  5. `git commit -F <msg>` with NO pathspec
  6. post-check `git show HEAD:<shared-file>` for the other session's markers
  `git apply --cached` updates the INDEX ONLY, so between 3 and 5 the file reads `MM`
  in `git status` — that is correct, and `git add <shared-file>` there re-stages the other
  session's hunks and undoes steps 1-4. After committing, confirm the other session's
  hunks SURVIVE in the working tree: `git diff -- <shared-file>` must still show them.
  If step 6 shows sweep-in anyway, do NOT rewrite history — apply the AP-018 remedy
  (record the split attribution in both task records).
  **Limits on this exception (the hunk route does NOT always exist):**
  - **Co-located appends fuse into ONE hunk — fall back to a LINE-level split (measured
    2026-08-25).** When both sessions append at the SAME insertion point of a shared file
    (a test file where every task adds its asserts at the same anchor; a backlog whose rows
    all land at the tail), git emits ONE `@@` hunk containing BOTH sides, and step 2 has
    nothing to split on. This is NOT the `core/knowledge.yaml` case below — the lines ARE
    separable, only the hunk boundary is not. Procedure:
    1. `git show HEAD:<f>` → base. Compute the common PREFIX and SUFFIX line counts against
       the working tree; the lines between them are the inserted block.
    2. Assert the block is a pure INSERTION (no base lines removed) — otherwise stop, the
       situation is not an append and this route does not apply.
    3. Classify each inserted line as yours / theirs. **This is why per-WO name prefixes are
       worth assigning up front** (agent-roles.md §8): classification becomes mechanical, and
       the boundary is usually one section-comment line. Assert no foreign marker survives in
       your set and vice versa.
    4. Write `base_prefix + YOUR lines + suffix` to a temp file →
       `git hash-object -w --path <f> <tmp>` → `git update-index --cacheinfo 100644,<sha>,<f>`.
       This stages an exact content you constructed, without touching the working tree.
    5. `git diff --cached --name-only` MUST equal your paths → `git commit` with NO pathspec.
    6. Post-check `git show HEAD:<f>` for the other side's markers (must be 0) and confirm
       their lines still stand in the working tree.
    `hash-object -w` + `update-index --cacheinfo` is more robust here than `git apply --cached`,
    which needs a hunk boundary that does not exist.
  - **`core/knowledge.yaml` is NOT hunk-separable and stays serialized (§6).** Every
    session's D7 writes the SAME LINE (`task_index:`), so there are no separable hunks
    to pick — the procedure above is structurally inapplicable. HH-078 relaxed §8 for
    shared INDEX DOCUMENTS only; the §6 D7 critical section is untouched. Here you DO
    wait. `bump` idempotency and the HH-057 max-merge repair the VALUE downstream, but
    commit ATTRIBUTION still breaks (your commit carries another session's +1).
  - **Attribution keywords must be MEASURED, never guessed from the spelling you expect
    (2026-08-25).** Classifying hunks/lines by "their identifiers" fails silently when the
    implementation used a different romanization or prefix than you assumed — measured: the
    other side's gate was `MIYANICHI_*` while the classifier looked for `MIYABI`, so 5 of 7
    hunks fell through to "unattributed" and were read as a FOREIGN session's edits; a query
    was sent to a session that had already ended, and a remedy was nearly applied for a
    conflict that did not exist. Grep the actual symbols out of the diff FIRST, then build the
    keyword set. Also read CONTEXT lines, not just `+` lines: judging added lines alone made an
    ordinary `CASE`-arm boundary look like unreachable code. **A classifier that cannot decide
    must ABORT, never guess** — the fail-closed abort is what turned this into a 2-minute
    detour instead of a wrong commit.
  - **Do not keep a fixed "paths another session owns" list.** A live session's target
    set grows mid-task; a snapshot goes stale silently. Re-read `git status --porcelain`
    at the moment you stage, not from memory.
  - **A GENERATED VIEW must ride in the SAME commit as the canon it is generated from.**
    Editing `governance/amendments/{registry.yaml,bodies/*}` without `amendments-doc` in
    the same pathspec lands a `GOV_VIEW_DRIFT` at HEAD. The gates do NOT protect you here:
    `validate` reads the WORKING TREE, so if another session has already regenerated the
    view there, your run passes — while YOUR commit, which excludes that file, leaves HEAD
    broken. **The tree you validated is not the tree you committed.** Regenerate the view
    yourself and add it to your own pathspec, even when `git status` shows it already
    modified by someone else (then take the §4 hunk route if their hunks are in it).
- One task = one commit (unchanged). "Working tree clean" applies to YOUR files
  only; another session's untracked task artifact is not your leftover.
- **Review-only uses the same ownership boundary (HH-068)**: record baseline HEAD,
  porcelain state, and path fingerprints before inspection. An unchanged pre-existing
  path or explicitly attributed newly added foreign path does not promote the review;
  an owned write always does. A same-path/unknown delta is `unverified`, never a pass.
  The command contract and external journal format live in `review-only.md` §1.
- On pull/merge conflict in core/knowledge.yaml, resolve by §3, then `validate`.

## 5. Independence
- A task MUST NOT depend on another in-flight session's UNCOMMITTED state.
  Cross-session handoff is only through committed artifacts (task records, counters).
- No phase requires a global lock; phase gates are per-task and session-local.
- **File-level conflict and content-level conflict are different problems.** Every gate in this document
  (§8 L1 disjoint P6 targets, §4 hunk-level commits, §6 single-writer) guards the FILE level. None of them
  surfaces a peer session's DESIGN DECISION about the same subject, and disjoint files make all of them
  stay silent. Measured (/cycle ordinal 7): a spike measured `island` while a peer had already moved that
  area to `CBG` and proved a capture path the spike then denied — two artifacts needed post-hoc correction.
  The countermeasure is a Search-side read, not another lock: `search.md` S2 reads peer task records
  created since this task started.

## 6. Single-writer operations (generalized by HH-058)
- **D7 → commit is a critical section**: the shared-ledger write (knowledge.yaml
  bump/note) plus its commit run in ONE session at a time. Do not start your D7
  while another session is visibly mid-Distill (its task record says so, or knowledge.yaml
  has uncommitted changes not yours). This is the same-tree guard the git merge
  layer cannot provide (edits collide BEFORE git sees them).
- The last_framework_review update is effectively single-writer: run /cycle or
  framework review when no other session is mid-Distill. A conflict means "another
  session already did it" — treat the update as idempotent (the higher value wins).

## 7. Parallel S/P and plan-ahead (HH-076 generalizes the pattern)

Search and Plan are read-only phases (the draft hh-record lives in the session, not the tree), so an
orchestrator MAY hold any number of tasks in S/P concurrently with ANY phase of
other tasks — delegation wait is NOT a precondition (HH-076). The in-flight WO
cap (§8 reference below; default 3) limits executor dispatch only, not S/P
drafts. The original plan-ahead flow below remains the typical delegation shape.

### Flow

```
Orchestrator                        Executor
────────────────────────────────    ──────────────────────────────────
Task A: S → P                       (idle)
  Issue WO A (state: pending)
Task B: S → P                       WO A: pending → running → done
  Issue WO B (state: pending)       WO B: pending → running
Task A: V → D → commit              (WO B still running)
  (task_index +1 at D7)
Task C: S → P                       WO B: done
Task B: V → D → commit
  (task_index +1 at D7)
```

### Invariants

1. **D7 timing**: task_index +1 and note updates happen ONLY when V+D completes
   for that task — never at P completion. A task in "plan done, E delegated" state
   does not yet hold a task_index slot.
2. **Committed artifacts only**: the next task's S/P must read only COMMITTED
   state (§5 unchanged). A task's executor output is not visible until
   the orchestrator has verified it and committed the task.
3. **FIFO on V+D**: when multiple WOs are `done`, process V+D in issue order.
   Skipping ahead is allowed only if tasks are provably independent (different
   files, no artifact dependency).
4. **Task delegation state**: the orchestrator's WO list (agent-roles.md) is the resume point across
   context resets; the hh-record's `phase_evidence.execute` names the delegate when the task commits.
5. **Dispatch freshness gate (HH-076)**: entering Execute from a parallel-built
   plan requires (a) the §8 L1 disjointness gate AND (b) every P6 anchor still
   resolving uniquely at current HEAD. A stale anchor returns the task to S4 —
   the pre-dispatch form of the existing E4 route; no lock/reservation mechanism
   is added (HH-058 rejection stands). Wasted planning on overlapping drafts is
   an accepted trade-off; shared-canon writes stay serialized per §6.

### Queue discipline

See agent-roles.md §8 for the default queue depth limit (3 in-flight WOs)
and the full-queue protocol.

## 8. Parallel-task isolation levels (HH-058)

Same-tree parallel /helix has three collision surfaces the git merge layer cannot
cover (it only resolves AFTER commits exist): (1) simultaneous edits to the same
file = lost update, (2) the shared index lets a bare `git commit` sweep in another
session's staged files, (3) nothing detects two tasks targeting the same material.
Pick the isolation level by need:

### L1 — same tree, disjointness-gated (the default; one orchestrator + parallel executor WOs)
- **P6 disjointness gate**: two tasks may run in parallel ONLY if their P6
  change-list target-file sets are disjoint. The change-list (HH-035/037) already
  enumerates exact target files, so this is a mechanical check at dispatch time.
  Overlap on CODE or task-specific materials → serialize the tasks.
  **Overlap on a SHARED INDEX DOCUMENT (project `TODO.md`, backlog, design notes) does
  NOT serialize (HH-078)** — nearly every task touches those, so serializing on them
  turns into a permanent hold. Both sessions keep working: each appends only at its OWN
  anchor (own section, own row) without rewriting lines it does not own, and each commits
  its own hunks per the §4 shared-file exception. Merge, do not wait.
  **This relaxation does NOT reach `core/knowledge.yaml`** — the D7 shared-ledger write
  remains a §6 critical section (same-line contention; no hunks to separate).
  Exclusions from the check: core/knowledge.yaml and
  each task's own record (append/commutative materials, serialized by §6 instead).
- **Pathspec commit** (§4) prevents index sweep-in; **D7 critical section** (§6)
  serializes the shared-ledger tail.
- A mid-Execute edit OUTSIDE the declared change-list is a P6 gap — E4 catches it
  (existing rule); the gate's soundness depends on change-list accuracy.

### L2 — worktree isolation (independent sessions in full parallel)
- Each session gets its own tree + branch:
  `git worktree add ../<repo>-<slug> -b session/<slug>` (from the repo root).
  All three collision surfaces vanish structurally — no locks needed (git-native
  isolation; do NOT build a lock/lease registry — rejected in HH-058).
- Merge back with the EXISTING machinery: `node tools/hyperhelix.mjs reflux` from
  the session branch (framework-only extraction + counter auto-resolve HH-057 +
  note append-merge §3 + task artifact NNN re-claim §2).
- Clean up after reflux: `git worktree remove ../<repo>-<slug>` and delete the branch.
- Use L2 when tasks genuinely overlap on materials or sessions are long-lived;
  L1 is cheaper for the common delegation case.
- **L2 is NOT available for a host repo that nests the framework under an ignored path
  (HH-078)**: `git worktree add` on the host produces a tree WITHOUT `doc/HyperHelix/`,
  so every `node doc/HyperHelix/tools/*` step (brief/verify/bump/finish) breaks.
  Measured 2026-08-22 on Project001: `git ls-files doc/HyperHelix` → 0 tracked,
  `.gitignore:23` excludes it. The framework repo itself can still use L2.
  For host-side overlap, use L1 + the §4 shared-file exception.

## Tooling
- `hyperhelix.mjs bump --task ID [--use N-.. | --miss N-..] [--review [--review-source SOURCE]]` applies one
  task's deltas atomically (task_index +1, optional note strength ±1 and last_used).
  Review provenance defaults to neutral `framework review`; only the `/cycle` launcher
  passes `--review-source cycle` (no leading `/` — Git Bash rewrites it into a Windows path,
  AP-024; bump/finish reject a drive-letter value).
  Manual §3 remains the safe fallback for conflict resolution.
