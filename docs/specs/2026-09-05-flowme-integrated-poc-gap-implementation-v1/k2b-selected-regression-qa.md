# K2-B 선정 회귀 검증: K1-A·K1-B·K2-A

검증일: 2026-09-05. K2-C 제품 연결 전의 동결 standalone HTML과 포트 3182의 K2-B React production build를 대상으로 선정 회귀를 실행했다. **독립 선정 77개 중 76 PASS / 1 FAIL**이다. 실패한 K1-A 초안 읽기 오류 표시를 고친 뒤에는 **다른 K2-C 소스 스냅샷에서 후속 1개가 PASS**했다. 이를 동결 K2-B의 77/77로 바꾸지 않는다.

이 문서는 [기간·순서 UI 14개 검증](./k2b-timeline-ui-qa.md), 별도 C3 16개 검증, 전체 `npm test`·build와 분리한다. 실제 Android/iOS 검사와 관찰 사용자 검증은 하지 않았다.

## 1. 버전과 실제 실행 수

| 묶음 | 실행 대상 | 선정 수 | 최종 결과 | 근거 |
|---|---|---:|---|---|
| K1-A | React 3182 build + CF20 standalone | 38 | 37 PASS / 1 FAIL | 원본 테스트 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k1a-helper-safety.spec.ts`), 실행 JSON (로컬 전용 근거: `../../../output/playwright/k2b-regression-k1a-frozen-20260905-01.json`) |
| K1-B | CF20 standalone, 새 v2 pair를 사용하는 복사본 | 20 | 20 PASS | 복사본 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2b-regression-k1b.spec.ts`), 최종 JSON (로컬 전용 근거: `../../../output/playwright/k2b-regression-k1b-final-frozen-20260905-01.json`) |
| K2-A | React 3182 build + CF20 standalone, 선정 복사본 | 19 | 19 PASS | 복사본 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2b-regression-k2a.spec.ts`), 첫 합동 실행 JSON의 K2-A 19개 (로컬 전용 근거: `../../../output/playwright/k2b-regression-k1b-k2a-frozen-20260905-01.json`) |
| K2-C 후속 | K1-A before-read 수정 및 진행 중 K2-C 코드를 포함한 별도 snapshot | 1 | 1 PASS, 위 77개와 합산 안 함 | 후속 테스트 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-k1a-before-read-followup.spec.ts`), 후속 JSON (로컬 전용 근거: `../../../output/playwright/k2c-k1a-before-read-after-fix-20260905-01.json`) |

