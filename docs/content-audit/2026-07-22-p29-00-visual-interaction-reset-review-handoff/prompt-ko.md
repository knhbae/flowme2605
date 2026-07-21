# Claude Design / Codex 통합 복붙용 프롬프트

아래 하나만 Claude Design 또는 Codex의 새 대화에 붙여넣으면 된다.

```text
FlowMe P28 production을 독립적으로 시뮬레이션·검토하고, 다음 단계인 P29-00 Visual & Interaction Reset을 실제로 결정하고 시작할 수 있는 제안을 작성해줘.

이번 요청은 P28 기능 체크만 하는 것이 아니다. P28에서 구조와 데이터 계약은 개선됐지만 화면의 시각적 변화가 작고, 저장 전 workspace·routine 설정·My Flow·Calendar·결과 선택이 여전히 긴 문서, 설정 폼, 카드 묶음처럼 느껴지는지 검토해야 한다. 현재 화면을 평가한 뒤 다음 단계가 단순 polish, 일부 화면의 coordinated reset, 전면 rewrite 중 무엇인지 근거를 들어 선택해줘.

앱 코드를 먼저 수정하지 마. 이번 결과는 P29 구현 전 독립 설계·기술 gate다.

Production:
https://flowme2605.vercel.app

GitHub main:
https://github.com/knhbae/flowme2605

P29-00 review handoff:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff

먼저 읽을 파일:
1. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/README.md
2. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/review.html
3. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/strategy-context.md
4. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/current-gap-audit.md
5. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/route-evidence.json
6. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/review-scenario-matrix.json
7. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/response-template-ko.md
8. https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/screenshots
9. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/p29-decision-matrix.json

P28 final package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-p28-final-review-package

P28 architecture gate:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-p28-01-cross-surface-architecture-gate

P28 spec와 reference pattern:
https://github.com/knhbae/flowme2605/tree/main/docs/specs/2026-07-21-p28-experience-reconstruction

Current source에서 우선 볼 파일:
- components/flow/AppClient.tsx
- components/flow/ArtifactWorkbench.tsx
- components/flow/FlowSaveBeforeFrame.tsx
- components/flow/FlowArtifactDataPreview.tsx
- components/flow/RoutineScheduleEditor.tsx
- components/flow/CalendarFlowScopePicker.tsx
- lib/flow/flow-experience-projection.ts
- lib/flow/whole-flow-reading.ts
- lib/flow/effective-routine-projection.ts
- tests/e2e/p28-experience-reconstruction.spec.ts

제품 기준:
- FlowMe는 Notion, Calendar, Todo, workout tracker를 대체하는 무거운 planner가 아니다.
- 원문/URL/메모에서 실행 가능한 Flow를 만들고, 최소 개인화 후 My Flow/Calendar 또는 외부 도구로 가져가는 portable execution layer다.
- 먼저 쓸 만한 전체 결과를 보여주고 필요한 값만 점진적으로 받는다.
- source, personal overlay, execution run, routine occurrence, export identity를 분리한다.
- 4탭 IA와 public /f shell은 유지한다.
- 긴 설명을 추가해서 hierarchy 문제를 덮지 않는다.
- 실제로 적용되지 않는 결과 형태를 비활성 tab으로 늘어놓지 않는다.

전략·기획 원칙도 함께 대조해줘:
- FlowMe의 빈칸은 콘텐츠와 실행 사이이며, 계획 앱을 하나 더 만드는 것이 아니다.
- 공급은 제작자·원문 권리자와 시작할 수 있지만 제품 경험은 사용자 실행을 먼저 검증한다.
- 같은 Flow가 발견, 저장 전, receipt, My Flow, Calendar, export, 재사용에서 하나의 객체로 이어져야 한다.
- save-before, first-save receipt, returning execution은 역할이 다른 frame이므로 거대한 full editor로 합치지 않는다.
- 콘텐츠별 primary artifact는 다르며 모든 Flow에 Calendar/Checklist/Sheet/Memo를 강제하지 않는다.
- 날짜 없는 일은 유효한 실행 항목이고, My Flow에서 실행하며 Calendar에서는 배치한다.
- 완료, reopen, skip, hold, personal exclusion, archive는 서로 다른 상태다.
- source-to-Flow gate는 one source -> one user job -> one natural artifact -> minimal execution UI다.
- creator marketplace, 자체 결제, account/DB, AI/crawler, OAuth는 이번 visual reset의 범위가 아니다.

반드시 직접 시뮬레이션할 route:
1. /f/moving-d30-basic
2. /f/curated-allblanc-morning-workout
3. /my?demo=ux20&view=flows
4. /calendar?demo=ux12
5. /f/used-car-buying-check
6. /f/source-backed-middle-school-math-1
7. /f/overseas-safety-register

Viewport:
- 390x844
- 1024x768
- 가능하면 1440x900

시뮬레이션 순서:
A. 이사 Flow에서 전체 범위 확인 → 이사일 입력 → 항목 수정 → Calendar result 확인 → 저장
B. 홈트 Flow에서 주 N회 확인 → 시간과 종료 조건 수정 → resource 확인 → 저장
C. My Flow 27개 fixture에서 Flow 찾기 → 다음 행동 → 전체 계획 → 조정 → 완료 취소 → export 찾기
D. Calendar 12개 fixture에서 특정 Flow 검색 → 여러 Flow 선택 → selected day 확인 → 날짜 없는 일 배치 가능성 확인
E. Flow/Calendar/Checklist/Sheet/Memo 다섯 실제 결과를 비교 → 추천 이유와 손실 예측 → 저장/export receipt 확인
F. /flows → /f → /my → /calendar를 이어서 같은 Flow의 상태와 행동 문법이 연속적인지 확인

각 단계에서 다음을 기록해줘:
- 첫 viewport에서 보이는 정보와 primary action
- 행동을 찾기 위한 scroll/tap/click depth
- 반복되는 설명, card, label, chip
- 무엇을 줄이고 무엇을 더 보여줘야 하는지
- mobile/wide hierarchy 차이
- keyboard focus, accessible name, overflow, fixed overlap, console/page error
- evidenceKind

EvidenceKind:
- current_production_interaction
- current_package_screenshot
- current_source
- prior_design_artifact
- reference_pattern
- heuristic_simulation
- inaccessible

판단할 대안:
A. Incremental polish: typography, spacing, color, border 위주
B. Coordinated surface reset: save-before, My Flow, Calendar, result choice의 composition과 interaction hierarchy를 함께 재설계하되 data/IA 유지
C. Full product rewrite: planner 수준으로 IA와 data까지 재작성

세 대안을 사용자 가치, 시각적 체감 변화, 구현 위험, 계약 회귀 위험, 모바일 적합성으로 비교하고 하나를 선택해줘. B를 권장안으로 보되 evidence가 다르면 반박해도 된다.

다음 단계 제안은 반드시 포함해줘:
1. P29-00에서 승인할 current/proposed hierarchy
2. 390px과 1024/1440px wireframe 또는 상세 layout description
3. save-before → saved receipt → My Flow → Calendar의 continuity map
4. shared visual grammar와 component anatomy
5. CSS/token만 바꿀 부분과 component/state composition을 바꿀 부분
6. P29 첫 vertical slice와 rollback 경계
7. P29 전체를 5~9개 slice로 나눈 backlog
8. 각 slice의 목적, 범위, 비범위, dependency, acceptance screenshot, E2E marker
9. 실제 사용자 관찰 전에 닫아야 할 correctness/accessibility 항목
10. 실제 사용자에게 나중에 확인할 질문 최대 7개

Claude Design이라면:
- 앱 코드는 수정하지 않는다.
- current와 proposed를 나란히 비교한다.
- Google Calendar, Apple Reminders, Todoist, Notion, Fitbod, Strava, TripIt 등 현재 reference pattern을 확인하되 기능을 그대로 복사하지 않는다.
- save-before, My Flow, Calendar, routine, result choice의 mobile/wide wireframe을 제안한다.
- 색상 교체만이 아니라 정보 위계, progressive disclosure, command placement, density, state feedback을 다룬다.
- proposed visual system이 Flow 콘텐츠 유형이 달라도 공통으로 적용되는지 보여준다.

Codex라면:
- 앱 코드를 수정하지 않는다.
- production, current source, P28 tests를 대조한다.
- finding을 CSS-only, component composition, interaction state, data contract로 분류한다.
- stable projection과 identity를 유지하면서 가능한 구현 경계를 제안한다.
- 영향 파일, migration 여부, 회귀 위험, 테스트/capture 범위, 단계별 난이도를 적는다.
- Claude Design 제안이 구현 가능한지 반박하거나 좁힐 수 있는 기술 질문을 작성한다.

결과 규칙:
- findings를 Blocking / High / Medium / Low 순으로 먼저 쓴다.
- 각 finding에 route, viewport, 재현 단계, 기대/실제, 사용자 영향, evidenceKind, 권장 변경, acceptance marker를 포함한다.
- current fact, heuristic inference, reference pattern, unverified assumption을 섞지 않는다.
- 자동화와 agent simulation을 실제 사용자 검증이라고 표현하지 않는다. observed-user count는 0이다.
- P28의 안정된 data contract를 시각 개선 때문에 다시 쓰지 않는다.
- 단순 UI polish로 충분하지 않다고 판단하면 대폭 수정안을 제안해도 된다.

응답 형식은 아래 파일을 그대로 따른다:
https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p29-00-visual-interaction-reset-review-handoff/response-template-ko.md

이번에는 앱을 구현하지 말고, P29-00 설계 결정과 다음 구현 목표를 승인할 수 있는 독립 검토 산출물을 작성해줘.
```
