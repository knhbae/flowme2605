# P31 correctness and complexity reduction program

## 프로그램 판정

Architecture verdict: `bounded_revision`

Interaction complexity verdict: `coordinated_simplification_required`

P30의 data contract, 4탭 IA, public `/f` shell, save-before/receipt/returning execution frame은 유지한다. 그러나 현재 surface의 기능 노출량을 그대로 유지한 채 오류만 고치지는 않는다.

현재 evidence:

- 24개 journey cell 중 설명 없이 이해 가능한 cell 13개, 설명 의존 cell 11개
- 지정 시나리오 interaction depth 합계 191회, cell당 평균 7.96회
- 모바일 save-before에서 primary save까지 keyboard Tab 16회
- 펼친 My Flow에서 focusable control 74~90개
- observed users 0

interaction depth는 자동화 시나리오의 단계 합계이며 실제 사용자의 최적 경로나 체감 난이도 측정값이 아니다. 하지만 기능 지원과 직관성이 같지 않다는 내부 설계 evidence로 사용한다.

## 공통 UX 계약

각 frame은 다음 질문 하나를 먼저 해결한다.

| Frame | 기본 사용자 질문 | 기본 노출 | 접거나 문맥에서 여는 기능 |
| --- | --- | --- | --- |
| Discovery | 이 콘텐츠로 시작할 수 있는가? | 일치한 Flow, 범위, source, 열기 | variant 비교, 후보 관리 |
| Save-before | 무엇이 저장되고 무엇만 정하면 되는가? | 전체 결과, 필수 입력 0~1개, primary 1개 | 항목 조정, secondary artifact, export |
| Receipt | 무엇이 저장됐고 다음은 무엇인가? | 저장 수, 날짜 범위, `My Flow에서 시작` | 다른 format 가져가기 |
| My Flow | 지금 무엇을 하면 되는가? | next action, progress, 전체 Flow | 수정, batch, export, 회고, correction, reuse, 관리 |
| Calendar | 오늘·선택한 날짜에 무엇이 있는가? | selected-day agenda, 날짜 이동 | Flow scope mode, undated placement mode |
| Item detail | 이 항목을 끝내거나 빠르게 고칠 수 있는가? | 완료/reopen, 제목, 날짜 | 시간, duration, memo, source, current export |

공통 정량 목표:

- 설명 없이 수행 가능한 cell `13/24 -> 20/24 이상`
- 첫 viewport의 경쟁 primary action 1개 이하
- 일반 next action은 surface 진입 후 2 tap/click 이내
- save primary keyboard 도달 8 Tab 이내 또는 동등한 skip/group navigation
- 고급 control group은 기본 접힘
- 390/1024에서 horizontal overflow와 fixed overlap 0

## P31-01 Effective date and projection correctness

### 사용자 문제

save-before item date가 draft에 남으면 post-save execution override보다 먼저 읽혀 My Flow, Calendar, ICS가 서로 다른 날짜를 사용한다.

### 범위

- `resolveMyFlowEffectiveDate` precedence 단일화
- 명시적 날짜 제거, execution override, personal/save-before overlay, source 순서 고정
- save-before commit의 날짜 중복 저장 제거 또는 source-aware normalization
- 기존 localStorage record의 non-destructive 호환 읽기
- My Flow, Today, Calendar, whole/selected/current export parity

### 비범위

- persistence schema 전면 교체
- 서버 migration
- Calendar composition 변경
- item editor 재설계

### 영향 파일 후보

- `lib/flow/my-flow-personal-state.ts`
- `components/flow/AppClient.tsx`
- effective-date unit tests
- P31 targeted E2E

### Dependency와 rollback

- 선행 dependency 없음. 반드시 가장 먼저 수행한다.
- 기존 key를 유지하고 destructive rewrite를 금지한다.
- resolver와 normalizer를 이전 구현으로 되돌려도 사용자 record가 손상되지 않아야 한다.

### 완료 기준

- 저장 전 `2026-08-01`, 저장 후 `2026-08-03`이면 모든 surface와 export가 `2026-08-03`
- 명시적 날짜 제거가 draft와 source 날짜보다 우선
- title, memo, date가 같은 stable item identity에 결합
- 기존 date removal, fixed-date reuse, occurrence tests 유지

### Evidence marker

