# P24 Execution Trust and UX Simplification QA

## Evidence Labels

Every result must include one of:

- `current_command`
- `clean_baseline_automated`
- `dirty_dev_automated`
- `browser_simulated`
- `fixture_based`
- `design_proposal`
- `observed_user_feedback`
- `observed_user`
- `inferred`

Do not call `browser_simulated` or `inferred` an observed-user result.

## Baseline Matrix

| Environment | Required record |
| --- | --- |
| clean tracked | commit, Node, package versions, lock hash, install command |
| dependency candidate | base commit, exact patch, Node, package versions, lock hash |
| Vercel | deployment ID, source commit, access policy, anonymous response |
| local browser | server mode, port, viewport, storage fixture |

## Finding Reproduction Gate

Each finding needs:

1. initial storage state;
2. route and viewport;
3. exact actions;
4. expected and actual state;
5. reload result;
6. My Flow, Calendar, and export comparison where relevant;
7. screenshot or DOM/accessibility evidence;
8. environment classification.

## Correctness Gates

| Area | Pass condition |
| --- | --- |
| Local date | KST morning and DST fixtures have zero day offset |
| Effective date | Today summary, full list, Calendar, ICS agree |
| Reuse | selected override policy changes the new run as labelled |
| Recurrence | preview, My Flow, Calendar, ICS occurrence counts agree |
| Draft split | all persisted Items are visible/exported exactly once |
| Draft validation | empty input creates zero records |
| Hard navigation | `/flows` direct load and reload resolve in production mode |
| Hydration | post-save `/my` is populated without manual reload |

## UX Gates

| Area | Pass condition |
| --- | --- |
| Completion | one occurrence has one primary completion control |
| Undo | just-completed task can be reopened in one action |
| Today | one actionable row; optional next preview has no completion control |
| Editor | advanced fields are hidden until relevant, values preserved |
| Unscheduled | Item is visible in My Flow and Calendar tray, no fake date |
| Date move | preview states affected linked/fixed/selected counts before apply |
| Export | selected scope and resulting Item count are explicit |
| Feedback | inline note is optional and private until explicit submit |

## Responsive and Accessibility Gates

- mobile 390x844 and wide 1024x768
- horizontal overflow 0
- fixed/sticky overlap 0
- console error 0
- keyboard access to checkbox, undo, selection, date move, export scope
- accessible names include Item title and action context
- no color-only linked/fixed/selected distinction
- destructive or bulk operation has preview and recoverable path

## Command Gates

Run only in the isolated worktree being evaluated:

```powershell
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
git diff --check
```

Record skipped commands and blockers. Never replace current results with prior evidence.

## Human Observation Gate

Automated QA cannot answer:

- whether Today/All roles are understood without explanation;
- whether a completed task feels lost;
- whether linked versus fixed dates are understood from state styling;
- whether users expect whole, selected, or current-item export;
- whether Calendar is the place they look for unscheduled work;
- whether inline notes are useful or add noise.

These require at least 5 participants x 3 sessions before broad redesign is called validated.
