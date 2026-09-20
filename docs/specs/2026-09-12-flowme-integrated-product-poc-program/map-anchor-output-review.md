# 실제 Map 기준일·기존 기록·파일 출력 연결

2026-09-13 · 전체 목표의 중간 개선. P02/P03/P04/P08와 S02/S04/S05/S09/S10의 해당 조합이며 전체 세 산출물 동등성이나 두 전체 개선 루프 완료가 아니다.

## 원래 요구와 실제 결함

| 원래 요구 | 같은 자료에서 확인한 차이 | 이번 보완 |
| --- | --- | --- |
| 개발1의 실제 Map와 하위 Flow 기준일을 개인화하고 반복을 실행 | 회차 실행은 연결됐지만 Map 기준일 변경 UI/model은 작성 원문의 상대 날짜만 인정했다. 실제 저장 Map의 `saved-flow-anchor`는 선택 UI에서 빠지고 비교에서 거절됐다. | 검증된 read model의 실제 tuple·calendar `routine/start_date` 근거로 기준일 의존 여부를 판단한다. UI와 모델이 같은 판정을 사용하며 각 회차·범위·새 날짜의 명시 선택은 계속 필요하다. |
| v4.1/개발3의 같은 개인 계획·지난 실행과 Undo | 새 기준일을 여러 Flow에 적용할 때 기존 개인 반복 owner와 완료한 원래 회차를 함께 보존해야 한다. | 기존 두 Map/세 Flow 프로필을 초기화하지 않고 공통10/7·노점프 하위 고정10/14, 기존 개인10/13→10/27과 아침10/2→10/9를 한 거래로 적용한다. 원래10/1→11/2 완료는 별도 유지한다. |
| 개발1의 외부 도구에서 원문을 추측 없이 사용 | 첫 실제 TXT/CSV/ICS에는 날짜·완료가 있었지만 실제 영상 URL·주의문·요일 설정의 근거가 빠졌다. 다운로드 성공은 내용 충실도 통과가 아니었다. | 읽기 전용 출력에서 선택된 structured 원문의 실제 URL·원문 제목·구성 안내·주의문을 보존한다. ALLBLANC의 요일은 저장한 개인 캘린더 설정으로 구분하며 영상의 고정 처방으로 표현하지 않는다. |
| 변경 결과를 사용자가 예측 | 반복 계획2개를 바꾸어도 일반 날짜 변경0개만 보여 적용 결과를 오해할 수 있었다. | 반복 계획 변경 수를 따로 표시하고 기존 수치를 일반 항목의 날짜 변경으로 명시한다. 새 저장 상태나 효과는 추가하지 않는다. |

실제 원문·일정 identity·원본 owner·운영 저장소는 변경하지 않는다. structured Map에 가짜 TXT·D+0 원문·sourceLine을 만들지 않는다. 제외·보류·손상·foreign tuple 및 명시 선택/예상 snapshot 검증을 완화하지 않는다. 새 실행/전체 백업/전체 하위 Flow 제외/재공개 정책은 이번 변경으로 확정하지 않는다.

## 재현과 개선 루프

1. dFR 실제 재현4확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-anchor-diagnostic-dfr-2026-09-13T07-56-09-945Z.json`): 기존 프로필 그대로 reload→공통 기준일 입력→회차 선택UI0/typed-source 거절→취소. 저장 호출0·보호5키 byte-identical. ME13도 같은 거절을 모델에서 재현했다.
2. Y8 동일 자료31확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-anchor-journey-retry-2026-09-13T08-07-10-719Z.json`): 6크기/키보드·명시 선택·quota/재시도·한 거래·같은값0·3파일·Undo/reload. 실제 원본과 기존 완료/개인 계획을 유지했다. 파일의 출처 충실도는 이 단계에서 실패한 것으로 후속 구분한다.
3. ME15는 실제 선택 원문의 URL이 출력에서 null인 결함을 재현했다. 후속 출력 수정27표적/27PASS와 UI6표적/6PASS, strict311/진단0 뒤 소스를 동결했다. 최종 전체 검사·새 빌드·같은 프로필 재실행·실제 파일 bytes 대조는 아래 최종 근거에 기록한다.

