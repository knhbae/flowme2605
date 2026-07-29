# FlowMe P35 순차 개발 복붙용 프롬프트

- 기준안: `A_prime`
- 프로그램: `P35-01`~`P35-08`
- 실제 관찰 사용자 수: 0명
- 사용법: 현재 단계의 블록 하나만 개발 에이전트에 전달하고, 완료 evidence를 확인한 뒤 다음 블록으로 진행한다.

## 공통 정본

모든 slice에서 먼저 읽을 파일:

1. `AGENTS.md`
2. `agent.md`
3. `docs/STATUS.md`
4. `docs/SERVICE_STRUCTURE.md`
5. `docs/specs/2026-07-26-flowme-mece-ux-reset/plan.md`
6. `docs/specs/2026-07-26-flowme-mece-ux-reset/design-package.md`
7. `docs/specs/2026-07-26-flowme-mece-ux-reset/simulation.md`
8. `docs/specs/2026-07-26-flowme-mece-ux-reset/developer-handoff-a-prime-ko.md`
9. 이 문서

공통 실행 규칙:

- `D:\flowme2605\flow-mvp`가 dirty이면 사용자 변경을 보존하고 최신 `origin/main`의 clean worktree에서 작업한다.
- 이전 P35 slice의 실제 반영 SHA와 acceptance marker를 먼저 확인한다.
- 승인된 `A_prime` 결정은 다시 열지 않는다.
- 한 번에 한 slice만 구현하고 검증한 뒤 멈춘다.
- 삭제한 UI를 새 카드, 탭, 메뉴, 설정, 설명으로 옮기지 않는다.
- localStorage key, schema, source/personal/structural/run/occurrence/export identity를 변경하지 않는다.
- migration, Goal, account, DB, cloud sync, crawler, 실제 AI, OAuth를 추가하지 않는다.
- 별도 요청 없이 commit, push, PR, merge, deploy하지 않는다.
- 자동화, screenshot, fixture, agent simulation은 실제 사용자 검증이 아니다.

## P35-01

```text
FlowMe MECE UX Reset A_prime의 P35-01만 구현해줘.

정본:
docs/specs/2026-07-26-flowme-mece-ux-reset/developer-handoff-a-prime-ko.md의 P35-01

목표:
- 별도 Home UI 제거
- /는 저장 Flow가 있으면 /my, 없으면 /flows로 replace 이동
- primary navigation을 Flow 찾기 / Calendar / My Flow 세 개로 축소
- direct route와 저장 데이터 계약 유지

비범위:
- public Flow, My Flow, Calendar composition 변경
- MyFlowView와 dead branch 변경
- 새 dashboard, Inbox, Goal, social proof

P35-ENTRY-ROUTER-3TAB marker와 390/1024/1440 evidence를 남겨라.
docs:check, unit, build, targeted E2E, git diff --check를 실행하라.
완료 보고 후 P35-02를 시작하지 마라.
```

## P35-02

```text
FlowMe MECE UX Reset A_prime의 P35-02만 구현해줘.

선행 조건:
- P35-01이 실제 반영됐고 P35-ENTRY-ROUTER-3TAB evidence가 통과해야 한다.

정본:
docs/specs/2026-07-26-flowme-mece-ux-reset/developer-handoff-a-prime-ko.md의 P35-02

목표:
- public Flow 첫 viewport를 제목·출처 → 실제 전체 결과 → 필요한 최소 입력 → 단일 시작 행동 순서로 재구성
- 콘텐츠별 natural primary artifact와 실제 Item 수·날짜 범위를 먼저 표시
- CTA를 실제 결과 개수를 포함한 단일 시작 행동으로 정리

삭제:
- 요약 chip 세 개
- 실제 결과를 바꾸지 않는 artifact 전환 tab
- 중복 전체 Flow 카드와 중복 저장 CTA
- 모든 콘텐츠에 강제한 결과 형태 목록

유지:
- source, sourceTrace, safety/rights state
- projection, eligibility, receipt, 저장 identity

이사, 날짜 없음, 반복, 장기 학습 네 shape를 390/1024/1440에서 검증하고
P35-PUBLIC-RESULT-FIRST evidence를 남겨라.
저장 payload나 schema를 바꾸지 마라.
완료 보고 후 P35-03을 시작하지 마라.
```

