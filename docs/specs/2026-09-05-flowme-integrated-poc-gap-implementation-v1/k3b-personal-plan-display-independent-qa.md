# K3-B 개인 Plan 표시·복구 독립 검증

검사일: 2026-09-05. 제품 파일은 주 작업자가 수정했고, 이 독립 검토자는 새 `personal-plan-display-review.test.cjs`만 작성했다. 아래 결과는 실제 모델과 앱 함수의 메모리 실행이다. 브라우저·사용자 HTML·실제 기기 검사는 포함하지 않는다.

## 최종 결과와 범위

새 검사 **11개 중 11개 통과**, 실패·건너뜀·취소 0개. 최종 실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/personal-plan-display-independent-final-2026-09-05T13-10-49-711Z.json`), 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/personal-plan-display-independent-final-2026-09-05T13-10-49-711Z.log`). Node 검사 시간 1,156.6992ms. 이전 합동 579개와 별개이며, 반복 실행 수를 신규 검사 수로 더하지 않았다.

실제 M/C/P/PD/E2/S 계약과 현재 `app.js` 함수 선언을 TypeScript AST로 추출해 호출했다. 원문 비교는 실제 opener·선택 모델·적용 writer·표시 cache 관찰을 사용했다. 복구는 실제 journal 생성/검증/복구·앱 resume·복구 renderer·click guard를 사용했다. 실제 브라우저 DOM, focus, 일반 Plan/Quick 편집기 presenter 전체는 이 검사 범위가 아니다. 메모리 storage sentinel과 선택한 PoC key의 호출만 검사했다.

| ID | 실제 검사 |
| --- | --- |
| PDR01 | 정상 원문 비교는 source key 1회 저장. A에서 연 비교 뒤 B를 관찰하면 이전 비교의 저장 0회, B exact bytes 보존 |
| PDR02 | P 표시가 실패해도 정당한 v3 prepared 복구는 before bytes 복원. 손상 source는 쓰지 않고 source 재확인 필요 상태 유지 |
| PDR03 | 표시 실패 중 v3 confirmed 정리는 journal만 제거. target rollback과 source 복원 0회 |
| PDR04 | 개인 실행 전용 상태에서 실제 상세·Flow·결과 renderer가 현재 원문 상세/결과를 노출하지 않음 |
| PDR05 | PD 읽기 성공값·복제값은 C 편집이나 S 저장 준비의 권한이 아님 |
| PDR06 | 현재 P가 없어도 도달 가능한 Undo에 P가 있으면 source 사전검사를 생략하지 않음 |
| PDR07 | 기존 P가 있는 raw-v2 Plan prepared 복구: 입력과 복귀 지점 보존, 고립된 active editor 0개, 읽기 오류 중 재확인 0쓰기, source 회복 후 명시 재개·token 1회 소비 |
| PDR08 | 관찰된 A→B→A에서도 이전 비교 0쓰기. 명시 새 비교와 선택 후 source 1회 저장 |
| PDR09 | P 없는 raw-v2 Plan + source 읽기 오류에서도 복구 입력을 보존하고 명시 재확인 뒤 정상 표시로 재개 |
| PDR10 | Quick + 현재 P/source 읽기 실패에서도 복구 gate를 유지하고 source 회복 후 한 번만 재개 |
| PDR11 | Quick 보존 입력의 명시 폐기는 원래 Item 상세 지점으로 복귀. workspace before bytes·손상 source·운영 sentinel 보존, 추가 storage 쓰기 0회 |

PDR09–11은 복구 분기 확장 때 추가했다. PDR07·09·10은 최종 성공 재개 후 **실제 `render()`가 다시 표시 gate에 막히지 않는 것**까지 확인한다. `resumeRecoveredSession` 성공 반환만으로 통과시키지 않았다.

## 실패 이력과 수정 근거

