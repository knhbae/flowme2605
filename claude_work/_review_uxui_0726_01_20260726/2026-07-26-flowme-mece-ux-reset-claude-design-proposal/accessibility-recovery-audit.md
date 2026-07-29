# Accessibility · responsive · recovery

| Area | Current | Proposed | Acceptance marker | EvidenceKind |
| --- | --- | --- | --- | --- |
| Calendar 키보드 깊이 | 월간 grid의 날짜가 각각 tab stop이라 agenda까지 정지 수가 매우 많다 | `role=grid` + roving tabindex(선택일만 tabindex 0), 화살표 키로 날짜 이동, Tab 한 번으로 agenda 진입 | `P35-CALENDAR-LENS-ONE-TOGGLE` · focus stop ≤ 12 | current_package_screenshot · claude_proposed_artifact |
| Calendar cell 이름 | 잘린 제목 chip이라 스크린리더에도 축약이 읽힌다 | cell accessible name = `8월 14일 (금), 일정 5개`, 제목은 agenda에서 전체로 | `P35-CALENDAR-CELL-COLOR-COUNT` | claude_proposed_artifact |
| 완료 토글 이름 | 체크박스에 항목 제목이 항상 연결되지는 않는다 | 모든 토글에 `<제목> 완료` / `<제목> 다시 열기` + `aria-pressed` | `P35-A11Y-NAMED-TOGGLE` · unnamedFocusable 0 | claude_proposed_artifact |
| 목록 행의 중첩 인터랙티브 | 카드 안 4버튼 + 카드 자체가 링크라 tab 순서가 길다 | 행 = 버튼 1개(+ 실행 화면에서는 완료 토글 1개) | `P35-MY-LIBRARY-ONLY` | current_package_screenshot |
| 논리적 focus 순서 | 공개 Flow에서 CTA가 입력보다 먼저 온다 | DOM 순서 = 결과 → 최소 입력 → 시작 | `P35-ANCHOR-BEFORE-START` | current_package_screenshot |
| Sheet / dialog | 라이브 확인 못 함 | sheet는 `role=dialog aria-modal=true`, 열릴 때 첫 필드로 focus, focus trap, Escape 닫기, 닫으면 열었던 행으로 focus 복귀 | `P35-SHEET-FOCUS-RETURN` | inaccessible → claude_proposed_artifact |
| 200% zoom / 긴 제목 | 라이브 확인 못 함 | 행 제목 2줄까지 허용 후 말줄임, 고정 하단 영역은 최대 2줄까지만 커지고 그 이상은 스크롤, 가로 overflow 없음 | `P35-ZOOM-200-NO-OVERFLOW` | inaccessible → claude_proposed_artifact |
| 하단 고정 요소 충돌 | 공개 Flow의 sticky bar와 전역 bottom nav가 같은 화면에 있을 수 있다 | 공개 Flow(공유 화면)에는 전역 nav를 두지 않는다. 앱 화면에서는 고정 입력 영역을 쓰지 않는다 | `P35-NO-FIXED-OVERLAP` | current_package_screenshot |
| loading | 확인 못 함 | 목록·결과는 skeleton 행, 버튼은 `aria-busy`와 라벨 유지(문구 교체 금지) | `P35-LOADING-STATE` | inaccessible |
| success | receipt 화면으로 확인 | 화면 전환이 있는 경우 receipt, 없는 경우 `role=status` 토스트 | `P35-FEEDBACK-STATUS` | current_package_screenshot |
| failure / retry | 확인 못 함 | 실패는 `role=alert` + 같은 버튼에서 재시도, 입력값 유지 | `P35-ERROR-RETRY-KEEPS-INPUT` | inaccessible |
| 취소 · undo | 일부 존재 | 되돌릴 수 있는 동작은 확인 dialog 대신 토스트 `되돌리기`(4초). 완료·제외·날짜 제거·보관·순서 변경·개인 Item 삭제 모두 해당 | `P35-UNDO-TOAST` | claude_proposed_artifact |
| 작성 중 이탈 | 확인 못 함 | Item 메모는 입력 즉시 임시 저장, sheet를 닫아도 값 유지. 저장 전 조정은 취소 시 명시적으로 원복 | `P35-DRAFT-KEEP` | inaccessible |
| export 실패 | 확인 못 함 | 같은 버튼 재시도 + 실패 사유 한 줄, 범위 선택은 유지 | `P35-EXPORT-RETRY` | inaccessible |
| source 변경 시 개인 값 | 계약상 보존 | 화면에서 `원문이 바뀐 항목` 표기만 하고 개인 제목·날짜·메모는 그대로 둔다. 자동 병합하지 않는다 | `P35-SOURCE-UPDATE-KEEPS-PERSONAL` | current_source |
| 색만으로 구분 | Calendar Flow 구분이 색 chip 위주 | 색 + 개수 + agenda의 Flow 이름 텍스트를 항상 함께 제공 | `P35-NOT-COLOR-ONLY` | claude_proposed_artifact |

## 이 패키지의 prototype에서 실제로 확인한 것

- 390 / 1024 / 1440 전환에서 가로 overflow 없음, 고정 하단 영역과 본문 겹침 없음
- 모든 보이는 컨트롤이 동작하거나(사례 전환·단계 이동·날짜 재계산·포함/제외·완료/다시 열기·날짜 선택·범위 전환·undo) 비활성 이유를 표기함(캘린더 형식: 날짜 있는 항목 0개)
- 달력 grid는 선택일만 tabindex 0, 나머지 -1이며 모든 cell에 날짜+개수 accessible name
- sheet는 `role=dialog aria-modal=true`와 닫기 버튼 제공

## 확인하지 못한 것 (inaccessible)

- production의 라이브 focus trace, 실제 스크린리더 출력, 200% zoom 실측
- reload 이후 persistence, 실제 export 파일 생성과 실패 경로
- prototype의 Escape 키 처리와 focus 복귀는 설계 규칙으로만 기술했고 구현 검증은 하지 않았다

이 항목들은 실제 사용자 검증이 아니라 구현 시 acceptance로 남긴다.