## P35-03

```text
FlowMe MECE UX Reset A_prime의 P35-03만 구현해줘.

선행 조건:
- P35-02와 P35-PUBLIC-RESULT-FIRST evidence 통과

정본:
docs/specs/2026-07-26-flowme-mece-ux-reset/developer-handoff-a-prime-ko.md의 P35-03

목표:
- 저장 전 조정을 이름 / 기준일·날짜 / 포함 항목 / 반복으로 구분
- 한 번에 한 panel만 열기
- 콘텐츠에 필요 없는 조정은 숨기기
- 변경 전후 Item 수, 날짜 범위, 반복 요약을 같은 화면에서 비교
- 적용과 취소, focus return 제공

저장 후 개인 Flow가 소유할 고급 Item editor를 public frame에 만들지 마라.
기존 date intent, personal overlay, structural overlay를 재사용하고 새 설정 schema를 만들지 마라.

P35-ADJUST-ONE-KIND marker와 apply/cancel/keyboard evidence를 남겨라.
완료 보고 후 P35-04를 시작하지 마라.
```

## P35-04

```text
FlowMe MECE UX Reset A_prime의 P35-04만 구현해줘.

선행 조건:
- P35-01이 실제 반영돼 있어야 한다.
- P35-02와 P35-03의 UI 변경을 보존한다.

정본:
docs/specs/2026-07-26-flowme-mece-ux-reset/developer-handoff-a-prime-ko.md의 P35-04

목표:
- giant MyFlows에서 live Calendar surface를 먼저 독립 경계로 추출
- /calendar가 추출 surface를 직접 렌더링하게 연결
- parity 확인 후 dead checklist/routine branch, type, label, assertion 제거
- Calendar 추출 후 남은 기존 calendar branch와 변환 table 제거

중요:
- calendar는 현재 live branch다. 추출 전에 삭제하지 마라.
- /my와 /calendar의 사용자 동작은 이번 slice에서 redesign하지 마라.
- completion, lifecycle, recurrence, export, fixture identity를 유지하라.
- 새 사용자 대면 라벨 순증은 0이어야 한다.

MyFlows의 button, 한글 라벨, conditional branch, 함수 줄 수를 before/after로 측정하라.
P35-MYFLOW-SAFE-SPLIT과 P35-DEAD-VIEW-REMOVAL evidence를 남겨라.
완료 보고 후 P35-05를 시작하지 마라.
```

## P35-05

```text
FlowMe MECE UX Reset A_prime의 P35-05만 구현해줘.

선행 조건:
- P35-04 route parity와 safe split evidence 통과

정본:
docs/specs/2026-07-26-flowme-mece-ux-reset/developer-handoff-a-prime-ko.md의 P35-05

목표:
- /my를 저장 Flow library로 한정
- 목록 행은 개인 이름, 개수, 읽기 전용 다음 예정 한 줄, Flow 열기만 제공
- /my의 지금 실행 mode, 독립 완료 view, 행별 다중 명령 제거
- 완료 상태는 library 필터와 개인 Flow 안에서 읽기
- 개인 Flow workspace가 다음 Item, 전체 진행, Item detail, 구조 조정, export, lifecycle을 소유
- 같은 occurrence를 여러 영역에서 중복 실행하지 않기

유지:
- 완료/다시 열기
- add/delete/restore/reorder
- title/date/time/location/memo overlay
- archive/restore/archived-only permanent delete
- legacy 24개/5개 copy

1/5/20/60 Flow fixture와 390/1024/1440을 검증하라.
P35-MY-LIBRARY-ONLY와 P35-PERSONAL-SINGLE-FOCUS evidence를 남겨라.
저장 데이터와 migration은 변경하지 마라.
완료 보고 후 P35-06을 시작하지 마라.
```

