# FlowMe Text Authoring UX Design Handoff

- Branch: `codex/text-authoring-ux-design-handoff-20260728`
- Baseline: `origin/main@2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- Package type: design-planning evidence and prompt
- App implementation: unchanged
- Observed-user count: 0
- Local completion state: design contract, prototype, wireflow, review, and implementation handoff
- Remote branch state: completed design package preserved on this branch; not merged to `main`

## Start Here

1. [전체 목표](../2026-07-28-flowme-text-authoring-ux-design-goal-ko.md)
2. [복붙용 통합 프롬프트](./unified-design-prompt-ko.txt)
3. [Evidence index](./evidence-index.md)
4. [실제 콘텐츠 corpus](./content-corpus-index.md)
5. [Source-to-text-to-Flow 예시](./source-to-text-to-flow-examples.md)
6. [제품 경계](./product-boundary.md)
7. [용어](./terminology-ko.md)
8. [응답 템플릿](./response-template-ko.md)
9. [여덟 frozen authoring 사례](./eight-case-frozen-authoring-fixtures.md)
10. [독립 UX 검토](./independent-ux-review.md)
11. [콘텐츠 fidelity 검토](./content-fidelity-review.md)
12. [접근성 검토](./accessibility-review.md)
13. [브라우저 QA](./browser-qa.md)
14. [완료 감사](./completion-audit.md)
15. [v1.1 상세판 검토](../2026-07-29-flowme-text-authoring-ux-v1-1-detail-review.md)

## Local Design Outputs

- [Text Authoring UX interactive prototype](../2026-07-28-flowme-text-authoring-ux-v1-ko.html)
- [Text Authoring UX v1.1 detailed simulation](../2026-07-29-flowme-text-authoring-ux-v1-1-detail-ko.html)
- [v1.1 detail delta](../../specs/2026-07-28-flowme-text-authoring-ux-v1/prototype-detail-delta-v1-1.md)
- [v1.1 QA screenshots](../2026-07-29-flowme-text-authoring-ux-v1-1-detail-assets/)
- [A/B/C current/proposed wireflows](../2026-07-28-flowme-text-authoring-wireframes-ko.html)
- [Offline prototype](./offline-preview/index.html)
- [Offline wireflows](./offline-preview/wireframes.html)
- [UX v1 spec](../../specs/2026-07-28-flowme-text-authoring-ux-v1/spec.md)
- [Implementation goal prompts](../../specs/2026-07-28-flowme-text-authoring-ux-v1/implementation-goal-prompts.md)
- [QA screenshots](./assets/)

GitHub tree:

https://github.com/knhbae/flowme2605/tree/codex/text-authoring-ux-design-handoff-20260728/docs/content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff

Raw prompt:

https://raw.githubusercontent.com/knhbae/flowme2605/codex/text-authoring-ux-design-handoff-20260728/docs/content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/unified-design-prompt-ko.txt

## What This Package Enables

Claude Design, Codex, or another independent reviewer can use this package without access to
`D:\flowme2605`.

The package contains:

- current tracked product and conversion rules through relative repository links;
- read-only snapshots of the latest local qualified corpus and projection evidence;
- actual Todo and Sheet fixtures;
- authoring ownership and current-capability matrices;
- eight representative authoring cases;
- a unified prompt and response contract.
- a deterministic standalone prototype and A/B/C wireflow;
- independent UX, content fidelity, accessibility, and browser QA records;
- sequential TA-01 through TA-06 implementation prompts.

## Evidence Boundary

Files under `local-evidence/` were copied from local, uncommitted planning artifacts on
2026-07-28. They are evidence snapshots for design comparison, not merged runtime contracts and
not production behavior.

The following priority applies when evidence conflicts:

1. current production interaction, if independently accessible;
2. current tracked source on this branch;
3. current tracked structured evidence;
4. `local-evidence/` snapshot;
5. prior interactive HTML or design artifact;
6. external reference pattern;
7. heuristic simulation.

Automatic parsing, screenshots, fixtures, and agent simulation are not observed-user validation.

## Reviewer Roles

### Claude Design

- Do not edit app code.
- Create current/proposed 390px, 1024px, and key 1440px wireflows.
- Compare Markdown-first, block/outline, and hybrid text-plus-preview approaches.
- Build a standalone interactive HTML using the supplied real content.
- Resolve hierarchy and state with controls and composition, not longer explanation.

### Codex or Claude Code

- Do not edit app runtime in this planning lane.
- Reconcile the proposed UI with current data ownership and projection contracts.
- Identify which states are deterministic fixtures, current capabilities, or proposed behavior.
- Specify implementation slices, migration needs, rollback boundaries, and tests.

## Publish State

The completed design package is preserved on this branch as a reviewable checkpoint. It remains
separate from `main`; no PR, merge, deployment, app implementation, or product approval is implied.

This package is design-only. It does not imply:

- implementation approval;
- main merge;
- production deployment;
- actual AI parsing;
- account or cloud persistence;
- observed-user validation.
