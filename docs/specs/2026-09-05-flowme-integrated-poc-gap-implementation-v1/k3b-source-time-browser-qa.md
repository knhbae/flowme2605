# K3-B B0-T 원문 시간 — 브라우저 검증

2026-09-05. 최종 **10/10 PASS**: 신규 9개(React 7·단독 HTML 2)와 수정하지 않은 기존 원문 시간 RED 1개를 실행했다. 원문 `09:30`, 개인 실행 시간 `11:45` 우선, 같은 제목의 다른 사본, 날짜 미정·수동 순서·Undo, 손상 원문 차단을 확인했다. 이 판정은 B0-T의 아래 검사 범위에 한정한다. K3-B 전체나 세 원본 제품의 모든 요구사항을 완료했다는 뜻은 아니다.

최종 실행 JSON (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01.json`) · 신규 검사 9개 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-source-time-read.spec.ts`) · 변경하지 않은 기존 RED 1개 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-react-source-time-gap.spec.ts`)

## 1. 요구와 비교 방법

정본은 [K3-B 설계의 B0-T·B-T01/02](./k3b-design.md), [원문 시간 공유 읽기 설계 §6](./k3b-source-time-read-design.md), [K2-C에서 발견한 기존 시간 누락](./k2c-found-k3b-source-time.md)이다. 설계 문서의 구현 전 RED 수는 과거 기록이며 이 보고서의 현재 실행 수와 더하지 않는다.

React fixture는 실제 `materializePersonalWorkspacePocAuthoring`으로 CRLF 원문을 개인 사본으로 만든다. 기본 상태에는 개인 시간 override가 없다. 개인 `11:45`와 제목·Plan 순서 overlay는 해당 검사의 초기 fixture에 명시한다. **개인 시간 입력 UI나 Plan 편집 동작을 새로 검증했다고 표현하지 않는다.** 날짜·기간 순서 이동과 Undo는 실제 화면 버튼을 눌렀다.

단독 HTML은 기존 `makeHandoff` → `commit-authoring` → `fromLegacy` 경로를 거쳐 이미 존재하는 typed `task.time=09:30`을 읽는다. React의 새 검증 index를 단독 HTML에도 도입했다는 주장이 아니다. 두 runtime의 데이터 owner를 합치거나 개인 시간 지우기 정책을 만들지 않았다.

| 등록 검사 | 확인한 요구·실제 범위 | 최종 |
| --- | --- | --- |
| 기존 RED 1 | 원문 `09:30`, placement 없음 → React 오늘 행 표시·원문 bytes·조회 쓰기 0 | PASS |
| BT01 React | 오늘 행의 원문 시간, 다섯 viewport, 주간·월간·reload 후 같은 값, 조회 0쓰기 | PASS |
| BT02 React | 정확한 Flow/Item 상세의 원문 일정과 TXT·Todo·Calendar·Sheet의 `09:30`; 원문 보존 | PASS |
| BT03 React | 초기 개인 `11:45`가 기간·네 결과에서 우선, 저장 원문은 `09:30` 유지 | PASS |
| BT04 React | 오늘 → 날짜 미정 → Undo → 재이동·reload. 날짜 미정에서도 source time 유지, Undo는 이전 domain 복원 | PASS |
| BT05 React | 원문 배열상 늦은 항목이 먼저여도 기본 `09:30→13:40`; 명시 수동 순서 우선·Undo·주간/월간 공유 | PASS |
| BT06 React | 같은 제목 사본의 `09:30/16:10` 분리; 개인 제목·역순 Plan overlay의 실제 Flow 순서 확인; 같은 사본의 `14:20`도 원래 ref에 연결 | PASS |
| BT07 React | raw/fingerprint 불일치·다른 사본 source map 두 하위 조건 → 기본 `/my`, PoC gate 제거, 기존 bytes 보존·쓰기 0 | PASS |
| BT08 단독 HTML | 기존 typed task 시간의 오늘 행·다섯 viewport·reload, 조회 쓰기 0 | PASS |
| BT09 단독 HTML | 정확 Item 상세와 TXT·Todo·Calendar·Sheet의 typed 시간. 최초 4부분 누락을 수정 뒤 재검 | PASS |

BT01·BT08의 다섯 viewport는 각각 **등록 검사 한 개 안의 반복**이다. BT07의 손상 조건 두 개, BT06의 여러 ref 비교도 새 독립 검사 수로 부풀리지 않는다. TXT는 현재 `text-panel`에서 해당 Item부터 다음 Item 전까지의 속성 줄을 읽었다. 다른 Item의 시간으로 검사를 대신 통과하지 않는다. 표의 기존 내부 가로 스크롤은 허용된 결과 UI이며 새 정책으로 없애지 않았다.

## 2. 실행 이력과 발견한 결함

| 단계·보존 로그 | 실제 실행 결과 | 해석 |
| --- | --- | --- |
| 최초 10개 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-initial-20260905-01.json`) | 5 PASS·5 FAIL, 86.897초 | TXT selector 3건, redirect 중 snapshot 1건, 같은 Flow 열기 버튼 중복 selector 1건. 하니스 실패이며 제품 완료/미완료를 이 다섯 건으로 판정하지 않음 |
| 하니스 정정 후 신규 9개 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-harness-fixed-20260905-01.json`) | 7 PASS·2 FAIL, 58.079초 | BT07은 기본 `/my?sort=next`의 정당한 query를 거절한 하니스 기대 오류. BT09는 **제품 표시 누락** |
| 기본 `/my` 판정 정정 1개 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-fallback-fixed-20260905-01.json`) | 1/1 PASS, 4.735초 | 기존 integration 회귀처럼 pathname `/my`·PoC gate 없음으로 판정. 원문 보존·조회 0쓰기 기대 유지 |
| 최종 10개 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01.json`) | 10/10 PASS, 83.260초 | React 동일 production 빌드, 단독 HTML의 표시 수정 후. skipped/flaky 0 |

등록한 고유 검사는 총 10개다. 위 반복 실행은 **30회 시도(10+9+1+10)**이며 30개 요구나 30개 고유 시나리오가 아니다. 신규 spec 단독 strict TypeScript 검사는 exit 0이다. 프로젝트 전체 `npm test`·production build·다른 단계 회귀 수는 메인 작업의 별도 결과이며 여기서 재집계하지 않는다.

BT09는 최초에 Item 상세·Todo·Calendar·Sheet 네 곳에서 `09:30`이 없었다. 기간 행과 TXT에는 이미 있었다. soft assertion으로 네 결과까지 계속 읽어 누락 범위를 수집했고, FAIL을 숨기거나 `skip`으로 바꾸지 않았다. 메인 구현 담당이 기존 `task.time`·`item.time`·`row.time`의 **읽기 표시만** 상세/summary/표에 연결했다. 이 하위 검증 작업에서는 제품 파일을 수정하지 않았다.

수정 전 결과 표 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-harness-fixed-20260905-01/personal-workspace-k3b-sou-ab79e-the-exact-typed-source-time/standalone-results-source-time-baseline.png`)에는 시간 열이 없고, 수정 후 결과 표 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-ab79e-the-exact-typed-source-time/standalone-results-source-time-baseline.png`)에는 `09:30`이 표시된다. 두 PNG를 직접 확인했다. 상세·Todo·Calendar의 수정 전후 텍스트는 각 JSON의 `standalone-existing-result-baseline` 기록에 남아 있다.

## 3. 다섯 화면의 실제 평가

아래 **최종 PNG 10장 모두 직접 확인**했다. 새 캡처는 `fullPage:false`이며 viewport와 실제 PNG 크기가 같다. 캡처 전후 원문을 포함한 전체 localStorage key/value, URL, scroll, 화면 text가 같음을 자동 확인했다. 기존 RED 파일의 `fullPage:true` PNG는 이 다섯 화면 증거로 사용하지 않는다.

행 전체 rect가 viewport 안에 있고, 그 행의 **보이는 버튼 전부**를 같은 scroll 위치에서 9점 hit-test했다. React는 각 화면 4개 버튼, 단독 HTML은 390/375에서 4개·나머지에서 6개 버튼이다. 비활성 위로 버튼도 표시 면적 검사에는 포함되지만 활성 동작 성공으로 해석하지 않는다. 문서 가로 넘침은 정확히 0이다.

| viewport | React 대상행 y~bottom·직접 평가 | 단독 HTML 대상행 y~bottom·직접 평가 |
| --- | --- | --- |
| 390×844 | 433~497 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-d90c7--controls-at-five-viewports/react-source-time-390x844.png`). `09:30`과 완료/열기/이동/메뉴가 보이고 하단 nav에 가리지 않음 | 630.92~696.92 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-532a6-rts-and-reload-is-read-only/standalone-source-time-390x844.png`). 목록을 스크롤한 뒤 시간·네 버튼 온전히 표시 |
| 375×812 | 433~497 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-d90c7--controls-at-five-viewports/react-source-time-375x812.png`). 좁은 폭에서도 대상 시간·행 버튼 잘림 없음 | 598.92~664.92 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-532a6-rts-and-reload-is-read-only/standalone-source-time-375x812.png`). 시간과 행 버튼을 같은 위치에서 확인 |
| 844×390 | 325~389 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-d90c7--controls-at-five-viewports/react-source-time-844x390.png`). 전체 행·버튼 9/9 hit이나 화면 아래 여백은 1px로 촘촘함 | 199~263 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-532a6-rts-and-reload-is-read-only/standalone-source-time-844x390.png`). 스크롤 후 시간과 위/아래 이동 버튼까지 확인 |
| 1024×768 | 433~497 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-d90c7--controls-at-five-viewports/react-source-time-1024x768.png`). 대상 행 정상 | 544.73~608.73 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-532a6-rts-and-reload-is-read-only/standalone-source-time-1024x768.png`). 대상 시간 행은 정상. **위쪽 이웃 행 제목은 복원 알림에 일부 가림** |
| 1440×900 | 368~432 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-d90c7--controls-at-five-viewports/react-source-time-1440x900.png`). 왼쪽 탐색과 대상 시간 행 정상 | 819.61~883.61 (로컬 전용 근거: `../../../output/playwright/k3b-source-time-final-20260905-01/personal-workspace-k3b-sou-532a6-rts-and-reload-is-read-only/standalone-source-time-1440x900.png`). 대상 시간·버튼 정상. 아래의 다른 항목은 viewport 밖이므로 전체 목록을 한 화면에서 검증한 것은 아님 |

