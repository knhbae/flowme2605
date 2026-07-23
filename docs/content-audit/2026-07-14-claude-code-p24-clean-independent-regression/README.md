# P24 clean 독립 회귀 감사 (Claude Code)

FlowMe P24를 **clean origin/main + tracked lockfile**에서 독립 회귀 감사한 결과다. 과거 dirty dev 환경의 finding과 현재 clean production을 분리하고, 이전에 논쟁이 있던 build·날짜·반복·draft 포함·hydration·재사용 문제를 재현 중심으로 판정했다. 앱 코드는 수정하지 않았다.

- **증거 등급:** `automated_simulated` (실제 사용자 아님)
- **실제 사용자 관찰:** 0 / 15 (변동 없음)
- **제품 기준선:** origin/main `1f0361209fac3cdd85c67cf64496ff5d5dd9fb9d`
- **공개 production:** <https://flowme2605.vercel.app> (익명 200)

## 한 줄 결론

이전 dirty 세션에서 Blocking으로 올렸던 build·날짜·반복·draft·hydration·재사용 문제는 **clean origin/main에서 전부 재현되지 않는다.** 각 항목에 대응하는 fix 커밋과 통과하는 자동 회귀가 존재한다. 전체 E2E의 2건 실패는 제품 회귀가 아니라 **날짜 고정 test fixture**(수정이 이미 별도 브랜치에 존재)다.

## 파일

1. [audit.md](./audit.md) — 환경 정정, 검증 결과, 논쟁 항목·A~G·새 finding 상세 판정
2. [reproduction-matrix.json](./reproduction-matrix.json) — 논쟁 항목별 분류(confirmed_current / not_reproduced_current / environment_specific / …)와 근거
3. [route-evidence.json](./route-evidence.json) — production route × viewport 응답·overflow·console, 저장·export 산출물, 명령 증거
4. [screenshots/](./screenshots/) — production 6 route × 2 viewport (390x844, 1024x768) 12장
5. [downloads/](./downloads/) — production 실제 export: whole ICS(5 VEVENT), checklist·sheet·memo

## 검증 요약 (clean, 이번 실행)

| 명령 | 결과 |
| --- | --- |
| docs:check | pass (14 files, 2,214 links) |
| npm test | pass 514 / 514 |
| npm run build | pass, 18/18 static pages |
| targeted E2E (p24-execution-trust) | pass 14 / 14 |
| 전체 E2E (single worker) | 272 passed, 2 failed / 274 distinct (실패 = 날짜 fixture) |
| production 화면 | overflow 0px, console error 0 (12/12) |
| git diff --check | clean, 앱 코드 무변경 |

## 분류 규칙

- `confirmed_current`: clean에서 재현됨
- `not_reproduced_current`: 이전 논쟁이 clean에서 재현되지 않음(정상 동작 확인)
- `environment_specific`: 커밋된 제품 코드가 아니라 환경 조건(dirty 의존성, wall-clock, 디스크)에서만 발생
- `prior_artifact_only`: 이전 산출물만 존재, 이번에 독립 재실행 안 함
- `blocked`: 런타임·route·배포·fixture 부재

## 주의

- 자동 assertion과 production 관찰은 operability를 증명하지만, 사용자가 설명 없이 발견·이해한다는 사실은 증명하지 않는다.
- 이전 세션(dirty dev, prior package) 수치를 이번 실행 결과로 대체하지 않았다.
- 이 감사는 clean detached worktree(`D:/flowme2605/.tmp/flowme-p24-clean-1f03612`)에서 수행했고, 기존 dirty 파일을 stage·revert·삭제하지 않았다.
