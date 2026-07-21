# 다음 실행 목표: P27-R00A 비교 Prototype Gate

아래 내용은 다음 세션에 그대로 `/goal`로 사용할 수 있는 첫 목표다. 앱을 바로 수정하지 않고, 이후 구현이 다시 엇나가지 않도록 세 개 핵심 surface와 상태 의미를 먼저 확정한다.

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P27-R00A Flow Lifecycle Workspace Comparison Gate를 완료한다. 앱 코드를 수정하지 않고, 저장 전 Flow 조정, My Flow 실행/보관함, 홈트 반복 series/occurrence/resource의 current와 proposed interaction을 모바일 390px과 wide 1024px에서 비교한다. 사용자 피드백, current production/source, 기존 P27 package, Input Composer v1.1, Claude Design (10)을 종합하되 기존 goal을 그대로 복사하지 않는다. 이후 P27-R01~R04 구현이 사용할 공통 Flow outline, row anatomy, archive/remove/restore 문구, recurrence horizon 표현, adaptive search 조건을 결정한다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/content-audit/2026-07-21-p27-user-feedback-synthesis/README.md
5. docs/content-audit/2026-07-21-p27-user-feedback-synthesis/feedback-matrix.md
6. docs/specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/spec.md
7. docs/specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/plan.md
8. docs/specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/backlog.md
9. docs/specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/qa.md
10. docs/content-audit/2026-07-21-flowme-p26-production-review-p27-program/README.md
11. docs/content-audit/2026-07-21-flowme-p26-production-review-p27-program/review.html
12. docs/specs/2026-07-21-flowme-input-composer-ux-v1-1/spec.md
13. docs/specs/2026-07-21-flowme-input-composer-ux-v1-1/interaction-spec.md
14. docs/content-audit/2026-07-19-flow-content-usage-preview-ko.html
15. claude_work/FlowMe UXUI 전체 검토 (10).zip의 최신 P26/P27 HTML

작업 시작 전:
- git status, staged/unstaged diff, origin/main SHA를 기록한다.
- dirty 파일을 revert/delete/stage 하지 않는다.
- production https://flowme2605.vercel.app 과 current source를 다시 대조한다.
- prior screenshot, heuristic simulation, stakeholder feedback, current production을 구분한다.
- 자동화 결과를 실제 사용자 검증으로 표현하지 않는다.

비교할 surface:
1. 저장 전 Flow setup workspace
   - moving anchor-relative Flow
   - vehicle undated checklist
   - workout recurring resource-backed Flow
   - 기본 read mode와 조정 mode
   - 일정/포함/내용/순서/자료 operation
   - sticky save surface 1개

2. My Flow
   - 1/3/5/12 Flow fixture
   - 지금과 Flow library
   - adaptive search
   - same-date grouping
   - active/recent/archived
   - post-save와 returning detail parity

3. Workout
   - 4주 프로그램과 앞으로 4주 미리보기 구분
   - series 설정과 occurrence 실행 구분
   - 영상/URL resource와 확인 항목 구분
   - mobile Calendar weekly strip/agenda 대안
   - wide grid/detail 대안

4. 복구 가능한 제거 storyboard
   - Flow 보관/즉시 undo/보관함 복구
   - source Item 내 Flow에서 빼기/복구
   - user Item 삭제/복구
   - occurrence 건너뛰기와 삭제 구분

산출물:
docs/content-audit/2026-07-22-p27-r00a-lifecycle-workspace-prototype-gate/
- README.md
- audit.md
- review.html
- decision-matrix.json
- state-fixtures.json
- component-anatomy.md
- screenshots/

필수 decision:
- saveBeforeDefaultMode
- saveBeforeAdjustmentEntry
- activeEditOperationMaxCount
- postSaveUsesSharedFlowOutline
- myFlowPrimaryMentalModels
- myFlowSearchVisibilityRule
- flowRemovalDefaultAction
- persistentRestoreLocation
- recurrenceProgramEndLabel
- recurrencePreviewHorizonLabel
- resourceVsSubcheckAnatomy
- routineMobileCalendarComposition

완료 기준:
- current/proposed를 390/1024에서 나란히 비교할 수 있다.
- 각 surface의 Keep/Change/Remove가 결정된다.
- 저장 전과 저장 후가 같은 Flow outline을 사용한다.
- Flow/Item/occurrence 제거 의미와 복구 경로가 분리된다.
- 4주 program end와 preview horizon이 분리된다.
- resource와 confirmation subcheck가 다른 level로 보인다.
- 1/3/5/12 Flow에서 search 노출 규칙이 결정된다.
- owner 승인 전 app implementation은 시작하지 않는다.
- 앱 코드와 저장 schema는 변경하지 않는다.

검증:
- prototype HTML을 실제 브라우저에서 조작한다.
- 390x844, 1024x768 screenshot을 남긴다.
- horizontal overflow, fixed overlap, unnamed control을 확인한다.
- npm.cmd run docs:check
- git diff --check

최종 응답:
확인한 current evidence, A/B 대안, 결정값, 보류된 가설, 구현 dependency, 검증, 앱 코드 무변경, commit/push 상태를 요약한다.
```
