# P35-R0 audit

## Evidence 경계

| 근거 | 종류 | 설명 |
| --- | --- | --- |
| current source | `current_source` | P35 미커밋 후보 위 R0 adapter와 presentation |
| unit | `current_command` | temporal 분류·우선순위·source order·완료 제외 |
| Playwright | `current_automated_test` | public 저장부터 My Flow·Calendar·reload·reopen까지 |
| screenshot | `current_package_screenshot` | 390px 경고·묶음, 1024px 묶음 |
| owner 판단 | `pending_owner_review` | 문구 강도와 한 화면 가독성 |
| 실제 사용자 | `not_observed` | 관찰 사용자 0명 |

## Finding 1. 과거 한 항목이 저장 직후 첫 행동으로 보임

- Severity: High
- 기존 상태:
  - D-30 파생 항목 일부가 지난 뒤 저장하면 과거 한 행이 My Flow 첫 실행 영역을
    차지했다.
- 변경:
  - 오늘, 가장 가까운 미래, 가장 가까운 과거 순서의 pure temporal adapter를
    연결했다.
  - 같은 effective date의 미완료 행을 모두 반환한다.
- 결과:
  - `2026-08-03` 이사일 fixture는 `2026-07-31`의 미완료 4개를 먼저 보여 준다.
- 보존:
  - 기존 single-row fallback을 삭제하지 않았다.

## Finding 2. 같은 날짜 항목이 한 행씩만 보임

- Severity: High
- 기존 상태:
  - 같은 날짜에 여러 Item이 있어도 `다음 행동`은 한 행만 골랐다.
- 변경:
  - `my-flow-temporal-next-group`이 같은 날짜의 모든 미완료 Item을 source order로
    보여 준다.
  - 저장 전 Calendar preview와 저장 후 실행 묶음이 같은 날짜 레일 primitive를
    사용한다.
  - 실행 행은 제목·상세 열기 영역 뒤 오른쪽에 완료 checkbox를 둔다.
  - 시각적 `열기` 문구와 파란 점을 제거하고 접근성 이름에는 `열기`를 유지한다.
- 결과:
  - 모바일과 wide에서 같은 날짜 4개가 같은 순서로 보인다.
  - Calendar 선택일과 title, date, count, row identity가 일치한다.

## Finding 3. 지난 항목의 보존 상태가 불명확함

- Severity: High
- 변경:
  - native `details/summary` 기반 `저장된 지난 할 일 N개 보기` disclosure를
    추가했다.
  - 첫 실행 묶음에 이미 보이는 과거 행은 disclosure에서 중복하지 않는다.
- 결과:
  - 혼합 fixture는 지난 항목 9개를 접어 둔다.
  - all-past fixture는 첫 과거 묶음 2개를 보여 주고 disclosure에 총 22개가
    보존됐음을 표시한다.
- owner 확인:
  - 보존 의미를 더 직접적으로 드러내도록 `저장된`을 추가했다.

## 저장 전 경고

- Marker: `P35-R0-PAST-DATE-WARNING`
- 표시 조건:
  - dated relative-anchor Flow
  - 유효한 개인 기준일
  - 과거 effective Item 1개 이상
- 문구:
  - `지난 할 일 9개(7/4~7/24)도 함께 저장돼요.`
- 원칙:
  - 한 줄 status
  - 새 카드·설정·focus 이동 없음
  - 삭제·자동 완료 없음

## Temporal adapter 규칙

1. 미완료 Item만 후보로 사용한다.
2. 유효한 effective date만 temporal row로 사용한다.
3. 오늘 묶음이 있으면 오늘을 선택한다.
4. 오늘이 없으면 가장 가까운 미래를 선택한다.
5. 미래도 없으면 가장 가까운 과거를 선택한다.
6. 같은 날짜에서는 source projection 순서를 유지한다.
7. 날짜 없는 Flow와 routine에는 기존 실행 projection을 사용한다.
8. execution state는 membership만 필터링하고 구조·날짜를 변경하지 않는다.

## 날짜 precedence

R0는 새 계산 규칙을 만들지 않았다.

```text
개인 고정 날짜
> 개인 기준일에서 재계산한 날짜
> source/published 날짜
> 날짜 없음
```

## 접근성·반응형

- 묶음은 heading과 남은 count를 가진다.
- 완료 control은 기존 checkbox primitive를 재사용한다.
- 날짜는 왼쪽 rail에서 한 번만 표시하고 행마다 반복하지 않는다.
- 행 제목 button 뒤에 checkbox가 오며, 제목 button의 accessible name에는
  `열기`가 남는다.
- 완료로 행이 사라질 때 snackbar undo가 focus를 받는다.
- 지난 항목은 native disclosure로 keyboard 조작 가능하다.
- 390px bottom navigation과 내용 overlap: `0`
- 390px horizontal overflow: `0`
- 1024px semantic parity: 유지
- 1440px workspace 품질 검사: 통과

## 회귀

- 날짜 없는 차량 체크리스트:
  - temporal group `0`
  - 기존 첫 실행 row 유지
- 반복 홈트:
  - temporal group `0`
  - 기존 occurrence projection 유지
- export:
  - 기존 whole·selected·current scope E2E 통과
  - R0가 export projection을 변경하지 않음

## Rollback

- `buildMyFlowTemporalPresentation` 호출을 제거하면 기존 single-row
  `getSavedFlowNextRow`로 돌아간다.
- warning과 disclosure presentation을 제거해도 저장 데이터는 바뀌지 않는다.
- storage rollback이나 migration은 필요하지 않다.

## Owner revision

- 판정: `approved_after_revision`
- 요청: 저장 후 묶음도 저장 전 UI와 같은 문법을 사용하고 checkbox를 오른쪽에 둔다.
- 반영 marker: `P35-R0-SHARED-TIMELINE-ROW`

## 현재 한계

- checklist·routine·sheet·memo의 콘텐츠 형태별 실행 단위는 `P35-R4` 범위다.
- public artifact와 external export 정합성은 `P35-R1` 범위다.
- 저장 전 Item 제목·상세·날짜 수정은 `P35-R2` 범위다.
