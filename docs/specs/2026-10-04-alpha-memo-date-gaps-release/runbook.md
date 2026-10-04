# 개발계 전환·rollback·자동 시작 정렬 계획

2026-10-04. 사용자 직접 ‘승인!’으로 이번 게시/CI/협업/DEV 및 자동시작 전환·복귀 범위가 허용됐고 reference는 `user-20261004-memo-date-gaps-publish-dev`다. 실제 운영 실행은 아직 미착수다. 이 runbook 자체가 서버 제어 명령이나 검사 통과 근거는 아니다. [목표](spec.md)·[manifest32](manifest.md)·[QA](qa.md)에 같은 판본의 승인/검사/receipt를 연결한 뒤 단일 운영 실행자가 정상 guarded native 절차를 수행한다.

## 현재 제공·복귀 대상

- 현재 DEV 및 rollback root: `D:/flowme2605/flow-personal-memo-date-20261004`, HEAD `df0670f8086977d9777952e1e5cafb42096effe8`, build `h6dzC_Ix8aPXcsm-UC-Mb`. 해당 root에서 build/install/edit하지 않는다.
- 후보 준비 root: `D:/flowme2605/flow-memo-date-gaps-release-20261004`. 게시 후 clean exact HEAD·fresh build·fresh CI/합성 앱43·compile/runtime/QA/static 입력을 핀으로 연결한다. 이전 dirty 후보 build `lPblD_VvlR6bemR8EV0l1`을 새 제공 판본으로 등록하지 않는다.
- 기존 자동 시작 root는 `D:/flowme2605/_codex_temp/alpha-startup-20261003/`, Task는 `FlowMe Alpha AutoStart`, 상태 포트는13105, 앱 포트는3105다. 실행 직전 실제 정의·manager status·세대·native process tree·port owner를 읽기 확인한다.
- 설정/credentials·settingsRoot·DB/Auth/DNS/Tunnel·Task 정의/주기·manager 코드/포트·보안 guard·미소유 프로세스는 보호한다. 과거 PID·birth·manifest SHA를 종료 대상 상수로 사용하지 않는다.

## 운영 준비 사본의 조건

직전 정상 guarded native 운영 도구와 receipt는 읽기 참고다. 이전 root/build/HEAD/승인 reference에 고정된 도구를 그대로 실행하거나 guard를 지워 재사용하지 않는다. 새 로컬 준비 사본은 **현재 df0670f/h6dz rollback 대상 ↔ 새 exact release 후보**만 허용하고, 원 도구·현재 제공본·과거 receipt는 보존한다. 준비 사본/로그/receipt는 공개 Git 밖에 둔다.

준비 입력에는 새 commit의 clean source·CI·build·QA/static SHA, 현재 rollback의 frozen build/protected inputs, current manager generation과 native handles, 예상 process ancestry·명령/root/실행파일·creation time·port owner, 단일 실행 소유자, 승인 reference, 정확 관측 collector를 연결한다. PID나 build 일치만으로 대상 소유를 확정하지 않는다.

순수/모의 검사는 PID 재사용·다른 generation/owner/root·다른 port occupant·경합·이미 종료·미정리·취소·검사 실패를 확인한다. live manager retry loop와 Task의 향후 실행을 함께 보류하는 정상 경로가 있어야 한다. Task 비활성만으로 live retry가 중단됐다고 판단하지 않는다. cleanup이 `UNCONFIRMED`이면 다음 기동을 금지한다.

### 승인 전 오프라인 준비 결과

로컬 전용 `.tmp/manual-memo-date-gaps-release-20261004/ops-preparation/`에 preparation-profile.mjs·preparation-gate.mjs·preparation.test.mjs 3파일을 준비했다. profile의 승인·게시 HEAD·CI·QA·실행 binding은 null이며 후보 clean=false다. 기존 controller/native는 실제 출처 SHA로만 참조하고 import·복사·실행하지 않는다. 준비 gate는 모든 live action과 Check/Preflight/Probe 인계도 거절한다. 승인 응답을 profile에 넣는 것만으로 실행 가능한 도구가 되지 않는다.

순수 모의11/11 PASS는 준비 모델의 차단·신원/manifest/순서 규칙에 한정된다. 실제 native handles·Task·manager·서버 전환은 미실행이다. 승인 뒤 실제 게시 HEAD·CI·정확 QA와 fresh 운영 입력을 최종 controller에 연결하고 별도 검토·검사를 마쳐야 아래 실행 단계로 진행할 수 있다. 이 준비 결과를 운영 전환/복귀 완료 receipt로 사용하지 않는다.

## 승인과 exact 검증 후 실행 순서

