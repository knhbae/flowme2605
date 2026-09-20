# 실사용 알파 전환 정합화 — 실행 근거

2026-09-20. [현재 실행 원장](alpha-transition.md)의 M0 문서·설계 목표를 완료했다. 제품 구현·서버 검증 결과가 아니다. M1 이후는 예정 상태이며 외부 작업을 승인한 것으로 해석하지 않는다.

## 이번 작업과 근거 범위

기존 7월 서버 계약/tasks, v4.1 원본 spec과 v4.1·개발1·개발2의 정본화된 감사, BP 원 요구 목록, 9월 통합 프로그램과 최종 평가를 현재 runtime과 대조했다. 원대화 전체를 다시 읽거나 원자 UX 충족 여부를 전수 재시험하지 않았다. 원본 감사의 의사결정 이력19개와 decisionRows14개는 그대로 참조한다.

현재 코드의 local actor·단일 Program envelope·localStorage/CAS/Undo를 서버 계정·다기기·복원 완료로 오해하지 않도록 나눴다. 독립 원문/행, 네 origin, native saved/pending/recovery, Map, 회차/누적 기록, 공개 판본/사본, 커뮤니티/사진이 보존 계약에서 누락되지 않도록 연결했다. 자세한 판정은 A 원장 한 곳에 둔다.

읽기 전용 보조 검토 두 개를 병행했다. source 검토자는 원본 부모254개와 하위424개의 제목·기대 의미를 읽고 참조 매핑을 작성했다. runtime 검토자는 실제 진입점·계약·저장/Undo·출력 코드와 중앙 계획을 대조했다. 두 검토는 제품 테스트나 관찰 사용자 검사로 집계하지 않는다. 최종 검토에서 Web Locks의 구현 위치를 controller 자체가 아니라 ProgramApp의 주입으로 바로잡았다.

주 에이전트의 원 요구/route 표본12개 대조에서 D2-049의 ‘선택=즉시 삽입’과 현재 빈 틀/예시 확인·구조 materialize 경로의 차이를 확인했다. 현재 구조 입력의 9/14 성공 근거가 단순 틀의 원 UX까지 증명하지 않으므로 A12/M4/D07의 추가 대조로 명시했다. 새 정책을 결정하거나 기능을 수정하지 않았다.

## 파일 범위

새 문서는 이 프로그램 폴더의 `alpha-transition.md`, `alpha-requirement-routing.json`, `alpha-transition-qa.md`다. 나머지는 아래 기존 문서의 맨 앞에 `alpha-transition-20260920` 표식 블록만 추가한다.

- `docs/PROJECT_CONTROL.md`
- `docs/STATUS.md`
- `docs/ROADMAP.md`
- `docs/specs/README.md`
- `docs/specs/2026-07-11-canonical-flow-data-model/tasks.md`
- `docs/specs/2026-07-11-canonical-flow-data-model/storage-api-contract.md`
- `docs/specs/2026-09-12-flowme-integrated-product-poc-program/plan.md`
- `docs/specs/2026-09-12-flowme-integrated-product-poc-program/progress.md`
- `docs/specs/2026-09-12-flowme-integrated-product-poc-program/current-checkpoint.md`

기존 STATUS와 specs index의 선행 변경, 미커밋 PoC와 과거 평가를 이번 소유로 간주하지 않는다. 예전 release 상태·체크박스를 지우거나 다시 완료 처리하지 않는다. 원래 `D:\flowme2605\flow-mvp`에는 쓰지 않았다.

## 현재 실행 결과

