# K2-C standalone QA — 변경 결과와 Undo 연결

작성일: 2026-09-05. 판정 범위는 **standalone K2-C 신규 브라우저 검사 16개**다. 최종 동결본에서 **16 PASS / 0 FAIL**, 48.1초, 재시도·건너뜀 0건을 확인했다. 전체 제품 완성, React 검증, 기존 회귀 전체의 통과를 뜻하지 않는다.

최종 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/standalone-contextual-third-20260905-01.json`) · 실행한 테스트 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-contextual-result.spec.ts`) · [K2-C 설계](./k2c-design.md) · [배치·adapter 계약](./k2c-placement-and-adapter.md)

## 1. 검증 대상과 실행 조건

- 실행 시각: 2026-09-05 16:51:45 KST 시작. 날짜를 `2026-09-05T09:00:00+09:00`, timezone을 `Asia/Seoul`로 주입했다.
- Playwright가 Windows의 desktop Chrome을 제어했다. 터치는 합성 pointer 이벤트이며 실제 Android/iOS 입력이 아니다.
- `build-single-file.cjs.buildText()`로 현재 source를 메모리에서 빌드하고 전용 테스트 URL에 응답했다. 워커마다 한 번 캐시하고, 모든 워커·context에서 기대 HTML SHA 일치를 강제했다. 기존 사용자 HTML에 덮어써서 테스트하지 않았다.
- 최종 HTML SHA-256: `b86ec093cee3507bd287c341bb484a1a6ea365f7023a97ce5d1e9ae27695c1ad`.
- 당시 app.js SHA-256: `CFDF5B8B99381AB8AF018ACD6B5E9D29A06E2A647AD4BC68B2C3DB0DA6A85788`.
- 최종 test 파일 SHA-256: `57DADDB690FDFBDD970D866718803EB76821DDA065A64FA9CF12D04DB99F37D9`.
- registered test는 16개다. C15 한 테스트 안의 다섯 viewport를 별도 테스트 5개로 합산하지 않는다. 브라우저 context는 일반 15개와 C15의 5개를 합해 20개이며 boundary 첨부도 20개다.

실행 명령은 다음과 같다. 별도의 로컬 서버 3182는 상위 작업이 관리했다.

```powershell
$env:FLOWME_PLAYWRIGHT_PORT='3182'
$env:FLOWME_K2C_EXPECTED_HTML_SHA='b86ec093cee3507bd287c341bb484a1a6ea365f7023a97ce5d1e9ae27695c1ad'
$env:PLAYWRIGHT_JSON_OUTPUT_FILE='output/poc-gap-implementation/k2c/standalone-contextual-third-20260905-01.json'
.\node_modules\.bin\playwright.cmd test tests/e2e/personal-workspace-k2c-contextual-result.spec.ts --workers=1 --reporter=line,json --output=output/playwright/k2c-contextual-third-20260905-01
```

### Fixture와 증거 경계

각 context는 새 localStorage에서 시작한다. 실제 사용자 브라우저 저장소나 운영 데이터를 복사하지 않았다. 기존 모델의 seed를 복제하고, 날짜·완료·시간을 명시한 fixture를 기존 validator로 검사한 뒤 v1 legacy key에 공백·개행을 포함한 exact raw로 넣었다.

일반 fixture는 지난 미완료와 오늘 세 항목, 다음 날·다음 주·월말 항목을 포함한다. 오늘 순서는 08:00 견적 → 10:00 계약 → 12:00 회의다. 빈 목록 검사는 Quick `call`만 오늘에 남긴다. 원문 보존 검사는 실제 handoff 모델로 CRLF·`[x]`·날짜·완료 기준이 있는 작성 Flow를 만들었다. source Undo 검사는 실제 source-candidate 준비·해결·적용 API로 유효한 source Undo store를 만든 것이다.

fixture 주입은 감시 시작 전의 테스트 준비다. 외부 drift 주입도 외부 행위로 구분하며 제품 write 수에 더하지 않는다. 그 외 제품의 `setItem`, `removeItem`, `clear`는 모두 기록·검사했다. 결과 소유권을 바꾸기 위해 제품 내부 함수나 closure를 직접 실행하지 않았다.

## 2. 초기 실패부터 최종 통과까지

