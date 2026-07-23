# FlowMe P28 전체 실행 백로그

정본 prompt: `docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation/prompt-ko.md`  
개발 복붙용 시작점: [p28-development-handoff.md](./p28-development-handoff.md)  
reviewed main: `46e567ec09c5eba37ac703529b3d3eccc75e0dde`  
application source: `45b1f424a9e73a188750eb22691a756b86153231`

## 프로그램 원칙

P28은 P27 lifecycle workspace를 보존하고 저장 전 projection과 artifact policy를 보강한다. 순차 핵심 경로는 `P28-01 -> P28-02 -> P28-03 -> P28-05 -> P28-07`이다. P28-04는 P28-01의 view model이 고정된 뒤 병렬 가능하다. P28-06의 source/fixture 준비는 P28-02와 병렬로 진행할 수 있지만 public 활성화는 P28-05 이후다.

| Slice | Severity | 실행 | 핵심 결과 |
| --- | --- | --- | --- |
| P28-01 | High | 1, 순차 | 저장 전 전체 Flow + primary artifact shell |
| P28-02 | Blocking | 2, 순차 | 역할·destination eligibility와 artifact policy |
| P28-03 | High | 3, 순차 | 콘텐츠별 contextual adjustment |
| P28-04 | Medium | P28-01 후 병렬 | My Flow inventory + 전체 구조 + 복구 hierarchy |
| P28-05 | High | P28-02/03 후 순차 | Calendar·반복·export policy 통합 |
| P28-06 | High | P28-02와 병렬 준비 | 다섯 대표 콘텐츠 source gate·fixture |
| P28-07 | Integration | 마지막 | production regression/final gate |

## P28-01 저장 전 전체 Flow와 artifact preview shell

**사용자 문제**  
긴 Flow가 `전체`라고 표시되지만 일부만 보이고, 저장될 구조와 primary 결과가 서로 다른 영역에 분산돼 있다.

**적용 route**  
`/f/[slug]`, `/flow-maps/[slug]`, `/flows`의 `existing_flow_found`와 `proposal_ready`.

**구현 범위**

- public bundle과 source-backed Flow를 읽는 공통 `SaveBeforeProjectionVM`.
- source status, 전체 outline, primary artifact, unresolved user value, destination count, loss note를 한 projection으로 제공.
- `저장될 전체 Flow`의 5개 slice 제거. 모바일은 단계 요약+전체 펼치기, wide는 outline rail/drawer.
- 기존 ArtifactWorkbench의 surface와 preview renderer 재사용.
- CTA를 결과 단위와 개수로 표기.

**비범위**  
새 content seed, destination policy 재작성, DB, 전체 editor, My Flow IA 변경.

**데이터 영향**  
읽기 전용 adapter. persistence와 migration 없음. 기존 source/personal/run/occurrence/export identity 불변.

**선행 의존성**  
없음. P27 baseline targeted tests를 먼저 고정.

**390 acceptance**

- source -> 전체 Flow -> primary artifact -> required value -> primary CTA 순서.
- 24개 Flow의 모든 제목을 1회 action으로 펼칠 수 있음.
- sticky competing primary action 1개 이하.

**1024 acceptance**

- 2열 기본, 3열 강제 금지.
- outline을 보면서 primary artifact와 CTA 맥락 유지.
- horizontal overflow와 fixed overlap 0.

**접근성**  
전체 펼치기 `aria-expanded`, outline heading hierarchy, artifact selector named control, focus restoration.

**unit/E2E**

- adapter parity for public/source-backed.
- 5/14/24/38 item outline count.
- moving save-before -> adjust -> save count parity.
- keyboard open/close and focus.

**screenshot marker**  
`p28-01-moving-whole-flow-390`, `p28-01-moving-artifact-1024`, `p28-01-source-backed-390`.

**완료 기준**  
`전체` count와 펼친 row count가 일치하고 save-before, receipt, My Flow의 included item identity mismatch가 0.

