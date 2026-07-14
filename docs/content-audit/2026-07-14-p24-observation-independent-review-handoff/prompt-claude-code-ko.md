# Claude Code 복붙용 프롬프트

/goal

D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
FlowMe P24를 clean origin/main과 동일 lockfile에서 독립 회귀 감사한다. 과거 dirty dev 환경에서 나온 finding과 현재 clean production을 섞지 말고, 이전에 논쟁이 있었던 build·날짜·반복·draft 포함·hydration·재사용 문제를 재현 중심으로 판정한다. 앱 코드는 수정하지 않는다.

공개 production:
https://flowme2605.vercel.app

필수 자료:
- AGENTS.md
- agent.md
- docs/harness/README.md
- docs/STATUS.md
- docs/content-audit/2026-07-14-p24-observation-independent-review-handoff/README.md
- docs/content-audit/2026-07-14-p24-observation-independent-review-handoff/review-checklist-ko.md
- docs/content-audit/2026-07-14-claude-code-p24-observation-audit/README.md
- docs/content-audit/2026-07-14-codex-p24-00a-journey-audit/README.md
- docs/content-audit/2026-07-14-flowme-p24-feedback-reconciliation/reproduction-matrix.json
- docs/content-audit/2026-07-14-p24-00ops2-controlled-dependency-upgrade-evidence/README.md
- docs/content-audit/2026-07-14-p24-00b2-production-design-readiness/route-evidence.json

환경 규칙:
1. git fetch 후 origin/main SHA를 고정한다.
2. 기존 변경이 있으면 별도 clean worktree를 사용한다.
3. npm.cmd ci로 tracked lockfile을 설치한다.
4. Node, Next, Playwright, PostCSS 버전을 기록한다.
5. dev와 production build 결과를 분리한다.
6. Vercel branch preview가 보호되면 production alias만 사용한다.
7. 자동 browser 세션을 observed user로 집계하지 않는다.

반드시 재검증할 이전 논쟁 항목:
- build가 Collecting page data에서 실패하는가
- /flows 직접 진입·새로고침이 무한 loading인가
- public 저장 직후 /my가 refresh 없이 hydrate되는가
- KST 오전 local date가 하루 전으로 계산되는가
- item date override를 My Flow summary가 무시하는가
- 재사용의 날짜 유지 선택이 실제 새 run에 전달되는가
- 반복 Flow가 첫 회차만 My Flow·Calendar·ICS에 남는가
- 메모 split의 todo Item이 My Flow·Flow-level export에서 누락되는가
- 빈 miss가 상태 문장을 Flow/Item 제목으로 저장하는가
- source-backed와 personal draft의 구조 편집 경계가 유지되는가

Claude Design (8) 구조 회귀:
- A progressive editor
- B inline completion undo
- C Calendar unscheduled tray
- D whole/selected/current export scope
- E linked/fixed date movement
- F one occurrence/one executable control
- G inline private/correction notes and completion aggregation

검증:
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- 관련 targeted E2E
- 전체 E2E는 bounded shard 또는 단일 worker로 실행하고 distinct test 수를 기록
- 390x844, 1024x768 production screenshot과 DOM/console/overflow 확인
- ICS와 checklist/sheet/memo 실제 다운로드 또는 clipboard 결과 확인
- git diff --check

분류:
- confirmed_current
- not_reproduced_current
- environment_specific
- prior_artifact_only
- blocked

산출물:
docs/content-audit/2026-07-14-claude-code-p24-clean-independent-regression/
- README.md
- audit.md
- reproduction-matrix.json
- route-evidence.json
- screenshots/
- downloads/

완료 기준:
- 모든 논쟁 항목에 current clean 판정이 있다.
- 실행한 명령과 실행하지 못한 명령이 분리된다.
- 앱 코드가 변경되지 않는다.
- 실제 사용자 관찰은 0/15 그대로 유지한다.

최종 응답:
환경, 현재 SHA, findings, 논쟁 항목 판정, A~G 회귀, 테스트, production 상태, 앱 코드 무변경, commit/push 상태를 요약한다.
