# C1-c1 — 다른 창의 초안 보관함 변경 뒤 저장 차단

2026-09-06. K3-C C1-c1의 추가 조합 검사와 수정이다. [전체 실행 계획](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md)의 순서를 유지하며, C1-c2·C2·C3·K4와 React 전환 화면은 별도 진행 중이다.

## 요구와 실제 차이

| 원본·연결 | 충족해야 할 조건 | 확인한 차이와 처리 |
| --- | --- | --- |
| 개발1 D1-016 / 검색·선택·작성 복귀 | 조회·복귀가 기존 작성 내용을 바꾸지 않음 | 도움 성공 뒤 검색 왕복에서 같은 textarea·선택·native Undo 확인. 도움 실패의 미저장 값은 검색으로 닫을 수 없게 유지 |
| 개발2 D2-029/032 / 원문·초안 소유 보호 | 다른 창의 변경을 관측한 뒤 현재 입력과 다른 저장본을 보존 | library만 바뀌면 경고 뒤 타이핑이 draft를 저장하는 실제 실패. 일반 draft 쓰기 진입점에서 creator conflict를 확인하도록 수정 |
| 개발2 / 원문 도움의 저장 전 검증 | 차단 상태에서는 candidate 저장·native 삽입을 시작하지 않음 | 도움은 일반 draft 진입점을 거치지 않아 같은 우회가 남음. 별도 helper 저장 시작점에서 차단하도록 수정 |
| v4.1 / 원문·개인 실행·보관함 소유 분리 | 명시 handoff 전 개인공간·폴더·완료·날짜·순서·Undo 불변 | 검사 context의 준비 source/workspace/운영 sentinel bytes exact. 타이핑·도움 보호만으로 전체 v4.1 기능을 재검증했다고 판정하지 않음 |

요구 근거는 [React 초안 보호 설계 §2](./k3c-c1-react-authoring-safety-design.md#2-요구-근거와-이번-대응), [명시 전환 QA](./k3c-c1-explicit-authoring-qa.md), 앞선 [standalone 읽기 계약](./k3c-c1-standalone-entry-contract.md)과 연결한다. 이번에는 원본 세션 대화 전체를 다시 조회하지 않았다. 전체254부모/424원자 요구의 충족률도 다시 산출하지 않았다.

## 수정 전 → 수정 후

| 등록 | 실제 시나리오 | 판정 |
| --- | --- | --- |
| HL01 | 장소 도움 성공 → 검색 → 같은 원문·selection → 타이핑·native Undo | PASS. 정상 도움은 draft1쓰기·native 명령1회. 여러 trusted input 이벤트를 명령 여러 번으로 세지 않음 |
| HL02 | 정확한 draft quota 실패 → 검색 시도 | PASS. 실패 set API1/byte 변경0. 검색은 열리지 않고 입력한 장소·실패·재시도·A 유지 |
| HL03 | 실제 A 보관 → 검색 → 다른 HTTP 제품 문서에서 A 초안 복제 → A 복귀·타이핑 | 수정 전 draft1쓰기·원문 변경. 일반 draft 경로 수정 후 추가 쓰기0·같은 A 보존 |
| HL04 | 실제 L 보관 → 별도의 미보관 A → 검색 → 다른 제품 문서에서 L 복제 → A 복귀·장소 도움 적용 | 수정 전 candidate set1·native insertText1·trusted input2, rollback0. helper preflight 수정 후 candidate·rollback·native 모두0, 입력값·A·저장본 보존 |
| HL05 | 정상 creator 보관과 외부 library 충돌 뒤 보관 비교 | 정상은 library+draft2쓰기. 충돌 뒤 버튼 비활성과 합성 late-click handler probe 모두0쓰기, A·저장본 보존 |
| HL06 | 정상 개인 Flow 저장과 외부 library 충돌 뒤 저장 비교 | 정상은 journal/workspace/draft5 API·Flow1개·receipt 생성. 충돌 뒤 활성 버튼 실제 클릭은0쓰기, Flow/receipt 생성0 |

HL01–03 최초 실제 판정 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-helper-library-corrected-20260906-02.json`)은3실행/2PASS/1FAIL이다. 일반 draft 경로 수정 뒤 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-helper-library-green-20260906-01.json`) 같은3개는PASS였다. 하지만 별도 HL04 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-library-helper-red-20260906-02.json`)에서 helper 우회를 추가 확인했다. 두 진입점을 고친 현재4개 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-library-boundary-final-20260906-01.json`)은 **4/4 PASS**다. 반복 실행·하위 context를 고유 테스트 수에 더하지 않는다.

