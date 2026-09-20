# K2-B 기간·날짜별 순서 UI 검증

검증일: 2026-09-05. 대상은 현재 standalone 소스를 메모리에서 합성한 Chromium 페이지다. **최종 등록 14개 중 13 PASS, 1 FAIL**이다. 실패는 고정 알림(toast)이 핵심 버튼을 일부 가리는 문제이며, K2-C에서 다시 검사한다. 알림을 닫은 뒤의 통과를 알림 표시 중 통과로 바꾸지 않는다.

이 문서는 [K2-B 설계 §7](./k2b-design.md)의 B01–B09를 실제 등록 테스트와 연결한다. 전체 통합 PoC 완성도, React와 standalone의 전체 동등성, 운영 `/my` 회귀, 실제 기기 검증을 대신하지 않는다.

## 1. 실행물과 판정 범위

| 항목 | 이번 실행의 사실 |
|---|---|
| 실행 파일 | personal-workspace-k2b-timeline-ui.spec.ts (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2b-timeline-ui.spec.ts`), 14개 등록 |
| 대상 HTML | `build-single-file.cjs.buildText()`의 메모리 결과를 `/__k2b-fixture/standalone.html`로 응답. 디스크 HTML 덮어쓰기 없음 |
| 최종 HTML SHA-256 | `cf20f0f53b0db46bdbf0137882cff1fb5ac8b778ed310c017d16c3212abe0483` — 최종 15개 boundary 기록 모두 동일 |
| 테스트 파일 SHA-256 | `312096F0CBBF434A5F0E19FE60BE54A624420E0943DA46FDBE51600A14DDDCE9`, 33,651 bytes |
| 시간 | Chromium timezone `Asia/Seoul`, Playwright clock `2026-09-05T09:00:00+09:00`. 앱의 실제 로컬 날짜 읽기 경로 사용 |
| 브라우저 | 자동화 Chromium. 기본 1024×768, B09에서 지정 5개 해상도 순회 |
| 최종 결과 | 13 PASS / 1 FAIL / skip 0 / flaky 0, 31.1초 |
| 기본 자료 | 최종 실행 JSON (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01.json`) |

14개는 독립 등록 테스트 수다. B03의 입력 경로 5개, B07의 손상 payload 2개, B09의 화면 크기 5개는 각각 테스트 내부 subcheck다. 재실행까지 합한 **34회 실행을 34개 독립 시나리오로 계산하지 않는다.**

## 2. 초기 결과와 하니스 진단을 분리한 실행 이력

