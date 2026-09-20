# K3-C C1 — React 새 작성 전환의 초안 보호 설계

- 작성일: 2026-09-06
- 최초 설계 상태: **기획·설계만 작성. 제품 구현·신규 시험 등록·RED 실행 전**이었다. §1–10은 그 시점의 계약과 예정 검사다. 이후 실제 RED와 구현·첫 GREEN은 §11 이후에 추가했으며, 현재 C1과 전체 목표는 계속 진행 중이다.
- 기준 소스: `PersonalWorkspacePocAuthoringSurface.tsx` SHA256 `C4DFF1964691157F717983D2985129C02F3132F15813A666DCAD1B3043FDF311`.
- 기준 production build: `lE_5SdwFh5wQqT11_3qR1`. `.next/BUILD_ID`를 읽었으며, 이 설계를 위한 해당 빌드의 브라우저 재현은 아직 하지 않았다.
- 용어: A는 기존 작성 문서, B는 검색 입력으로 명시한 새 문서, X는 다른 문서/탭에서 저장한 초안이다. 이 구분은 문서 설명용이며 새 저장 필드가 아니다.

## 1. 목적과 범위

검색 입력을 새 원문으로 가져올 때 기존 A의 교체를 확인하고, 저장·재확인을 마치기 전에는 A를 그대로 둔다. 취소와 검증된 실패에서는 A의 원문, 제작 초안 연결, 틀, 선택, 연결된 textarea와 native Undo를 보존한다. 다른 곳에서 저장한 X가 발견되거나 복구 결과를 확인하지 못하면 X를 덮지 않고 추가 쓰기를 막는다.

이 단계의 명시 전환은 기존 React PoC draft key 하나만 쓴다. source, 개인공간 state, creator library, 각 journal, 개인 실행 Undo와 운영 key는 읽기만 한다. Flow 생성·handoff·제작 초안 저장·자동 외부 조회는 수행하지 않는다.

React와 standalone의 저장 형식을 합치지 않는다. React draft는 기존 `version:1`, `rawText`, 선택적 `templateId`, 선택적 `creatorBinding`을 유지한다. standalone의 `draftId`, `folderId`, `creatorDraftRevision`을 넣지 않는다. 동일 serialized bytes일 때 기존 writer가 반환하는 `changed:false`도 성공 가능한 결과이며, 저장 횟수를 맞추기 위해 강제로 쓰지 않는다.

`startBlankWithTemplate()`와 creator의 빈 새 초안은 `beginAuthoring('')`를 공유한다. 이번 nonempty 검색 전환과 분리한다. 기존 `clearPersonalWorkspacePocAuthoringDraft()`에는 exact-before/readback 계약이 없으므로 새 adapter에서 호출하지 않는다. 빈 원문 경로의 안전성까지 해결했다고 쓰거나, 기존 동작을 임의로 막거나 변경하지 않는다.

## 2. 요구 근거와 이번 대응

읽은 정본은 [C1 입구·미리보기 설계](./k3c-c1-entry-preview-design.md), [명시 새 작성 설계](./k3c-c1-explicit-authoring-design.md), [Stage 2 계약 §4–5](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-2-contract.md)다. 앞선 읽기 조사와 이번 코드 재확인을 사용했으며, 이 문서를 위해 세 원본 세션의 대화를 다시 조회하지 않았다. 아래 번호는 이 설계 내부의 대응 번호이며 정본 요구 ID나 신규 갭 수가 아니다.

| 번호 | 기존 요구 | 이번 React 대응 | 범위 판단 |
| --- | --- | --- | --- |
| RQ1 | 개발1 `D1-019`, Stage 2 §5: query hit/memo/URL miss/invalid에서 명시 선택, 분류와 원문 분리 | 실제 현재 입력의 공백·LF·문자를 그대로 B로 전달. empty는 명시 전환 불가, URL miss/invalid는 `텍스트로 계속` | 직접 대응. four-origin 검색·Map 자격은 변경하지 않음 |
| RQ2 | 개발1 `D1-016`, C1 J1/§4.3: 찾기·선택·미리보기·돌아오기 | 검색·확인·취소·복귀는 쓰기 0. 기존 presentation과 초점 복귀 유지 | 해당 연결 부분만. 전체 lifecycle 충족으로 확대하지 않음 |
| RQ3 | 개발2 원문 보존, `D2-029/032`, Stage 2 editor owner 계약 | A의 editor/document identity, raw, selection, scroll, composing, native Undo를 교체 승인 전까지 보존 | 직접 보호. 기존 helper/ghost 모델의 의미를 바꾸지 않음 |
| RQ4 | 명시 작성 설계 §2: 기존 A 확인, 실패 시 A 보존, 새 문서 소유 분리 | prepare → 확인 → persist/readback → B 채택. 실패·취소에는 A의 creator/template/helper/receipt 해제 0 | 직접 대응. creator library 자체 수정은 없음 |
| RQ5 | C1 §4.3 및 명시 작성 설계 §3: exact binding·관측 ABA·한 번의 attempt | source/state/model/draft/library와 전환 owner를 재확인. 취소·복제·재사용 ticket 및 늦은 callback 차단 | 직접 대응. 검색 복귀 ticket을 저장 권한으로 재사용하지 않음 |
| RQ6 | v4.1 PoC 격리 및 기존 개인 실행 보호 | 정확한 PoC draft key 외 쓰기 0, 개인 state·완료·날짜·Undo 불변 | 유지 조건. v4.1 전체 기능을 재검증한 것으로 세지 않음 |

standalone의 최근 HTTP/file 통과는 별도 runtime 증거다. React에는 과거 creatorBinding 제거의 좁은 보강만 있었으며, 이를 A 교체 확인·실패 보존의 PASS로 인용하지 않는다. 기존 Stage 2 geometry 회귀도 다른 작업에서 검증 중이므로 이 문서의 RED/PASS 수에 넣지 않는다.

## 3. 현재 함수와 소유 관계

아래 행 번호는 위 C4DFF 기준이다. 후속 수정 시 함수 이름을 함께 대조한다.

