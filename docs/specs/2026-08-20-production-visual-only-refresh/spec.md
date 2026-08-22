# Production Visual-Only Refresh

**Status:** ACTIVE / IMPLEMENTATION AND SCOPED AUTOMATED QA COMPLETE / SOURCE-REVIEW PREREQUISITE RESOLVED / EXACT-HEAD CI, SEQUENTIAL MERGE, AND PRODUCTION VERIFICATION AUTHORIZED<br>
**Owner approval:** 2026-08-20<br>
**Observed users:** 0

## Goal

Improve the main app's visual coherence across discovery, public preview, editing,
saved-plan execution, export, Calendar, and management without changing product
behavior. The approved direction is documented in the
[visual-only Production review](../../content-audit/2026-08-19-flowme-production-ux-visual-only-refresh-ko.html).

## In Scope

- One warm off-white, ink, cobalt, and semantic-state visual language.
- Shared color, typography, spacing, radius, shadow, control, and focus tokens.
- Consistent app/public shells, cards, inputs, actions, sheets, menus, date rails,
  execution rows, and responsive workspace surfaces.
- Targeted visual alignment for `/flows`, `/f/:slug`, public Plan/Item editing,
  `/my`, export/management, `/calendar`, and hydration fallbacks.
- 390, 1024, and 1440 pixel visual inspection plus breakpoint-boundary checks.

## Preserved Contracts

- Routes, URLs, history, deep links, and focus-return behavior.
- Copy, labels, source content, item counts, result formats, and their order.
- Data ownership, storage bytes, schemas, transactions, dates, anchors, save,
  export, receipt, lifecycle, rollback, and recovery behavior.
- Existing responsive information architecture and DOM meaning.
- Shared-source versus personal-copy boundaries.

## Explicit Non-Goals

- No journey redesign, feature subtraction, field addition, or control reordering.
- No repair of date/result semantics or Calendar availability.
- No lifecycle vocabulary change; the unpublished trash work remains separate.
- No Figma artifact, new font/icon package, animation system, or backend change.
- Scoped commit, branch push, PR, and Vercel Preview were authorized on 2026-08-20.
- On 2026-08-23 the Owner authorized sequential PR #194 then PR #195 merge and
  Production verification; neither PR may bypass its own exact-head CI.

## Visual Contract

- Forward actions use cobalt; selected navigation uses ink.
- Green, amber, and red are reserved for positive, warning, and destructive states.
- Ordinary cards are quiet; shadows communicate real elevation only.
- Primary controls are 48px and compact/secondary controls are at least 44px where
  existing layout contracts permit.
- Focus is opaque, high-contrast, offset, and never hidden by sticky UI.
- Korean support text remains readable at small widths and control boundaries are
  distinguishable without relying on shadow alone.
- The existing seven-column Calendar may keep compact overflow hit widths where a
  44px width cannot fit without changing layout; its readable labels still use the
  shared 12px floor and the exception remains a separate follow-up.

## Acceptance

1. Core routes share the same semantic tokens and visual hierarchy.
2. No user-facing behavior, copy, route, order, count, or persisted byte changes.
3. Visual-scope component and contract suites pass; production build passes;
   any unrelated repository-wide gate is reported explicitly rather than hidden.
4. At 390/1024/1440, horizontal overflow is at most 1px, fixed layers do not
   collide, and the console/page-error count is zero on representative journeys.
5. Keyboard focus is visible, named controls remain named, and approved mobile
   actions preserve their existing 48px gates.
6. Publication stays limited to the authorized PR #194 then PR #195 sequence;
   exact-head CI and resulting Production verification are required, while
   observed-user evidence remains 0.

## Reopen Conditions

Reopen this gate if visual styling changes content hierarchy, alters a semantic
state, causes a responsive/focus regression, or requires a product-flow decision.
Move such work into its own behavioral spec instead of expanding this gate.
