# 2026-06-08 External Ecosystem Phase 1 Candidate Comparison

Purpose: compare the first three detailed external-ecosystem candidates and decide the next FlowMe review order.

Status: source-to-Flow QA comparison, not user-behavior validation.

HTML view: [2026-06-08 External Ecosystem Phase 1 Candidate Comparison 한국어 HTML](./2026-06-08-external-ecosystem-phase1-candidate-comparison-ko.html)

Related documents:

- [External ecosystem analysis roadmap](./2026-06-08-external-ecosystem-analysis-roadmap.md)
- [Dorm move-in Flow candidate](./2026-06-08-dorm-move-in-flow-candidate.md)
- [Elementary entry Flow candidate](./2026-06-08-elementary-entry-flow-candidate.md)
- [AnyDesk remote support Flow candidate](./2026-06-08-anydesk-remote-support-flow-candidate.md)

## Comparison Table

| Rank | Candidate | Decision | User Moment | Natural Artifact | Minimum Anchor | Strongest Signal | Main Risk |
|---:|---|---|---|---|---|---|---|
| 1 | Dorm move-in preparation | A | Student/parent executes school-specific dorm entry notice | Hybrid: D-day reminders + checklist/memo | Move-in date | Official PDFs/pages contain dates, documents, items, prohibited list, arrival steps | Generalizing one school's health/document/prohibited rules |
| 2 | Elementary school entry preparation | A- | Parent prepares first school day from notices and checklists | Hybrid: D-60 to D-1 reminders + checklist/memo | Entry ceremony date | Very broad parent need and strong checklist shape | Becoming generic shopping advice or overstating blog lists |
| 3 | AnyDesk remote support setup | A- | User prepares one-time remote PC support safely | Internal checklist + closeout memo | Support type or support time | Distinct digital setup axis and clear closeout need | Misread as security guarantee or encouraging remote access |

## Stage 0 Behavior Fit

| Candidate | Open | Anchor Input | Copy/Export | Check | Feedback |
|---|---|---|---|---|---|
| Dorm move-in | High: source-specific route preview | High: move-in date | High: calendar + checklist copy | High: documents/items/prohibited/arrival | High: school-specific missing item |
| Elementary entry | High: parent-source route preview | High: entry date, optional 예비소집 date | High: reminders + checklist copy | High: notice/purchase/defer/label | High: school-specific supply differences |
| AnyDesk remote support | Medium: setup/security source preview | Medium: one-time vs repeated, optional support time | Medium: checklist copy mostly; calendar less central | High: permissions/closeout | High: unclear permission or cleanup concern |

## Source Quality

| Candidate | Source Precision | Source Diversity | Korean-First Fit | Source Boundary |
|---|---:|---:|---:|---|
| Dorm move-in | 5 | 5 | 5 | 5 |
| Elementary entry | 4 | 5 | 5 | 4 |
| AnyDesk remote support | 4 | 4 | 4 | 5 |

Notes:

- Dorm has the best item-level official/semiofficial source structure.
- Elementary has the broadest user demand but depends on visible official-vs-blog separation.
- AnyDesk has strong official product help, but the Flow must not become credential storage or security advice.

## Artifact Fit

| Candidate | Calendar | Checklist | Sheet | Memo | Best First Artifact |
|---|---:|---:|---:|---:|---|
| Dorm move-in | 5 | 5 | 2 | 4 | D-day checklist with calendar reminders |
| Elementary entry | 4 | 5 | 2 | 4 | split checklist: school notice / buy first / buy later |
| AnyDesk remote support | 2 | 5 | 1 | 4 | one-session checklist with closeout steps |

## What FlowMe Must Not Build

| Candidate | Do Not Build |
|---|---|
| Dorm move-in | dorm marketplace, room assignment tracker, health document upload, payment tracking, school login integration, universal prohibited item claims |
| Elementary entry | school assignment lookup, child profile storage, support-money tracker, shopping affiliate surface, universal must-buy list, full parenting coaching |
| AnyDesk remote support | AnyDesk integration, device/address-book storage, password vault, session log, support-ticket product, fraud detection claim |

## Recommended Review Order

### 1. Dorm Move-In Preparation

Implement first as a `/content-flows` review candidate.

Reason:

- Best source-to-artifact fidelity.
- Strong new life-transition axis.
- Clean Stage 0 anchor.
- Lower risk of drifting into generic advice if one primary source is attached.

First UI requirement:

- The top action must be `최신 기숙사 공지 다시 확인`.
- The artifact should show D-14/D-7/D-5/D-1/D-Day.
- `학교별 최신 공지가 우선` must appear near copy/export.

### 2. Elementary School Entry Preparation

Implement second after dorm.

Reason:

- Larger user moment and strong parent demand.
- Useful contrast with dorm: official process plus parent checklist.
- Needs stronger copy discipline to avoid overbuying advice.

First UI requirement:

- The first screen should split `학교 안내 확인`, `먼저 살 것`, and `안내 후 살 것`.
- Avoid budget, support-money, and product claims unless backed by local official source.

### 3. AnyDesk Remote Support Setup

Implement third after the two life-transition candidates.

Reason:

- Expands platform learning into digital setup and permission cleanup.
- Good source/risk boundary exercise.
- Higher caution burden than the other two.

First UI requirement:

- Start with `내가 먼저 요청한 지원인가?`.
- Default one-time support to manual approval.
- Put closeout cleanup in the primary checklist.

## Phase 1 Decision

Phase 1 has produced enough detailed candidates to move from research-only analysis to review-candidate design.

Current recommendation:

1. Promote `Dorm move-in preparation` into `/content-flows` review UI first.
2. Keep `Elementary entry` and `AnyDesk remote support` as documented backup candidates for the same batch.
3. Do not promote any of the three to public `/f/[slug]` until the review UI shows source fidelity, artifact clarity, and mobile first-screen fit.

## Verification

This comparison is document-only. Required verification for this batch:

- `npm run docs:check`

No route, UI, or user behavior is validated by this document.
