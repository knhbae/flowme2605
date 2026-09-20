# K2-A — 원문 체크와 새 개인 Flow의 실행 완료 분리

작성: 2026-09-05. 상태: **설계 준비 완료 / 제품 구현·새 테스트·새 브라우저 검사 미실행**.

이 문서는 K1-A 검증과 병렬로 준비한 다음 단계의 계약이다. K1-A 완료 판정이나 K2-A 구현 착수를 뜻하지 않는다. 조사 기준은 격리 worktree `agent/personal-workspace-v4-1-poc-20260901`, HEAD `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e`와 그 위의 현재 작업 파일이다. 누적 dirty 파일은 소유권을 취득하지 않았으며, 이 작업에서는 이 문서만 새로 작성했다.

## 1. 대상 요구와 근거의 수준

대상은 J4 작성→개인공간 저장, J6 개인 실행→결과 보기의 `BP-039`와 `P3K-BP-03`이다. 원문에서 확인한 표시와 사용자의 실행 완료는 서로 다른 상태다.

| 근거 | 확인한 내용 | 증거 수준 |
|---|---|---|
| 원본 blueprint `D:/flowme2605/flow-mvp/docs/specs/2026-09-01-flowme-integration-blueprint-v0/spec.md` §6, `bp-audit.json`의 BP-039 | 작성 확인과 실행 완료의 소유권 분리 | 기존 요구·결정 |
| [P3-K 실행 계획 §4](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md), [개선 설계 §4.1](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md) | 신규 handoff는 미완료로 시작, 원문·기존 완료 보존 | 이번 구현 단계의 범위 |
| `output/p3k/browser-audit.json`의 `K-X4-source-checked` | 같은 체크 원문을 명시 저장한 직후 standalone은 1/1 완료·다시 열기·TXT ☑, React 개인공간은 0/1 미완료 | **이전 P3-K 실제 브라우저 재현**; 이번 문서 작업에서 재실행하지 않음 |
| `output/playwright/p3k/{standalone,react}-source-checked-390x844.png` | 위 실행의 화면 | 이전 자동화 화면 캡처; 실제 기기·관찰 사용자 검사가 아님 |
| 아래 §3의 현재 코드 | standalone 신규 저장 mapping, React 결과 projection의 추가 fallback 문제 | **현재 코드 읽기 확인**; 추가 결과 화면 불일치의 새 브라우저 재현은 아직 없음 |

과거 trace의 `충족` 판정을 다시 실행한 것처럼 쓰지 않는다. P3-K에서 발견한 현재 gap과 이번 설계 상태를 별도로 기록한다.

## 2. 사용자에게 보일 계약

예제 원문 `# 원문 체크 검사\n## 준비\n- [x] 원문에서만 체크한 할 일`을 개인 Flow로 저장한다.

| 대상 | 저장 전 작성 화면 | 신규 개인 Flow 저장 직후 | 사용자가 완료한 뒤 | 다시 열기 뒤 |
|---|---|---|---|---|
| 원문 exact text | `[x]` | `[x]` 그대로 | `[x]` 그대로 | `[x]` 그대로 |
| 파싱된 원문 체크 | true | true 보존 | true 보존 | true 보존 |
| 개인 실행 완료 | 실행 대상 아직 없음 | 미완료 | 완료 | 미완료 |
| 개인 완료 시각 | 생성하지 않음 | 생성하지 않음 | 완료 transition의 시각 | 기존 다시 열기 계약에 따라 제거/null |
| 개인 실행 진행률·주 행동 | 해당 없음 | 0/1 · 완료 | 1/1 · 다시 열기 | 0/1 · 완료 |
| 개인 실행 결과의 주 Item 표식 | 해당 없음 | 미완료 | 완료 | 미완료 |

작성 중 원문 기반 preview와 저장 후 개인 실행 결과를 구분한다. 원문·하위 확인 항목의 `sourceChecked`를 숨기거나 지워 개인 실행 미완료를 흉내 내지 않는다. 하위 확인 표식이 남아 있는 TXT에 `☑`가 하나도 없어야 한다는 식의 검증은 잘못이다. 검사는 **해당 주 Item의 실행 상태**와 **원문/하위 확인 표식**을 각각 지정한다.

