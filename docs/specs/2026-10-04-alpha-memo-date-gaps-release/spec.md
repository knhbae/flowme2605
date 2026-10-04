# 메모·날짜 후속 갭 후보의 선별 게시·개발계 반영

2026-10-04. 직전 [후속 갭 결과](../2026-10-04-memo-date-feedback-gaps/results.md)의 26파일을 새 release 작업본에서 인수하고, 같은 판본의 CI·QA를 거쳐 기존 개발계 앱과 자동 시작 대상을 맞추는 목표다. 개인 텍스트 계획·공유 경험/지식·선택 참여의 방향을 유지한다. 전체 UX 완성이나 새 제품 정책을 이번 반영의 조건으로 붙이지 않는다.

현재 승인: 사용자가 이번32파일 게시·해당 비공개CI·운영 협업·DEV/자동시작 전환·복귀 질문에 직접 ‘승인!’으로 답했다. 승인 reference는 `user-20261004-memo-date-gaps-publish-dev`다. 로컬 준비와 검증을 인수해 선별 게시부터 순서대로 실행한다. 승인을 실행 성공으로 체크하지 않으며 이전 목표의 receipt를 새 완료 근거로 쓰지 않는다. 실제 승인·실행·완료 상태는 [QA](qa.md)에 기록한다.

## 대상과 기준선

| 대상 | 식별자와 경계 |
| --- | --- |
| 인수한 구현 후보 | `D:/flowme2605/flow-memo-date-feedback-gaps-20261004`. 착수 HEAD `df0670f8086977d9777952e1e5cafb42096effe8` 위의 소유26파일. 원본 후보를 수정하거나 stage하지 않는다. |
| 새 release 작업본 | `D:/flowme2605/flow-memo-date-gaps-release-20261004`. 같은 HEAD에서 clean 생성한 뒤 소유26파일만 인수했다. 현재 dirty는 승인 검토용 소유 입력이며 clean 게시 HEAD로 표현하지 않는다. |
| branch / PR base | local head `agent/alpha-memo-date-gaps-release-20261004` 생성 확인. 새 Draft PR base 계획은 `agent/alpha-memo-date-release-20261004` / [PR211](https://github.com/knhbae/flowme2605/pull/211). 새 commit/원격 branch/PR은 미실행이며 게시 직전 원격 상태·base/head를 다시 확인한다. main merge는 제외한다. |
| main ancestry 기준 | 인수 기준에는 `efd8b642707b5c8e67b727f23169ae41c43cb5e8`의 main 변경이 포함돼 있다. 최신 원격 drift는 새 fetch/ancestor 대조로 확인하며 과거 조회만으로 현재 main과 같다고 주장하지 않는다. |
| 현재 DEV / rollback 기준 | `D:/flowme2605/flow-personal-memo-date-20261004`, HEAD `df0670f8086977d9777952e1e5cafb42096effe8`, build `h6dzC_Ix8aPXcsm-UC-Mb`. 현재 제공 root에서 build/install/edit하지 않는다. 실행 직전 실제 제공/자동 시작 신원을 fresh 대조한다. |

## 인수 범위

제품 변경은 날짜 바로가기의 지연 응답이 더 새 날짜·시간 입력이나 새 dialog를 덮지 않도록 `ProgramSpace`의 대상/입력/대화상자 세대를 확인하는 guard다. 저장 command·CAS·원문 모델·schema는 그대로다. 기존 지원인 문서/기간 날짜 변경, 정확 원문 복귀, 부분 선택 paste, dirty native Undo와 저장본 Undo/Redo, 거절 후 직접 재시도의 회귀·시나리오·검증 요약도 함께 인수한다.

[선별 manifest](manifest.md)는 후보26파일을 개별 인수하고 새 준비 문서6개를 더한32파일이다. STATUS·PROJECT_CONTROL·ROADMAP·specs README4개는 원래26파일 안에 있고 현재 목표의 진입점만 갱신한다. 원본 피드백·PDF/ZIP·계정·로그·bundle·capture·output·tmp·환경·의존성·빌드는 공개 대상이 아니다.

## 요청한 승인 범위와 제외

직접 승인된 범위는 allowlist32파일의 선별 commit/push/Draft PR, 해당 정확 HEAD의 검토된 CI, 검증된 새 앱 판본의 DEV 전환·실제 rollback·새 후보 재진입, 앱 판본에 필요한 자동 시작 대상/guard 정렬, 정확 앱의 최소 정상 재시작1회, 그 범위의 운영 담당 협업이다. 문서 작성이나 과거 승인이 아니라 이번 직접 응답을 따른다.

DB/Auth/DNS/Tunnel 설정·credentials·실계정 자료·운영 schema·기존 `/my` writer·main merge·Render/Vercel 배포·Production·실제 사람 시험은 제외한다. Task 주기·관리 코드·보안 guard·관리 포트 완화도 제외한다. 기존 Tunnel actor의 정상 lifecycle이 관리 절차에 필요하면 같은 설정·동일 소유 경계 안에서만 다루고, 새 Tunnel이나 DNS 경로를 만들지 않는다.

원 날짜 재복귀와 이번 race가 같은 원인이라는 판정, 원 PDF/ZIP 열람, native 날짜 선택기 popup, 실제 Android/iOS·IME·AT, 반복 한 회/전체·공통/회차 메모·독립 due·자유 문장 자동 날짜 정책은 이번 반영의 완료 주장에 포함하지 않는다. [26개 요구와 잔여](../2026-10-04-memo-date-feedback-gaps/requirements.md)를 그대로 유지한다.

## 완료 조건

1. 승인 상태와 공개/운영 범위를 확인하고, 32파일 집합·소유·비공개 제외·source bytes와 Git 정규화 인수를 대조한다.
2. 정상 hook을 우회하지 않고 새 작업본에서 보안·문서·표적 회귀·npm test·통합 typecheck·production build를 실제 실행한다.
3. 선별 게시 후 정확 HEAD의 필수 CI와 같은 source/build의 새 합성 앱43판정을 통과한다. 직전 미커밋 후보의 PASS나 build를 새 결과로 재사용하지 않는다.
4. fresh native 신원·manager generation·process tree·port ownership·현재 manifest와 rollback 보호 입력을 대조한다. 불일치나 cleanup 미확인이 있으면 전환하지 않는다.
5. 새 DEV 전환→현재 기준 rollback→새 후보 최종 인계, 자동 시작 대상 일치, 최소 앱 정상 재시작1회의 회복을 실제 receipt로 확인한다.
6. 로컬/외부 고정 GET·build/자산·health·무인증 거절 경계와 보호값을 확인하고 commit/push/PR/CI/DEV/자동 시작/rollback/재시작 상태를 각각 보고한다. 실제 운영 DB bytes를 직접 비교하지 않았다면 그렇게 주장하지 않는다.

정본: [계획](plan.md)·[작업](tasks.md)·[QA와 결과 원장](qa.md)·[manifest](manifest.md)·[전환/복귀 runbook](runbook.md). 결과를 위해 별도 `results.md`를 만들지 않는다.
