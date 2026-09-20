# 반복 제안 입력 — 실제 전송·검토 복귀 확인

2026-09-14. 기존 [비교·판본 준비](recurring-proposal-review.md) 이후 P03/P06/P07/P08, S05/S08/S09/S10의 입력·제출을 연결한다. 전체 목표·여섯 틀·Map·두 전체 개선 루프를 축소하지 않는다.

## 구현 계약

- 기존 공개 반복 draft/parser/입력 폼을 재사용한다. 규칙·종료·시작일·시간·시간대를 일반 메모나 고정 회차로 바꾸지 않는다.
- 제안 시작 때 actor/copy/Flow/기준 판본/항목과 원래 항목 snapshot을 고정한다. 다른 항목·필드·판본으로 자동 바꾸거나 최신판으로 추정하지 않는다. 현재 최신판이 달라져도 고정한 원판본에 제안한다.
- 아직 보내지 않은 입력은 화면 메모리에만 있다. 자동 저장했다고 알리지 않는다. 전환/닫기/외부 snapshot은 기존 editor port로 보호하고 복구용 TXT에 원문 일정과 입력을 포함한다. 명시 취소만 미제출 입력을 버리며 저장0이다.
- 동일 요청 ID를 실패 재시도에 유지한다. 저장 성공 뒤 입력을 비우며 더블클릭/동일 요청 재생은 추가 제안0이다. 현재 copy/actor/원문 항목이 달라졌으면 제출0으로 거절한다.
- 제안 저장은 새 불변 판본 발행이 아니다. 제안의 typed 반복 검증을 허용하되 실제 공개·채택 gate는 해당 연속 검증 전까지 유지한다.

## 확인할 범위

순수 identity/무변경/잘못된 반복/실패·재시도/같은 요청, component handler의 선택·전환·Escape·IME·잠금·복구, 실제 브라우저의 보존된 사본에서 입력·전송·제안 확인·reload 및5화면/키보드/쓰기 경계. 실제 기기·관찰·외부 게시·Git 발행/배포는 실행하지 않는다.

## 원래 요구와 현재 적용

| 원래 결과물·요구 | 이번 실제 연결 | 남은 범위 |
| --- | --- | --- |
| 개발1의 공개 원문/판본과 개인 사본 | 가져온 사본에서 선택한 공개 v3·정확한 항목에 반복 규칙을 제안. 최신판이나 같은 제목의 다른 항목으로 바꾸지 않음 | 모든 원본 형태와 일반↔반복 변경 수용 |
| 개발2의 typed 반복·선택적 공개·기여 | 기존 반복 draft/parser/폼으로 규칙·종료·시작·시간·시간대 보존. 제안 저장만 허용하고 새 판본 발행은 별도 검토 | 실제 반복 채택→불변 판본→명시 사본 수용, 실제 작성부터의 연속 검증 |
| v4.1/개인 문서의 실행 기록 보존 | 제안 저장 전후 모든 private space와 원래 공개 판본 동일. 실패·취소·Escape는 성공 변경0 | 개인 시작/계획 충돌 해결과 전체10상황·두 개선 루프 |
| 통합 UX의 실패 복구·정확한 재진입 | 작성 중 대상 잠금, 닫기 차단, 취소 초점, 같은 요청 재시도, 보낸/받은 제안→고정 원문→뒤로→reload | 실제 OS 입력기·실기기·장기 사용, 같은 제목 제안 여러 개의 목록 식별 개선 |

## 자동 검사

실행판 `FDEzdpiy2K8_00pKbsxt7`. 소스·저장 기록20대조 (로컬 전용 근거: `../../../output/integrated-product-poc/copy-proposal-crosscheck-2026-09-14T00-22-03-321Z.json`)에서 검사/build/현재370소스 동일·정확9제품/검사파일 변경을 확인했다. 이 대조는 새 브라우저 검사나 충족률이 아니다.

| 실행 | 실제 결과 |
| --- | --- |
| 관련 표적 | 63/63. 새 모델 CPI6, handler CPU8, 기존 inspector11·반복 검토12·publisher15·publication11 |
| 전체 신규 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T00-09-06-746Z.json`) | 150파일 /1,434실행 /1,434PASS /실패·skip·소스변경0 |
| 타입 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-14T00-08-28-420Z.json`) | 341개 진입 파일 /진단0 |
| production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-14T00-09-17-812Z.json`) | PASS /소스변경0 |
| npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-14T00-11-04-593Z.json`) | 2,031실행 /2,030PASS /기존 출처기한1FAIL /skip0. 원문9개의 `review_due` 문제는 해결하지 않음 |
| 기존 실행 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-14T00-12-45-977Z.json`)·공개 화면 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-14T00-12-49-001Z.json`) | 201/201, 19/19 |

첫29개 실행에서 CPI06 테스트가 실제 controller snapshot의 `envelope.data`를 `data`로 잘못 읽어1FAIL했다. 테스트 경로를 고쳤다. strict는512MiB heap에서 메모리 종료 후1024MiB에서 실행했고, 테스트 타입2진단을 고친 뒤341/0을 확인했다. assertion이나 제품 검증을 완화하지 않았다. 이전 의존성5건은 이번에 재검사/해결하지 않았다.

## 같은 실제 브라우저 자료를 이어간 결과