| 실행 | 등록/실행 | 결과 | 해석·원본 로그 |
|---|---:|---|---|
| 최초 전체 | 14 | 12 PASS / 2 FAIL | native drag 좌표·알림 간섭, root scrollport clip 계산 문제를 분리하기 전. JSON (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-current.json`) |
| 진단 1 | 2 | 0 PASS / 2 FAIL | live mouse drag와 clip 상세값 수집. HTML의 scroll offset을 viewport clip에 중복 적용한 하니스 오류 확인. JSON (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-diagnostic-20260905-01.json`) |
| 진단 2 | 2 | 0 PASS / 2 FAIL | root clip 정정. toast를 실제 닫았으나 drag 대상이 viewport 경계에 걸리는 좌표 문제 남음. 버튼 하단의 실제 toast 가림 확인. JSON (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-diagnostic-20260905-02.json`) |
| focused 재검사 | 2 | 1 PASS / 1 FAIL | native drag 대상·시작 핸들을 함께 보이게 스크롤한 뒤 실좌표 사용. 5입력 경로 PASS. 5해상도를 모두 검사하고 활성 toast 가림은 FAIL 유지. JSON (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-diagnostic-20260905-03.json`) |
| 최종 전체 | 14 | 13 PASS / 1 FAIL | 동일 메모리 HTML로 모든 등록 시나리오 재실행. 유일한 실패 테스트는 B09. JSON (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01.json`) |

이전 실패 증거는 덮어쓰지 않았다. 최초 `current` 경로는 그 실행에서 처음 생성했으며, 이후에는 새 label을 사용했다. 초기 드래그 실패 화면 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-current/personal-workspace-k2b-tim-af459-s-use-one-same-date-reorder/test-failed-1.png`)과 모바일 실패 화면 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-current/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/test-failed-1.png`)도 남아 있다.

하니스 정정은 제품 결함을 숨기는 완화가 아니다. root HTML은 이미 viewport로 검사하므로 document rect의 스크롤 이동량으로 다시 clip하지 않도록 수정했다. 최종 geometry는 전체 rect 노출, 중심 및 버튼 내부 네 모서리 hit-test를 요구한다. 둥근 테두리 바깥을 잘못 검사하지 않도록 모서리는 8px 안쪽을 사용한다. 가로 넘침은 `max(0, documentElement.scrollWidth - innerWidth, body.scrollWidth - innerWidth) === 0`으로 검사했다.

입력 경로 비교에서는 이전 Undo 알림을 **실제 닫기 버튼으로 닫고**, native drag 시작·대상이 함께 보이는 좌표를 사용했다. 이 조건을 활성 알림 가림 검증과 구분했다. native drag는 mouse 동작으로 실제 HTML drag 이벤트를 발생시켰고, 길게 누르기는 합성 touch pointer와 380ms clock 진행으로 검사했다. 후자는 실제 터치 기기 검사가 아니다.

## 3. 14개 실제 등록 테스트와 최종 판정

아래 영문 이름은 테스트 파일 및 최종 JSON의 실제 등록 이름이다.

| 번호 / 설계 ID | 실제 등록 이름 | 실제 확인한 흐름 | 최종 |
|---|---|---|---|
| 01 / B01 | `B01 periods use one real local date; week is Monday–Sunday and reads write nothing` | 오늘 9/5, 지난 미완료 포함·완료 제외, 주간 8/31–9/6, 다음 월요일 제외, 월간·미정. 읽기만으로 API 쓰기 및 v2 생성 없음 | PASS |
| 02 / B02 | `B02 one date order is shared by today/week/month and survives reload without changing Plan/source/folder` | 같은 날짜 `quote` 아래로 이동 → 오늘·주간·월간 동일 `contract,quote,meeting` → reload. 원문·Plan·폴더 소유 값 보존 | PASS |
| 03 / B03 | `B03 reset uses time order and one Undo restores manual order including after reload` | 날짜별 수동 순서 → 시간순 reset → reload → 단일 Undo로 수동 순서 복원 | PASS |
| 04 / B03 | `B03 row/menu/keyboard/native drag/synthetic long press use one same-date reorder` | 행/메뉴/키보드/native drag/합성 길게 누르기로 같은 순서. 각 경로 후 실제 Undo로 시작 순서 복원 | PASS |
| 05 / B04 | `B04 overdue completion agrees with Flow/month then reopen and Undo preserve execution owner` | 지난 미완료 완료 → 오늘에서 제거 → 월간·Flow 상세 완료 확인 → 다시 열기 → 오늘 재노출 → Undo | PASS |
| 06 / B05 | `B05 empty month expand/collapse is read-only; date add and date move affect only selected Quick` | 빈 날짜 펼침/접기 쓰기 0 → 9/10 빠른 할 일 추가 → 9/6 이동. 기존 task·Flow 원문 불변 | PASS |
| 07 / B05 | `B05 Flow folder inheritance and Item execution date movement keep Plan and raw source unchanged` | Flow를 업무 폴더로 이동 → Item은 부모 폴더 상속 → Item 날짜만 9/6으로 이동. Plan·원문 불변 | PASS |
| 08 / B06 | `B06 same position, explicit cancel, Escape, pointer cancel and resize make zero writes and keep Undo` | 같은 날짜·닫기·Escape·합성 pointer cancel·창 크기 변경에서 API 쓰기 0, 이전 Undo 보존 | PASS |
| 09 / B06 | `B06 date rollover invalidates an already-open reorder ticket before any write` | 이동 패널을 연 후 9/6 00:01로 clock 변경 → 오래된 순서 이동 거절·쓰기 0 → reload 기준일 9/6 | PASS |
| 10 / B07 | `B07 unambiguous old order is read without migration and remains archived after first new action` | week/month의 일치하는 구 정렬을 읽기만으로 투영 → 첫 새 변경 → legacy raw 및 baseline 보존 → Undo | PASS |
| 11 / B07 | `B07 conflicting legacy order is bounded time fallback with reorder blocked but safe completion available` | 서로 다른 구 정렬 후보에서 시간순 fallback·순서 이동 잠금·키보드 쓰기 0. 안전한 완료는 가능 | PASS |
| 12 / B07 | `B07 corrupt checkpoint or legacy payload fail closed without boot writes` | v2 손상, legacy 손상 두 독립 context. 부팅·다시 확인에서 쓰기 0, storage gate 유지 | PASS |
| 13 / B08 | `B08 exact checkpoint quota keeps before bytes, requires explicit recovery, then retries and reload Undo` | 정확한 v2 key Quota 1회 주입 → 이전 bytes 유지·복구 gate → 명시 복구 → 재시도 → reload·Undo | PASS |
| 14 / B09 | `B09 five viewport geometry/hit-test and non-drag keyboard paths cover core period actions` | 5해상도 전체 순회. 키보드 이동·Escape, 날짜 reset·이동 패널·월간 토글·날짜 추가 검사 | **FAIL: 활성 알림 가림** |

## 4. 네 origin, 신규 handoff, 원문·Plan 보존의 정확한 범위

| 자료 | 구성·증거 | 이 실행이 주장하지 않는 것 |
|---|---|---|
| 네 origin | `M.seedState()`의 `source-backed-map`, `personal-draft`, `canonical-personal-copy`, `legacy-saved-plan` 네 Flow를 fixture에 유지. `savedCopyId`·원본 Flow id·ref·Step 소속 포함 | 운영 saved-plan 저장소에서 네 origin을 새로 읽어 import한 시험, 네 Flow 모두 상세 화면으로 연 시험은 아님 |
| 신규 authoring handoff | `M.makeHandoff` + `M.apply(commit-authoring)`로 fixture에 명시 handoff 한 건 추가. 제목은 `K2B 보존할 작성 원문`, 날짜 9/15, `[x]` 원문 사실과 CRLF를 포함 | 브라우저의 텍스트 입력→확인→handoff UI를 새로 끝까지 실행한 것은 아님. K1-A/K2-A 및 별도 C3 handoff 시험과 구분 |
| 순서·원문 보존 | B02/B04/B05에서 `sourceOwners` 비교. Flow ref·savedCopyId·sourceFlowId·rawText·fingerprint·handoffId·Step/itemIds와 task의 나머지 값, folders를 비교 | 동일 제목의 모든 사본 충돌 조합·회차 결과 표현 전체를 이 14개가 검사한 것은 아님 |
| 변경 허용 값 | Flow의 `folderId`, task의 실행 `date`, `done/completedAt`, task `folderId`는 보존 비교에서 분리. B05는 실제 부모 폴더 상속과 날짜 이동을 별도 확인 | 모든 필드가 byte-for-byte 불변이라는 주장이 아님. 의도한 PoC 실행 값은 변경됨 |
| 구 저장 bytes | 모든 boundary에서 legacy key의 공백·개행을 포함한 원문 string exact 비교. 일반 이동·완료·Undo가 구 key를 쓰지 않는지 API도 감시 | 명시 영구 삭제의 예외 scrub 거래는 이 suite에 없으며, 그 경우까지 old key read-only라고 확장하지 않음 |

### 결과 rank와 회차 제한은 별도다

[timeline-result-rank.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/timeline-result-rank.js)와 [model.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js)의 결과 rank bridge는 **개인 결과의 기존 calendar 소비 지점**을 대상으로 한다. 현재 task의 실제 날짜/미정 그룹 membership이 검증된 경우에만 그 rank를 읽는다. 기간 task 자체 정렬과 결과 row 정렬을 같은 기능으로 과장하지 않는다.

- 명시 resolver가 있는 개인 결과에서 `occurrenceId` row는 source-task rank를 받지 않는다. 새 회차 정렬 정책을 만들지 않는다.
- 같은 실제 날짜(미정 포함)의 보이는 결과 row 중 하나라도 rank가 없으면 해당 날짜 결과 전체는 Plan fallback을 사용한다. 숨긴 row는 이 판정에서 제외하고, 다른 날짜는 영향을 받지 않는다.
- 제한 이유는 `timelineOrderFallbacks`의 `recurrence-order-out-of-scope` 또는 `incomplete-source-task-membership`로 구분된다.
- Authoring preview는 hook을 무시하고, hook이 없는 기존 동작은 유지한다. 원문, 회차 identity, Plan/TXT/Sheet를 날짜별 수동 순서 계약으로 새로 바꾸지 않는다.

이 제한의 순수 회귀는 [timeline-result-rank.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/timeline-result-rank.test.cjs)의 별도 검증 범위다. **이 UI suite의 14개에 회차 rank·TXT·Sheet 테스트 수를 합산하지 않았다.** B04는 오늘·월간·Flow 상세의 완료 일치를 검사했으며, 결과 슬롯 전체를 새로 검사했다는 뜻은 아니다.

## 5. 5개 해상도: 활성 알림과 닫은 이후를 따로 판정

가림 7건은 **한 종류의 고정 알림 결함이 두 종류의 버튼·여러 해상도에서 드러난 관측 기록**이다. 이를 독립 제품 결함 7개나 실패 테스트 7개로 세지 않는다. B09는 알려진 가림을 기록한 후 실제 알림 닫기를 눌러 뒤의 검사를 계속하고, 마지막에 가림 목록이 비어 있지 않아 FAIL로 끝난다. `skip`, `xfail`, 성공 판정으로 대체하지 않았다.

| 해상도 | 활성 알림 상태 | 실제 닫기 이후 | 최종 화면 PNG |
|---|---|---|---|
| 390×844 | 날짜 reset 하단 + 월간 빈 날짜 토글 하단 가림, 2건 | 전체 rect·중심/내측 모서리 hit-test PASS, overflow 0 | 오늘 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-today-390x844.png`), 월간 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-month-390x844.png`) |
| 375×812 | 날짜 reset 하단 + 월간 빈 날짜 토글 하단 가림, 2건 | 같은 기준 PASS, overflow 0 | 오늘 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-today-375x812.png`), 월간 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-month-375x812.png`) |
| 844×390 | 월간 빈 날짜 토글 오른쪽 하단 가림, 1건 | 같은 기준 PASS, overflow 0 | 오늘 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-today-844x390.png`), 월간 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-month-844x390.png`) |
| 1024×768 | 월간 빈 날짜 토글 오른쪽 하단 가림, 1건 | 같은 기준 PASS, overflow 0 | 오늘 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-today-1024x768.png`), 월간 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-month-1024x768.png`) |
| 1440×900 | 월간 빈 날짜 토글 오른쪽 하단 가림, 1건 | 같은 기준 PASS, overflow 0 | 오늘 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-today-1440x900.png`), 월간 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-month-1440x900.png`) |

활성 알림 증거 7개는 별도 캡처다.

| 가림 대상 | PNG |
|---|---|
| 390×844 날짜 reset | 활성 알림 화면 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-active-receipt-reset-390x844.png`) |
| 390×844 월간 토글 | 활성 알림 화면 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-active-receipt-empty-month-390x844.png`) |
| 375×812 날짜 reset | 활성 알림 화면 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-active-receipt-reset-375x812.png`) |
| 375×812 월간 토글 | 활성 알림 화면 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-active-receipt-empty-month-375x812.png`) |
| 844×390 월간 토글 | 활성 알림 화면 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-active-receipt-empty-month-844x390.png`) |
| 1024×768 월간 토글 | 활성 알림 화면 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-active-receipt-empty-month-1024x768.png`) |
| 1440×900 월간 토글 | 활성 알림 화면 (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/k2b-active-receipt-empty-month-1440x900.png`) |

