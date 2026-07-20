# P26-18 Audit

## 원인

P26-17에서 실행 primitive와 copy는 통일됐지만 모바일 navigation, 구조 편집 toolbar, 완료 notice, sheet가 서로 다른 고정 offset을 사용했다. Status/inventory sheet는 modal처럼 보이지만 focus trap, body scroll lock, opener focus return이 없었다. Export는 실행 중과 실패 상태를 사용자가 구분할 수 없었고, 결과 receipt가 모바일 하단 탭 뒤에 놓일 수 있었다.

## 구현 판단

### 모바일 390

- 전역 하단 navigation, 작업 toolbar, notice의 높이와 간격을 CSS variable로 합성한다.
- 상태/목록 sheet는 공통 bottom-sheet primitive를 사용한다.
- 항목 편집은 기존 full-screen dialog를 유지한다.
- sheet와 editor는 동시에 열지 않고 현재 작업으로 drill-in한다.
- navigation 및 핵심 action은 `44x44` 이상이다.

### wide 1024

- My Flow는 rail/outline/detail 또는 outline/detail을 유지한다.
- detail pane은 viewport에 맞춰 내부 scroll한다.
- Calendar는 날짜 없는 tray, month grid, selected-day agenda가 한 줄로 보이되 agenda 높이를 viewport 안에 제한한다.
- 모든 정보를 동시에 펼치는 dashboard로 확장하지 않는다.

### 상호작용 상태

- bottom sheet: close autofocus, Tab/Shift+Tab trap, Escape close, opener focus return, body scroll lock.
- export: `ready | pending | disabled`를 DOM 상태와 accessible name으로 노출한다.
- pending 중 중복 실행을 차단한다.
- copy 실패는 error receipt와 재시도 문구로 표시한다.
- receipt 생성 후 `scrollIntoView({ block: 'nearest' })`로 fixed navigation에 가리지 않게 한다.

## 브라우저 검증

| Scenario | Viewport | 결과 | Evidence kind |
| --- | --- | --- | --- |
| 완료 notice와 navigation stack | 390x844 | overlap 0, undo target 44px 이상 | current_browser + current_screenshot |
| overdue bottom sheet | 390x844 | focus trap, Escape, return focus, body lock 통과 | current_browser + current_screenshot |
| item editor | 390x844 | viewport full-screen, overflow 0 | current_browser + current_screenshot |
| My Flow outline/detail | 1024x768 | detail pane viewport bounded | current_browser + current_screenshot |
| Calendar tray/grid/agenda | 1024x768 | 좌→우 작업 흐름, agenda viewport bounded | current_browser + current_screenshot |
| export pending/disabled/error | 390x844 | 중복 실행 차단, result visible | current_browser + current_screenshot |

## 회귀

최종 affected Playwright `20 / 20`:

- P26-18 responsive workspace
- P26-10 quick/advanced editor
- P26-11 structural edit mode
- P26-08 My Flow local IA
- P25 whole Flow workspace
- P26-16 unified export
- P26-17 execution component system

Public undated Calendar export의 기존 selector는 P26-18의 더 명확한 disabled accessible name에 맞게 test id + accessible-name assertion으로 갱신했다. export count와 동작은 변경하지 않았다.

Full unit은 `564 / 564`, pretest는 `13 / 13`, docs check는 `2,675` local links, production build는 `18 / 18` route다. `npm audit --audit-level=high`은 성공했고 high/critical은 `0`이다. 기존 Next 내부 PostCSS 경로의 moderate `2`는 breaking downgrade를 요구하는 `--force` 수정 없이 잔여 위험으로 기록한다.

## 남은 위험

- wide Calendar는 동작 가능하지만 1024px에서 여전히 정보량이 많다. P26-19 여정 검증에서 실제 작업 순서와 스크린샷을 다시 본다.
- 모든 native text link를 44px 버튼으로 바꾸지는 않았다. 이번 검증은 core navigation, modal controls, workbar, completion, export action을 대상으로 한다.
- 실제 사용자 관찰은 `0`이므로, 자동 캡처의 시각적 통과를 이해도나 선호도로 표현하지 않는다.
