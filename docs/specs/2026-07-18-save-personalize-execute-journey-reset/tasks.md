# Save, Personalize, Execute Journey Reset Tasks

## P24-J0 - Completed decision gate

- [x] Clean worktree와 current documentation baseline을 확인한다.
- [x] 기존 콘텐츠 편집·실행 시뮬레이션의 11단계를 inventory한다.
- [x] current moving, post-save My Flow, Calendar, public vehicle 화면을 capture한다.
- [x] Claude Design progressive editor/completion/occurrence 목업을 대조한다.
- [x] Notion, Todoist, Sunsama, Google Calendar, Wanderlog의 관련 공식 패턴을 확인한다.
- [x] bounded journey reset과 전면 재작성/문구-only 수정의 tradeoff를 기록한다.
- [x] current와 대안 A/B의 모바일·wide 와이어프레임을 완성한다.
- [x] owner 방향 검토와 별도 read-only Codex heuristic review를 실행한다.
- [x] 외부 사용자 모집이나 prototype session 없이 선정 근거와 남은 가정을 기록한다.
- [x] 결과를 `keep/change/defer`로 분류한다.
- [x] P24-J1 구현 범위를 승인한다.

## P24-J1 - Save decision

- [x] public/save-before copy inventory와 삭제/접기/유지 map을 확정한다.
- [x] artifact-first preview를 source-backed와 public shell에 구현한다.
- [x] `그대로 저장`과 `조정하고 저장`을 구현한다.
- [x] moving/vehicle/mobile/wide E2E와 screenshot을 추가한다.

## P24-J2 - Post-save confirmation

- [x] post-save special state에서 전체 timeline/checklist를 기본 노출한다.
- [x] returning Today-first 상태와 분리한다.
- [x] 저장 직후 전체 확인 depth 0을 E2E로 고정한다.

## P24-J3 - Execution surface roles

- [x] My Flow Flow 선택 UI의 역할을 `저장한 Flow`로 명확히 한다.
- [x] Calendar undated tray와 dated grid 경계를 검증한다.
- [x] held/review ordinary-surface visibility를 0으로 만든다.
- [x] 기존 saved held record는 보존하되 빈 실행 workspace 행동을 노출하지 않게 한다.

## P24-J4 - Integration and regression

- [x] 세 대표 Flow 유형에 공통 contract를 적용한다.
- [x] 완료/재개, 날짜, 반복, export 회귀를 실행한다.
- [x] 모바일 390px, wide 1024px, keyboard, accessible name을 확인한다.
- [ ] production deploy와 route evidence를 만든다.

## P24-J5 - Internal production readiness

- [ ] clean production에서 대표 여정을 current evidence로 다시 실행한다.
- [x] 독립 read-only Codex review에서 Blocking/High 0을 확인한다.
- [x] 모바일 390px, wide 1024px, keyboard, accessible name, overflow, console error를 확인한다.
- [x] `implementation_complete_observation_not_started`와 `not_ready_for_observation`으로 판정한다.
- [x] P24-00B는 owner의 명시적 재개 결정 전까지 `0 / 15`, not scheduled로 유지한다.

## Closeout truth

- 현재 미완료 항목은 production merge/deploy와 배포된 route 재검증뿐이다.
- 자동화, screenshot, owner 방향 검토, independent agent review는 `observed_user`가 아니다.
- 외부 사용자 모집·요청·일정 조율·세션은 수행하지 않았다.
