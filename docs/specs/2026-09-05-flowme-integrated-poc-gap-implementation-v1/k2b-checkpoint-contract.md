# K2B-C — workspace-v2 checkpoint 저장 계약

2026-09-05. 상태: **저장 방식 선택 완료 / 상세 계약·fixture 검증 설계 / 제품 구현 0**. 이 문서만 새로 작성했다. 실제 저장소, 제품 코드, 기존 문서, 시험 파일과 생성 HTML은 수정하지 않았다.

## 1. 선택과 적용 범위

주 작업자는 [저장 전략 독립 검토](./k2b-storage-review.md) 후, 구 HTML의 후속 쓰기로부터 새 날짜 순서를 보호하는 수준을 낮추지 않기로 했다. 새 PoC checkpoint key를 사용하고 기존 key는 읽기 전용 원본으로 보존한다. 이 선택은 사용자가 승인한 통합 PoC의 기술 계약이며 운영 migration·영구 제품 schema·계정 동기화의 승인이 아니다.

- 새 workspace: `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2`
- 구 workspace: `flow:poc:personal-workspace:v1:standalone-integrated`
- 새 envelope만 `version: 2`. 기존 `M.VERSION`, state의 `version: 1`, authoring draft·creator·source candidate의 버전은 유지한다.
- 현재 state, 날짜별 TimelineOrder, 호환 metadata, 기존 단일 Undo를 **새 workspace envelope 하나**에 함께 기록한다. 순서 전용 sidecar나 별도 Undo lane은 만들지 않는다.
- 열기·날짜 계산·기간 전환·legacy 호환 판정은 저장 0회다. 첫 명시적 변경부터 새 key에 저장한다. 같은 위치·취소·무효·stale 요청은 그 첫 checkpoint도 만들지 않는다.

[K2-B 설계](./k2b-design.md) §5.3의 선택지를 이 계약으로 좁힌다. R1/R2는 독립 읽기 모델이고, 아래 C1/C2/C3 gate를 마치기 전에는 새 reader와 구 writer가 섞인 중간 app을 사용자 조작본으로 제공하지 않는다.

원본 기준은 v4.1 spec의 날짜별 시간순/직접 정렬/시간순 복귀, integration blueprint §5.4의 `date / undated / overdue + contextKey`, [K1-B 복구 계약](./k1b-recovery-addendum.md)이다. 실제 정본은 `D:/flowme2605/flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`와 같은 specs 아래 `2026-09-01-flowme-integration-blueprint-v0/spec.md`에서 확인했다.

## 2. payload와 책임

아래 필드명·상수는 이 PoC 전용 구현 계약이다. C1 시험을 통과하기 전 제품 decoder가 지원한다고 주장하지 않는다.

```text
WorkspaceCheckpoint {
  version: 2,
  contract: 'flowme-standalone-workspace-checkpoint-v2',
  legacyBaseRaw: string | null,
  state: WorkspaceState,
  undo: WorkspaceState | null
}

WorkspaceState = 기존 Mstate의 전체 JSON + {
  timelineContextV1: {
    version: 1,
    records: TimelineOrder[],
    resolvedContexts: TimelineContext[],
    legacySnapshot: LegacyMstate
  }
}

TimelineContext = {
  context: 'date' | 'undated' | 'overdue',
  contextKey: YYYY-MM-DD | 'undated'
}
TimelineOrder = TimelineContext + {
  orderedRefKeys: string[],
  revision: nonnegative safe integer
}
```

`legacyBaseRaw`는 당시 구 key의 **문자열 전체 그대로**다. 공백, 필드 순서, 기존 state와 undo까지 포함하며 다시 stringify한 값으로 바꾸지 않는다. hash는 진단 보조일 뿐 exact 비교를 대신하지 않는다. null은 당시 key가 없었음을 뜻한다.

standalone의 `orderedRefKeys`는 기존 검증된 task id를 사용한다. 이름이나 표시 제목으로 식별자를 다시 만들지 않는다. 기존 flow item ref·savedCopyId·flowId·itemId 및 반복 occurrence identity는 그대로 보존한다. React와 standalone의 문자열 표현이 같다고 가정하지 않는다.

### 2.1 활성 orders와 legacySnapshot의 분리

