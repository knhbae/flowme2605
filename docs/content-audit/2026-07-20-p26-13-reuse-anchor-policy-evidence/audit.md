# P26-13 Audit

## Finding Before The Change

The run model already preserved a completed run and could apply either `keep_fixed_dates` or `reset_to_anchor`. The visible panel did not show the resulting date change before commit, and its generic `이 Flow 다시 쓰기` entry did not tell a moving user that a new move date was required. The user had to infer four separate outcomes from form copy: anchor-linked dates, personally fixed dates, completion reset, and history preservation.

## Implementation

### Pure preview

`lib/flow/flow-run-reuse-preview.ts` accepts current/next anchor rows and the fixed-date policy. It returns:

- current and next dated ranges;
- anchor-linked date-change count;
- next dated/undated counts;
- `awaiting_choice / kept / reset / not_needed` fixed-date outcome;
- explicit independent-run, previous-run preservation, and completion-reset flags.

Malformed dates make a dated preview unready without deleting rows. Duplicate row IDs are counted once. The function does not read or write storage.

### My Flow presentation

- Context-aware entry: `새 이사일로 다시 쓰기`, fallback `새 기준일로 다시 쓰기`, or `새 실행으로 다시 쓰기` for date-free Flow.
- Current/new anchor and date range are compared in one row.
- Consequences are presented as compact result rows rather than another explanation block.
- The start button references the live preview through `aria-describedby`.
- The receipt confirms the fixed-date result and completion reset while the run history remains directly below it.

### Ownership

- Source: unchanged.
- Personal overlay: title/memo/include values clone through the existing run path; fixed dates follow the explicit keep/reset policy.
- Execution run: previous run completes and receives an immutable snapshot; the new run receives a different ID and empty completion state.
- Export: current-run ICS reads the new anchor. Past-run list exports continue to read the archived snapshot.

## Browser Scenarios

### Moving, reset policy

Route: `/my`, 390x844 and 1024x900.

1. Seed completed `moving-d30-basic` at `2026-08-10` with one fixed personal date.
2. Open `새 이사일로 다시 쓰기`.
3. Select `2026-10-20` and `새 이사일에 맞추기`.
4. Confirm `24개 재배치`, `1개 재계산`, completion reset, and past-run preservation.
5. Start the run and inspect registry, old snapshot, current overlay, history, and downloaded ICS.

Result: independent run and reset policy pass. Old-run completion, memo, reflection, correction note, and fixed date remain in history. New-run ICS contains `DTSTART;VALUE=DATE:20261020` and not `20260810`.

### Moving, keep policy

Route: `/my` -> `/calendar`, 390x844 and 1024x768.

Result: the fixed date remains `2026-07-15`, moves from the previous anchor row key to the next anchor row key, and appears once in Today and Calendar. The completed run keeps the original key.

### Date-free reuse

Route: `/my`, 390x844.

Result: anchor input count is zero, the six-item current composition is retained, completion resets, and a `same_copy` run starts while history remains.

### Version review compatibility

The existing reviewed-version path passes with the new preview. Sensitive/source-version selection remains separate from anchor and fixed-date policy.

## Visual Review

- `01-completed-flow-reuse-mobile.png`: compact result rows above the fixed bottom navigation; overlap and horizontal overflow are zero.
- `02-completed-flow-reuse-wide.png`: old/new anchor and range comparison, policy, and result in the completed Flow workspace.
- `02-new-run-started-mobile.png`: receipt and preserved history before the current execution rows.
- `03-new-run-history-wide.png`: previous-run history after the new run starts.
- `04-date-free-reuse-mobile.png`: reuse without an irrelevant date input.

These screenshots are automated browser evidence, not user observation.

## Verification

- Pure preview fixtures: 4 passed.
- Full unit: 556 passed, 0 failed.
- Dated reset and date-free Playwright: 2 passed.
- Fixed-date keep Playwright: 1 passed.
- Version review/reflection/date-free compatibility: 3 passed.
- Production build: 18 routes.
- Dependency audit at high threshold: high/critical 0; two existing moderate PostCSS findings remain and no force upgrade was applied.
- Horizontal overflow: 0.
- Console/page error: 0.

`docs:check` passed with 2,630 local links and `git diff --check` passed. Publish state is recorded in the commit/push history.