첫 HL01 이벤트수 기대와 HL03 두 번째 문서의 부팅 화면 기대는 하니스 오류였다. HL04의 첫 캡처용 스크롤도 성공으로 사라진 폼을 기다려 timeout했다. 이 이력은 보존하고, 정상 전제를 모두 통과한 정확 assertion 실패를 별도로 남겼다. 실패를 expected-fail·skip으로 바꾸지 않았다.

추가 HL05·HL06의2실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-library-save-gates-initial-20260906-01.json`)도2/2 PASS다. 위4개와 합쳐 **고유6개·4+2실행 PASS**이며 하나의6개 실행을 했다는 뜻은 아니다. HL05/06은 각각 정상 저장과 충돌 저장을 다른 context에서 대조하여4context/6문서를 사용했다. creator의 비활성 버튼에 대한 dispatch는 합성 late-event 검사이며 실제 사용자의 native 클릭으로 부르지 않는다.

HL01–04는4context/6문서·API47, HL05/06은4context/6문서·API77이다. 합계124 API 중 다른 제품 문서의 library 복제4회는 별도이며 제어 문서의 API는120회다. 실제 byte 변경은44회다. 읽기·차단·late-event 구간 API0, prefix 밖·clear·console/pageerror·보호값 불일치0이다. 정상 handoff만 선언한 workspace/journal/draft 변경을 허용했고 운영·legacy·source는 exact다. 이 숫자는 성공 mutation124를 뜻하지 않는다.

## 구현 범위

`app.js`의 두 preflight만 보강했다. `featureWritable('draft')`와 `needsDraft`는 관측된 creator conflict가 남으면 원문 변경 전에 거절한다. `applyAuthoringSourcePlan`은 기존 helper의 정확한 단일 draft 읽기를 유지하며, 그 전에 같은 conflict를 확인한다. 추가 저장 key·schema·journal·영구 정책은 없다. 기존 model writer는 변경하지 않았다.

helper의 native 명령은 `beforeinput` 없이 input을 발생시킬 수 있었다. 따라서 입력 이벤트 차단만으로 저장0을 보장하지 않고, persist-first 경로의 첫 candidate 쓰기 전에도 차단했다. 단순히 candidate를 쓴 뒤 rollback하여 최종값만 같게 만드는 경로가 아니다.

사용자가 누르는 기존 `내 초안 다시 확인`의 읽기·복구 정책이나 모든 외부 동시성 조합을 새로 확정하지 않았다. localStorage의 모든 프로세스 간 경쟁을 원자적으로 막는다는 주장도 하지 않는다.

## 후보와 검증 범위

현재 조작용 standalone HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html`)과 Android 이름의 단일 HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`)은 각각 **1,892,656bytes / SHA256 CD6FC42782133995DF00BB6B32E4B798584CB9E7218D396061CB50345EA32F8B**다. Android 파일명은 실제 Android 검사를 뜻하지 않는다. 이전835299·중간556659 후보를 exact backup했고 현재 제공 pin5곳의 SHA/bytes만 갱신했다.

- 생성·기본 모델119/119 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/library-boundary-generated-2026-09-06T03-13-32-688Z.json`) PASS.
- 현재 제공 후보·도구 모델56/56 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/library-boundary-pins-2026-09-06T03-13-33-747Z.json`) PASS.
- 현재 HTTP 명시 전환13개·제공 host8개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-library-final-transition-host-20260906-01.json`)는21/21 PASS. host 검사는 실제 Android가 아닌 desktop 자동 검사다.
- 실제 제공 file12/12 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-library-final-file-20260906-01.json`) PASS. 별도 HTTP 문서가 필요한 CT08을 선택에서 제외했으며 skipped0. HTTP13의 부분 재실행이지 새 고유12개가 아니다.
- 기존 standalone 작성 회귀30/30 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-library-final-authoring-20260906-01.json`) PASS. K1-A19·K3-A11의 기존 spec을 수정하지 않았다. 도움 실패·재시도·native Undo·틀6종·예시·handoff·다섯 viewport를 포함한다.
- creator 보관·개인 Flow 저장의 정상/차단 조합은 위HL05·HL06에서 별도2/2 PASS. 새 기능을 추가한 것이 아니라 기존 보호 진입점의 연결을 검증했다.

