# P26 화면 계약

## 공통 객체

모든 normal route에서 사용자가 저장하고 실행하는 객체 이름은 `Flow`다. 내부 `Flow Map`, source bundle, child Flow는 사용자가 이해해야 할 hierarchy가 아니다.

## Home

**목적:** URL/memo 또는 바로 쓸 Flow로 시작한다.

- 첫 viewport에 URL/memo entry와 대표 Flow가 보인다.
- 추천 카드는 제목, source, 대표 항목, input, result 순서다.
- 긴 효능 설명과 unsupported popularity는 제거한다.
- primary action은 `Flow 열기`다.

## Flow 찾기

**목적:** 같은 정보 문법으로 Flow를 비교한다.

- Flow/Map card variant를 하나로 합친다.
- filter/sort는 실제 데이터 계약이 있는 값만 사용한다.
- 결혼 준비 2종은 독립 entry다.
- source badge보다 제목과 artifact preview가 먼저 읽힌다.

## Save-before

**목적:** 저장될 whole artifact와 최소 setup을 확인한다.

- 전체 outline과 대표 detail이 보인다.
- source는 disclosure로 접근 가능하다.
- sticky primary는 `그대로 시작`이다.
- secondary는 `내게 맞게 조정`이다.
- public preview selection과 post-save completion은 역할과 label이 다르다.

## Post-save

**목적:** 저장이 제대로 되었는지 whole Flow로 확인한다.

- compact receipt에 title, item count, dated/undated count가 보인다.
- receipt 아래 동일 whole-Flow component를 렌더링한다.
- primary는 `첫 할 일 시작`, secondary는 `조정`, `가져가기`다.
- Today 한 행만 저장 결과로 사용하지 않는다.

## My Flow

**목적:** 지금 실행하고 저장한 Flow를 관리한다.

- local views: `지금 / 내 Flow / 완료`.
- Flow title과 content-shape grouping이 progress보다 먼저다.
- same-date grouping은 같은 Flow 내부에서만 한다.
- 완료는 row 왼쪽 checkbox 하나다.
- 열기와 수정은 별도 역할이다.

## Whole Flow

**목적:** 전체 구조를 훑고 항목을 선택한다.

- mobile: outline -> detail drill-in.
- wide: Flow rail + outline + detail 또는 outline + detail.
- timeline은 날짜, checklist는 section, routine은 occurrence, project는 phase, record는 row를 기본 grouping으로 사용한다.
- 콘텐츠 모양을 동일한 chip/card 반복으로 평탄화하지 않는다.

## Editor

**목적:** 개인 사본의 필요한 값만 빠르게 바꾼다.

- default: title, when, memo.
- advanced: time, duration, recurrence, content-specific fields.
- structure mode: add/delete/restore/reorder.
- batch mode: selection + date move/clear + include/exclude + selected export.
- 실행 mode에 structural controls를 섞지 않는다.

## Calendar

**목적:** 날짜별로 실행하고 날짜 없는 일을 일정에 놓는다.

- visible Flow filter가 grid, agenda, count에 동일 적용된다.
- selected-day agenda는 full item detail을 제공한다.
- undated tray는 on-demand이고 completion control이 없다.
- mobile은 grid/agenda를 기본으로 하고 tray는 drawer/sheet다.
- wide는 현재 작업에 따라 grid/agenda 또는 tray/grid를 사용한다.

## Export

**목적:** 보낼 범위와 결과를 예측한 뒤 format을 선택한다.

- `Flow 전체 / 선택한 항목 / 현재 항목`
- 예상 destination count
- Calendar/checklist/sheet/memo
- 완료 receipt 또는 download result

형식 버튼만 먼저 나열하거나 현재 item export를 Flow 전체처럼 표현하지 않는다.

## Copy budget

- section 설명은 최대 한 문장.
- state/action을 label과 layout으로 표현할 수 있으면 설명 문장을 제거한다.
- source/safety 문구는 필요한 정확성을 위해 유지하되 첫 행동과 경쟁하지 않는다.
- technical/internal terms는 normal routes에서 0건이다.
