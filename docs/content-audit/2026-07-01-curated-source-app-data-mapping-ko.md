# 엄선 원컨텐츠 9개 앱 데이터 매핑 노트

## 입력 파일

앱 구현 세션은 [2026-07-01-curated-source-app-seed-v1.json](./2026-07-01-curated-source-app-seed-v1.json)을 기준으로 작업한다. 이 파일은 normalized 콘텐츠를 앱 적용용 중간 seed로 변환한 것이며, 앱 타입에 맞추는 최종 변환은 구현 세션에서 한다.

## 상위 구조

- `contentBundles[]`: 원컨텐츠 1개 또는 원컨텐츠 묶음 1개에 대응한다.
- `bundleId`: 앱 registry key 후보. URL route나 local storage key에 쓰려면 slug 충돌을 확인한다.
- `title`: 사용자 화면에 보여줄 콘텐츠 제목이다.
- `category/categoryLabel/categoryPattern/appPattern`: 필터, 아이콘, 기본 destination 결정에 쓴다.
- `status/userFacingStatus/appExposure`: 앱 노출 상태와 사용자용 상태 문구를 분리한다.
- `sourceUrls`: 카드 또는 상세 하단의 원문 링크다.
- `recommendedFlowId`: 카드에서 기본으로 열 Flow다.

## Flow Map / Flow / Step / Item 매핑

- Flow Map: `contentBundles[]` 1개가 앱의 콘텐츠 묶음 또는 source-backed map이다.
- Flow: `contentBundles[].flows[]` 1개가 사용자가 저장하거나 실행할 루틴/체크리스트 단위다.
- Step: `flows[].steps[]` 1개가 원문 row, 일정 구간, 월령, D-day, 주차, 영상 반복 단위다.
- Item: `steps[].items[].itemTitle`은 체크할 최소 행동이다.
- Memo: `steps[].memo`와 `steps[].detail`은 세부 정보, 수량, 상태, 특이사항, 원문 제목/URL을 담는다.

## Field 매핑

- `setupFields`: 저장 전에 사용자가 정하는 값이다. 예: 시작일, 이사일, 결혼식일, 생년월일, 목표 완료일, 반복 요일, 책 이름 또는 URL.
- `executionFields`: 실행 중 사용하는 공통 값이다. 현재는 완료 여부와 메모만 둔다.
- 먹은 양, 통증, 이상반응, 견적 세부, 업체별 금액, 영상 중단 사유는 Field로 만들지 않는다. 필요하면 메모에 적는다.

## Status 사용자 표현

| status | userFacingStatus | 앱 노출 원칙 |
|---|---|---|
| `ready_draft` | 바로 시작 가능 | 기본 카드와 추천 Flow를 노출한다. |
| `partial_draft` | 일부 보강 후 시작 | 카드 노출은 가능하지만 원문 보강 필요 표시를 작게 둔다. |
| `source_import_required` | 자료 보강 후 시작 | 기본은 Park/import queue로 두고, 확인된 Flow 후보만 노출한다. |

## Export 매핑

| Export | 기준 | 제목 | 설명/메모 |
|---|---|---|---|
| Calendar | Step 날짜, D-day, 월령, 반복일 | `step.itemTitle` | `memo`, `detail`, `sourceUrl` |
| Checklist | Flow > Step | `items[].itemTitle` | Step memo를 접힘 영역에 표시 |
| Sheet | Step row | bundle, flow, step, itemTitle | memo, sourceUrl, sourceTrace, status |
| Memo export | Step memo | Flow/Step 제목 | 원문 제목, URL, 세부 항목 |

## Source 표시 원칙

- `sourceUrl`: 사용자가 원문을 열 수 있는 링크다. Step source row URL이 있으면 그 값을 우선하고, 없으면 bundle source URL을 쓴다.
- `sourceTrace`: 개발/검토용 provenance다. 사용자에게는 “원문 기준” 정도로 축약하고, 디버그/관리자 화면에만 자세히 둔다.
- `sourceRows`: source row와 generated Step/Item 대응 관계다. 앱에서 보이지 않아도 export/검증에는 유지한다.

## 콘텐츠별 적용 메모

### 1. 펀맘 공부 루틴

- bundleId: `funmom-study-routine-map`
- category: `education` / 교육 자료 루틴
- status: `source_import_required` → 자료 보강 후 시작
- recommendedFlowId: `funmom-hangul-2w`
- counts: Flow 3, Step 17, Item 17
- setupFields: 시작일, 반복 요일
- executionFields: 완료 여부, 메모

### 2. 오픽 모의고사 계획

- bundleId: `opic-plan-map`
- category: `study_exam` / 시험 공부 계획
- status: `ready_draft` → 바로 시작 가능
- recommendedFlowId: `opic-2w`
- counts: Flow 2, Step 19, Item 19
- setupFields: 시작일, 반복 요일
- executionFields: 완료 여부, 메모

### 3. 초기 이유식 식단표

- bundleId: `baby-food-map`
- category: `baby_food` / 이유식 식단
- status: `ready_draft` → 바로 시작 가능
- recommendedFlowId: `baby-150-start`
- counts: Flow 5, Step 21, Item 21
- setupFields: 시작일, 반복 요일
- executionFields: 완료 여부, 메모

### 4. 독서 루틴

- bundleId: `reading-routine-map`
- category: `reading` / 독서 루틴
- status: `partial_draft` → 일부 보강 후 시작
- recommendedFlowId: `reading-book-finish`
- counts: Flow 2, Step 5, Item 5
- setupFields: 루틴 제목, 책 이름 또는 URL, 목표 완료일, 반복 요일, 시작일
- executionFields: 메모, 완료 여부

### 5. 신차 구매

- bundleId: `new-car-map`
- category: `purchase` / 구매 준비
- status: `ready_draft` → 바로 시작 가능
- recommendedFlowId: `new-car-7-step`
- counts: Flow 1, Step 7, Item 7
- setupFields: 구매 목표일
- executionFields: 완료 여부, 메모

### 6. 영유아 예방접종

- bundleId: `vaccination-map`
- category: `official_health_schedule` / 공식 건강 일정
- status: `partial_draft` → 일부 보강 후 시작
- recommendedFlowId: `vaccination-official`
- counts: Flow 1, Step 7, Item 7
- setupFields: 생년월일
- executionFields: 완료 여부, 메모

### 7. 이사 준비

- bundleId: `moving-map`
- category: `moving` / 이사 준비
- status: `ready_draft` → 바로 시작 가능
- recommendedFlowId: `moving-dday`
- counts: Flow 1, Step 5, Item 8
- setupFields: 이사일
- executionFields: 완료 여부, 메모

### 8. 결혼 준비

- bundleId: `wedding-map`
- category: `wedding` / 결혼 준비
- status: `ready_draft` → 바로 시작 가능
- recommendedFlowId: `wedding-timeline`
- counts: Flow 2, Step 6, Item 8
- setupFields: 결혼식일
- executionFields: 완료 여부, 메모

### 9. Allblanc 홈트 루틴

- bundleId: `homefit-map`
- category: `fitness_video` / 영상 운동 루틴
- status: `partial_draft` → 일부 보강 후 시작
- recommendedFlowId: `homefit-morning-2w`
- counts: Flow 2, Step 4, Item 4
- setupFields: 시작일, 반복 요일
- executionFields: 완료 여부, 메모