| 실행 | 등록/결과 | 해석 |
| --- | --- | --- |
| 최초 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/personal-plan-display-independent-first-2026-09-05T12-40-56-287Z.json`) | 6개: 5통과/1실패 | PDR01: 이전 비교 A가 새 B를 실제 1회 덮어씀 |
| 진단 보강 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/personal-plan-display-independent-diagnostic-2026-09-05T12-41-56-365Z.json`) | 같은 6개: 5/1 | source 변경 및 성공 mutation 1회 확인 |
| 실제 opener (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/personal-plan-display-independent-opener-2026-09-05T12-45-20-449Z.json`) | 같은 6개: 5/1 | 수동 session fixture를 실제 opener로 교체해 같은 결함 재현 |
| 8개 확장 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/personal-plan-display-independent-expanded-2026-09-05T12-58-44-162Z.json`) | 8개: 7/1 | A/B/ABA 수정 통과. raw-v2 복구 뒤 active editor와 표시 gate가 서로 막는 PDR07 실패 |
| 실제 복구 renderer RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/personal-plan-display-v2-actual-render-red-2026-09-05T13-04-32-022Z.json`) | 기존 PDR07만: 0/1 | `recovery.review.draft`는 v3 전용인데 raw-v2/Quick renderer가 사용해 TypeError |
| 11개 확장 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/personal-plan-display-independent-recovery-expanded-2026-09-05T13-08-11-902Z.json`) | 11개: 8/3 | PDR07/09/10은 같은 원인: 현재 source 검사는 성공했지만 전역 표시 cache가 이전 읽기 실패 상태에 머묾 |
| 최종 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/personal-plan-display-independent-final-2026-09-05T13-10-49-711Z.json`) | 11개: 11/0 | 최종 app 595CD60B에서 통과 |

초기 PDR07은 복구 renderer를 stub으로 두고 실제 resume와 click guard만 검사했다. 그 결과는 복구 화면 렌더링까지 검증한 증거가 아니다. 실제 renderer를 추가하자 신규 TypeError가 드러났으며, 기대값을 완화하지 않고 기록했다. 이어 전체 복구/재개 뒤 actual render까지 확장해 남은 cache 결함을 잡았다. 11개 확장의 실패 3건은 별도 결함 3개로 집계하지 않는다.

주 작업자의 수정은 다음과 같다.

- 원문 비교 owner에 시작 raw/관찰 epoch를 보관하고 irreversible stale을 검사. 적용 전·render 후·preflight 후 재검사하며 writer CAS는 시작 raw만 사용한다. 명시 다시 비교 전에는 새 권한으로 바꾸지 않는다.
- 정당한 non-v3 복구 후 PD가 준비되지 않았으면 verified recovery·입력·복귀 지점을 보존하고 token을 소비하지 않는다. raw Plan을 source-bound로 자동 승격하지 않는다. Quick도 전역 표시 실패를 우회하지 않는다.
- raw-v2/Quick/v3 공통 복구 표시는 검증된 `recovery.journal.draft`를 사용한다. 가짜 v3 review를 만들지 않는다.
- `adoptPersonalDisplaySource(loaded)`로 실제 읽기 결과를 cache에 반영한 뒤 재개한다. 기존 draft/context를 다시 캡처하지 않는다.

## 최종 후보 고정

검사 직전/직후 제품 hash가 동일했다. 코드와 검사 경로는 standalone assets 디렉터리 기준이다.

| 파일 | SHA-256 |
| --- | --- |
| `app.js` | `595CD60B95714381C0FB65CF2353F340D256198EC407C51D1ED95DF60C809C15` |
| `personal-plan-display.js` | `4453A1350EB5A468CBB27860B682F4BE58BB7699665D396EE340325896197458` |
| `personal-plan-display-review.test.cjs` (25,955 bytes) | `C0A72C4656E618C391B3390FA1574410A8797880D37B685CF3FCD8EBD1D1EA92` |

재현: `node docs/specs/2026-09-05-flowme-integrated-poc-gap-implementation-v1/run-check.cjs k3b personal-plan-display-independent-final --test docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-display-review.test.cjs`

## 아직 주장하지 않는 것

실제 기기 검사 미실행, 관찰 사용자 0명. 이 11개로 모든 UX·전체 기능·운영 데이터의 실사용 안전을 완료 판정하지 않는다. 위 메모리 검사에서 실제 사용자 저장소 접근과 실제 storage 쓰기는 0건이다. 아래 브라우저 검사에서는 폐기 가능한 독립 fixture의 PoC source key에 정상 적용 쓰기를 수행했다. 생성 HTML 변경, commit·push·PR·Preview·Production 배포는 이 독립 작업에서 모두 0건이다.

## 후속 브라우저 2개 — 메모리 검사 11개와 별도

새 E2E 파일 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-source-review-cas-ui.spec.ts`)의 등록 수를 `--list`로 2개 확인한 뒤 **첫 실행 2/2 통과**, 6.4초. 실행 요약 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-review-cas-browser-first-2026-09-05T13-22-26-770Z.json`), 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/source-review-cas-browser-first-2026-09-05T13-22-26-770Z.log`), Playwright JSON 및 경계 첨부 (로컬 전용 근거: `../../../output/playwright/k3b-source-review-cas-first-20260905-222226.json`).

Windows Chromium에서 390×844, Asia/Seoul 고정 시계로 실행했다. 등록 시나리오는 2개이고 새 context는 3개다. 첫 시나리오의 정상 positive control을 별도 context에 격리했기 때문이며, 이를 검사 3개로 세지 않는다. root 소유 3182 서버에 memory HTML을 route로 제공했고 사용자 HTML·실제 사용자 브라우저 profile은 사용하지 않았다. `buildText()`만 호출했고 파일 생성 함수는 호출하지 않았다.

