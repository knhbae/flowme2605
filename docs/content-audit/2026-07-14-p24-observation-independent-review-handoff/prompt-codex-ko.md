# Codex 복붙용 프롬프트

/goal

D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
FlowMe P24의 최신 production과 origin/main을 독립적으로 검토한다. 앱 기능을 먼저 수정하지 말고, correctness·상태 정합성·사용자 여정·접근성·모바일/와이드 품질을 현재 실행 결과로 다시 확인한다. 이전 P24 evidence는 비교 자료로만 사용하며 실제 사용자 관찰로 계산하지 않는다.

공개 서비스:
https://flowme2605.vercel.app

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/STATUS.md
5. docs/content-audit/2026-07-14-p24-observation-independent-review-handoff/README.md
6. docs/content-audit/2026-07-14-p24-observation-independent-review-handoff/review-checklist-ko.md
7. docs/content-audit/2026-07-14-p24-00b2-production-design-readiness/README.md
8. docs/content-audit/2026-07-14-p24-00b-observed-user-test-guide/README.md
9. docs/content-audit/2026-07-14-flowme-p24-feedback-reconciliation/backlog.md
10. FlowMe UXUI 전체 검토 (8).zip 안의 FlowMe UX 개선안 목업 + 코멘트.dc.html

작업 시작 전:
- git fetch 후 origin/main의 정확한 SHA를 기록한다.
- 기존 worktree가 dirty면 최신 origin/main에서 clean worktree를 만든다.
- package-lock.json을 그대로 사용한다.
- 이전 테스트 결과를 이번 실행 결과처럼 쓰지 않는다.
- 제품 수정, dependency 변경, 문서 상태 변경을 하지 않는다.

독립 검증 범위:
1. KST local date와 Today·Calendar·새 일정 기본 날짜
2. 개별 날짜 override의 My Flow 요약·전체 목록·Calendar·ICS 일치
3. Flow 재사용 시 내가 바꾼 날짜 유지와 anchor 재계산 분리
4. 반복 Flow의 preview·My Flow·Calendar·ICS 회차 일치와 회차별 완료/재개
5. 메모 draft 분할 항목 전체 표시·export 포함, 빈 miss 저장 차단
6. /flows hard navigation·reload와 public 저장 후 /my hydration
7. Claude Design A~G: progressive editor, 완료 undo, 날짜 없는 Calendar tray, export scope, 날짜 이동 범위, one occurrence/one control, 단계별 메모
8. public /f 저장 전 preview와 저장 후 completion 경계
9. 모바일 390x844와 wide 1024x768의 overflow·고정 UI overlap·console error
10. 완료·열기·수정·삭제·이동·export accessible name과 keyboard 조작

검토 시나리오:
- 기준일 역산형: 이사 준비 저장 → 이사일 변경 → 개별 날짜 고정 → 완료·취소 → 전체 export → 다시 쓰기
- 날짜 없는 체크형: 차량 점검 public 저장 → Calendar에서 날짜 배치 → 완료·취소 → 선택 export
- 반복 루틴형: 운동/청소 반복 설정 → 회차 확인 → 한 회차 완료·재개 → Calendar·ICS 비교
- 개인 draft형: 메모/URL miss → 여러 항목 저장 → add/delete/restore/reorder → 날짜·시간·반복 → export
- public 재사용형: preview → 저장 → 실행 → 단계 메모 → 회고 → 재사용

현재 명령으로 실행:
- npm.cmd ci
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- 관련 targeted Playwright E2E
- 가능하면 npm.cmd run test:e2e, 불가능하면 이유와 실행한 shard를 정확히 기록
- production route browser inspection과 screenshot
- git diff --check

결과 규칙:
- findings를 severity 순으로 먼저 쓴다.
- 각 finding에 route, viewport, 재현 순서, 기대/실제, evidenceKind를 포함한다.
- current command, current browser, prior artifact, heuristic, observed user를 구분한다.
- 자동화·시뮬레이션을 실제 사용자 관찰로 표현하지 않는다.
- 문제가 없으면 검증 공백과 잔여 위험을 명시한다.
- 검토 중 앱 코드를 수정하지 않는다.

산출물:
docs/content-audit/2026-07-14-codex-p24-independent-production-review/
- README.md
- audit.md
- route-evidence.json
- journey-results.json
- screenshots/

최종 응답:
현재 SHA, production 접근, findings, A~G 판정, 검증 결과, 실제 사용자 확인이 필요한 질문, 앱 코드 무변경, commit/push 상태를 요약한다.