`k2b-active-receipt-occlusions` JSON attachment에는 viewport, 대상, rect, clip chain, `elementFromPoint` 결과가 있다. 최종 실행 JSON (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01.json`)의 해당 attachment body는 base64 JSON이다. 최종 trace (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/trace.zip`)와 실패 시점 DOM (로컬 전용 근거: `../../../output/playwright/k2b-timeline-ui-final-20260905-01/personal-workspace-k2b-tim-46f0e-s-cover-core-period-actions/error-context.md`)도 보존했다. 캡처 10개만으로 모든 상호작용을 대신 판정하지 않았으며, 실제 클릭·키보드·DOM 기하 검사 결과와 함께 읽어야 한다.

## 6. 운영 데이터·저장 경계 증거

최종 JSON의 `k2b-boundary` attachment는 15개다. 일반 테스트 13개에 손상 payload 테스트의 두 독립 browser context를 더한 수이며, 15개 테스트라는 뜻은 아니다. 모든 context는 테스트 전용 새 저장 공간에서 시작했다.

| 측정 항목 | 실제 결과 |
|---|---:|
| 감시한 `setItem/removeItem/clear` 호출 | 151회 |
| `flow:poc:personal-workspace:v1:` 밖 쓰기 시도 | 0회 |
| `clear()` 시도 | 0회 |
| legacy workspace key 쓰기 시도 | 0회 |
| legacy raw before/after 불일치 | 0 / 15 |
| 운영 sentinel before/after 불일치 | 0 / 15 |
| console error / page error | 0 / 0 |

