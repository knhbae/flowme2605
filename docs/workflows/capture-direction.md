# Direction Capture Workflow

## Trigger

Use when a conversation confirms or materially changes a durable product rule, UX direction, data contract, source/risk boundary, workflow policy, actionable deferred idea with a revisit trigger, active blocker, release fact, or approved multi-step initiative. Include durable direction mentioned during implementation, not only requests explicitly labeled as planning.

Skip passing thoughts, repeated statements already captured, implementation details evident from the diff, and ideas with no durable value or revisit condition.

## Inputs

- The user's exact statement and surrounding task context
- Relevant entries found by searching `docs/DECISIONS.md`, `docs/IDEAS.md`, `docs/STATUS.md`, and `docs/specs/README.md`; do not read every layer end to end by default
- Relevant product principles, service structure, audit evidence, and implementation state
- Evidence that distinguishes a settled decision from a preference, hypothesis, or discomfort

## Steps

1. Treat user statements as situated claims unless they are explicit instructions or confirmed decisions.
2. Check whether the direction already exists, conflicts with a current decision, or merely adds a missing connector.
3. Classify it:
   - Settled durable rule: `docs/DECISIONS.md`
   - Deferred or exploratory direction: `docs/IDEAS.md`
   - Approved multi-step work: `docs/specs/YYYY-MM-DD-topic/`
   - Active health, blocker, or temporary next step: `docs/STATUS.md`
   - Current route/feature ownership: `docs/SERVICE_STRUCTURE.md`
   - Released fact: `docs/HISTORY.md` and matching PR history
   - Source/research/review evidence: `docs/content-audit/`
4. Record rationale, affected surfaces, uncertainty, and a concrete reopen or revisit trigger.
5. Link related canonical documents instead of duplicating their contents.
6. If the user owes a decision, result review, or external action, update only the corresponding Notion work item with an exact ask, recommendation, answer format, checkpoint, and openable artifact.
7. Run `npm run docs:check` for repo documentation changes.

## Human Gate

Do not turn a passing idea, discomfort, or agent recommendation into settled policy without sufficient evidence or confirmation. Do not use Notion visibility to promote a deferred idea into the active roadmap.

## Outputs

- One canonical repo update in the correct memory layer
- Related links and explicit status when an older decision is reopened or superseded
- Optional Notion projection for active human gates only

## Verification

- The new entry is not duplicated elsewhere as a competing source of truth.
- Local links and skill sync pass `npm run docs:check`.
- Notion, when updated, points back to the repo or a dated non-canonical review snapshot.

## Memory Update

The classified repo document is the memory update. Never rely on chat history or Notion alone.
