# B3 Plan 요약·저장 결과 — 실제 앱 함수 VM 검증

2026-09-06. [연결 설계](./k3b-plan-feedback-integration-design.md)의 독립 검증이다. 신규 시험 **13개, 23개 격리 fixture가 최종 통과**했다. 실제 브라우저, 전체 제품 검증 또는 관찰 사용자 검증 결과는 아니다.

소유 변경은 [신규 시험 파일](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/k3b-plan-feedback-app.test.cjs)과 이 문서뿐이다. 이번 하위 작업에서 앱·모델·기존 시험·생성 HTML은 수정하지 않았다. 실제 결함 수정은 root가 담당했다.

## 무엇을 실제로 실행했나

시험 시작 시 `app.js`를 한 번 읽고 TypeScript AST로 이름이 일치하는 실제 함수 선언을 추출했다. 요약·attempt 연결·저장 callback·결과 owner 판정·명시 Undo·복구 기록 정리 함수는 제품 본문을 그대로 실행했다. M/P/C/E2/PD/S도 현재 실제 모듈을 사용했다. handoff, source update, 구조 편집 세션, opaque context와 attempt는 공개 제품 API가 만든 객체다. 임의 요약·가짜 authority로 성공을 대신하지 않았다.

DOM 생성/화면 paint, 전체 `render`/`syncEditorUI`, history 이동, 초점 복귀, 다른 기능의 UI 상태, 타이머 실행 시점은 최소 stub이다. `planChangeList`가 만드는 실제 HTML 문자열과 `setPlanSummaryFacts`의 dataset, 전역 알림 비활성화 속성은 검사했지만 실제 DOM 파싱·접근성 트리·스크린리더·포커스 이동을 검사한 것은 아니다. `window.setTimeout`에 등록된 실제 저장 callback을 보관하고 명시 실행했다.

FB13은 별도로 `enterWorkspaceGate`, `invalidateWorkspaceCallbacks`, `suspendWorkspaceDialog`, `recoverWorkspaceStorage`, `reloadFeatureStores`, `normalizeScreen`, `renderPlanSaveResult`까지 실제 본문으로 실행했다. 전체 화면 `render` 대신 실제 결과 renderer를 호출하고 최소 구조의 Node double을 사용했다. 복구 callback은 시험이 직접 호출하지 않는다. 실제 S 복구 결과를 받은 앱 함수가 `gate.onSuccess`를 소비한다. source reload의 epoch 변경도 이 추가 시험에서는 실제 앱 함수가 처리한다.

저장은 새 Map의 localStorage 형태 API를 사용했다. 운영 sentinel과 기존 legacy/source byte는 fixture setup에서 먼저 주입했다. 외부 source/target drift 주입은 제품 저장 호출과 별도로 수행했다. native localStorage의 원자적 CAS를 입증한 시험은 아니다.

## 시나리오별 결과

| ID | 실제 검사 | 최종 판정 |
| --- | --- | --- |
| FB01 | 부모 제목·순서 2필드와 genuine Item의 메모·날짜 2필드 비교. 자식 요약에 부모 변경이나 session 메타데이터가 섞이지 않고 부모 draft는 불변 | PASS, 0쓰기 |
| FB02 | 실제 120 Item 메모 변경. 전체 120필드·120 고유 Item 유지, 10개씩 12페이지, 마지막 시작 번호 111, 페이지 clamp, `<img>`/따옴표/`&` escape | PASS, 0쓰기 |
| FB03 | 같은 genuine attempt의 frozen 요약 재사용, source byte 차이·관측 epoch 변화·revision 불일치 차단. clone session/attempt는 실제 E2 writer가 거절 | PASS, 0쓰기 |
| FB04 | 실제 `saveEditor` callback → E2 durable 확인 → cleanup → exact checkpoint adopt → 상세 결과 1회. callback 재실행과 실제 no-op은 추가 쓰기 없음 | PASS |
| FB05 | 저장 실패 후 입력·같은 attempt·같은 frozen 요약 유지, 실제 retry 성공. active owner가 사라진 뒤 늦은 callback은 쓰기 없음 | PASS |
| FB06 | confirmed cleanup 실패 시 durable 성공 수 1이지만 상세 결과 없음. 같은 메모리 attempt로 명시 정리하면 1회 결과. reload에 해당하는 세션/WeakMap 부재 상태에서는 정리만 하고 결과·성공 수를 제조하지 않음 | PASS |
| FB07 | prepared 요약 또는 디스크에만 있는 실제 성공 byte로 상세 결과를 만들지 않음. 앱의 accepted durable attempt가 필수 | PASS |
| FB08 | source raw/epoch, target exact raw, workspace epoch/lane, 화면 owner 일치 검사. editor/recovery/source dialog 차단. 닫기와 옛 행동 재호출은 추가 쓰기 없음 | PASS |
| FB09 | 같은 선택 Flow에 실제 source Undo가 있어도 결과 Undo는 일반 `undo()`를 호출하지 않고 C Undo → S workspace transaction 사용. source byte 불변, 재호출은 추가 쓰기 없음 | PASS |
| FB10 | 시작 전 source/target drift와 precommit source 재확인 사이의 외부 변경에서 추가 저장 API 0, 가짜 undone 없음 | PASS |
| FB11 | 일회성 source 읽기 실패는 일반 failure, 일회성 prepared 저널 쓰기 실패는 복구 gate, confirmed cleanup 실패는 confirmed gate로 분리. 세 경우 모두 가짜 undone 없음 | PASS |
| FB12 | actual durable 저장·cleanup 뒤 history side effect 시점에 실제 M의 유효 source update/epoch 주입. 상세 결과를 만들 수 없어도 저장 사실은 유지하며 일반 Undo 버튼은 제공하지 않음 | **RED → PASS** |
| FB13 | 실제 S action 복구 → 앱의 confirmed callback 소비. 같은 owner는 undone 1회, source/screen stale는 옛 결과 0, prepared 이전 byte 복원은 undone 0. 반복 복구 호출은 추가 쓰기 없음 | PASS, 4개 fixture |

