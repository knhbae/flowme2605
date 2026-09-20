# K3-B B1-UI — Plan/Item control presenter 검증

2026-09-05. **순수 presenter 17/17 PASS, 독립 Chromium HTML-parser fixture 수정 후 8/8 일치.** 화면 연결·Plan 저장·5 viewport·기기 검증을 완료했다는 뜻이 아니다. [UI 연결 설계](./k3b-plan-ui-connection-design.md)의 첫 작은 모듈만 검증했다.

## 1. 검토 대상과 소유

- root 구현: [personal-plan-editor-controls.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-editor-controls.js)와 [기존 12개 시험](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-editor-controls.test.cjs).
- 독립 검토: [신규 5개 시험](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-editor-controls-review.test.cjs), 이 QA, 별도 DOM probe (로컬 전용 근거: `../../../output/playwright/k3b-controls-dom/dom-probe.cjs`)와 실행 증거만 작성했다. reviewer는 제품 파일을 수정하지 않았다.
- 원본 비교: [React EditorSurface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocEditorSurface.tsx)의 `TextDraftControl`·`ScheduleDraftControl` 및 imported 개인 메모 inherit 전달을 읽었다. [P 계약](./k3b-plan-context-contract.md), 기존 [T 날짜 validator](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/timeline-context.js)의 날짜 범위도 대조했다.
- module은 문자열 렌더링과 지역 mode 변경 함수만 제공한다. source/context·candidate·storage writer·session 권위는 없다. app/builder/CSS/기존 사용자 HTML은 이 검사자가 변경하지 않았다.

UX 검토 스킬은 기존 control을 재사용하고 source/개인 baseline·오류·label을 보존하는 데 적용했다. UI를 새로 구성하거나 설명을 늘리지 않았다. Figma는 사용하지 않았다. 원본 세션 대화를 이번에 다시 조회하지 않았으며, 실제 화면을 조작하지 않은 상태에서 UX rubric 점수를 매기지 않았다.

## 2. 요구와 실제 확인 범위

| 요구 | 비교·시험 | 판정 범위 |
| --- | --- | --- |
| inherit→override는 현재 inherited 값 사용 | UIC07/UICR03의 text mode matrix | exact 공백·CRLF·빈 override 보존. 기존 override를 재선택해도 baseline으로 덮지 않음 |
| fixed_date 진입은 빈 날짜로 시작 | UIC08/UICR03의 schedule mode matrix | 오늘/원래 날짜를 추정하지 않음. 기존 fixed pin 재선택은 그대로 |
| source와 기존 개인 기준의 표현 구분 | UIC01/02/03/06/11, UICR04 | source만 `원본 따르기`; 기존 개인 제목·memo·일정은 해당 기준 유지. source description을 memo로 사용하지 않음 |
| memo 부재/명시 빈 값/공백/CRLF | UIC03/05/UICR01/04 | 부재는 없음, `''`는 빈 메모, 공백·CRLF는 raw 문자열 유지. CSS의 시각적 pre-wrap은 아직 미검사 |
| invalid 입력 유지와 지역 오류 | UIC04/06/09/UICR02/03 | blank title·빈/잘못된 fixed date를 자동 inherit/null로 바꾸지 않음. unknown mode 거절 |
| HTML escaping | UIC04/05/UICR04와 DOM probe | text/attribute/textarea 종료문자 및 `&<>"'` 안전 출력, 조작 fixture의 원래 값 불변 |
| label/value/error 연결 | UIC10/UICR05 | Plan/Item 고정 id 충돌 0, `for`·`aria-describedby`의 대상 id 각각 1개. 실제 AT·키보드 동작은 별도 |
| ambient I/O 없음 | UIC12 | 실제 UMD entry의 mode 변경에 DOM/storage/window/fetch 접근 0. 전체 제품 writer 검증으로 확대하지 않음 |

