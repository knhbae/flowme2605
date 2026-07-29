# Eight Frozen Authoring Fixtures

이 문서는 text authoring UX의 여덟 사례를 버전, 수량, evidence path와 함께 고정한다.
실제 콘텐츠를 새로 만들지 않으며 서로 다른 variant를 자동 병합하지 않는다.

## 1. 이사 D-30

- fixture: `bundle-moving-d30`
- version: `AJD qualified corpus v2`
- count: 27 Items, 6 Steps
- evidence: `local-evidence/qualified-corpus-v2/qualified-corpus-fixture-v2.json`
- input: heading, checklist, 상대 날짜가 있는 Markdown
- mapping: heading -> Step, checklist row -> Item, prose -> detail
- primary/secondary: Calendar / Checklist
- personal value: 이사일
- loss boundary: Calendar는 guide/resource를 제외하고 날짜가 있는 실행 Item만 사용
- save/export: 전체 27개 개인 초안, anchor 입력 후 dated Calendar
- version caution: runtime AJD 24와 EasyLaw Input Composer 24를 별도 유지

## 2. 차량 점검

- fixture: `flow-vehicle-inspection-prep`
- version: `TS official runtime source checked 2026-07-12`
- count: 10 Items
- evidence: `lib/flow/real-content-pilot-flows.ts`
- input: D-14, D-10, D-3, D-Day timeline
- mapping: period heading -> Step, action row -> Item
- primary/secondary: anchor 전 Todo, anchor 후 Calendar / Checklist
- personal value: 검사일, 또는 undated로 시작
- loss boundary: 개인 날짜를 제거해도 source offset은 유지
- save/export: Todo 10개 또는 계산된 Calendar 10개

## 3. Allblanc 7일 순서형

- fixture: `bundle-allblanc-7day-abs`
- version: `qualified corpus v2 seven-day sequence`
- count: 7 Items
- evidence: `local-evidence/qualified-corpus-v2/qualified-corpus-fixture-v2.json`
- input: Day heading, 운동 Item, 영상 URL
- mapping: Day -> Step/sequence position, 영상 -> resource
- primary/secondary: Calendar / Checklist
- personal value: 시작일
- loss boundary: resource는 완료 Item이 아니며 occurrence 상태를 소유하지 않음
- save/export: 7일 순서와 resource를 보존
- variant caution: one-video weekly routine과 병합 금지

## 4. K-MOOC 14주

- fixture: `IC-C02-KMOOC`
- version: `Input Composer frozen course table`
- count: 14 rows
- evidence: `docs/specs/2026-07-20-flowme-input-composer-lab-v1/input-composer-scenarios-v1.json`
- input: 주차, 주제, 활동 표
- mapping: row -> ordered progress Item
- primary/secondary: Sheet / selected Todo
- personal value: 현재 완료 주차
- loss boundary: 날짜를 임의 생성하지 않고 14행을 축약하지 않음
- save/export: Sheet 14행, 선택한 행만 Todo projection 가능

## 5. LibriVox 38장

- fixture: `IC-C03-LIBRIVOX`
- version: `Anne of Green Gables Version 5 frozen table`
- count: 38 rows
- evidence: `docs/specs/2026-07-20-flowme-input-composer-lab-v1/input-composer-scenarios-v1.json`
- input: 장 번호, 제목, resource 표
- mapping: row -> ordered queue Item, URL -> resource
- primary/secondary: Sheet/Queue / Memo
- personal value: 현재 장, 재생 위치
- loss boundary: routine과 날짜를 만들지 않고 edition identity를 유지
- save/export: 38행 queue와 현재 위치

## 6. 신차 구매

- fixture: `bundle-new-car-comparison`
- version: `qualified corpus v2`
- count: 14 Items, 8 Steps
- evidence: `local-evidence/qualified-corpus-v2/qualified-corpus-fixture-v2.json`
- input: 결정, 확인, 기록이 섞인 Markdown
- mapping: 독립 행동 -> Item, 비교 context -> detail/record field
- primary/secondary: Checklist / Sheet, Memo
- personal value: 후보, 예산, 비교 기록
- loss boundary: decision을 단순 binary 완료로만 표현하지 않음
- save/export: Checklist 14개, Sheet/Memo는 해당 field가 있을 때만 제안
- evidence caution: rich comparison field UI는 현재 CSV가 증명하지 않는 proposal

## 7. 해외여행 안전정보

- fixture: `official-260601-overseas-safety`
- version: `MOFA official runtime source checked 2026-07-11`
- count: 5 content blocks, 4 executable actions
- evidence: `lib/flow/contents-batch-260601-official.ts`
- input: 공식 안내, 경고, 행동, source URL
- mapping: 안내/경고 -> guide/caution, 실행 가능한 문장 -> Item
- primary/secondary: Memo/Guide / Checklist
- personal value: 해당 여행에서 포함할 행동
- loss boundary: 안전 판단을 추가하지 않고 official source를 유지
- save/export: Memo 5 blocks, Todo 최대 4 actions

## 8. 제주 여행 개인 메모

- fixture: `P26-MEMO-SEGMENTATION-JEJU`
- version: `deterministic personal memo fixture`
- count: 5 Items
- evidence: `tests/e2e/p26-memo-segmentation.spec.ts`
- input: 쉼표로 구분한 자유 문장
- mapping: 원문 fragment -> 5 Item lineage
- primary/secondary: Todo / Calendar, Memo
- personal value: 연도, 날짜, 시간, 장소, 포함 여부
- loss boundary: `8월`만으로 연도나 날짜를 만들지 않음
- save/export: Todo 5개, 날짜가 확인된 Item만 Calendar

## 공통 acceptance

- prototype 안에서 전체 행과 Item을 실제 데이터로 전환한다.
- save count는 포함된 전체 Flow content를 기준으로 한다.
- Calendar/Todo/Sheet/Memo가 같은 personal revision을 읽는다.
- source-derived 값과 user-authored 값은 시각적으로 구분한다.
- fixture simulation을 live AI 또는 production parser로 표현하지 않는다.