FB06의 reload 부분은 새로운 브라우저를 연 시험이 아니다. 실제 복구 API와 앱 정리 함수를 실행하되 이전 attempt를 보관한 WeakMap 및 active session이 없어진 조건을 VM에서 재현했다. FB08의 epoch 증가는 listener 실행이 아닌 관측 token 입력 검사다. FB12 역시 실제 browser history event가 아니라 명시한 side-effect 시점의 외부 변화 주입이다.

## 첫 실패와 수정 구분

| 실행 | 결과 | 해석 |
| --- | --- | --- |
| 기존 B2 앱 백업 `6EABC405…` | 0 PASS / 12 FAIL | 모두 `editorChangeSummary` 실제 함수 부재에서 차단. 기능 미구현 기준선이며 12가지 서로 다른 결함을 뜻하지 않음 |
| B3 후보 `0443C541…` | 9 PASS / 3 FAIL | 아래 fixture 기대 2건과 실제 제품 결함 1건 |
| root 수정 뒤 `DF4E08A9…` | 12 PASS / 0 FAIL, skip 0 | 처음 12개 최종 묶음. 앱 및 6개 의존 제품 파일 시작/끝 해시 동일 |
| FB13 첫 추가 실행, 같은 `DF4E08A9…` | 12 PASS / 1 FAIL | 아래 prepared fault fixture 미성립 |
| FB13 보강 최종, 같은 `DF4E08A9…` | **13 PASS / 0 FAIL**, skip 0 | 앱 및 6개 의존 제품 파일 시작/끝 해시 동일 |

초기 FB01은 imported 개인 메모 기준이 이미 빈 문자열인 fixture에 빈 override를 넣어 2필드 변경을 기대했다. 실제 정규화상 메모는 동값이므로 날짜 1필드가 맞았다. 부모/자식 2필드 비교 의도는 유지하고, 메모를 실제 차이가 있는 값으로 바꿨다. 빈 메모 정책이나 제품 normalizer는 바꾸지 않았다.

초기 FB11은 `forceWriteError`로 쓰기와 제거를 모두 막은 상태를 일반 실패로 기대했다. 실제 S는 prepared 쓰기를 확인하지 못하면 보수적으로 복구 gate를 유지한다. 기대를 통과 쪽으로 낮추지 않고 `read-before-once`, `write-before-once`, `confirmed-cleanup` fixture를 분리했다. 일반 실패 안내와 복구/확정 상태가 섞이지 않는지 각각 검사한다.

FB12는 실제 결함이었다. 정상 저장·정리 뒤 `issuePlanSaveResult`가 source 관측 불일치로 false를 반환하면 fallback `showToast`가 `canUndo=true`를 받았다. 이 일반 Undo는 선택 Flow의 source Undo를 우선할 수 있다. root는 source-bound Plan의 fallback만 일반 Undo를 끄고 저장 사실 안내를 유지했다. Quick/구 raw 편집 경로는 이 변경 범위에 포함하지 않았다. 새로운 시험의 기대값은 그대로 두고 통과했다.

FB13 첫 추가 실행에서는 target 쓰기의 throw-after만 주입했는데, 실제 S가 이후 exact readback으로 성공을 확인해 prepared gate가 생기지 않았다. 이를 제품 결함으로 분류하지 않았다. prepared 복원 검사를 위해 실제 throw-after와 일시적 target readback 불가를 함께 주입하고, 명시 복구 직전에 읽기 오류를 해제했다. 마지막에는 저장 시도 전 byte로 복원되는지와 undone가 아닌지 원래 기대를 유지했다. 제품 변경은 없었다.

근거 로그:

