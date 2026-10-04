# 선별 게시·정확 판본 검증·개발계 반영 계획

2026-10-04. [목표](spec.md)·[manifest32](manifest.md)의 범위를 따른다. 사용자가 이번 게시/CI/협업/DEV 전환·복귀 질문에 직접 ‘승인!’으로 답했다. 로컬 준비·검증을 인수해 아래 단계를 실행하며 승인과 실제 성공 근거를 분리한다.

| 단계 | 수행할 일 | 종료 조건과 중단 경계 |
| --- | --- | --- |
| 1 인수·준비 | 새 작업본의 HEAD/main 관계와 소유26파일, 새6문서, 현재 제공/rollback root를 확인. source raw SHA256·Git blob·checkout SHA256을 별도로 기록하고 공개 제외를 점검 | 실제 expanded 집합32와 manifest 일치. 기존 후보/제공본/원본 dirty 무수정. 새 제품·dependency 변경이 필요하면 범위와 소유부터 다시 확인 |
| 2 로컬 검증 | 정상 Node24·lockfile 기준 설치, docs/security/표적31/관련 통합/npm/type/build. 새 build와 compile/runtime/QA/static 입력을 묶어 검사 | 실제 새 명령 결과를 QA에 기록. 직전 PASS 이력 재사용 금지. hook·검사 guard·출처 날짜를 편의상 우회하지 않음 |
| 3 승인·게시 | 직접 사용자 승인과32파일 공개 범위를 확인. 지정 branch·PR211 base의 원격 drift·Render/Vercel Git 자동 배포 경계를 읽고 선별 stage/commit/push/Draft PR | 승인 없으면 게시하지 않음. 자동 배포 활성/조회 실패 시 설정을 바꾸지 말고 게시 보류. 전체 add·와일드카드·미소유 path·비공개 증거 stage 금지 |
| 4 같은 HEAD CI·QA | 새 정확 HEAD의 required CI, fresh production build, 새 합성 앱43판정·다섯 viewport·저장/요청 경계 재실행. 실패는 같은 판본에서 원인/보완/재검사 기록 | 같은 source·HEAD·build·QA 자산의 연결과 오류0. 직전 lPbl 후보나 이전 CI를 대신 쓰지 않음. private catalog raw 입력은 승인된 경계 안에서만 사용 |
| 5 운영 준비 | [runbook](runbook.md)에 따라 실행 소유자·승인 reference·fresh current generation/native handles·process tree·port·manifest·rollback 보호 입력 대조. 기존 정상 절차의 새 사본을 모의 검사 | PID/build만 일치하는 신원은 불충분. 기존 guard/manager/Task 정의를 완화하지 않음. cleanup 불확실·다른 실행자 제어 중이면 전환 금지 |
| 6 전환·복귀·최종 인계 | 검증된 새 후보를 DEV에 전환, 기존 h6dz 기준으로 실제 rollback, 새 후보 재진입·자동 시작 대상 정렬, 정확 앱 정상 재시작1회 | 각 단계 로컬/외부 build·자산·health·auth 경계와 보호 입력 receipt 확인. rollback/재시작을 모의 검사나 실제 재부팅 PASS로 바꾸지 않음 |
| 7 마감 | 최종 제공 source/build/manager/자동 시작 일치·Git/CI·실행 결과·잔여와 NOT_RUN을 QA에 기록. scoped diff·문서·closeout 확인 | 준비/게시/반영/회복·사람 검증 상태를 각각 보고. main/Production/실사람시험 등 제외 유지 |

로컬 build/QA/의존성 설치는 새 release root만 사용한다. 현재 제공 `flow-personal-memo-date-20261004`의 build와 node_modules는 읽기 보호 대상이다. 준비 문서는 승인 질문을 구체화하지만, 과거 승인·운영 receipt를 새 실행 권한으로 만들지 않는다.

source 인수와 게시 후 checkout은 Git의 줄끝 정규화 때문에 raw SHA가 달라질 수 있다. 예상 변환은 attrs/설정·Git blob·정규화 결과로 입증하며, 설명되지 않는 차이는 보존/검증 실패다. 보호 운영 파일이나 비공개 입력의 임의 정규화는 허용하지 않는다.