이 표의 PASS는 **원문 시간 대상 행의 가독성·버튼 노출** 판정이다. 단독 HTML의 1024 복원 알림은 `11시 회의 참석` 제목 일부를 가린다. 결과 화면의 복원 알림도 상단 toolbar 일부에 겹쳐 보인다. 따라서 전체 제품의 가림이 0건이라고 보고하지 않는다. 이 기존 알림 UI 결함은 시간 표시 수정과 분리해 남긴다. React/HTML의 색·정보 밀도·헤더 차이도 통합 디자인 완료로 판정하지 않았다.

가리는 노드의 정확한 구현은 `.global-feedback .save-status` fixed 상태 영역이다. 일반 toast나 K2-C contextual receipt로 잘못 분류하지 않는다. 이 보고서는 당시 표시 결함을 보존하며, 후속 읽기 상태 위치 수정의 검증으로 대체하지 않는다.

## 4. 저장 경계와 원문 불변 증거

최종 신규 9개에는 **fresh context 18개·기록된 storage API 30회**가 있다. 기존 RED 1개는 별도 fresh context 1개·API 0회다. 최종 합계는 **19 contexts·30 API**다. 사용자 브라우저 프로필이나 실운영 DB를 열어 검사한 것이 아니다. 초기 seed는 제품 시작 전에 정확한 PoC key와 운영 sentinel을 넣고, reload에서는 sentinel 존재 여부로 재seed하지 않는다.

