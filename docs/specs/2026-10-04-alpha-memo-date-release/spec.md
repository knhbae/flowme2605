# 개인 문서 메모·날짜 후보의 개발계 반영

2026-10-04. 사용자 ‘다음 목표 잡고 ㄱㄱ’로 착수했다. 개발 목표는 직전 검증 후보를 선별 게시하고 CI·정확 후보 검증을 거쳐 `alpha.wikiplans.com/alpha` 개발계에 반영하는 것이다. **사용자가 36파일 선별 commit·push·Draft PR·해당 비공개 CI·운영 협업·개발계 교체와 복귀 요청에 ‘승인’이라고 답했다. 해당 범위로 재개한다.**

현재 상태: 승인으로 goal active·미완료다. 05:14:31 UTC의 blocked는 승인 전 이력이며 [승인 대기 감사](tasks.md#승인-대기-감사--blocked미완료)에 보존한다. 현재 base·소유집합·hook·자동배포·운영 세대를 fresh 대조하고 아래 완료 기준을 그대로 수행한다.

## 방향과 대상

v4.1 개인 실행·개발1 공개 콘텐츠 활용·개발2 문서 작성의 세 결과물을 목적별 선택 경로로 연결한다. 현재는 방향 탐색과 UX 개선 단계이며, 사람 대상 시험을 이번 목표의 완료 조건으로 넣지 않는다. 이번 반영은 메모 owner·이어쓰기 안내, 날짜 출처·실행 날짜 안내, 시간만 바꿀 때의 기존 날짜 고정 안내에 한정한다. 새 문법·writer·schema·영구 날짜 정책을 추가하지 않는다.

- 후보: `D:/flowme2605/flow-personal-memo-date-20261004`. 기준 HEAD `58df6bff7c1de4af6c88b38ce15a78bf355fa5f6`, [직전 소유 30경로](../2026-10-04-personal-memo-date-ux/ownership.md).
- 현재 DEV 및 복귀 대상: `D:/flowme2605/flow-ux-comparison-gaps-20261002`, 같은 HEAD의 build `zmK_7Oh9wTK9_B0g6mhnS`. 현재 제공 작업본을 수정하거나 다시 빌드하지 않는다.
- `D:/flowme2605/flow-mvp`의 dirty/untracked는 미소유다. 직접 피드백 원문과 원시 근거는 읽기만 한다.
- 기존 PR210의 head 위에 새 Draft PR을 쌓는 계획이다. `origin/main`에는 병합하지 않는다. 실제 실행 직전 base/head 및 원격 drift를 다시 확인한다.

## 승인 요청 범위

직전 소유 30경로와 이번 게시·검증 문서만 선별 commit·push·Draft PR·해당 정확 commit의 검토된 비공개 catalog CI를 수행한다. 모두 통과한 뒤 개발계 앱 및 자동 시작 대상을 새 후보로 전환하고 기존 CP2 복귀·후보 재진입을 검증한다. 운영 세션 `(운영) 서버관리 등`과의 협업 전달을 포함한다. 승인 자체와 실제 메시지 접수·응답·운영 실행을 따로 기록한다.

이 요청은 실계정 입력·자료 변경, DB/Auth/DNS/Tunnel 설정, main merge, Production, Render/Vercel 외부 배포를 허용하지 않는다. 자동 시작 대상 갱신은 앱 판본 교체에 필요한 최소 변경만 허용 대상으로 요청했다. Task 주기·보안 guard·관리 포트·Tunnel 설정의 완화는 포함하지 않는다.

## 완료 기준

1. 선별 allowlist가 실제 변경 경로와 일치하고, 원시 증거·봉인 pack·자격정보가 공개 Git에 포함되지 않는다.
2. 정상 Git hook을 우회하지 않는다. 보안·출처·문서·기존 테스트·production build를 검사한다. 출처 날짜만 바꾸는 통과 처리는 하지 않는다.
3. 새 정확 commit의 필수 CI가 성공한다. 과거 CP2의 성공을 새 commit 결과로 사용하지 않는다.
4. 게시 후 정확 build에서 메모·날짜 합성 앱 시나리오와 다섯 viewport를 다시 확인한다. 이전 미커밋 후보의 실행 수와 새 실행 수를 구분한다.
5. 현재 관리 세대·process tree·port owner·자동 시작 대상·build를 전환 직전에 대조하고, 불일치하면 중단한다. 과거 PID/receipt를 재사용해 프로세스를 추측하지 않는다.
6. 새 DEV의 로컬/외부 GET·참조 자산·auth 경계·자동 시작 대상과 복귀를 확인한다. 실계정 인증/API 전달 없이 검사하며 DB 불변의 범위를 과장하지 않는다.
7. 결과, 실제 검사 수, commit/push/PR/CI/DEV, 미실행 및 잔여 정책을 별도로 보고한다. 실제 재부팅·IME/AT·실기기·관찰 사용자 검증은 실행하지 않으면 NOT_RUN이다.

## 범위 밖 잔여

[직전 요구 대조](../2026-10-04-personal-memo-date-ux/requirements.md)의 MD07 기간/원 피드백 사례·선택기, MD08 자유 문구/미정 정책, MD09 부분 붙여넣기·취소·반복 범위, PC03/04 복제·반복·due는 이번 선별 반영의 숨은 선행 조건이 아니다. 원래5D/F6~F10과 운영·실기기 후속도 별도 원장에 유지한다.

정본: [계획](plan.md)·[작업](tasks.md)·[QA](qa.md)·[선별 manifest](manifest.md)·[전환/복귀 계획](runbook.md).
