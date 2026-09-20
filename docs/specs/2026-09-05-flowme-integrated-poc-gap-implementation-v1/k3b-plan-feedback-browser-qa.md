# K3-B B3-B/C — Plan 미리보기·저장 결과 브라우저 검증

2026-09-06 최종 기록. **신규 15개가 최종 후보에서 통과했다.** 첫14 이후 독립 검토로 발견한 workspace ABA owner 결함은 실제 RED→수정→GREEN으로 확인했다. 전체 제품·실기기 검증 완료를 뜻하지 않는다.

## 범위

[실제 연결 설계](./k3b-plan-feedback-integration-design.md)와 [B3 정본](./k3b-plan-summary-receipt-design.md)을 읽고, 신규 브라우저 파일 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-plan-feedback.spec.ts`)을 작성했다. 기존 P17 시험·제품·builder·사용자 HTML은 이 브라우저 작업에서 수정하지 않았다. Playwright 스킬을 사용했으며, 사용자가 요청한 시뮬레이션·자동 테스트를 기존 `@playwright/test` 관례로 구현했다.

실제 Chrome/Chromium의 격리 context에서 HTTP fixture route를 사용한다. baseline은 실제 B2 파일을 읽고 SHA를 강제한다. 후보는 `buildText()`가 반환한 메모리 HTML만 route에 제공하며 `build()`를 호출하거나 사용자 파일을 다시 생성하지 않는다. 실제 app UI를 클릭하고 E2/C의 저장·복구를 소비한다. 초기 storage seed·외부 변화·복구 실패는 명시한 테스트 fixture이며, 운영 사용자 프로필은 사용하지 않는다.

## 시나리오와 현재 판정

| ID | 실제 조작·검사 | 현재 판정 |
| --- | --- | --- |
| B3UI01 | 부모 Flow 제목과 child Item 메모의 scope·정확 counts, child는 자신의 차이만, stage0쓰기 | PASS, 최종15 후보 |
| B3UI02 | 원문 동값 제목 no-op·결과0·API0, 같은 날짜 fixed pin의 실제 저장4API·필드1 | PASS |
| B3UI03 | imported CRLF 메모와 같은 길이 LF 입력·동명 Item 순열을 필드2로 유지, exact 저장 메모 | PASS |
| B3UI04 | 동명 구간2+전체 순서1+Item 메모1=필드4, Flow1+Item1, Step·원문·이웃 불변 | PASS |
| B3UI05 | 같은 Flow의 source Undo가 있는 상태에서 결과 Undo는 workspace만 복원, source bytes 동일 | PASS |
| B3UI06 | quota 실패의 입력·미리보기·old bytes 유지, 같은 attempt retry4API·성공1·한 live owner | PASS |
| B3UI07 | 연속 submit은1회; 32ms 실제 callback 전에 관측 source가 바뀌면 API0·결과0 | PASS, 2 contexts |
| B3UI08 | 같은 runtime confirmed 정리 실패에서는 결과0, 명시 정리 후 보존 attempt의 결과1·target 새쓰기0 | PASS |
| B3UI09 | 실제 v4 confirmed fixture로 reload 상태 시작, journal 정리만 하고 상세 성공·새 runtime 성공 수 제조0 | PASS |
| B3UI10 | 실제 v4 prepared 복구는 이전 target을 복원하고 제안 요약만 표시, 명시 저장 후에만 결과 | PASS |
| B3UI11 | 결과 닫기·과거 DOM replay0쓰기, 관측 source ABA 뒤 결과 부활0 | PASS |
| B3UI12 | 실제 v4 복구 초안의 Item120 메모+Flow 제목=필드/ref121, 10개씩13페이지 전수 확인, 페이지 전환0쓰기 | PASS |
| B3UI13 | 5 viewport의 요약·실패/retry·결과·Undo/닫기 full rect9점, 가로 넘침0·한 live owner·키보드 복귀 | PASS, 5 contexts·PNG10 직접 검토 |
| B3UI14 | 네 saved origin 각각 제목1의 요약/결과·Plan Undo, source·이웃 raw 불변 | PASS, 4 contexts |
| B3UI15 | 관측 workspace A→유효B→A 뒤 오래된 결과·Undo DOM 무효화 | **실제 RED→수정→PASS**, 결과0·replay0API·target exact |

동일 날짜 pin의 개인 계획 날짜와 실제 실행 날짜·완료·회차를 같은 필드로 취급하지 않았다. 메모의 브라우저 textarea는 CRLF를 LF로 정규화하므로 B3UI03/13은 기존 CRLF184자와 입력 LF184자를 비교했다. 브라우저가 CRLF 입력을 그대로 보존했다고 표현하지 않는다. raw 기존 메모·원문과 실제 새 메모의 bytes는 각자 exact 비교했다.

큰 Flow는 private app draft를 직접 바꾼 테스트가 아니다. 실제 E2 v4 attempt로 만든 prepared journal을 복구한 뒤 UI의 121개 요약과 결과 페이지를 순서대로 확인했다. 120 Item이나13페이지를 고유 테스트120개·13개로 더하지 않는다. double submit은 두 번의 DOM button click과 실제 앱32ms callback을 제어한 자동화로, 사람의 native 입력 검증이 아니다.

## 실행 이력

| 실행 | 결과 | 로그 |
| --- | --- | --- |
| 실제 B2 HTML889B baseline, B3UI01 | 0/1 PASS. Plan은 열리고 새 summary만 없음 | baseline JSON (로컬 전용 근거: `../../../output/playwright/k3b-feedback-baseline-20260906-01.json`) |
| 새 후보 B3UI01/02 smoke | 2/2 PASS, 3621.368ms | smoke JSON (로컬 전용 근거: `../../../output/playwright/k3b-feedback-smoke-20260906-01.json`) |
| 첫 전체14 | 14/14 PASS, 37306.743ms, skipped/flaky0 | 첫14 JSON (로컬 전용 근거: `../../../output/playwright/k3b-feedback-initial-20260906-01.json`) |
| 독립 workspace ABA 추가1 | 0/1 PASS. 같은 receipt가 남고 과거 Undo가 실제4API 사용 | ABA RED JSON (로컬 전용 근거: `../../../output/playwright/k3b-feedback-workspace-aba-red-20260906-01.json`) |
| workspace owner 수정의 단독1 | 1/1 PASS, 앱0443에서 결과0·과거 Undo0쓰기 | ABA GREEN JSON (로컬 전용 근거: `../../../output/playwright/k3b-feedback-workspace-aba-green-20260906-01.json`) |
| 최종 전체15 | 15/15 PASS, 45091.784ms, skipped/flaky0 | 최종 JSON (로컬 전용 근거: `../../../output/playwright/k3b-feedback-final-20260906-01.json`) |

runner6회, test attempt34회(1+2+14+1+1+15), 고유 등록15개다. 첫14와 그중2개 smoke를 고유16개로 합산하지 않았다. `--list`는 실행이 아니라 목록 검사다. 마지막 실행은 앱DF4E/style5028의 전체15이며, 첫14와 같은 후보라고 섞지 않는다.

### 발견한 실제 결함

B3UI15는 정상 결과 `plan-result-1`이 발행된 뒤 C가 실제로 만든 유효 workspace B(Quick 추가)와 원래 A를 storage event로 연속 관측시켰다. A가 돌아왔을 때 같은 결과1개가 남았고, 저장해 둔 Undo DOM을 다시 누르자 제품이 target1+journal3을 실제로 쓰며 A를 바꿨다. 단순 화면 잔상만의 문제가 아니다.

앱1192의 storage listener는 일반 contextual owner만 무효화하고 Plan 결과 owner를 무효화하지 않는 것으로 root가 확인했다. 테스트에서 제품을 고치거나 조건을 약화하지 않았다. 실패 전 캡처 (로컬 전용 근거: `../../../output/playwright/k3b-feedback-workspace-aba-red-20260906-01/personal-workspace-k3b-pla-1bdf5-d-old-Undo-DOM-cannot-write/workspace-aba-before-replay.png`), JSON notes의 receipt id·target exact·replay4API를 보존한다.

root는 관측 대상4개 storage key의 기존 listener에 Plan 결과 무효화를 연결했다. 앱0443의 단독 GREEN과 이후 fallback 일반 Undo 제어를 포함한 앱DF4E의 전체15 GREEN에서 결과0, 과거 DOM replay0API, target 원래A exact를 확인했다. fallback 표시 실패를 강제로 만드는 branch 자체는 이 브라우저15가 실행하지 않았으며 root의 별도 VM 검증과 구분한다.

## 저장 경계

첫14는 실제 **22 contexts / API124 = target33 + journal91**이다. 허용 key 밖·clear·console/pageerror0, 운영 sentinel/legacy/source 불일치0, 제품11파일 start/end hash 동일이다. target33에는 실패 시도·복구·Undo가 섞여 있으므로 성공33회로 해석하지 않는다. 정상 Plan 한 번은 target1+journal3=4API다.

최종15는 **23 contexts / API128 = target34 + journal94**다. 허용 key 밖·clear·console/pageerror0, 운영 sentinel/legacy/source 불일치0이며 11개 제품 source의 실행 전후 SHA가 동일하다. 추가 B3UI15의 외부 target fixture2쓰기는 제품 API에 포함하지 않는다. 그 뒤 과거 Undo replay의 제품 호출은0이다. 최종128을 처음124와 합쳐 최종 성공 횟수로 표시하지 않는다.

초기 sentinel은 운영 `flow:*` 한 key의 exact 문자열을 테스트가 심은 것이다. API 감시는 seed 이후의 제품 호출만 센다. source/target 외부 변화 fixture는 저장소 원래 함수를 써서 주입하고 notes에 따로 기록한다. 운영 실사용자의 전체 데이터를 확인했다는 증거가 아니다.

B3UI15 RED는 초기 Plan 저장4API 외에 허용되지 않아야 할 오래된 Undo4API가 추가됐다. prefix 밖은0이어도 owner 경계는 실패한 것이다. prefix 준수만으로 저장 안전 전체를 PASS 처리하지 않는다.

## 다섯 화면 직접 평가

첫14와 최종15의 viewport 전용 PNG10개씩을 각각 직접 열었다. 최종 표는 앱DF4E가 생성한 최종10개의 평가다. fullPage 캡처를 사용하지 않았고 캡처 전후 storage·편집/결과 state·페이지·count가 같음을 검사했다. 각 행동을 따로 스크롤해 full rect와9점 hit를 검사했으며, 모든 정보가 한 화면에 동시에 보인다고 주장하지 않는다.

| 화면 | 직접 평가 |
| --- | --- |
| 390×844 | 실패와 retry, 결과의 전후 값·184자 메모·두 행동을 읽을 수 있음. 결과 캡처는 하단 행동 중심이라 위쪽 제목 일부는 화면 밖 |
| 375×812 | 같은 범위 확인. 결과 CTA의 세로 글자 감김 없음. 전체 결과를 읽으려면 문서 스크롤이 필요 |
| 844×390 | 높이가 짧아 실패/결과의 일부만 한 번에 보임. document scroll 후 각 행동 full rect9점 통과; sticky 가림·가로 넘침 없음 |
| 1024×768 | 결과의 두 열 before/after·메모·Undo/닫기가 읽히며 sidebar와 본문 분리 유지 |
| 1440×900 | 결과 전체와 두 행동이 읽히고 키보드 opener 복귀 확인. 긴 구간 반복의 정보 밀도는 기존 잔여 |

최종 PNG는 최종15 캡처 폴더 (로컬 전용 근거: `../../../output/playwright/k3b-feedback-final-20260906-01/personal-workspace-k3b-pla-71cff-r-and-keyboard-focus-return/`)의 `feedback-failure-WxH.png`, `feedback-result-WxH.png`다. 첫14 폴더 (로컬 전용 근거: `../../../output/playwright/k3b-feedback-initial-20260906-01/personal-workspace-k3b-pla-71cff-r-and-keyboard-focus-return/`)도 보존했다. 원래 결과의 `개인 계획 2개 변경`은 최종 `개인 계획 변경 2건`으로 명확해졌다. 원문/구간 긴 문자열의 정보 밀도와 전체 제품 시각 완성도는 이 제한된 B3 검사와 별개다. 실제 보조기술로 알림을 들은 검사가 아니라 DOM live owner1개를 확인한 것이다.

## 후보와 미실행 범위

- baseline/user HTML: SHA `889B88F811039413B15347359B5490D5D5D66CEFABC3B4B1DA91E4B516733098`.
- 첫14/ABA RED 메모리 HTML: `9ACFA7EBF2F599E316EE8B63F30FEB6C4B24DD8C9163ED5DAB731B62FFE8FFA3`.
- 첫14/ABA RED app: `1192D96E4FEA70525EF22F8DE6DDDD9848027B9048C10CD1ACBAB3F9A524EDFE`.
- ABA 단독 GREEN app: `0443C541B8FD5FD3DBA2056E1ABE2FEF4D68469E5C70DE18FC0B3B1B9376A027`.
- 최종 전체15 app: `DF4E08A960A97D59926F7E17B195B1B65A376BC96186AE54E6D9E6B4C0869CF7`.
- 최종 메모리 HTML: `7D1610AACC5C3DF6F33C37BFE7C517700AC8FF56FED9793300E528E05F17E34E`.
- style: `5028D2B4107CE0DA2538EDAC75114E2D94B1CC9044813B5DBE94D922448B045A`.
- P: `5F42761D3B16B7F552F8795095760E6F7FA83918DBF24CF7FEEC92A852C59B5A`.
- 신규 테스트 최종: `96A1B2ABF65ADEB97AD6128A3CDA6DD6A4500FEE9C7E0FAE35A1D1DB3AA7F2AB`.

이 파일은 standalone B3 UI 검증이다. React 전체 parity·기본 `/my` 회귀·npm 전체·production build는 이 하위 작업에서 실행하지 않았다. Quick·구 journal v1~3·전체 Cancel/Back/모든 저장 오류 조합은 기존 선정 회귀와 별도로 확인해야 하며 이15개로 전부 다시 실행했다고 주장하지 않는다. 실제 Android Chrome/iOS Safari·가상 키보드·보조기술 미실행, 관찰 사용자0. commit/push/PR/Preview/Production 없음. 이 하위 작업의 사용자 HTML 재생성·배포0. main의 최종 사용자 파일 생성과 보호 원장 검증은 별도 단계다.
