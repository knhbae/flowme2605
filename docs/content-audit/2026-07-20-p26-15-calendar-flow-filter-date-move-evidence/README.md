# P26-15 Calendar Flow filter and date move Evidence

P26-15는 Calendar의 표시 범위, 월간 grid, 선택일 agenda, 항목 수를 하나의 Flow scope로 맞추고, 같은 날짜의 한 개 또는 여러 할 일을 preview 후 다른 날짜로 옮기는 흐름을 닫는다.

## 결과

- Calendar의 표시 범위는 `전체`, `반복만`, 저장된 개별 Flow로 구성한다.
- 개별 Flow filter는 색 marker, 첫 글자, Flow 이름, 현재 월 항목 수를 함께 표시한다.
- Calendar route의 기존 `저장한 Flow` select는 제거해 scope control이 두 군데에서 경쟁하지 않게 했다.
- 같은 날짜의 이사 준비 4개와 차량 점검 2개는 전체 범위에서 Flow group 2개로 보인다.
- 차량 점검 filter를 선택하면 grid 2개, agenda group 1개, 선택일 summary가 모두 같은 scope를 읽는다.
- `날짜 옮기기`는 같은 날짜의 항목을 한 개 또는 여러 개 선택하고, 영향 Flow 수와 반복 회차 수를 commit 전에 보여준다.
- 서로 다른 Flow의 항목 2개를 `7월 29일 -> 7월 30일`로 원자적으로 옮기고, 완료 상태를 유지한 채 되돌리거나 새로고침 후 지속할 수 있다.
- 반복 occurrence는 일반 할 일과 별도 label로 표시하며, occurrence 하나를 옮겨도 series identity와 다른 회차는 유지한다.
- 모바일/와이드 horizontal overflow와 console/page error는 0이다.
- full unit은 561/561, P26-14와 public/workbench 회귀는 45/45, build는 18/18 route로 통과했다.

## 화면 정책

- grid는 Flow marker와 compact label/count만 보여준다.
- agenda는 선택 날짜의 전체 실행 row를 Flow별로 묶는다.
- filter는 날짜가 유지 가능한 경우 현재 선택 날짜를 유지하고, 해당 Flow가 없으면 현재 월의 첫 일정으로 이동한다.
- 날짜 이동은 drag 결과도 즉시 저장하지 않고 같은 preview panel로 수렴한다.
- 완료·미완료는 execution state이며 날짜 이동 membership과 분리한다.

## Reference 판단

- Google Calendar가 calendar 목록의 표시/숨김과 색을 같은 식별 축으로 사용하는 패턴을 참고했다: <https://support.google.com/calendar/answer/37095>
- Todoist가 여러 task 선택 후 일괄 action을 제공하고, 반복 task의 단일 reschedule과 series rule을 구분하는 정책을 참고했다: <https://www.todoist.com/help/articles/introduction-to-recurring-dates-YUYVJJAV>
- 로컬 `docs/content-audit/2026-07-19-flow-content-usage-preview-ko.html`의 compact source rail, action row, result preview 패턴을 보조 참고했다. 원본 dirty worktree 파일은 복사하거나 stage하지 않았다.

## Evidence

- [상세 감사](./audit.md)
- [구조화 marker](./route-evidence.json)
- [모바일 같은 날짜 다중 Flow](./screenshots/01-mobile-all-flows-same-date.png)
- [모바일 개별 Flow filter](./screenshots/02-mobile-vehicle-flow-filter.png)
- [모바일 교차 Flow 날짜 이동 preview](./screenshots/03-mobile-cross-flow-date-move-preview.png)
- [wide 3-pane와 Flow filter](./screenshots/04-wide-flow-filter-and-agenda.png)
- [모바일 반복 occurrence filter](./screenshots/05-mobile-routine-occurrence-filter.png)

## 검증 경계

근거 종류는 `current_source`, `current_command`, `current_browser`, `reference_pattern`, `prior_design_artifact`다. 자동 Playwright와 heuristic 검토이며 실제 사용자 관찰 세션은 0건이다.