legacy state를 투영할 때 전체 state를 복사하고 `orders.today`, `orders.week`, `orders.month`, `orders.undated`만 **새 활성 orders에서** 분리한다. 네 배열의 원본과 그 시점의 tasks·날짜·완료·휴지통 membership은 `legacySnapshot`에 그대로 남는다. 구 key는 변경하지 않는다. Flow/Step/폴더 orders는 활성 `state.orders`에 유지한다.

따라서 보존 주장은 ‘새 state.orders의 같은 경로에 구 기간 배열도 계속 남김’이 아니다. **구 key exact bytes와 전체 legacySnapshot 안에 원본을 보존**하면서 활성 기간 정렬 owner를 옮기는 선택이다. 원본 배열을 현재 task membership에 맞춰 정리하는 migration은 하지 않는다.

- `legacySnapshot`은 최초 검증된 **순수 v1 Mstate**다. 그 안에는 reserved `timelineContextV1` 또는 새 checkpoint가 들어갈 수 없다.
- 구 envelope의 state와 undo는 각각 별도로 투영하며 각자의 원본 snapshot을 가진다. 둘의 orders·membership이 다르면 서로 바꾸어 쓰지 않는다.
- 새 action마다 현재 state를 legacySnapshot으로 다시 복사하지 않는다. snapshot은 불변 provenance이고, 보통 action은 기존 `M.apply`의 전체 JSON clone으로 이 metadata를 그대로 보존한다.
- M.apply의 기존 orders prune은 활성 Flow/Step/폴더 order에만 도달한다. archived orders는 별도 필드 안에 있어 prune 대상이 아니다. 이 사실은 코드 모양만 믿지 않고 날짜 이동·추가·완료·휴지통·Plan 저장 fixture로 검증한다.
- 새 state의 도메인 유효성은 기존 M.validate로, archived snapshot은 **그 snapshot 자체**에 기존 M.validate를 적용해 확인한다. snapshot을 현재 날짜 목록으로 검증하지 않는다.
- snapshot은 `legacyBaseRaw`를 decode한 원본 state 또는 원본 undo 중 하나와 JSON 데이터 및 배열 순서가 같아야 한다. 구 key가 null이면 알려진 v1 seed 계약의 snapshot만 허용한다. 임의 snapshot을 유효한 과거 자료로 받아들이지 않는다.

`legacyBaseRaw` 전체, 현재 state snapshot, undo snapshot이 겹쳐 저장 크기는 증가한다. 중첩 snapshot을 금지하면 증가량은 제한된 복제량이지만 브라우저 저장 가능 용량을 보장하지는 않는다. C1은 대표 fixture 및 큰 원문 fixture의 실제 serialized 길이·UTF-8 bytes·반복 action 후 크기를 기록한다. 조용한 원문 삭제, 오래된 orders 제거, Undo 축약으로 용량을 맞추지 않는다. Quota 실패는 이전 bytes/UI/Undo 보존 또는 명시적 복구 잠금으로 처리한다. 저장 한도를 영구 정책으로 새로 정하지 않는다.

### 2.2 unknown field와 검증

M.validate만으로 새 계약을 검증하면 안 된다. 현재 M.validate는 여러 unknown 필드를 허용한다. 새 envelope와 `timelineContextV1`, context/record는 exact field allowlist와 값 검증을 추가한다. 중복 context/ref, 잘못된 날짜, 알 수 없는 context/contract/version은 거절한다. date/overdue key는 검증된 plain date이고 undated key는 정확히 `undated`다.

기존 v1 일반 unknown 필드는 **기존 M 검증 + 전체 clone 보존**을 유지한다. 별도 v1 전체 allowlist를 복제하면 과거 허용값을 새로 거절하거나 필드를 누락할 위험이 있어 채택하지 않는다. unknown 값을 해석·삭제·정규화하지 않고, old raw와 snapshot 및 해당 owner가 유지되는 action 후의 값을 비교한다. 원문·개인 완료·회차·휴지통·receipt와 중첩 unknown fixture를 포함한다. 보존을 입증하지 못한 특정 action/field 조합만 근거를 붙여 차단하며, 일반 unknown 전체를 손상으로 취급하지 않는다.

예외는 새 owner와 충돌하는 legacy state의 reserved `timelineContextV1`이다. 값이 우연히 새 shape와 같아도 자동 채택·덮어쓰기하지 않고 `legacy-reserved-field-collision`로 차단한다. 새 metadata/record의 unknown은 일반 legacy unknown과 달리 strict 실패다. 입력 객체는 변경하지 않으며, 누락된 새 metadata를 seed로 자동 보충하지 않는다. unknown 키를 안전하지 않은 객체 merge나 prototype으로 승격하지 않도록 C1에서 JSON clone 경계를 검사한다.

