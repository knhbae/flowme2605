# K3-B 읽기 상태 알림 — 브라우저 검증

2026-09-05. 검사 대상은 standalone 개인공간·Flow 상세·Item 상세의 읽기 상태 알림이다. [설계](./k3b-read-feedback-design.md)와 [원문 시간 검사에서 발견한 가림](./k3b-source-time-browser-qa.md)을 따른다. React, 전체 통합 요구사항, 실제 기기까지 통과했다는 보고가 아니다.

## 0. 최종 판정

신규 RF01–04 **4/4 PASS**. 마지막 실행은 19:43:35 KST에 시작해 47.765초 걸렸다. 기존 고정 알림이 `11시 회의 참석` 제목을 가리던 문제와, 수정 과정에서 모바일에 남았던 빈 52px 공간을 모두 재검사했다.

- 5개 viewport에서 목록·Flow 상세·Item 상세의 위/아래/제목 위치를 검사했다. 전체 47개 캡처의 전후 화면 측정값과 저장 bytes가 같았다.
- 화면 안에 완전히 들어온 대상 810회 측정에서 알림과 제목·버튼의 겹침 0, 버튼 9점 hit-test 실패 0, 문서 가로 넘침 0이었다. 같은 항목을 여러 위치에서 측정한 수이며, 810개 고유 기능을 검사했다는 뜻이 아니다.
- 화면 가장자리에 일부만 걸친 대상 33회는 별도 기록했다. 이를 완전 노출 PASS에 포함하지 않았다.
- 12개 새 브라우저 context 중 조회 전용 11개는 전체 저장값 동일·쓰기 0이었다. 완료→Undo 1개에서는 허용된 PoC target/journal API 8회를 기록했다. 허용 prefix 밖 호출·`clear`·console/page error·운영 sentinel 불일치 모두 0이었다.
- 대표 PNG 18장을 직접 확인했다. 모든 47장을 사람이나 에이전트가 직접 시각 평가했다는 주장은 하지 않는다.

최종 실행 JSON (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01.json`) · 검사 코드 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-read-feedback-visibility.spec.ts`)

## 1. 무엇을 고쳤고 무엇을 유지했나

| 원래 문제/보호 요건 | 적용·검사 결과 |
| --- | --- |
| 읽기 복원 상태가 고정 위치에서 이웃 제목을 가림 | 같은 `.global-feedback` wrapper와 `#save-status`를 목록·상세 본문의 `#content` 앞에 배치. 스크롤하면 본문과 함께 이동한다. |
| 상태 노드를 새로 만들면 live announcement/소유 상태가 달라질 수 있음 | 같은 DOM 노드임을 참조 동등성으로 확인. `role=status`, `aria-live=polite`, `aria-atomic=true` 유지. |
| 작성·Plan/Item 편집은 기존 알림 소유 규칙을 유지해야 함 | 수정하지 않은 Plan→자식 Item 편집→Plan 복귀와 작성기 왕복을 실제 조작. 기존 위치로 돌아오며 저장·초안 생성 0. |
| contextual result가 숨긴 전역 상태가 다시 나타나면 안 됨 | 직접 완료→Undo 동안 같은 전역 노드의 `hidden=true` 유지. 일반 결과의 success→undone과 대상 복원 확인. |
| 상태 표시 변화가 native drag 시작 시 행을 밀면 안 됨 | 데스크톱에서 52px 공간을 유지. 기존 K2C native/재드래그 회귀는 별도 실행 근거로 연결한다. |
| 기존 CSS로 상태가 숨겨지는 모바일에 빈 공간을 남기면 안 됨 | `display:none`인 390/375/844의 wrapper 높이 0px. 상태의 display/hidden/ARIA 규칙은 바꾸지 않았다. 1024/1440의 보이는 상태는 52px 유지. |

이번 제품 변경은 root가 담당했다. 이 문서의 브라우저 작업은 신규 spec과 이 QA 문서만 편집했다. 모델·writer·저장 schema·원문·운영 key를 변경하지 않았다.

## 2. 실패와 재실행 이력

