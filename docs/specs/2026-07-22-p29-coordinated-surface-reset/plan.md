# FlowMe P29 Coordinated Surface Reset 실행 계획

- 작성일: 2026-07-22
- 상태: `implementation_plan_ready`
- 계획 기준: `origin/main` `b642e8e`
- 현재 production: <https://flowme2605.vercel.app>
- 현재 production 앱 기준: P28 merge `9a839d02`, release 기록 `ec97ff5`
- 선택한 방향: `B. coordinated_surface_reset`
- 실제 관찰 사용자: `0`
- 다음 실행 slice: `P29-01A -> P29-01B`
- 이번 문서 작성에서 앱 코드 변경: 없음

## 1. 문서 목적

P28은 whole Flow, 실제 결과 projection, 반복 일정, My Flow, Calendar, export의 데이터 계약을 연결했다. 그러나 사용자와 두 독립 검토가 공통으로 지적한 문제는 **기능 부재보다 화면 조립과 행동 위계**다.

이 문서는 아래 두 입력을 그대로 이어 붙이지 않고 하나의 구현 프로그램으로 재구성한다.

1. Claude Design의 `FlowMe UX 재검토 P28 production (P29-00 Visual·Interaction Reset 결정).dc.html`
   - 배포 위치: [FlowMe UXUI 전체 검토 (12).zip](https://github.com/knhbae/flowme2605/blob/main/claude_work/FlowMe%20UXUI%20%EC%A0%84%EC%B2%B4%20%EA%B2%80%ED%86%A0%20(12).zip)
   - 판정: `B. coordinated surface reset`, 확신도 `4/5`
   - findings: Blocking `0`, High `4`, Medium `6`, Low `2`
2. Codex의 P29-01~P29-08 제안
   - moving Flow vertical slice에서 시작해 public rollout, routine, My Flow, Calendar, result/export, 공통 visual/a11y, final review 순으로 확장

계획의 핵심은 다음 한 문장이다.

> P28의 projection과 identity 계약은 유지하고, 사용자가 실제로 보는 save-before, receipt, My Flow, Calendar, result/export의 composition과 command hierarchy를 단계적으로 다시 조립한다.

## 2. 근거와 evidence 경계

### 2.1 현재 근거

- [P29 독립 검토 handoff](../../content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/README.md)
- [P29 전략·기획 맥락](../../content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/strategy-context.md)
- [P29 current gap audit](../../content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/current-gap-audit.md)
- [P29 decision matrix](../../content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/p29-decision-matrix.json)
- [P28 final package](../../content-audit/2026-07-22-p28-final-review-package/README.md)
- [P28 experience reconstruction](../2026-07-21-p28-experience-reconstruction/README.md)
- [P28 reference patterns](../2026-07-21-p28-experience-reconstruction/reference-patterns.md)

### 2.2 evidence 종류

각 구현 판단과 closeout은 아래를 구분한다.

- `current_production_interaction`: 현재 production 직접 조작
- `current_package_screenshot`: 현재 package의 screenshot
- `current_source`: 현재 main 코드와 테스트
- `current_command`: 이번 slice에서 직접 실행한 명령
- `prior_design_artifact`: 이전 mockup 또는 제안
- `reference_pattern`: 인접 서비스의 검증 가능한 interaction pattern
- `heuristic_simulation`: agent 또는 reviewer의 시뮬레이션
- `observed_user`: 실제 사용자가 수행한 관찰 세션
- `inaccessible`: 확인하지 못한 자료

자동화, screenshot 검토, agent simulation은 `observed_user`가 아니다. P29 구현 중 observed-user count는 계속 `0`으로 기록한다.

## 3. 두 제안의 종합 판정

### 3.1 공통으로 확인한 문제

| 영역 | 공통 finding | 통합 방향 |
| --- | --- | --- |
| save-before | whole outline과 실제 artifact가 같은 항목을 반복한다 | 실제 artifact를 primary canvas로 두고 outline은 한 번만 disclosure로 제공 |
| 저장 결정 | mode, anchor, 조정, 저장 CTA가 여러 곳에서 경쟁한다 | frame당 primary 1개, contextual `조정`, 단일 decision surface |
| post-save | 저장 전 form과 저장 결과가 같은 frame에 남는다 | 별도 `SavedReceiptFrame`으로 상태 전환 |
| routine | 요일·시간·duration·종료가 동시에 펼쳐진다 | effective 설정 요약 1줄 + 다음 occurrence 3개 + progressive disclosure |
| My Flow | metadata와 명령이 다음 행동보다 먼저 읽힌다 | library는 compact, detail은 다음 행동 -> 전체 계획 -> secondary command |
| Calendar | 많은 Flow scope와 날짜 없는 항목 배치가 분산된다 | compact scope summary, grouped picker, selected-day 맥락, undated sheet |
| 결과 형태 | 실제 5개 shape는 있으나 추천 이유와 전환 손실이 약하다 | primary 1 + secondary 최대 2, reason/count/loss preflight, 같은 receipt vocabulary |
| 공통 시각 | card, border, chip이 비슷한 무게로 쌓인다 | 기존 token을 사용하되 surface anatomy와 density를 통일 |
| 접근성 | mobile fixed command의 DOM 순서와 반복 tab stop 위험 | DOM order, focus return, accessible name, one-command grammar를 공통 gate로 고정 |

### 3.2 차이와 해결

Claude Design은 먼저 `AppClient.tsx`의 약 1MB 조립 구조에서 save-before frame을 분리해야 이후 변경의 blast radius를 줄일 수 있다고 판단했다. Codex 제안은 `/f/moving-d30-basic`에서 artifact-first vertical slice를 먼저 증명해야 전체 rollout을 시작할 수 있다고 판단했다.

둘 중 하나를 버리지 않고 P29-01을 두 단계로 묶는다.

| 원래 제안 | 통합 번호 | 결정 |
| --- | --- | --- |
| Claude P29-01 shared grammar + AppClient 분할 | P29-01A | 시각 변화 없는 안전한 component extraction과 contract snapshot |
| Codex P29-01 moving vertical slice | P29-01B | 분리된 frame에만 artifact-first와 distinct receipt를 route opt-in으로 적용 |
| Claude P29-02 save-before reset | P29-01B + P29-02 | moving proof는 01B, 전체 public/source-backed rollout은 02 |
| Claude P29-05 routine | P29-03 | Codex 번호 체계에 맞춰 이동 |
| Claude P29-03 My Flow | P29-04 | Codex 번호 체계에 맞춰 이동 |
| Claude P29-04 Calendar | P29-05 | Codex 번호 체계에 맞춰 이동 |
| 양측 result/export proposal | P29-06 | recommendation, scope, loss, receipt를 한 slice로 통합 |
| 양측 visual/a11y gate | P29-07 | 모든 주요 composition 뒤에 공통 마감 |
| 양측 closeout | P29-08 | 독립 재검토, production smoke, known gap 정리 |

P29-01A만 끝내고 P29-02로 넘어가서는 안 된다. 사용자 체감 변화가 있는 P29-01B evidence까지 통과해야 rollout이 열린다.

## 4. 제품 전략과 불변 계약

### 4.1 North Star

FlowMe는 무거운 planner가 아니라 **portable execution layer**다.

```text
원문·URL·메모
-> 출처와 범위를 보존한 Flow
-> 필요한 값만 최소 개인화
-> 실제 결과를 저장 전에 확인
-> My Flow 또는 Calendar에서 실행
-> Calendar, Todo, Sheet, Memo 등 기존 도구로 휴대
-> 완료·수정·복구·재사용
```

### 4.2 P29가 지켜야 할 UX 원칙

1. 사용자-facing primary object는 하나의 `Flow`다.
2. 한 original source는 한 user job과 한 natural primary artifact를 우선한다.
3. save-before, first-save receipt, returning execution은 목적이 다른 frame이다.
4. 콘텐츠별 primary artifact는 하나이며 secondary는 실제 가치가 있는 것만 최대 2개다.
5. 다섯 shape를 production에서 고정 5탭으로 동시에 강제하지 않는다.
6. 날짜 없는 할 일은 유효한 실행 항목이다. My Flow에서 실행하고 Calendar에서는 필요할 때 배치한다.
7. executable item 또는 occurrence의 완료 control은 하나이며 reopen 가능하다.
8. 여러 항목 조정의 selection checkbox와 completion checkbox를 동시에 노출하지 않는다.
9. export는 format보다 scope를 먼저 정하고 effective count와 손실을 보여준다.
10. 긴 설명문은 위계 문제를 덮는 수단으로 사용하지 않는다.
11. 실제 데이터가 없는 검증 인원, 인기, review count, AI 생성 결과를 만들지 않는다.
12. resource, source link, warning, subcheck를 executable completion row로 평탄화하지 않는다.

### 4.3 데이터와 identity 불변

| 책임 | 유지할 정본 |
| --- | --- |
| source / published | 원문 제목, item, source URL, published schedule |
| personal overlay | alias, anchor, item date/memo, include/exclude, personal order |
| routine series | frequency, weekday, time, duration, end policy |
| execution run | done, reopened, skipped, held, execution note |
| occurrence | series와 분리된 회차 identity와 실행 상태 |
| projection/export | destination eligibility, effective count, stable receipt |

P29에서는 persistence schema와 migration을 변경하지 않는다. UI가 count, item identity, occurrence identity, artifact eligibility를 새로 계산하지 않고 기존 projection을 소비한다.

### 4.4 명시적 비범위

- 계정, DB, cloud sync
- 실제 AI API와 crawler
- Calendar/Todo/Notion OAuth
- Studio의 5번째 핵심 탭 승격
- creator marketplace, 결제, 근거 없는 social proof
- rich-text document editor
- 운동 분석·코칭 tracker
- planner 수준의 nested hierarchy
- 4탭 IA 변경
- public `/f` shell 폐기
- source/personal/run/occurrence/export identity migration

## 5. 목표 사용자 여정과 공통 화면 문법

### 5.1 이어져야 하는 네 frame

```text
Save-before
  실제 저장 결과 확인 + 최소 조정 + 저장 결정
    -> Saved receipt
       저장된 범위와 다음 경로 확인
         -> My Flow
            다음 행동 + 전체 계획 + contextual command
              -> Calendar / portable result
                 날짜 실행 또는 외부 도구로 이동
```

같은 Flow의 제목, source trust, effective count, item title, schedule, state vocabulary를 네 frame에서 재사용한다. 같은 데이터를 중복 카드로 반복하는 것은 continuity가 아니다.

### 5.2 공통 anatomy

| anatomy | 역할 | 금지 |
| --- | --- | --- |
| Flow header | 제목, source trust, 핵심 count | 일반 metadata chip 무더기 |
| Result canvas | 현재 primary artifact의 실제 row/event | outline과 같은 row의 중복 렌더링 |
| Context inspector | 필요한 개인화와 scope | 모든 advanced field 기본 노출 |
| Task/occurrence row | 제목, 일정, 상태, 하나의 실행 control | completion과 selection 동시 노출 |
| Disclosure | 전체 Flow, source detail, advanced schedule | page 전체를 접힌 card 중첩으로 만들기 |
| Command surface | frame의 primary 1개와 필요한 secondary | sticky와 본문에 같은 CTA 반복 |
| Receipt | 실제 결과, count, source/personal identity, 다음 행동 | 저장 전 input/control 잔존 |

기존 `components/flow/flow-ui.ts` primitive를 우선 재사용한다. 새 design system을 만드는 것이 아니라 기존 primitive를 일관된 anatomy로 조립한다.

## 6. 실행 순서와 재계획 게이트

```text
P29-00 설계 판정 완료
  -> P29-01A frame 분리와 공통 anatomy
  -> P29-01B moving vertical proof
  -> Gate G1
  -> P29-02 public/source-backed rollout
  -> P29-03 routine summary-first
  -> P29-04 My Flow action-first
  -> P29-05 Calendar scope/placement
  -> Gate G2
  -> P29-06 result recommendation/export/receipt
  -> P29-07 visual/responsive/a11y integration
  -> Gate G3
  -> P29-08 independent review/deploy/closeout
```

P29-03과 P29-04는 P29-02의 공통 row/command grammar가 고정된 뒤 병렬 설계할 수 있다. P29-05는 P29-04에서 확정한 command grammar를 사용한다. P29-06은 save-before, My Flow, Calendar가 같은 scope vocabulary를 사용한 뒤 연결한다.

### Gate G1: vertical proof 승인

P29-02를 시작하기 전에 모두 충족한다.

- `/f/moving-d30-basic`만 route-level opt-in 상태다.
- save-before item list가 구조상 한 번만 나타난다.
- 저장 후 save-before control이 사라지고 distinct receipt가 나타난다.
- source/personal/run/export contract snapshot 변화가 없다.
- 390/1024/1440 current/proposed screenshot을 비교한다.
- mobile DOM/focus order가 content order와 같다.
- owner 또는 독립 reviewer가 `keep/revise/redesign`을 기록한다.

`revise`이면 P29-01 안에서 수정한다. `redesign`이면 shared frame의 가정을 다시 열고 P29-02 rollout을 중단한다.

### Gate G2: cross-content/cross-surface 시뮬레이션

P29-02~05 뒤 아래 조합을 current browser에서 재현한다.

- 24-item moving timeline
- undated vehicle checklist
- workout/cleaning routine
- 27-Flow My Flow library
- 12-Flow Calendar scope와 날짜 없는 항목
- same-date multi-Flow agenda

두 개 이상의 content shape에서 공통 anatomy가 source 의미를 잃거나 control 수를 늘리면 P29-06 전에 composition을 재계획한다.

### Gate G3: production closeout 준비

- frame당 primary 1개 이하
- horizontal overflow, fixed overlap, unnamed focusable `0`
- P28 stable contract regression `0`
- five-shape actual row/event count parity
- observed-user count `0`을 명시

## 7. 상세 backlog

## P29-01A - Shared anatomy and safe frame extraction

### 문제

`components/flow/AppClient.tsx`가 약 1MB이며 save-before, My Flow, Calendar 등 여러 surface 조립을 함께 가진다. 이 상태에서 visual reset을 바로 적용하면 작은 UI 변경도 넓은 회귀 위험을 만든다.

### 사용자 결과

이 단계 자체는 사용자 화면을 바꾸지 않는다. 다음 단계가 작은 factored frame 안에서 안전하게 진행될 수 있게 한다.

### 구현 범위

- `flow-ui.ts`의 surface, inset, toolbar, action, segmented, selection row, execution row, disclosure primitive를 inventory한다.
- 공통 anatomy의 props와 상태 책임을 문서화한다.
- save-before 조립을 `AppClient.tsx`에서 작은 surface component로 추출한다.
- saved receipt를 별도 component boundary로 둘 준비를 한다.
- 기존 `data-testid`, projection key, save payload를 보존한다.
- extraction 전후 DOM/contract snapshot을 만든다.

후보 component:

- `FlowSaveBeforeSurface`
- `FlowResultCanvas`
- `FlowContextInspector`
- `FlowCommandSurface`
- `SavedReceiptFrame`

이 이름은 구현 중 기존 component와 중복되면 조정할 수 있다. 새 abstraction은 실제 중복과 blast radius를 줄일 때만 만든다.

### 영향 후보

- `components/flow/AppClient.tsx`
- `components/flow/FlowSaveBeforeFrame.tsx`
- `components/flow/FlowArtifactDataPreview.tsx`
- `components/flow/FlowExecutionPrimitives.tsx`
- `components/flow/flow-ui.ts`
- 관련 unit/E2E

### 비범위

- hierarchy 변경
- copy 변경
- 다른 route rollout
- projection, storage, migration 변경

### 완료 기준

- 사용자 화면 visual diff가 의도상 `0`이다.
- save-before composition의 주요 로직이 `AppClient.tsx` 밖의 명확한 boundary로 이동한다.
- `projectionContractUnchanged: true`
- `sourceMutationCount: 0`
- 기존 P28 targeted E2E가 통과한다.
- route-level opt-in 또는 frame version prop로 rollback 가능하다.

## P29-01B - Moving artifact-first vertical proof and distinct receipt

### 문제

moving save-before는 24개 outline과 Calendar preview가 같은 내용을 반복하고, row별 수정과 여러 CTA가 실제 저장 결과보다 먼저 읽힌다. 저장 후에도 저장 전 form이 남아 receipt가 분리되지 않는다.

### 사용자 결과

사용자는 첫 viewport에서 아래를 이해한다.

1. 어떤 Flow인지
2. 출처가 무엇인지
3. Calendar에 몇 개 일정이 생기는지
4. 필요한 값이 이사일인지
5. 그대로 저장할지 조정할지
6. 저장 후 무엇이 저장됐고 어디로 갈지

### 적용 범위

- `/f/moving-d30-basic` route opt-in만 적용
- header 다음에 실제 Calendar artifact preview
- 전체 Flow outline은 한 번만 disclosure
- 기본 mode에서 row-level 수정 command `0`
- `조정` mode에서만 selection/contextual command 제공
- frame당 visible primary action `1` 이하
- 저장 성공 후 별도 `SavedReceiptFrame`
- receipt에 개인 저장 이름, 포함 항목 수, 날짜 범위, source, 다음 행동 표시
- mobile DOM order를 header -> result -> disclosure -> adjust -> save -> persistent nav 순으로 정리

### 저장 전 조정 원칙

- 전체 Flow를 full editor로 바꾸지 않는다.
- anchor는 결과 생성에 필수일 때만 inline으로 요구한다.
- 제목, 날짜, 포함 항목 같은 조정은 contextual mode에서 처리한다.
- selection checkbox를 보일 때 completion checkbox는 보이지 않는다.
- 변경 전후 item/event count를 보여준다.

### 390 acceptance

- 첫 viewport에 title, source, `24개` 범위, Calendar 실제 결과, primary CTA가 보인다.
- adjust 전 row-level `수정`은 `0`개다.
- save-before item list는 구조상 `1`개다.
- 저장 후 save-before input/control은 `0`개다.
- receipt heading은 `1`개, primary next action은 `1`개다.
- focus order가 visual reading order와 일치한다.
- fixed CTA가 bottom nav 또는 content를 가리지 않는다.

### 1024/1440 acceptance

- artifact canvas와 context inspector가 최대 2-column이다.
- 좌측은 실제 결과, 우측은 decision/context로 역할이 분리된다.
- outline은 하단 disclosure에 한 번만 있다.
- nested card stack과 중복 save command가 없다.

### 필수 marker

- `P29-SAVE-BEFORE-PRIMARY-RESULT`
- `P29-SAVED-RECEIPT-DISTINCT`
- `P29-MOBILE-FOCUS-ORDER`
- `saveBeforeItemListCount == 1`
- `saveDecisionSurfaceCount == 1`
- `saveBeforeRowEditControlCountBeforeAdjust == 0`
- `savedReceiptPrimaryActionCount == 1`
- `projectionContractUnchanged == true`

### 필수 screenshot

- `p29-01-moving-save-before-390.png`
- `p29-01-moving-adjust-390.png`
- `p29-01-moving-receipt-390.png`
- `p29-01-moving-save-before-1024.png`
- `p29-01-moving-receipt-1024.png`
- `p29-01-moving-save-before-1440.png`

### rollback

- route-level opt-in 또는 frame version prop만 제거하면 P28 composition으로 돌아간다.
- projection, persistence, seed에 rollback migration이 없어야 한다.

## P29-02 - Public/source-backed save-before rollout

### 목적

P29-01B에서 승인된 artifact-first, one-outline, contextual-adjust, distinct-receipt 문법을 public/source-backed Flow 전체에 확장한다.

### 대표 five-shape matrix

| shape | 대표 route | primary 확인 |
| --- | --- | --- |
| Flow execution | `/f/curated-allblanc-morning-workout` | series/occurrence 실행 결과 |
| Calendar | `/f/moving-d30-basic` | 실제 event rows |
| Checklist | `/f/used-car-buying-check` | 날짜가 없어도 유지되는 check rows |
| Sheet | `/f/source-backed-middle-school-math-1` | 실제 row/column 데이터 |
| Memo | `/f/overseas-safety-register` | source와 안전 맥락을 보존한 memo |

이 matrix는 **다섯 형태가 실제로 지원되는지 검증**하기 위한 것이다. 한 Flow 화면에 고정 5탭을 모두 노출하라는 뜻이 아니다.

### 구현 범위

- `FlowSaveBeforeFrame`과 source-backed save-before의 outline/result 중복 제거
- content-native primary 1개와 eligible secondary 최대 2개
- unsupported/disabled artifact tab 제거
- row edit는 contextual adjust mode에서만 노출
- legacy `ArtifactWorkbench`가 동일 결과를 다시 렌더링하지 않게 조정
- 저장 후 모든 대표 route가 distinct receipt로 전환
- source URL, source trace, item count, eligibility를 P28 projection에서 그대로 사용

### 완료 기준

- five-shape route에서 item list/outline은 화면 구조상 한 번만 나타난다.
- 첫 viewport primary action은 `1`개 이하다.
- save-before count와 receipt count가 일치한다.
- shape별 source, date, memo, row/event eligibility가 P28과 같다.
- 390/1024/1440 screenshot matrix와 targeted E2E가 통과한다.

### rollout 중단 조건

- 두 개 이상의 shape에서 대표 5 + disclosure가 source 범위를 오해하게 만든다.
- contextual adjust가 기존 personal overlay를 표현하지 못한다.
- P28 count 또는 export parity가 달라진다.

이 경우 route별 예외를 누적하지 말고 shared frame을 재계획한다.

## P29-03 - Routine summary-first progressive disclosure

### 문제

routine 하나를 저장하기 전에 weekday, time, duration, end mode, count가 동시에 펼쳐지고, 운동 route만 별도 제품처럼 보인다.

### 사용자 결과

기본 상태에서 `월·수·금 · 07:30 · 45분 · 8회` 같은 effective summary와 다음 occurrence 3개를 먼저 보고, 필요할 때만 설정을 연다.

### 구현 범위

- existing routine projection에서 summary derive
- 다음 3 occurrence preview
- `반복 설정 바꾸기` disclosure/sheet
- 선택한 frequency, weekday, time, duration, end mode에 필요한 field만 노출
- resource와 executable item 분리
- series와 `이번 회차` label 분리
- My Flow와 Calendar에서도 같은 schedule/occurrence vocabulary 사용

### 비범위

- recurrence engine 변경
- 4주를 데이터상 강제하는 새 정책
- 운동 analytics, 강도 코칭, 건강 advice
- source content 또는 migration 변경

### 완료 기준

- initial advanced input `0`
- 기본 routine summary control `1`
- summary가 effective schedule을 손실 없이 표현한다.
- 한 occurrence 완료/reopen이 series definition을 mutate하지 않는다.
- original resource link는 보이되 completion control을 갖지 않는다.
- 390/1024/1440 screenshot, mode matrix unit, occurrence E2E가 통과한다.

## P29-04 - My Flow action-first library/detail workspace

### 문제

저장한 Flow가 많아지면 검색과 상태 label이 실제 다음 행동보다 앞서고, detail의 조정·가져가기·원문·보관 명령이 동급으로 경쟁한다.

### 사용자 결과

- library에서 제목, 다음 일정, 진행, source trust만 빠르게 스캔한다.
- Flow를 열면 다음 행동을 먼저 실행한다.
- 전체 계획, 조정, 가져가기, 보관/복구는 맥락에 따라 찾는다.
- 완료한 항목을 같은 맥락에서 다시 연다.

### 구현 범위

- 390 compact Flow rows와 row 전체의 명시적 accessible open action
- next action metadata 우선
- 같은 날짜의 항목은 detail 내부에서 date group으로 정리
- export, archive, restore는 detail 또는 overflow
- mobile detail: next action -> whole plan -> contextual commands
- wide: 약 280px library rail -> flexible plan canvas -> 약 320px inspector
- completion/reopen의 위치와 vocabulary 통일
- 기존 archive/undo/restore 능력은 노출 위계만 정리하고 permanent delete를 새로 만들지 않음

### 비범위

- 새 tab/IA
- server search/account/cloud sync
- persistence migration
- planner 기능 추가

### 완료 기준

- 390에서 안정적인 compact density로 최소 8개 row를 한 viewport에서 스캔할 수 있다.
- row당 visible command는 최대 1개다.
- 27-Flow fixture에서 검색 -> 열기 -> item -> 완료 -> reopen -> export 여정이 통과한다.
- detail의 visible primary action은 `1`개다.
- bottom nav는 main content 뒤에 focus된다.
- wide에서 rail/canvas/inspector 역할이 명확하고 nested card가 없다.

## P29-05 - Calendar scope, selected day, undated placement

### 문제

Flow를 많이 저장하면 scope picker가 길어지고, selected-day agenda와 날짜 없는 항목 배치가 서로 다른 목적처럼 흩어진다.

### 사용자 결과

- 닫힌 상태에서는 현재 선택 범위만 짧게 본다.
- 많은 Flow에서 검색해 특정 Flow만 빠르게 고른다.
- 날짜를 선택한 맥락에서 날짜 없는 항목을 그 날에 배치한다.
- batch 이동을 preview하고 되돌린다.

### 구현 범위

- compact scope summary 1개
- selected, recent, active grouping과 전체 목록 dialog
- `0개` Flow는 기본 접힘
- selected-day agenda/inspector
- 390 undated bottom sheet, internal scroll, focus trap/return
- 선택일에서 `[여기 배치]`
- batch date placement, preview, undo
- 1024/1440 rail -> Calendar grid -> day inspector
- grid의 compact marker와 full accessible title 유지

### 비범위

- Calendar engine 교체
- OAuth/direct sync
- recurrence semantics 변경
- 새 date move data contract

### 완료 기준

- 12-Flow fixture에서 검색 후 2개 선택까지 5 interactions 이내다.
- 닫힌 scope command는 `1`개다.
- undated sheet를 열어도 page scroll과 Calendar 위치가 변하지 않는다.
- batch move/undo count가 projection과 일치한다.
- same-date multi-Flow agenda에서 identity와 completion control이 유지된다.
- horizontal overflow, focus trap/return 오류가 `0`이다.

## P29-06 - Artifact recommendation, export scope, and receipt continuity

### 문제

실제 five-shape renderer는 연결됐지만, 사용자가 왜 특정 결과가 기본인지, 바꾸면 무엇이 빠지는지, 전체/선택/현재 중 무엇을 가져가는지 예측하기 어렵다.

### 사용자 결과

저장 또는 export 전에 아래를 본다.

- 기본 결과와 추천 이유
- 항목/event/row 수
- 날짜, memo, source 보존 여부
- 다른 결과로 바꿀 때 생기는 손실
- 전체 Flow, 선택 항목, 현재 항목 중 scope
- 완료 후 실제 생성 결과와 다음 행동

### 구현 범위

- 기존 projection에서 파생하는 `ArtifactRecommendationVM` 또는 동등 adapter
- primary reason, scope, row/event count
- secondary delta와 loss summary
- primary 1 + secondary 최대 2
- whole/selected/current를 action label에 포함
- save receipt와 export receipt의 count/source/personal vocabulary 통일
- five-shape reason/loss fixture와 screenshot evidence

### 비범위

- 새 export format
- OAuth
- recommendation AI
- persistence migration

### 완료 기준

- unsupported/disabled shape가 production UI에서 `0`이다.
- preview count와 실제 export row/event count가 일치한다.
- shape 전환 손실이 `aria-live=polite`로 안내된다.
- whole/selected/current E2E와 receipt screenshot이 통과한다.
- source-backed/personal copy identity가 receipt에 맞게 유지된다.

## P29-07 - Shared visual system, responsive contract, and accessibility

### 목적

P29-01~06의 composition을 하나의 제품처럼 보이게 마감하되, 색과 card polish만으로 구조 문제를 다시 덮지 않는다.

### 구현 범위

- typography, density, divider, radius, semantic state token
- card stack과 nested card 제거
- Flow header, result canvas, inspector, task row, command surface의 공통 anatomy
- 설명문을 줄이고 label, preview, direct manipulation으로 대체
- DOM focus order, focus-visible, disclosure/tablist semantics
- sheet/dialog focus trap과 return
- 390/1024/1440 responsive constraints
- fixed UI overlap와 safe area
- truncated visual title에도 full accessible name 제공

### 참고 pattern

- Todoist/Google Calendar: 빠른 주 행동과 scope 분리
- Fantastical/Sunsama: summary에서 advanced setting으로 점진 전개
- Things/Fitbod: 다음 행동 중심 실행
- TripIt/Notion: 전체 container와 개별 item edit 범위 분리

가져오지 않는 것: 무한 nested planner, 전문 운동 분석, 자체 Calendar 전권, marketplace.

### 완료 기준

- horizontal overflow `0`
- fixed overlap `0`
- unnamed focusable `0`
- visible label과 accessible name 목적 불일치 `0`
- contrast gate 통과
- same Flow identity anatomy가 reviewed surface에서 일치
- 390/1024/1440 visual regression과 keyboard journey 통과

## P29-08 - Production integration and independent final review

### 구현/검증 범위

- docs check, unit, production build
- targeted P29 E2E와 risk에 따른 full E2E
- deploy 후 canonical production smoke
- P29-00과 동등한 route/state recapture
- current/proposed screenshot package
- P28 stable marker와 P29 marker reconciliation
- known gap, rollback, publish state, actual SHA 기록
- 독립 reviewer의 keep/revise/redesign 판정

### 완료 기준

- P28 contract regression `0`
- P29 필수 marker 전체 pass
- 390/1024/1440 overflow/error/focus gate pass
- screenshot manifest와 production SHA 기록
- observed-user count `0` 명시
- legacy frame 제거 여부는 production evidence 뒤에 별도 결정
- P30 후보는 unresolved evidence만 이월

## 8. 공통 QA matrix

### 8.1 대표 route와 fixture

| 목적 | route/fixture | viewport |
| --- | --- | --- |
| moving save-before/receipt | `/f/moving-d30-basic` | 390, 1024, 1440 |
| routine | `/f/curated-allblanc-morning-workout` | 390, 1024, 1440 |
| checklist | `/f/used-car-buying-check` | 390, 1024 |
| sheet | `/f/source-backed-middle-school-math-1` | 390, 1024 |
| memo | `/f/overseas-safety-register` | 390, 1024 |
| My Flow scale | `/my?demo=ux20&view=flows` | 390, 1024, 1440 |
| Calendar scale | `/calendar?demo=ux12` | 390, 1024, 1440 |

### 8.2 각 slice의 공통 확인

- visual reading order와 DOM/focus order 일치
- keyboard only로 primary path 수행
- accessible name에 Flow/item/occurrence와 행동 맥락 포함
- content와 fixed UI overlap `0`
- page와 internal sheet overflow 분리 확인
- console error와 page error `0`
- 새로고침 후 projection/persistence 유지
- source mutation `0`
- completion/reopen이 structural membership을 바꾸지 않음
- Calendar/My Flow/export가 같은 stable item/occurrence를 읽음
- 자동 QA를 실제 사용자 검증으로 표현하지 않음

### 8.3 명령

각 slice 위험에 맞춰 실행한다.

```text
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
targeted Playwright E2E
full Playwright E2E when shared composition or projection consumer changes
git diff --check
```

## 9. 개발·배포 운영 규칙

1. 각 P29 slice는 clean `origin/main` 기준의 별도 branch에서 시작한다.
2. 기존 dirty worktree와 사용자 변경을 revert/delete/stage하지 않는다.
3. 한 slice에서 다음 slice 기능을 함께 구현하지 않는다.
4. route-level opt-in 또는 frame version으로 rollback 경계를 유지한다.
5. migration이 필요해 보이면 구현을 중단하고 별도 contract gate를 연다.
6. screenshot과 route evidence를 해당 slice package에 저장한다.
7. commit, PR, merge, deploy 상태를 분리해서 기록한다.
8. production deploy 뒤 smoke가 실패하면 legacy frame 삭제를 진행하지 않는다.
9. 실제 사용자 관찰은 P29-08 closeout 뒤 owner가 별도로 승인할 때만 연다.

## 10. 상태판

| Slice | 상태 | 시작 조건 | 종료 조건 |
| --- | --- | --- | --- |
| P29-00 | 완료 | P28 owner/independent review | coordinated reset 선택, evidence/rollback 확보 |
| P29-01A | 다음 | P29 plan 승인 | frame extraction, visual/contract regression 0 |
| P29-01B | 대기 | 01A green | moving vertical proof, Gate G1 승인 |
| P29-02 | gated | G1 승인 | five-shape save-before/receipt rollout green |
| P29-03 | gated | P29-02 공통 grammar | routine summary/occurrence gate green |
| P29-04 | gated | P29-02 공통 grammar | 27-Flow action-first journey green |
| P29-05 | gated | P29-04 command grammar | 12-Flow Calendar scope/placement green |
| P29-06 | gated | P29-02, 04, 05 | result/export count/loss/receipt parity green |
| P29-07 | gated | P29-02~06 | visual/responsive/a11y gate green |
| P29-08 | gated | P29-07 | independent review, deploy, closeout |

## 11. P29 전체 완료 정의

P29는 화면이 단순히 더 예뻐졌을 때가 아니라 아래가 모두 참일 때 완료다.

1. 사용자는 첫 viewport에서 저장될 실제 결과와 primary action을 예측한다.
2. save-before에서 같은 item list가 중복되지 않는다.
3. 조정은 필요한 맥락에서만 열리고 advanced setting은 기본적으로 접혀 있다.
4. 저장 후 receipt는 저장 전 form과 분리된다.
5. My Flow는 다음 행동을 먼저, Calendar는 날짜/scope/배치를 먼저 보여준다.
6. 다섯 실제 shape가 콘텐츠별로 검증되지만 고정 5탭으로 강제되지 않는다.
7. export scope, count, loss, receipt가 실제 output과 일치한다.
8. 같은 Flow/item/occurrence identity가 My Flow, Calendar, export에서 이어진다.
9. source, personal overlay, run, occurrence, export 계약과 4탭 IA가 유지된다.
10. 390/1024/1440에서 overflow, overlap, unnamed focusable이 없다.
11. independent automated/browser review에서 Blocking/High가 없다.
12. observed-user validation을 주장하지 않는다.

## 12. 즉시 실행할 다음 목표

다음 작업은 P29 전체를 한 번에 구현하는 것이 아니라 **P29-01A와 P29-01B를 하나의 vertical program으로 순서대로 닫는 것**이다.

1. `AppClient.tsx`에서 save-before surface를 동작 변화 없이 분리한다.
2. contract와 visual regression이 green인지 확인한다.
3. `/f/moving-d30-basic`에만 artifact-first + distinct receipt를 opt-in한다.
4. 390/1024/1440 screenshot과 marker를 만든다.
5. Gate G1 판정을 기록한다.
6. 승인 전에는 P29-02 전체 rollout을 시작하지 않는다.

이 순서가 Claude Design의 blast-radius 경고와 Codex의 사용자 체감 vertical proof를 동시에 만족하는 가장 작은 안전한 다음 단계다.