| 실행 | 실제 실행 수 | 결과 | 사용 범위와 근거 |
| --- | ---: | --- | --- |
| 최초 15개 | 15 | 12 PASS / 3 FAIL | C01·C13 Quick 결과 누락, C05 native 시작 중단. 워커 재시작 사이 app 수정이 있어 mixed candidate 가능. 최종 통과 근거에서 제외한다. Quick 실패 trace (로컬 전용 근거: `../../../output/playwright/k2c-contextual-first-20260905-01/personal-workspace-k2c-con-71233-ndo-restores-the-exact-item/trace.zip`), 키보드 실패 trace (로컬 전용 근거: `../../../output/playwright/k2c-contextual-first-20260905-01/personal-workspace-k2c-con-9d896-o-restores-the-original-ref/trace.zip`) |
| freeze2 C05 단독 | 1 | 0 PASS / 1 FAIL | 같은 native 시작 90초 timeout 재현. trace (로컬 전용 근거: `../../../output/playwright/k2c-contextual-c05-second-20260905-01/personal-workspace-k2c-con-242b6-share-order-and-result-Undo/trace.zip`) |
| freeze2 전체 | 16 | 15 PASS / 1 FAIL | HTML SHA `52f91aeb20f44c96c22fb200a38d9d8360e5faa46f054c6c27ebb80e38cfcbe5` 일치. C05의 실제 drag 이벤트·scroll 변화를 기록했다. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/standalone-contextual-second-20260905-01.json`) |
| freeze3 C05·C06 focused | 2 | 2 PASS / 0 FAIL | 12.1초. 4개 입력 경로, 성공·pointer cancel 뒤 임시 공간 제거 확인. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/standalone-contextual-c05-third-20260905-01.json`) |
| freeze3 최종 전체 | 16 | 16 PASS / 0 FAIL | 48.1초. 동일 b86ec… HTML, 20 context 경계 검사. JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/standalone-contextual-third-20260905-01.json`) |

위 다섯 번의 실행은 누적 50회(45 PASS / 5 FAIL)지만 서로 다른 테스트 50개가 아니다. 최종 판정은 마지막 16개만 사용한다. 최초 `--list` 확인, 실행 전 shell 오류, 상위 작업의 공통 모델·React·기존 회귀 실행은 이 수에 포함하지 않았다.

### 제품 결함과 수정

| 구분 | 실패 근거와 영향 | 수정 및 최종 확인 |
| --- | --- | --- |
| Quick 결과 identity 누락 | 기존 Quick fixture에는 `ref`가 없어 날짜 이동은 저장돼도 contextual 결과가 나오지 않았다. undefined ref끼리 비교하면 다른 Quick을 변경 대상으로 고를 위험도 있었다. | 상위 작업에서 UI ref를 `quick-item:standalone-integrated:encodeURIComponent(id)`로 정규화하고 변경 항목을 exact id로 선택했다. 운영 schema 변경 없음. C01·C13·C15에서 실제 Quick 결과·Undo 확인. |
| 키보드 결과 닫기 초점 유실 | 상위 작업의 실제 브라우저 진단에서 원래 행이 사라진 뒤 결과를 닫으면 focus가 BODY로 갔다. 초기 C13 실패의 직접 원인은 위 Quick 누락이며 두 결함을 혼동하지 않는다. | 상위 작업에서 원래 행 → 다음 행 → 이전 행 → 현재 h1 순으로 키보드 복귀를 연결했다. 최종 C13은 결과 anchor → Tab Undo → 원래 Quick 복귀, 다시 이동 → Tab 닫기 → h1 focus와 쓰기 0을 검사한다. |
| 이전 결과 제거로 native drag 즉시 종료 | freeze2 C05: trusted `dragstart`(scrollY 223, undone 결과 존재) → trusted `dragend`(scrollY 133, 결과 없음) → scroll/취소. dragover·drop·visualViewport 이벤트는 없었다. `openMovePanel → interruptContextualResult`의 DOM 제거가 문서 높이를 90px 줄인 코드와 일치했다. | 상위 작업에서 활성 gesture 동안 기존 결과의 정확한 공간만 inert·aria-hidden·visibility:hidden으로 유지했다. 권한·announcement는 즉시 끄고 gesture 종료·취소 후 공간을 제거한다. 새 저장 값·상시 padding 없음. 최종 trusted dragstart→dragover→drop 동안 scrollY 223 유지, C05와 C06 및 전체 종료에서 spacer 0 확인. |

native 실패의 수정 전 화면 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-second-20260905-01/personal-workspace-k2c-con-242b6-share-order-and-result-Undo/test-failed-1.png`)과 JSON C05의 `gestureEvents`를 보존했다. 결과를 미리 닫거나 다른 위치로 옮겨 통과시키지 않았다.

### 하니스·런타임 로더 수정

