repo: knhbae/flowme2605
branch: codex/flowme-mece-ux-reset-design-handoff
path: docs/content-audit/2026-07-26-flowme-mece-ux-reset-claude-design-handoff

## Last sync

date: 2026-07-26T00:40:00Z
commit: (unknown — only a tree ref was resolvable from the API; not recorded to avoid a wrong sha)
tree-ref: 319f379a918f

### Updated in this project

- claude_design 독립 설계 패키지 신규 작성: `2026-07-26-flowme-mece-ux-reset-claude-design-proposal/` (15개 파일 + screenshots)
- 조작 가능한 wireflow DC 신규: `FlowMe MECE UX Reset 독립설계 (claude_design · A′ 권장).dc.html`
- production 현재 화면 캡처 8종을 repo handoff에서 `screenshots/`로 복사(왼쪽 current 패널 근거)
- 앱 코드·저장 데이터·STATUS/ROADMAP/DECISIONS는 변경하지 않음. commit/push/PR/merge/deploy 없음

## Screen map

| 이 프로젝트의 화면 | repo 근거 파일 |
| --- | --- |
| 1 Flow 찾기 (current 패널) | `docs/content-audit/2026-07-26-flowme-mece-ux-reset/screenshots/current-home-390.png`, `current-flows-390.png` |
| 2 공개 Flow (current 패널) | `current-public-moving-390.png` · production `/f/moving-d30-basic` |
| 2 공개 Flow (제안 콘텐츠) | `lib/flow/real-content-pilot-flows.ts` (자동차검사 10개), `lib/flow/source-backed-my-flow.ts` (중1 수학 8단원) |
| 4 저장 결과 | `current-receipt-moving-390.png` |
| 5 My Flow · 6 개인 Flow | `current-my-flow-workspace-390.png`, `current-my-flow-1024.png` |
| 7 Calendar | `current-calendar-390.png`, `current-calendar-1024.png` |
| route 구조 근거 | `app/f/[slug]/page.tsx` |
| 비교 대상(Codex 1차 설계) | `docs/specs/2026-07-26-flowme-mece-ux-reset/design-package.md`, `docs/content-audit/2026-07-26-flowme-mece-ux-reset/README.md` |
| 요구사항 계약 | `.../claude-design-master-prompt-ko.md`, `journey-screen-contract-ko.md`, `output-contract.json`, `response-template-ko.md` |