| 구분 | 실제 결과 |
| --- | --- |
| 조회 전용 경로 | 신규 16 contexts + 기존 RED 1 context에서 제품 `setItem/removeItem/clear` 0회, 모든 seeded bytes 동일 |
| 실제 조작 | BT04 날짜 이동·Undo·재이동 3회, BT05 순서 이동·Undo·재이동 3회. 총 6회 성공 동작 |
| PoC 상태 저장 | `flow:poc:personal-workspace:v1:state` setItem 6회 |
| PoC 복구·commit marker | `editor-storage-recovery:v1` set 6/remove 6, `editor-storage-commit-marker:v1` set 6/remove 6. 합계 24회 |
| 허용 prefix 밖 API·clear | 0회. 호출 시 기록 후 차단하는 guard 사용 |
| 운영 key/value 불일치 | 0건. CRLF·공백·이모지를 가진 sentinel을 포함한 모든 non-PoC key/value 비교 |
| console error·page error | 0건 |
| 원문과 identity | 읽기에서는 전체 bytes 동일. 이동/Undo에서는 authoredFlows·placements 또는 원래 domain의 exact 비교. 날짜를 옮겨도 원문 시간·Flow 소속을 역수정하지 않음 |

Undo domain 비교에서 기존 `revision`, `updatedAt`, `undo` 필드는 제외한다. timestamp/새 Undo 상태까지 과거 bytes와 같다고 주장하지 않는다. 원문과 그 밖의 저장 domain은 비교한다. 30 API를 30번의 사용자 변경으로 세지 않는다.

## 5. 빌드와 증거 출처

React는 메인 작업이 띄운 **production `3182`, BUILD_ID `YfWMdaOcy9e77WdBG3b8W`**로 최종 검사했다. 이 빌드의 Surface는 `953991F1F0A5D6F29DC0E9B1FB2BD96BE674DB48A427432CFB01B6F06EC108A0`이며 동일 빌드 초기 JSON·메인 build 기록과 연결된다.