| 실제 함수/위치 | 현재 소유와 동작 | 최소 연결 지점 |
| --- | --- | --- |
| [AuthoringRoute:143](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringRoute.tsx), `entryBinding` | bootstrap이 실제 state/source/model/draft/library를 읽고 creatorBinding의 active library record를 확인. route key는 renderEpoch | 기존 `initialEntryBinding.draftRaw`를 known-owned bytes의 초기 근거로 사용. 복구 journal 처리는 route 소유 그대로 |
| [AuthoringSurface:418](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx), raw/creator/template/epoch | A의 React state와 문서 key를 소유 | 명시 전환 성공 전에는 변경하지 않음. 새 문서 성공 후에만 owner 초기화 |
| [entryIsCurrent:518](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx) | 읽기 preview의 binding/epoch 검증 | 준비·확인 시 현재성 검사에 활용하되 전환 ticket은 별도 발급 |
| [persistAuthoringDraft:1028](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx) | 일반 typing autosave. `expectedPrevious` 없이 저장하고 결과를 boolean으로 줄임 | 명시 교체에는 직접 쓰지 않음. 정상 own 저장 결과를 기록하는 좁은 연결만 검토 |
| [onNativeSourceInput:1046](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx) | A 입력을 state와 draft에 반영. 현재 helper recovery만 차단 | C1에서 발견한 draft drift/recovery latch도 실제 쓰기 전에 검사. 기존 ordinary typing 동작의 전면 변경은 아님 |
| [applyPersistedSourceHelper:1084](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx) | exact 이전 draft 저장 → native 적용 → 실패 복구. helper 소유와 native history 계약 | 성공한 `saved.serialized`를 own bytes에 반영. 새 문서 전환에 helper transaction/native insertion을 빌려 쓰지 않음 |
| [beginAuthoring:1193](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx) | raw·creator·epoch·틀·도움·receipt 초기화 후 저장 | nonempty entry 호출을 새 준비/확인 경로로 교체. 기존 초기화 부분은 검증된 성공 뒤 `adopt` 역할로 분리 |
| [creator atomic writer:439](../../../lib/flow/personal-workspace-poc-creator-draft-storage-transaction.ts) 및 Surface의 save/open/archive/Undo | 성공 결과에 `serializedLibrary`와 `serializedAuthoringDraft`가 있음 | 실제 성공 결과로만 known-owned draft/library 갱신. 레코드 저장 정책·journal·schema 변경 없음 |
| [commitHandoff:2509](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx) | 개인 state 저장과 draft 제거는 별도 기존 행동 | 성공한 draft 제거는 own 기준 null로 반영 가능. C1 drift/recovery 중 호출 차단. 이번 전환에서 handoff 호출 0 |
| [복귀:2634](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx), `기존 Flow 찾기` 2868 부근 | 복귀는 `setAuthoringStarted(true)`만 호출. 찾기는 draftRaw를 제외한 binding 비교 후 fresh binding 채택 | 찾기·복귀 때 A의 known-owned bytes와 exact binding 확인. 외부 X를 A의 새 기준으로 받아들이지 않음 |
| [LiveEditor:2950](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx), retained wrapper:3436 | key는 creator ID + document epoch. 검색 중 기존 A를 hidden/inert로 유지 | 확인·취소·실패에는 같은 key/DOM 유지. 성공만 새 문서 remount 허용 |
| [LiveEditor snapshot:32](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocLiveEditor.tsx) | editorId/documentId/raw/fingerprint/selection/scroll/dispatch/composing 제공 | 별도 textarea 복제 없이 A의 snapshot과 복귀 위치를 캡처 |

`knownOwnedDraftRaw`는 화면 A가 실제로 저장한 마지막 bytes를 뜻한다. 성공한 typing/helper/creator 저장과 검증된 handoff 제거만 이를 갱신한다. 사용자가 화면을 옮겼다는 이유로 현재 storage를 읽어 새 기준으로 삼지 않는다. 실패한 autosave의 화면 A와 durable A가 다르면 둘을 구별하고, 검색 전환으로 실패를 지우지 않는다. library-only 정상 변경은 기존 `creatorDraftLibraryRaw`를 사용한다.

## 4. 코드에서 확인한 위험 — 브라우저 FAIL과 구별

| ID | 코드에서 확인한 경로 | 예상 영향 | 증거 수준 |
| --- | --- | --- | --- |
| CR1 | beginAuthoring이 저장 전에 A의 raw/key/owner 초기화 | quota/readback 실패 때 A의 문서와 입력 이력 상실 | 코드 확인. 이 설계의 actual browser RED 없음 |
| CR2 | 명시 전환이 expectedPrevious/rollback 상세를 쓰지 않음 | stale draft 덮어쓰기와 복구 불확실의 일반 실패 표시 | 코드 확인. 실제 storage fault 재현 예정 |
| CR3 | 찾기는 draftRaw 비교 제외, 복귀는 무검증, typing은 별도 draft drift latch 없음 | 검색 전·검색 중 외부 X가 바뀐 뒤 돌아온 A가 X를 덮을 수 있음 | 코드 확인. 같은 raw/다른 creatorBinding도 재현 예정 |
| CR4 | CTA에 별도 조합 입력·attempt·확인 상태가 없음 | 조합 중 클릭, 중복 확인, 취소 뒤 늦은 실행의 owner 보장 부족 | 보호 조건 누락 확인. 각 행동의 실제 실패는 아직 판정하지 않음 |
| CR5 | [shared save:139–165](../../../lib/flow/personal-workspace-poc-storage.ts)의 실패 복구가 현재 candidate 소유를 확인하지 않고 previous를 씀 | 첫 쓰기 뒤 외부 X가 들어오고 readback/throw가 발생하면 rollback이 X를 덮을 위험 | root 독립 검토와 본문 직접 확인. 순수 모델 RED 선행 필요 |

기존 [`restorePersonalWorkspacePocAuthoringDraftBytes`:171](../../../lib/flow/personal-workspace-poc-storage.ts)는 candidate/previous 검사를 한다. 그러나 `save()` 내부의 복구는 이 함수를 거치지 않으므로, guarded restore를 뒤에 호출하는 것만으로 CR5가 해결되지는 않는다.

## 5. 최소 adapter와 저장 검증 gate

### 5.1 준비·소비·화면 채택 분리

신규 TS adapter는 private memory ticket을 발급하는 `prepare / cancel / commit` 정도로 제한한다. 이름과 파일명은 구현 시 확정하되 공개 영구 API나 schema version을 늘리지 않는다. standalone `personal-entry-authoring.js`의 단계와 fault 구분을 참고하지만 해당 UMD 모델·draft ID 규칙을 React로 가져오지 않는다.

- prepare: 실제 현재 입력의 exact raw, A의 known-owned draft bytes, 5개 읽기 binding, editor/document identity, 관측 변경 세대와 attempt를 결합한다. 입력 검증만으로 쓰기를 허용하지 않는다. getter/foreign/clone/reused ticket은 거절한다.
- confirm: 기존 A가 있으면 교체 확인을 보여 준다. A는 같은 연결 editor에 hidden/inert 상태로 남긴다. 새 문서 B를 editor에 미리 넣지 않는다.
- commit: owner를 확인한 뒤 ticket을 먼저 소비한다. RAF 등 대기 뒤에도 같은 owner/세대인지 확인한다. 저장 전 current read와 exact draft CAS, 저장 후 scope와 실제 candidate bytes를 각각 검증한다.
- adopt: 검증된 성공 결과만 B를 제공한다. 이때 raw·creatorBinding·template/helper/receipt와 document epoch를 한 번 갱신한다. 실패 결과를 B 채택 경로로 넘기지 않는다.
- cancel: ticket만 폐기한다. A/key/value/history에 쓰지 않고 검색 입력과 복귀 위치를 유지한다. 재시도는 이전 ticket을 재사용하지 않으며, A가 있으면 다시 확인한다.

### 5.2 draft-only facade의 선행 검증

기존 shared writer의 전면 변경은 승인 범위가 아니다. 재사용 가능성은 다음 조건을 가진 **adapter 전용 facade**로 먼저 검증한다.

