# Copy-paste Goal - P24-00R Baseline and Evidence Reconciliation

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P24-00R Baseline and Evidence Reconciliation을 수행한다. 앱 UI나 제품 동작을 수정하지 않고, clean tracked baseline과 현재 미커밋 dependency upgrade 환경을 격리해 동일한 검증을 실행한다. Codex P24-00A와 Claude Code P24-00A의 서로 다른 build/여정 결과를 finding별로 confirmed_clean / dirty_only / not_reproduced / blocked로 분류하고, 다음 첫 code fix를 하나로 확정한다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/specs/2026-07-14-p24-execution-trust-ux-simplification/spec.md
5. docs/specs/2026-07-14-p24-execution-trust-ux-simplification/plan.md
6. docs/specs/2026-07-14-p24-execution-trust-ux-simplification/qa.md
7. docs/content-audit/2026-07-14-flowme-p24-feedback-reconciliation/README.md
8. docs/content-audit/2026-07-14-flowme-p24-feedback-reconciliation/findings-matrix.json
9. docs/content-audit/2026-07-14-codex-p24-00a-journey-audit/README.md
10. docs/content-audit/2026-07-14-codex-p24-00a-journey-audit/audit.md
11. docs/content-audit/2026-07-14-claude-code-p24-observation-audit/README.md
12. docs/content-audit/2026-07-14-claude-code-p24-observation-audit/audit.md
13. package.json
14. package-lock.json
15. playwright.config.ts

작업 시작 전:
- 현재 main worktree의 status, staged diff, unstaged diff를 저장한다.
- 기존 dirty 파일을 revert/delete/stage하지 않는다.
- HEAD와 origin/main을 확인한다.
- 현재 worktree에서 npm install, clean, package rollback을 하지 않는다.
- 격리 worktree와 별도 npm cache/build output을 사용한다.
- 이전 audit 결과를 이번 실행 결과처럼 표현하지 않는다.

1단계: 환경 두 개 고정
A. clean tracked environment
- commit a9ae10e 또는 작업 시작 시 origin/main의 동일 commit
- 해당 commit의 package.json/package-lock.json
- npm ci

B. dependency candidate environment
- A와 같은 base commit
- 현재 dirty worktree에서 package.json, package-lock.json, playwright.config.ts, Node/CI runtime 관련 후보만 별도 patch로 적용
- 제품 app/components/lib/docs 변경은 적용하지 않음
- npm ci

각 환경에서 아래를 기록한다:
- commit
- Node/npm 버전
- package/lock hash
- Next/React/Playwright 버전
- OS/timezone
- install command와 exit code

2단계: 동일 command matrix
각 환경에서 순서대로 실행한다:
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- npm.cmd run test:e2e
- git diff --check

실패하면 같은 환경에서 1회만 clean reinstall/retry하고, 첫 결과와 retry를 둘 다 기록한다. 제품 코드를 고쳐 통과시키지 않는다.

3단계: finding 재현
모바일 390x844, wide 1024x768에서 아래를 동일 fixture로 확인한다.

1. KST 오전 local date가 전날로 잡히는지
2. 반복 preview 회차 수와 My Flow/Calendar/ICS 회차 수
3. 반복 Today의 동일 occurrence 중복 control
4. 메모 split calendar/todo Item 전체 visibility/export
5. 개별 date override의 Today summary/full list/Calendar/ICS 일치
6. reuse keep_fixed_dates와 reset_to_anchor 결과 차이
7. 빈 miss draft 생성 여부
8. /flows hard navigation/reload
9. 저장 직후 /my hydration

각 finding은 아래를 기록한다:
- route, viewport, fixture, initial storage
- action steps
- expected/actual
- reload result
- localStorage/DOM/accessibility/export evidence
- screenshot
- environment

4단계: Vercel access
- 제공된 preview URL을 signed-out/anonymous request로 확인한다.
- 200 app, 302 auth, 401/403, unavailable 중 하나로 분류한다.
- 로그인이나 protection 설정 변경은 하지 않는다.
- source commit/deployment ID를 확인할 수 없으면 blocked로 기록한다.

5단계: 분류
각 finding을 하나로 고정한다:
- confirmed_clean: clean tracked environment에서도 재현
- dirty_only: dependency candidate에서만 재현
- not_reproduced: 두 환경에서 재현 안 됨
- blocked: 실행 조건 부족으로 판단 불가

추정 원인과 확인 사실을 분리한다.

6단계: 다음 slice 선택
선택 규칙:
1. data loss/incorrect date/incorrect occurrence
2. save/hydration/route blocking
3. duplicate or hard-to-reverse interaction
4. visual simplification

한 번에 하나의 /goal만 작성한다. 여러 bug를 묶지 않는다.

산출물:
docs/content-audit/2026-07-14-p24-00r-baseline-reconciliation/
- README.md
- audit.md
- environment-matrix.json
- reproduction-matrix.json
- command-results.json
- next-goal.md
- screenshots/

앱 코드 변경 금지:
- app/
- components/
- lib/
- 저장/export schema
- UI copy/layout

검증:
- 생성 JSON parse
- npm.cmd run docs:check
- git diff --check
- current main dirty worktree가 시작 전과 비교해 이번 산출물 외에 변하지 않았는지 확인

완료 기준:
- clean/dirty 결과 차이가 재현 가능한 환경 정보로 설명된다.
- 모든 주요 finding이 네 상태 중 하나로 분류된다.
- Vercel 관찰 URL의 익명 접근 상태가 기록된다.
- 제품 코드를 수정하지 않는다.
- 다음 첫 code fix /goal이 하나로 정해진다.
- 이번 산출물만 별도 commit하고 push한다.

최종 응답:
- 두 환경의 command 결과
- finding별 분류
- Vercel access 결과
- 가장 먼저 고칠 한 항목과 이유
- 변경 파일
- 검증
- commit/push 상태
- 남은 blocked risk
를 요약한다.
```
