# Source To Text To Flow Examples

These examples show the design input and expected structural interpretation. They are not a final
FlowMe text grammar.

## 1. Relative-Date Flow

Evidence:

- [moving Todo fixture](./local-evidence/fixtures/todo/bundle-moving-d30.md)
- [moving Sheet fixture](./local-evidence/fixtures/sheet/bundle-moving-d30.csv)
- [qualified corpus](./local-evidence/qualified-corpus-v2/qualified-corpus-fixture-v2.json)

Possible author text:

```markdown
# 이사 D-30 체크리스트

기준일: 이사일
출처: AJD 이사 준비 체크리스트

## D-30 · 큰 결정과 예약
- [ ] 이사 방식과 업체를 결정하기
  자세히: 포장·반포장·일반이사 중 방식을 고르고 견적을 비교한다.
  완료 기준: 업체 후보와 예약 상태를 남긴다.

## D-10 · 주소·서비스·짐 줄이기
- [ ] 우편·배송·공과금 주소 변경하기
```

Expected interpretation:

- one Flow;
- Step headings preserve D-day periods;
- checkable rows become Items;
- prose becomes detail, not another Item;
- relative dates require one user anchor date;
- source stays attached to the Flow and relevant Items.

Version boundary:

- this qualified corpus example is AJD with 27 Items;
- current runtime AJD has 24 Items;
- the earlier Input Composer example is EasyLaw with 24 Items.

The authoring UI must show the exact fixture and must not combine them.

## 2. Ordered Flow With Resources

Evidence:

- [Allblanc Todo fixture](./local-evidence/fixtures/todo/bundle-allblanc-7day-abs.md)
- [Allblanc Sheet fixture](./local-evidence/fixtures/sheet/bundle-allblanc-7day-abs.csv)

Possible author text:

```markdown
# Allblanc 7일 복근 챌린지

## Day 1
- [ ] 코어 + 복근 한방에! 20분 복근 운동
  영상: https://www.youtube.com/...

## Day 2
- [ ] 허리 통증 없이 20분 복근 운동
  영상: https://www.youtube.com/...
```

Expected interpretation:

- the video is a resource, not a second completed Item;
- the seven days preserve order;
- a user start date may project the seven sequence Items to Calendar;
- completion belongs to each sequence Item, not the resource URL;
- this seven-video fixture is not the same as the one-video
  `curated-allblanc-morning-workout` weekly routine.

## 3. Relative Timeline With Optional Undated Use

Evidence:

- `lib/flow/real-content-pilot-flows.ts`

Frozen author text:

```markdown
## D-14 검사 기간 확인
- 자동차검사 기간과 예약 가능일 확인하기 D-14
- 차량번호와 예약 정보 확인하기 D-14
- 가까운 검사소와 수수료 확인하기 D-10

## D-3 차량 상태 점검
- 번호판과 차대번호 식별 상태 확인하기 D-3
- 등화장치와 경음기 작동 확인하기 D-3
- 타이어 마모와 공기압 확인하기 D-3
- 오일 누유와 경고등 여부 기록하기 D-3

## D-Day 검사 당일
- 예약 시간보다 여유 있게 검사소 도착하기 D-Day
- 접수와 수수료 결제 진행하기 D-Day
- 검사 결과와 재검사 필요 항목 기록하기 D-Day
```

Expected interpretation:

- canonical source keeps D-14, D-10, D-3, and D-Day;
- before a user supplies an inspection date, Todo may remain undated;
- adding an inspection date calculates Calendar dates without changing source offsets;
- removing the personal date returns to the undated projection, not a source rewrite.

## 4. Long Progress Table

Evidence:

- [Input Composer Lab](../../specs/2026-07-20-flowme-input-composer-lab-v1/spec.md)
- [Input Composer scenarios](../../specs/2026-07-20-flowme-input-composer-lab-v1/input-composer-scenarios-v1.json)

Possible pasted table:

```text
주차	주제	활동
1주	데이터 분석 소개	강의 듣기와 퀴즈
2주	데이터 수집	강의 듣기와 실습
...
14주	최종 정리	최종 과제
```

Expected interpretation:

- all 14 rows remain visible;
- Sheet is the primary artifact;
- a row is not converted to Calendar without an actual date;
- current completed week is a personal run value, not source content.

The same rule applies to the LibriVox 38-chapter queue: preserve all chapters and current playback
position; do not invent listening dates.

## 5. Decision And Record Flow

Evidence:

- [new-car Todo fixture](./local-evidence/fixtures/todo/bundle-new-car-comparison.md)
- [new-car Sheet fixture](./local-evidence/fixtures/sheet/bundle-new-car-comparison.csv)

Possible author text:

```markdown
# 신차 구매 8단계

## 예산과 후보
- [ ] 총예산과 월 납입 가능액 정하기
- [ ] 차종·트림·옵션 후보 좁히기

## 견적 비교
- [ ] 현금·할부·리스·장기렌트 비교하기
  기록: 후보별 총비용과 계약 조건
```

Expected interpretation:

- actionable decisions become Items;
- comparison values can become Sheet fields;
- explanatory purchase context remains detail or Memo;
- the UI must not reduce every decision to a binary checkbox.

## 6. Personal Free-Text Memo

Current deterministic fixture:

```text
8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약,
준비물 체크, 출발 전날 온라인 체크인
```

Evidence:

- [P26 memo segmentation E2E](../../../tests/e2e/p26-memo-segmentation.spec.ts)

Current expected split:

1. 항공권 확인
2. 숙소 예약번호 정리
3. 렌터카 예약
4. 준비물 체크
5. 출발 전날 온라인 체크인

The authoring UX must preserve the original fragment, show the five interpreted Items, and allow
merge, split, reorder, rename, include/exclude, and personal date edits. It must not claim that a
live AI generated the structure when the prototype uses deterministic parsing.

## 7. Guide And Safety Content

Evidence:

- [official source fidelity audit](../2026-06-03-source-fidelity-audit.md)
- [official content source](../../../lib/flow/contents-batch-260601-official.ts)

Expected interpretation:

- travel warning levels, contact information, and cautions are guide/source content;
- actions such as registering a trip may become Items;
- official context remains visible in Item detail or Memo;
- FlowMe does not add safety judgment or invented advice.