| 단계 | 허용하는 실제 storage 동작 | 차단 조건 |
| --- | --- | --- |
| 읽기 | 정확한 React PoC draft key의 get만 | 다른 key, 읽기 실패를 null로 대체하는 경로 |
| 첫 candidate 쓰기 | captured previous를 다시 확인한 뒤 준비한 candidate bytes의 set 한 번 | 다른 value/key, 먼저 들어온 X, 중복 primary set |
| 실패 복구 | 실제 current가 candidate일 때만 previous 복원. previous가 null일 때만 해당 key remove. 이미 previous면 추가 쓰기 없이 재확인 | current가 X 또는 읽기 실패이면 rollback set/remove 0 |
| 사후 실패 복구 | guarded restore도 같은 facade와 exact candidate/previous로 실행 | 다른 attempt의 candidate나 임의 before 값 사용 |
| 완료 판정 | 실제 before 복원 또는 candidate 유지와 scope 상태를 재확인 | facade가 차단한 것을 성공으로 반환하거나 boolean만으로 완료 처리 |

첫 set 호출은 delegate 호출 **전에** primary 시도로 기록한다. throw-before-write와 throw-after-write를 구별할 수 있도록 실제 readback을 사용한다. rollback 호출과 실제 underlying storage API 호출은 별도로 계측한다. X 또는 read-error에서 writer 내부 rollback이 요청되어도 facade가 underlying set/remove를 호출하지 않아야 한다. 복구가 불확실하면 `recovery-required`로 남긴다.

이 방법은 아직 구현·시험하지 않은 제안이다. 반드시 CR5의 first-write → X → throw/readback-failure 순수 RED를 먼저 남기고, X bytes 보존과 rollback actual API 0을 확인한 뒤 재사용 가능하다고 판정한다. 이를 통과하지 못하면 UI 연결 전에 멈추고 bounded writer 보완을 별도로 승인받는다.

localStorage는 원자적 compare-and-set이나 다중 탭 transaction을 제공하지 않는다. read→set 사이 외부 프로세스의 모든 경쟁을 이 facade가 선형화한다고 주장하지 않는다. exact CAS, 관측 storage event/ABA와 readback으로 **관측한 충돌**을 차단하고, 확인되지 않은 결과를 성공으로 처리하지 않는 범위다. 임의 lock key나 새 journal/schema를 추가해 이 한계를 숨기지 않는다.

### 5.3 읽기 복귀와 쓰기 attempt의 epoch

[entry-navigation-browser](../../../lib/flow/personal-workspace-poc-entry-navigation-browser.ts)는 source/state/model/draft/library 변화나 외부 storage event를 관측하면 private 복귀 memory를 무효화한다. 이 읽기 ticket을 write permission으로 사용하지 않는다.

특히 정상 own draft set 후 같은 read 함수를 호출해도 navigation epoch가 바뀔 수 있다. 사후 검사는 `draftRaw === candidate`와 나머지 scope 불변을 확인하면서, 외부 관측 세대와 자기 쓰기로 인한 preview 무효화를 구별해야 한다. 무조건 epoch +1을 허용하거나 fresh binding을 채택하는 우회는 금지한다. 필요하면 같은 I/O reader를 재사용하는 PoC 전용 read packet에 외부 관측 세대를 분리하되, 추가 저장은 하지 않는다. 이 선택은 순수/브라우저 경계 시험 전에 root가 확인한다.

같은 route 안의 검색 왕복만 A의 connected DOM/native Undo 보존 대상이다. AuthoringRoute가 Next navigation 후 새 key로 mount하는 경우에는 검증된 durable draft 복원과 검색 presentation 복귀를 확인하며, 이전 DOM/native Undo까지 유지했다고 쓰지 않는다.

## 6. 정상·취소·실패·동시 변경 상태표

| 상태/입력 | A와 검색값 | 다음 행동·초점 | 실제 쓰기 조건 |
| --- | --- | --- | --- |
| empty 또는 조합 입력 중 | A와 현재 control 그대로 | 명시 새 작성 비활성, synthetic click도 차단 | 0 |
| 유효 입력, 기존 A 없음 | 검색값 그대로 두고 준비 | 명시 CTA 후 저장 시도. 성공한 B의 원문에 focus | 정상 변경은 draft set 1, 다른 key 0 |
| 유효 입력, 기존 A 있음 | A raw/key/selection/native Undo 보존 | 교체 확인에서 `취소` / `새 작성으로 바꾸기` | 확인을 여는 것만으로 0 |
| 확인 취소·Escape | 같은 A, 검색값·선택 결과 유지 | 검색의 실제 시작 CTA로 복귀. 작성 복귀는 기존 opener 기준 | 0 |
| 확인 중 실제 Back | 같은 A와 검색값 유지 | 해당 확인 marker만 소비해 검색으로 돌아감. 다음 Back의 기존 entry 계약 보존 | 0 |
| 저장 중 재클릭·취소·늦은 callback | A 보존, attempt owner 고정 | 중복 쓰기 차단. 취소가 선행하면 늦은 commit/adopt 금지 | 이미 끝난 동기 write를 취소 전 0이라고 소급하지 않음 |
| 성공, bytes 다름 | readback 뒤에만 B 채택. 이전 creator/template/helper/receipt는 B에 전달하지 않음 | B editor focus, 새 epoch | draft만 변경. Flow/state/library/Undo 0 |
| 성공, bytes 같음 | 명시 교체 의미에 따라 새 문서 owner를 채택할 수 있으나 영구 ID는 만들지 않음 | 성공 readback 뒤에만 전환 | 기존 `changed:false`, set 0 허용 |
| read 실패/쓰기 전 stale | A와 입력 B 모두 보존 | 명시 오류. read 실패는 새 준비로 재시도 가능, 외부 drift는 임의 재기준화 금지 | 0 |
| quota/throw, before 복원 확인 | A·owner·query exact | `다시 시도`는 새 ticket·새 확인 | 실패 set 및 검증된 rollback API는 실제 횟수 기록 |
| readback mismatch와 X 관측 | A와 입력 B는 화면에 남고 durable X는 보존 | 추가 작성/재시도 잠금. 필요한 입력은 복사 가능 | X를 덮는 rollback 0 |
| rollback 불확실 | A 화면 보존과 durable 상태 불확실을 구별 | 불확실 안내 유지. 닫아도 일반 typing/helper/creator/handoff로 우회 불가 | 추가 쓰기 0, 자동 복구/초기화 없음 |
| 검색 중 source/state/draft/library 관측 변경·ABA | 오래된 preview는 무효화. A DOM과 query를 삭제하지 않음 | 기존 read gate와 전환 보호를 함께 적용. stale CTA/old callback 무효 | 0 |
| 취소 뒤 작성으로 복귀 | known-owned bytes가 그대로면 A 정상 재개 | 기존 opener/selection/scroll 복귀. X면 읽기/복사만, autosave 차단 | 복귀 자체 0 |

오류·확인은 입력 영역 가까이에 둔다. 확인은 하나의 로컬 primary, 실패는 재시도 가능 여부를 구분하는 하나의 상태 안내만 둔다. 이전 성공 banner/toast를 동시에 읽히게 하지 않는다. 불확실 상태에서 `아무것도 바뀌지 않았어요`라는 안내는 사용하지 않는다. 새 폼에 내부 key, fingerprint, transaction ID를 노출하지 않는다.

## 7. 최소 개발 순서와 소유 범위