| 검사 | 실제 실행 결과와 한계 |
| --- | --- |
| `npm.cmd run docs:check` | PASS. skill sync 일치, 필수 문서16개·로컬 링크8993개 검사. 제품 테스트가 아님 |
| Node 매핑·문서 assert | 최종18/18 PASS. source SHA, 부모/하위/결정 수, 부모 전수 매핑, ID 중복/대상 제한, 하위 상속, 역사 판정 비복제, 판정/승인 아님 표시, A24/M8/T12/D7 구조, 새 문서 링크/anchor, 진입점9개, 기존 본문 보존 |
| 원 요구 참조 | V41 부모78/하위89, D1 26/59, D2 64/121, BP 86/155. 부모254개 모두 연결, 하위424개 모두 parentId 경로 존재. 누락0·중복0. 이는 현재 기능 충족 판정이 아님 |
| 원본 SHA-256 | inventory `61989946ca43b7cfc41052bbb8fff0f776e2918ff5991bb36d05969e1033acd4` 일치. 기존 요구·판정·의사결정 본문을 수정하지 않음 |
| 신규 문서 링크 | 로컬 링크73회·서로 다른 대상54개·anchor2개 모두 존재. 외부 dashboard 인증 페이지를 로컬 링크 검사로 검증했다고 주장하지 않음 |
| 보호 범위 SHA-256 | 11:40:38 UTC 기준1716파일 대비 예정된 기존 문서9개만 변경. runtime/config1703개와 지정 과거 spec/원장/최종 보고4개, 합계1707개 byte-for-byte 동일. 이 범위의 삭제/신규 파일0·허용 밖 변경0 |
| 기존 문서9개 보존 | 표식 블록을 제외한 본문 보존. 4개는 그대로 byte 일치, 5개는 patch context의 줄바꿈 차이를 원래대로 재구성하면 시작 SHA와 일치. 기존 본문·체크박스 수정0이며 문서 전체 byte 불변이라고 주장하지 않음 |
| scoped diff·공백 검사 | tracked diff 검토 및 `git diff --check` PASS. STATUS/specs index의 앞선 변경과 이번 표식 삽입을 분리함. 새 문서·기존 untracked 프로그램 문서는 별도 본문/보호 검사에 포함 |
| `npm.cmd run workflow:closeout -- --scope=…` | 문서 lane 권고. 도구는 tracked6개만 포착했으므로 이를 전체 변경 개수로 쓰지 않음. 실제 이번 범위는 기존9개+신규3개. 권고 도구 자체가 테스트를 실행한 것은 아님 |

18개 최종 assert의 판정은 문서/매핑 검사다. 초기 1회는 specs README의 기존 CRLF/LF 혼합 때문에 단순 줄바꿈 정규화 검사에서 실패했다. 기존 본문을 바꾸지 않고 첫 세 줄의 원래 CRLF를 메모리에서 재구성해 시작 SHA 일치를 확인한 뒤 검사 방법을 보완했다. 중간 진단 출력은 최종 PASS 수에 포함하지 않는다. 제품 결함을 발견·수정한 것으로 세지 않는다.

보호 비교는 시작/끝 파일 byte 검사이며 localStorage 데이터나 DB를 백업했다는 의미가 아니다. 새 요구 라우팅은 원본 fingerprint가 달라지면 다시 검토해야 한다. 현재 문서의 완료율은 원자 수나 테스트 수로 계산하지 않는다.

## 외부 환경의 확인 한계

이번 목표에서 Supabase `wkmzcxpnojobxrgebapw`와 `ldellkztijrijbpwthjl`의 metadata와 `public` 테이블 목록을 읽었다. 둘 다 `ACTIVE_HEALTHY`, public tables0이다. 전체 schema/Auth/Storage가 비었다는 증거는 아니다. 개발계 생성은 앞선 사용자 승인 작업이며 이번 목표에서 새로 만든 것이 아니다. 이번 DB/Auth/Storage/환경변수 설정 변경은0이다. Vercel 정보는 앞선 조회 기록을 사용했으며 이번 목표에서 재조회·배포하지 않았다.

## 수행하지 않은 검사와 발행

문서만 바꿨으므로 제품 `npm test`, production build, security audit, 브라우저/화면 검사를 이번 목표에서 재실행하지 않았다. 실제 인증·서버 API/SQL/RLS·동기화·백업 복원·업데이트/rollback 검사는 아직 구현 전이며 T01–T12는 계획이다. 새 자동 제품 테스트 실행 수0이다. 과거 1749/1749·npm2030/2031·audit5는 원래 보고서의 과거 실행 수다.

실제 Android Chrome/iOS Safari·OS IME·보조기술·외부 import 검사 미실행. 관찰 사용자0명. localStorage/API 데이터 mutation 시나리오를 이번에 실행하지 않았으므로 운영 `flow:*` 불변을 새 브라우저 증거로 주장하지 않는다. 이번에는 writer를 바꾸거나 호출하지 않은 문서 작업이며 코드 byte 보존 검사와 구분한다.

commit 미실행 · push 미실행 · PR 미생성 · merge 미실행 · Preview 미배포 · Production 미배포 · 원격 CI 미실행. 배포/계정 구현 승인으로 범위를 늘리지 않았다.

## 다음 경계

문서 목표가 종료되어도 M1은 예정 상태다. 다음은 [M1 인계](alpha-transition.md#바로-다음-구현-묶음--m1-인계)의 저장/권한/복구 계약과 fake-server 검증이다. 로그인 제공자·가입 대상·이관 소유자·백업 비용/보관·공개 운영·발행 범위는 해당 단계 전 별도로 결정한다. 기능형 PoC 완료를 서버 실사용 준비 완료로 바꾸지 않는다.