| 단계 | 실제 실행 결과 | 판정·차이 | 근거 |
| --- | --- | --- | --- |
| 초기 중단 | 완료 결과 없음 | root의 3182 재빌드 중 기존 config의 webServer 자동 기동이 시작되어 즉시 중단. 1024 PNG 3장만 남았고 JSON 없음. PASS/FAIL 수에 포함하지 않음. | 중단된 출력 폴더 (로컬 전용 근거: `../../../output/playwright/read-feedback-workspace-red-20260905-01/`) |
| 원래 가림 RED | RF01 0/1 PASS, 32.598초 | D4C4 HTML. 1024 하단에서 실제 이웃 제목 일부가 상태에 가려졌다. 5 viewport×문서 배치 3개의 구조 assertion 실패는 같은 배치 문제의 반복 검사다. | RED JSON (로컬 전용 근거: `../../../output/playwright/read-feedback-workspace-red-20260905-02.json`) |
| 첫 배치 수정 | RF01–04 4/4 PASS, 30.790초 | DAAFE HTML. 가림 해소·동일 노드·읽기 0쓰기 PASS. 이때 모바일 빈 52px 공간은 새 검사 기준에 들어가기 전이었다. | 첫 수정 JSON (로컬 전용 근거: `../../../output/playwright/read-feedback-current-20260905-01.json`) |
| 모바일 빈 슬롯 RED | RF01 0/1 PASS, 14.392초 | 같은 DAAFE HTML. 390/375/844에서 상태 `display:none`, wrapper 52px. 높이 0px 기대에 3회 실패한 단일 결함이다. | 빈 슬롯 RED JSON (로컬 전용 근거: `../../../output/playwright/read-feedback-mobile-slot-red-20260905-01.json`) |
| 최종 수정 | RF01–04 4/4 PASS, 47.765초 | B14A HTML. 빈 슬롯 검사와 clean Item 편집 왕복 하위검사까지 포함. | 최종 JSON (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01.json`) |

완료된 신규 spec 실행은 1+4+1+4=10회지만 고유 등록 시나리오는 4개다. 중단된 시도와 기존 K2C 회귀는 이 수에 합치지 않는다. 이전 JSON·PNG를 덮어쓰지 않았다.

원래 가림은 버튼 hit-test만으로 잡을 수 없었다. `pointer-events:none`인 상태 알림 아래에서도 버튼 9점이 모두 클릭 가능했기 때문이다. 1024 하단에서 `11시 회의 참석` 실제 글자 Range는 x332.031–433.484, y80.734–104.734이고, 상태 알림은 x423.984–600, y68–104였다. 글자 끝부분이 겹쳤다. 검사에는 텍스트 Range와 버튼 전체 사각형의 교차 계산을 별도로 넣었다.

수정 전 실제 가림 PNG (로컬 전용 근거: `../../../output/playwright/read-feedback-workspace-red-20260905-02/personal-workspace-read-fe-620be-wports-and-scroll-positions/workspace-1024x768-bottom.png`) · 같은 위치 수정 후 PNG (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-620be-wports-and-scroll-positions/workspace-1024x768-bottom.png`)

## 3. 등록 시나리오별 결과

| ID | 실제 조작·assertion | context / 캡처 / API | 최종 |
| --- | --- | --- | --- |
| RF01 | 오늘 목록에서 top·bottom·제목 위치 스크롤. 5 viewport의 알림/텍스트/버튼 교차, 9점 hit, overflow, 같은 상태 노드와 mobile 0px/desktop 배치 검사 | 5 / 15 / 0 | PASS |
| RF02 | 미분류→선택한 Flow→그 Flow의 Item 상세. 각 화면에서 위/아래/제목 위치 스크롤, 5 viewport. 같은 노드·저장값 유지 | 5 / 30 / 0 | PASS |
| RF03 | Flow→clean Plan 편집→clean 자식 Item 편집→Plan→Flow→빈 작성기→개인공간. 노드 동일, 편집/작성 중 기존 home, 작성 원문 빈 값, 저장 0 | 1 / 1 / 0 | PASS |
| RF04 | 오늘 Item 직접 완료→행 근처 Undo. contextual success→undone, 전역 상태 hidden 유지, tasks/flows 및 옛 저장값 복원 | 1 / 1 / 8 | PASS |

RF01/02의 5 viewport 반복은 각각 등록 검사 1개다. RF03은 수정하지 않은 편집 닫기이며 dirty draft, 저장 실패, 복구 journal 오류 전체를 새로 검증한 것은 아니다. RF04의 두 실제 성공 동작과 저장 target/journal API 수 역시 같은 단위가 아니다.