1. **계획 확인**: 이 문서의 nonempty 범위, epoch 처리, facade 충돌 보호를 root가 검토한다. 아직 제품 구현 승인은 이 문서만으로 부여되지 않는다.
2. **순수 RED**: 실제 기존 draft writer를 사용하는 신규 전환 시험을 만들고, CR5 외부 X/rollback 위험을 독립 재현한다. 테스트가 아직 없는 상태를 PASS negative로 표현하지 않는다.
3. **adapter 구현**: 신규 TS 모듈과 신규 unit test만 먼저 연결한다. genuine ticket, known-owned bytes, exact candidate/previous facade, 결과 상세를 검증하고 동결한다.
4. **React UI 연결**: AuthoringSurface의 entry nonempty CTA, 확인/실패 panel, 정상 draft 소유 기록과 복귀 guard를 좁게 수정한다. 기존 helper/native writer·creator transaction·handoff 정책은 유지한다. shared LiveEditor 교체나 새로운 writable source control은 만들지 않는다.
5. **브라우저 RED→GREEN**: 실제 A typing을 전제로 아래 여정을 실행한다. source/builder 파일과 production build를 동결한 뒤 실행하며, 하니스 실패와 제품 실패를 나눈다.
6. **회귀·마감**: 기존 C1 React 검색/owner/왕복, Stage 2 새 작성, K1-A helper, creator draft, handoff를 위험에 맞게 선정한다. root가 전체 npm/build/보고서 및 다른 runtime 조합을 마감한다. 새 초안 보호가 통과해도 C1-c2·C2·C3·전체 목표는 별도다.

예상 제품 범위는 AuthoringSurface와 신규 PoC 전환 adapter다. 필요할 때만 기존 navigation read helper의 읽기 경계를 좁게 추출한다. AuthoringRoute는 이미 정확한 초기 binding을 제공하므로 먼저 변경 없이 연결한다. 기존 storage writer 전면 변경, blank clear, standalone app/model/builder/사용자 HTML, 운영 writer/schema, 기존 시험 assertion 변경은 이 설계의 구현 범위가 아니다.

## 8. 등록 예정 RED 명세

아래는 **예정 inventory**다. 아직 파일/테스트를 등록하거나 실행하지 않았다. 예상 실패 지점을 넘어 도달하지 못한 항목은 미실행으로 남긴다. fixture나 selector 문제는 제품 RED로 바꾸지 않는다.

### 8.1 순수 adapter/storage — 예정 8개

| ID | 실제 fixture와 fault | 통과해야 할 관찰 |
| --- | --- | --- |
| RP01 | 실제 React draft A, genuine prepare/cancel/commit; null draft control | prepare/cancel 0쓰기, 한 번만 소비, 성공 candidate exact, 취소/clone/foreign/replay 거절 |
| RP02 | query hit/memo/URL/invalid raw의 LF·공백·emoji와 same-bytes draft | 정규화 0, 기존 schema만, same bytes changedfalse/set0. 새 ID/Flow 생성 0 |
| RP03 | genuine A에 template와 creatorBinding; 현재 raw는 같고 binding만 X로 변경 | exact serialized 소유 검사로 commit 0쓰기. 보유 library record 불변 |
| RP04 | pre-read throw, quota throw-before/after-write, readback 오류 | A 복원 사실과 actual API 횟수를 구별. 실패 UI용 결과에 B 채택 권한 0 |
| RP05 | **기존 writer의 첫 candidate set 뒤 X로 교체 → throw/readback mismatch** | 먼저 shared writer의 무소유 rollback RED를 보존. facade 후 X exact, rollback underlying set/remove 0, recovery-required |
| RP06 | 복구 직전 read throw/foreign X, before null, 이미 before 복원 | unknown을 absent로 처리하지 않음. 다른 key 접근 0. 이미 before면 불필요한 rollback 쓰기 0 |
| RP07 | source/state/model/library drift 및 관측 ABA, own candidate post-read | 외부 변화는 차단, own draft 변화 때문에 성공을 무조건 거절하지 않음. fresh epoch 재기준화 우회 0 |
| RP08 | getter/custom prototype/unknown input, reentrant writer callback, canceled late attempt | getter 실행 0, owner 탈취·중복 write·늦은 adopt 0, 입력 객체/기존 bytes 불변 |

### 8.2 실제 React 브라우저 — 예정 12개

| ID | 여정 | 핵심 증거 |
| --- | --- | --- |
| RB01 | A 실제 typing/durable 확인 → 찾기 → B 클릭 | 교체 확인 필요. 첫 baseline에서 부재나 조기 교체가 있으면 actual RED. 이후 저장 기대는 도달 전 미실행 |
| RB02 | 확인 취소·Escape, 작성 복귀와 native Undo | 동일 DOM/key/raw/selection/scroll, 복귀 opener, 검색 단계 write0. Undo typing write는 별도 phase |
| RB03 | 확인에서 실제 Back, 명시 취소 후 첫 실제 Back, retry 확인 왕복 | 자기 확인 marker만 소비, 검색값 유지, 중복 marker/불필요한 추가 Back 없음 |
| RB04 | A→B 정상 확인 후 reload, creator-bound A control | 성공 후에만 B 채택, creator/template 연결 제거, library/state/source 불변. React 새 draftId 주장 0 |
| RB05 | query hit/memo/URL miss/invalid 각각 실제 B 저장 | 4개 fresh context는 1등록의 subcheck. latest control exact, 원격 이동/Flow handoff 0. URL fallback label도 확인 |
| RB06 | quota와 verified rollback 후 retry | A의 DOM·owner·B 입력 보존. 실패 상태가 실제 확정된 뒤 retry 검사, 새 확인 뒤 성공 |
| RB07 | readback 실패/rollback 불확실 → panel 닫기 → 작성 복귀/typing | 불확실 안내 유지, 추가쓰기/재시도 0, durable X/unknown을 A로 덮지 않음 |
| RB08 | 실제 다른 문서에서 draft X·library 변경, 같은 raw/다른 creatorBinding | 검색 진입 전/확인 중/복귀 직전에 각각 관측. known-owned bytes 임의 채택 0, X exact |
| RB09 | source/workspace의 관측 ABA, stale 버튼/늦은 callback replay | stale preview/attempt 무효. 되돌아온 같은 bytes를 새로운 권한으로 오인하지 않음 |
| RB10 | compositionstart/end, DOM click, 빠른 중복 클릭, RAF 전 취소 | 조합 중/취소한 attempt write0, 정상 확인 한 번만 소비. 합성 IME를 실제 OS IME라고 부르지 않음 |
| RB11 | own typing/helper 성공/creator atomic 성공 뒤 검색과 복귀 | 정당한 own bytes 갱신은 허용. pending/실패/helper recovery를 검색으로 없애지 않음. transient helper 값 누출 0 |
| RB12 | 작은 정상/실패 입력으로 390×844, 375×812, 844×390, 1024×768, 1440×900 | 확인/입력/오류/취소/재시도 full rect와 9점 hit, horizontal overflow 0, focus/문서 전체 live owner, 실제 CSS hidden 확인 |

예정 source 경로는 신규 pure test와 신규 React explicit-transition E2E다. 기존 standalone spec을 복사해 React schema나 저장 횟수 기대를 그대로 가져오지 않는다. 실제 등록 수는 파일 완성 후 `--list` 결과로 다시 확정한다. viewport loop·입력 종류·fault subcheck·재실행을 고유 테스트 수에 더하지 않는다.

