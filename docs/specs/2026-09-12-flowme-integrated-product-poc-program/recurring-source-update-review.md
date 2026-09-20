# 반복 원본 변경 — 요구·구현·실제 수용 대조

2026-09-14. [D 설계](recurring-source-update-design.md)의 부분 결과다. 전체 목표와 반복 공개 제한은 유지한다. 공개 fixture 준비, 실제 개인 사본 변경, 자동 검사, 브라우저 검사를 구분한다.

## 원래 요구와 현재 판정

| 원래 요구·산출물 | 현재 연결 | 판정·남은 것 |
| --- | --- | --- |
| 개발2의 반복 원문·하위 확인을 개발1 공개 판본과 v4.1 개인 실행에 무손실 연결 | 실제 import의 header/field/child ID로 metadata를 읽고 선택 필드만 수용한다. 반복을 일반 checkbox로 바꾸지 않는다. | 부분 충족. 같은 판본의 제목·하위 확인을 개인 수정으로 오인하는 결함과 설명 수용 실패를 순수 검사에서 재현·수정했다. |
| 원본·개인 수정·판본을 구별하고 부분 수용 | 제목/설명/완료 기준/출처/하위 확인의 실제 선택 수용, 일정의 별도 수용 판본을 확인했다. 개인 참조의 변경된 문구는 덮지 않는다. | 해당 metadata 경로 충족. 별도 개인 계획·개인 시작일 충돌, 일반↔반복 전환, 다르게 보관한 하위 확인의 재추가는 미연결이다. 안전 거절을 기능 완료로 세지 않는다. |
| 새 일정과 지난 실행 기록 분리 | 새 규칙의 첫 회차는 미완료이며 옛 완료 기록은 보존된다. 여러 문서는 같은 회차를 참조한다. | 해당 수용/Undo 경로 확인. 복구 비교의 정확한 공개 원본 근거 표시와 반복 제안·채택은 남는다. |
| 취소·실패·Undo·reload와 상태 안내 | 그대로 유지/Escape, quota의 이전 bytes·선택 보존, 재시도, 원본 일정→metadata→완료 순서 Undo/reload를 실제 앱에서 확인했다. | 긴 비교창에서 오류가 맨 위에 있어 적용 버튼 곁에서는 보이지 않는 UX 결함을 관측했다. 아래 수정·재검증을 별도 기록한다. |

## 실제 앱 — kBiybIbfiMrIPgBKbAfFF

새 `program-source-update-d-review` 프로필은 원래 C3 revision10 (로컬 전용 근거: `../../../output/playwright/integrated-program/c3-execution-finish-2026-09-13T19-39-45-334Z.json`)의 개인 자료·Undo 표현을 그대로 복사한 뒤, 고정 공개 v2/v3만 준비했다. 준비 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-update-d-fixture-2026-09-13T21-13-10-603Z.json`)은 실제 사용자 공개가 아니다. 이전 C3 프로필을 초기화하거나 덮지 않았다.

- 첫 실행 1확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-update-d-2026-09-13T21-28-09-456Z.json`): 실제 완료가 revision11로 저장됐다. 공개 필드·값·배열 순서는 같지만 fixture의 객체 key 순서가 저장 serializer에서 정렬돼 문자열 비교가 실패했다. 이를 공개 내용 변경으로 판정하지 않는다.
- 같은 자료 재개 4확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-update-d-resume-2026-09-13T21-29-49-321Z.json`): 375px의 scrollbar gutter -15px를 넘침으로 오판했다. 양의 가로 초과량만 측정하도록 고쳤다. 저장0이다.
- 실제 수용 27확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-update-d-resume-metrics-2026-09-13T21-30-23-124Z.json`): five-field 선택·유지/Escape·quota·같은 선택 재시도, 참조 문서의 동일 완료·키보드 일정 선택을 확인했다. metadata는 revision12, 문서 복귀 위치 저장은13, 실제 일정 수용은14였다. 위치 저장을 일정 수용으로 오인한 revision 대기가 마지막에 실패했다. 중첩된 이전 init-script 관측 호출 수를 실제 저장 수로 합산하지 않는다.
- 같은 revision14에서 종료 10확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-update-d-finish-2026-09-13T21-32-58-878Z.json`): 새 첫 회차12/2·09:00의 미완료와 옛12/1 완료 보존, 원본 일정/metadata/완료의 세 Undo(15/16/17)와 reload 전체 저장 bytes 동일을 확인했다. 별도 단일 관측기는 실제 setItem3회이며 reload 쓰기0이다.

5크기(375×812,390×844,844×390,1024×768,1440×900)의15컨트롤은 높이44px 이상·실제 hit-test·가로 초과0이다. 중간 스크롤에서 촬영한375/844/1024 비교와1440 오류/새 회차를 직접 확인했다. 이것을 첫 진입 화면 전체 평가나 실기기 검사로 확대하지 않는다. 각 기록은 console/page error0·허용 prefix 밖 호출0이다. 이 프로필의 운영 키는0개이므로 채워진 운영 데이터의 불변 증거는 별도 자동 검사에 한정한다.

## 발견한 UX 결함과 개선

실패 시 실제 캡처 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-update-d-1789335027062-quota-1440.png`)에서 적용 버튼은 보이지만 dialog 내부의 오류는 위쪽 스크롤 밖에 있다. 배경의 앱 상태 문구는 modal 안의 오류 안내를 대신하지 못한다.

