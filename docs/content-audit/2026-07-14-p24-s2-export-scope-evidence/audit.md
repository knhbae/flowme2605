# P24-00S2 Flow 가져가기 범위 Audit

## 원인

기존 My Flow의 portable export는 항목 상세에 가까이 있었고 실제 결과는 현재 연 항목 1개였다. 버튼 위치와 결과 범위가 맞지 않아 사용자는 Flow 전체가 나갈 것으로 예상할 수 있었다. 개인 초안에는 Flow 전체 list export가 있었지만 원문 기반 Flow와 계약과 진입점이 달랐다.

## UX 결정

1. 범위를 형식보다 먼저 선택한다.
2. 기본값은 `전체 Flow`다.
3. 일부만 가져갈 때만 `선택한 항목` 목록을 연다.
4. 캘린더는 선택 범위 중 날짜가 있는 항목 수를 별도로 보여 준다.
5. checklist/sheet/memo는 날짜 없는 항목도 선택 범위에 포함한다.
6. 완료, 다시 열기, 건너뜀, 보류는 구조 membership을 바꾸지 않는다.
7. 제외되거나 tombstone 처리된 항목은 모든 destination에서 제외한다.
8. 항목 상세의 단건 기능은 삭제하지 않고 `이 항목 가져가기`로 범위를 명시한다.
9. Calendar 날짜 배치와 export 선택은 같은 `FlowItemMultiSelect`를 사용한다.

## 목업 대조

Claude Design `(8)` D안은 Flow 헤더의 한 진입점, `전체 Flow / 선택한 항목 / 이 항목`, 개수 표시, 공통 다중 선택 UI를 제안했다. 이번 구현은 그 구조를 따르되 다음처럼 현재 제품에 맞췄다.

| 목업 | 구현 | 판단 |
| --- | --- | --- |
| `내보내기` | `가져가기` | 기존 public/My Flow 어휘 유지 |
| action sheet | 카드 안 compact panel | 새 modal과 IA 증가 방지 |
| 전체/선택 | 전체/선택 segmented control | 그대로 반영 |
| 형식 1개 예시 | Calendar/checklist/sheet/memo | 기존 capability 유지 |
| 다중 선택 한 벌 | Calendar와 export 공통 컴포넌트 | 그대로 반영 |

## 계약

`buildFlowExportScopePlan`이 scope, 유효 선택, destination eligibility, count, filename을 한 번에 계산한다. UI와 consumer가 각자 선택 규칙을 복제하지 않는다.

| 상태 | Calendar | Checklist | Sheet | Memo |
| --- | --- | --- | --- | --- |
| 날짜 있음 | 포함 | 포함 | 포함 | 포함 |
| 날짜 없음 | 제외 | 포함 | 포함 | 포함 |
| 완료/다시 열기 | 포함 | 포함 | 포함 | 포함 |
| 건너뜀/보류 | 포함 | 포함 | 포함 | 포함 |
| 제외/tombstone | 제외 | 제외 | 제외 | 제외 |

선택 Calendar ICS는 stable item identity를 UID에 사용하며 구조 순서나 선택 순서를 UID로 사용하지 않는다. 동일 항목의 중복 VEVENT는 제거한다.

## 자동화 시나리오

### 개인 초안, mobile 390px

1. 메모 3개를 개인 초안으로 저장한다.
2. My Flow에서 Flow 전체 3개가 기본값인지 확인한다.
3. 2개를 선택하고 memo/checklist 결과가 정확히 2개인지 확인한다.
4. 선택한 2개 중 날짜가 있는 1개만 Calendar count와 ICS에 들어가는지 확인한다.
5. ICS VEVENT 중복이 0인지 확인한다.

### 원문 기반 Flow, mobile 390px

1. moving-d30 Flow의 가져가기를 연다.
2. 전체 5개가 기본 범위인지 확인한다.
3. 2개를 선택하고 memo 결과가 선택한 제목만 포함하는지 확인한다.
4. 항목 상세의 summary가 `원문 · 이 항목 가져가기`인지 확인한다.

### 개인 초안, wide 1024px

1. 같은 저장 상태로 My Flow wide 카드를 연다.
2. 전체 Flow 범위와 destination count가 한 행에서 읽히는지 확인한다.
3. horizontal overflow가 없는지 확인한다.

## 접근성·밀도

- segmented control은 `aria-pressed`로 현재 범위를 노출한다.
- 선택 checkbox 이름에는 항목 제목과 `가져갈 항목으로 선택` 행동이 포함된다.
- destination accessible name에는 실제 결과 항목 수가 포함된다.
- panel 닫기는 icon button과 구체적인 accessible name을 사용한다.
- 완료 체크, 열기, 수정과 가져가기 진입은 별도 영역이다.
- 390px은 두 열 destination grid, 1024px은 네 열로 유지한다.

## 남은 관찰 질문

- `가져가기`가 파일 다운로드와 clipboard 복사를 함께 포함하는 말로 충분히 이해되는가?
- 사용자는 기본 `전체 Flow`와 `선택한 항목` 중 어느 쪽을 더 자주 쓰는가?
- Calendar count가 list count보다 작을 때 날짜 없는 항목이 제외된 이유를 추가 설명 없이 이해하는가?
- Flow 카드 안 inline panel과 별도 bottom sheet 중 어느 쪽이 모바일에서 더 자연스러운가?