지원되는 mode 전환의 결과는 React와 같다. unknown mode는 presenter API에서 명시 거절하며 DOM select의 정상 option만 기대하는 React handler의 fallback을 불법 입력 계약으로 가져오지 않았다. 개인 baseline용 문구는 B1-UI owner 설계에 따른 차이이지, 입증되지 않은 값을 원문으로 복원한 결과가 아니다.

## 3. 발견한 결함과 root의 최소 수정

| 결함 | 수정 전 실증 | 수정 | 수정 후 증거 |
| --- | --- | --- | --- |
| textarea 선두 줄바꿈 손실 | UICR01에서 `\n메모`의 HTML 내용이 실제 React SSR의 `\n\n메모`와 불일치. 별도 Chromium에서도 첫 줄바꿈 누락 | raw가 LF/CR로 시작할 때 HTML 파서가 소비할 추가 LF 한 개만 앞에 둠. draft 값은 바꾸지 않음 | UICR01의 LF·CRLF·CR matrix PASS, Chromium 선두 newline 6종 보존 |
| 연도 0000을 유효 날짜로 표시 | UICR02의 `0000-01-01`에서 T는 false이나 지역 `aria-invalid` 없음 | 기존 4자리 날짜 검사에 year≥1 추가. 기존 ISO/leap 확인 유지 | UICR02의 year 0/1/99/9999, leap/invalid/빈 값 matrix PASS |

textarea의 시작 직후 LF를 무시하는 동작은 [WHATWG HTML 13.1.2.5](https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions)에 따른다. CR/CRLF 입력은 파싱·textarea DOM 값에서 LF로 정상화되므로 **raw CRLF와 DOM LF를 byte 동일이라고 주장하지 않는다**. 수정은 첫 논리 줄바꿈을 보존하며, 원래 raw draft의 정확 문자열 보존은 별도 비교했다.

