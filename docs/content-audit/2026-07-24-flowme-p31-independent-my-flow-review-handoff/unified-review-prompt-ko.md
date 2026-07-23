# FlowMe P31 Independent My Flow Review - 공용 복붙 프롬프트

아래 전체를 Claude Design 또는 Codex 새 대화에 복사한다. 첫 줄의 `REVIEWER_ROLE`만 선택한다.

```text
REVIEWER_ROLE: claude_design
# Codex에게 줄 때는 codex_independent로 바꾼다.

FlowMe P31 production을 여러 페르소나의 연속 사용자 여정으로 독립 검토해줘.

이번 검토는 사소한 UI polish 목록을 만드는 작업이 아니다. 특히 My Flow가 저장한 Flow를 찾고, 전체 구조를 이해하고, 다음 행동을 실행하고, 수정·완료·다시 열기·export·보관·복구·재사용하는 실제 서비스 수준의 작업 공간인지 평가한다.

current evidence가 필요성을 보여주면 My Flow 내부 구조와 화면 composition을 대폭 다시 설계해도 된다. 다만 source, personal overlay, execution run, recurrence occurrence, export identity 같은 안정된 데이터 계약과 4탭 IA를 아무 근거 없이 다시 만들지 않는다. My Flow 대안으로 해결되지 않는 교차 탭 중복이 입증될 때만 4탭 역할 재검토를 제안한다.

자동화, screenshot, heuristic simulation은 실제 사용자 검증이 아니다. observed-user count는 0으로 기록한다. 앱 코드는 수정하지 않는다.

======================================================================
1. Current baseline
======================================================================

Production:
https://flowme2605.vercel.app

GitHub:
https://github.com/knhbae/flowme2605

검토 기준 origin/main:
555da4e013cc9090b76b78cc81619057409772dc

P31 앱 구현:
0227cd2fa7a93ea9ff7d9776b76b0cc33401279b
https://github.com/knhbae/flowme2605/pull/150

P31 closeout:
97f7d31e770cbc77eaae3291eefddbca5adf202b
https://github.com/knhbae/flowme2605/pull/151

현재 상태:
https://github.com/knhbae/flowme2605/blob/main/docs/STATUS.md

현재 로드맵:
https://github.com/knhbae/flowme2605/blob/main/docs/ROADMAP.md

제품 원칙:
https://github.com/knhbae/flowme2605/blob/main/docs/PRODUCT_PRINCIPLES.md

current production 또는 main이 위 SHA보다 앞섰다면 그 차이를 먼저 기록하고 current production/current source를 우선한다.

======================================================================
2. 이번 검토 handoff package
======================================================================

Package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-24-flowme-p31-independent-my-flow-review-handoff

읽기 순서:
1. README.md
2. persona-journey-simulation-ko.md
3. my-flow-structural-review-framework.md
4. reference-benchmark.md
5. review-checklist-ko.md
6. simulation-output-contract.json
7. source-manifest.json

P31 current evidence:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-23-p31-mobile-journey-reconstruction-evidence

P31 evidence는 비교 자료다. prior 수치를 current 실행 결과처럼 쓰지 않는다.

======================================================================
3. 제품 역할
======================================================================

FlowMe는 무거운 planner가 아니라 portable execution layer다.

원문·URL·메모
-> 실행 가능한 Flow
-> 필요한 최소 개인화
-> My Flow 또는 Calendar에서 실행
-> 기존 Calendar/Todo/Sheet/Memo/Notion/Obsidian으로 휴대
-> 완료·복구·회고·재사용

유지할 원칙:
- 먼저 쓸 만한 전체 결과를 보여주고 필요한 값만 점진적으로 받는다.
- 한 사용자-facing Flow가 여러 view에서 같은 identity로 보인다.
- source와 개인 수정, 실행 상태, 반복 회차, export receipt를 분리한다.
- 설명 문단으로 정보 구조 문제를 덮지 않는다.
- 모든 Flow에 모든 artifact와 모든 편집 기능을 동시에 펼치지 않는다.
- content-specific body는 허용하지만 completion/open/edit/lifecycle 문법은 통일한다.
- 가짜 사용자 수, 리뷰 수, 검증 수를 production 제안에 넣지 않는다.
- prototype에서 social proof 위치를 실험할 때는 반드시 `가상 데이터 - production 금지`로 표시한다.

======================================================================
4. 판단 우선순위와 evidenceKind
======================================================================

판단 우선순위:
1. current production interaction
2. current production screenshot
3. current source
4. current P31 structured evidence
5. prior design artifact
6. external reference pattern

허용 evidenceKind:
- current_production_interaction
- current_production_screenshot
- current_source
- current_structured_evidence
- prior_design_artifact
- reference_pattern
- heuristic_simulation
- inaccessible

모든 finding에는 route, viewport, initial state, 재현 단계, 기대, 실제, 사용자 영향, evidenceKind를 포함한다.

======================================================================
5. 필수 production route
======================================================================

- /
- /flows
- /my
- /calendar
- /f/moving-d30-basic
- /f/vehicle-inspection-prep
- /f/curated-allblanc-morning-workout
- /f/curated-wedding-naver-timeline
- /f/real-mofa-overseas-travel-prep
- /u/my-flow-studio

필수 viewport:
- 390x844
- 1024x768
- 대표 상태 1440x900

각 route에서 hard navigation, reload, client navigation, horizontal overflow, fixed overlap, console/page error를 확인한다.

======================================================================
6. 8 personas x 3 sessions
======================================================================

persona-journey-simulation-ko.md의 24개 cell을 전부 수행한다.

P1 기준일 역산형:
- moving 발견·저장
- 기준일/개별 날짜 수정과 완료·다시 열기
- export·보관·복구·새 run

P2 날짜 없는 checklist:
- public preview·저장
- 날짜 배치·제거·undo·완료·다시 열기
- 전체/선택 export

P3 반복 routine:
- recurrence 설정·저장
- 한 occurrence 실행·완료·다시 열기
- history·다음 occurrence·Calendar/ICS

P4 artifact 선택·혼합 계획:
- primary artifact 선택
- phase/item 조정과 단계 메모
- export·source update·개인 수정 유지

P5 개인 draft:
- URL miss/memo 여러 Item 저장
- add/delete/undo/restore/reorder/date/time/recurrence
- Calendar/export/lifecycle

P6 20~60 Flow 사용자:
- 검색·filter·Flow open
- Flow 전환과 Calendar 왕복 context restore
- archive/restore/delete/re-save

P7 완료 후 돌아온 사용자:
- 이어하기
- 완료·undo·장기 reopen
- 회고·새 run·과거 history

P8 keyboard·복구 사용자:
- keyboard 기본 여정
- sheet/dialog/menu focus
- invalid input/export failure/destructive cancel

각 cell은 supported/hidden/partial/missing/blocked로 판정하고 다음을 기록한다.
- route와 viewport
- initial state
- step count
- UI만 보고 예상한 다음 행동
- 실제 결과
- 설명 없이 성공했는지
- My Flow/Calendar/export parity
- undo/reopen/restore/cancel
- actionable duplicate count
- context loss count
- evidenceKind
- 실제 사용자에게 물어야 할 질문

======================================================================
7. My Flow를 별도 심층 검토
======================================================================

current mobile anatomy:

My Flow
├─ 지금
├─ Flow 목록
│  └─ compact Flow row
│     └─ dedicated Flow workspace
│        ├─ 실행
│        ├─ 전체 계획
│        └─ 기록
└─ 완료

current wide anatomy:
library rail -> plan canvas -> inspector

이 구조를 유지하는 결론을 미리 정하지 않는다.

필수 규모:
- 1 Flow
- 5 Flow
- 20 Flow
- 60 Flow

필수 content shape:
- timeline
- undated checklist
- recurrence routine
- artifact choice
- mixed travel plan
- personal draft

모든 current/proposed에서 측정:
- firstViewportDistinctCardTypeCount
- firstViewportHeadingCount
- firstViewportVisibleCommandCount
- firstActionDepth
- flowOpenDepth
- reopenDepth
- itemEditDepth
- wholeExportDepth
- archiveRestoreDepth
- actionableDuplicateCount
- contextLossCount
- horizontalOverflowPx
- unnamedFocusableCount
- explanationDependencyCount

필수 비교안:

A. P31 Keep And Tighten
- 지금/Flow 목록/완료와 실행/전체 계획/기록 유지
- copy, density, row anatomy, disclosure만 정리

B. Library To Focused Workspace
- compact library와 이어할 Flow 중심
- Flow를 열면 한 workspace에 집중
- 다음 행동 -> 계획 -> 기록 progressive disclosure
- back 후 filter/scroll 복구

C. Run-First Workspace
- current run과 이어할 Flow 우선
- reusable Flow library와 completed history는 secondary
- Flow definition과 current run을 구분

필요하면 D안을 추가해도 되지만 A/B/C는 생략하지 않는다.

각 대안은 390px과 1024px current/proposed wireframe을 만들고 다음을 보여준다.
- 1/5/20/60 Flow
- 6 content shape
- 첫 행동
- 완료·다시 열기
- 수정
- 전체 export
- 보관·복구
- mobile back과 context restore

예쁜 첫 화면만 만들지 말고 같은 24-cell을 끝까지 통과할 수 있는 interaction 구조를 제안한다.

다음 중 둘 이상이 current production에서 반복되면 `my_flow_structural_reopen`을 우선 검토한다.
- 지금과 workspace 실행을 2개 이상 persona가 혼동할 가능성이 current hierarchy에서 재현됨
- 같은 stable Item의 primary completion control 중복
- 20 Flow에서 Flow open이 4 interactions 초과
- 전체 구조와 첫 실행 사이에 설명/card layer가 3개 이상
- 완료 취소, 수정, 전체 export, 보관·복구 중 2개 이상이 5 interactions 초과 또는 hidden
- timeline/checklist/routine 중 하나가 공통 workspace에서 의미를 잃음
- 첫 viewport card type 4개 이상, competing primary 2개 이상
- A안이 B/C 대비 complexity를 충분히 줄이지 못함

4탭 역할까지 바꾸는 `cross_tab_ia_reopen`은 B/C안으로도 Home·Find·Calendar의 동일 객체·동일 primary action 중복이 남는 근거가 있을 때만 선택한다.

======================================================================
8. Reference benchmark
======================================================================

reference-benchmark.md의 공식 자료를 사용해 다음 패턴을 비교한다.

- Todoist: Today와 project/context
- Things: When과 project, Anytime/Someday/Logbook
- Apple Reminders: Smart List와 원본 list
- Google Calendar: date/time placement와 detail/edit
- Notion: one object, multiple view, peek
- TickTick: list/calendar/detail 역할
- Wanderlog: trip identity와 day-by-day plan
- Hevy: routine plan과 active workout
- Strava: history/log와 current plan

각 reference마다 다음을 기록한다.
- 어떤 문제를 해결하는 pattern인지
- FlowMe에 번역할 원칙
- 그대로 복제하면 안 되는 부분
- 개선되는 persona/session
- 필요한 data/component 영향

reference를 기능 체크리스트로 사용하지 않는다. FlowMe를 Notion, Todoist, Calendar, 운동 앱의 합체판으로 만들지 않는다.

======================================================================
9. 접근성·복구·정합성
======================================================================

필수 확인:
- visual order와 DOM focus order
- bottom nav가 main content 뒤에 focus
- icon button tooltip과 accessible name
- completion/open/edit/delete/reorder/lifecycle name 구분
- Enter/Space, Escape, focus trap, focus return
- 200% zoom과 긴 한국어 제목
- undo/reopen/archive restore/permanent delete cancel
- My Flow/Calendar/export의 effective title/date/membership 일치
- source/personal/run/occurrence/export identity 분리

UI 대안이 별도 임시 Item ID, 별도 completion 상태, 중복 count를 만들면 탈락시킨다.

======================================================================
10. Reviewer 역할별 추가 요구
======================================================================

REVIEWER_ROLE=claude_design:
- 앱 코드를 수정하지 않는다.
- production과 evidence를 직접 보고 current anatomy를 먼저 그린다.
- A/B/C를 mobile 390과 wide 1024로 비교한다.
- row anatomy, spacing, type hierarchy, sheet/peek/detail transition, focus path를 구체화한다.
- current/proposed를 같은 content와 같은 state로 나란히 비교한다.
- 긴 설명으로 hierarchy 문제를 가리지 않는다.
- proposed 각 화면에 다음 action, whole plan, record, management의 위치를 표시한다.

REVIEWER_ROLE=codex_independent:
- clean origin/main worktree에서 current SHA를 확인한다.
- 검토 중 app code를 수정하지 않는다.
- production interaction, current source, local tests를 분리한다.
- 24-cell을 재현하고 route-evidence와 complexity metrics를 생성한다.
- 제안별 component/data/migration/test/rollback 영향을 분석한다.
- 실행 가능한 acceptance marker와 screenshot contract를 작성한다.
- 필요한 current command를 직접 실행하되 결과를 prior artifact와 섞지 않는다.

======================================================================
11. 필수 산출물
======================================================================

아래 구조로 결과를 만든다.

README.md
audit.md
review.html
persona-journey-scorecard.json
my-flow-complexity-metrics.json
journey-discontinuity-matrix.json
reference-pattern-matrix.md
decision-matrix.json
next-program.md
route-evidence.json
screenshots/

review.html 필수:
- overall verdict
- severity finding
- 24-cell heatmap
- current My Flow anatomy
- A/B/C mobile current/proposed
- A/B/C wide current/proposed
- 1/5/20/60 scale
- 6 content shape comparison
- reference translation matrix
- accessibility/recovery
- data contract impact
- selected alternative
- staged rollout, rollback, acceptance
- 실제 사용자에게 확인할 질문

finding 형식:
- id
- severity
- title
- route
- viewport
- startState
- reproductionSteps
- expected
- actual
- userImpact
- affectedPersonas
- evidenceKind
- dataContractImpact
- proposedResolution
- rejectedAlternatives
- rollback
- acceptanceScreenshot
- acceptanceMarker
- observedUserQuestion

======================================================================
12. 최종 판정
======================================================================

아래 중 하나만 선택한다.

- keep_p31
- bounded_revision
- my_flow_structural_reopen
- cross_tab_ia_reopen

최종 보고 순서:
1. current SHA와 production 접근
2. severity 순 findings
3. 24-cell 결과
4. My Flow A/B/C 비교
5. reference에서 채택/배제한 pattern
6. 선택 판정과 근거
7. 안정적으로 유지할 계약
8. 단계별 다음 개발 프로그램
9. acceptance screenshot/test marker
10. 실제 사용자에게 물어야 할 질문
11. app code 변경 없음
12. observed-user count 0

질문 하나 때문에 전체 검토를 멈추지 않는다. 접근할 수 없는 자료만 evidenceKind=inaccessible로 기록하고 production, GitHub main, local clone에서 가능한 검토를 계속한다.
```