## 3. 부팅과 읽기 권위

현재 `app.js`의 `acquireStorage`는 여러 key 중 하나의 getItem 예외도 통째 memory fallback으로 바꾸고, 이후 workspace/draft read-error에도 새 메모리 저장소를 만든다. 새 key를 추가한 뒤 이 경로를 두면 손상·미확인 저장본이 memory seed로 우회된다. **저장 API 자체를 얻을 수 없는 경우와, 얻은 storage의 특정 key를 읽지 못한 경우를 분리**해야 한다.

| 입력 상태 | 읽기 결과와 허용 행동 | 자동 쓰기 |
| --- | --- | --- |
| `window.localStorage` 접근 자체 불가 | 기존 로컬 임시 실행을 허용한다면 ‘이 화면에서만 사용·새로고침 복원 안 됨’으로 명확히 분리. 저장본이 없다고 주장하지 않음 | 실제 storage 0 |
| storage 객체는 얻었으나 workspace/journal 특정 key read-error | `storage-unverified` 잠금. memory seed·구 key fallback·일반 writer 우회 금지 | 0 |
| 두 journal 없음, 새 key 없음, 구 key 없음 | 알려진 v1 seed를 새 계약의 **메모리 투영**으로 열음. `legacyBaseRaw=null` | 0 |
| 두 journal 없음, 새 key 없음, 구 key 유효 | 구 state/undo를 각각 투영한 `legacy-readonly` 상태. 일반 unknown 필드 보존 | 0 |
| 새 key 없음, 구 key 손상/unknown version/reserved 충돌 | 차단. ‘구 데이터를 확인할 수 없어 변경하지 않았어요.’ | 0 |
| 새 key 유효, 현재 구 raw가 legacyBaseRaw와 같음 | 새 checkpoint를 권위로 복원 | 0 |
| 새 key 유효, 구 raw가 다름 또는 읽기 실패 | `legacy-drift` 또는 `storage-unverified` 잠금. 두 저장본 보존, 자동 rebase/merge 없음 | 0 |
| 새 key 존재, 손상/unknown/read-error | `checkpoint-blocked`. 구 key/seed로 내려가지 않음 | 0 |
| prepared/confirmed/unknown/foreign journal 있음 | 일반 복원보다 복구 gate 우선. phase와 target을 구별해 §6 적용 | 0 |

Draft/creator/source key 하나의 read-error도 workspace를 버리는 이유가 될 수 없다. 해당 기능의 오류 상태와 저장 authority를 분리하고 그 저장소를 사용하는 경로를 차단한다. workspace/journal/base가 확인되지 않으면 배경 writer·handoff·Undo·reset까지 잠근다. storage API를 다시 얻었다고 임시 메모리 내용을 실제 저장본 위에 자동 복사하지 않는다.

읽기 packet은 origin(`seed`, `legacy`, `checkpoint`, `volatile`, `blocked`), raw 각각의 검증 상태, 활성 checkpoint, `expectedCheckpointRaw`, `expectedLegacyRaw`, 복구 상태를 구분한다. `null`과 `read-error`를 같은 값으로 표현하지 않는다. 성공 mutation 수, 마지막 durable commit, 현재 로컬 runtime의 영수증 수는 별개다.

오류 화면은 기존 상태 영역에 원인과 ‘다시 확인’을 둔다. 확인 버튼은 재읽기만 수행한다. unknown/foreign에서 ‘초기화하고 계속’을 기본 복구 버튼으로 제시하지 않는다. 자동 재확인으로 데이터가 달라졌다면 열린 편집 ticket은 폐기하고 사용자가 다시 선택하게 한다.

## 4. TimelineOrder와 legacy 재적용

R1 `selectTimelineGroups`는 현재 tasks와 명시적 localToday를 읽는다. 현재 task 입력은 `excluded = M.isTrashedTask(currentState, task) || task.timelinePolicy === 'excluded'`, `sourceOrder = currentState.tasks의 index`로 정규화한다. R2 `projectLegacyTimeline`에는 이 **현재 tasks를 명시적으로** 주고, `state` 자리에는 frozen legacySnapshot을 준다. 구 snapshot의 membership 검증은 기존 M.validate·고정 M.TODAY와 old trash-only 규칙을 유지한다. 구 view가 무시하던 timelinePolicy를 옛 검증에 소급하지 않는다.