- Unit: `latest execution override wins over save-before draft`
- E2E: `P31-EFFECTIVE-DATE-PRECEDENCE`
- Screenshot: `P31-01-my-flow-calendar-date-parity-390.png`
- Screenshot: `P31-01-export-receipt-date-parity-1024.png`

## P31-02 Discovery and save-before simplification

### 사용자 문제

사용자는 저장 전에 전체 Flow를 볼 수 있지만 날짜 방식, 전체 구조, item 조정, artifact 선택, export, 저장을 연속해서 구분해야 한다. `/flows`의 5-item 이사 map과 `/f`의 24-item public Flow 관계도 보이지 않는다. 모바일 홈은 `/flows`와 같은 진입·카드를 축약해 보여주며, 결혼과 한 항목짜리 운동 Flow도 같은 artifact/date/control 묶음을 사용한다.

### UX 방향

- 기본 화면: 실제 전체 결과, source, 필수 사용자 값 0~1개, primary action 1개
- 홈 역할: 처음 온 사용자에게 실제 `콘텐츠 -> 결과 -> 내 도구` 사례, 재방문 사용자에게 next action과 최근 Flow
- Flow 찾기 역할: URL·메모, 검색, 카테고리, 최근/인기 Flow 탐색
- 카드 anatomy: 결과 한 줄, external source link, 항목 수, natural primary artifact, 대표 항목 1~2개
- `그대로 시작`을 기본 action으로 두고 `조정`은 contextual secondary action으로 유지
- secondary artifact와 저장 전 export는 결과 설명 아래 접힌 영역 또는 명시적 action에서 연다
- 결혼 Flow: Calendar timeline을 primary로 두고 날짜 input 하나를 직접 연결
- routine Flow: 일정 미정이면 My Flow 실행, 일정 설정 후 recurring Calendar series를 제안
- 선택한 artifact에 맞춰 `캘린더 일정 12개 확인`, `반복 일정 1개 확인`처럼 outcome-specific action 사용
- export 전 scope, count, 예시, 손실 preview
- 검색 결과에서 canonical Flow와 variant의 항목 수, natural artifact, 저장 범위를 클릭 전에 보여준다
- 긴 설명문이나 전역 사례 gallery를 추가하지 않는다
- 실제 usage/review telemetry 전에는 production에 가상 social proof를 표시하지 않는다

### 범위

- `/flows` canonical representative 또는 explicit variant bridge
- `/` first/returning composition과 `/flows` 역할 분리
- Flow discovery card source link, metadata와 action hierarchy
- public `/f` first viewport command hierarchy
- content/state-aware primary artifact eligibility와 CTA copy
- pre-export projection preview
- save-before mobile keyboard group/skip order
- adjustment open/close와 trigger focus return
- current artifact projection과 receipt contract 재사용

### 비범위

- 4탭 IA 변경
- lookup state 재작성
- AI generation/crawler
- full Flow editor
- source slug 삭제 또는 대량 콘텐츠 병합
- creator marketplace, review moderation과 usage ranking backend
- 가상 사용자 수·리뷰 수의 production 표시

### 데이터 영향

- 기존 slug와 sourceTrace 유지
- map/public 관계는 non-destructive metadata 또는 projection으로 표현
- 선택한 identity가 receipt, My Flow, Calendar, export에 이어져야 함

### Dependency와 병렬성

- P31-01 완료 후 진행
- P31-03의 My Flow hierarchy 설계와 wireframe 단계는 병렬 가능

### 완료 기준

- 이사 검색에서 5개 map과 24개 variant의 관계와 저장 범위를 클릭 전에 예측 가능
- save-before 첫 viewport의 primary action 1개
- 일반 Flow의 useful preview 전 필수 입력 0~1개
- 홈에서 Flow 찾기 카드의 단순 반복 0
- discovery source를 상세 진입 없이 외부 link로 열 수 있음
- 카드 전체 tap과 `Flow 열기` 같은 중복 destination action 0
- 결혼은 Calendar 12개, 운동은 설정 전 My Flow·설정 후 반복 일정으로 primary action이 달라짐
- export 실행 전 scope, count, 예시, 손실 확인
- primary save까지 keyboard Tab 8회 이내 또는 동등한 group navigation
- adjustment 취소 후 호출 trigger로 focus 복귀
- primary와 가치 있는 secondary 최대 2개만 노출
- synthetic usage/review metric production 노출 0

