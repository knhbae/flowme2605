# Representative UX Content Review

Date: 2026-05-25

## Decision

The next UX/content review pass starts with the three current candidate routes:

| Route | Current status after review | User-run decision |
|---|---|---|
| `computer-skills-d30-study` | Representative-eligible, not validated | Ready for observed export-first session |
| `diet-habit-2week` | Public MVP candidate with guardrails, not validated | Needs guardrail rewrite before stronger framing |
| `new-car-delivery-check` | Public MVP candidate with guardrails, not validated | Needs guardrail rewrite before stronger framing |

No route is validated by this review.

## Simulated User Runs

### `computer-skills-d30-study`

- First action: enter exam date, review source-derived rows, export D-30 calendar plus study sheet.
- Natural output: calendar milestones plus spreadsheet rows for chapter scope, target date, status, weak-area memo, mock score, wrong-answer type, and retry date.
- Current UX gap: verify in an observed session whether the user understands the source-derived rows are prefilled and only execution fields are editable.
- Mobile risk: medium-low; the progress table can still feel dense.
- Next small fix: run one observed session and record whether the user can explain the exported calendar and sheet.

### `diet-habit-2week`

- First action: enter start date and begin the two-week observation sheet.
- Natural output: daily observation sheet with meals, activity, sleep, optional measurement, condition, stop/consult condition, and weekly observation memo.
- Current UX gap: the route can still read like diet coaching if observation language and stop condition are not dominant.
- Mobile risk: medium; warning/source/observation/review sections can stack.
- Next small fix: tighten first-screen copy and notes around observation sheet plus stop condition.

### `new-car-delivery-check`

- First action: enter vehicle/dealer context and fill the defect evidence sheet before treating checklist completion as progress.
- Natural output: evidence sheet with defect row, photo filename, option/document status, dealer confirmation, follow-up owner, and personal hold/signing memo.
- Current UX gap: checklist completion can compete with the delivery-day evidence job.
- Mobile risk: medium; evidence rows, hold memo, inspection sections, documents, and payment checks are long.
- Next small fix: tighten copy so the first success signal is a portable evidence sheet, not a completed generic checklist.

## Follow-Up Queue

1. Route-level copy pass for `diet-habit-2week`.
2. Route-level copy pass for `new-car-delivery-check`.
3. Observed export-first session for `computer-skills-d30-study`.
4. After the two guardrail rewrites, re-check mobile first screens before public MVP framing.

## Screenshot

![Representative UX Content Review Flow Lab panel](../screenshots/2026-05-25-representative-ux-content-review-flow-lab.png)
