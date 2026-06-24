# QA And Review Gates

**Spec:** [FlowMe Platform Feature Planning From Reference Research](./spec.md)

## Feature Planning Checks

- The plan must preserve `Flow Map > Flow > Step > Item`.
- User screens must remain simpler than project-management tools.
- Creator screens may be denser, but must not leak review/editor copy into user execution.
- Step remains the smallest calendar/todo/sheet unit.
- Item remains checklist/text fallback unless the source explicitly gives dated sub-items.

## Reference Research Checks

- Reference services are used as pattern evidence, not as UI requirements.
- Official docs are preferred over blog summaries.
- Each imported idea must answer why it helps FlowMe's content-to-execution loop.

## Slice Readiness Checks

### Creator Source-Row Editor

- Source row is visible near generated Step/Item.
- Editing does not mutate public published content until a draft is saved/published.
- Creator can see blockers before publishing.
- User-facing public/My Flow screens do not show creator review labels.

### Update Compare/Apply

- Saved Steps and checked state are not silently mutated.
- Sensitive/official maps default to review-before-apply.
- Dismiss is not the same as apply.
- User can return to the public map/source before deciding.

### Step-Level Calendar/Task Fields

- Date/time/repeat/location/memo/URL are progressive, not first-screen clutter.
- Exported calendar/todo/sheet text receives the same core fields.
- Recurrence supports simple presets before custom rules.

### High-Volume My Flow

- Search/filter/hide improves findability without hiding today's next action.
- Today and Calendar stay execution-first.
- No raw internal status or source-fit labels appear on user screens.

## Validation Boundary

Allowed wording:

- reference-informed plan
- internal product planning
- implementation candidate
- automated behavior evidence

Blocked wording without user behavior:

- validated
- proven
- product-market fit
- launch-ready

## 2026-06-24 P0 Baseline Execution Log

Scope checked:

- Creator source-row editor route: `/flow-maps/middle-school-math-1/creator`
- Source-backed package contract for creator drafts and source-row comparison
- Separation between creator editor, public preview, and saved user screen links
- Mobile 390px and desktop 1366px browser rendering

Commands run:

| Check | Result |
| --- | --- |
| `npx tsx --test lib/flow/source-backed-my-flow.test.ts` | Pass, 14 tests |
| `npm run docs:check` | Pass |
| `npm run build` | Pass |
| `npx playwright test tests/e2e/flow-mvp.spec.ts --grep "source-backed"` | Pass, 13 tests |
| `npm test` | Pass, 257 tests |
| Browser script at 390px and 1366px | Pass, no horizontal overflow, no console/page errors, row click scrolls to editor, draft saved |

Browser artifacts:

- `output/playwright/creator-source-row-editor-mobile.png`
- `output/playwright/creator-source-row-editor-desktop.png`

Observed result:

- Creator can select a source row, review source-derived title/detail, edit generated Step title, destination, source URL, Item fallback, and creator note.
- `초안 저장` writes to `flow:map:creator-draft:middle-school-math-1`.
- Public/user screens are linked but do not show creator review copy.
- On mobile, selecting a source row scrolls to the editor to avoid the previous "detail opens far below" problem.

Remaining QA boundaries:

- This is local draft behavior, not account-backed persistence.
- This does not publish a new public Flow Map version.
- This does not prove user demand or real creator workflow success.

## 2026-06-24 P1 Update Compare/Apply Execution Log

Scope checked:

- My Flow update review notice for changed source-backed saved maps
- Compact comparison of saved/current version, affected Flow rows, Step count, and source checked date
- Applying a new snapshot without changing saved child Flow records
- Dismiss behavior remains available

Commands run:

| Check | Result |
| --- | --- |
| `npm run docs:check` | Pass |
| `npm run build` | Pass |
| `npx playwright test tests/e2e/flow-mvp.spec.ts --grep "update review"` | Pass, 2 tests |
| `npx playwright test tests/e2e/flow-mvp.spec.ts --grep "source-backed"` | Pass, 14 tests |
| `npm test` | Pass, 257 tests |
| Browser script at 390px | Pass, no horizontal overflow, comparison visible, apply updates snapshot, child Flow anchor preserved |

Observed result:

- User can open `변경 보기` from the update notice.
- User can see saved/current version and changed child Flow rows.
- `새 기준으로 표시` updates `flow:map:saved:{mapId}` and `flow:map:persistence:{mapId}`.
- Saved child Flow records such as `flow:saved:source-backed-baby-health-checkups` keep their anchor and are not replaced.
- `지금은 숨기기` still hides the same saved/current version notice.

Browser artifacts:

- `output/playwright/my-flow-update-compare-mobile.png`
- `output/playwright/my-flow-update-applied-mobile.png`

Remaining QA boundaries after this 2026-06-24 slice:

- It does not remove old child Flow records.
- It does not resolve row-level conflicts.
- It remains localStorage-backed.

## 2026-06-25 P1 Platform UX Slice Execution Log

Scope checked:

- Step-level calendar/task fields in My Flow detail.
- Creator draft save to local publish marker.
- Update apply policy for missing child Flow records.
- High-volume Flow inventory hide/restore.
- Mobile and desktop behavior through existing source-backed and inventory e2e paths.

Commands run:

| Check | Result |
| --- | --- |
| `npx tsx --test lib/flow/source-backed-my-flow.test.ts` | Pass, 14 tests |
| `npm run build` | Pass |
| `npx playwright test tests/e2e/flow-mvp.spec.ts --grep "source-backed\|step detail\|inventory can hide\|mobile saved map edit"` | Pass, 17 tests |
| `npm test` | Pass, 257 tests |
| `npx playwright test tests/e2e/flow-mvp.spec.ts --grep "mobile saved map edit"` | Pass, mobile 390px save/edit/revisit |

Observed result:

- Step detail can store a user-edited date, time, simple repeat preset, location, and memo without making those fields first-screen clutter.
- Date overrides persist in `flow:my-flow:date-overrides`; Step field drafts persist in `flow:my-flow:item-drafts`.
- Creator pages can save a draft and mark it as a local published draft in `flow:map:published-local:{mapId}`.
- Applying a source-backed map update preserves existing child Flow records and creates missing child Flow records with the saved map anchor.
- Flow inventory can hide and restore Flow cards without removing Today/Calendar execution data.
- Mobile 390px save/edit/revisit simulation found that Step metadata was missing from the mobile detail dialog and the calendar surface had 4px horizontal overflow; both were fixed and covered by e2e.

Remaining QA boundaries:

- Creator publish remains local-only and does not update server-rendered public map content.
- Repeat presets are stored for the Step detail PoC, but generated ICS/export text is not yet regenerated from My Flow edits.
- Hidden Flow state is a local inventory preference, not account-backed archive.
- Row-level conflicts and deleted-published-row policy remain future account-backed version work.