### Evidence marker

- E2E: `P31-DISCOVERY-SAVE-BEFORE-SIMPLIFICATION`
- E2E: `P31-02-HOME-ROLE`
- E2E: `P31-02-DISCOVERY-CARD`
- E2E: `P31-02-CONTEXTUAL-ARTIFACT`
- E2E: `P31-02-EXPORT-PREVIEW`
- Screenshot: `P31-02-discovery-bridge-390.png`
- Screenshot: `P31-02-home-first-returning-390.png`
- Screenshot: `P31-02-wedding-calendar-primary-390.png`
- Screenshot: `P31-02-routine-contextual-result-390.png`
- Screenshot: `P31-02-save-before-first-viewport-390.png`
- Screenshot: `P31-02-save-before-wide-1024.png`
- Keyboard trace: `P31-02-save-primary-focus-order.json`

## P31-03 My Flow execution-first progressive disclosure

### 사용자 문제

My Flow는 next action과 전체 계획을 제공하지만 item 수정, batch, export, 회고, source correction, 새 실행, 관리가 한 surface에 누적된다. `/f`에서 조정 저장한 Flow는 반대로 현재 실행의 전체 기준일을 다시 바꾸는 진입점이 없다. 날짜 없이 시작한 Flow도 reuse에서 날짜를 강제한다. Flow lifecycle는 상세 최하단 `더보기`에 숨고, 모바일 보관 목록은 undo 이후 복구 action에 도달하지 못한다. Flow 영구 삭제 UI는 없으며 `목록에서 빼기`가 서로 다른 데이터 변경에 반복된다.

### UX 방향

- 기본 Flow row/canvas: next action, progress, 전체 계획 열기
- 모바일 목록에서 Flow를 누르면 인라인 확장 대신 dedicated Flow workspace로 전환
- mobile workspace의 상위 mode는 `실행 | 전체 계획 | 기록`
- workspace header는 back, Flow title, progress, overflow만 유지
- item quick action: 완료/reopen, 제목, 날짜
- `조정`: 저장 이름, 기준일, 포함 여부, 순서
- `가져가기`: whole/selected/current가 필요한 문맥에서만 노출
- `완료 후`: 회고와 source correction
- `다시 쓰기`: 현재 실행 조정과 구분된 새 run action
- 관리·archive는 workspace header의 predictable overflow에 유지
- 보관 목록 row에는 직접 `복구` action 제공
- 사용자 동사 고정:
  - 실행 `완료 / 다시 열기`
  - 일정 `날짜 정하기 / 날짜 없애기`
  - source-backed 구성 `Flow에서 제외 / 다시 포함`
  - 개인 초안 구조 `항목 삭제 / 항목 복구`
  - Flow lifecycle `보관 / 복구 / 이 기기에서 영구 삭제`

### 범위

- My Flow default hierarchy와 progressive disclosure
- mobile Flow list -> dedicated workspace navigation, back/scroll/search restoration
- item bottom sheet 또는 full-screen detail
- `/f` adjustment 저장 객체에 current-run settings capability 연결
- 저장 이름, 기준일, 포함/제외의 영향 preview
- fixed date 유지/재계산 정책 재사용
- 날짜 없는 reuse와 날짜를 정한 reuse 두 경로
- 과거 run, 개인 메모, 회고 보존
- active Flow 보관, archived Flow 직접 복구, reload 후 lifecycle persistence
- source-backed Flow와 개인 draft Flow의 영구 삭제 범위 정의
- 영구 삭제 confirmation과 선택적 `백업 먼저 받기`

### 비범위

- full editor
- source structure 수정
- account/cloud sync
- creator transmission backend
- 새로운 recurrence engine
- public source 또는 원본 Flow 콘텐츠 삭제

### 데이터 영향

- P31-01 effective date 계약에 의존
- 기존 personal overlay와 run registry 재사용
- 새 schema보다 derived capability와 명시적 undated intent 우선
- rollback 시 과거 run과 개인 기록을 삭제하지 않음
- archive는 가시성만 바꾸고 source, personal overlay, run을 보존
- permanent delete는 saved membership, 개인 overlay, run, archive lifecycle slug를 일관되게 제거
- source-backed Flow의 공개 source는 permanent local delete 뒤에도 발견 가능

