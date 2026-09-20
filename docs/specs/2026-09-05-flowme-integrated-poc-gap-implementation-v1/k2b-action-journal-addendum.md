# K2B-C2 — 일반 변경·Undo·handoff·초기화 복구 계약

2026-09-05. 구현 전 계약이다. [checkpoint 계약](./k2b-checkpoint-contract.md)의 C22–26을 구체화한다. 제품 UI와 생성 HTML에는 이 gate의 검증이 끝나기 전 연결하지 않는다.

## 범위와 고정 대상

Plan/Quick 편집은 K1-B 세션 journal을 유지한다. 일반 변경을 가짜 Plan 세션으로 만들지 않는다. 같은 **고정 v2 journal key** 안에서 명시 contract로 구분하며, 두 decoder는 서로의 payload를 실패 후 재해석하지 않는다. 기존 v1 journal은 읽기·명시 복구만 허용한다.

일반 journal은 `{version:2, contract:'flowme-workspace-action-journal-v2', phase, operation, operationId, legacyBaseRaw, entries}`다. `phase`는 prepared/confirmed, `operation`은 workspace/undo/authoring-handoff/reset이다. 아래 명시 삭제 보완에서는 permanent-delete와 그 operation에만 허용하는 `intent`를 추가한다. `entries`는 `{key,beforeRaw,afterRaw}`이며 문자열 또는 null만 허용한다. 모든 레벨은 exact 필드 검증을 한다.

| operation | 정확한 entry 순서 | after |
|---|---|---|
| workspace / undo | 새 workspace | 검증된 checkpoint raw |
| authoring-handoff | 새 workspace → 기존 작성 draft | checkpoint raw → null |
| reset | 새 workspace → 구 workspace → 작성 draft → creator library → source candidates | 모두 null |
| permanent-delete | 새 workspace → 구 workspace → source candidates | owner-scoped 제거 후 각각의 검증된 후보 |

임의 key 배열을 받는 공개 writer API를 만들지 않는다. preparation 함수가 operation별 고정 목록을 만든다. journal decoder도 목록·순서·개수·after를 검증한다. 이 action writer에서 구 key 쓰기는 reset과 아래 명시 영구 삭제에만 허용한다. 기존 E0 편집 기록의 사용자 명시 복구는 별도 고정 adapter가 처리한다. key의 실제 상수는 현재 model.js와 대조했다. prefix 밖 key·journal 자체를 entry로 넣기·반복 key·추가 entry는 모두 거절한다.

## 성공·실패·재시작

1. workspace/journal/base를 읽어 검증한다. 특정 key read-error는 메모리 seed로 우회하지 않는다. 두 journal이 모두 없고 old raw가 checkpoint의 legacyBaseRaw와 일치해야 시작할 수 있다.
2. 후보와 현재 checkpoint가 JSON 데이터상 같으면 첫 v2 key도 만들지 않는다. draft 제거만을 위해 같은 handoff를 재실행하지 않는다. 준비 객체는 한 번만 dispatch할 수 있다.
3. 대상 before와 old base를 확인한 뒤 prepared를 기록하고 exact readback한다. 이후 각 entry 쓰기 전에는 journal 소유권·대상들의 현재 진행 위치·old base를 다시 검사한다. 감지한 foreign 값은 덮지 않는다.
4. 모든 after가 확인된 뒤 confirmed를 기록하고 확인해야 durable 성공이다. confirmed 쓰기가 throw-after해도 exact confirmed와 모든 after가 읽히면 성공이다. 확인이 불가능하면 commit-uncertain으로 잠근다.
5. prepared 단계의 실패는 **명시 복구 gate**로 남긴다. 성공 알림·mutation 증가·자동 재시도는 하지 않는다. 각 key가 자기 before 또는 after인 경우만 사용자가 이전 상태 복구를 실행할 수 있다. 여러 key 중 하나라도 foreign/read-error이면 복구 쓰기를 시작하지 않는다. 복구 중의 추가 drift도 각 쓰기 직전에 재검사한다.
6. 복구는 reverse entry 순서로 before를 돌리고 exact readback한다. throw-after는 실제 bytes로 판정한다. 모두 before이고 journal도 자신의 값일 때만 journal을 지운다. cleanup throw-after/read-error 뒤에는 journal 부재+정확한 before/after로 재확인할 수 있어야 한다.
7. confirmed 복구 버튼은 **journal 정리만** 한다. target/draft를 rollback하지 않는다. reload에서도 prepared를 성공 상태로 채택하지 않고, confirmed는 저장 완료와 정리 필요를 구분한다.

localStorage의 동기 검사와 journal은 모든 탭 사이의 원자적 CAS나 원자적 다중-key transaction이 아니다. 중간 reload를 감지해 명시 복구로 연결하는 보장이다. 원문이나 raw payload를 오류 메시지·console에 출력하지 않는다. 사용자 성공 변경 수와 target/journal set/remove 호출 수를 분리한다.