새 경고 문단이나 행별 기술 설명은 추가하지 않는다. 저장 영수증의 제목·항목 수·위치·개인공간 열기와 기존 원문/결과 구획으로 구별한다. 합성 원문 변경 알림의 기본 진입 개선은 K3-C이며 이 단계에서 후보를 삭제하거나 숨김 정책을 새로 확정하지 않는다.

## 3. 현재 구현과 최소 변경안

코드 위치는 2026-09-05 조사 시점 기준이다. K1-A 병렬 변경으로 행 번호가 움직일 수 있으므로 함수 이름도 함께 확인한다.

### 3.1 standalone 신규 handoff

`docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js`:

- `parseSource` 약 643행은 주 Item의 `checkedInSource`, 약 649행은 하위 확인의 `sourceChecked`를 파싱한다.
- `makeHandoff` 718행 이후는 rawText·fingerprint·handoffId·draftId·sourceConfirmed를 전달한다.
- `apply`의 `commit-authoring` 2109행 이후는 확인·fingerprint·identity를 검사한다. 2131행의 새 task가 현재 `done: parsedItem.checkedInSource, completedAt: null`이다. 이것이 기존 K-X4의 직접 원인이다.
- 같은 분기의 2135행은 Flow에 `rawText`를 그대로 저장한다. task에는 원문 줄·속성·하위 확인·자료·출처가 보존된다.
- 저장 후 `resultProjection` 1363행은 `task.done`을 읽는다. 작성 중 `authoringResultProjection` 1422행은 원문 `checkedInSource`를 읽는다. 이 구분은 유지한다.

최소 변경은 **새 handoff task 생성 시에만** `done: false`, `completedAt: null`을 부여하는 것이다. 값은 교체 가능한 PoC 전용 계약 상수로 둔다. root 원문 체크를 다시 저장하는 필드를 추가하지 않아도 보존된 rawText에서 원문 사실을 복원할 수 있으므로, 이번 수정만을 위해 payload를 중복 확장하지 않는다. parser와 `sourceSubchecks`는 변경하지 않는다.

seed의 의도된 완료 예시, QuickItem, 기존 task, load/validate/Undo는 이 초기값 함수로 다시 통과시키지 않는다.

### 3.2 React materialize와 개인 실행 state

`lib/flow/personal-workspace-poc-authoring.ts`:

- 689·712행의 파싱된 `sourceChecked`는 원문 사실이다.
- `materializePersonalWorkspacePocAuthoring` 1083행 이후는 handoff별 savedCopyId/flowId, 1117행 이후는 handoffId·sourceLine·sourceOrder 기반 itemId를 만든다.
- 1144행 이후의 read-model Item은 완료 상태를 생성하지 않는다. 1182행 이후의 authoring metadata는 rawText·parsedItems·sourceLineItemIdentityMap을 보존한다.

`lib/flow/personal-workspace-poc-state.ts`:

- `commit-authoring-handoff` 1526–1600행은 authored Flow를 추가하지만 원문 체크를 `completions`에 복사하지 않는다.
- `isPersonalWorkspacePocCompleted` 1878행 이후는 명시적인 completion이 없으면 미완료다. 개인공간 목록이 K-X4에서 0/1로 보인 경로다.
- 일반 Item `complete` 1731–1759행에서 완료는 timestamp가 있는 completion을 만들고, 다시 열기는 그 entry를 삭제한다.

따라서 React materialize에 새 완료 entry를 주입하거나 `sourceChecked`를 false로 덮어쓸 이유가 없다. 기존 개인 완료 state를 유지한다.

### 3.3 React 결과 projection의 추가 읽기 문제

`lib/flow/personal-workspace-poc-result-projection.ts`의 `buildPersonalWorkspacePocResultProjection`은 현재 다음 두 용도로 사용된다.

- 작성 preview: `PersonalWorkspacePocAuthoringSurface.tsx` 약 462행.
- 저장 후 개인 실행 결과: `PersonalWorkspacePocSurface.tsx` 약 4491행.