`ProgramCopyInspector`는 같은 상태/오류와 기존 스타일을 재사용해 해당 필드 적용의 저장 중·실패·성공을 적용 버튼 앞에서 보여준다. 맨 위와 동시에 중복 표시하지 않는다. 선택·오류 입력·writer·데이터 계약은 그대로이며, 새 판본/항목을 선택하면 이전 행동 결과를 지운다. 다른 개인 시작/기준일/제안의 기존 안내 위치는 유지했다. `flow-ux-review`의 행동 맥락·중복 안내 제거를 적용했고 Figma 파일은 만들지 않았다.

새2개 검사는 수정 전0/2, 수정 후 관련39/39다. 최종 전체1390개와 새 build `1W_TshpqCLS6uT3umCoKi`의 동일 자료16확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-update-feedback-2026-09-13T22-12-56-228Z.json`)을 완료했다. 이전1388/strict333/build kBiy 결과를 최종 UI 수정 이후 검사로 재명명하지 않는다.

375×812·390×844·844×390·1024×768·1440×900에서 quota 오류와 재시도가 추가 스크롤 없이 함께 보이고 hit-test/44px 이상·가로 넘침0을 확인했다. 실패5회는 exact 저장 bytes/설명 선택을 보존했다. 키보드 Enter 재시도는 설명만 반영하고 Undo는 모든 개인 공간을 복원했다. 실제 성공 쓰기는2회이며 reload 쓰기0, 공개 값·이전 회차 기록 보존, console/page/범위밖쓰기0이다. 운영 key가0개인 이 프로필을 채워진 운영 데이터의 byte 불변 증거로 확대하지 않는다.

375px (로컬 전용 근거: `../../../output/playwright/integrated-program/source-feedback-1789337578885-failure-375.png`)·844×390 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-feedback-1789337579336-failure-844.png`)·1024px (로컬 전용 근거: `../../../output/playwright/integrated-program/source-feedback-1789337579588-failure-1024.png`) 캡처를 직접 확인했다. 오류가 행동 바로 앞에 있고 중복 alert는 없지만 긴 비교/바깥과 안쪽 스크롤은 남는다. 39개 기록·소스 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/source-update-d-crosscheck-2026-09-13T22-13-12-417Z.json`)는 실제 store decoder, 연속 상태,362개 검사/build/현재 소스와 사진 hash를 확인한 별도 검증이며 새 브라우저 실행 수가 아니다.

새 빌드 직후 첫 자동화 호출 (로컬 전용 근거: `../../../output/playwright/integrated-program/source-update-feedback-2026-09-13T22-11-39-593Z.log`)은 `about:blank` 문서의 localStorage 접근에서 중단됐다. 기존 프로필을 지우거나 새 fixture를 넣지 않고 같은 원래 URL로 이동해 revision17/공개3판본을 확인했다. 후속16확인의 시작 값은 이전 성공 Undo와 exact 일치한다.

### 검사 프로세스 종료와 실행 자원

첫 전체 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T21-36-48-724Z.json`)는146파일/1385실행/1383PASS/2FAIL·skip0·소스 변경0이다. `ProgramLegacyPlan.test.tsx`와 `execution-source-reader.test.ts`의 worker가3221226505로 종료됐고 기대값 실패로 해석하지 않는다. 동시에 실행한 첫 타입 검사는 `FATAL ERROR: Zone Allocation failed - process out of memory`로 종료됐으며 새 타입 결과 JSON은 생성되지 않았다.