- C01에서 새 `data-contextual-placeholder`만 요구했던 assertion을 실제 계약에 맞췄다. Today는 기존 빈 날짜 그룹을 유지하므로, 같은 날짜 그룹에 결과가 있고 행은 0개이며 저장 task id 목록은 그대로면 충족한다. 특정 DOM marker 부재를 제품 결함으로 처리하지 않았다.
- native 시작의 CDP 호출이 취소 후 대기하는 경우 12초에 이벤트를 수집하고 Escape로 하니스 제어를 회복한다. 이 경로는 반드시 FAIL이며 성공 우회가 아니다. 최종 실행에서는 이 진단 Escape를 사용하지 않았다.
- focused 실행 명령의 `C05|C06` 인수가 Windows .cmd에서 pipe로 해석된 실행 전 오류는 `C0[56]`으로 고쳤다. 그 실패를 브라우저 시나리오 실행에 세지 않았다.
- 상위 작업의 초기 B09 실행은 제품 진입 전에 `import.meta outside module`로 실패했다. canonical runtime 생성기를 CommonJS .cjs로 옮기고 .mjs는 CLI/re-export wrapper로 유지했다. 기존 runtime 검사 4개는 통과했고 신규 E2E에서도 실제 제품에 진입했다. loader 문제를 UI 결함으로 세지 않았다.

## 3. 최종 시나리오별 판정

아래 C 번호는 **실제 테스트 파일의 이름**이다. 설계 문서 §8의 예정 inventory C 번호와 일대일로 같지 않다. 예정 조건 전체를 이 표만으로 완료 처리하지 않는다.

| 실제 테스트 | 확인한 동작 | 결과 |
| --- | --- | --- |
| C01 | 오늘 마지막 Quick을 내일로 이동 → 빈 원래 날짜 그룹에 결과 → Undo. task 추가 없이 같은 Quick 복원 | PASS |
| C02 | Flow를 업무 폴더로 이동 → Item 실행 날짜만 변경 → Undo. 새 부모 폴더, 상속·원문 보존 | PASS |
| C03 | 수동 순서 → 시간순 복귀 → contextual Undo. Today·Week·Month 같은 날짜 순서 일치 | PASS |
| C04 | 완료·다시 열기·Undo·reload. 개인 실행만 변경하고 원문 소유 값 보존 | PASS |
| C05 | 메뉴, Alt+ArrowDown, 합성 350ms 길게 누르기, native mouse drag → 같은 순서와 각 Undo | PASS |
| C06 | 같은 위치·닫기·Escape·pointercancel은 새 성공/write 없음. 활성 gesture 임시 공간도 제거 | PASS |
| C07 | exact workspace key Quota 실패 → 새 성공 숨김·복구 gate → 명시 복구 뒤 이전 bytes 보존 | PASS |
| C08 | 외부 target raw 변경과 원래 raw로 되돌아온 ABA → 이전 결과 실행·부활 차단 | PASS |
| C09 | Item 상세 편집 진입·취소 → 이전 이동 결과 부활 없음, 쓰기 0 | PASS |
| C10 | source Undo가 실제 존재하는 작성 Flow에서 contextual Undo가 workspace만 복원. source store exact 불변 | PASS |
| C11 | workspace 결과 → 작성 → 명시 개인 저장 receipt. 이전 workspace 결과가 receipt를 가리지 않음 | PASS |
| C12 | 결과 닫기 쓰기 0. reload는 snapshot만 유지하며 새 결과를 합성하지 않음. header Undo 유지 | PASS |
| C13 | 키보드 날짜 이동 후 결과 anchor·Tab Undo, 원래 행 복귀. 다시 이동 후 닫기는 현재 h1 복귀 | PASS |
| C14 | 같은 실제 DOM 버튼의 연속 두 click을 한 이벤트 작업에서 보내도 Undo 논리적 성공 1회 | PASS |
| C15 | 5개 해상도에서 마지막 행 이동·완료 결과 활성 상태의 버튼 전체·5점 hit-test·overflow 검사 | PASS |
| C16 | exact target 초기 read 오류 → 이전 contextual Undo 차단, gate 표시, 저장 호출 0 | PASS |

C05의 합성 pointer와 C14의 연속 DOM click은 입력 경계 시뮬레이션이다. 실제 터치 기기나 관찰 사용자 행동으로 표현하지 않는다.

## 4. 화면별 직접 평가

최종 C15의 원본 PNG **10장**을 직접 열어 확인했다. 날짜 이동과 완료 두 상태를 각 해상도에서 비교했다. 캡처는 full-page이며, 버튼 full-rect와 5점 hit-test는 실제 viewport 안으로 필요한 본문 스크롤을 한 뒤 수행했다. 모든 화면 요소가 한 viewport에 동시에 보인다는 뜻은 아니다.

