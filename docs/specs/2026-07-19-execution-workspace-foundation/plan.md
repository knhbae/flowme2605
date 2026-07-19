# P25 Execution Workspace Foundation Plan

## Delivery Rule

Work one gated slice at a time. Do not start the next slice because the previous code merely compiles; each slice needs its product decision, contract tests, browser evidence, and rollback boundary.

## Sequence

### P25-00A - Feedback reconciliation and foundation spec

**Status:** This package.
**Output:** Owner/Codex/Claude convergence, references, product model, backlog, and next-goal prompt.
**Gate:** The problem is framed as structural correction rather than another copy-polish pass.

### P25-00B - Core-screen prototype and owner decision

**Status:** Interactive A/B package and six-shape simulation complete; owner keep/change/reject pending.
**Package:** [P25-00B prototype decision](../../content-audit/2026-07-19-p25-00b-core-workspace-prototype-decision/README.md).

Create current/proposed 390px and 1024px wireframes for:

1. public/save-before artifact,
2. post-save whole Flow,
3. returning My Flow (`지금 / Flow / 완료` candidate),
4. whole Flow outline and item drawer,
5. Calendar with an undated scheduling queue,
6. export scope before format.

Compare at least two viable frames. The recommended frame is a Flow workspace with an explicit Anytime/scheduling boundary, not a planner-first home. Record owner keep/change/reject decisions. No runtime UI implementation occurs in this slice.

### P25-01A - Canonical execution projection and recurrence truth

- Make preview, saved Flow, My Flow, Calendar, ICS, and list exports consume the same effective item/occurrence contract.
- Separate series, occurrence, and internal checklist identities.
- Remove semantic weekday fallbacks that invent a schedule.
- Fix the monthly routine mismatch before layout work depends on it.

**Gate:** Representative recurring Flow dates/counts match across all destinations; duplicate occurrences are zero.

### P25-01B - Intake and count integrity

- Add a source-phrase-to-item parse preview for memo drafts.
- Support common Korean list delimiters, including comma-separated actions where unambiguous.
- Never add generic filler only to reach a target count.
- Keep uncertain splits editable and visibly uncertain.

**Gate:** Input phrases, saved items, whole-Flow count, and exports reconcile without hidden or invented items.

### P25-02A - Responsive workspace shell

- Establish shared Flow rail, item outline/list, and detail drawer primitives.
- Wide: three-pane workspace with useful density.
- Mobile: drill-in navigation and bottom sheet/drawer.
- Define row states once: active, completed, held, source, personal, selected.

**Gate:** Shared components pass 390/1024 visual, keyboard, focus, and overflow checks.

### P25-02B - Post-save and whole Flow

- Reuse one whole-Flow component for first-save confirmation and returning Flow view.
- Show all sections/items with counts and no unexplained five-row truncation.
- Make the personal Flow identity primary.
- Separate `지금`, complete Flow structure, and completed history.

**Gate:** A reviewer can verify the complete saved artifact and reach any item without guessing what `전체` means.

### P25-03A - Progressive personal adjustment

- Default drawer: title, date/Anytime state, note.
- Advanced schedule: time, duration, recurrence only when requested.
- Remove unrelated generic fields from content types that do not need them.
- Extend structural overlay controls to saved personal copies without mutating published source.

**Gate:** Common edits take one drawer and advanced scheduling stays collapsed by default.

### P25-03B - Selection and batch change

- Select some/all items in the whole Flow.
- Move selected dates, clear dates, include/exclude, and choose selected export scope.
- For anchor flows, distinguish `전체 일정 이동`, `선택 항목 이동`, and `이 항목만` before committing.
- Preview affected counts and preserve explicit item overrides.

**Gate:** Batch changes produce an inspectable before/after summary and can be undone where destructive.

### P25-04A - Anytime task model

- Replace raw `날짜 없는 할 일` framing with the owner-approved user concept, recommended as `언제든 할 일`.
- Keep these items executable in My Flow.
- Calendar provides `일정에 놓기` rather than treating the queue as another execution list.
- Actions: today, choose date, keep Anytime.

**Gate:** A user can find, execute, schedule, and unschedule an item without reading explanatory prose.

### P25-04B - Calendar composition

- Mobile uses a compact drawer/bottom sheet for scheduling candidates.
- Wide uses a side queue beside the calendar, not a full-width block that pushes the grid down.
- Calendar grid remains dated-only; selected-day agenda remains full detail.
- Batch placement and date clearing use the P25-03B change contract.

**Gate:** Dated and undated work never disappear or appear in two completion lists.

### P25-05A - Completion, reopen, and recurrence controls

- One occurrence has one row-level completion control.
- Keep immediate undo.
- Add a persistent completed view and reopen action.
- Put series editing, occurrence completion, and internal checklist progress at separate hierarchy levels.

**Gate:** Complete -> undo and complete -> later reopen both work without changing unrelated occurrences.

### P25-05B - Export scope and parity

- Choose scope (`현재`, `선택`, `Flow 전체`) before format.
- Show exact eligible counts before download/copy.
- Use canonical projection for Calendar/ICS/checklist/sheet/memo.
- Preserve source context but avoid technical/internal labels.

**Gate:** Preview counts equal exported rows/events for every representative Flow type.

### P25-06 - Public artifact and copy reduction

- Show one artifact representation.
- Use include controls that do not mimic completion.
- Remove repeated promise/how-to/storage bands.
- Keep one source/caution disclosure and one save decision surface.
- Preserve public shell, source, detail, and portable export access.

**Gate:** The first viewport shows the actual artifact and save choice; copy explains only what interaction cannot.

### P25-07 - Integrated visual language

- Apply shared spacing, row, toolbar, drawer, status, and responsive tokens.
- Reserve Flow colors for identity, not every control.
- Keep at most three visible text hierarchy levels in compact work surfaces.
- Standardize action vocabulary and icon accessible names.
- Remove held content from ordinary execution while preserving recovery context.

**Gate:** Cross-route visual review finds no one-off control language, nested-card density, overflow, or fixed-navigation collision.

### P25-08 - Internal simulated journey gate

Run the six representative Flow shapes across discovery, save, adjustment, scheduling, execution, completion/reopen, export, and reuse. Capture browser evidence at 390px and 1024px and classify current-command, browser, prior-artifact, heuristic, and owner evidence separately.

**Gate:** Automated Blocking/High is zero and the owner judges the frame coherent enough for a future observation-readiness decision. This does not start or count real-user observation.

## Files By Responsibility

| Area | Likely responsibility |
| --- | --- |
| `lib/flow/*projection*`, recurrence/export adapters | P25-01 truth contract |
| `components/flow/AppClient.tsx` and extracted shared components | P25-02 through P25-07 consumers |
| personal overlay/storage adapters | P25-03 personal changes without source mutation |
| Calendar/date movement modules | P25-04 placement and clearing |
| execution/run history modules | P25-05 completion and reopen |
| public workbench components | P25-06 single artifact representation |
| E2E and content-audit capture | Every slice's evidence gate |

## Risk Controls

- Freeze product hierarchy with P25-00B before redesigning runtime surfaces.
- Fix wrong recurrence and item counts before making them visually persuasive.
- Reuse the canonical Item and personal overlay contracts instead of adding another view-specific state.
- Keep advanced scheduling progressive; do not expose every supported field because it exists.
- Keep exact user-facing labels provisional until prototype review.
- Do not call internal simulations observed-user evidence.
