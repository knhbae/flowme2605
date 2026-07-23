# Codex 독립 검토 전용 복붙 프롬프트

```text
D:\flowme2605\flow-mvp 또는 최신 origin/main의 clean worktree에서 FlowMe P31 production 독립 검토를 수행해줘.

먼저 아래 공용 프롬프트를 전체 읽고 `REVIEWER_ROLE: codex_independent`로 수행한다.

https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-24-flowme-p31-independent-my-flow-review-handoff/unified-review-prompt-ko.md

Production:
https://flowme2605.vercel.app

Handoff package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-24-flowme-p31-independent-my-flow-review-handoff

작업 전:
- git fetch 후 origin/main SHA를 기록한다.
- 기존 worktree가 dirty면 latest origin/main에서 clean worktree를 만든다.
- package-lock.json을 그대로 사용한다.
- 검토 중 app code, dependency, STATUS/ROADMAP를 수정하지 않는다.
- prior evidence 결과를 current command/browser result로 표현하지 않는다.

핵심 작업:
1. 8 personas x 3 sessions = 24 cells를 current production에서 가능한 범위까지 재현한다.
2. My Flow를 1/5/20/60 Flow fixture와 6 content shape로 측정한다.
3. P31 A안, focused workspace B안, run-first C안의 data/component/test 영향을 비교한다.
4. current production/source로 `keep_p31`, `bounded_revision`, `my_flow_structural_reopen`, `cross_tab_ia_reopen` 중 하나를 판정한다.
5. Claude Design이 만든 대안이 있으면 같은 complexity metric과 24-cell로 독립 검증한다.

확인할 source:
- components/flow/AppClient.tsx
- components/flow/MyFlowDataManager.tsx
- components/flow/FlowExecutionPrimitives.tsx
- lib/flow/storage.ts
- lib/flow/source-backed-my-flow.ts
- personal draft/structural projection/recurrence/export 관련 모듈
- P31 My Flow, Calendar, public save, lifecycle 관련 unit/E2E

검증:
- npm.cmd ci
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- 관련 targeted Playwright E2E
- 위험이 넓으면 full E2E
- production browser inspection
- 390x844, 1024x768, 대표 1440x900 screenshots
- console/page error, overflow, keyboard focus, accessible name
- git diff --check

명령이 실패하거나 시간이 부족하면 실행한 범위, 실패 원인, 미검증 gap을 정확히 기록한다. 검토를 핑계로 app code를 수정하지 않는다.

필수 결과:
- severity findings
- 24-cell scorecard
- current My Flow complexity metrics
- A/B/C technical impact
- source/personal/run/occurrence/export 영향
- migration 필요 여부
- staged implementation slices
- rollback과 acceptance markers
- 실제 사용자에게 확인할 질문
- app code 변경 없음
- observed-user count 0

자동화, screenshot, fixture, agent simulation을 실제 사용자 검증으로 표현하지 않는다.
```