## handoff와 reset의 차이

handoff는 시작 당시 draft exact raw도 ticket에 담고, workspace 저장·확인 후에만 지운다. target만 기록된 crash, draft까지 지워진 prepared crash, confirmed 후 cleanup 실패, duplicate dispatch를 각각 검사한다. prepared 복구는 workspace와 draft를 둘 다 이전 bytes로 되돌린다. 이후 새 handoff는 사용자가 다시 명시 저장해야 한다.

reset은 기존 명시적 PoC 초기화의 범위만 확장한다. 두 journal이 없어야 준비할 수 있다. 실패 중에는 새 key나 구 key가 없어도 정상 seed를 보여주지 않는다. prepared journal이 먼저 재시작을 막는다. reset 중 old key의 null은 이 reset이 소유한 before/after일 때만 인정하며 다른 action의 base drift 예외로 쓰지 않는다. confirmed+전부 null 뒤 journal 정리가 끝나야 seed로 다시 연다. 실제 사용자 저장소에 초기화를 실행하는 작업이 아니라, 격리 fixture에서 구현·검증하는 작업이다.

## 명시 영구 삭제의 후속 기술 gate

[삭제 owner 설계](./k2b-permanent-delete-design.md)에 따라 이 operation만 old/new/source 세 고정 key에 새 baseline을 함께 기록한다. `intent`는 `{target, expectedRevision, now}`이며 exact 필드를 요구한다. target은 기존 Flow tuple 또는 Quick id다. journal decoder는 단지 유효한 before/after JSON이라는 이유로 삭제를 허용하지 않는다. 검증된 before checkpoint(없으면 old raw 투영)와 before source raw에서 순수 삭제 계획을 **다시 계산**하여 target/legacy/source after가 동일한지 확인한다. unrelated owner 삭제·가짜 candidate·부분 source scrub은 차단한다.

legacyBaseRaw는 journal 안에서는 거래 **이전** 구 raw다. 거래 이후 구 raw는 두 번째 entry의 afterRaw이며 새 checkpoint의 legacyBaseRaw와 같다. prepare/entry/confirm guard는 이 operation에 한해서 구 raw의 자기 before/after 위치를 인정한다. 다른 일반 writer에 이 예외가 흘러가지 않도록 한다. old key가 처음 없던 seed 삭제는 scrub된 v1 baseline을 명시 거래 안에서만 생성할 수 있다.

**confirmed는 영구 삭제 완료가 아니다.** 복구 journal에 이전 개인 bytes가 남아 있기 때문이다. 저수준 commit은 `requiresDeletionCleanup:true`, `deletionComplete:false`를 반환한다. 모든 target의 after와 journal 제거를 확인하고, 마지막 authority 재검사에서도 `canResume:true`인 cleanup에서만 `deletionComplete:true`가 된다. 정리 직후 old base 변경·읽기 오류·구 journal 삽입이 발견되면 정리 관측 사실과 별개로 완료 판정을 하지 않는다. UI는 그때만 영구 삭제 완료·성공 변경을 표시하며, 정리 실패에는 완료 문구나 Undo를 제공하지 않는다. 같은 runtime의 명시 정리 성공은 보류했던 성공 수를 한 번만 반영하고, reload 후 정리를 새 사용자 변경으로 세지 않는다. confirmed 복구는 target을 되돌리지 않고 journal 정리만 다시 확인한다. prepared 복구는 기존 개인 데이터를 복원할 수 있는 명시 실패 복구다. 이 구별은 원래 '명시 영구 삭제' 의미를 유지하기 위한 기술 절차다.

상세 삭제 모델과 저장 fault matrix가 끝나기 전 이 branch는 experimental이며 조작용 HTML에 연결하지 않는다. 현재 source 추가만으로 삭제 성공이나 브라우저 검증을 주장하지 않는다.

## 검증 gate

- 읽기 authority: old/new 각각 없음·유효·손상·unknown·read-error·byte drift, 두 journal 조합, 쓰기 0.
- 모든 operation: initial stale/no-op/중복 0write, prepared/각 entry/confirmed/cleanup의 throw-before·throw-after·readback 오류·foreign 삽입.
- prepared/confirmed 각 중간 snapshot에서 새 runtime의 load/recover/cleanup. 자동 target 변경 0.
- Plan journal과 일반 journal 교차 decoder 거절. 기존 v1 74개 회귀 보존.
- reset 정확한 5개 target 외 쓰기 0, 일반 workspace/Undo에서 구 target 쓰기 0, clear 0, 운영 sentinel bytes 동일.
- C1 원본 보존·Undo 검사와 함께 통과한 뒤 C3 전체 caller를 일괄 전환한다. 이 문서의 예정 검사를 실행 수로 세지 않는다.