검사 코드의 실패도 보존한다. 첫 브라우저15확인 뒤 timeout은 `getByLabel` 대신 실제 접근성 이름의 combobox를 찾아야 했던 locator 문제다. 원래 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-anchor-journey-2026-09-13T08-05-49-215Z.json`)을 보존했고 취소 뒤 같은 저장 자료로 재실행했다. ME14의 첫 테스트 준비 실패는 잘못 쓴 schedule mode와 owner ID, ME15의 후속 assertion은 CSV/ICS escaping을 해제하지 않은 검사 오류였으며 제품 조건을 완화하지 않았다.

## 최종 근거

최종 실행판은 `QGpjAGF-6co7n-_N0T0K7`이다. 같은 자료의 브라우저35확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-anchor-journey-final-2026-09-13T08-18-52-093Z.json`)에서 실제 route chunk와 빌드 일치, 공통/하위 고정 기준일·기존 개인 계획·지난 완료 보존, 실패/재시도·같은 값0쓰기·실제3다운로드·전역 Undo/reload를 확인했다. 보호5키 byte-identical, 허용 prefix 밖 쓰기0, page/console 오류0이다. 성공 적용은4506ms로 응답성 잔여이며 일반 성능 통과가 아니다.

실제 파일·현재 소스 대조15확인 (로컬 전용 근거: `../../../output/integrated-product-poc/map-anchor-crosscheck-2026-09-13T08-20-55-390Z.json`)은 별도 기록 검사다. TXT9069bytes·CSV17039bytes·ICS21488bytes를 해당 입력의 현재 projector와 byte-for-byte 비교하고 실제 URL·요일 근거·구성 안내·주의문·날짜·완료·고유 ID를 확인했다. 화면 textarea의 CRLF→LF 정규화는 표시 비교에서만 반영했고 파일 원본의 정확한 바이트 검사는 유지했다. 최초 검사 오류를 제품 파일 수정이나 출처 충실도 통과로 대신하지 않았다.

최종 소스는 134파일1180/1180·제외0 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T08-14-16-440Z.json`), strict311/진단0 (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T08-14-01-820Z.json`), npm2031실행/2030PASS/기존 출처기한1FAIL (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T08-16-38-897Z.json`), 승인201 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T08-16-56-797Z.json`)·공개19 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T08-16-59-156Z.json`), production build PASS (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T08-17-22-120Z.json`)다. 위15대조는 현재 제품 파일 목록/SHA256과 검사·빌드의 동결 입력 일치도 확인했다. 후속 보고서 정리 턴에서 전체 검사를 다시 실행한 것으로 세지 않는다. 의존성 audit는 이번 개선에서 재실행하지 않았다.

375×812·390×844·844×390·1024×768·1194×834·1440×900에서 회차 선택 버튼의 키보드 초점·44px hit-test·가로 넘침0과 Escape0쓰기를 확인했다. 375px 선택 (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-anchor-chooser-375-1789287537245.png`), 1024px 변경 비교 (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-common-fixed-preview-1024-1789287554921.png`), 1024px 실제 출력 (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-anchor-source-output-1024-1789287576186.png`)을 직접 보았다. 이 화면 범위를 앱 전체 반응형 동등성으로 확대하지 않는다.

## 남는 범위와 UX 평가

- Map 기준일·포함/제외·새 원본·개인 계획/과거 기록의 더 긴 연속 조합, 원본 Undo 뒤 일반 진행 추가 저장, 기존 제작기의 모든 세부 기능, 전체10상황의 두 평가·개선 루프는 계속 남는다.
- 실제6크기 선택 버튼 접근과 overflow0은 이 화면 범위다. 긴 회차 목록/모바일 세로 스크롤, 기본 조회일이 원문 기준일 대신 오늘에서 시작하는 부담, 원본 비교의 기술적 표시와 기존 계획의0/0완료 표시는 별도 잔여다. 이번 캡처에서 직접 본 문제를 앱 전체의 개선 완료로 바꾸지 않는다.
- 기능 경로의 실행 명확성은 선택 UI 미노출에서 명시 선택 가능한 상태로 개선됐다. 인지 부담은 여전히 낮은 평가이며 장문/여러 Flow의 읽기 부담을 다음 평가에서 함께 확인한다. 관찰 사용자 점수나 실제 선호를 만들지 않는다.
- 실제 Android/iOS·OS IME/보조기술·외부 계정 왕복·관찰 사용자0. commit/push/PR/merge/Preview/Production·실제 공개/전송 미실행. 보고서 HTML 렌더의 URL 정책 차단은 우회하지 않는다.

## 변경 경계

제품: `program-legacy-plan.ts`, `ProgramLegacyPlanSeries.tsx`, `ProgramLegacyMapPlan.tsx`, `private-output-occurrences.ts`. 회귀: `structured-map-execution.test.ts`의 ME13~ME15. 실제 검사: `program-map-anchor-diagnostic.cli.js`, `program-map-anchor-journey.cli.js`, `program-map-anchor-crosscheck.ts`. 요구·근거·보고서는 이 문서와 현재 판정/진행/요구 원장에 연결한다.

React 검토는 기존 훅/쓰기/입력 잠금을 유지하고 render에서 비교 결과를 읽는 범위로 진행했다. Figma와 새 시각 구성/이미지 생성은 사용하지 않았다. 기존 캡처 중심 보고서의 배치는 유지한다.