R2에 새 metadata가 달린 active state나 canonical records를 억지로 넘기지 않는다. 새 checkpoint adapter가 **그룹별**로 두 읽기 결과를 선택한다. R1 현재 목록, R2 구 원본, 새 canonical record는 서로 다른 입력이다.

| context 상태 | 표시 | 쓰기 의미 |
| --- | --- | --- |
| canonical record 존재 | R1이 현재 ref에 투영한 직접 정렬 | 해당 context는 resolvedContexts에도 있어야 함 |
| record 없음 + resolvedContexts 존재 | R1 기본 시간순 | reset 뒤 archived 순서를 다시 적용하지 않음 |
| 둘 다 없음 + legacy 유일/일치 후보 | R2의 lossless 읽기 순서 | 읽기만으로 canonical record 생성하지 않음 |
| 둘 다 없음 + legacy 충돌/부분 미해결 | 기본 시간순 임시 표시 + 해당 context 변경 차단 | 무근거 today 우선·updatedAt 추정·부분 합치기 없음 |
| 둘 다 없음 + legacy 후보 없음 | R1 기본 시간순 | 사용자가 실제 reorder하면 새 record 생성 |

날짜별 canonical record에서 현재 그룹에 없는 ref는 읽기에서만 제외하고 새 ref는 기본 순서로 덧붙인다. 기록에 오래된 ref가 남는 것은 곧 손상이 아니다. 다만 **새 reorder 입력**은 현재 group의 완전하고 중복 없는 ref 집합, scope ownership, 시작 revision/localToday/context ticket을 검증한다. 이전 action이 남긴 ref와 외부에서 주입된 미지원 ref를 같은 writer 허용 조건으로 취급하지 않는다.

첫 명시적 reorder는 record와 resolvedContexts를 같은 state에 기록한다. 같은 결과이면 no-op이다. ‘시간순으로 되돌리기’는 해당 record만 제거하고 resolvedContexts는 남긴다. legacy-unambiguous 상태에서 첫 reset은 명시적으로 그 context를 resolved로 만들고 원본 archive는 보존한다. 충돌/미해결 context의 reset은 이번 계약에서 차단한다. 다른 날짜·미정·지난 미완료·Flow/폴더 순서는 바꾸지 않는다.

reset을 별도 sidecar로 쓰거나 resolvedContexts를 Undo 밖에 두면 Undo 후 보이는 순서가 원래와 달라진다. 두 필드는 항상 같은 state snapshot의 소유다. 완료·날짜 이동·추가·휴지통은 원본 배열을 정리하지 않으며, 호환 판정이 어려워진 해당 context만 명시적으로 미해결 상태가 될 수 있다.

## 5. 첫 checkpoint와 단일 Undo

`P(S)`를 legacy state S의 무저장 투영, `A`를 유효한 새 action으로 정의한다. 기존 envelope가 `{state:S0, undo:U0}`이면 초기 메모리 packet은 `{state:P(S0), undo:P(U0)}`이고 U0가 null이면 undo도 null이다.

| 사용자의 명시적 행동 | 새 key에 저장할 내용 | 구 key |
| --- | --- | --- |
| 첫 일반 변경 | `state=A(P(S0)), undo=P(S0)` | 그대로 |
| 첫 변경을 Undo | `state=P(S0), undo=null` | 그대로 |
| 새 변경 없이 legacy Undo부터 실행 | U0가 있을 때 `state=P(U0), undo=null` | 그대로 |
| Undo 없음/같은 위치/취소/무효 action | checkpoint 생성 없음 | 그대로 |
| 다음 변경 | 현재 새 state를 단일 undo로 교체 | 그대로 |

기존 U0는 첫 새 변경 후 현재 Undo lane에서는 정상적으로 밀려나지만 `legacyBaseRaw` 안에 원본 그대로 남는다. 다단계 Undo 제품 기능을 추가하지 않는다. Undo 후에도 새 key를 삭제하거나 구 reader로 전환하지 않는다. 그러면 과거 Undo나 구 데이터가 다시 살아날 수 있기 때문이다.

