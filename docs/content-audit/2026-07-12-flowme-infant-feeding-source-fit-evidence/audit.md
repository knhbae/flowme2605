# 초기 이유식 식단표 source-fit 감사

## 문제

`baby-food-map`은 민간 블로그 첨부 식단표에서 `150일`, `160일`, `170일`, `180일` 시작 Flow와 큐브 재고 메모를 만들었습니다. 다섯 Flow는 모두 `medical_sensitive`인데도 정확한 URL이 있다는 이유로 수동 source-fit 없이 indexable·실행 가능 상태였습니다.

기존 freshness 검사는 `source_checked_at`의 경과일만 봅니다. 따라서 오늘 오래된 페이지를 다시 열어 `source_checked_at=오늘`로 기록하면 원문 게시 시점, 지침 변경, 실행 항목의 근거 부족을 놓칠 수 있습니다.

## 현재 근거 판정

- 질병관리청 국가건강정보포털은 WHO 기준을 인용해 모유 수유 아기의 이유기보충식을 생후 6개월 이후 시작한다고 설명합니다.
- WHO의 2023 guideline도 complementary feeding이 일반적으로 생후 6개월에 시작된다고 안내합니다.
- 기존 민간 자료는 여러 시작일별 식단표와 메뉴를 제공하지만, 그 자체가 모든 아이에게 적용할 시작 시기 판정 근거는 아닙니다.
- 따라서 식단표를 개인 기록 참고자료로 보존할 수는 있어도, `150일 시작`을 바로 캘린더·체크리스트 실행안으로 제공하는 것은 현재 source-fit 경계에 맞지 않습니다.

## 적용 정책

1. `baby-food-map` quality decision을 `revise` + `publicExecutionEnabled=false` + `medical_source_fit`으로 전환합니다.
2. Flow Map 직접 route는 검토 화면으로 유지하되 noindex 처리합니다.
3. 검토 화면은 공식 안내와 기존 민간 원문을 서로 다른 버튼으로 표시합니다.
4. URL-first는 `아이 상태에 맞는 확인이 필요해요`로 판정하고 저장·export·draft 우회를 차단합니다.
5. child `/f` route는 새 저장과 실행을 열지 않도록 404 처리합니다.
6. 기존 저장본과 내부 원문·`sourceTrace`는 삭제하거나 자동 교체하지 않습니다.
7. 기존 저장본에는 비해제 경고를 표시하고 사용자가 공식 안내를 확인할 수 있게 합니다.

## 확인 결과

- `baby-food-map` direct route: 200
- robots: noindex, nofollow
- save/export/step execution controls: 0
- 공식 안내 link: 1
- 민간 참고 원문 link: 1
- URL-first state: `needs_review`
- URL-first save/export: false/false
- direct child execution route `/f/baby-150-start`: 404
- 기존 저장본 warning: visible, dismiss control 0
- 390px/1024px horizontal overflow: 0
- visible `Markdown` 및 내부 제작어: 0

## 남은 위험

- 원문 날짜와 의미상 유효기간을 구조적으로 기록하는 별도 필드는 아직 없습니다.
- 현재 수동 source-fit 없이 공개 실행되는 route가 11개 남아 있습니다.
- 그중 고위험은 `curated-new-car-basic` 1개이며 다음 source-fit 우선순위입니다.
- 이유식 식단을 다시 실행 가능 상태로 만들려면 시작 시기뿐 아니라 메뉴·알레르기·식품 안전 경계도 현재 공식 근거와 함께 재검토해야 합니다.
- 자동 테스트 통과는 보호자·영양·의료 관찰을 대체하지 않습니다.