공유 호스트 조회에서 가용 물리 메모리는 약2.1GiB, 가용 가상 메모리는 약1.5GiB였다. 확인된 이 PoC 서버만 중지했으며 다른 앱/세션이나 OS 설정을 변경하지 않았다. 기존512MiB의 단독 재검사에서는 Plan2개가 통과하고 reader worker는 다시 종료됐다. reader의 원래6개(20/100/200항목 포함)를256MiB old-space/4MiB semi-space에서 프로세스 비분리 진단과 **기존 프로세스 분리 방식**으로 각각6/6 확인했다. 원본 입력·assertion·대기 조건은 그대로다. OS 종료의 근본 원인을 확정한 것은 아니다.

검사 실행기에 선택 가능한256/4MiB 설정을 추가했으며 기본512MiB·프로세스 격리를 유지한다. 선택 자원은 결과 JSON에 기록한다. 제품의 데이터/이력 상한이나 validator를 바꾸지 않았다. 순차 실행한 타입333/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T21-49-11-497Z.json`)은 새 UI를 포함한다. 전체 재검사와 build 결과는 완료 후 아래에 연결한다.

### 최종 소스의 자동 검사

빌드의 첫 종료 기록 (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T21-59-37-697Z.json`)은 exit134이며 `Zone Allocation failed`다. 제품 소스를 바꾸지 않은 768/4MiB 재시도 (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T22-08-04-590Z.json`)는 컴파일13초 통과 뒤 타입 검사에서 JavaScript heap 한도로 종료됐다. 1024/4MiB 재시도 (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T22-09-47-678Z.json`)는 기존 타입 검사·build의 모든 단계를 통과했다. 실행기의 `nodeOptions` 기록을 추가했고 OS/브라우저/의존성/제품 자원 한도는 바꾸지 않았다. 최종1W_T 빌드와 위16확인의 runtime ID가 일치한다.

- 전체 재검사 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T21-50-58-104Z.json`):146파일·1390/1390 PASS·실패/skip/소스 변경0. 동시1/old-space256MiB/semi-space4MiB이며 테스트 파일·입력·assertion을 줄이지 않았다. 앞선1383/2FAIL을 덮어쓰지 않는다.
- npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T21-49-45-962Z.json`):2031실행/2030PASS/1FAIL. `seed-flows.test.ts:1289`의 기존 출처 검토기한9건이며 운영 출처 내용을 바꾸지 않았다.
- 승인 실행 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T21-59-13-231Z.json`):201/201, 공개 화면 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T21-59-16-348Z.json`):19/19. 각 검사 수를 중복 합산하거나 요구 충족률로 바꾸지 않는다.
- 의존성 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/audit-2026-09-13T21-59-19-017Z.json`):FAIL, 기존5건(critical1/high2/moderate1/low1). Next critical·Browserslist/sharp high·baseline-browser-mapping moderate·postcss-selector-parser low다. 정확한 영향/권고는 npm 출력 (로컬 전용 근거: `../../../output/integrated-product-poc/audit-2026-09-13T21-59-19-017Z.log`)에 보존했다. npm은 Next15.5.25를 제시하지만 현재 선언 범위 밖이므로 강제 upgrade하지 않았다. 이 PoC는127.0.0.1 로컬 검증이며 공개 서버/출시 안전성을 주장하지 않는다.

이전 D 출력의361소스와 현재362소스 hash를 대조한 제품/테스트 변경은 `private-space.ts`, 새 `public-copy-source-update.test.ts`, `ProgramCopyInspector.tsx`, 그 UI 테스트의 정확한4파일이다. 현재 턴의 오류 안내 보완은 마지막 두 UI 파일이다. fixture/브라우저/교차 대조 스크립트와 선택 자원 옵션, 해당 요구·보고 문서는 별도로 변경했다. workflow reporter의 untracked 상위 디렉터리3개는 실제 변경 파일 수가 아니다.

## 다음 연결과 외부 경계

반복 제안/채택, 복구 비교의 정확한 공개 판본 근거, 미지원 전환의 실제 해결 경로, 실제 작성→공개부터의 연속 검증을 남긴다. 여섯 틀 전체 동등성·Map 삭제/다른 구조·긴 화면/누적 응답성과 전체10상황·두 전체 개선 루프도 미완료다.

Android/iOS·OS IME·보조기술·실제 외부 도구 import·관찰 사용자는 미실행(0명)이다. commit/push/PR/merge/Preview/Production/외부 게시는 하지 않았다. 보고서 HTML 렌더 정책 차단을 우회하지 않는다.