후속 원본 대조에서 `permanently-delete-from-trash`는 active 제거·Undo=null만으로 충족할 수 없음을 확인했다. 개인 payload까지 제거한다는 기존 D1 의미가 있기 때문이다. C1의 일반 transition은 현재 이 action만 `legacy-retention-conflict`로 차단한다. 사용자용 HTML에는 아직 v2를 연결하지 않았으므로 기존 조작 기능이 줄어든 것은 아니다. [명시 영구 삭제 전용 설계](./k2b-permanent-delete-design.md)에서 대상 owner만 old/new/source candidate에서 제거하고 baseline을 재결합하는 기술 예외를 검증한다. 기존 Undo=null은 이 전용 경로의 최종 state 의미로 유지한다. 일반 변경에서 archive를 자동 삭제하거나 운영 writer를 호출하는 정책은 만들지 않는다.

기존 Undo의 updatedAt 처리처럼 승인된 도메인 필드 변화는 따로 기록하되, 원문·sourceChecked·개인 완료·occurrence·폴더·날짜·순서 metadata의 복원값을 비교한다. ‘exact Undo’가 workspace raw 전체를 과거 raw와 같게 만드는 뜻인지, 기존 timestamp 의미를 제외한 state 복원인지 시험 assertion에 명시한다. 실패/no-op은 직전 checkpoint raw와 Undo를 모두 유지한다.

## 6. writer와 K1-B 복구 쌍

새 일반 workspace writer는 `expectedCheckpointRaw`와 `legacyBaseRaw`를 저장 직전 각각 exact 비교한다. 처음 새 key가 없었으면 expectedCheckpointRaw는 null이다. 다른 탭이 만든 새 checkpoint나 구 key drift를 덮어쓰지 않는다. 날짜/순서/Undo를 별도 key에 순차 저장하지 않는다.

쓰기 결과는 `committed`, `no-op`, `stale`, `failed-restored`, `recovery-required`, `commit-uncertain`를 구별한다. setItem throw-after와 readback mismatch에서 무조건 before를 덮어쓰는 기존 단순 catch를 복사하지 않는다. 현재 값이 자기 before/candidate라는 소유권을 확인한 경우에만 복원하고 readback까지 검증한다. foreign/read-error이면 보존하고 잠근다. localStorage는 원자적 CAS가 아니므로 이 검사는 동기 구간 exact guard 및 **감지한** drift 보존이며 모든 탭 사이의 원자적 트랜잭션 보장이 아니다.

Plan/Quick은 [K1-B 모델 QA](./k1b-model-qa.md)의 prepared→target→confirmed 의미를 유지한다. factory에는 임의 key 문자열이나 storage key remap을 받지 않고 아래 **두 이름 붙은 고정 쌍만** 허용한다.

| 고정 쌍 | target | journal | decoder |
| --- | --- | --- | --- |
| `legacy-v1` | `flow:poc:personal-workspace:v1:standalone-integrated` | `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v1` | 기존 v1 envelope 및 기존 journal shape |
| `checkpoint-v2` | `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2` | `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2` | 새 checkpoint 및 해당 target을 명시한 journal shape |

두 번째 journal key의 `v2`는 target 쌍의 식별자다. journal 레코드 자체의 phase 계약 버전을 workspace 버전 때문에 함께 올릴 필요는 없다. C2는 factory pair별 exact targetKey와 허용 field 검증을 명시하고, v1 decoder/API의 기존 회귀를 그대로 유지해야 한다. 문자열 치환으로 old targetKey를 기록하면서 실제로 새 key를 쓰면 안 된다.

1. 새 checkpoint를 만들기 전에 기존 journal을 검사한다. 구 prepared는 명시 복구, 구 confirmed는 명시 cleanup을 먼저 마친다. 이 **기존 복구 action만** 구 target 쓰기의 예외다. old target 복구 후의 raw로 새 baseline을 잡는다.
2. 새 key가 이미 있거나 두 journal이 동시에 남은 경우, 한쪽을 최신으로 추측해 자동 복구/전환하지 않는다. 각각 보존·잠금한다. 기존 복구를 명시적으로 진행해도 새 checkpoint의 legacyBaseRaw가 달라졌다면 drift 잠금은 별도로 남는다.
3. 새 Plan/Quick은 initial target CAS/no-op과 old base guard를 journal 생성 전에 확인한다. prepared 쓰기/target 쓰기/confirmed 전환의 경계에서도 이 attempt 소유권과 base를 재확인한다. 준비 후 drift이면 target 쓰기 0일 수 있어도 journal 호출까지 0이라고 보고하지 않는다.
4. prepared+target candidate가 남은 reload는 마지막 성공으로 열지 않는다. 명시적 이전 상태 복구만 before로 돌리고, 새 sessionId로 원래 draft를 다시 열어 명시 저장을 기다린다.
5. confirmed+exact candidate는 durable commit이다. cleanup 실패는 ‘저장 완료·정리 확인 필요’이며 target을 rollback하지 않는다. startup의 confirmed도 자동 삭제 없이 명시 cleanup gate를 거친다.
6. `legacyBaseRaw` drift는 새 key recovery의 소유권을 대신하지 않는다. 자기 새 target을 명시적으로 before로 복구할 수 있더라도 old drift가 해결된 것으로 간주하거나 자동 rebase하지 않는다.

