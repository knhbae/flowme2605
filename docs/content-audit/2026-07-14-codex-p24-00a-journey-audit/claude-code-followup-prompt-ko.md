# Claude Code 독립 검증 프롬프트

아래 블록을 그대로 복사해 사용한다.

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Codex가 수행한 P24-00A 실행 라이프사이클 감사를 독립 검증한다. 새 기능이나 UI를 구현하지 않고, clean commit 기준에서 테스트와 브라우저 재현을 다시 수행해 발견 사항의 재현 가능성, 누락된 회귀, 우선순위를 검토한다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/content-audit/2026-07-14-codex-p24-00a-journey-audit/README.md
5. docs/content-audit/2026-07-14-codex-p24-00a-journey-audit/audit.md
6. docs/content-audit/2026-07-14-codex-p24-00a-journey-audit/journey-scorecard.json
7. docs/content-audit/2026-07-14-codex-p24-00a-journey-audit/state-transition-results.json
8. docs/content-audit/2026-07-14-codex-p24-00a-journey-audit/route-evidence.json
9. docs/content-audit/2026-07-14-codex-p24-00a-journey-audit/security-audit-summary.json
10. docs/content-audit/2026-07-14-codex-p24-00a-journey-audit/backlog-recommendation.md
11. components/flow/AppClient.tsx
12. lib/flow/date.ts
13. lib/flow/storage.ts
14. lib/flow/execution-model.ts
15. lib/flow/recurrence.ts
16. tests/e2e/flow-mvp.spec.ts
17. tests/e2e/url-first-user-surface.spec.ts

작업 시작 전:
- git status, staged/unstaged diff, HEAD, origin/main을 확인한다.
- 기존 dirty 파일을 revert/delete/stage 하지 않는다.
- 감사 대상 commit을 별도 clean worktree에서 검증한다.
- 자동화 결과를 실제 사용자 관찰로 표현하지 않는다.
- 이전 evidence를 현재 실행 결과처럼 복사하지 않는다.

독립 재현할 핵심 finding:
1. Asia/Seoul 2026-07-14 07:00에서 개인 draft 날짜 지정 기본값이 2026-07-13인지 확인한다.
2. `formatDate(new Date())`가 Today/Calendar/default date에 미치는 범위를 추적한다.
3. 월간 반복 Flow를 저장했을 때 동일 할 일이 Today의 `다음 할 일`과 `다음 항목`에 중복되는지 확인한다.
4. source-backed Today 상세를 열었을 때 동일 accessible name의 completion checkbox가 두 개 보이는지 확인한다.
5. URL miss draft에서 제목과 원하는 결과를 비워도 초안이 생성되는지 확인한다.
6. fallback 상태 문장이 생성 item title에 남고 Flow title 수정 뒤에도 유지되는지 확인한다.
7. public preview checkbox와 post-save completion checkbox의 의미가 분리되는지 확인한다.
8. 완료 Flow의 개인 회고, 미전송 source correction, 새 run 재사용이 이전 snapshot을 보존하는지 확인한다.
9. Vercel preview가 익명 사용자에게 SSO redirect되는지 확인한다.
10. clean tracked package에서 npm audit 결과를 재수집한다.

필수 검증:
- npm ci
- npm.cmd test
- npm.cmd run build
- npx playwright test
- 모바일 390px과 wide 1024px browser inspection
- horizontal overflow와 console error
- npm audit --json
- git diff --check

판정 원칙:
- 기존 assertion 통과와 사용자 여정 성공을 별도로 판정한다.
- 재현되지 않은 finding은 이유와 환경 차이를 기록한다.
- 새 finding은 route, fixture, viewport, action depth, screenshot을 남긴다.
- severity는 Blocking / High / Medium / Low로 정한다.
- 실제 사용자 관찰이 필요한 가정은 별도 목록으로 둔다.

산출물:
docs/content-audit/2026-07-14-claude-code-p24-00a-independent-audit/
- README.md
- audit.md
- independent-findings.json
- regression-results.json
- screenshots/

완료 기준:
- Codex finding별 reproduced / not_reproduced / inconclusive 판정이 있다.
- 날짜, 반복, draft validation, completion/reuse의 독립 evidence가 있다.
- automated QA와 observed-user evidence가 구분된다.
- 구현 없이 다음 fix 순서와 테스트 범위만 제안한다.
- 기존 dirty worktree를 섞지 않는다.
- 가능하면 감사 산출물만 별도 commit하고 push한다.

최종 응답:
독립 재현 결과, 추가 finding, severity 조정, 테스트 결과, 배포 접근성, dependency audit, commit/push 상태, P24-00A-FIX 권장 순서를 요약한다.
```
