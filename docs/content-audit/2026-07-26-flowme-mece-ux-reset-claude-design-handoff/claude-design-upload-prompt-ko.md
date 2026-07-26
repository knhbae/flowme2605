# Claude Design 업로드용 복붙 프롬프트

아래 프롬프트와 ZIP 파일을 함께 전달한다.

ZIP:

`FlowMe-MECE-UX-Reset-Claude-Design-Handoff-2026-07-26.zip`

```text
첨부한 FlowMe MECE UX Reset Claude Design Handoff ZIP을 풀어 전체 자료를 읽고,
FlowMe의 대대적인 UX 단순화 방향을 독립적으로 검토해줘.

REVIEWER_ROLE: claude_design
작업 유형: UX/UI 독립 검토, A/B/C 대안 비교, interactive wireflow,
multi-session simulation, visual system, 개발 handoff
앱 코드 수정: 금지
실제 관찰 사용자 수: 0명

Production:
https://flowme2605.vercel.app

GitHub:
https://github.com/knhbae/flowme2605

첨부 ZIP에서 아래 순서로 읽어줘.

1. claude-design-handoff/claude-design-master-prompt-ko.md
2. claude-design-handoff/evidence-manifest.json
3. claude-design-handoff/journey-screen-contract-ko.md
4. claude-design-handoff/review-checklist-ko.md
5. claude-design-handoff/response-template-ko.md
6. claude-design-handoff/output-contract.json
7. codex-first-design/README.md
8. codex-first-design/review.html
9. codex-first-design/journey-scorecard.json
10. codex-first-design/specs/design-package.md
11. codex-first-design/specs/simulation.md
12. codex-first-design/specs/plan.md

claude-design-master-prompt-ko.md를 정본으로 사용하고, 요구사항을 생략하지 마라.

Codex 1차 제안은 정답이 아니다. 아래 세 결정을 독립적으로 승인·반박·수정해라.

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
- 5~9개 구현 slice와 rollback, screenshot/E2E acceptance

결과 파일은 응답 양식에 지정된 구조로 제공해라. 파일을 직접 만들 수 있으면
`2026-07-26-flowme-mece-ux-reset-claude-design-proposal/` 폴더로 묶어줘.

Production을 직접 조작하고 GitHub current source와 대조해라. 첨부 ZIP의
Codex HTML과 screenshot은 proposed/prior artifact이지 production 증거가 아니다.
접근하지 못한 근거만 evidenceKind=inaccessible로 표시하고 계속 진행해라.

앱 코드, 저장 데이터, dependency, STATUS/ROADMAP/DECISIONS를 수정하지 마라.
commit, push, PR, merge, deploy도 하지 마라. 자동화, screenshot, fixture,
heuristic simulation을 실제 사용자 검증으로 표현하지 마라.
```