일반 workspace writer의 reload 불확실성은 C2에서 별도로 증명해야 한다. Plan/Quick journal만 연결해 다른 writer의 partial 상태까지 안전해졌다고 주장하지 않는다. 필요한 경우 새 target의 기존 고정 journal 쌍 안에서 명시 action 종류를 한정해 설계를 보완하되, 근거 없이 범용 저장 프레임워크나 세 번째 journal key를 추가하지 않는다.

## 7. handoff와 reset의 별도 gate

### 7.1 명시적 authoring handoff

기존 `M.writeAuthoringCommit`은 구 workspace set/readback과 작성 draft remove/readback을 수행한다. 새 workspace로 전환한 뒤 이 함수를 그대로 호출하면 구 key를 바꾼다. 따라서 C3 전에 새 checkpoint target + 기존 `flow:poc:personal-workspace:v1:standalone-integrated:draft`를 다루는 scoped adapter가 필요하다.

- 원문/creator/source store 버전은 그대로다. 최종 개인 저장만 새 checkpoint를 만든다. 기존 A0 명시 저장, sourceChecked와 execution 완료 분리를 유지한다.
- workspace before, draft before, old baseline을 읽고 검증한다. target 저장·확인 전 draft를 지우지 않는다. 모든 성공/실패/중복 handoff 경로가 같은 활성 workspace를 사용한다.
- 실패는 두 key의 exact before를 소유권 확인 후 복원·검증한다. foreign 값은 덮어쓰지 않는다. 복원 불확실성은 잠금으로 남긴다. draft 지우기 실패를 성공 receipt로 덮지 않는다.
- 현재 helper의 동기 catch+rollback은 **crash-atomic transaction이 아니다**. target만 저장된 중간 reload, draft 제거 뒤 receipt 이전 reload, duplicate handoffId 재요청을 검사한다. 부분 상태를 재요청 성공으로 감추거나 중복 Flow를 만들면 C3 gate FAIL이다.
- Plan/Quick journal을 임의로 다중-key handoff journal로 재사용하지 않는다. 기존 두-key 계약과 같은 수준을 입증하지 못하면 이 호출면만 작은 C2-H 보완 gate로 남기고 app 전체 writer 전환을 보류한다. 검증하지 않은 crash 복구를 완료한 것으로 보고하지 않는다.

### 7.2 정확한 초기화 예외

일반 읽기/저장/Undo에서 old key는 read-only다. 기존 사용자가 명시적으로 실행하는 ‘PoC 전체 초기화’는 별도 파괴적 action이므로 아래 workspace 대상 목록을 함께 처리하는 예외로 정의한다. **이 문서 작업에서는 초기화를 실행하지 않는다.**

| 초기화 대상 key | 처리 |
| --- | --- |
| `flow:poc:personal-workspace:v1:standalone-integrated` | 기존 PoC 초기화의 old workspace 제거 예외 |
| `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2` | 새 checkpoint 제거 |
| `flow:poc:personal-workspace:v1:standalone-integrated:draft` | 기존 authoring draft 제거 |
| `flow:poc:personal-workspace:v1:creator-drafts` | 기존 creator library 제거 |
| `flow:poc:personal-workspace:v1:source-candidates` | 기존 source candidate 제거 |

두 journal은 이 일괄 삭제 목록에 넣지 않는다. 먼저 둘 모두 부재임을 확인해야 reset할 수 있다. prepared/confirmed/unknown/read-error를 reset으로 지우지 않는다. confirmed는 명시 cleanup을 완료한 뒤 별도 reset을 요청해야 한다. 기존 app에 이미 승인된 다른 정확한 PoC sidecar 초기화가 있다면 그 목록은 C3에서 별도로 재조사·회귀하고, 이 표를 근거로 범위를 넓히거나 빠뜨리지 않는다.