그러나 1486–1488행의 반복 occurrence와 1530–1532행의 일반 Item은 명시적인 completion이 없을 때 모두 `sourceAttributes.sourceChecked`를 완료 기본값으로 쓴다. 저장 후 결과에서는 개인공간 목록의 완료 selector와 다르다. 다시 열기가 completion entry를 지우므로, 임시 `open` entry를 초기 저장 때만 넣는 방식도 재발을 막지 못한다.

**권고:** 저장 schema를 바꾸지 않는 projection 입력 계약으로 `authoring-preview`와 `personal-execution` 목적을 명시하고 두 caller를 구분한다. 같은 의미의 얇은 adapter 분리도 가능하다.

- 작성 preview: 원문 체크를 보여 주되 개인 완료 시각을 생성하지 않는다.
- 개인 실행 결과: 해당 Item/occurrence의 명시적인 개인 완료를 읽으며, entry 부재는 미완료다.
- 일반·반복 경로에 같은 소유권 규칙을 적용한다. 미래 occurrence의 `open` entry를 미리 저장하지 않는다.
- Text/Todo/Calendar/Sheet/TXT/CSV는 같은 개인 실행 item projection을 소비한다. 원문 raw view와 정규화 결과 복사물을 혼동하지 않는다.

이는 **현재 코드에서 확인한 추가 검증 대상**이다. 구현 전 `[x]` 일반·반복 fixture로 먼저 재현해야 하며, 아직 새 테스트 PASS나 현재 브라우저 재현으로 보고하지 않는다.

기존 `personal-workspace-poc-result-projection.fixture.ts`는 두 번째 Item에 실제 `state.completions`를 설정한다. 이에 대한 `result-projection.test.ts`의 completed 기대값은 계속 유효하다. source preview와 명시적인 실행 완료 fixture를 한꺼번에 미완료로 바꾸지 않는다.

### 3.4 버전과 호환 범위

신규 handoff 초기값은 PoC 내부 버전 계약/상수로 명명한다. 이 단계에서 operating schema, 기존 PoC 저장 VERSION, identity 생성식, 원문 문법을 변경하지 않는다. 데이터 migration과 읽기 중 자동 저장은 없다.

현재 근거로는 standalone 신규 mapping과 React in-memory 목적 구분으로 요구를 충족할 수 있다. 새 persisted marker는 기본안에 넣지 않는다. 구현 중 marker 없이는 기존 저장 완료를 보존할 수 없다는 근거가 생길 때만 범위·판별·호환 테스트를 먼저 다시 설계한다.

React에서 원문 `[x]` 외에 명시적인 completion이 없는 과거 authored Flow는 개인공간에서 이미 미완료다. 목적 구분 후 개인 결과도 미완료가 될 수 있지만 **기존 사용자 완료 entry를 삭제하거나 저장 bytes를 바꾸는 migration은 아니다**. 그 과거의 추론된 결과 표시까지 보존해야 한다는 별도 요구가 발견되면 구현 전에 판정을 요청한다. standalone의 기존 `done: true`와 React의 명시적인 completion은 계속 보존한다.

## 4. 원문·identity·기존 완료 보존