## P28-02 콘텐츠별 primary/secondary destination 정책

**사용자 문제**  
현재는 artifact surface resolver와 export eligibility가 분리돼 의미 없는 결과를 노출하고 비실행 참고정보를 완료 항목으로 만들 수 있다.

**적용 route**  
모든 save-before, receipt, My Flow projection, Calendar, export preflight.

**구현 범위**

- additive `itemRole`: action/reference/warning/resource/record/decision.
- `artifactPolicy`: primary, secondary, forbidden, lossNotes.
- item별 destination eligibility resolver.
- legacy item은 action fallback, malformed role은 safe hold/fallback.
- current artifact-plan을 초기 resolver로 재사용하되 slug override를 정책 fixture로 이동할 경계 마련.
- 비지원 destination은 숨기고 중요한 경우에만 이유 표시.

**비범위**  
범용 database schema, 새로운 5번째 탭, 모든 콘텐츠 backfill, AI 분류.

**데이터 영향**  
additive schema. P28-01은 migration 없이 가능하지만 non-action public content 활성화 전 legacy default와 representative backfill 필요.

**선행 의존성**  
P28-01 projection VM interface.

**390/1024 acceptance**

- primary 하나가 첫 시선에 존재.
- secondary는 최대 2개, `다른 형식`은 의미 있을 때만.
- 폭염 reference/warning에 completion control 0, Calendar/ICS row 0.
- 계약 Flow에 날짜가 없으면 Calendar CTA 0.

**접근성**  
artifact 이름과 결과 개수를 button accessible name에 포함. hidden destination은 focus tree에서도 제외.

**unit/E2E**

- role x destination eligibility truth table.
- five-case artifact policy fixture.
- non-action completion/export invariant.
- old moving/workout/vehicle export count regression.

**screenshot marker**  
`p28-02-heat-action-reference-390`, `p28-02-contract-sheet-1024`, `p28-02-course-primary-sheet-390`.

**완료 기준**  
다섯 사례의 primary/secondary/forbidden 결과가 fixture와 일치하고 의미 왜곡 destination 0.

## P28-03 저장 전 contextual adjustment workspace

**사용자 문제**  
지원 가능한 필드는 많지만 사용자에게 지금 필요한 값과 선택 상세가 같은 긴 목록 안에 있다.

**적용 route**  
save-before adjustment sheet/workspace.

**구현 범위**

- unresolved user-owned value registry: anchor date, place, current progress, decision, optional time.
- `필요한 값 -> 변경된 항목 -> 전체 상세` progressive disclosure.
- existing include/date/title+memo/order operations 재사용.
- pre-save ephemeral personal overlay와 cancel/retry/atomic save.
- 콘텐츠별 concrete CTA와 change summary.

**비범위**  
source content 수정, 권리·안전 문제를 개인 입력으로 해결, whole Flow authoring studio, AI rewrite.

**데이터 영향**  
existing personal overlay의 draft. 저장 전 persistent write 0; save 시 한 번에 commit.

**선행 의존성**  
P28-01, P28-02.

**390 acceptance**

- 첫 useful preview 전 필수 입력 0~2개.
- 한 번에 active adjustment mode 1개 이하.
- 변경된 item만 compact summary로 다시 확인.

**1024 acceptance**

- artifact를 보면서 contextual field를 수정.
- 24개 전체 목록은 필요할 때 drawer/outline에서 열림.

**접근성**  
field label과 why hint 연결, validation focus, cancel 후 trigger focus 복구, reorder keyboard 대안.

**unit/E2E**

- cancel writes 0.
- save overlay parity and source mutation 0.
- moving anchor recalculation, course progress optional, trip time promotion.
- retry preserves draft.

**screenshot marker**  
`p28-03-moving-required-value-390`, `p28-03-trip-time-promotion-1024`, `p28-03-change-summary-390`.

