# Knowledge Maintenance Workflow

## Trigger

Use when the user asks to review or clean up FlowMe's backlog, current status, decisions, ideas, specs, evidence, dashboards, or important-document structure. Also use before a new major workstream when the active gate is unclear, after a large multi-branch consolidation, or when current documents disagree.

Skip ordinary implementation, small documentation edits, product testing, and routine closeout. This workflow is on demand, not scheduled and not a mandatory phase.

## Inputs

- [PROJECT_CONTROL.md](../PROJECT_CONTROL.md), [STATUS.md](../STATUS.md), and [ROADMAP.md](../ROADMAP.md)
- The active and shelf sections of [specs/README.md](../specs/README.md)
- Request-relevant entries in [DECISIONS.md](../DECISIONS.md) and [IDEAS.md](../IDEAS.md)
- [HISTORY.md](../HISTORY.md), recent `docs/pr-history/` entries, and relevant `docs/content-audit/` artifacts
- Current branch, worktree status, and recent commits

## Steps

1. Start with a read-only audit. Search large logs by topic instead of loading them in full.
2. Confirm that `PROJECT_CONTROL`, `STATUS`, `ROADMAP`, and the active spec index name one compatible current gate.
3. Classify findings as current, stale, duplicated, superseded, orphaned, or awaiting a human decision.
4. Check whether an idea's revisit trigger has been reached, but do not promote it without explicit product approval.
5. Check whether completed work has release or PR evidence and whether dated dashboards are being mistaken for live canonical documents.
6. Propose the smallest safe maintenance set. Edit only when the user requested maintenance or approved that set.
7. Preserve old material through an archive, forward link, or dated superseding decision. Never erase prior evidence or rewrite history as if the old state never existed.
8. Keep `STATUS` limited to current state, blockers, health, and immediate actions. Keep dated HTML artifacts immutable and update only the links in `PROJECT_CONTROL`.
9. Inspect the final scoped diff and verify that no app/runtime, product behavior, data model, deployment, dependency, Notion, or auto-write hook changed unless separately authorized.

## Human Gate

Only the user can promote a deferred idea, choose the next product program, reinterpret conflicting product evidence, authorize destructive cleanup, or approve an external publication. Maintenance may expose these gates but cannot resolve them.

## Outputs

- A short knowledge-health verdict
- A list of current, stale, superseded, orphaned, and human-gated items
- When authorized, bounded updates to canonical documents and stable forward links
- Explicit confirmation of preserved history and untouched non-scope files

## Verification

- Run `npm run skills:sync` when canonical skills changed.
- Run `npm run docs:check` for documentation or skill changes.
- Run `git diff --check` and inspect `git diff --name-only`.
- Confirm generated `.claude/skills/` copies match `.agents/skills/`.
- Do not run product tests or builds for a docs-only maintenance change unless the diff unexpectedly reaches runtime files.

## Memory Update

The repo documents are the memory. Record a new decision only when maintenance settles a durable routing or supersession rule. Do not mirror archive detail into Notion or chat memory.
