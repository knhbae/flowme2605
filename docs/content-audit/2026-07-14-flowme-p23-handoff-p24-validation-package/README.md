# FlowMe P23 handoff and P24 validation package

## 목적

P23까지 구현한 실행 라이프사이클을 현재 코드와 검증 결과 기준으로 한곳에 정리하고, P24를 기능 추가보다 실제 사용 관찰부터 시작할 수 있게 만든 handoff package다.

## 현재 판정

- 제품 코드 기준선: `c14c262` (`docs: close P23 lifecycle review`)
- 브랜치: `main`
- GitHub: `origin/main`과 제품 기준선 동기화 확인
- Vercel preview: <https://flowme2605-13grv45zl-flowme.vercel.app>
- P23 local MVP 실행 계약: 완료
- production release ready: 아니오
- 정식 관찰 사용자: 0명

P23은 개인 draft의 구조 편집, 날짜·시간·반복, 회차 상태, Calendar/ICS/list export, 회고와 다시 쓰기까지 로컬 실행 흐름을 연결했다. 다만 계정·DB·다른 기기 복원, source v2 merge 정책, 실제 사용자 관찰이 남아 있어 상용 출시 완료로 보지 않는다.

## 파일

1. [workboard.html](./workboard.html) - 현재 상태, 배포, 검증, 백로그를 한 화면에서 보는 한국어 보드
2. [current-state.md](./current-state.md) - 한 일, 확인된 기준선, 제한과 위험
3. [backlog.md](./backlog.md) - P24/P25 실행 순서와 단계별 완료 조건
4. [claude-code-test-prompt-ko.md](./claude-code-test-prompt-ko.md) - Claude Code에 그대로 붙여넣는 테스트 프롬프트
5. [release-status.json](./release-status.json) - 배포·Git·검증·백로그의 기계 판독용 요약

## 근거

- [P23 lifecycle closure review](../2026-07-13-p23-lifecycle-closure-review/README.md)
- [P23 detailed audit](../2026-07-13-p23-lifecycle-closure-review/audit.md)
- [P23 route evidence](../2026-07-13-p23-lifecycle-closure-review/route-evidence.json)
- [P23 screenshots](../2026-07-13-p23-lifecycle-closure-review/screenshots/)

## 증거 등급

- `current command`: 이번 마감 실행에서 직접 통과한 명령
- `current repo`: 현재 저장소에 존재하는 코드·테스트·evidence
- `preview deploy`: `c14c262` clean worktree를 Vercel에서 빌드한 결과
- `automated simulated`: 브라우저 자동화로 재현한 사용자 여정
- `observed user`: 실제 사람이 설명 없이 사용한 관찰 세션

자동 테스트나 persona simulation을 실제 사용자 검증으로 표현하지 않는다.

## Git과 merge 정책

현재 개발 방식은 `main` 직접 커밋·push다. 이 handoff package는 기존 dirty 파일을 stage하거나 되돌리지 않고 새 파일만 별도 커밋한다. 별도 PR을 만들지 않으므로 이번 package에 추가 merge 단계는 없다. GitHub PR 전체 상태는 로컬에 `gh` CLI가 없어 확인하지 않았으며, 현재 브랜치와 `origin/main`의 동기화만 Git으로 확인했다.

연결된 worktree 중 `codex/creator-channel-200-preview`는 이미 main에 포함됐고 clean이다. `codex/flow-20-content-ux`는 2026-05-21 tip이며 main보다 532커밋 뒤, 18커밋 앞인 오래된 clean branch다. 현재 P24 기준선에 자동 merge하지 않고 별도 scope audit 후 archive 또는 필요한 commit만 선별한다.
