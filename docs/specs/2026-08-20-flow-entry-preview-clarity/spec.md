# Flow Entry And Preview Clarity

**Status:** ACTIVE / LOCAL IMPLEMENTATION AND PRIOR-HEAD AUTOMATED QA COMPLETE /
OWNER RELEASE DECISION COMPLETE / RECONCILED EXACT-HEAD CI, MERGE, AND
POST-MERGE PRODUCTION VERIFICATION PENDING

**Owner approval:** 2026-08-20

**Observed users:** 0

**Related baseline:** [Production Visual-Only Refresh](../2026-08-20-production-visual-only-refresh/spec.md)

## Goal

Make discovery and public Flow review read as one continuous job: enter one query,
URL, or memo; choose a prepared Flow when one exists; understand its complete
structure in Flow text syntax first; compare the complete Todo or Calendar result;
then save it under a title that does not add a meaningless copy number.

This is a bounded behavior follow-up stacked on the visual-only refresh. It does
not reopen the released navigation, data, persistence, edit, export, or lifecycle
architecture.

## Stage Fit

FlowMe is still export-first. This slice removes duplicated discovery controls and
lets a user inspect the natural text, checklist, and calendar artifacts already
produced by a prepared Flow. It improves comprehension before save without adding
an account workspace, live AI generation, a new authoring route, or a new external
integration.

## User Need

As a person looking for a reusable plan, I need one clear discovery entry and a
complete, predictable first preview, so that I can understand the Flow before I
save or personalize it.

## In Scope

### One discovery entry

- `/flows` exposes one visible field labelled for a plan query, URL, or memo.
- A concise plain-text query live-filters the prepared catalog without writing
  storage or producing a private draft.
- A submitted valid HTTP or HTTPS URL keeps the existing canonical URL lookup
  behavior; scheme-like memo text and non-web protocols stay out of URL lookup.
- When plain text matches a prepared Flow, that reusable Flow wins. A separate,
  explicit action lets the user intentionally use the same text as a memo draft.
- Choosing the prepared result clears stale category, tag, structure, and intent
  filters so a hidden browse filter cannot misroute it into a memo draft.
- Submitted plain text with no prepared match keeps the existing private
  rule-based memo-draft path.
- Editing the shared field after a lookup clears the stale lookup result.
- Choosing `다른 계획 둘러보기` after a URL or memo result shows the prepared
  catalog; the previous URL or memo is not reused as a hidden catalog filter.
- Existing intent/category chips remain a secondary browse refinement, not a
  second search field.

### Predictable Flow preview

- Each newly opened Flow starts on `Text`, regardless of the destination selected
  on the previously viewed Flow.
- `Text` renders the complete approved Flow with its Flow authoring grammar,
  including the title, structure, Steps, source timing, completion guidance,
  links, and safety warnings. Parser-unsupported fixed-date overrides, explicit
  date removal, descriptions, and personal memo are visibly separated as Preview
  metadata rather than invented as source syntax. It does not become editable.
- In the approved public result mode, `Todo` shows every included Step and
  preserves its meaningful execution grouping.
- In the approved public result mode, `Calendar` shows every included dated Step,
  preserves date grouping, and places the anchor/date setup before the long
  result list.
- Ordinary public Flows and executable public Flow Maps use the same approved
  result contract. Their `Text`, `Todo`, and `Calendar` results do not hide rows
  behind an arbitrary first-three-items disclosure. Existing legacy/default
  preview modes retain their current compact disclosure behavior.

### Copy titles

- When only one saved personal copy exists for a source Flow, its display title is
  the Flow title without `사본 1 ·`.
- When two or more personal copies of the same source Flow exist, ordinal prefixes
  remain so the copies can be distinguished.
- Display-title simplification does not rewrite persisted titles, source identity,
  or personal-copy identity.

## Out Of Scope

- Editing Flow syntax directly from the public preview.
- Changing the parser, seed content, source facts, source quality decisions, or
  canonical URL registry.
- Changing saved-plan schemas, storage keys or bytes, completion state, anchor
  precedence, export formats, receipts, archive/trash behavior, or edit ownership.
- Removing intent chips, adding global search, adding live AI, or fetching
  arbitrary web content.
- Replacing semantic grouping with virtualization or pagination in this slice.
  If a genuinely large approved Flow creates a performance problem, reopen with
  measured evidence rather than restoring an arbitrary three-row cap.
- Bypassing exact-head CI or post-merge Production verification. Owner release
  authorization does not replace either technical gate.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Enter a concise query, URL, or memo in the one `/flows` field. |
| Completion signal | A prepared Flow opens with complete Text syntax first, or the existing URL/memo result appears for that intent. |
| Artifact destination | Read-only Flow text, full Todo/checklist, full grouped Calendar; existing save/export destinations remain unchanged. |
| Source/risk boundary | Text and result previews render the effective approved plan without turning personal memo text into source guidance or implying a new canonical source. |
| Natural artifact | Example: `이사` filters to `이사 D-30 준비`; its 24 Steps can be read as Flow text, a 24-row Todo, or date-grouped Calendar before save. |
| Service structure impact | `/flows` intake and public artifact presentation change inside existing route/component owners. No route, persistence owner, or export contract is added. |
| Tooling and verification lane | Flow UX/copy review, React review, focused component/contract tests, production build, and real-browser verification at 390/1024/1440. |
| Verification | One-input intent checks, per-Flow Text reset, full-row/grouping checks, copy-title cardinality tests, legacy regression, build, and responsive browser QA. |

## Acceptance Criteria

1. `/flows` has one visible text-entry control for query, URL, and memo; there is
   no second catalog search box.
2. Typing a concise prepared-plan query filters results immediately and does not
   create or mutate a local draft.
3. HTTP(S) URL hit/review/miss and unmatched memo paths preserve their existing
   outcomes; prepared matches win unless the explicit memo action is chosen, and
   changing the shared input removes stale result state.
4. Every Flow opens on Text by default, and that Text preview renders the complete
   plan in the current Flow syntax without becoming editable.
5. Approved Todo and Calendar previews render all eligible rows with meaningful
   grouping and no `나머지 N개 보기` cap; Calendar setup precedes its rows.
6. Legacy/default result modes keep their existing disclosure contract.
7. A single personal copy has no ordinal prefix; sibling copies of the same source
   remain numbered and distinguishable.
8. Existing routes, storage bytes, source/personal ownership, completion, edit,
   save, export, receipt, and lifecycle semantics do not change.
9. Focused automated checks, production build, and responsive browser checks pass
   on the reconciled exact head before merge.
10. Preview publication, merge, and Production verification remain distinct
    evidence states and none is described as observed-user validation; observed
    users remain `0`.

## Publication Boundary

The Owner reviewed the Preview and completed FPC-11 by authorizing this bounded
release after the visual-refresh baseline. [PR #196](https://github.com/knhbae/flowme2605/pull/196)
resolved the source-review prerequisite, and [PR #194](https://github.com/knhbae/flowme2605/pull/194)
merged as `c8a57ba37c4087b84b526bc778c3604f68299faa` with its Production
deployment verified. [PR #195](https://github.com/knhbae/flowme2605/pull/195)
must still pass reconciled exact-head CI before merge, followed by separate
Production verification. Observed users remain `0`.