- 기존 B2 missing-API RED 12개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-feedback-app-original-red-20260906-01.log`)
- 첫 후보 9 PASS / 3 FAIL (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-feedback-app-first-20260906-01.log`)
- 처음 12 PASS 및 시작·끝 해시/호출 집계 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-feedback-app-final-20260906-01.log`)
- FB13 첫 추가 실행: fault fixture 1 FAIL (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-feedback-app-final13-20260906-01.log`)
- 최종 13 PASS 및 시작·끝 해시/호출 집계 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-feedback-app-final13-20260906-02.log`)

## 운영 데이터 경계와 실제 수

최종 23 fixture에서 스토리지 API는 **102회**였다. 작업 저장 키 대상 `setItem` 25회, 저널 `setItem`/`removeItem` 77회다. 이는 오류를 주입한 호출도 포함한 API 수이며, 사용자 성공 작업 102개나 독립 transaction 102개를 뜻하지 않는다. `forceWriteError`는 실제 앱 wrapper에서 실패해 Map API까지 도달하지 않는 경우도 있다.

허용된 쓰기 키는 아래 둘뿐이며, 다른 key 호출과 `clear()`는 즉시 시험 실패로 처리했다.

- `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2`
- `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2`

허용쌍 밖 호출 **0**, `clear` **0**. 모든 fixture의 `flow:operating:b3-feedback` sentinel과 기존 v1 workspace raw가 마지막에도 exact byte로 같았다. source는 각 시나리오에서 기존 byte 또는 별도로 주입한 외부 byte와 일치했고, 제품 writer의 source 쓰기는 **0**이었다. FB04 정상 Plan 저장은 4 API, FB09 동일 Plan 결과의 저장+Undo는 8 API였다. 최종 전체 시험 후 journal이 남은 fixture는 의도한 복구/confirmed 실패 시나리오이며 실제 사용자 프로필이나 파일 저장소를 변경하지 않았다.

처음 12개 통과 실행은 67회(대상 16/저널 51)였고, FB13까지 포함해 다시 실행한 최종 13개 집계가 102회다. 서로 합쳐 169회라고 보고하지 않는다. 앞선 React B3 시험의 85회와도 별도 집계다. 전체 npm 시험·다른 하위 작업의 합계와 합산하지 않는다.

## 동결 해시

| 파일 | SHA-256 |
| --- | --- |
| app.js | `DF4E08A960A97D59926F7E17B195B1B65A376BC96186AE54E6D9E6B4C0869CF7` |
| model.js | `C21EDA9A5690214CC0C8202FE4915A6DF7091E76A53EBA1DF63A5C5303DF4D36` |
| personal-plan-context.js | `5F42761D3B16B7F552F8795095760E6F7FA83918DBF24CF7FEEC92A852C59B5A` |
| workspace-checkpoint.js | `AD18C6D8A776BF49923D6489238ADA78E067A29BD427DC9B53F19DE097D67314` |
| plan-item-session.js | `C803AA77EE7B9EF1CA778ABF997F3A27B9C815C31BF906BF7AFE20E404E145C2` |
| personal-plan-display.js | `1EF9E1D95BD75E9174706D91E77028981E03DD7D3CC70F196F977A3211AE73D0` |
| workspace-storage.js | `387B90EBC23EBCF9C8EA7816D64F1DD2889214F08B4962732A645E1E7A765CE9` |
| 신규 시험 파일 | `6E24DFDDFDD0C0CEE77F151EBBF479B6048252DE41A149F9F65979E6C5B0B9A8` |

## 범위 밖과 후속 검증

실제 화면에서 단일 live owner, 버튼 가림, 5개 viewport, 포커스 복귀, native history/StorageEvent, 새로고침을 확인하는 일은 root의 별도 브라우저 검증에 남아 있다. 이 VM 결과로 해당 항목을 PASS라고 표시하지 않는다. 결과 요약 수는 저장 권한이 아니며 새 journal field·독립 Undo·운영 schema를 추가하지 않았다.

실제 Android Chrome / iOS Safari: **NOT_RUN**. 관찰 사용자 수: **0**. 전체 `npm test`, production build, 기존 회귀 전체: 이 하위 작업에서는 **NOT_RUN**, root 별도 수행. commit·push·PR·Preview·Production: 모두 **미실행**.

문서 검사 `npm run docs:check`: PASS, 필수 파일 16개·로컬 링크 6,104개. 로그는 `output/poc-gap-implementation/k3b/plan-feedback-app-docs-final13-20260906-01.log`에 보관했다.

재실행: 저장소에서 `node --test docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/k3b-plan-feedback-app.test.cjs`. 과거 앱만 비교할 때는 `FLOWME_B3_APP_SOURCE`에 확인한 앱 백업의 절대 경로를 전달한다. 의존 제품은 현재 파일이므로 과거 실행 결과를 과거 전체 runtime 검증으로 표현하지 않는다.