1. 원문 비교는 저장된 문자열의 exact equality로 한다. CRLF/LF·대소문자 `[x]`/`[X]`·띄어쓰기·한글·이모지·원문 줄과 source fingerprint를 유지한다. 결과 TXT의 기존 정규화 규칙은 원문 bytes 비교와 별개다.
2. 같은 제목을 key로 삼지 않는다. React의 복합 ref와 sourceLine/sourceOrder 매핑, standalone의 handoff별 savedCopy/sourceFlow와 전역 Item 순번을 그대로 사용한다. 같은 Step/다른 Step의 동일 제목 모두 각각 대상화한다.
3. 다른 사본 격리는 명시적으로 다른 handoffId를 가진 fixture로 검증한다. 현재 standalone은 같은 원문에서 기본 handoffId를 재사용해 중복 저장을 막는다. K2-A가 새 사본 만들기 기능이나 identity 정책을 추가하지 않는다.
4. legacy `done: true`에는 실제 완료 시각이 있는 경우와 `completedAt: null`인 경우를 모두 포함한다. provenance 없이 후자를 자동 미완료로 고치거나 validation에서 새로 거부하지 않는다. 기존 false도 유지한다.
5. legacy를 열기만 하면 저장 key/value exact bytes와 write-call 수가 불변이어야 한다. 새 handoff 후에는 전체 envelope가 정상적으로 바뀌므로, **기존 Flow/task/명시 completion의 subtree**가 동일한지 별도로 비교한다. 새 저장 후 전체 PoC envelope가 byte-for-byte 같다고 주장하지 않는다.
6. 같은 handoff 재요청은 기존 no-op 계약을 유지한다. 기존 완료를 초기값으로 덮어쓰지 않는다.
7. standalone `transitionEnvelope` 2158행 이후는 이전 state snapshot을 보관하며 `undoEnvelope` 2165행 이후는 복원 시 `updatedAt`을 조정하고 Undo를 비운다. 도메인 상태 복원과 raw/완료 보존을 검증한다. 전체 envelope exact bytes 복원이나 다단계 Undo를 새로 요구하지 않는다.

## 5. 저장 경계와 실패 처리

PoC의 제품 쓰기는 `flow:poc:personal-workspace:v1:*` 안에서만 허용한다. 기존 운영 `flow:*` 중 이 prefix 밖의 key/value는 시나리오 전후 byte-for-byte 동일해야 한다. 기존 운영 완료·메모·날짜·보관·export writer를 호출하지 않는다.

standalone은 `model.js`의 `STORAGE_KEY`(`…:standalone-integrated`)와 `DRAFT_STORAGE_KEY`(`…:standalone-integrated:draft`)를 사용한다. `writeAuthoringCommit` 2207행 이후의 state 저장·readback·draft 제거·readback·정확한 이전 값 rollback 순서는 유지한다. React는 `personal-workspace-poc-storage-transaction.ts`의 기존 state/draft 원자 저장 계약을 사용한다. K2-A에 별도 writer는 필요하지 않다.

- 저장 실패: 새 개인 Flow/새 완료의 성공 노출이 없어야 하며, 복구가 확인되면 이전 state와 작업 원문을 보존한다.
- 복구 실패: 성공/안전한 복원으로 표시하지 않고 기존 recovery-required 경로를 따른다. 외부 key를 지우거나 광범위 reset하지 않는다.
- 같은 handoff·취소·손상 payload·잘못된 exact query에서는 해당 기존 무변경/fail-closed 계약을 회귀로 유지한다.
- 시험 storage probe는 테스트용 운영 sentinel을 먼저 준비한 뒤 감시를 시작한다. 허용 prefix 밖 setItem/removeItem/clear 호출은 0건, `clear()`는 호출 자체를 실패로 처리한다.

## 6. 예정 검증 원장

아래 16개 모델/저장 항목과 8개 브라우저 여정은 **설계상 검증 항목**이다. 실행 test case 수가 아니다. 실제 test 파일이 작성된 후 `--list`/실행 로그에서 수를 집계하며, 동일 fixture·viewport 반복을 독립 제품 시나리오로 부풀리지 않는다. 이번 문서 작업의 실제 새 test 실행은 0건이다.

