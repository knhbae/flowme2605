# Codex 복붙용 프롬프트

```text
/goal

D:\flowme2605\flow-mvp 기준으로 FlowMe P30 production과 origin/main을 독립 검토해줘. 검토 중 앱 코드를 수정하지 말고, correctness·사용자 여정·접근성·responsive·release evidence를 현재 실행 결과로 다시 확인한다.

Production:
https://flowme2605.vercel.app

GitHub:
https://github.com/knhbae/flowme2605

P30 final package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/STATUS.md
5. docs/ROADMAP.md
6. docs/PRODUCT_PRINCIPLES.md
7. docs/content-audit/2026-07-22-flowme-p30-final-review-package/README.md
8. docs/content-audit/2026-07-22-flowme-p30-final-review-package/review.html
9. docs/content-audit/2026-07-22-flowme-p30-final-review-package/audit.md
10. docs/content-audit/2026-07-22-flowme-p30-final-review-package/route-evidence.json
11. docs/content-audit/2026-07-22-flowme-p30-final-review-package/journey-results.json
12. docs/content-audit/2026-07-22-flowme-p30-final-review-package/production-smoke/results.json
13. tests/e2e/p30-evidence-gap-closure.spec.ts
14. components/flow/AppClient.tsx
15. components/flow/FlowSaveBeforeFrame.tsx
16. components/flow/FlowExportPanel.tsx
17. components/flow/CalendarFlowScopePicker.tsx
18. components/flow/CalendarUnscheduledTray.tsx
19. components/flow/RoutineScheduleEditor.tsx
20. components/flow/RoutineScheduleSummary.tsx

작업 시작 전:
- git fetch 후 origin/main SHA를 기록한다.
- dirty worktree면 origin/main에서 clean worktree를 만든다.
- package-lock.json을 그대로 사용한다.
- current main이 예상 SHA 4c5bbb34f5c8633d4b4b48fb8070e523ec5def6b와 다르면 새 SHA와 차이를 먼저 기록한다.
- prior P29/P30 결과를 이번 실행 결과처럼 표현하지 않는다.
- 제품 코드, dependency, 상태 문서를 수정하지 않는다.

제품 기준:
- FlowMe는 portable execution layer이며 무거운 planner가 아니다.
- source, personal overlay, execution run, occurrence, export identity를 유지한다.
- 4탭 IA와 public /f shell을 유지한다.
- 자동화·Playwright·agent simulation은 실제 사용자 관찰이 아니다.
- 실제 사용자 모집은 이번 범위가 아니다.

독립 재현 시나리오:

1. /f/moving-d30-basic, 390x844
   - save-before artifact first
   - 조정 전 row edit 0
   - contextual 조정과 24-item disclosure
   - 저장 receipt 분리
   - export open 중 fixed primary intersection 0

2. /f/vehicle-inspection-prep, 390x844
   - pre-save preview와 post-save completion 의미 분리
   - whole Flow export scope/count

3. /my?demo=ux20&view=flows, 390x844와 1440x900
   - 검색 -> open -> next action -> complete/reopen -> export
   - visible primary 1, secondary 1
   - export fixed overlap 0
   - overflow menu Escape/focus return
   - DOM focus order header -> workspace -> persistent tabs

4. /calendar, /calendar?demo=ux20, /calendar?demo=ux50
   - 날짜 없는 할 일 10 -> 8 -> undo 10, stable ID
   - 62 scope options에서 2개 선택, meaningful interactions <= 5
   - 같은 날짜 5 Flow: compact grid와 selected-day full identity
   - mobile focus order와 sheet focus return

5. /f/curated-allblanc-morning-workout, 390x844와 1024x768
   - initial advanced field 0
   - next occurrence 3
   - 현재 mode에 필요한 field만 표시
   - series/occurrence identity와 export 결과 회귀 없음

6. /flow-maps/moving-d30, 1024x768
   - live legacy consumer marker
   - current production에서 실제 active route인지 확인
   - 즉시 제거가 아니라 유지/migration/defer 판정만 제시

화면별 marker 재현과 별도로 아래 8개 페르소나를 3세션씩 시뮬레이션한다.

1. 이사일 역산형 Calendar 사용자
2. 날짜 없는 차량 점검 사용자
3. 반복 홈트 사용자
4. Calendar-heavy 다중 Flow 사용자
5. 기존 도구 중심 export 사용자
6. URL/메모 개인 초안 사용자
7. 재방문·회고·재사용 사용자
8. 키보드·저시력 보조 사용자

각 persona는 가능한 범위에서 다음 lifecycle을 따른다.
발견 -> 이해 -> 조정 -> 저장 -> 전체 결과 확인 -> 실행 -> 완료 -> 완료 취소 -> 날짜/구조 수정 -> Calendar -> export -> 재방문 -> 회고/재사용

각 session cell에 아래를 기록한다.
- route, viewport, fixture/초기 상태
- 행동별 tap/click depth
- visible/reachable 여부
- 시스템 feedback과 recovery
- reload persistence
- My Flow/Calendar/export projection parity
- stable identity와 과거 실행 보존
- supported / hidden / partial / missing / blocked
- evidenceKind

기능이 없으면 억지로 구현하거나 우회하지 말고 missing/blocked로 기록한다. 자동 fixture와 실제 사용자 도달 가능성을 분리한다.

접근성·responsive 확인:
- horizontal overflow 0
- fixed-layer primary intersection 0
- unnamed focusable 0
- keyboard-only 주요 행동
- Escape close와 focus return
- accessible name과 visible label 목적 일치
- console/page error 0
- 390x844, 1024x768, 1440x900 screenshot

현재 명령으로 검증:
- npm.cmd ci
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- npx.cmd playwright test tests/e2e/p30-evidence-gap-closure.spec.ts --workers=2
- 영향 범위 판단 후 관련 P28/P29 targeted E2E
- 가능하면 full E2E, 불가능하면 정확한 이유와 실제 실행 수치 기록
- git diff --check

결과 규칙:
- findings를 severity 순서로 먼저 쓴다.
- 각 finding에 route, viewport, 재현, 기대, 실제, 사용자 영향, evidenceKind를 포함한다.
- current_command, current_production_interaction, current_browser_automation, prior_artifact, heuristic, observed_user를 구분한다.
- 문제가 없으면 no-finding과 남은 검증 공백을 명시한다.
- 검토 중 앱 코드를 수정하지 않는다.
- P31 후보는 concrete current-production gap만 최대 5개 제안한다.
- finding이 없으면 broad P31을 만들지 않는다.

산출물:
docs/content-audit/2026-07-23-codex-p30-independent-review/
- README.md
- audit.md
- route-evidence.json
- journey-results.json
- persona-journey-scorecard.json
- service-platform-assessment.md
- screenshots/

최종 응답:
- current SHA와 production 접근 상태
- severity findings
- P30 marker 재현 결과
- keep / revise / defer 판정
- 명령·브라우저 검증 수치
- 실제 사용자에게만 확인 가능한 질문
- app code 무변경 여부
- commit/push/PR/deploy 상태
를 요약한다.
```