## 9. 검증 경계와 종료 판정

- browser fixture는 실제 React builder/model과 UI typing으로 만든다. private React state 직접 변경으로 성공을 만들지 않는다. storage fault는 정확한 test context/key/phase에만 주입하고, 외부 X fixture 쓰기는 제품 쓰기와 별도 기록한다.
- API 감사는 read-only phase, typing, commit attempt, rollback, retry, reload를 분리한다. 성공 mutation 0과 set 호출 0은 다르다. 운영 sentinel은 자동화 context에 넣은 fixture이며 실사용자 profile 검증이 아니다.
- screenshot은 실제 viewport 크기로 저장하고 캡처 전후 source/storage/state를 확인한다. 9점 hit만으로 화면 전체 완성도를 선언하지 않고 5개 viewport의 정상·오류 캡처를 직접 읽는다. 필요 scroll을 기록하고, 각 행동의 접근 가능과 모든 정보의 동시 노출을 혼동하지 않는다.
- 순수/컴포넌트 PASS, 실제 브라우저 PASS, 전체 npm/build, 실제 사용자 HTML/file 검증은 서로 별도다. 이 문서는 React 코드 위험을 확인했을 뿐 신규 actual FAIL/PASS를 제공하지 않는다.
- 실기기·OS IME·보조기술은 NOT_RUN, 관찰 사용자 0이다. commit/push/PR/배포/운영 변경은 이 문서에서 수행하거나 승인하지 않는다.
- 이 묶음의 종료에는 CR1–5의 실제 재현 또는 반증, adapter fault gate, 등록한 React 시나리오와 선정 회귀, source/build 근거가 필요하다. 통과한 범위만 C1 보호 갭에 반영하며, 빈 원문 전환·standalone 별도 조합·C1-c2와 전체 제품 완료는 포함하지 않는다.

## 10. 설계 검토 메모

`flow-ux-review`를 적용해 확인에는 교체 결과, 오류에는 복구 가능 여부만 남겼다. 새로운 안내 카드, 기술 상태 목록, 중복 primary를 추가하지 않는다. `figma-ux-ui-design`의 저장소 UI 재사용 원칙을 적용했으며 Figma 도구·새 화면 파일은 사용하지 않았다. 원문/소유 보호와 실행 명확성은 위 코드 위험으로 남아 있으므로, 전체 UX rubric 점수를 새로 매겨 제품 검증 결과처럼 표현하지 않는다.

이 문서 작성 과정의 변경 대상은 이 파일 하나다. 제품, 기존 tests, 통합 보고서와 사용자 HTML은 변경하지 않는다.

## 11. RP05 선행 gate — 첫 실제 순수 RED 실행

2026-09-06, root의 별도 승인으로 신규 baseline test (로컬 전용 근거: `./k3c-c1-react-rollback-baseline.test.ts`)를 만들고 실제 기존 `savePersonalWorkspacePocAuthoringDraft()`를 직접 호출했다. 위 §1–10의 미등록·미실행 표기는 최초 설계 시점의 기록이다. 이번 추가는 예정 RP05를 두 fault로 나눈 **신규 등록 2개·첫 실행 2개·0 PASS / 2 FAIL**이며, 예정 순수 8개나 브라우저 12개를 실행한 것이 아니다. 취소·skip·todo는 모두 0이다.

첫 실행 TAP와 case별 JSON diagnostic (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-rollback-baseline-20260906-01.tap`)을 보존했다. `tsx --test`를 직접 실행했으며 default npm inventory에 추가하지 않았다. 실패를 expected-pass로 바꾸거나 adapter로 가려 실행하지 않았다.

| 등록 ID | 실제 주입과 관찰 | 안전 기대 | 실제 결과 |
| --- | --- | --- | --- |
| C1RP05A | 기존 A → 실제 candidate B set → 별도 fixture X set → throw. writer의 catch가 X를 실제로 읽음 | X exact 보존, underlying rollback 0 | A로 덮음, rollback set 1, 반환 `ok:false / rollback:complete`. 안전 assertion FAIL |
| C1RP05B | 기존 A → 실제 candidate B set → 별도 fixture X set → writer의 readback mismatch | X exact 보존, underlying rollback 0 | A로 덮음, rollback set 1, 반환 `ok:false / rollback:complete`. 안전 assertion FAIL |

각 case에서 제품 underlying mutation은 candidate set 1 + rollback set 1 = 2회다. 외부 X fixture 주입은 별도 1회이며 제품 수에 합산하지 않는다. 제품 get은 A 3회, B 4회다. 두 case 합계는 제품 mutation 4회, get 7회, 외부 fixture 주입 2회다. 다른 key 접근·prefix 밖 접근·clear는 모두 0이고, 운영 sentinel 및 state/source/library 보호 fixture의 key/value bytes가 유지됐다. 이 보호 fixture는 읽지 않는 격리 메모리 값이지 실제 사용자 profile이나 해당 모델 전체의 유효성 검사 근거가 아니다.

실제 draft loader로 A/B/X 입력이 모두 유효함을 먼저 확인했다. 첫 set이 정확한 B를 저장한 뒤에만 X를 주입했고, 선택한 throw 또는 mismatch 경로와 writer의 X 관측을 확인했다. 원본 A/B/X 객체·bytes, 제품 소스·package 해시 불변과 다른 key/clear 0 assertion을 모두 지난 뒤, 마지막 `foreignXPreserved:true / underlyingRollbackWrites:0` 안전 assertion에서만 실패했다. 따라서 이번 두 실패는 하니스가 전제에 도달하지 못한 실패가 아니라 **기존 writer의 무소유 rollback을 재현한 실제 순수 RED**다.

- shared writer 전후 SHA256: `A0A06A95B34F95E52645C23D5542CF9E056B5D3B4C09346D754C98487106E8F6`.
- AuthoringSurface 전후 SHA256: `C4DFF1964691157F717983D2985129C02F3132F15813A666DCAD1B3043FDF311`.
- package.json 전후 SHA256: `678D089A4A16CD596F63B4E36E9BEE3BED3594B8F328BD26B0425161FD63B32B`.
- 브라우저·실제 탭 경쟁·실기기·UI 확인/복귀는 이번에 실행하지 않았다. X 주입은 결정적인 순수 저장 경계 fault이며 원자적 localStorage 보장을 증명하지 않는다.

다음 gate는 §5.2의 신규 draft-only facade가 같은 fault에서 X를 보존하고 실제 rollback set/remove를 0으로 막는지 검증하는 것이다. **아직 adapter를 구현하거나 GREEN을 얻지 않았다.** 제품/shared writer·기존 tests·보고서·사용자 HTML은 이번 실행에서 변경하지 않았다.

## 12. React 실제 화면의 첫 보호 baseline — 2026-09-06

root가 신규 실제 화면 spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-react-authoring-safety.spec.ts`)을 작성하고 전문을 읽은 뒤 2등록/2실행/2FAIL (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-safety-baseline-20260906-01.json`)을 확인했다. 위 예정12개 전체가 아니라 RB01의 확인 시작과 RB06의 quota 보존 시작에 해당한다. 원형 geometry 및 기존 Stage2의 최종15PASS와 다른, 아직 구현하지 않은 초안 보호 요구를 검사한 결과다.

| 등록 | 실제 도달한 전제 | 첫 실패 | 미도달 |
| --- | --- | --- | --- |
| replacement-confirmation | 실제 A 입력·추가 타이핑·선택, draft exact, 찾기0쓰기와 같은 연결 A 확인, B 명시 클릭 | 교체 확인0개. B로 즉시 바뀌어 A DOM 분리·draft1쓰기 | 확인 취소·Escape/Back·native Undo 왕복 |
| quota-preserves-connected-a | 같은 A 전제, 정확한 draft set에 quota 주입. 실제 throw1과 failure 안내, durable A 불변 확인 | A DOM이 분리되고 화면은 B. `retainedConnected:false / currentEditorValue:B` | 보호된 A에서 재시도·재확인·취소 |

각 fresh context의 A 준비는4 set API, 명시 시도는1 set API다. 첫 case는 정상 쓰기1, quota case는 throw1/값 변경0이다. 합계2context/API10을 성공 mutation10으로 표현하지 않는다. 조회0·prefix 밖/clear/console/pageerror0, 운영 sentinel exact다. root가 JSON attachment의 각 API와 phase를 직접 집계했다. source C4DFF196·빌드lE_5SdwFh5wQqT11_3qR1은 전후 같으며 제품/private React state는 변경하지 않았다.

두 실패 모두 실제 A 입력과 저장 전제를 지나 요청한 안전 assertion에 도달했다. 하니스 미준비나 expected-fail 처리가 아니다. 테스트는 실제 React route의 desktop Chromium390×844이며 실제 기기 검사가 아니다. 다음은 별도 전환 adapter의 순수 gate를 통과한 뒤 이 동일 기대를 UI에서 충족하는 것이다.

## 13. 전환·소유 bridge 구현과 첫 화면 GREEN — 2026-09-06

§11–12는 구현 전 기록이다. 이후 draft-only 전환 adapter10개와 I/O 없는 own-write bridge8개를 구현하고 전문 검토했다. adapter는 genuine ticket·현재 draft bytes·외부 scope·단일 소비를 검사한다. 기존 writer의 rollback은 정확한 candidate를 아직 소유할 때만 허용하며, 관측한 외부 X나 읽기 불확실을 A로 덮지 않는다. bridge는 source/state/model/draft/library의 검증된 초기값과 명시한 자기 쓰기 결과를 구별한다. 임의 현재값을 새로운 소유권으로 채택하지 않는다.

신규18개와 기존 관련165개를 합친 183/183 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-ui-related-final-20260906-01.tap`), 네 진입 파일 strict 검사0진단을 통과했다. root가 adapter10개를 별도로 재실행했으며 중복 실행을 신규 테스트로 더하지 않는다. shared writer의 원형2FAIL은 그대로 보존했고 공용 writer·운영 schema·package inventory는 변경하지 않았다.