새 checkpoint만 삭제하고 구 key를 남기면 reload에서 구 상태가 다시 나타난다. 따라서 전체 초기화는 위 old/new 두 workspace를 함께 다룬다는 의미와 실패 복구를 검증해야 한다. 중간 삭제 오류/외부 drift에서는 exact before 소유권과 각 key readback을 확인하고, 복구가 불확실하면 정상 seed로 열지 않는다. `localStorage.clear()`, prefix 밖 쓰기, root-wide 임의 삭제는 계속 금지다. 저수준 remove 호출 수와 사용자 성공 mutation 수를 구분한다.

## 8. C1/C2/C3의 실행 단위

| gate | 독립 구현·설계 범위 | 열리는 다음 단계 |
| --- | --- | --- |
| **C1 — 순수 packet/lossless adapter** | raw decode, legacy current/undo 투영, strict guard, metadata 선택/transition/Undo, serialization 크기 비교. storage/DOM 접근 없음 | 새 모델 fixture PASS 후 C2. R1/R2와 병렬 가능 |
| **C2 — writer/journal** | fixed 두 쌍, exact base/target guards, verified rollback, prepared/confirmed/reload, scoped handoff 실패 설계. C2-H가 필요하면 따로 마감 | storage fault matrix와 기존 K1-B 회귀 후 C3 |
| **C3 — app 전체 호출면 전환** | boot/read-error, load/preflight, 일반 transition/write, Plan/Quick, Undo, handoff, reset, 결과 rank와 상태 표시를 활성 adapter로 일괄 연결 | 혼합 권위 0을 검증한 뒤 K2B-U 기간 UI 연결 |

이 표는 이전 문서 S1/S2를 더 작게 나눈 실행 gate다. C1/C2 모듈을 추가해도 기존 app이 이를 사용하기 전까지 사용자 저장 권위는 바뀌지 않는다. C3는 일부 화면만 먼저 v2를 쓰게 하지 않는다. `M` 전역 상수나 shared VERSION을 덮어쓰는 방식은 금지한다. app에는 legacy domain 모델과 active workspace adapter를 명시적으로 구분한다.

C1 구현 범위는 `validateCheckpoint`, `fromLegacy`, `projectGroups`, `transitionCheckpoint`, `undoCheckpoint`의 순수 packet이다. 상세 인자와 반환형은 C1 담당자의 시험 계약으로 고정한다. persistence는 포함하지 않는다. C2가 raw를 읽어 C1에 전달하고, C3가 그 결과를 UI에 적용한다. snapshot과 원문이 포함된 raw를 console/error 메시지에 통째 출력하지 않는다.

### 8.1 계획한 fixture/test matrix

아래 ID는 **예정 검증 항목**이다. 이 문서에서 테스트를 등록하거나 실행한 개수로 세지 않는다.