중요: 최종 JSON의 `productHashes`는 **afterEach 시점 디스크 파일**이다. 검사 중 메인 작업이 후속 메모 UI를 소스로 준비하여 Surface 디스크 hash는 `CD1CAAB49C21A46C5C3FA43243FAFC28924E98D9BA59140725100634641E74DF`였다. 당시 production server는 재빌드하지 않고 계속 YfWM를 제공했다. CD1CA 소스를 이번 브라우저에서 실행한 것으로 인용하면 안 된다. 그 후속 빌드는 별도 검증 대상이다.

단독 HTML은 `buildText()`로 **메모리에서 생성해 route.fulfill**했다. 사용자용 생성 HTML을 이 검사에서 덮어쓰지 않았다.

| 증거 | SHA-256·크기 |
| --- | --- |
| 최초·하니스 정정의 단독 HTML | `1F64F15507D57574BC4E28BC8ADBC4E14A9CA61E1E5056166E7A6C35105CD5B8` |
| 최종 단독 HTML | `D4C4C20E7E67002BFFBB77C02CB7A8318BC19D7A197AB1B161B33809BA879127`, 1,249,266 bytes |
| 최종 app.js | `B11840D6E039CE9F0F7B5909CBE01443746A89B9FE21A2CB1E6AB8B11A5F32D1` |
| 최종 JSON | `FB914DC2B5A74646A800B001B36A5295BDF6959CEF3CD331976F140A138CD67E`, 1,160,684 bytes |
| 신규 spec | `A6DDA7E3966DB4631B8F598BAD960C822FDBA7C2D221D84DAA6FCF928F2046FF`, 28,485 bytes |
| 기존 RED spec, 변경 없음 | `12DFD63585FFBC035070499760D0DD3FD6C3AC755B509B03838F6B6C8B22DDE1` |

최종 실행 시작은 2026-09-05 **19:08:53 KST**, 브라우저 날짜는 `2026-09-05T09:00:00+09:00`, timezone은 `Asia/Seoul`로 고정했다. 이는 실제 기기의 시계·시간대 검증이 아니다.

재현 명령은 아래와 같다. 출력 경로가 이미 있으면 새 이름을 써서 이전 증거를 보존해야 한다.

```powershell
$env:FLOWME_PLAYWRIGHT_PORT='3182'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME='output/playwright/k3b-source-time-<새 실행명>.json'
npx.cmd playwright test tests/e2e/personal-workspace-k3b-source-time-read.spec.ts tests/e2e/personal-workspace-k2c-react-source-time-gap.spec.ts --workers=1 --reporter=line,json --output=output/playwright/k3b-source-time-<새 실행명>
```

## 6. 남은 범위와 인계

- source-update effective Flow의 typed Item map은 현재 제공되지 않는다. 원래 handoff의 오래된 `09:30`을 빌려 보여주거나 label을 파싱해 시간을 만들어내지 않는 것이 계약이다. 실제 source-update 적용 후 결과 열기 전체 여정은 이번 신규 9개에 없으며 기존 P3-D 회귀·공유 순수 검사와 별도로 연결해야 한다.
- B-T02 중 시간이 없는 입력, timezone/relative label, 반복 회차 시간의 모든 조합을 이 브라우저 9개로 전수 실행하지 않았다. 공유 순수 검사의 범위와 구별한다. 단독 HTML의 개인 시간 provenance/시간 지우기 정책·새 시간 입력 UI도 만들거나 승인하지 않았다.
- 네 saved-plan origin 전체와 모든 원문 형식, Plan/메모 편집·source-update·회차 이동 전체 회귀는 이 보고서의 새 실행 수에 포함하지 않는다.
- 복원 알림의 이웃 행·toolbar 가림은 남은 UI 결함이다. 이번 대상 행 기하 PASS로 이 결함을 닫지 않는다.
- 이 하위 작업의 변경 파일은 신규 spec과 이 보고서다. 제품 구현·생성 HTML 동기화·프로젝트 전체 검증의 소유와 결과는 메인 보고서에 별도로 기록한다.

| 마감 항목 | 이 검증 작업의 상태 |
| --- | --- |
| 실제 Android Chrome | NOT_RUN |
| 실제 iOS Safari | NOT_RUN |
| 실제 IME·관찰 사용자 검증 | NOT_RUN · 관찰 사용자 수 0 |
| commit | 미실행 |
| push | 미실행 |
| PR | 미실행 |
| Preview | 미실행 |
| Production 배포 | 미실행. 로컬 production build 서버 검사와 배포는 다름 |
