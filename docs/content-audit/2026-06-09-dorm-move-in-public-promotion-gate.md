# 2026-06-09 Dorm Move-In Public Promotion Gate

Purpose: turn the strongest Phase 5 external-ecosystem candidate, `college-dorm-move-in-checklist`, into a clear public-promotion gate without creating a public route yet.

Status: source/platform review and product boundary. This is not user-behavior validation and not a public `/f/[slug]` approval.

HTML view: [Dorm Move-In Public Promotion Gate Korean HTML](./2026-06-09-dorm-move-in-public-promotion-gate-ko.html)

## Decision

Keep `college-dorm-move-in-checklist` as the strongest next review candidate, but do not public-promote it yet.

Decision: `A` review candidate, `public_route_pending_evidence`.

Why:

- The user moment is concrete: a student or parent has a dorm move-in date and must prepare documents, bedding, first-day supplies, prohibited-item review, and entry-day steps.
- The artifact is naturally hybrid: date-based reminders plus checklist/memo.
- Official dorm pages provide enough source shape for FlowMe to create a small execution artifact.
- The risk is also clear: school-specific notices can differ by term, and FlowMe must not store health document images, payment data, room passwords, student IDs, resident numbers, or private medical details.

## Source Freshness

Rechecked on 2026-06-09.

| Source | Current evidence | FlowMe reading |
|---|---|---|
| [Daegu Catholic University dormitory entry guide](https://dormitory.cu.ac.kr/page_SgCx18) | Lists entry-day submission documents, tuberculosis test result validity, bedding and basic supplies, permitted electronics, prohibited routers/heat appliances/cooking tools/alcohol, and term-specific dorm fee notice. | Strong primary source for the current candidate. FlowMe can convert documents, packing, prohibited-item review, and D-Day entry actions into a checklist, but must keep latest notice priority. |
| [Dong-eui University Hyomin dormitory entry guide](https://dorm.deu.ac.kr/hyomin/30/3013.kmc) | Lists pledge form, tuberculosis certificate, changing academic schedule-based entry date, room confirmation, document submission, entry log signature, mobile pass, bedding/personal items, and prohibited electric/heating items. | Strong comparator showing the same execution skeleton: document prep, room/pass/entry process, supplies, prohibited items. |
| [Kyung Hee University second dormitory entry guide](https://dorm2.khu.ac.kr/30/3010.do) | Provides a standing entry/exit information surface and related application, confirmation, notice, and resident-guidance paths. | Useful boundary source: term notices and school-specific pages must remain authoritative before public promotion. |

## Current FlowMe Evidence

Current implementation evidence already present in the worktree:

- Candidate id: `college-dorm-move-in-checklist`.
- Source type: `official`.
- Destination: `hybrid`.
- Structure: `timeline`.
- First action: `최신 기숙사 공지 다시 확인`.
- Current items: D-14 latest notice, D-10 documents, D-7 first-day supplies, D-5 prohibited items, D-Day entry/facility check.
- Current no-storage copy: health document images, payment accounts, room passwords, student IDs, resident numbers, and other private details stay outside FlowMe.
- Current review metadata classifies the candidate as `clear_official`.
- Current selection audit keeps it as `p1_evaluate_next`, not representative or validated.

## User Behavior

- User moment: a student or parent prepares for dorm move-in after receiving a school notice, dorm page, or term PDF.
- Current behavior: read a dorm page/PDF, screenshot it, create a private checklist, ask family what to pack, and re-check prohibited items manually.
- Manual breakpoints:
  - required documents and packing items are mixed together;
  - health-related documents are easily confused with medical advice or image storage;
  - prohibited items differ by school;
  - entry-day room/pass/key/facility-check steps are easy to miss;
  - payment, room password, student ID, and health data should not enter FlowMe.

## Public Promotion Gate

Promote to a public `/f/[slug]` route only when all are true:

1. One current primary source is selected for the route, and all other dorm pages/PDFs are treated as pattern support.
2. The first visible action remains latest school/dorm notice confirmation.
3. The public UI shows that school-specific latest notices override FlowMe.
4. The public artifact contains D-14, D-10, D-7, D-5, and D-Day checks or an equivalent source-backed sequence.
5. Calendar export and checklist copy carry source URL, latest-notice caution, and completion criteria.
6. The UI does not ask for or store health certificate images, payment account data, room passwords, student IDs, resident numbers, card key numbers, login credentials, or private medical details.
7. The route makes no universal claim about required documents or prohibited items across all dorms.
8. Mobile first viewport shows the executable artifact before long source explanation.
9. The route remains source-review status, not validated.

## Do Not Build

Do not build now:

- public route before the gate above is satisfied;
- dorm marketplace;
- room assignment tracker;
- school login integration;
- payment tracking;
- health document upload;
- roommate matching;
- student-life dashboard;
- universal dorm packing list;
- medical eligibility decision;
- prohibited-item guarantee;
- calendar/sheet/account integration.

## Proposed Public Route Shape

If this is promoted later, use a narrow route shape:

| Surface | Shape |
|---|---|
| Route id | `dorm-move-in-dday-check` or equivalent Korean-first slug |
| Anchor | move-in date |
| Primary source | one selected current dorm notice/page |
| Destination | hybrid: calendar reminders plus internal checklist/memo |
| First action | latest dorm notice confirmation |
| Export | `.ics` reminders, copyable checklist, optional memo |
| Status | source review, not validated |

## Conversion Decision

Conversion decision:

- User need: As a student or parent preparing for dorm move-in, I need to confirm the latest dorm notice, prepare required documents, pack allowed first-day items, remove prohibited items, and finish entry-day steps, so that I can arrive without missing school-specific requirements.
- Content shape: official dorm entry guide and term-specific dorm notices.
- Primary destination: `hybrid`.
- Structure: `timeline`.
- Action count: 5 primary actions for current review, expandable only if the selected primary source requires it.
- Playbook: moving/admin timeline.
- Exceptions: do not generalize one school’s health-document, payment, meal, pass, or prohibited-item rule to every dorm.
- Risk/source handling: official source facts, user packing memo, and caution copy stay separate; sensitive documents and credentials stay outside FlowMe.

## Product Decision

- A/B/C: `A` review candidate, not public route yet.
- Why: this is the strongest next life-transition candidate from the external ecosystem compression table, but public promotion needs a route-specific current primary source and mobile artifact-first review.
- Next action: keep the candidate in `/content-flows`, attach this public-promotion gate, and only consider a public route after the gate is checked against a chosen current source.
- Do not build: dorm platform, student workspace, account integration, health-document storage, payment tracking, or universal dorm guidance.

## Rubric Snapshot

- User Need Fit: 5
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 5
- Cognitive Load: 4
- Copy Specificity: 4
- Source/Safety: 5
- Accessibility/Operability: 4

Lowest point: content fidelity. Before public promotion, one exact primary source should be selected so FlowMe is not blending multiple dorm rules into one universal checklist.
