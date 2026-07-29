# Claude Design 실행용 짧은 프롬프트

아래 블록을 Claude Design 또는 디자인 작업이 가능한 Claude Code에 그대로 전달한다.

```text
FlowMe의 대대적인 UX 단순화 방향을 독립적으로 검토하고, 실제로 조작 가능한 interactive wireflow와 개발 인계안을 만들어줘.

REVIEWER_ROLE: claude_design
작업 유형: 독립 UX/UI 설계, 비교 prototype, multi-session simulation
앱 코드 수정: 금지
실제 관찰 사용자 수: 0명

먼저 아래 정본 프롬프트를 처음부터 끝까지 읽고 모든 요구를 수행해줘.

정본 프롬프트:
D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset-claude-design-handoff\claude-design-master-prompt-ko.md

증거 목록:
D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset-claude-design-handoff\evidence-manifest.json

응답 양식:
D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset-claude-design-handoff\response-template-ko.md

구조화 결과 계약:
D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset-claude-design-handoff\output-contract.json

Production:
https://flowme2605.vercel.app

GitHub:
https://github.com/knhbae/flowme2605

Codex 1차 제안은 비교 대상이지 정답이 아니다. Home 제거, My Flow library-only,
Calendar lens-only를 각각 독립적으로 반박하거나 승인해라. 화면마다 한두 개의
명확한 메시지, primary action 최대 하나, MECE한 기능 소유권을 기준으로 A/B/C
대안을 같은 실제 콘텐츠와 같은 복잡도 지표로 비교해라.

최소 산출물은 390px, 1024px, 1440px에서 조작 가능한 한국어 HTML wireflow,
current/proposed 비교, 15-cell journey scorecard, 화면 메시지 계약, command
grammar, visual system, accessibility/recovery 검토, 구현 handoff다.

결과는 아래 새 폴더에 작성해라.

D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset-claude-design-proposal\

현재 app code, 저장 데이터, dependency, STATUS/ROADMAP/DECISIONS, 기존 Codex
산출물은 수정하지 마라. commit, push, PR, merge, deploy도 하지 마라.

로컬 파일에 접근할 수 없으면 질문을 멈추지 말고 production과 GitHub로 계속
진행하고, 확인하지 못한 근거만 evidenceKind=inaccessible로 표시해라.
자동화, screenshot, heuristic simulation을 실제 사용자 검증으로 표현하지 마라.
```