| ID | fixture/주입 경계 | 통과 조건 |
| --- | --- | --- |
| C01 | old/new 없음 | seed read0write, null baseline, 첫 no-op0 |
| C02 | 유효 old state + 별도 old undo | 각각 snapshot/membership 보존, old raw exact |
| C03 | source 값·개인 완료·회차·휴지통·receipt 포함 | 기존 값 lossless, 새 운영 owner0 |
| C04 | v1 일반 unknown/중첩 unknown/reserved 충돌 | 일반 unknown clone 보존, reserved 충돌만 차단, 새 metadata unknown strict |
| C05 | new envelope/metadata unknown/malformed | old/seed fallback0, no implicit default |
| C06 | snapshot 변조·중첩·다른 baseline | 차단, 원본 입력 불변 |
| C07 | 유효 old view orders + 날짜 이동/추가/완료/휴지통/Plan | archived 배열 exact, active Flow/folder 동작 유지, 일반 unknown 값 보존 |
| C08 | legacy 한 후보/일치/충돌/부분 | R2 판정 보존, 무근거 우선순위0 |
| C09 | canonical reorder→세 기간→reset | 같은 date 일치, resolved 유지, legacy 재등장0 |
| C10 | reset→Undo→reload | record와 suppression 한 state로 복원 |
| C11 | 첫 mutation→Undo, legacy Undo 먼저 | §5의 single-Undo 결과, old write0 |
| C12 | 같은 제목/다른 copy/Quick/removed refs/기간 제외 | identity 충돌0, active exclude와 old membership 분리, sourceOrder 안정 |
| C13 | state0→action을 여러 번 반복/큰 원문 | snapshot 중첩0, 구조적 크기 증가 기록, 원문 축약0 |
| C14 | old/new getItem 각각 throw | API unavailable과 specific-key error 분리, memory 우회0 |
| C15 | old exact byte drift/새 target 생성/drift | initial stale target/journal0write, 자동 merge0 |
| C16 | new unknown/read-error + 유효 old | new 권위 차단, fallback0 |
| C17 | 첫 save Quota/throw-after/readback/rollback 오류 | before UI/Undo/bytes 유지 또는 recovery gate |
| C18 | fixed pair 별 target/journal foreign/unknown | remap0, pair 밖 write0, 기존 v1 회귀 유지 |
| C19 | old prepared/confirmed→명시 복구/cleanup→첫 v2 | 복구 선행, 새 baseline은 복구 후 raw, 자동 전환0 |
| C20 | 양 journal 동시 존재/new 존재+old journal | 모두 보존, 최신 추정0, 일반 writer0 |
| C21 | new prepared/confirmed 각 crash/reload 경계 | candidate 성공 오인0, explicit recovery/cleanup, 중복 commit0 |
| C22 | general writer 및 Undo 실패 후 reload | 마지막 성공 또는 명시 불확실 상태, Plan journal로 과장하지 않음 |
| C23 | handoff target/draft 제거/rollback 각 실패 | 2-key before 보존 또는 lock, old write0, 성공 toast 누출0 |
| C24 | handoff 중간 reload/duplicate handoffId | 중복 Flow0, 미검증 부분 성공0 |
| C25 | reset old/new/draft 등 각 단계 실패 | 정확 대상만 처리, rollback proof, 구 데이터 부활0 |
| C26 | reset 중 pending/confirmed/read-error journal | journal/target remove0, gate 우회0 |
| C27 | source/creator 기능과 결과 projection | 버전/key 유지, projection을 원문 writer로 연결하지 않음 |
| C28 | 전체 caller inventory + old HTML 후속 변경 | new bytes 보존, next read/write drift lock, 운영 sentinel exact |

후속 실제 브라우저는 첫 저장·Undo·reload, legacy 충돌, 특정 key read-error, 복구/cleanup, handoff·reset을 먼저 다룬다. UI를 연결할 때마다 390×844, 375×812, 844×390, 1024×768, 1440×900에서 오류·재시도·취소·핵심 이동이 가리지 않는지도 동반 검사한다. C gate의 메모리 fixture가 실제 localStorage 브라우저·실제 Android/iOS·관찰 사용자 검증을 대신하지 않는다.

## 9. 평가·남은 gate·이번 작업 결과

새 key 자체는 과도한 기능 확장이 아니라 old-client overwrite 경계를 지키기 위한 선택이다. 다만 기존 writer 교차점이 많으므로 C1/C2/C3로 분리해야 한다. 가장 작은 안전한 중간 산출물은 **아직 active app에 연결하지 않은 pure packet/fixture**이며, 구 orders를 먼저 normalize하는 임시 구현은 아니다.

이 계약에서 확인한 기술 위험은 snapshot 중첩·용량, v1 unknown field, 첫 Undo 의미, specific-key read-error의 memory 우회, hardcoded writer/journal target, 2-key handoff의 crash 경계, 새 key만 초기화할 때의 구 상태 부활이다. 해결되지 않은 C2-H나 일반 writer reload 경계를 PASS로 미리 바꾸지 않는다. 날짜 anchor/새 inclusion owner/동시 편집 merge 등 새로운 제품 정책은 이번 저장 계약에서 확정하지 않았다.

이번 작업은 현재 코드/정본/기존 QA를 읽고 R1/R2 새 모듈의 읽기 계약을 대조한 문서 작업이다. C01–C28 새 시험, 제품 build, 새 브라우저 검사는 **미실행**이다. 다른 담당자의 R1/R2 테스트 수와 기존 K1-B 74개를 이번 문서의 실행 수로 합산하지 않는다.

- 제품/기존 문서/테스트/사용자 저장소 변경: 0. 신규 계약 문서 1개.
- 문서 검사: `npm.cmd run docs:check` PASS(필수 파일 16개, 로컬 링크 4,908개). 저장한 본문을 다시 읽었고 신규 파일 no-index 공백 검사에서 공백 오류는 없었다(LF→CRLF 안내만 출력).
- 실제 Android Chrome·iOS Safari: NOT_RUN. 관찰 사용자: 0명.
- commit·push·PR·Preview·Production: 미실행.