## 4. 화면별 직접 평가

모든 캡처는 `fullPage:false`다. viewport를 길게 늘린 PNG를 작은 기기 화면처럼 인용하지 않았다. 자동 측정은 47개, 직접 시각 평가는 대표 18개다.

| viewport | 직접 평가 | 대표 증거 |
| --- | --- | --- |
| 390×844 | 목록의 제목·시간·행 버튼이 읽기 알림에 가리지 않음. Flow/Item 앞의 빈 52px 슬롯 제거. 내용은 세로 스크롤로 이어지며 아래 모든 행동이 첫 화면에 있다는 판정은 하지 않음. | 목록 하단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-620be-wports-and-scroll-positions/workspace-390x844-bottom.png`), Flow 상단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-72039-ve-viewports-without-writes/flow-390x844-top.png`), Item 상단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-72039-ve-viewports-without-writes/item-390x844-top.png`) |
| 375×812 | 같은 슬롯 0px, 제목과 실행 시간 노출. 긴 경로는 줄바꿈하며 가로 넘침 없음. 화면 끝에서 잘린 다음 영역은 부분 노출로 별도 기록. | 목록 하단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-620be-wports-and-scroll-positions/workspace-375x812-bottom.png`), Flow 상단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-72039-ve-viewports-without-writes/flow-375x812-top.png`), Item 상단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-72039-ve-viewports-without-writes/item-375x812-top.png`) |
| 844×390 | 짧은 가로 화면에서 상태가 차지하던 빈 공간 제거. Flow 핵심 버튼은 한 줄에 노출. Item의 다음 내용은 아래로 이어지며 측정한 스크롤 위치에서 가림 없음. | 목록 하단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-620be-wports-and-scroll-positions/workspace-844x390-bottom.png`), Flow 상단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-72039-ve-viewports-without-writes/flow-844x390-top.png`), Item 상단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-72039-ve-viewports-without-writes/item-844x390-top.png`) |
| 1024×768 | 본문 상단 상태가 문서 영역에 있고 스크롤하면 함께 사라짐. 원래 가렸던 `11시 회의 참석` 제목 끝까지 노출. 상세에서도 상태가 제목 위를 덮지 않음. | 목록 상단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-620be-wports-and-scroll-positions/workspace-1024x768-top.png`), 목록 하단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-620be-wports-and-scroll-positions/workspace-1024x768-bottom.png`), Flow 스크롤 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-72039-ve-viewports-without-writes/flow-1024x768-title-scroll.png`), Item 상단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-72039-ve-viewports-without-writes/item-1024x768-top.png`) |
| 1440×900 | 넓은 화면에서도 목록·상세 알림이 본문과 함께 이동. 날짜·시간·Flow 경로와 행 동작의 알림 가림 없음. Item 메타데이터의 남는 격자 칸은 기존 구성으로 유지됨. | 목록 하단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-620be-wports-and-scroll-positions/workspace-1440x900-bottom.png`), Flow 스크롤 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-72039-ve-viewports-without-writes/flow-1440x900-title-scroll.png`), Item 상단 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-72039-ve-viewports-without-writes/item-1440x900-top.png`) |

추가 직접 확인 2장: 같은 노드로 편집·작성 왕복 후 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-73648-ck-without-creating-a-draft/same-node-boundary-return.png`), Undo 뒤 contextual 결과만 남음 (로컬 전용 근거: `../../../output/playwright/read-feedback-final-20260905-01/personal-workspace-read-fe-76838-ve-the-hidden-global-status/contextual-owner-remains.png`). 표의 16장과 합쳐 18장이다.

## 5. 저장·조회 경계 증거

fixture는 실제 `M.makeHandoff`→`M.apply(commit-authoring)`→`C.fromLegacy` 경로로 만들었다. 브라우저 조작 전에 각 새 context에 한 번만 seed했다. 이는 실제 사용자의 저장소가 아니며 seed 호출은 제품 실행 API 수와 구분했다. 재조회나 reload에서 값을 덮어 넣는 fixture는 사용하지 않는다.

원문은 `# 상태 가림 검사` 아래 `원문 시간 확인`, 날짜 `2026-09-05`, 시간 `09:30`을 포함한다. 고정 시계는 `2026-09-05T09:00:00+09:00`, timezone은 `Asia/Seoul`이다. 자동화의 날짜 주입이지 실제 기기 날짜 검사가 아니다.

