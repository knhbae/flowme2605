# 담당표

여러 세션이 동시에 일할 때 쓰는 경로가 겹치지 않게 한다. 세션은 시작할 때 이 표와 [지금 FlowMe](now.md)를 먼저 읽는다.

| 담당 | 맡은 일 | 단독으로 쓰는 곳 | 상태 |
| --- | --- | --- | --- |
| 총괄 Claude (총괄 세션) | 계획·설계·배포 판단·위임, 위키, R4·R6a 구현 | `D:/flowme2605/flow-wiki` 의 `docs/wiki/**`, R4 worktree `D:/flowme2605/flow-alpha-r4-20261029` (브랜치 `agent/alpha-r4-busy-intent-20261029`), R6a `D:/flowme2605/flow-alpha-r6a-20261030` (브랜치 `agent/alpha-r6a-status-20261030`, R5 위), R4 원장 `…-01a168e3/revision4/` | 활동 |
| 개발 세션 (Claude) | `main` 최신화 + 범위 인식 푸시 전 훅 → PR #220, `main` 의존성 보안 패치 → 별도 PR | `D:/flowme2605/flow-main-catchup-20261029` (브랜치 `agent/main-catchup-scoped-hook-20261029`), `D:/flowme2605/flow-main-deps-20261029` (브랜치 `agent/main-deps-audit-20261029`), E2E 시계 고정 `D:/flowme2605/flow-e2e-clock-pin-20261029` (브랜치 `agent/e2e-clock-pin-20261029`), R5 `D:/flowme2605/flow-alpha-r5-20261029` (브랜치 `agent/alpha-r5-ux-20261029`, R4 `c37dbcab` 위, 로컬 커밋만), S1 `D:/flowme2605/flow-alpha-s1-20261030` (브랜치 `agent/alpha-s1-writing-20261030`, R5 위), R9a `D:/flowme2605/flow-alpha-r9a-20261030` (브랜치 `agent/alpha-r9a-tokens-20261030`, R5 위), S2 `D:/flowme2605/flow-alpha-s2-20261030` (브랜치 `agent/alpha-s2-enter-20261030`, S1 위) | 10/30 활동 (#220 머지로 자동 보관됐다가 다시 엶) |
| 기획 세션 (Claude) | 저장소 정리 결정안·기능 요구사항 검토·자료 위험 명세·쓰기 A 기획과 구현 명세(전달함), 누락 기능 점검(10/30) | `D:/flowme-claude-scratch/planning/` 만. repo·GitHub는 읽기 전용 | 10/29 활동 |
| UX 세션 (Claude) | UX 개편 R5~R9b 설계(전달함), 쓰기 A 화면 흐름(전달함), 누락 기능 러프 UX(10/30) | `D:/flowme-claude-scratch/ux/` 만. 코드는 읽기 전용 | 10/30 활동 |
| 기타 세션 (Claude) | 저장소 정리안 v2 실행(사용자 승인 10/29), 이어서 worktree 보관 명세 | `D:/flowme-claude-scratch/misc/`, `repo-bundle-20261029/`, `main-checkout-uncommitted-20261029/`, `codex-archive-zst-66/`, `codex-archive-originals/` 삭제, 메인 체크아웃의 git ref(태그, 승인 명단의 브랜치 삭제, `refs/archive/pull/*`), GitHub PR 10개 닫기·원격 태그 30·원격 브랜치 210 삭제. worktree 제거는 안 함 | 10/29 활동 |
| 코덱스 총괄 스레드 `01a168e3-1e7c-7800-bda6-c05c355a0068` | 조사·테스트·리뷰, Supabase 읽기 (기본 읽기 전용) | `D:/flowme-<주제>-<날짜>-01a168e3/`, inbox 회신 | 활동 |
| Dot (코덱스, 클라우드 크롬) | 합성 문서 화면 테스트 | 테스트 계정의 합성 문서, 결과는 총괄 스레드 경유 | 10/29 활동 |
| 개발3 (10/26 구조, 코덱스) | 원문 복귀 후보 통합 | 과제 원장의 `revision*/candidate`, `development` | 원장상 소유, 현재 활동 미확인 |
| 메인 체크아웃 미커밋 237경로 | 10/26 이전 세션들의 작업 | 없음 (동결) | 정리 결정 전 수정·커밋 금지 |

## 규칙

0. PR·코드 리뷰는 기본으로 코덱스 총괄 스레드에 읽기 전용으로 맡긴다. 다른 Claude 세션이 만든 PR도 같다 (사용자 10/29).

1. 활동 중인 행끼리 쓰는 경로가 겹치면 안 된다. 총괄이 새 행을 넣기 전에 확인한다.
2. 행이 없는 세션은 쓰지 않는다. 읽기는 누구나 한다.
3. 끝난 행은 지우지 않고 상태를 "종료 10/30"처럼 바꾼다.
4. 새 세션을 띄울 때 총괄이 이 표에 행을 먼저 넣고, 위임 프롬프트에 쓰는 경로를 적는다.
