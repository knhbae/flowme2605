# P26-09 Whole Flow reading evidence

## 판정

- 상태: `complete_internal_evidence`
- 기준 커밋: `81e3d17`
- 실제 관찰 사용자: `0`
- evidence: `current_source`, `current_command`, `current_browser`

저장한 Flow를 한 덩어리 목록으로 펼치던 화면을 콘텐츠 크기와 기존 구간에 따라 읽는 구조로 바꿨다. 새 planner view를 추가하지 않고, source와 personal projection이 이미 만든 순서와 구간을 그대로 사용한다.

- 짧은 Flow `3개 / 10개`: 모든 항목을 바로 보여준다.
- 긴 Flow `24개`: `단계 / 기간 / 완료 수`를 먼저 보여주고 다음 행동이 있는 한 단계만 연다.
- 같은 날짜의 연속 항목: 날짜를 행마다 반복하지 않고 한 번만 묶어 보여준다.
- 행: 완료 checkbox, 제목, 날짜 또는 기준, `열기`만 유지한다.
- 실행 메모: 행마다 반복하지 않고 열린 상세 안에서 작성한다.

## 화면 결과

### 모바일 390px

- 3개 routine은 `구성 3개`와 세 행이 모두 보인다.
- 10개 checklist는 `체크 10개`와 열 행이 모두 보이며 불필요한 disclosure가 없다.
- 24개 moving Flow는 `6단계 / 7월 16일 - 8월 16일 / 0/24 완료`를 먼저 보여준다.
- 기본 상태에서는 첫 단계의 4개만 실행 행으로 보이고 나머지 5단계는 접힌 header다.
- `전체 펼치기` 후 24개가 모두 보인다.
- 고정 bottom navigation과 reading summary overlap은 `0`이다.

### 와이드 1024px

- phase outline과 기존 detail pane을 함께 유지한다.
- outline에서 `열기`를 선택하면 같은 item의 상세가 오른쪽에 나타난다.
- 별도 timeline toggle, kanban, Gantt는 추가하지 않았다.

## 계약 보존

- source row와 원본 order mutation: `0`
- canonical row count loss: `0`
- completion/reopen membership 변화: `0`
- source-backed 전체/선택 export 유지
- 개인 draft batch move/remove/undo/export 유지
- personal structural draft의 add/delete/restore/reorder 목록은 P26-11 전까지 기존 renderer 유지
- held multi-Flow receipt는 canonical `18개`를 유지하고 기본 `14개`, 전체 펼치기 `18개`를 표시

## 접근성

- 각 구간은 native button과 `aria-expanded / aria-controls`를 사용한다.
- `Space`와 `Enter`로 열고 닫을 수 있다.
- 완료 checkbox와 `열기` accessible name을 유지한다.
- row-level 메모 action은 `0`; 상세 안 메모 entry는 보이고 실제 저장·완료 회고 집계가 동작한다.

## 현재 검증

- whole-Flow reading pure unit: `4 / 4` pass
- 기존 unit: `549 / 549` pass
- P26-09 dedicated Playwright: `4 / 4` pass
- 영향받은 completion/export/batch/note/receipt 시나리오: `7 / 7` pass
- production build: pass, 18 routes
- mobile/wide horizontal overflow: `0`
- console/page errors: `0`

자동 브라우저와 command evidence이며 실제 사용자가 단계 요약을 설명 없이 이해하는지는 아직 관찰하지 않았다.

## 화면

- [3개 routine 390px](./screenshots/01-mobile-three-item-routine.png)
- [10개 checklist 390px](./screenshots/02-mobile-ten-item-checklist.png)
- [24개 timeline 기본 390px](./screenshots/03-mobile-twenty-four-item-timeline.png)
- [24개 timeline 전체 페이지](./screenshots/03-mobile-twenty-four-item-timeline-page.png)
- [24개 전체 펼침과 상세](./screenshots/03b-mobile-twenty-four-item-expanded-detail.png)
- [24개 outline/detail 1024px](./screenshots/04-wide-twenty-four-item-timeline.png)

## 참고 패턴

`2026-07-19-flow-content-usage-preview-ko.html`의 compact row와 제목·시점·개수 우선 스캔 방식은 참고했다. 다만 그 artifact의 source rail이나 destination 설명을 그대로 복제하지 않고, My Flow에서는 실행 단계·완료·다음 행동만 남겼다.

## 다음 범위

P26-10은 열린 항목의 `빠른 수정 / 고급 설정`을 분리한다. P26-11은 개인 draft 구조 편집과 batch mode를 같은 whole-Flow reading grammar 안에서 정리한다.