| 측정 | 최종 증거 |
| --- | --- |
| 조회 전용 11 context | 최초/최종 전체 localStorage snapshot byte-for-byte 동일, 제품 set/remove/clear 0회 |
| 운영 sentinel | `flow:read-feedback:operating-sentinel`, 공백·CRLF·한글·이모지·tab 포함 값. 12 context 모두 동일 |
| 허용 prefix | `flow:poc:personal-workspace:v1:`. 밖의 set/remove와 모든 clear는 기록 후 차단. 금지 호출 0회 |
| 완료→Undo API | recovery journal set 4회 + workspace-v2 target set 2회 + 같은 journal remove 2회 =8회 |
| 옛 v1 저장 key | RF04 완료·Undo 후 bytes 동일. 새 target의 tasks/flows는 원래 값으로 복원 |
| console/page error | 12 context 합계 0 |

API hook은 실제 브라우저 `Storage.prototype`을 감시한다. sentinel 한 개의 보호와 허용 prefix 밖 호출 0을 근거로 삼는다. 실제 사용자 프로필이나 운영 저장소에 접속해서 전체 운영 자료를 대조했다는 뜻은 아니다.

## 6. 기존 행동 회귀와 구분

root가 첫 배치 수정 후보(app `887612…`, CSS `874161…`)에서 기존 K2C 브라우저 spec을 별도로 실행해 **16/16 PASS**했다. C05의 메뉴·키보드·native drag·합성 long-press·Undo, C06 같은 위치/취소/Escape/pointer cancel, C07 복구, C15 다섯 화면 검사가 포함된다.

기존 K2C 첫 재검사 JSON (로컬 전용 근거: `../../../output/playwright/read-feedback-k2c-regression-20260905-01.json`) · 명령·종료 기록 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/read-feedback-k2c-regression-2026-09-05T10-29-35-756Z.json`)

모바일 빈 슬롯을 고친 최종 CSS `0B9C631D…`에서도 root가 같은 기존 spec을 다시 실행해 **16/16 PASS**, 61.083초를 기록했다. JSON의 boundary attachment가 모두 최종 메모리 HTML `B14A3F96…224EE9`를 가리키는 것을 확인했다. 첫 수정 후보의 결과와 이 재실행을 섞지 않는다.

최종 후보 K2C 재검사 JSON (로컬 전용 근거: `../../../output/playwright/read-feedback-final-k2c-regression-20260905-01.json`) · 최종 명령·종료 기록 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/read-feedback-final-k2c-regression-2026-09-05T10-43-53-118Z.json`)

이 16개는 신규 RF4와 구분되는 기존 행동 회귀다. 두 번 실행한 K2C를 32개 고유 검사로 세거나, RF4와 합쳐 신규 기능 20개를 검증했다고 표현하지 않는다.

## 7. 실행 버전과 재현

최종 RF4는 `build-single-file.cjs.buildText()`의 메모리 HTML을 route.fulfill로 제공했다. 이 작업에서 배포용 HTML 두 파일이나 과거 캡처를 덮어쓰지 않았다. 3182는 root가 소유한 서버를 사용했고 3180에는 접속하지 않았다. 서버의 React BUILD_ID는 `9e2zGbmnw8GAfNPQqXXl1`이었지만, RF 결과는 아래 standalone 메모리 HTML에 대한 것이다.

| 대상 | 최종 SHA-256 |
| --- | --- |
| standalone 메모리 HTML, 1,251,315 bytes | `B14A3F96FECCD2E97565A45E0F109BA0774B3CAF18BC29A0C4D93F009A224EE9` |
| app.js | `887612E0B4382D46E3CC91A1A61FA6982A1E365E717CC8C4436199CDB9E1D28E` |
| style.css | `0B9C631D73E475454A1AB711B5AD526E0E6F3404B90365241E7CD005D03D47B3` |
| 신규 RF spec, 17,466 bytes | `EFB68BF27BF999433C82E896BB728A10C59C22313551D620DF19886E6382AF69` |
| 최종 JSON, 5,061,792 bytes | `393A03923FFEB64F86DFEA5FCFEC2E880DC5630577FDA8744F0538E2E8C4E091` |