화면은 기존 A를 유지한 채 확인을 열고, draft readback과 own-write 확인 뒤에만 B를 채택한다. 실패에서는 A의 같은 textarea와 새 입력 B를 유지하며, 재시도는 새 ticket·새 확인을 요구한다. 신규 bridge와 모든 own-write 연결이 모든 동시성 문제를 해결했다고 주장하지 않는다.

첫 UI baseline 재검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-safety-first-ui-20260906-01.json`)는 **2등록/2실행/2PASS**다. 교체 확인을 여는 단계의 쓰기0, quota 실패의 set1/throw1/byte변경0, A DOM과 원문 보존을 확인했다. 두 context의 정상 A 준비8 API와 quota1 API를 합쳐9 API이며, 성공 변경9회가 아니다. 운영 sentinel exact·prefix 밖/clear/console/pageerror0이다. root가 두 JSON attachment와390×844 확인·실패 PNG를 직접 읽었다. 두 버튼은 화면 안에 있고 입력 B·실패 안내가 보인다. 이 두 캡처만으로 다른 화면이나 모든 viewport의 가림0을 선언하지 않는다.

이 시점 source는 `9DCD824B7488AE0A8E5BBD211BB6906A1C3BDB3BDE7A348C2FAFC68CFB827512`, production BUILD_ID는 `5d9pwPm94iaaCIVHfHGsm`이며 정적18경로·타입검사 PASS다. 현재 전체 npm은2,030실행/2,029PASS/기존 출처 검토 기한1FAIL이다. 검토일이나 seed·실패 기대를 바꾸지 않았다.

같은 후보의 기존 React 작성30개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-existing-30-initial-20260906-01.json`)는 **29PASS/1FAIL**이다. 도움 값을 입력하다 `기존 Flow 찾기`로 가는 경로를 새 보호 조건이 불필요하게 막았다. 원래 새 문서의 helper owner·값 격리 assertion까지는 도달하지 못했으므로 이를 통과했다고 쓰지 않는다. 나머지 기존 실패 주입·재시도·native Undo·틀·예시·다섯 viewport 검사는 통과했다. 41context의 API146은 set124/remove22이며 prefix 밖·clear·운영 불일치·브라우저 오류0이다.

다음 gate는 정상 도움 상태의 검색 왕복 보존과 실제 외부 초안 X를 관측한 A의 읽기 전용 복귀다. EX01–06 신규6개는 취소·Back·입력4종·retry·실제 외부 문서·합성 composition·다섯 viewport를 검사한다. 예정RB01–12 전체와 같다고 세지 않는다. C1-c1·K3-C·전체 목표는 계속 진행 중이다.

## 14. 읽기 전용 복귀·도움 왕복 GREEN과 남은 커서 회귀

첫 확대6개 실행 (로컬 전용 근거: `../../../output/playwright/k3c-react-authoring-expanded-first-20260906-01.json`)은4PASS/2FAIL이었다. EX04는 실제 다른 React 문서의 입력으로 X를 저장하고 trusted storage event를 관측한 뒤, 돌아온 A의 저장0·X bytes 보존을 확인했다. 그러나 타이핑으로 **화면 A가 바뀌는 실제 제품 결함**이 남았다. EX01의 다른 실패는 native Undo 한 번이 전체 추가 문자열을 지운다는 하니스 가정이었다. 취소·Escape·실제 Back·history·selection·쓰기0은 모두 통과한 뒤 마지막 Undo 단위에서 실패했다.

EX01은 최초 실패를 보존하고, 검색 전 실제 Undo→Redo에서 얻은 원문·저장값을 같은3회 왕복 뒤 Undo와 비교하도록 수정했다. Undo를 생략하거나 기대를 없애지 않았다. EX04는 기존 A/X/0쓰기 기대에 `readOnly=true / disabled=false`와 실제 focus·Ctrl+A 전체 선택까지 더했다. OS 클립보드 검사는 하지 않았다.

제품에는 LiveEditor의 선택적 `readOnly`를 기본false로 추가하고, 실제 textarea와 imperative native replacement의 현재 DOM flag에서 차단했다. `focusRange`·선택·스크롤은 유지한다. Surface는 외부 소유 변경 또는 복구 불확실에만 이를 연결한다. 정상 도움/틀/예시의 로컬 상태는 hidden/inert로 보존한 채 검색을 허용하고, 숨은 도움의 outside/Escape 처리는 중지한다. 복귀 상태 안내도 현재 소유를 확인했을 때만 복원한다.