기존 `program-source-update-d-review` 프로필의 문서·참조·개인 계획·기록을 초기화하지 않았다. 앞선 설명 제안도 그대로 남겼다. 로컬 인물 선택32→33은 시뮬레이션이며 계정 인증이 아니다.

1. 첫 입력1확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-proposal-input-2026-09-14T00-14-51-375Z.json`): select의 실제 접근 가능한 이름을 label 전체 문자열과 혼동한 locator에서 중단. 저장0.
2. 후속9확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-proposal-input-2026-09-14T00-15-55-014Z.json`): 같은/잘못된 반복·대상 잠금·취소/초점·닫기 후 입력 유지까지 확인. textarea label에 현재 내용이 포함돼 locator가 중단됐다. 입력·revision33·저장0 유지.
3. 입력·실패·전송21확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-proposal-input-2026-09-14T00-17-13-403Z.json`): 같은 미제출 자료의 명시 취소/Escape,5크기, quota 실패0변경, 같은 request ID 재시도1성공. revision33→34에 실제 반복 제안 `proposal-e358dc63-a58c-4943-aaf9-512dbcabb0c7`을 만들었다. 기존 공개 판본·private space·앞선 설명 제안은 동일. 닫힌 활동 disclosure의 본문을 바로 읽는 QA 기대에서 중단됐다.
4. 보낸 제안·검토10확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-proposal-sent-2026-09-14T00-19-03-355Z.json`): 그 제안을 열고 원문 v3/정확 항목·뒤로·reload와 작성자 검토까지 연결했다. actor34→35의 저장 호출 계측에서 오래된 배열 참조를 읽은 QA 오류가 있었다. 이 구간의 저장 호출 수는 통과로 세지 않는다. 저장본 대조에서는 actor 변경뿐이며 모든 공개/개인 데이터가 동일하다.
5. 같은 제안 최종14확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-proposal-sent-resume-2026-09-14T00-20-37-925Z.json`): revision35 그대로 올바른 계측으로5크기·키보드·제안 원문 왕복·reload를 확인했다. 저장 호출0·raw bytes 동일·오류0. 채택은 아직 비활성이고 보류/반영하지 않기는 사용 가능하다.

1/9/21/10/14는 서로 겹치는 부분·후속 확인이며 합산 충족률이 아니다. 제품의 저장 실패 주입과 QA 코드의 locator/계측 오류를 구분한다. 부분 실행의 실패를 삭제하거나 전체 PASS로 이름만 바꾸지 않았다.

## 화면 평가

입력 폼과 검토 각각375×812,390×844,844×390,1024×768,1440×900을 확인했다. 스크롤 후 입력·전송·취소/검토 행동의 hit 정상·높이44px 이상·가로 넘침0. console/page 오류0이다. 375 입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-proposal-input-1789345035085-375.png`)·1024 입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/copy-proposal-input-1789345035497-1024.png`)을 직접 확인했다. 폼 전체가 첫 화면에 동시에 보인다는 뜻은 아니다.

UX review: 기존 폼/접힘/저장 장벽을 재사용하고 입력 보호에 필요한 취소만 추가했다. 잘못된 입력을 자동 저장했다고 표현하지 않았다. React 검토는 refs 기반 최신 입력, 안정적인 port 등록, 기존 beforeunload 한 곳의 재사용을 확인했다. Figma는 사용하지 않은 Code-only 작업이다. 긴 원문 비교·이중 스크롤·동일 제목 제안의 구별은 추가 개선이 필요하다.

## 보호와 다음 순서

브라우저의 보호 운영 key는0개다. 따라서 허용 밖 호출0과 이 프로필의 bytes 동일을 채워진 운영 데이터 전체 검증으로 확대하지 않는다. CPI06은 운영 표식 bytes와 실제 PoC controller의 quota/재시도/reload를 별도 검증했다. 소스 보호4,781중4,779동일·기존 접점2·예상밖0, native26파일819,423bytes/운영 writer0와 v11 무결성도 통과했다.

다음은 현재 실제 제안을 보존한 채 채택→새 불변 판본→개인 사본의 명시 수용을 연결하고 일반↔반복·개인 시작/계획 충돌 해결 및 E의 실제 작성부터 공개까지를 종결하는 것이다. 이번은 입력·제출 완료이며 반복 공개 전체 완료가 아니다. 여섯 틀/Map 삭제/긴 화면/성능·전체10상황/두 전체 개선 루프는 남는다. 실제 Android/iOS·OS IME·보조기술·외부 계정은 미실행, 관찰0명. commit/push/PR/merge/Preview/Production/외부 게시 미실행. 보고서 HTML 렌더 정책 차단은 우회하지 않는다.

제품·검사 변경9파일은 위20대조의 `changedFiles`에, 브라우저/증거 스크립트는 `program-copy-proposal-input.cli.js`, `program-copy-proposal-sent.cli.js`, `program-copy-proposal-sent-resume.cli.js`, `program-copy-proposal-crosscheck.mjs`에 남겼다. 이전 checkpoint와 운영 dirty 파일은 정리하지 않았다.

STATUS 경계 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-14T00-25-31-698Z.json`)는 안내4줄을 제외한 운영 본문 해시 동일을 확인했다. 보고서 정적197검사 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-14T00-25-31-791Z.json`)는4이미지/실패0이며 실제 보고서 렌더는 여전히 정책 차단이다. 문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-14T00-25-32-268Z.json`)는 통과했다.