구 후보 D4C4는 고정 알림 상태, DAAFE는 본문 배치 후 모바일 빈 슬롯이 남은 상태다. 최종 결과는 B14A에만 붙인다.

재현은 root 소유 서버가 준비된 뒤 **존재하지 않는 새 출력 경로**를 정해 실행한다. hash assertion은 다른 제품 후보를 같은 결과로 오인하지 않도록 고정했다.

```powershell
$env:FLOWME_PLAYWRIGHT_PORT = '3182'
$env:FLOWME_READ_FEEDBACK_EXPECTED_HTML_SHA = 'b14a3f96feccd2e97565a45e0f109ba0774b3caf18bc29a0c4d93f009a224ee9'
# 아래 두 경로는 실행 전에 새 경로로 바꾸고 기존 파일이 없는지 확인한다.
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'output/playwright/<new-run>.json'
npx.cmd playwright test tests/e2e/personal-workspace-read-feedback-visibility.spec.ts --workers=1 --reporter=line,json --output=output/playwright/<new-run>
```

신규 spec 단독 strict TypeScript 검사는 PASS했다. 이 하위 작업에서 `npm test`와 production build는 다시 실행하지 않았고 root의 전체 검증과 별도로 보고한다.

## 8. 남은 범위·미실행

- 이번 범위의 읽기 알림 가림과 모바일 빈 슬롯은 해소했다. 모든 화면·모든 스크롤 좌표·모든 데이터 길이에서 결함이 없다는 일반 보장은 아니다.
- 모바일에서 전역 상태가 CSS로 숨겨지는 기존 규칙은 유지했다. 이번 작업을 모바일 전체 상태 전달·보조기술 접근성 승인으로 보지 않는다.
- Flow 상세의 합성 원문 변경 후보 안내와 Item 상세의 남는 격자 칸 등 기존 구성은 그대로다. 해당 원래 요구사항의 충족 여부를 이 RF 검사로 새로 판정하지 않았다.
- 저장 실패/복구와 키보드/native의 폭넓은 행동은 기존 K2C 회귀에 연결했다. 새 RF4 자체는 키보드 전체 탐색, 실제 터치 long-press, 실제 IME를 검사하지 않았다.
- Android Chrome, iOS Safari, 보조기술 검사: **NOT_RUN**. 관찰 사용자: **0명**.
- commit: 없음. push: 없음. PR: 없음. Preview: 없음. Production: 없음. 로컬 서버와 자동화 캡처는 배포·실제 기기 검사·관찰 사용자 검증이 아니다.

## 9. 생성 HTML 동기화 후 선택 회귀 13개

root가 두 사용자 HTML과 후보 pin을 B14A/1,251,315 bytes로 동기화한 뒤 추가 실행했다. 두 실제 파일의 SHA-256도 이 문서 작성자가 읽기 전용으로 확인했다: standalone HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html`), Android용 단일 HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`). 파일 이름에 Android가 있다는 이유로 실제 Android 검사를 했다고 판정하지 않는다.

| 별도 실행 묶음 | 등록 수·결과 | 실제 검사 범위·근거 |
| --- | --- | --- |
| 기존 BT08/09 | 2/2 PASS, 19.291초 | standalone typed-task 시간 09:30의 기간 행 5 viewport·reload, Item 상세·TXT·할 일·캘린더·표 표시. 6 context 전부 B14A 메모리 HTML·쓰기 0·금지 호출 0·오류 0. 실행 JSON (로컬 전용 근거: `../../../output/playwright/read-feedback-generated-source-time-final-20260905-02.json`) |
| 실제 생성 후보 host | 8/8 PASS | 실제 HTML 본문 hash/bytes와 host binding, runner 5 viewport·외부 요청 차단, 새 탭 Quick 조작·PoC 저장, 바인딩 후 identity draft reload, 옛 v1 record 무승격, 근거 없는 PASS 차단, 운영 읽기 실패의 거짓 동일 판정 차단, 데스크톱 자동화의 E5-D 승격 차단 |
| React 기존 경계 | 3/3 PASS | 네 origin·이동·완료·Undo·reload·운영 bytes; workspace/authoring exact query; 손상/운영 key를 가리키는 journal fail-closed. 이 결과는 기존 production build `9e2zGbmnw8GAfNPQqXXl1` 대상이며 standalone HTML 결과와 구분 |