| 해상도 | 직접 화면 평가 | 최종 PNG | 기하 검사 |
| --- | --- | --- | --- |
| 390×844 | 마지막 행이 없어도 날짜 그룹 아래 결과·Undo·닫기가 남는다. 완료 뒤 체크와 메뉴가 결과에 덮이지 않는다. | 날짜 이동 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-third-20260905-01/personal-workspace-k2c-con-ab2e6-strict-five-point-hit-tests/c15-last-row-active-390x844.png`) · 완료 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-third-20260905-01/personal-workspace-k2c-con-ab2e6-strict-five-point-hit-tests/c15-core-actions-active-390x844.png`) | PASS |
| 375×812 | 좁은 폭에서 결과 문구와 버튼을 두 줄로 배치한다. 버튼과 문구 잘림을 발견하지 않았다. 상단 탐색은 기존 가로 스크롤 영역이다. | 날짜 이동 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-third-20260905-01/personal-workspace-k2c-con-ab2e6-strict-five-point-hit-tests/c15-last-row-active-375x812.png`) · 완료 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-third-20260905-01/personal-workspace-k2c-con-ab2e6-strict-five-point-hit-tests/c15-core-actions-active-375x812.png`) | PASS |
| 844×390 | 낮은 높이에서는 상단 설명·통계를 줄이고 날짜·행·결과를 본문으로 연결한다. Undo와 닫기가 나란히 보이고, 필요한 본문 스크롤 뒤 각 버튼 전체가 노출된다. | 날짜 이동 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-third-20260905-01/personal-workspace-k2c-con-ab2e6-strict-five-point-hit-tests/c15-last-row-active-844x390.png`) · 완료 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-third-20260905-01/personal-workspace-k2c-con-ab2e6-strict-five-point-hit-tests/c15-core-actions-active-844x390.png`) | PASS |
| 1024×768 | 좌측 탐색과 header Undo를 유지하면서 해당 날짜 아래에 결과를 둔다. 완료한 행의 체크·메뉴와 복구 버튼이 분리되어 보인다. | 날짜 이동 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-third-20260905-01/personal-workspace-k2c-con-ab2e6-strict-five-point-hit-tests/c15-last-row-active-1024x768.png`) · 완료 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-third-20260905-01/personal-workspace-k2c-con-ab2e6-strict-five-point-hit-tests/c15-core-actions-active-1024x768.png`) | PASS |
| 1440×900 | 본문 폭 안에서 결과 문구와 복구 행동이 한 줄로 연결된다. 결과를 화면 최하단에 고정하지 않고 작업한 날짜 가까이에 둔다. | 날짜 이동 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-third-20260905-01/personal-workspace-k2c-con-ab2e6-strict-five-point-hit-tests/c15-last-row-active-1440x900.png`) · 완료 (로컬 전용 근거: `../../../output/playwright/k2c-contextual-third-20260905-01/personal-workspace-k2c-con-ab2e6-strict-five-point-hit-tests/c15-core-actions-active-1440x900.png`) | PASS |

검사한 상태에서 결과·Undo·닫기와 완료 체크·메뉴가 서로 덮이는 문제, 문구/버튼 잘림을 발견하지 않았다. viewport별 document/body 가로 overflow는 정확히 0이었다. 390·375의 상단 탐색은 기존 내부 가로 스크롤이므로 모든 폴더가 동시에 보이는 것은 아니다. 이 검사에서 탐색 구조 전체를 재설계하거나 사용성 검증 완료로 판정하지 않았다.

Flow UX 리뷰 기준으로 보면, 변경 후 복구 행동의 위치와 대상·목적 날짜/완료 상태는 명확해졌다. 중복 “오늘/주간/월간 목록” heading은 상위 작업에서 제거했고 날짜 heading·시간·Flow/폴더 경로는 유지했다. header Undo는 대체 진입점으로 보존했고, 일반 성공 live status는 결과 한 곳으로 제한했다. 빈 목록의 통계·설명 밀도, 긴 폴더명/긴 원문/Sheet의 전체 정보량은 이번 화면 fixture만으로 평가하지 않았다. 전체 제품 rubric 점수나 공개 가능 등급은 부여하지 않는다.

## 5. 저장 경계와 운영 데이터 불변 증거

최종 JSON의 각 `k2c-boundary` 첨부는 HTML hash, 제품 write 호출, 운영 fixture 전후 값, legacy exact 보존 여부, console/page error를 담는다. 20개 첨부를 모두 집계했다.

| key | setItem·removeItem 호출 합계 |
| --- | ---: |
| `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2` | 155 |
| `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2` | 52 |
| `flow:poc:personal-workspace:v1:standalone-integrated:draft` | 6 |
| 합계 | 213 |

메서드별로는 setItem 160, removeItem 53, clear 0이다. **213은 성공 변경 수가 아니라 실패 injection·journal prepare/confirm/cleanup·복구를 포함한 저장 호출 수**다.

- 허용 prefix 밖 setItem/removeItem/clear: 0건.
- v1 legacy workspace key writer: 0건. 공백·개행을 포함한 원래 raw가 20개 context 모두 byte-for-byte 동일.
- prefix 밖 운영 fixture sentinel은 CRLF·탭·한글·emoji를 포함한다. 전후 key/value 비교가 20개 context 모두 일치.
- source Undo fixture의 source store는 contextual Undo 전후 exact bytes 동일.
- 같은 위치·취소·Escape·결과 닫기·read 실패는 해당 동작을 감싼 전후 snapshot과 호출 수 비교에서 0 write. Quota 실패의 PoC journal 기록을 0 write라고 보고하지 않는다.
- 최종 console error 0, page error 0. 테스트 실행기의 NO_COLOR/FORCE_COLOR 경고는 브라우저 콘솔 오류가 아니다.

이는 **격리된 테스트 origin의 운영 키 fixture 불변 증거**다. 실제 사용자의 기존 브라우저 프로필이나 전체 운영 DB를 읽어 비교한 결과가 아니다. 기존 `/my` exact gate·네 origin 전체 회귀는 상위 작업의 별도 결과와 함께 판단해야 한다.

## 6. 이 문서로 확정하지 않는 범위

신규 16개는 변경 결과 owner·복구 발견성을 겨냥한 bounded 검증이다. [설계 inventory](./k2c-design.md) 중 다음 조건은 이 실행만으로 전부 충족했다고 말하지 않는다.

- Quick 폴더 이동 전체, 같은 제목의 모든 사본, 네 saved-plan origin 전체 상세 흐름.
- 영역 밖·blur·resize·화면회전·실제 합성 클릭 누출의 모든 이동 회귀.
- 모든 CAS/readback/rollback crash 지점과 Plan·Quick 편집 실패·복구 조합. 신규 browser injection은 exact target Quota와 초기 read, 외부 raw drift에 한정한다.
- late async callback의 모든 조합과 creator lane 전체. 공통 순수 owner 모델 검증과 기존 회귀가 별도로 필요하다.
- 5개 해상도 각각의 긴 목록·실패 폼·긴 폴더명·Sheet·원문 작성 전 화면.
- screen reader의 실제 발표, Android Chrome, iOS Safari, 실제 터치·가상 키보드·보조기술·관찰 사용자 검사.

상위 작업이 진행하는 사용자 HTML 재생성·hash 동기화 이후 standalone 재검사, 기존 K2-B 14개와 C3 UI 16개 회귀, React 검증, npm test 및 production build는 그 실행 결과에서 따로 보고한다. 이 문서는 해당 작업의 완료를 선취하지 않는다.

## 7. 변경·검증·발행 상태

이 하위 QA 작업의 산출물은 신규 E2E, 허용된 runtime loader 호환 수정, 이 문서다. 제품 결함 수정은 상위 작업이 소유한 app.js에서 수행했다. 기존 report/progress 문서는 수정하지 않았다.

| 항목 | 상태 |
| --- | --- |
| 신규 standalone E2E | 최종 16/16 PASS |
| 직접 화면 검사 | 최종 PNG 10장 확인, 위 범위의 겹침/잘림 미발견 |
| 문서 검사 | `npm.cmd run docs:check` PASS: skill sync, 필수 문서 16개, 로컬 링크 5,035개 |
| scoped closeout | 명령 실행 성공. exact-file scope를 변경 0으로 출력했으므로 이것을 파일 없음의 증거로 쓰지 않았다. `git status --short --untracked-files=all -- <이 문서>`에서 신규 untracked 파일 1개를 직접 확인했다. |
| Android Chrome 실제 기기 | NOT_RUN |
| iOS Safari 실제 기기 | NOT_RUN |
| 보조기술 실제 사용 | NOT_RUN |
| 관찰 사용자 수 | 0 |
| commit | 미실행 |
| push | 미실행 |
| PR | 미실행 |
| Preview | 미실행 |
| Production | 미실행 |

보고서는 flow-report-artifact의 증거 구분과 flow-ux-review의 중복 제거·복구 보존 기준을 적용했다. 지정된 Markdown 형식과 한 파일 소유 범위를 지켰으며, 자동화를 사용자 검증이나 출시 승인으로 바꾸어 표현하지 않았다.