## P35-06

```text
FlowMe MECE UX Reset A_prime의 P35-06만 구현해줘.

선행 조건:
- P35-04 Calendar 분리 완료
- P35-05 개인 Flow workspace 완료

정본:
docs/specs/2026-07-26-flowme-mece-ux-reset/developer-handoff-a-prime-ko.md의 P35-06

목표:
- Calendar를 여러 Flow의 날짜 lens로 정리
- month cell은 점·개수·짧은 Flow 구분만 표시
- selected-day agenda는 Flow별로 묶기
- agenda 행에는 공유 완료/다시 열기 primitive 하나만 허용
- 다른 편집은 같은 개인 Flow 또는 Item detail로 이동

삭제:
- inline memo, title edit, date move, batch placement
- undated tray
- 긴 title chip과 raw recurrence rule

중요:
- Calendar 전용 완료 state를 만들지 마라.
- 개인 Flow와 같은 run/occurrence identity, component, label, undo를 사용하라.
- 날짜 없는 Item 데이터는 삭제하지 마라. 개인 Flow에서 계속 접근 가능해야 한다.

20/60 Flow, keyboard, focus, selected day identity, ghost row를 검증하고
P35-CALENDAR-LENS-ONE-TOGGLE evidence를 남겨라.
완료 보고 후 P35-07을 시작하지 마라.
```

## P35-07

```text
FlowMe MECE UX Reset A_prime의 P35-07만 구현해줘.

선행 조건:
- P35-05 개인 Flow workspace 완료

정본:
docs/specs/2026-07-26-flowme-mece-ux-reset/developer-handoff-a-prime-ko.md의 P35-07

목표:
- export에서 format보다 whole / selected / current scope와 실제 count를 먼저 표시
- scope 확정 후 유효한 형식만 제시
- 형식별 포함·제외 정보와 손실을 실행 전에 표시
- receipt에 scope, count, format, stable identity를 표시

유지:
- Calendar/ICS, checklist, sheet/TSV, memo/Markdown projection
- 개인 수정본의 title/date/memo/include state
- existing export identity와 receipt 계약

새 scope enum, 저장 key, migration을 만들지 마라.
ICS event, checklist row, TSV row와 receipt count parity를 검증하라.
P35-EXPORT-SCOPE-FIRST와 P35-EXPORT-COUNT-PARITY evidence를 남겨라.
완료 보고 후 P35-08을 시작하지 마라.
```

## P35-08

```text
FlowMe MECE UX Reset A_prime의 P35-08 최종 gate만 수행해줘.

선행 조건:
- P35-02부터 P35-07까지 acceptance marker가 모두 통과

정본:
docs/specs/2026-07-26-flowme-mece-ux-reset/developer-handoff-a-prime-ko.md의 P35-08

목표:
- 새 기능 없이 shared visual grammar, responsive composition, accessibility를 마감
- public save-before, adjustment, receipt, My Flow library, personal Flow, Calendar, export의 command hierarchy 통일
- 390px, 1024px, 1440px에서 각각 mobile/rail/canvas/inspector 역할 검증
- 이사, 날짜 없음, 반복, 장기 학습, 개인 draft의 multi-session journey gate 실행

금지:
- 새 route/tab/object/planner 기능
- Home, My Flow Today, Calendar inline edit/undated tray 재도입
- 데이터 계약 변경
- 설명 블록 추가

docs:check, unit, build, P35 targeted E2E, 관련 regression E2E를 실행하고
blast radius가 넓으면 full E2E를 실행하라.
complexity before/after, route evidence, journey results, screenshots를 남겨라.

P35-FINAL-MECE-GATE로 판정하고 자동 검증은 실제 사용자 검증이 아니며
observed-user count는 0이라고 명시하라.
commit, push, PR, merge, deploy는 별도 요청 없이는 하지 마라.
```