| 순서 | 실행자가 수행할 단계 | 성공·중단 조건 |
| --- | --- | --- |
| 1 운영 협업 인수 | 직접 사용자 승인에 포함된 정확 운영 담당에게 새 대상·범위·복귀 계획·receipt를 전달 | 전달/접수/실제 응답을 구분. 승인 없는 외부 메시지·다른 실행자와 동시 제어 금지 |
| 2 직전 fresh 대조 | 현재 manager generation/native process tree/handles·3105/13105 owner·Task XML·manifest/guard·rollback frozen·새 exact HEAD/CI/build/QA 읽기 확인 | 하나라도 stale/불일치/불명확하면 중단. 과거 운영 snapshot으로 제어하지 않음 |
| 3 현재 제공 정상 정리 | Task 미래 기동과 live retry를 정상 보류하고 정확 소유 actor를 guarded native 절차로 정상 종료 | manager/launcher/app 및 관련 port 상태·정리 receipt 확인. Tunnel actor의 실제 소유 경계를 따르고 임의 PID 종료 금지 |
| 4 새 후보 DEV 전환 | 검증된 새 root/build를 기존 정상 관리형 경로로 기동 | local/external exact Flight build·참조 자산 SHA·health·무인증 경계 일치. settings/Tunnel 구성·다른 QA 서버 무변경 |
| 5 실제 rollback | 후보를 같은 정상 guard로 정리하고 df0670f/h6dz 제공본으로 복귀 | 기존 root/build/자산·protected inputs·관리 신원 일치. 모의 복귀를 실제 rollback PASS로 쓰지 않음 |
| 6 후보 최종 인계 | rollback을 정상 정리한 뒤 새 exact 후보 재진입, 앱 판본에 필요한 manifest appRoot/buildId/앱 guard 최소 정렬, 기존 Task 정상 재활성 | fresh manager generation이 갱신 manifest를 읽음. 나머지 settingsRoot/guard/Task/manager/Tunnel 보호. 이전 판본 자동 재기동 방지 |
| 7 최소 앱 재시작1회 | 최종 후보의 정확 app native owner를 정상 재시작하고 같은 후보 회복 관측 | expected owner·generation/creation/ancestry/port·동일 source/build/자산·health receipt. manager/Tunnel 전체 장애 주입으로 확대하지 않음 |
| 8 최종 확인·마감 | local/external 고정 GET·최종 source/build·자동 시작 manifest/Task·manager·rollback 보존 확인 | 같은 후보가 제공/자동 시작 대상으로 일치. 전환/복귀/재시작·소요시간·오류·NOT_RUN을 QA에 기록 |

앱대상 최소 manifest diff는 실제 현재 guard inventory와 새 exact build를 비교한 뒤 확정한다. appRoot·buildId·앱 guard 경로/BUILD_ID hash 외 변경이 필요하면 이유와 승인 범위를 먼저 확인한다. 현재 준비 문서가 guard11개·Task 정의·manager 코드를 바꿔도 된다는 근거는 아니다. manifest는 manager가 generation 시작 때 읽으므로 파일 수정만으로 최종 인계 성공을 주장하지 않는다.

## 관측·실패·복구 경계

DEV 확인은 인증 없는 고정 GET과 기존 정상 read-only collector로 제한한다. 실계정 session/token을 브라우저에 제공하거나 저장·공개·백업/복원 writer를 호출하지 않는다. 합성 앱 QA는 새 격리 context의 Auth/API 차단과 고정 localhost GET 자원 전달을 유지한다. GET 이외 요청이 포함된 도구를 읽기 확인으로 실행하지 않는다.

전환 시작 전 현재 사용자에게 실제 시작·대상·일시 응답 중단 가능성과 확인한 rollback 상태를 알린다. 서비스 응답이 없거나 build/자산/guard가 다르면 성공처럼 다음 단계로 진행하지 않는다. 마지막으로 신원이 확인된 보호 rollback 경로만 사용하고, 복구가 확인되지 않으면 `UNCONFIRMED` 상태·원인·필요 조치를 보고한다. 임의 프로세스 종료·포트 변경·Task 주기/guard 완화·Tunnel/DNS 재구성으로 해결하지 않는다.

정상 앱 재시작1회는 실제 재부팅/로그아웃·로그인/절전복귀·Tunnel 장애 주입 시험이 아니다. 실제 운영 DB 전후 byte 비교·실기기/IME/AT·원 PDF/ZIP·관찰 사용자 시험은 NOT_RUN/범위 제외다. 이전 판본의 recovery 시간이나 도구 검사 수를 이번 새 receipt로 재사용하지 않는다.