| ID | 모델·상태·저장 검사 | 완료 기준 |
|---|---|---|
| K2A-M01 | `[x]`, `[X]`, `[ ]`, CRLF, 한글/이모지, 같은 제목, 하위 확인 parser fixture | raw exact·sourceChecked·줄 매핑 보존; 입력 객체 mutation 0 |
| K2A-M02 | 신규 handoff 초기값 | 양쪽 개인 실행 open, 완료 timestamp 생성 0; sourceConfirmed/fingerprint/receipt는 기존 계약 |
| K2A-M03 | 작성 preview의 원문 체크 | source 체크 유지, 개인 execution entry 생성 0; preview는 read-only |
| K2A-M04 | 저장 후 일반 Item 결과 | raw `[x]` + completion 부재는 개인 목록·모든 결과 slot에서 미완료; 명시 완료 fixture는 계속 완료 |
| K2A-M05 | 유한 반복 3회 `[x]` | 신규 occurrence 모두 미완료; 특정 occurrence 완료만 반영; source 체크와 sibling 불변 |
| K2A-M06 | 종료 없는 반복 horizon | 미리 open/completed entry를 저장하지 않음; horizon 변경 후 새 occurrence도 미완료 |
| K2A-M07 | 일반 Item 완료→다시 열기→Undo→reload | Undo는 다시 열기 직전의 완료/timestamp 복원; reload 후 동일; raw exact. 별도 초기 완료→Undo는 신규 미완료 복원 |
| K2A-M08 | 반복 occurrence 완료→다시 열기→Undo→reload | 하나의 occurrence만 변경·복원; 다시 열기 시 source 체크 fallback으로 재완료되지 않음 |
| K2A-M09 | 같은 제목: 같은 Step·다른 Step | 서로 다른 Item ref; 한 항목 완료로 다른 동일 제목·sourceLine 매핑 변경 0 |
| K2A-M10 | 다른 개인 사본 | 명시적으로 다른 handoff fixture의 완료·날짜·source bytes 불변; 새 copy UI는 만들지 않음 |
| K2A-M11 | 기존 payload read/decoder | legacy true+timestamp, true+null, false, 기존 Undo snapshot 모두 기존 계약대로 읽음; 열기만 할 때 bytes/write-call 불변 |
| K2A-M12 | legacy state에 새 handoff 추가 | 새 항목만 open, 기존 완료·source·identity subtree 동일; 기존 old-version 자동 저장/정규화 0 |
| K2A-M13 | 같은 handoff 재요청 | 기존 완료/timestamp 포함 envelope 불변, 성공 mutation 0, 중복 Item 0 |
| K2A-M14 | handoff Undo와 작업 원문 | 기존 handoff Undo snapshot 및 raw draft 복원 계약 유지; 다단계 Undo 신규 요구 없음 |
| K2A-M15 | commit 실패 injection | state write/readback, draft remove/readback, rollback 실패를 분리; 복원 가능 시 정확한 before values, 불가능 시 recovery-required; 성공으로 집계 0 |
| K2A-M16 | 손상 payload·React의 잘못된 exact gate·unsupported origin | 각 runtime의 기존 fail-closed/무변경 계약; 허용 PoC prefix 밖 set/remove/clear 0 |

| ID | 실제 조작할 브라우저 여정 | 관찰할 결과 |
|---|---|---|
| K2A-B01 | 같은 체크 원문을 양쪽에서 작성→결과 확인→명시 저장→개인공간 열기 | 작성 체크와 저장 후 0/N 완료를 구분; 영수증·열기 행동 정상 |
| K2A-B02 | 저장한 Flow의 원문/개인 결과를 오가며 Text·Todo·Calendar·표·복사/다운로드 확인 | 원문 exact 유지, 해당 주 Item의 개인 완료와 결과 표식 일치; 하위 source 체크는 별도 보존 |
| K2A-B03 | 날짜가 있는 새 Item을 오늘에서 완료→Flow/기간/결과→다시 열기→Undo→reload | 모든 실행 화면이 같은 완료 상태, 원문과 다른 Item은 불변 |
| K2A-B04 | 반복 3회 중 하나 완료→다시 열기→Undo→reload | 해당 occurrence만 변경, 형제 occurrence와 다른 날짜에 완료 전파 0 |
| K2A-B05 | 동일 제목 Item과 다른 사본을 함께 열고 하나만 완료 | 정확한 항목·사본만 변경, 제목 기반 오적용 0 |
| K2A-B06 | 기존 완료 payload 열기→새 체크 원문 저장→기존 Flow 다시 열기 | 기존 완료 유지, 열기만 한 단계는 storage bytes 불변, 새 Flow만 미완료 |
| K2A-B07 | handoff 저장 quota/readback 실패 후 복구·재시도, 같은 handoff 반복 | 실패 중 성공 receipt/부분 Flow 노출 0, 복구 확인 후 재시도 1개 저장, 운영 sentinel 동일 |
| K2A-B08 | 390×844·375×812·844×390·1024×768·1440×900에서 B01/B03의 핵심 화면 재검사 | 영수증·진행률·완료/다시 열기·원문/결과 접근·Undo가 가려지지 않음, 가로 넘침/콘솔/page error 0; 키보드·비드래그 경로 포함 |