동결 standalone은 생성 HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`)의 당시 bytes를 사용했다. SHA-256은 `cf20f0f53b0db46bdbf0137882cff1fb5ac8b778ed310c017d16c3212abe0483`, 1,135,778 bytes다. 이후 이 사용자용 파일이 새 버전으로 갱신될 수 있으므로 현재 링크만 보고 CF20이라고 추정하지 않는다. K1-B/K2-A 복사본은 읽은 HTML의 이 hash를 강제 검사했다. K1-A 원본은 기존 ENV로 생성 HTML을 읽었고, 실행 전 hash를 확인했다. 원본 K1-A boundary에는 HTML hash 필드가 없다는 차이도 남긴다.

React는 기존 포트 3182 build를 사용했다. 개발 중인 React 소스 파일을 실행 결과로 간주하지 않았다. 포트 3180은 조작하지 않았다.

### 재실행을 독립 시나리오에 더하지 않음

| 실행 순서 | 실제 실행 | 결과 | 처리 |
|---|---:|---|---|
| K1-A 원본 전체 | 38 | 37 PASS / 1 FAIL | CF20 before-read 제품 회귀 증거 보존 |
| K1-B 19 + K2-A 선정 19 최초 | 38 | 36 PASS / 2 FAIL | K1-B의 새 gate selector와 같은 고정 clock의 fixture 전제 문제. K2-A 19개는 전부 PASS |
| K1-B B15/B18/B20 focused | 3 | 3 PASS | 별도 JSON (로컬 전용 근거: `../../../output/playwright/k2b-regression-k1b-fault-focused-20260905-01.json`). B20은 같은 밀리초 ID 충돌 검증으로 새로 추가 |
| K1-B 최종 전체 | 20 | 20 PASS | 고정 v2 gate와 ID 충돌 검사를 포함해 전체 재실행 |
| K2-C 수정 후 K1-A before-read | 1 | 1 PASS | 새 snapshot, 별도 결과 |

동결 회귀 실행 시도는 99회, 수정 후 후속은 1회다. 독립 선정 수는 77개다. 화면 크기 순회, 여러 fault subcheck, HTTP/file 반복, 재실행을 제품 시나리오 수에 더하지 않았다. 이전 실패 JSON·PNG·trace는 모두 보존했고, 새 출력 label을 사용했다.

## 2. 선정 범위와 복사본 변경

K1-A는 원본 38개를 그대로 실행했다. 원문 속성 적용, native Undo/Redo, 정상 Enter, 같은 값·취소, 삽입/동일 제목/삭제/ABA stale, 명시 재선택, 이중 submit, 문서 교체, 초기 read/Quota/readback/rollback/native reject, 합성 IME, 5개 해상도 경로를 포함한다. 합성 IME는 OS·실제 기기 입력 검사가 아니다.

K1-B 복사본은 원본 19개와 신규 B20을 실행했다. 네 saved-plan origin과 authoring 사본의 clean close, dirty Plan·child·Quick, 초점/선택/스크롤, HTTP/file browser Back, 저장 실패·retry, background lock, 5개 해상도, legacy 누락 필드, 외부 삭제, prepared/confirmed 복구, 다른 복구 owner·읽기 오류를 포함한다.

K2-A 선정 19개는 새 `[x]` handoff의 개인 실행 미완료 시작, 원문 preview, Text/Todo/Calendar/Sheet/TXT, 완료·다시 열기·Undo·reload, 회차별 완료, Today/주간/월간/Flow 결과, 동일 제목 identity, legacy 완료·다른 사본, React handoff fault 3개, 양쪽 runtime의 5개 해상도 경로다. 완료 표시와 결과 표현 회귀의 통과이지, 날짜별 수동 순서를 모든 회차에 적용했다는 증거는 아니다.

| 복사본의 수정 | 이유·유지한 assertion |
|---|---|
| K1-B target을 `standalone-integrated:workspace-v2`, journal을 `standalone-plan-item-recovery:v2`로 고정 | 현재 UI가 사용하는 정확한 pair에 fault를 주입. 원본 v1 fixture는 실제 `C.fromLegacy`로 검증하고 exact legacy raw와 v2 checkpoint를 함께 seed |
| K1-B B15 복구 gate 소유 분기 | 유효 editor journal의 foreign target은 editor gate. corrupt/unknown/foreign-journal/read-error는 workspace gate. 쓰기 0·기존 bytes 보존·복구 버튼 부재·명시 재확인 조건은 유지 |
| K1-B context clock | 같은 로컬 날짜 안에서 context별 1ms 차이로 기존 B18의 ‘이미 다른 owner’ 전제 복원. 같은 ms 충돌 자체는 B20에서 별도로 실행 |
| K2-A standalone 상태 key와 legacy 읽기 | 새 성공은 v2에서 읽고, v2가 없으면 seed한 legacy를 읽기만 함. draft key는 변경하지 않음 |
| K2-A Today 날짜 | legacy decoder의 고정 `M.TODAY` 대신 주입한 `Date`와 `Asia/Seoul`의 2026-09-05를 사용. 두 runtime의 날짜 metadata도 이에 맞게 기록 |
| HTML 공급 | 복사본은 CF20 hash를 강제하는 동결 파일을 읽음. 후속 제품 수정이 메모리 build에 몰래 섞이지 않음 |

기존 세 테스트 파일은 수정하지 않았다. 읽은 당시 SHA-256은 K1-A `03065FB1CE7518018E17911AED8625158B5742BF6965988099EEEBBA8A29A5A7`, K1-B `21EBDE4A80B5DC0ADF5C8C68DCEC635BB5E2469C202C85B4E3984F9A3D412674`, K2-A `AFD5517B1EE06742B5C359CA7203789D7B3584397FCF26FE0AB239CF35349962`다.

### 제외한 standalone handoff fault 3개와 C3의 관계

K2-A 원본의 standalone `quota-state`, `readback-state`, `draft-remove`는 실패 직후 즉시 원상 복귀 후 같은 저장 버튼으로 재시도하는 계약을 가정했다. K2-B에서는 target/draft/journal 거래와 명시 복구가 있으므로 이 assertion을 느슨하게 바꾸어 통과시키지 않고 이번 선정에서 제외했다. React의 기존 3개는 그대로 실행했다.

새 계약의 별도 브라우저 근거는 C3UI11 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2b-c3-storage-ui.spec.ts`)과 C3 최종 16/16 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/c3-ui-browser-final-2026-09-05.json`)이다. C3UI11은 target set 실패·draft remove 실패에서 prepared gate/reload/명시 복구로 exact draft를 복원하고, journal cleanup 실패에서는 confirmed candidate를 보존하는 흐름을 실행했다.

**이것은 제외 3개와 동일한 injection의 1:1 대체가 아니다.** 특히 C3UI11의 세 번째는 confirmed cleanup이며 K2-A의 `readback-state`와 다르다. handoff의 정확한 readback mismatch 브라우저 injection은 이 선정 묶음에서 미실행이다. 순수 저장 fault 검사와 전용 C3 범위를 함께 확인해야 하며, C3 16개를 이 문서의 77개 통과 수에 합산하지 않는다.

## 3. CF20에서 확인한 제품 회귀 1개

실패한 이름은 `K1-A standalone › K-X3 before-read never reports an unverified helper commit`이다. 초안 key의 첫 `getItem`에 `SecurityError`를 주입한 뒤 속성 적용을 눌렀다.

- 원문·보관된 draft bytes·속성 입력값은 유지됐다. native insert와 새 저장 호출도 발생하지 않았다.
- 속성 폼의 `failed` 및 재시도 버튼이 나오지 않았다. 폼은 `ready`로 남았다.
- CF20의 `applyAuthoringSourcePlan` 앞단 `featureWritable('draft')`가 오류를 먼저 읽고 `loadedDraft`에 latch한 뒤, 전역 상태 문구만 바꾸고 반환했다. 속성 실패 owner로 오류를 전달하지 않았다.
- 뒤의 정상 읽기에서도 이 latch를 갱신하지 않아 해당 적용 경로가 계속 막힐 수 있었다. 별도 코드 진단으로 이 조건을 확인했다. 데이터 보호의 성공과 복구 UX 회귀를 분리한다.

실패 PNG (로컬 전용 근거: `../../../output/playwright/k2b-regression-k1a-frozen-20260905-01/personal-workspace-k1a-hel-90fb6-an-unverified-helper-commit/test-failed-1.png`), 실패 DOM (로컬 전용 근거: `../../../output/playwright/k2b-regression-k1a-frozen-20260905-01/personal-workspace-k1a-hel-90fb6-an-unverified-helper-commit/error-context.md`), trace (로컬 전용 근거: `../../../output/playwright/k2b-regression-k1a-frozen-20260905-01/personal-workspace-k1a-hel-90fb6-an-unverified-helper-commit/trace.zip`)를 보존했다.

주 작업자는 before bytes를 한 번 읽고 검증한 뒤 기존 ticket/CAS/native Undo 경계를 유지하며 속성 실패 owner로 돌려보내는 수정안을 적용했다. 이 하위 검증 작업자는 제품을 수정하지 않았다.

### 수정 후 후속 1개

고유 K2-C snapshot (로컬 전용 근거: `../../../output/poc-gap-implementation/k2c/k1a-helper-after-fix-20260905-01.html`)은 1,163,841 bytes, SHA-256 `b76bf9bd7b6d60c7001bebb95913818ba92e8668200bbbde9d2e9ec964d7414d`다. 합성 당시 app SHA는 `b4a6f8f623d3e9176d7ace2bd01ad92dd2e8873446a06233cc9c0bde494c34e6`이며 **진행 중 K2-C UI 코드도 포함**한다. 사용자용 두 HTML을 덮지 않았다.

후속 테스트는 원본 before-read assertion을 유지하고 이 snapshot만 읽도록 분리했다. 실패 후 원문/bytes/native insert 0, 입력값과 실패·retry 표시, 명시 retry 성공, native Undo 복원을 확인해 **1/1 PASS**했다. 후속 JSON (로컬 전용 근거: `../../../output/playwright/k2c-k1a-before-read-after-fix-20260905-01.json`)은 새 hash와 source 범위를 기록한다. 이 1개로 K2-C 전체 회귀 또는 CF20의 나머지 77개 재실행을 주장하지 않는다.

## 4. 같은 밀리초 session ID 한계와 exact bytes 보호

원래 B18은 서로 다른 편집 session ID를 전제로 foreign journal의 채택 방지를 검사한다. 복사본에 두 context의 `Date`를 완전히 같게 주입하자 기존 `timestamp + local sequence` 방식에서 session ID와 attempt ID가 같아졌다. 이는 fixture의 전제 문제인 동시에 현재 ID 생성 방식의 실제 유일성 한계다. 1ms 차이로 B18만 통과시킨 뒤 문제를 없던 것으로 처리하지 않았다.

신규 B20에서는 두 context를 다시 같은 밀리초로 맞추고 다음을 실제 실행했다.

1. 같은 session ID·attempt ID를 assert한다. A/B의 candidate 및 journal bytes는 서로 다르다.
2. 명시적인 경쟁 탭 fixture로 A의 정확한 v2 target/journal에 B bytes를 넣는다. 이 시험 주입은 제품 쓰기 수에 포함하지 않는다.
3. A의 저장 상태 재확인은 `다른 편집의 복구 기록`으로 차단한다. 원래 A 입력을 그대로 비활성 상태로 보존하고 복구/정리 버튼을 제공하지 않는다.
4. Escape를 포함한 후속 행동에서 제품 쓰기 0, B target/journal bytes 그대로를 확인한다.

현재 `checkEditorStorage`는 ID 비교 전에 원래 journal의 exact bytes와 비교하고, 같은 내용의 허용된 phase 변경만 인정한다. 따라서 **서로 다른 payload**가 같은 ID를 가진 이번 조건에서는 잘못된 draft를 채택하지 않았다. B20이 포함된 최종 JSON (로컬 전용 근거: `../../../output/playwright/k2b-regression-k1b-final-frozen-20260905-01.json`)의 `same-millisecond-owner-collision` attachment에 결과가 있다.

이 결과는 ID의 유일성을 보장하거나 모든 동일-ID 조합을 해결했다는 뜻이 아니다. 새 UUID 정책·운영 schema 변경은 이 작업에서 하지 않았으며, ID 개선의 호환 영향은 주 작업자의 별도 검토 대상이다.

## 5. 저장 경계 집계

최종 증거만 사용했다. 실패한 초기 K1-B 실행·focused 재실행의 boundary를 다시 더하지 않았다.

| 최종 묶음 | 독립 선정 테스트 | boundary 기록 | Storage API 호출 | 금지 호출 | 운영 sentinel 불일치 | console/page error |
|---|---:|---:|---:|---:|---:|---:|
| K1-A | 38 | 38 | 311 | 0 | 0 | 0 |
| K1-B | 20 | 29 | 147 | 0 | 0 | 0 |
| K2-A | 19 | 19 | 424 | 0 | 0 | 0 |
| CF20 선정 합계 | **77** | **86** | **882** | **0** | **0** | **0** |
| K2-C 수정 후 별도 | 1 | 1 | 11 | 0 | 0 | 0 |

K1-B boundary가 29개인 이유는 HTTP/file, 여러 복구 fault, foreign/collision 추가 context를 포함하기 때문이다. boundary 기록 수를 시나리오 수로 세지 않는다. API 호출 수는 성공 mutation 수가 아니며, prepared/confirmed journal, 실패·rollback·cleanup 시도를 포함한다.

모든 테스트는 새 browser context의 운영 모양 sentinel과 prefix 밖 key/value를 전후 비교했다. 허용 prefix는 `flow:poc:personal-workspace:v1:`이며 `clear()` 및 prefix 밖 호출을 감시·차단했다. 초기 fixture 및 명시 경쟁 탭 fault 주입은 제품 감시와 분리했다. 이 수치가 사용자의 실제 브라우저 운영 데이터 전체를 새로 열어 검사했다는 뜻은 아니다.

K1-A boundary는 fingerprint와 byteParity를, K1-B/K2-A는 원본 운영 값 전후를 기록했다. reload를 거치는 시나리오에서도 Node 측 호출 기록을 사용한다. 각 출력 JSON의 `storage-boundary` attachment가 상세 근거다.

## 6. 화면 판정과 남은 검사

선정 K1-A/K1-B/K2-A의 5개 해상도 subcheck는 각 테스트가 규정한 노출·중심 hit-test·입력/복구 경로를 통과했다. 이 사실은 [별도 기간 UI B09](./k2b-timeline-ui-qa.md)의 **활성 고정 toast가 버튼 내부 하단을 가리는 7개 관측 기록**을 상쇄하지 않는다. 검사 대상과 점의 위치가 다르며, 전체 화면 가림 0으로 보고할 수 없다.

K2-C의 본문 결과 줄·즉시 Undo·중복 announcement·사라진 날짜 그룹 anchor는 별도 신규 E2E로 검사해야 한다. 원본 기능 회귀 통과를 새 UX 설계 검증으로 대체하지 않는다. 전체 `npm test`, production build, 생성 HTML 동기화는 주 작업자의 별도 기록을 확인한다.

## 7. 재현·파일·발행 상태

기존 증거를 덮지 않도록 매 실행의 JSON 및 `--output`에 존재하지 않는 새 label을 사용한다. K1-B/K2-A 복사본은 CF20 hash가 다르면 실행 중단하므로 이후 제품 HTML을 CF20으로 되돌려 덮지 말고, 새 승인 snapshot에 맞춘 별도 회귀를 준비한다.

```powershell
$env:FLOWME_PLAYWRIGHT_PORT='3182'
$env:FLOWME_K1A_STANDALONE_BASELINE='1'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME='output/playwright/<new-label>.json'
npx.cmd playwright test tests/e2e/personal-workspace-k1a-helper-safety.spec.ts --workers=1 --reporter=line,json --output=output/playwright/<new-label>
```

K1-B/K2-A는 대상 파일을 각각 `personal-workspace-k2b-regression-k1b.spec.ts`, `personal-workspace-k2b-regression-k2a.spec.ts`로 바꾼다. 후속 수정 검사는 `personal-workspace-k2c-k1a-before-read-followup.spec.ts`이며 저장해 둔 b76 snapshot의 hash를 강제한다.

| 추가한 테스트 파일 | SHA-256 |
|---|---|
| K1-B v2 복사본 | `2F9293F033BE4417DF5CAE7BD129240A6965E5BA3262504550178ACF1B0A4931` |
| K2-A 선정 복사본 | `41804A62CF5C654C428B3F873BC1FB41FCFCA288D71D7A4FFECEAACD4C5B0F51` |
| K2-C before-read 후속 | `BE9C6A4E8149EE9272DBE0A7E442E9B5AEBD2793153650712AD675DD7FD61DF1` |

제품 파일, 기존 세 테스트 파일, 기존 증거, 사용자 HTML은 이 하위 검증 작업에서 수정하지 않았다. 이번 문서 작업의 추가 파일은 `k2b-selected-regression-qa.md`다. commit·push·PR·Preview·Production은 진행하지 않았고, 실제 기기 검사는 **NOT_RUN**, 관찰 사용자 수는 **0**이다.

문서 작성 후 `npm.cmd run docs:check`는 필수 문서 16개와 로컬 링크 4,991개를 검사해 통과했다. 이 결과는 문서 연결 검사이며 제품이나 브라우저 시나리오를 다시 실행한 결과가 아니다.