수정·동결 원장 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-readonly-freeze-20260906-01.json`)의 신규6개 포함 관련189/189·strict0·기존 기본 출력8비교 exact를 통과했다. 신규6은 SSR2·실제 imperative closure를 결정적 hook/DOM fixture로 실행한3·Surface 정적 연결1이다. native 브라우저 검증과 구분한다. 기존 K1-A507에는 새 교체 확인 버튼 클릭 한 줄만 추가했고 identity·helper 값 격리·취소0쓰기 기대는 유지했다.

이 후보는 Surface `7D77B904E551247A1E46B3CF03B82911802CCE237E3E046A84F5233B7DA886CC`, LiveEditor `6A6A083E04E2CAB0C11FEA43E3F992EA34DA9274F81BA514F1E04045EA12B332`, BUILD_ID `0jJyHO3SP-akpYBQwMHbg`다. production build (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-readonly-build-2026-09-06T03-46-10-940Z.json`)는 타입 검사·18정적경로 PASS다.

| 실행 | 실제 결과와 범위 |
| --- | --- |
| 확대6개 재실행 (로컬 전용 근거: `../../../output/playwright/k3c-react-authoring-expanded-readonly-20260906-02.json`) |6/6 PASS. EX01 취소/Escape/실제Back·nativeUndo, EX02 입력4종·reload, EX03quota·재확인·재시도, EX04실제peerX·읽기전용·선택·타이핑0, EX05합성composition·중복, EX06다섯viewport |
| 독립 도움 왕복 HS01 (로컬 전용 근거: `../../../output/playwright/k3c-react-helper-search-return-first-20260906-01.json`) |1/1 PASS. 한 장소form과A를 유지하며3close경로 왕복. helper owner행·label·값·DOM exact·검색0쓰기, 마지막에 원래항목만1회적용 |
| 기존 React 작성30 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-existing-30-readonly-final-20260906-01.json`) |30/30 PASS. K1-A19·K3-A11. 앞선29/30의 검색 차단 회귀와 새문서 helper격리까지 해결 |
| 기존 Stage2와 보호·소유·관찰17 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-readonly-regression-20260906-01.json`) |15PASS/2FAIL. baseline2·creatorowner1·지연observer1은PASS. 기존Stage2의 초기첫행 raw와 틀첫빈값 caret2개 실패는 별도 보완 중 |
| exact gate·origin·shadow·원문시간5 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-readonly-gates-time-20260906-01.json`) |5/5 PASS. 추가/반복/잘못된query·손상/recovery 보호·네origin·이동/완료/Undo/reload·standalone시간 |
| 전체 npm (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-readonly-npm-2026-09-06T03-46-21-485Z.json`) |2,030실행/2,029PASS/기존 출처 검토 기한1FAIL. seed·검토일·시험 기대 변경0 |
| npm 중단 뒤 별도 회귀 |approved201/201 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-readonly-approved-2026-09-06T03-47-40-115Z.json`)·public19/19 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-readonly-public-2026-09-06T03-47-47-132Z.json`) PASS. 전체npm성공으로 합치지 않음 |

확대6개는13context·실제peer1문서·reload4다. primary67+peer1=68 set API 중 주입quota6이 포함된다. HS01은1context·준비4+최종helper1=5 set API/native삽입1이다. 별도 두 실행의 고유7개·14context·API73이며 성공 변경73회가 아니다. 두 실행 모두 읽기·검색·차단 구간0쓰기, prefix 밖·clear·console/pageerror·원격요청0, 보호 bytes exact다. 기존30은41경계context/API146(set124/remove22)로 따로 기록한다. root가 원본JSON과 집계를 확인했으며 확대 상세 집계 (로컬 전용 근거: `../../../output/playwright/k3c-react-authoring-expanded-readonly-summary-20260906-02.json`)와 HS01 집계 (로컬 전용 근거: `../../../output/playwright/k3c-react-helper-search-return-summary-20260906-01.json`)에 원본·구간·문서 수를 분리했다.

검토자는 확대10PNG와HS01저장PNG1을 직접 읽었고 root도390실패·844가로실패·390도움저장3장을 읽었다. 확인·실패의20개 행동은48px·9점hit·가로넘침0·현재live안내1을 통과했다. 844×390은 행동으로 스크롤한 상태여서 제목/label이 위쪽 화면 밖이다. 전체폼 동시노출 또는 모든 제품화면 가림0 판정이 아니다. 1024/1440의 여백·전체정보밀도는C3에 남긴다.

남은 두 커서 회귀는 첫행/첫빈칸이라는 기존 기대를 유지하고 수정한다. 이 결과는 nonempty 명시 전환과 등록한 보호/왕복 범위이며, 빈 원문 clear·관측하지 못한 모든 localStorage 경쟁·RB01–12의 모든 조합·실제상세조작복귀 완료가 아니다. 실제 기기·OSIME·보조기술NOT_RUN, 관찰사용자0명, commit/push/PR/Preview/Production미실행이다.

## 15. 커서 보완의 코드 범위와 파일

초기 첫행이 아닌 끝으로 이동한 것은 신규 nonempty success의 `focusRange(raw.length)`가 원인이었다. 틀의 첫빈칸은 별개다. 실패는 빈 원문에서 다섯 번째 travel-itinerary-prep-v1을 삽입한 뒤였으며, 실제 trace에서 native삽입·저장은 끝났지만 selection은83이었다. 이전C4DFF도 firstBlank를 RAF에 미루는 같은 코드였으므로, 신규 전환이 만든 결함으로 일괄 분류하지 않고 이번 회귀 부하에서 드러난 기존 지연 구간으로 남긴다.

커서 수정은 새 문서의 확인된 identity·원문·미입력dispatch·기본선택0/0·조합/pending/기존lock을 확인하고 첫행을 연다. 그 전에 사용자가 입력하거나 선택을 바꾸면 늦은 초점 이동을 하지 않는다. 저장소 읽기·새 소유 채택을 초점 때문에 추가하지 않았다. 틀은 native와저장 성공 직후 첫빈칸으로 동기 이동하며, 다음 frame은 같은 문서·원문·dispatch·선택이 남은 경우의 스크롤만 수행한다. 늦은 frame이 선택을 다시 덮지 않는다.