host8과 React3은 같은 선택 실행 JSON (로컬 전용 근거: `../../../output/playwright/read-feedback-generated-host-boundary-final-20260905-01.json`)에 있으며 합계 11/11 PASS, 34.512초다. 기존 테스트를 골라 재실행한 13개이지 신규 RF 시나리오 13개가 아니다. RF4·K2C16과 별도로 유지한다. host8/React3의 JSON에는 API 상세 attachment가 없으므로 그 호출 수를 RF4의 8회에 임의로 합산하지 않는다. 각 기존 테스트의 저장 경계 assertion PASS를 근거로 삼는다.

BT08/09의 6개 PNG도 모두 직접 확인했다. 기간 행 09:30과 Sheet 시간 칸이 읽히며, 1024에서 전에 가렸던 이웃 제목도 그대로 보였다. 390×844 (로컬 전용 근거: `../../../output/playwright/read-feedback-generated-source-time-final-20260905-02/personal-workspace-k3b-sou-532a6-rts-and-reload-is-read-only/standalone-source-time-390x844.png`), 375×812 (로컬 전용 근거: `../../../output/playwright/read-feedback-generated-source-time-final-20260905-02/personal-workspace-k3b-sou-532a6-rts-and-reload-is-read-only/standalone-source-time-375x812.png`), 844×390 (로컬 전용 근거: `../../../output/playwright/read-feedback-generated-source-time-final-20260905-02/personal-workspace-k3b-sou-532a6-rts-and-reload-is-read-only/standalone-source-time-844x390.png`), 1024×768 (로컬 전용 근거: `../../../output/playwright/read-feedback-generated-source-time-final-20260905-02/personal-workspace-k3b-sou-532a6-rts-and-reload-is-read-only/standalone-source-time-1024x768.png`), 1440×900 (로컬 전용 근거: `../../../output/playwright/read-feedback-generated-source-time-final-20260905-02/personal-workspace-k3b-sou-532a6-rts-and-reload-is-read-only/standalone-source-time-1440x900.png`), Sheet 결과 (로컬 전용 근거: `../../../output/playwright/read-feedback-generated-source-time-final-20260905-02/personal-workspace-k3b-sou-ab79e-the-exact-typed-source-time/standalone-results-source-time-baseline.png`). §4의 RF 대표 18장과 다른 실행의 6장이다.

원문 시간 spec SHA `A6DDA7E3966DB4631B8F598BAD960C822FDBA7C2D221D84DAA6FCF928F2046FF`는 이전과 같다. 이번 선택 회귀에서 소스·spec·기대값을 수정하지 않았다. 첫 BT 명령은 `npx.cmd`가 grep의 파이프 인자를 잘못 해석해 브라우저 검사 전에 종료됐다. `node .../cli.js`와 동등한 `BT0[89]` 선택자로 바꿔 2개만 실행했다. 이 실행 전 명령 오류는 제품 FAIL로 세지 않는다. 출력 경로는 모두 새로 만들었다.

버전 고정이 필요한 BT08/09가 끝난 즉시 root에 알렸다. 후속 checkpoint 변경 이후 빌더나 원문 시간 검사를 다시 실행해 다른 후보를 B14A 결과에 섞지 않았다. host는 자체 ephemeral loopback 서버를 정상 생성·종료했으며 root 서버 3182나 기존 3180은 변경하지 않았다.

| 후속 실행 자료 | SHA-256 |
| --- | --- |
| BT08/09 JSON | `3825EE4ADFBC88F5C630B7340BFAAD84AB0E53BD878CF21EDF6C426F113AC8BA` |
| host8·React3 JSON | `47AD69CC5E0D2A764DAC051AA16DFD4B2FD49C115B405AA619373D0C68C2B7D0` |

root가 실행한 생성 HTML·모델·작성기·시간 presenter·host 단위 회귀 **151/151 PASS**도 명령/결과 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/feedback-final-html-model-regression-2026-09-05T10-53-38-846Z.json`)으로 별도 연결한다. 이 151개는 위 브라우저 13개와 다른 검사 집합이다. 실제 기기·관찰 사용자·배포 상태는 §8과 같다.