4개 검사는 desktop Chromium390×844의 격리 HTTP 문서에서 실행했다. 실제 별도 문서의 library 변경은 제품 복제 버튼으로 만들었고 private 앱 상태나 가짜 library record를 직접 주입하지 않았다. 최초 빈 유효 library/source/workspace와 운영 sentinel만 fixture로 준비했다.

root가 중간556659 후보의 타이핑 차단·도움 실패 PNG와 최종CD6FC4의 HL04 도움 실패 PNG를 직접 읽었다. 실패값·취소·재시도는 보이지만 스크롤된 타이핑 화면에서는 위 경고가 화면 밖에 있으므로, 안내 전체가 항상 노출된다고 평가하지 않는다. helper 내부의 실패 안내는 기존 보관 실패 문구를 사용한다. 원인별 안내와 저장 차단 상태에서의 재시도 발견성은 전체 C3 UI 검토와 구분해 남긴다.

## 변경 파일·남은 작업·공개 상태

제품 변경은 standalone `app.js`의10줄이다. 신규 조합 spec3개, 두 생성 HTML, 현재 후보 pin5곳, 이 QA·진행 원장·통합 보고서가 관련 파일이다. HL01–03 spec은 candidate SHA만 갱신했고 안전 assertion은 유지했다. HL04·HL05/06은 기존3개 spec의 공통 하니스 선언만 AST로 읽어 재사용하며 기존 test3개를 중복 등록하지 않는다.

React는 신규 전환 모델10개·own-write bridge8개, 읽기 전용·초점 보호8개를 연결했다. 첫 화면2FAIL·기존작성29/30·외부 초안 뒤 화면 입력·커서 회귀를 보완하고, 최종973812/HZkt에서 보호·도움왕복7/7·기존작성30/30·baseline/소유/관찰/Stage2 17/17·gate3/3을 통과했다. [React 최종 후보와 실제 실행 §16](./k3c-c1-react-authoring-safety-design.md#16-최종-후보-판정과-다음-단계)에 최초 실패와 최종 결과를 분리했다. 이는 nonempty 명시 전환과 등록한 초안 보호 조합이며 모든 경쟁·복구 조합의 완료는 아니다. C1-c1의 정한 범위를 마치고 C1-c2 실제 상세 조작·복귀 → C2 연습 진입 → C3 로컬 UI → K4 설계로 이어간다.

실제 Android Chrome·iOS Safari·OS IME·OS Back·보조기술: **NOT_RUN**. 관찰 사용자: **0명**. commit·push·PR·Preview·Production: **모두 미실행**. production build와 전체 npm의 새 결과는 현재 React 연결 후 별도로 기록하며 이전 결과를 새 코드의 성공으로 옮기지 않는다. 전체 목표는 active다.
