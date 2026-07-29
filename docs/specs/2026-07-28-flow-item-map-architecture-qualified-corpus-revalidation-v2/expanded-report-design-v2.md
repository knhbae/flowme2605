# Expanded report design v2

## Purpose

The original v2 report proves the architecture but compresses its explanation.
This presentation redesign keeps the same frozen corpus and conclusions while
making the source-to-data transformation understandable without opening the
machine JSON first.

Design references:

- `output/design-concepts/flow-architecture-expanded-hero-concept.png`
- `output/design-concepts/flow-architecture-expanded-case-concept.png`

These are layout references, not evidence artifacts and not production UI.
All final text and data remain code-native and are generated from the
machine-readable corpus.

## Visible-copy lock for the first viewport

- `Item은 원본, ICS는 전달물`
- `원문 콘텐츠 → SourceRow → Item → Projection`
- `160 Item`
- `210 SourceRow`
- `48 날짜 없음`
- `Canonical Item 유지 + 내보낼 때만 묶기`

No content screenshots, readiness badges, six-column metric dashboard, or
three detailed case cards appear in the first viewport.

## Design system

- Background: deep forest `#08291f` for opening and closing slides; true white
  or very pale green-gray `#f5f8f4` for explanation slides.
- Text: `#10231c`; muted `#66756e`; inverse `#ffffff`.
- Accent: lime `#d8f26a`; canonical blue `#2f66b7`; source purple `#7653a6`;
  projection green `#19714d`; user overlay yellow `#c58a16`; review amber
  `#b96b13`; hold red `#ae4d45`.
- Typography: large editorial Korean headings, 18px or larger body on desktop,
  14px or larger supporting copy. Avoid the previous 8–10px trace labels.
- Containers: open bands and one purposeful source frame. Avoid nested bento
  cards and repeated small metric tiles.
- Source screenshots: readable 16:9 or 4:3 frames occupying 35–45% of the
  desktop slide.
- Connections: simple CSS lines and arrows. No decorative icon inventory is
  required.

## Storyboard

### Part 1 — Understand the grammar

1. Opening conclusion.
2. Evidence levels: 8 qualified conversions, 2 historical boundaries, 27
   qualification subjects, 8 future contracts.
3. Six source-data shapes.
4. Canonical hierarchy and one-to-many relationships.
5. One real Item and its required/optional fields.
6. Schedule branch: VEVENT or non-calendar projection.

### Part 2 — Eight qualified contents

Each content receives three slides so source evidence, canonical grouping, and
destination projection never compete for the same viewport.

1. `원문이 SourceRow가 되는 방법`
   - real source screenshot;
   - source shape and row unit;
   - up to three actual SourceRows;
   - counts and required user inputs.
2. `SourceRow를 canonical 구조로 묶는 방법`
   - up to three actual Items;
   - a vertical SourceRow → Item → Step → Flow → Bundle/Map hierarchy;
   - a short explanation of what each layer adds.
3. `canonical Item을 실제 도구에 보내는 방법`
   - one representative Item field view;
   - natural Calendar/Checklist/Todo/Sheet/Memo projections;
   - architecture, logic, public, rights, and personal readiness boundaries.

The eight contents are:

- 이사 D-30 체크리스트
- 초기 이유식 D+174~209 식단
- 오픽 모의고사 계획표
- 생활코딩 WEB1 진도표
- 신차 구매 8단계
- Allblanc 7일 복근 챌린지
- 이번 주 여름 반찬 5가지
- AND 취업 준비 영상 3편

### Part 3 — Compare and decide

1. Same `lesson_rows`, different schedule: OPIc vs WEB1.
2. Same `resource_collection`, different destination: Allblanc vs recipes vs
   AND videos.
3. Same Item, several projections.
4. Same-date `step_bundle` with canonical child completion.
5. Three-architecture score summary.
6. Logic/Public/Rights/Personal readiness separation.
7. Historical corpus delta.

### Part 4 — Wider coverage without overstating evidence

1. Triple and Fitpet as actual historical data shapes stopped by current
   readiness gates.
2. 27-subject qualification map, one lifeArea per slide; only eight are
   canonical handoff records.
3. Eight Vertical opportunities as future field contracts with
   `SourceRow 0 · Item 0 · 변환 완료 아님`.
4. Missing actual corpus shapes and the next acquisition targets.
5. Final backend rules and `NOT RUN` evidence boundaries.

## Responsive behavior

- Desktop 1440×900: one question, one claim, one main visual per slide.
- Mobile 390×844: slide height becomes content-driven; horizontal pipelines
  become numbered vertical stages.
- SourceRow and Item examples become stacked lists, not rotated tables.
- The appendix explorer keeps horizontal scrolling only inside its own
  explicitly scrollable table or filter rail; the document itself must not
  overflow.