커서 동결 원장 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-focus-freeze-20260906-01.json`)은 Surface `9738125BE3A0C3BF6179308CC104784B0A30E09D7C00D6BD63FA8C07A4485F87`이다. 새 정적2개를 더한 관련191/191·strict0을 통과했다. 정적2개를 브라우저2PASS로 대신하지 않으며 새 빌드에서 기존 Stage2 기대 그대로 재검사한다.

이번 React 보호 연결의 파일은 아래와 같다. 기존 dirty 전체를 이번 변경으로 주장하지 않는다.

- 제품: [AuthoringSurface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx), 선택적 readOnly의 [LiveEditor](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocLiveEditor.tsx).
- 신규 모델·각 test: [entry-authoring-transition](../../../lib/flow/personal-workspace-poc-entry-authoring-transition.ts), [entry-authoring-bridge](../../../lib/flow/personal-workspace-poc-entry-authoring-bridge.ts).
- 신규 컴포넌트 검사: [LiveEditorReadOnly](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocLiveEditorReadOnly.test.tsx), [AuthoringFocusOwnership](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringFocusOwnership.test.tsx).
- 실제 화면 검사: baseline2 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-react-authoring-safety.spec.ts`), expanded6 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-react-authoring-safety-expanded.spec.ts`), helper왕복1 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-react-helper-search-return.spec.ts`).
- 기존 시험 연결: AuthoringSurface의 document reset 정적 기대는 새 adopt 함수 위치로 옮기되 모든 reset조건을 유지했다. K1-A의 새 문서 case에는 교체확인 클릭1줄만 추가했다. root 소유 creator owner 검사 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-react-entry-owner.spec.ts`)에도 같은 명시확인과 확인0쓰기 assertion을 추가했고, 정상 creator 보관·재열기·새 문서 단일쓰기·library보존 기대는 유지했다. 기존 Stage2와 LiveEditor 시험은 수정하지 않았다.
- 문서: 이 설계의 실제 실행 절, 진행 원장, report-data와 생성 한국어 HTML, 새 카드의 보고서 검사. 다음 [C1-c2 상세 방문 설계](./k3c-c1-detail-visit-design.md)는 사전 설계이며 아직 구현/시험 등록0이다.

공용 storage writer·package·운영 schema/seed·기본 `/my`·전역 UI는 변경하지 않았다. 독립 HTML의CD6FC4 수정·시험·파일은 [별도 보관함 QA](./k3c-c1-library-return-qa.md)에 기록했다. React 변경을 단일 HTML 재생성으로 표현하지 않는다.

## 16. 최종 후보 판정과 다음 단계

2026-09-06T04:02:13Z 종료 production build (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-focus-build-2026-09-06T04-00-36-228Z.json`)는 타입 검사·18정적경로 PASS이며 BUILD_ID는 **HZktVq3KkYL5ttiK99LCq**다. Surface9738125B·LiveEditor6A6A083E를 고정한 뒤 아래 시험을 실행했다. 실행 중 제품·시험 기대를 변경하지 않았다.

| 최종 실행 | 실제 결과 | 판정 범위 |
| --- | --- | --- |
| 기존 작성30 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-existing-30-focus-final-20260906-01.json`) |30/30 PASS·retry/skip/flaky0 |K1-A19+K3-A11. 도움·틀·예시·원문·native Undo·실패·다섯화면 |
| 보호6+도움왕복1 (로컬 전용 근거: `../../../output/playwright/k3c-react-authoring-helper-cursor-rerun-20260906-03.json`) |7/7 PASS·41.1초 |취소/Escape/실제Back·네입력·quota/재확인·peerX·readonly선택·합성composition·helper왕복 |
| baseline·소유·관찰·Stage2 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-focus-regression-20260906-01.json`) |17/17 PASS·59.5초 |앞선15/17의 첫행raw·여섯틀 첫빈칸 회귀2도 기존Stage2 시험 수정 없이 PASS |
| exact gate·운영 보호 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-focus-gates-20260906-01.json`) |3/3 PASS |네origin·shadow이동/완료/Undo/reload, 추가/반복/잘못된query, 손상/recovery fail-closed |
| 관련 모델·컴포넌트 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-focus-related-final-20260906-01.tap`) |191/191 PASS |신규26+기존165. 네 진입 strict0진단. npm 및 앞선 재실행과 겹침 |
| 전체 npm (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-focus-npm-2026-09-06T04-00-47-028Z.json`) |2,030실행/2,029PASS/1FAIL |기존 seed 출처4개의2026-06-07 재검토기한 검사. 운영 콘텐츠·검토일·시험 기대 변경0 |
| npm 중단 뒤 별도 실행 |approved201/201 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-focus-approved-2026-09-06T04-03-57-804Z.json`)·public19/19 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-focus-public-2026-09-06T04-04-05-779Z.json`) PASS |전체 npm 성공으로 합치지 않음 |

최종7 집계 (로컬 전용 근거: `../../../output/playwright/k3c-react-authoring-helper-cursor-summary-20260906-03.json`)는14context·실제peer문서1·reload4, 저장API73(set성공67/주입quota6)이다. prefix 밖·remove·clear·console/pageerror·원격요청0, 보호non-draft14/14·source/build전후14/14 exact다. 기존30 집계 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-authoring-existing-30-focus-final-summary-20260906-01.json`)는41context·API146(set124/remove22), 금지호출·clear·운영불일치·브라우저오류0이다. 정상 작성·실패 주입을 조회0쓰기와 혼합하거나 전체API를 성공 변경으로 세지 않는다. 17개 안의 baseline2는 별도2개로 중복 합산하지 않는다.

최종7의 새 캡처11장(확인/실패5크기+helper)을 검토자가 직접 읽었다. 확인·실패20행동의 전체rect·높이48px·9점hit·키보드초점·가로넘침0·실패live1을 확인했다. 844×390에서는 행동으로 스크롤하면 제목/label이 위쪽으로 나가며, 1024/1440의 오른쪽 여백과 정보 밀도는 C3에 남긴다. helper 적용 후 정확한 첫항목의 장소 선택으로 돌아온다. 선택 색의 정량 대비·OS클립보드 검사는 미실행이다. Stage2 다섯화면·200%등가reflow·동적viewport도17개 실행에 포함한다.

**C1-c1의 nonempty 명시 작성·등록한 초안 보호/왕복 범위는 구현·검증을 마쳤다.** 빈 원문 clear, 관측하지 못한 모든 localStorage 경쟁, RB01–12 전체 조합, 실제 상세에서 수정한 뒤 복귀는 이 판정에 포함하지 않는다. 다음 [C1-c2 설계](./k3c-c1-detail-visit-design.md)의 실제 상세 방문 baseline을 등록한다. 무변경일 때만 이전 탐색을 복원하고, 변경/관측ABA 뒤에는 옛 ticket을 폐기한 뒤 명시 재조회한다. 전체254부모/424원자 충족률·C1·K3-C·전체 목표를 완료로 올리지 않았다.

실제 Android/iOS·OSIME·OSBack·보조기술 NOT_RUN, 관찰 사용자0명. commit·push·PR·Preview·Production 모두 미실행이다.

마감 보완: root도 최종7의390실패·844실패·helper저장3장과 Stage2의390·844 작성2장을 직접 읽었다. Stage2의390 화면에는 기존 운영 고정 하단 메뉴가 편집기 아래 일부를 덮는 범위가 여전히 보인다. 새 확인/실패 버튼 가림0을 전체 제품 가림0으로 확대하지 않고 C3에 남긴다. 최종 보고서도 다섯화면5/5 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-safety-report-final-20260906-01.json`)를 검사하고 새 카드390/1440을 직접 읽었다. 본문 넘침·링크 전체rect/9점·초점·이미지·로컬 링크·console/pageerror를 검사했다.

04:16:22Z 문서 검사는 필수16개·로컬링크6,527개 PASS, 원본보호551/허용변경31/예상밖0 PASS였다. 04:17:05Z scoped closeout은2modified/14untracked 경로를 열거했으며, 전체189modified/441untracked의 소유를 주장하지 않는다. HEAD6e4b44fe·origin/main db74a36c·upstream0/0, 이번 commit/push0이다. closeout의 권장 명령 목록 자체는 실행 증거가 아니며 위 실제 결과를 따른다.
