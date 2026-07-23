# P31 작업 체크리스트

상태: 구현 완료, release verification 진행 중
실제 관찰 사용자: `0`

## P31-00A Evidence

- [x] clean `origin/main` SHA `91ff789637ad9d46f8d646f1f21bd18baa3bfb15` 기록
- [x] production/current source 차이 확인
- [x] 390/1024 current screenshots
- [x] Home/Find 역할·중복 inventory
- [x] Flow card anatomy inventory
- [x] wedding/workout control·scroll·focus inventory
- [x] My Flow default/opened complexity inventory
- [x] Calendar default/inline-detail complexity inventory
- [x] archive/restore/delete storage call-site inventory
- [x] date precedence Blocking reproduction
- [x] reference decision matrix

## P31-00B/C Comparison And Decision

- [x] Home/Find 역할 대안 비교
- [x] discovery card current/proposed 비교
- [x] wedding/workout 공통 skeleton 비교
- [x] My Flow dedicated workspace 비교
- [x] Calendar Item sheet 비교
- [x] lifecycle vocabulary table
- [x] 8 persona x 3 session simulation
- [x] 390/1024 comparison screenshots
- [x] owner bounded implementation 승인
- [x] keep/revise/reopen 판정
- [x] 실패 가정과 rollback 경계 기록

## P31-01 Correctness

- [x] date source inventory
- [x] effective date precedence contract
- [x] resolver/storage unit
- [x] public adjustment -> My Flow -> Calendar parity
- [x] ICS/list export parity
- [x] legacy/malformed fallback
- [x] targeted E2E
- [x] P30 regressions

## P31-02 Discovery/Save-Before

- [x] Home first/returning role
- [x] Find catalog role
- [x] fake social proof `0`
- [x] source external link
- [x] representative Item 1~2
- [x] card action `더보기`
- [x] `/f`/`/flow-maps` grammar 유지
- [x] wedding artifact switch
- [x] workout compact routine
- [x] resource/execution Item separation
- [x] configuration-driven artifact eligibility
- [x] mobile focus path 단축

## P31-03 My Flow

- [x] compact library
- [x] dedicated workspace
- [x] back/query/filter/scroll restore
- [x] `실행 | 전체 계획 | 기록`
- [x] personal-copy title 우선 표시
- [x] operation vocabulary
- [x] archive in workspace overflow
- [x] archived row direct restore
- [x] archive reload persistence
- [x] mobile/wide capability parity
- [x] undated reuse
- [x] current run vs new run distinction 유지

## P31-04 Calendar

- [x] mobile Item sheet
- [x] wide inspector no regression
- [x] selected date/scroll/focus restore
- [x] default/filter/placement mode separation
- [x] undated batch move/undo
- [x] keyboard skip path
- [x] 50+ Flow scope regression
- [x] compact month identity

## P31-05 Lifecycle/Final Gate

- [x] permanent delete storage contract
- [x] source-backed delete copy
- [x] personal draft delete copy
- [x] backup secondary
- [x] confirm dialog
- [x] delete -> reload ghost state `0`
- [x] source rediscovery/re-save
- [x] export/advanced disclosure 유지
- [x] keyboard/focus/accessibility targeted gate
- [x] 24-cell rerun
- [x] complexity metric comparison
- [x] security audit: critical/high `0`, moderate `2` 승인 예외
- [x] full E2E: `310 / 310`, workers `2`
- [ ] production smoke
- [ ] publish SHA와 deployment 기록

## 보류

- [ ] 실제 telemetry 기반 사용 수
- [ ] 실제 review system
- [ ] account/cloud sync
- [ ] AI/crawler
- [ ] OAuth/direct integration
- [ ] creator marketplace
- [ ] observed-user study

보류 항목은 P31 미완료가 아니라 별도 제품·운영 gate다. 자동화와 heuristic simulation은 observed-user study를 대체하지 않는다.