### Dependency와 병렬성

- 구현은 P31-01 후 시작
- P31-02와 component composition 작업 병렬 가능

### 완료 기준

- 처음 열린 My Flow에서 next action, progress, 전체 보기 외 고급 group은 기본 접힘
- Flow 목록과 큰 실행 workspace가 한 모바일 세로 surface에 동시에 누적되지 않음
- workspace에서 `실행 | 전체 계획 | 기록` 외 상위 mode 추가 없음
- back 후 목록 검색어, filter와 scroll 복원
- 일반 next action 2 tap/click 이내
- 조정 저장한 `/f` Flow에서 current-run 기준일과 저장 이름 수정 가능
- 기준일 변경 전 linked/fixed date 결과 미리보기
- 날짜 없는 원본 Flow를 날짜 입력 없이 새 run으로 재사용 가능
- dated/undated reuse 모두 past run과 회고 보존
- 설명 없이 `현재 실행 조정`과 `새 실행으로 다시 쓰기`가 구분됨
- archive -> reload -> archived filter -> restore가 390/1024에서 모두 가능
- 모바일 보관 행에 직접 `복구` action이 있고 별도 상세 진입에 의존하지 않음
- 영구 삭제는 archived Flow에서만 제공하고 지워질 데이터와 공개 원본 보존을 확인
- source-backed Item 제외와 personal draft Item 삭제가 서로 다른 동사를 사용

### Evidence marker

- E2E: `P31-MY-FLOW-EXECUTION-FIRST`
- E2E: `P31-03-MOBILE-WORKSPACE`
- E2E: `P31-UNDATED-REUSE`
- E2E: `P31-03-FLOW-LIFECYCLE-GRAMMAR`
- E2E: `P31-03-ARCHIVE-RESTORE-PARITY`
- E2E: `P31-03-MOBILE-ARCHIVED-DIRECT-RESTORE`
- Screenshot: `P31-03-my-flow-default-390.png`
- Screenshot: `P31-03-my-flow-list-to-workspace-390.png`
- Screenshot: `P31-03-item-detail-sheet-390.png`
- Screenshot: `P31-03-current-run-settings-1024.png`
- Screenshot: `P31-03-undated-reuse-choice-390.png`
- Screenshot: `P31-03-active-flow-management-390.png`
- Screenshot: `P31-03-archived-flow-direct-restore-390.png`

## P31-04 Calendar view and placement modes

### 사용자 문제

Calendar는 Flow scope, selected-day agenda, 날짜 없는 tray, batch placement를 모두 지원하지만 일정 확인과 편집·배치 control이 같은 workspace에서 경쟁한다.

### UX 방향

- 기본 mode: 선택 날짜의 일정과 완료/reopen
- 모바일 item detail: 선택일 agenda 안의 인라인 확장 대신 bottom sheet, 필요하면 full-screen 확장
- wide item detail: 현재 side inspector 유지
- Flow 범위: 필요할 때 여는 filter/scope mode
- 날짜 없는 일: 명시적 `날짜 배치` mode 또는 sheet
- batch 선택과 undo는 placement mode 안에서만 노출
- item 날짜 제거는 같은 identity를 tray로 되돌림

### 범위

- Calendar command placement와 mode state
- selected-day agenda 우선순위
- item detail sheet의 open/close, selected date·scroll·focus 보존
- Flow scope와 undated placement의 진입·종료·focus return
- 같은 날짜 다중 Flow identity 유지
- P31-01 날짜 projection과 export parity 사용

### 비범위

- Calendar engine 교체
- Google/Apple Calendar OAuth
- 새로운 timeline view
- recurrence data model 변경

### 데이터 영향

- 기존 stable ID, date override, occurrence identity 유지
- composition과 transient interaction state만 변경
- batch undo record 형식 유지

### Dependency와 병렬성

- P31-01 필수
- P31-03과 병렬 가능

### 완료 기준

- Calendar 첫 화면의 primary action은 selected-day item 실행
- mobile item을 열어도 다음 agenda row가 인라인 상세 때문에 밀리지 않음
- item sheet 닫기 후 선택 날짜, agenda scroll, trigger focus 유지
- Flow filter와 날짜 배치는 동시에 열린 기본 panel이 아님
- undated 2개 batch 배치·undo·날짜 제거·tray 복귀 유지
- 같은 날짜 5개 Flow의 title/source identity 유지
- sheet/dialog Escape와 trigger focus return
- 390/1024에서 overflow와 fixed overlap 0

