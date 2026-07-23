# P32 작업 체크리스트

상태: P32-01~07 구현, merge, deploy, canonical production smoke 완료

실제 관찰 사용자: `0`

## P32-01 Evidence, Route, Prototype

- [x] latest origin/main과 production 기준 SHA 기록
- [x] 1/5/20/60 Flow current measurement와 depth 정의 정리
- [x] Item edit/whole export/archive/restore depth 재측정
- [x] actionable completion duplicate 재측정
- [x] global `지금`과 local `실행` 역할 inventory
- [x] 1024/1440 overflow/clipping 재측정
- [x] Claude/Codex discrepancy classification
- [x] mixed date/check/resource route contract
- [x] invalid route를 fixture-only 또는 blocked cell로 교체
- [x] B1 cross-Flow queue 유지안 검증
- [x] B2 continue-strip 대안 평가와 기각 사유 기록
- [x] 390/1024/1440 및 1/5/20/60 비교
- [x] 선택안·rollback 경계 기록
- [x] P32-02 실행 승인

## P32-02 Focused Workspace

- [x] current P31 renderer screenshot/DOM baseline
- [x] object header, next action, whole plan, record, command composition boundary
- [ ] 별도 component extraction no-visual-diff test
- [x] focused/library state opt-in
- [x] moving saved Flow vertical slice
- [x] undated checklist 회귀 경로
- [x] mobile global/local navigation competition 제거
- [x] back query/filter/scroll restore
- [x] wide rail/canvas/inspector command ownership
- [x] first viewport action-first DOM
- [x] projection count parity 회귀
- [x] migration 없는 composition rollback 경계

별도 component extraction은 기능 완료 조건에서 제외했다. `AppClient.tsx` 크기는 유지보수 위험으로 최종 audit에 남긴다.

## P32-03 Quick Item Edit

- [x] current six-step path regression
- [x] Item open -> quick edit entry
- [x] title edit
- [x] fixed date/date removal
- [x] personal memo edit
- [x] advanced schedule collapsed
- [x] source Item mutation 0
- [x] stable Item ID와 completion state 유지
- [x] Calendar/export projection parity
- [x] dirty guard/cancel/focus return 기존 계약 유지
- [x] `itemEditDepth <=3`

## P32-04 Flow Anchor

- [x] public moving saved-copy eligibility
- [x] contextual Flow-level anchor command
- [x] change impact copy
- [x] anchor-linked date recompute
- [x] personal fixed date와 personal memo 유지
- [x] past run 유지
- [x] My Flow/Calendar/ICS/list 기존 projection 유지
- [x] reload persistence
- [x] migration not needed 확인

## P32-05 Export And Lifecycle

- [x] whole/selected/current scope 기존 계약 유지
- [x] destination count preflight와 loss summary
- [x] unsupported destination hidden
- [x] output count parity와 duplicate row/event 0
- [x] active Flow archive와 immediate undo
- [x] archived row direct restore와 reload persistence
- [x] archived-only permanent delete
- [x] source-backed public source preservation
- [x] personal draft delete scope copy
- [x] delete reload ghost state 0
- [x] dialog keyboard/focus 기존 E2E 유지
- [x] `wholeExportDepth <=3`
- [x] archive `<=3`, restore `<=4`

## P32-06 Six Shapes

- [x] anchor timeline
- [x] undated checklist
- [x] recurrence routine
- [x] artifact choice
- [x] mixed date/check/resource fixture-only contract
- [x] personal draft representative
- [x] shared shell identity
- [x] body-specific grouping 유지
- [x] series/occurrence/run 분리
- [x] resource completion control 0
- [x] artifact primary 1 + secondary <=2 기존 계약 유지
- [x] source-backed structural edit control 0
- [x] 새 설명 의존성 0
- [x] route-specific identity fork 0

## P32-07 Final Gate

- [x] My Flow filter/query/scroll restore
- [x] selected Flow/Item, Calendar scope/date, export receipt 기존 계약
- [x] browser back/forward와 reload
- [x] 1/5/20/60 Flow scale gate 회귀
- [x] 기존 persona journey regression suite
- [x] 390/1024/1440
- [x] keyboard journey, accessible name, focus return
- [x] overflow/fixed overlap 0
- [x] console/page error 0
- [x] docs check 최종 재실행
- [x] unit `587 / 587`
- [x] build
- [x] targeted P32 E2E `4 / 4`
- [x] affected P31/P30 E2E
- [x] full E2E `314 / 314`
- [x] final review package
- [x] observed-user count 0 명시
- [x] commit/push/PR/merge/deploy 상태 기록
- [x] canonical production smoke `7 / 7`

## P32-OPS

- [x] PostCSS advisory chain 별도 확인
- [x] force fix와 breaking Next downgrade를 적용하지 않음
- [x] Next 하위 PostCSS를 project PostCSS 8.5.16으로 통일
- [x] 고정 설치, unit, build, full E2E 재실행
- [x] critical/high/moderate/low 0

P32-OPS는 별도 두 번째 커밋으로 관리한다.

## 보류

- [ ] actual observed-user study
- [ ] account/cloud sync
- [ ] AI/crawler
- [ ] OAuth/direct integration
- [ ] creator marketplace
- [ ] social proof/review system

보류 항목은 P32 구현 미완료가 아니다. 별도 owner decision과 운영 계약이 필요한 다음 단계다.