legacy key는 `flow:poc:personal-workspace:v1:standalone-integrated`, 새 checkpoint key는 `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2`, recovery key는 `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2`다. Quota는 새 checkpoint key에만 1회 주입했다. 151은 성공 mutation 수가 아니라 journal 준비·확인·정리 및 실패 시도까지 포함한 Storage API 호출 수다.

초기 fixture/sentinel 주입은 감시를 설치하기 전에 테스트가 native API로 수행한다. 이후 제품 호출은 exposeFunction으로 Node 측에 누적하므로 reload 전후도 기록한다. 운영 sentinel `flow:k2b:operating-sentinel` 값은 공백·CRLF·탭·한글·이모지를 포함하며, prefix 밖 전체 key/value snapshot도 비교한다. 금지 호출은 기록한 뒤 즉시 오류로 막는다. 따라서 이번 증거는 **시험 context에 주입한 운영 모양 데이터의 불변성**이다. 사용자의 실제 브라우저 운영 데이터 전체를 이번에 열어 비교했다는 뜻은 아니다.

## 7. 재현 명령과 다음 검사

작업 디렉터리는 이 격리 worktree다. 포트 3182 서버는 주 작업자가 관리했다. 이 suite는 서버의 디스크 HTML 대신 최신 standalone `buildText()`를 메모리 응답으로 사용한다.

