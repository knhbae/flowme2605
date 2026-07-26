# FlowMe Claude Design GitHub 복붙용 프롬프트

아래 블록을 Claude Design에 그대로 전달한다.

```text
FlowMe의 대대적인 UX 단순화 방향을 독립적으로 검토하고, 실제로 조작 가능한
interactive wireflow와 개발 인계안을 만들어줘.

REVIEWER_ROLE: claude_design
작업 유형: UX/UI 독립 검토, A/B/C 대안 비교, interactive wireflow,
multi-session simulation, visual system, 개발 handoff
앱 코드 수정: 금지
실제 관찰 사용자 수: 0명

Production:
https://flowme2605.vercel.app

GitHub repository:
https://github.com/knhbae/flowme2605

Claude Design handoff package:
https://github.com/knhbae/flowme2605/tree/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset-claude-design-handoff

먼저 아래 정본 프롬프트를 처음부터 끝까지 읽고 모든 요구사항을 수행해줘.

정본 프롬프트:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset-claude-design-handoff/claude-design-master-prompt-ko.md

증거 목록:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset-claude-design-handoff/evidence-manifest.json

화면·여정 계약:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset-claude-design-handoff/journey-screen-contract-ko.md

검토 체크리스트:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset-claude-design-handoff/review-checklist-ko.md

응답 양식:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset-claude-design-handoff/response-template-ko.md

구조화 결과 계약:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset-claude-design-handoff/output-contract.json

필요할 때 사용할 후속 프롬프트:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset-claude-design-handoff/optional-followup-prompts-ko.md

Codex 1차 설계 package:
https://github.com/knhbae/flowme2605/tree/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset

Codex interactive current/proposed wireflow:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset/review.html

Codex 15-cell scorecard:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/content-audit/2026-07-26-flowme-mece-ux-reset/journey-scorecard.json

상위 UX reset 계획:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/specs/2026-07-26-flowme-mece-ux-reset/plan.md

Codex 설계 package:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/specs/2026-07-26-flowme-mece-ux-reset/design-package.md

Codex simulation:
https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/docs/specs/2026-07-26-flowme-mece-ux-reset/simulation.md

Current source에서 우선 확인할 파일:
- https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/components/flow/AppClient.tsx
- https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/components/flow/MyFlowDataManager.tsx
- https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/components/flow/FlowExecutionPrimitives.tsx
- https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/components/flow/ArtifactWorkbench.tsx
- https://github.com/knhbae/flowme2605/blob/codex/flowme-mece-ux-reset-design-handoff/lib/flow/storage.ts

Codex 1차 제안은 정답이 아니다. 다음 세 결정을 독립적으로 승인·반박·수정해라.

1. Home을 제거하고 Flow 찾기와 합칠 것인가
2. My Flow를 저장 Flow library로 한정할 것인가
3. Calendar를 날짜 기반 lens로 한정하고 실행을 personal Flow로 보낼 것인가

A Subtractive ownership, B Current model tightened, C Claude independent
alternative를 같은 다섯 실제 콘텐츠와 같은 복잡도 지표로 비교해라.

필수 결과:
- 화면마다 한두 개의 핵심 메시지
- 경쟁 primary action 최대 하나
- MECE한 기능 소유권과 명확한 UI tree
- 5 personas x 3 sessions = 15-cell journey
- 390x844, 1024x768, 1440x900 interactive wireflow
- current/proposed 화면 비교
- 콘텐츠별 renderer와 progressive disclosure
- 공통 command grammar와 visual system
- keyboard, focus, accessible name, overflow, error/recovery 검토
- 첫 제안 red-team 및 2~3회 개선
- 5~9개 구현 slice와 rollback, screenshot/E2E acceptance

Production을 직접 조작하고 current source와 대조해라. GitHub의 Codex HTML과
screenshot은 proposed artifact이지 production 구현 증거가 아니다.
접근하지 못한 항목만 evidenceKind=inaccessible로 기록하고 계속 진행해라.

앱 코드, 저장 데이터, dependency, STATUS/ROADMAP/DECISIONS를 수정하지 마라.
commit, push, PR, merge, deploy도 하지 마라. 자동화, screenshot, fixture,
heuristic simulation을 실제 사용자 검증으로 표현하지 마라.
```