수정 전 정확 backup (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-controls-review/personal-plan-editor-controls.js`)을 현재 source와 직접 diff했다. 제품 차이는 날짜 validator 1줄과 textarea serialization 1줄이다. 다른 mode, writer, source owner, CSS를 바꾼 수정은 없다.

## 4. 순수 시험 실행 원장

| 실행 | 등록/실행 | 결과 | 해석 |
| --- | ---: | --- | --- |
| root 최초 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-editor-controls-red-2026-09-05T11-42-14-110Z.json`) | 12 | 1 PASS / 11 FAIL | module API 미구현. UIC09의 `assert.throws`는 없는 API의 TypeError도 잡았으므로 그 1 PASS는 올바른 negative 검증 증거가 아니었음 |
| root 최초 구현 GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-editor-controls-first-2026-09-05T11-44-50-232Z.json`) | 같은 12 | 12/12 PASS | UIC09에 API 존재 assertion을 먼저 추가. 나머지 안전 기대값을 낮추지 않음 |
| 독립 review RED (로컬 전용 근거: `../../../output/k3b/personal-plan-controls-review-red-20260905.tap`) | 신규 5 | 3 PASS / 2 FAIL | 실제 선두 LF·연도 0 결함. 첫 LF assertion에서 실패하여 그 실행의 CR/CRLF 하위 입력은 미도달 |
| 독립 최종 합동 (로컬 전용 근거: `../../../output/k3b/personal-plan-controls-review-final-20260905.tap`) | 기존 12 + 신규 5 | **17/17 PASS** | root 두 줄 수정 뒤 같은 기대값. 신규 5의 모든 하위 matrix도 도달. fail/skip/cancel/todo 0 |

현재 고유 등록 시험은 **17개**다. 위 역사·재실행 횟수를 더해 고유 수를 늘리지 않는다. root가 별도로 알린 합동 17/17 실행도 같은 시험의 재실행이며, 이 QA의 최종 직접 확인 로그는 마지막 행이다. C/P/E2 등 다른 단계의 시험 수를 포함하지 않는다.

신규 5개는 다음을 검사한다: UICR01 선두 줄바꿈 serialization, UICR02 기존 날짜 계약과의 일치, UICR03 전체 mode 전환·입력 불변·unknown 거절, UICR04 source/개인 baseline·escaping·공백 보존, UICR05 여러 control의 label/error id 충돌과 연결.

## 5. 별도 Chromium DOM 파서 확인

DOM 결과 JSON (로컬 전용 근거: `../../../output/playwright/k3b-controls-dom/dom-probe-first-20260905.json`). headless Chrome `151.0.7922.138`, fresh context **2개**에서 각각 before/after presenter 출력만 `page.setContent`로 넣었다. 제품 route·서버·app 이벤트 handler는 열지 않았다. 실제 Chromium 실행이지만 전체 기능 흐름이나 UI 화면 검사로 표현하지 않는다.

입력 8종은 빈 값, 일반 메모, LF·CRLF·CR 선두, 이중 LF·이중 CRLF, 선두 LF와 `</textarea><img …>`를 포함한 탈출 문자열이다. 같은 8종을 수정 전/후에 반복해 **총 16 DOM fixture 실행**이다. `node:test`의 추가 등록 시험 16개가 아니며 위 17개에 합산하지 않는다.

| 실제 관측 | 수정 전 | 수정 후 |
| --- | ---: | ---: |
| 예상 textarea DOM value 일치 | 2/8 | **8/8** |
| 선두 논리 줄바꿈 누락 | 6종 | **0종** |
| 원래 입력 draft JSON 불변 | 8/8 | 8/8 |
| 주입된 img/script / 주입 플래그 | 0 / false | 0 / false |
| 관측한 storage set/remove/clear 호출 | 0 | 0 |
| network 요청 / page error / console error | 0 / 0 / 0 | 0 / 0 / 0 |

DOM 예상값은 원래 raw의 CRLF/CR을 LF로 바꾼 값이다. 각 raw·hash·예상 DOM 값·실제 DOM 값·source hash를 JSON에 함께 남겼다. before mismatch 6개가 실제로 있어야 하고 after mismatch가 0이어야 diagnostic PASS다. before의 6개 손실을 정상 동작 PASS로 계산하지 않는다.

이 context에는 운영 sentinel이나 실사용자 profile이 없었다. storage method 호출 0을 관측했지만 기존 운영 데이터의 byte-for-byte 실측 검증을 했다는 뜻은 아니다. 화면 캡처 0, DOM fixture용 기본 화면 크기는 평가하지 않았다.

## 6. 아직 남은 연결·검증

- app에서 실제 P/E2 baseline을 받아 control을 렌더링하고 mode 변경→child 반영→Plan 한 번 저장하는 연결.
- CSS의 긴 공백/CRLF 시인성·anywhere wrapping, control focus, 키보드와 dirty/오류/retry/복구 행동.
- 390×844, 375×812, 844×390, 1024×768, 1440×900의 전체 rect·여러 점 hit·내부 overflow·핵심 행동 가림.
- source-only drift·실제 storage fault·prepared/confirmed·Undo/reload·네 origin/결과 화면의 필드 동등성.
- 전체 npm test/production build 및 새 연결 후보의 회귀. 이번 QA는 이 둘을 실행하지 않았다.

실제 Android Chrome/iOS Safari·OS IME·보조기술은 NOT_RUN, 관찰 사용자 0명이다. commit/push/PR/Preview/Production은 하지 않았다. 개인 구간·Plan 순서는 B2, 최종 변경 영수증은 B3 별도 판정이다.

source SHA256: before `326E8D64C712B29643F9E183F54018E3D86695C793168220618F4E4ABFEE46CE`, after `FC0F35C12C196A10CA9C96EC90530F1CF691612F4D3BAD92F2B5DAE0A4CF4869`. 신규 review test는 `5B40152BF3F02CEFA2673C189805491202FF81F0F061ECB485AE6B2C12C42C59`다. 독립 최종17과 DOM before/after는 위 source를 사용했다.

문서 검사 `npm.cmd run docs:check` PASS — required files 16개, local links 5,590개. 제품 테스트 수와 별도로 기록한다.