**완료 기준**  
원문 값 재입력 0, 필수 입력 0~2, 저장 전과 저장 후 personal overlay mismatch 0.

## P28-04 My Flow 탐색·전체 Flow·삭제·복구 hierarchy

**사용자 문제**  
P27 기능은 갖췄지만 1024에서 inventory와 selected Flow 전체 맥락을 동시에 유지하기 어렵다.

**적용 route**  
`/my`, 저장 receipt의 `전체 Flow 열기`.

**구현 범위**

- 1024+ inventory rail + selected Flow workspace.
- mobile은 현재 list -> detail 전환 유지.
- 1~4 direct browse, 5+ search/filter 정책 보존.
- 전체 outline, 완료·reopen, archive·restore, excluded item restore의 위치 통일.
- 단계, action, reference/resource의 row anatomy 적용.

**비범위**  
4탭 IA 변경, permanent delete, cross-device search, planner dashboard.

**데이터 영향**  
없음. current lifecycle, overlay, run을 그대로 읽음.

**선행 의존성**  
P28-01 outline/view model. P28-02 role rendering은 후속 연결 가능.

**390 acceptance**  
저장 receipt에서 1 action으로 해당 Flow 전체로 이동. back 후 inventory 위치 복구.

**1024 acceptance**  
inventory와 selected Flow title/상태/outline 동시 노출. wide가 stretched mobile stack처럼 보이지 않음.

**접근성**  
search result count announce, selected Flow state, archive undo live region, completion/reopen same named control.

**unit/E2E**

- threshold 1/4/5 flows.
- search -> detail -> archive -> undo -> archived filter -> restore.
- source exclusion vs personal deletion semantics.

**screenshot marker**  
`p28-04-my-flow-mobile`, `p28-04-my-flow-master-detail-1024`, `p28-04-archive-restore`.

**완료 기준**  
P27 lifecycle mutation 0, selected Flow identity mismatch 0, archive/restore path 모두 keyboard 가능.

## P28-05 Calendar filter, 반복 hierarchy, export scope 통합

**사용자 문제**  
P27 각각의 기능은 맞지만 새 role/artifact policy가 Calendar·recurrence·export까지 같은 eligibility로 이어져야 한다.

**적용 route**  
`/calendar`, My Flow occurrence, export preflight와 receipt.

**구현 범위**

- artifactPolicy와 itemRole을 Calendar/ICS/checklist/sheet/memo projection에 연결.
- Flow filter, undated tray, same-date grouping, batch schedule/move/undo 유지.
- series 설정과 occurrence 실행 hierarchy 유지.
- flow/selected/item scope 후 eligible destination만 노출.
- format별 row/event count와 손실 note 사전 표시.

**비범위**  
Google Calendar OAuth, sync, duplicate detection service, 새로운 recurrence engine.

**데이터 영향**  
projection resolver 변경. run/occurrence/export identity와 stored recurrence cadence 불변.

**선행 의존성**  
P28-02, P28-03. P28-04와 병렬 가능.

**390/1024 acceptance**

- undated action만 tray에 존재; reference/warning 0.
- Flow filter 후 grid, agenda, count 일치.
- series 전체와 current occurrence CTA 분리.
- export 전에 scope, destination, count, detail loss 예측 가능.

**접근성**  
Calendar move preview announce, undo named action, occurrence accessible name에 날짜·Flow 포함.

**unit/E2E**

- role eligibility projection parity.
- vehicle undated add/remove date and undo.
- workout occurrence complete/reopen and ICS count.
- moving whole/selected/item export counts.

**screenshot marker**  
`p28-05-undated-tray-390`, `p28-05-calendar-flow-filter-1024`, `p28-05-export-scope-390`.

**완료 기준**  
Calendar·ICS·My Flow count mismatch 0, non-action event 0, occurrence identity mutation 0.

## P28-06 다섯 대표 콘텐츠 source·rights·safety gate

**사용자 문제**  
현재 production으로 content-native artifact UX를 검증할 대표군이 이사에 치우쳐 있다.

