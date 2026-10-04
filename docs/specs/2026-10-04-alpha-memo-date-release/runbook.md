# 개발계 전환·복귀 준비 계획

2026-10-04. **사용자가 선별 게시·CI·DEV/자동 시작·복귀·운영 협업 범위를 승인했다.** 실행은 같은 commit의 CI·exact QA·새 준비 사본의 모의 검사와 fresh 운영 신원 대조를 통과한 뒤에만 한다. 승인 없이 이 문서만으로 실행하지 않으며 현재 제공CP2 작업본 및 원시 운영 receipt를 덮어쓰지 않는다.

## 현재 제공본과 보호 대상

- DEV/복귀 root: `D:/flowme2605/flow-ux-comparison-gaps-20261002`, HEAD58df, build `zmK_7Oh9wTK9_B0g6mhnS`. 기존non-cache317파일을 보존하고 그 root에서 build/install을 하지 않는다.
- 현재 startup root: `D:/flowme2605/_codex_temp/alpha-startup-20261003/`. Task `\FlowMe Alpha AutoStart`는 `start-alpha.ps1`을 실행하며 manifest·supervisor guard로 앱과 기존 Tunnel을 관리한다.
- 현재 manifest SHA `1ebc6369455c906543bca54f1f33d57abaf14b5d018d473ef9d7434bfa77b269`. 04:53~04:58 UTC의 관리 세대/포트/guard/Task 관측은 [QA](qa.md)에 있다. 실행 직전 fresh 조회가 필수다.
- 계정/DB/Auth·settingsRoot·DNS·Tunnel의 설정 및 자격정보·Task 정의·관리 코드·나머지 보호파일을 보존한다. 필요한 중단/재기동은 정확 현재 actor만 정상 절차로 수행한다.

## 기존 운영 도구를 바로 실행하지 않는 이유

기존 `.tmp/manual-core-journeys-release-20261003/manual-dev-supervisor.ps1`은 `StartCp1/RestoreD1cc/StartCp2/RestoreCp1` 대상과 profile·CI·F2·frozen·QA30/35·승인 reference에 고정돼 있다. `approved-ops-20261004/hold-legacy.ps1`은 원래d1cc의 PID/birth 및 이전 manifest SHA에 고정돼 있다. 현재 관측 PID를 상수로 바꾸거나 guard를 삭제해 재사용하지 않는다.

새 준비 사본은 **현재 frozen CP2 ↔ 새 memo-date 후보** 두 대상만 다룬다. `.tmp/manual-memo-date-release-20261004/`는 새 준비 디렉터리의 예정 경로다. 실제 생성/검사는 승인 뒤 수행하고, 과거 scripts/receipt와 정확 실행 수를 그대로 보존한다.

## 준비 사본에서 연결할 것

1. 선별 commit 이후 clean HEAD·같은 HEAD의 필수 CI·새 build·compile/runtime/QA/static 입력 SHA·QA 결과 SHA를 핀으로 연결한다. 이전58df의 CI나 dirty 후보를 새 게시 판본으로 등록하지 않는다.
2. 현재CP2의 clean root·frozen build/protected inputs와 기존 복귀 receipt를 읽기 전용 연결한다. 과거25commit/CP1 또는 원래d1cc를 이번 복귀 대상으로 바꾸지 않는다.
3. current manager status/CIM/native handle로 새 관리 세대·부모자식·포트 소유와 명령을 확보한다. PID/birth·실행파일·parent·port 중 하나라도 다르면 중단한다.
4. 새/기존 대상의 전환·복귀·최종 인계 원장, 정확 GET collector, 단일 실행 소유자와 이번 승인 reference를 연결한다. native 종료/정리 공통 guard를 완화하지 않는다.
5. 순수·모의 도구 검사로 경합·PID 재사용·미정리·이미중단·다른판본·다른계정/경로·취소를 먼저 확인한다. 실제 전환은 검사 통과 뒤에만 한다.

