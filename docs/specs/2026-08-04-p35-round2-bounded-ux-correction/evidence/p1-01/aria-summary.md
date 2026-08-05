# P1-01 ARIA·interaction summary

**판정:** `PASS — LOCAL INTERNAL`

**대상:** `/my?demo=ux12`, `/flow-maps/middle-school-math-1`, `/f/moving-d30-basic`의 390×844·1024×768·1440×1000 상태

실제 viewport별 `ariaSnapshot()` 축약본은 [ARIA tree excerpts](./aria-tree-excerpts.md)에 있다.

## Item 상세

- Item 제목 heading은 유지한다.
- Item 완료 checkbox는 viewport마다 정확히 1개이며 Item 실행 완료만 변경한다.
- `수정`은 이름 있는 secondary button이다. 모바일 sheet의 `닫기`도 이름과 44px급 control height를 유지한다.
- 삭제한 node는 모바일의 반복 text `실행할 일` 하나다. 상세의 제목·완료·메모/일정 disclosure와 편집 진입은 유지한다.
- ARIA snapshot line count: 390 `5→4`, 1024 `5→5`, 1440 `5→5`.
- structural card/surface count: 390·1024·1440 모두 `4→4`.

## Flow Map

- Map title heading, saved Flow list, 각 선택 control, `조정`, primary save action은 모두 accessible name을 유지한다.
- 3칸 설명 grid 대신 action 인접 text `선택 N / 전체 M`을 남겼다. count를 icon title이나 hover에 숨기지 않는다.
- ARIA snapshot line count: 390 `38→32`, 1024 `36→31`, 1440 `36→31`.
- structural card/surface count: 390·1024·1440 모두 `5→4`.
- setupInput이 있는 직접 접근 Map `/flow-maps/curated-opic-mock-course`의 390px 날짜 미입력 상태에서도 선택 수와 `시작일 필요`가 함께 읽힌다.

## 시작일

- date input의 label과 native date control은 유지한다.
- 과거 날짜와 가까운 일정 경고는 visible text로 남고 정상 success echo 한 줄만 제거한다.
- ARIA snapshot line count: 390 `28→27`, 1024 `30→29`, 1440 `30→29`.
- structural card/surface count: 390·1024·1440 모두 `4→4`.

## Interaction·focus 결과

- 세 surface 모두 unnamed `button`, `a[href]`, `input`, `textarea`, `select` 수 `0`.
- 390·1024·1440 horizontal overflow `0`; console error, page error, unexpected failed request `0`.
- P1은 새 dialog나 disclosure를 추가하지 않았다. 영향 E2E `20/20`에서 existing Item editor open/cancel/save, wide detail pane, responsive focus, Map Back/retry/reload 계약을 재검증했다.
- `visualSubtraction=off`는 accessible names와 legacy nodes를 함께 복원하며 storage mutation은 `0`이다.

이 문서는 raw assistive-technology 사용자 세션이 아니라 Playwright accessibility snapshot과 DOM/keyboard 회귀의 durable 요약이다. 실제 screen-reader 사용자 검증으로 표기하지 않는다.