B08의 viewport 조합은 화면 평가의 반복 범위이며 별도 5개 제품 여정으로 계산하지 않는다. 실제 Android Chrome/iOS Safari, 실제 한국어 IME, 관찰 사용자 검증은 실행하지 않으면 `NOT_RUN`/관찰 사용자 0명으로 남긴다.

## 7. 구현 순서와 재사용할 검증

1. K1-A 검증 완료와 작업 파일 소유권 해제를 확인한다. 현재 브라우저·테스트 실행 중인 파일을 동시에 수정하지 않는다.
2. M01–M04의 fixture로 현재 mapping/결과 fallback을 먼저 재현한다. K-X4 과거 캡처와 새 baseline을 구분한다.
3. standalone 신규 mapping과 React projection 목적 계약을 최소 변경한다. 원문 parser·identity·legacy decoder·기존 writer는 보존한다.
4. M05–M16, 기존 관련 회귀를 실행한다. 실패 fixture를 고치려고 기존 명시 완료 기대값이나 fixture 완료를 삭제하지 않는다.
5. 새로 생성한 standalone과 새 React build에서 B01–B08을 실행한다. 오래된 생성 HTML/build의 결과를 현재 변경 검증으로 쓰지 않는다.
6. 보호 baseline 비교, 전체 `npm test`, production build, 브라우저 결과를 서로 분리해 보고한다. 실패/미실행이 있으면 요구 충족으로 올리지 않는다.

확인한 기존 검사 경로:

- `lib/flow/personal-workspace-poc-{authoring,authoring-fidelity,lossless-authoring,state,result-projection,occurrence,cross-surface-parity,storage,storage-transaction}.test.ts`
- `components/flow/personal-workspace-poc/PersonalWorkspacePoc{AuthoringSurface,ResultPresenter,Surface}.test.tsx`
- `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/standalone.test.cjs`
- 기존 E2E `personal-workspace-authoring-workspace-parity.spec.ts`, `personal-workspace-integration-poc.spec.ts`, `personal-workspace-p2b-occurrence-txt-validation-report.spec.ts`는 관련 범위·fixture를 참고한다. 이름에 report가 있는 검사는 실제 사용자 여정 회귀와 동일한 증거로 계산하지 않는다.

실행 단계의 명령 예시(현재 미실행):

```powershell
npx.cmd tsx --test lib/flow/personal-workspace-poc-authoring.test.ts lib/flow/personal-workspace-poc-state.test.ts lib/flow/personal-workspace-poc-result-projection.test.ts lib/flow/personal-workspace-poc-occurrence.test.ts lib/flow/personal-workspace-poc-storage.test.ts lib/flow/personal-workspace-poc-storage-transaction.test.ts
node --test docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/standalone.test.cjs
npm.cmd test
npm.cmd run build
```

새 K2-A 회귀 파일 이름과 브라우저 fixture/port는 구현 착수 때 소유권과 함께 정한다. 기존 테스트·config·package를 이 설계 준비 단계에서 수정하지 않았다.

## 8. 이번 작업의 완료와 미실행

- 완료: 현재 mapping·read/완료/Undo·원자 저장 경로 조사, 최소 수정안, legacy/identity 경계, 예정 검증 원장.
- 새로 변경한 파일: 이 `k2a-design.md` 하나.
- 제품/테스트 구현: 없음. 새 자동 테스트 실행: 0건. 새 브라우저 실행: 0건.
- 실제 기기 검사: 미실행. 관찰 사용자: 0명.
- commit / push / PR / Preview / Production: 이 작업에서 모두 미실행.
- K2-A 완료 판정: 아직 하지 않음. K1-A 검증과 후속 구현 착수 확인이 먼저다.
