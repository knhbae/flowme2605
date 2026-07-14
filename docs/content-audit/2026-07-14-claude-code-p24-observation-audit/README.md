# P24-00A 독립 관찰 QA — Claude Code 실행 결과

## 판정 (요약)

이번 실행은 **자동화 시뮬레이션(automated_simulated)**이다. 실제 사람이 참여하지 않았다. 5 persona × 3 session 프로토콜을 자동 브라우저로 실행해 발견성·상태 일관성·persistence를 검증했다.

가장 중요한 결과 두 가지:

1. **현재 dirty worktree의 `npm run build`가 실패한다.** 커밋되지 않은 `package.json`/`package-lock.json` 변경(Next.js 15.3.8 → 15.5.20 등)이 원인으로 보인다. 빌드가 실패하므로 `npm run start`와 `npm run test:e2e`도 실행할 수 없다.
2. **지정된 Vercel preview(`https://flowme2605-13grv45zl-flowme.vercel.app`)는 Vercel 로그인 벽(SSO deployment protection)에 막혀 전혀 접근할 수 없었다.** 로그인은 금지된 행동이므로 시도하지 않았다. 이번 QA는 **로컬 `npm run dev` 서버**를 대상으로 수행했다. `git diff --stat c14c262..HEAD -- app/ components/ lib/`가 빈 결과를 반환해 앱 소스 코드는 baseline과 동일함을 확인했지만, 의존성 버전과 빌드 산출물은 preview와 다르다.

이 두 가지 때문에 "preview 결과"라고 부를 수 있는 것은 없다. 모든 관찰은 **로컬 dev 서버 기준**이며, 이는 실제 Vercel preview 동작을 대체하는 근사치이지 동일물이 아니다.

## 읽는 순서

1. 이 파일 — 판정과 실행 조건
2. [audit.md](./audit.md) — 전체 findings, persona/session별 결과, 재현 절차
3. [workboard.html](./workboard.html) — 한국어 시각 보드 (findings + 수치 요약)
4. [journey-scorecard.json](./journey-scorecard.json) — persona/session별 supported/hidden/partial/missing/blocked 집계
5. [state-transition-results.json](./state-transition-results.json) — 공통 상태 전이 단계별 결과
6. [route-evidence.json](./route-evidence.json) — 라우트별 기계 판독 증거
7. [backlog-recommendation.md](./backlog-recommendation.md) — 즉시 수정 / 관찰 후 수정 / 보류 분류, P24-01A 착수 판단

## 실행 조건 기록

- branch: `main`, HEAD: `69768a1` (product baseline commit `c14c262`보다 문서 전용 커밋 2개 앞섬 — `git diff --stat c14c262..HEAD`가 `docs/content-audit/2026-07-14-flowme-p23-handoff-p24-validation-package/*` 6개 파일만 보고함)
- 커밋되지 않은 변경: `docs/content-audit/2026-07-14-claude-code-p24-observation-audit/`(이번 산출물), `.claude/launch.json`(브라우저 도구가 로컬 dev 서버를 열기 위해 이번 세션에서 새로 만든 설정 파일, 앱 코드 아님) 외에는 세션 시작 시점의 기존 dirty 파일 목록과 동일. 기존 dirty 파일을 revert/stage하지 않았다.
- 로컬 dev 서버: `npm run dev` (Next.js 15.5.20, 포트 3000). 세션 중 4회 재시작(초기 기동 1회 + dev 서버 내부 모듈 오류로 인한 재시작 3회, 아래 참고).
- `npm test`: 476/476 pass
- `npm run docs:check`: pass (14 required files, 2175 local links)
- `npm run build`: **실패** (exit 1). 2회 재현, 서로 다른 페이지 모듈에서 동일한 `PageNotFoundError: Cannot find module for page: ...` 패턴("Collecting page data" 단계).
- `npm run start` (production 서버): 실패 — `.next`에 유효한 빌드가 없어서 시작 자체가 안 됨.
- `npm run test:e2e`: **실행 불가.** Playwright `webServer`가 `npm run start`를 사용하므로 위 빌드 실패의 직접적 결과다. 이전 세션 결과를 이번 실행 결과로 대체하지 않는다 — 이번 세션에서는 단 하나의 e2e 테스트도 실행되지 않았다.
- `git diff --check`: 기존 dirty 파일들의 LF→CRLF 경고만 존재(이번 세션이 만든 문제 아님), 실제 whitespace 오류 없음.

## 산출물 경계

- `screenshots/` 디렉터리는 만들지 않았다. 사용한 브라우저 자동화 도구(`mcp__Claude_Browser__computer` screenshot 액션)가 이번 세션 내내 30초 타임아웃으로 실패해 PNG 파일을 저장할 수 없었다. 대신 모든 상태 검증은 `get_page_text`, `read_page`(접근성 트리), 그리고 `javascript_tool`을 통한 DOM/localStorage/네트워크 직접 조회로 수행했고, 각 finding에 재현 가능한 절차와 원문 텍스트 스냅샷을 남겼다. 이 한계는 [audit.md](./audit.md)에도 명시한다.
- `downloads/` 디렉터리도 비어 있다. ICS/백업 파일은 브라우저 blob으로 캡처해 내용을 직접 검증했지만(코드로 `URL.createObjectURL`을 가로채 텍스트를 읽음) 파일시스템에 저장하지는 않았다.
- persona별 "독립 browser context"는 별도 프로필이 아니라 **동일 브라우저 탭에서 세션 시작 전 `localStorage.clear()`**로 근사했다. 진짜 격리된 프로필은 아니므로 크로스-persona 오염 가능성은 낮지만 0은 아니다.
