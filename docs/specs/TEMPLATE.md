# FLOW Spec Folder Template

Copy these sections into a new `docs/specs/YYYY-MM-DD-short-topic/` folder.

## `spec.md`

```markdown
# Short Topic Spec

**Date:** YYYY-MM-DD
**Status:** Proposed | Approved | In Progress | Implemented | Deferred
**Owner:** Agent or human owner
**Related roadmap:** Link to `docs/ROADMAP.md` section or state "not yet on roadmap"

## Goal

One paragraph describing the user-visible or process-visible outcome.

## Stage Fit

Explain why this belongs in the current FlowMe stage and what it must not expand into.

## User Need

As a [specific user], I need to [specific action], so that [specific outcome].

## Scope

In:
- Concrete included behavior or document change.

Out:
- Concrete excluded behavior or future idea.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | What the user does first |
| Completion signal | What proves the action is done |
| Artifact destination | Calendar, sheet, memo, export, or check state |
| Source/risk boundary | How source facts and experience stay separate |
| Natural artifact | Realistic input values and expected external artifact |
| Verification | Commands, browser checks, or review passes |

## Acceptance Criteria

- Observable criterion written as a testable statement.
- Observable criterion written as a testable statement.
```

## `plan.md`

```markdown
# Short Topic Plan

## Files

| File | Responsibility |
| --- | --- |
| `path/to/file` | Why this file changes |

## Sequence

1. Smallest useful step.
2. Next step.
3. Verification step.

## Risk Controls

- How this avoids scope expansion.
- How user edits and existing files are protected.
```

## `tasks.md`

```markdown
# Short Topic Tasks

- [ ] Read current docs and code touched by the work.
- [ ] Make the smallest scoped edit.
- [ ] Run the first relevant check.
- [ ] Broaden verification according to `docs/harness/QA.md`.
- [ ] Record PR history evidence if the change is PR-sized.
```

## `qa.md`

```markdown
# Short Topic QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run docs:check` | Not run | Reason or output summary |

## Review Notes

- Product constraint review:
- Source/risk review:
- Browser or screenshot review:
- Residual risk:
```