### Evidence marker

- E2E: `P31-CALENDAR-VIEW-PLACEMENT-MODES`
- E2E: `P31-04-ITEM-SHEET`
- Screenshot: `P31-04-calendar-default-390.png`
- Screenshot: `P31-04-calendar-item-sheet-390.png`
- Screenshot: `P31-04-undated-placement-mode-390.png`
- Screenshot: `P31-04-calendar-wide-1024.png`

## P31-05 Export, advanced actions, accessibility and complexity final gate

### 사용자 문제

각 기능은 개별적으로 지원되지만 export, 회고, correction, reuse, 관리가 기본 실행 surface에 누적되면 사용자에게 planner처럼 느껴진다. 기능 회귀 없이 기본 노출을 줄였는지 통합 검증이 필요하다.

### 범위

- export를 현재 문맥의 `가져가기` action으로 통합
- whole/selected/current scope와 실제 count를 format보다 먼저 표시
- 회고, source correction, reuse, archive가 실행 중 기본 control과 경쟁하지 않도록 disclosure 정리
- permanent delete storage contract와 confirmation danger zone 검증
- keyboard focus, accessible name, focus return, status feedback
- 24-cell targeted rerun과 complexity metric 재측정

### 비범위

- 외부 tool duplicate import tracking
- cross-device sync
- creator marketplace
- 실제 사용자 관찰을 자동화로 대체

### 데이터 영향과 rollback

- export identity와 receipt 계약 유지
- disclosure state는 transient UI state를 우선
- 기존 export builder와 run/correction persistence를 변경하지 않음
- 영구 삭제는 `clearFlowLocalProgress` 호출만 연결하지 않고 archive lifecycle와 Flow별 personal state 제거 범위를 계약으로 고정

### Dependency

- P31-01~04 완료 후 final integration slice

### 완료 기준

- 설명 없이 수행 가능한 cell 20/24 이상
- 일반 next action 2 tap/click 이내
- 첫 viewport의 경쟁 primary action 1개 이하
- save primary keyboard 도달 8 Tab 이내 또는 동등한 navigation
- whole/selected/current title/date/count parity
- 390/1024/1440 screenshot에서 overflow, overlap, text clipping 0
- console/page error 0
- source, personal overlay, run, occurrence, export identity 회귀 0
- archive/reload/restore의 390/1024 parity
- 영구 삭제 뒤 saved membership, personal overlay, run, archive slug 잔존 0
- source-backed 공개 Flow 재발견 가능

### Evidence marker

- E2E: `P31-COMPLEXITY-FINAL-GATE`
- JSON: `p31-complexity-metrics.json`
- Screenshot set: public, receipt, My Flow, Calendar, export at 390/1024/1440
- Accessibility trace: `p31-keyboard-focus-results.json`
- E2E: `P31-05-PERMANENT-DELETE-CONTRACT`
- Screenshot: `P31-05-permanent-delete-confirmation-390.png`

## 실행 순서

1. P31-01을 단독으로 구현해 correctness gate를 닫는다.
2. P31-02와 P31-03의 current/proposed 390/1024 composition을 먼저 승인한다.
3. P31-02, P31-03, P31-04는 data contract를 공유하되 component 단위로 병렬 구현할 수 있다.
4. P31-05에서 24-cell 중 핵심 journey를 다시 실행하고 complexity metric을 비교한다.
5. `npm.cmd run security:audit` 문제는 UX slice와 분리된 release engineering gate로 닫는다.

## 실제 사용자에게만 확인할 것

- 24개 item 중 제외할 항목을 찾는 비용이 허용 가능한가
- artifact preview 후 바로 저장하는 사용자와 먼저 조정하는 사용자의 비율
- `현재 실행 조정`과 `새 실행으로 다시 쓰기`의 용어 이해
- 날짜 없는 할 일을 My Flow에서 실행하고 Calendar에서 배치하는 문법의 자연스러움
- 고급 기능을 접었을 때 기능이 사라졌다고 느끼는지
- 실제 20~60개 Flow에서 검색과 scope가 충분한지

이 질문은 자동화나 agent simulation으로 답하지 않는다.