실제 자동 시작 manifest의 예상 최소 diff는 `appRoot`, `buildId`, 앱 guard4개의 경로 및 BUILD_ID hash다. 현재 후보 기준 나머지 앱guard3개의 hash는 기존과 같다. settingsRoot·나머지guard7개·Task XML·manager 코드 변경 필요성은 이번 읽기 감사에서 발견하지 못했다. 게시 후 새 exact 후보에서도 다시 확인하며 필요 범위가 달라지면 영향과 최소 승인 범위를 보고한다.

## 승인 후 실행 순서

| 순서 | 행동 | 성공/중단 조건 |
| --- | --- | --- |
| 1 인수 | 운영 세션01a10108-d468-7851-a7c9-9a0375dbe158에 현재 대상·승인 범위·receipt·복귀 계획 전달 | 접수/실제 수신/응답을 구분, 다른 실행자와 동시 제어하지 않음 |
| 2 직전 대조 | 현재 세대·Task definition·guard11·CP2 frozen·새clean HEAD/CI/build/QA 확인 | 이전 snapshot만으로 프로세스 제어하지 않음 |
| 3 보류/정리 | Task의 향후 실행과 live manager retry를 함께 보류하고 정확 현재 actor를 정상 종료 | Task 비활성만으로 live retry가 멈췄다고 판단하지 않음. 3105/13105 및 대상 actor 부재 확인, cleanup=UNCONFIRMED이면 새 기동 금지 |
| 4 후보 전환 | 승인된 새 후보를 관리형 준비 절차로 기동 | local/external Flight build·자산SHA·health/auth경계 일치, 다른QA서버 무변경 |
| 5 실제 복귀 | 후보를 정상 정리하고 기존CP2·기존자동 시작 대상으로 복귀 | 기존exact build/자산·protected inputs 일치. 오류 시 임의PID종료·Task주기/guard완화 금지 |
| 6 최종 인계 | 새 후보 재진입, 앱대상 manifest 갱신, 기존Task/동일관리 설정 재활성 | 새 관리 세대·manifest·실제 제공 후보 일치, 이전판본 자동재시작 방지 |
| 7 최소 회복/마감 | 승인 범위의 정확 앱 정상 재시작 1회와 같은 후보 회복 확인, 최종 receipt/공개요약 | 새 generation/정확서비스 확인. 실제 재부팅/절전 시험으로 표현하지 않음 |

서비스 전환 중에는 `alpha.wikiplans.com/alpha`가 잠시 응답하지 않을 수 있다. 실제 실행 직전에 시작·대상·복귀 가능 상태를 사용자에게 알린다. 현재 Tunnel의 설정/credentials는 그대로 두며 관리 절차가 필요한 정확 기존 actor의 정상 재기동과 새 Tunnel 생성/설정 변경을 구분한다.

## 관측 및 오류 경계

기존 `approved-ops-20261004/stage-collector/stage-collector.mjs`의 고정 GET 관측을 새 exact 대상 준비 사본에 연결한다. 이번 읽기 감사는 로컬/외부 Flight build·각26자산SHA·health·무인증catalog/media401을 직접 확인했다. `scripts/alpha/cloudflare-release-probe.ts`는 GET 이외 인증없는 POST도 포함하므로 읽기 전용 확인으로 실행하지 않는다.

실계정 session/token을 이 브라우저 시험에 제공하지 않는다. 합성 QA는 신규격리 browser profile과 Auth/API 차단 후 고정 localhost GET만 전달한다. DEV 확인은 인증 없는 고정 GET/거절 경계로 제한하고 저장/복원/공개writer를 호출하지 않는다.

실제 재부팅·로그아웃/로그인·절전복귀·Tunnel장애주입·실기기/IME/AT·관찰사용자는 NOT_RUN이다. 이전 운영 마감의 회복15.3915549초와239PASS를 새 후보 회복 결과로 재사용하지 않는다.