```powershell
$env:FLOWME_PLAYWRIGHT_PORT='3182'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME='output/playwright/k2b-timeline-ui-<new-label>.json'
npx.cmd playwright test tests/e2e/personal-workspace-k2b-timeline-ui.spec.ts --workers=1 --reporter=line,json --output=output/playwright/k2b-timeline-ui-<new-label>
```

재실행 시 `<new-label>`은 존재하지 않는 새 이름으로 바꾼다. 기존 실패 증거를 덮지 않는다. 등록 수 확인은 같은 파일에 `--list`를 붙인다. K2-C의 화면 내 이동 결과·Undo 노출 변경 후에는 B09를 `-g 'B09 five'`로 먼저 실행하고, 이어 14개 전체를 다시 실행한다. [K2-C 설계](./k2c-design.md)의 결과 알림 개선이 완료되기 전에는 ‘핵심 행동 가림 0’ 또는 ‘K2-B 모든 브라우저 검증 완료’라고 보고하지 않는다.

### 남은 범위

- K2-C: 활성 알림이 핵심 버튼을 가리지 않게 하고, 닫힌 알림 때문에 모바일 Undo 경로를 잃지 않는지 별도로 검사한다. 이 문서 작업에서 임시 padding이나 새 Undo owner를 추가하지 않았다.
- B07의 구 HTML 실행 → 구 key 변경 → 새 HTML 재진입 시나리오는 이 14개에 포함되지 않았다. 충돌/손상/legacy 보존 검사는 했지만 두 HTML의 동시 편집 호환 전체를 보장하지 않는다.
- React/standalone을 같은 clock으로 비교하는 별도 회귀, 결과 rank·회차·TXT·Sheet, 명시 영구 삭제·source-candidate 거래는 각 전용 검증 자료와 연결해야 한다.
- `npm test` 및 production build는 주 작업자의 별도 실행 자료다. 이 UI 14개 통과 수에 합산하거나 이 문서 작성에서 다시 실행한 것으로 표시하지 않는다.
- 실제 Android Chrome·iOS Safari·OS 수준 입력은 **NOT_RUN**. 관찰 사용자 수는 **0**.

## 8. 변경·문서 검증·발행 상태

이 문서 작성에서 추가한 파일은 `k2b-timeline-ui-qa.md` 하나다. 제품 코드·기존 보고서·기존 검증 JSON·생성 HTML은 수정하지 않았다. 앞선 UI 검증 작업의 신규 테스트 파일은 §1에 별도로 기록했다. 전체 작업의 closeout·현재 상태 문서 통합은 주 작업자의 소유이며, 이 문서가 이를 대체하지 않는다.

문서 검증 `npm.cmd run docs:check`는 PASS(필수 파일 16개, 로컬 링크 4,962개)였다. 지정 경로의 `git diff --check`는 오류가 없었다. 새 문서가 untracked인 점을 고려해 diff 검사만으로 본문 검토를 대신하지 않고, 실제 등록 이름·최종 JSON 수치·캡처 링크를 직접 대조했다. 이 한 파일의 문서 마감에서는 별도 closeout reporter를 중복 생성하지 않았으며, 전체 작업의 reporter는 주 작업자가 관리한다.

| 항목 | 이 하위 작업에서의 상태 |
|---|---|
| commit | 하지 않음 |
| push | 하지 않음 |
| PR | 만들지 않음 |
| Preview | 배포하지 않음 |
| Production | 배포하지 않음 |
| 관찰 사용자 | 0명 |