| 등록 검사 / 독립 context | 실제 UI·판정 | 제품 storage 쓰기 |
| --- | --- | --- |
| SRCAS01 / 정상 positive control | 실제 sourceUpdateFixture의 저장 Flow를 열고 2개 차이를 radio로 선택한 뒤 적용. 실제 source decoder 유효, 적용 배너 표시 | source setItem 1회 |
| SRCAS01 / A→B | A에서 연 비교의 선택 완료 후 유효한 외부 B를 관찰. 적용 시 stale 안내·명시 다시 비교 버튼·비활성 적용 버튼. B exact bytes 유지 | 0회 |
| SRCAS02 / 관찰 A→B→A | 저장 값이 A로 돌아와도 이전 비교는 stale, 0쓰기. 사용자가 다시 비교를 누른 뒤 각 차이를 다시 선택하고 적용하면 성공 | 이전 비교 0회, 명시 새 비교 source setItem 1회 |

3개 context 합계 **제품 source setItem 2회, workspace target 0회, journal 0회, legacy 0회, removeItem 0회, clear 0회, 허용 prefix 밖 호출 0회, console/page error 0건**. source 적용 workflow이므로 source 쓰기가 정상 경로다. Plan 편집의 source 0쓰기 규칙과 혼동하지 않는다. 운영 sentinel·legacy·workspace 각 3개 protected key의 before/after exact 비교가 모든 context에서 통과했다. 정상 저장과 stale·명시 refresh의 중간 경계에서도 source 외 전체 key/value 일치를 검사했다.

외부 B/A는 test-scoped native setter와 명시 `StorageEvent`로 주입했다. 제품 호출 감시를 우회하는 **fixture 외부 변경 3회**를 별도 첨부에 기록했다. 이는 실제 두 탭 동시성·OS clipboard·외부 동기화·실제 사용자 저장소 검증이 아니다. 실제 app의 storage listener/cache/epoch/render와 opener/선택/적용/새 비교를 통과하는 브라우저 시나리오다.

### 화면 직접 확인

4개 PNG를 직접 열어 확인했다. 모두 `fullPage:false`의 390×844 캡처이며 캡처 전후 storage bytes, dialog 존재, 본문 text가 동일했다. 다른 네 viewport는 이 2개 검사에서 실행하지 않았다. 전체 페이지 기하/접근성 전수 통과나 실제 기기 검사로 확대하지 않는다.

- 정상 적용 (로컬 전용 근거: `../../../output/playwright/k3b-source-review-cas-first-20260905-222226/personal-workspace-k3b-sou-f1d01-cannot-overwrite-observed-B/normal-positive.png`): 적용 배너와 이전 원문 Undo, 기존 개인 Item 제목·날짜·메모 소유 경로가 남아 있다. 하단 성공 알림도 표시된다.
- A→B 차단 (로컬 전용 근거: `../../../output/playwright/k3b-source-review-cas-first-20260905-222226/personal-workspace-k3b-sou-f1d01-cannot-overwrite-observed-B/stale-a-b.png`): 비교 내용·현재 선택이 남고 하단 stale 안내, 다시 비교 버튼, 비활성 적용 버튼이 화면 안에 보인다.
- A→B→A 차단 (로컬 전용 근거: `../../../output/playwright/k3b-source-review-cas-first-20260905-222226/personal-workspace-k3b-sou-adf55-resh-and-choices-write-once/observed-a-b-a-stale.png`): 값이 돌아와도 같은 차단 안내가 유지된다. 단순 raw equality로 이전 권한을 되살리지 않는다.
- 명시 새 비교 후 적용 (로컬 전용 근거: `../../../output/playwright/k3b-source-review-cas-first-20260905-222226/personal-workspace-k3b-sou-adf55-resh-and-choices-write-once/observed-a-b-a-explicit-refresh.png`): 비교 dialog가 닫히고 적용 배너와 Undo가 다시 표시된다.

브라우저 후보의 memory HTML은 **1,380,751 bytes**, SHA-256은 `FB17FDA35E1141C50359BEE3CC5B85A39DC89F9C0C10809570ADB70B757D8BE3`. app/모델/C/P/PD/S/style hash를 실행 전후 비교해 동일함을 확인했다. 브라우저 spec은 12,578 bytes, SHA-256은 `CC71FACA767A03E5C2C0291DF666A71D56B0C6A1D28B918B8D96E80DAD924C33`이다. module hash와 source 전/후 hash, protected key hash는 Playwright JSON의 각 context 경계 첨부에 있으며 source 전문은 로그에 넣지 않았다.

사전 `--list` 뒤 보조 파일 존재 확인에서 `styles.css` 오기를 발견해 `style.css`로 고쳤다. 브라우저 실행 전 하니스 경로 수정이며, 제품 수정 또는 실패한 제품 시나리오가 아니다. 실제 브라우저 첫 실행은 2/2 통과했다.