**적용 route**  
`/flows` lookup, representative public/source-backed routes.

**구현 범위**

- 이사, K-MOOC, 폭염, 계약, 부모님 여행의 source scope와 exact sourceTrace fixture.
- primary/secondary/forbidden artifact expectation.
- rights/safety/directRoute decision.
- source가 부족하거나 권리가 불명확하면 hold 유지.
- production 활성화 가능한 사례만 route 등록.

**비범위**  
AI 생성, crawler, 대량 seed, source 내용을 추정해 채우기.

**데이터 영향**  
대표 fixture와 제한적 source-backed content. P28-02 role/policy를 사용.

**선행 의존성**  
준비는 P28-02와 병렬. public activation은 P28-02/05 이후.

**390/1024 acceptance**  
각 사례 source -> whole Flow -> primary artifact가 실제 데이터로 연결. blocked 사례는 이유와 다음 action이 명확.

**접근성**  
source/rights/safety 상태를 색만으로 구분하지 않음.

**unit/E2E**

- sourceTrace completeness.
- directRoute/hold policy.
- five-case artifact fixture and URL lookup.

**screenshot marker**  
`p28-06-case-{moving|course|heat|contract|trip}-{390|1024}`.

**완료 기준**  
가짜 source item 0, sourceTrace 누락 0, unsafe direct route 0.

## P28-07 regression/final gate

**사용자 문제**  
저장 전 shell 개선이 P27 lifecycle correctness를 되돌리면 안 된다.

**적용 route**  
`/`, `/flows`, 대표 `/f`, `/flow-maps`, `/my`, `/calendar`, export.

**구현 범위**

- clean origin/main worktree에서 docs:check, unit, build, targeted/full E2E.
- 390x844, 1024x768 production/preview screenshot matrix.
- source/personal/run/occurrence/export identity reconciliation.
- overflow, fixed overlap, console/page error, keyboard, accessible name.
- automated evidence와 observed-user count 분리.

**비범위**  
사용자 모집, 인터뷰, OAuth, production deploy 자체.

**데이터 영향**  
없음. migration fixture가 있다면 old/current round-trip 검증.

**선행 의존성**  
P28-01~06 중 release scope 모두 완료.

**390/1024 acceptance**

- 모든 release route의 mobile·wide marker가 current/proposed 비교와 함께 존재.
- horizontal overflow, fixed overlap, clipped CTA가 viewport별 `0`.
- save-before, receipt, My Flow, Calendar, export의 count·identity가 viewport와 무관하게 일치.

**접근성 acceptance**

- 이름 없는 visible focusable, keyboard trap, 잘못된 `aria-expanded`, focus loss가 `0`.
- 완료/reopen, archive/restore, outline expand/collapse, export scope가 keyboard로 재현됨.

**unit/E2E 요구**

- P28 role/artifact policy와 legacy fallback unit 전체 통과.
- P27 targeted, P28 targeted, full E2E를 같은 commit에서 실행.
- old storage fixture round-trip과 source/personal/run/occurrence/export identity reconciliation 통과.

**검증 명령**

```powershell
npm.cmd run docs:check
npm test
npm.cmd run build
npm.cmd run test:e2e -- tests/e2e/p27-foundation.spec.ts --workers=1
npm.cmd run test:e2e -- --workers=1
```

**screenshot marker**  
각 slice marker 전부와 final production rerun.

**완료 기준**  
Blocking/High regression 0, identity/count mismatch 0, 390/1024 visual gate green, observed-user claim 0.

## 다음 구현 시작점

P28-01부터 시작한다. 단, P28-01에서 새 persistence schema나 content seed를 만들지 않는다. 먼저 current public/source-backed projection을 하나의 read-only view model로 합치고, `저장될 전체 Flow`가 실제 전체와 일치하는 상태를 만든 뒤 P28-02 역할·destination 계약으로 이동한다.
