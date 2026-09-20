# K2-B 저장 전략 독립 검토

2026-09-05. 상태: **코드 검토·메모리 probe 완료 / 구현하지 않음**. 소유 파일은 이 문서 하나다. 제품, 기존 설계, 테스트, 저장 payload와 생성 HTML은 수정하지 않았다.

검토 대상은 [K2-B 설계 §5](./k2b-design.md)의 저장 전략이다. 기준은 기존 view별 `orders` 배열의 exact 보존, 순수 clock/date selector, 날짜별 TimelineOrder와 기존 단일 workspace Undo의 일관성이다. [K1-B 복구 보완 계약](./k1b-recovery-addendum.md)과 이미 동결된 journal의 안전성을 낮추지 않는다.

## 1. 결론

**새 key가 필요 없다고 단정할 근거는 없다. 다만 새 checkpoint를 기간 UI와 한 묶음으로 즉시 도입하는 것은 K2-B의 첫 구현 단위로 너무 크다.** 다음 작업은 clock/date selector와 구 배열의 읽기 전용 호환을 먼저 분리하고, 저장은 독립 gate에서 결정하는 편이 안전하다.

같은 v1 envelope의 **state 안에 versioned 필드**를 두는 안은 기술적으로 가능하다. 현재 구 모델은 알 수 없는 state 필드를 대체로 보존한다. 그러나 기존 `orders`를 exact 보존하면서 날짜 이동·새 항목·휴지통 등으로 그 목록의 membership을 바꾸면 구 검증기가 `invalid-order`로 거절한다. 구 HTML이 seed fallback 뒤 새 값을 저장하면 확장 필드까지 덮일 수 있다. 이 위험은 아래 메모리 probe에서 확인했다. **구 client 위험을 문서에 적는 것만으로 비파괴 호환이 완성되지는 않는다.**

권고는 다음과 같다.

1. 지금은 **K2B-R 읽기 모델**과 **K2B-C 저장 계약 gate**를 따로 진행한다. 새 key·버전·영구 migration 없이 시작할 수 있다.
2. ‘구 HTML의 후속 쓰기로도 새 날짜 순서를 잃지 않음’까지 지켜야 한다면 **별도 workspace checkpoint key**를 선택한다. 날짜 순서만 sidecar에 두지 않는다.
3. 같은 key를 선택하려면 구 client 동시/재사용을 지원하지 않는 제한 또는 membership 변경 차단을 명시해야 한다. 이것은 새 key와 동등한 안전성이 있는 축약안이 아니다. 주 작업자가 허용 범위를 확정하기 전에는 기본 선택으로 만들지 않는다.

§5.3의 새 key 권고는 보호 목적상 타당하지만, ‘이 방식부터 기간 기능 전체를 구현’보다는 **독립 저장 어댑터의 범위와 종료 조건부터 증명**하도록 순서를 줄이는 것이 맞다.

## 2. 먼저 바로잡을 기술적 전제

| 쟁점 | 현재 코드 확인 | 판단 |
|---|---|---|
| 구 HTML은 새 state 필드를 항상 지우는가? | `model.js:117 clone`, `1872 apply`는 전체 state를 JSON 복사한다 | **항상 지우지 않는다.** 같은 v1 state 내부 확장은 보통 유지됨 |
| envelope 최상위에 필드를 더하면 안전한가? | `transitionEnvelope` 2158 부근은 `{version,state,undo}`를 새로 만들고 `undoEnvelope`도 같은 형태를 반환 | 최상위 임의 metadata는 유실 가능. ‘state 내부’와 구별해야 함 |
| 구 `orders`는 검증 때 현재 membership에 묶이는가? | `validate` 1847–1850은 각 view의 현재 전체 ids와 길이·중복·집합 일치를 검사 | 날짜가 바뀌었는데 배열만 보존하면 기존 decoder가 거절할 수 있음 |
| 무관한 action이 구 정렬을 바꾸는가? | `apply` 2145–2149는 모든 성공 action에서 모든 `orders`를 현재 집합으로 prune/add | 새 selector만 넣고 이 루프를 두면 old 배열 exact 보존 계약을 지키지 못함 |
| 같은 key의 envelope version만 올리면 구 reader가 쓰기를 멈추는가? | `loadEnvelope` 2178–2186은 unknown/corrupt에서 seed envelope와 status를 반환. 일반 `writeCandidate`는 seed 후속 쓰기를 막는 version guard가 아님 | version mismatch 자체는 구 client의 overwrite 방지 장치가 아님 |
| 새 key는 기존 통합에 국소적인가? | 일반 load/write/Undo 외에 `writeAuthoringCommit` 2208 부근, app의 Plan baseline·journal decoder·reset이 기존 key에 결합 | 단순 상수 변경이 아님. K1-B·handoff·Undo를 포함한 adapter gate 필요 |

행 번호는 조사 시점 기준이다. standalone 파일은 `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/` 아래다. 검토 모델의 SHA-256은 `AC04964BD00D6859148907445F9AF74508EACED4F1709D4E72794A11A0E30905`이며 K1-B 시작 전 보관 모델과 같았다. 따라서 이번 probe는 K2-B 변경 전 모델을 대상으로 한다. 모든 과거 HTML 배포본을 실행했다는 뜻은 아니다.

## 3. 실제 무저장 probe

현재 CommonJS 모델을 사용해 **Node 명령 1회에서 관찰 항목 5개**를 확인했다. 별도 test 파일은 만들지 않았고 등록된 자동 테스트 5건으로 세지 않는다. 실제 localStorage·브라우저·filesystem payload에는 쓰지 않았다. P3/P5의 `setItem` 1회는 `M.createMemoryStorage`의 메모리 Map에서만 실행했다.

fixture는 현재 seed에 유효한 `orders.today` 역순과 실험용 `state.timelineOrderProbe`를 추가한 객체다. 원래 today ids는 `meeting, memo-share, washer-filter, checklist`, 수동 배열은 그 역순이다. 원본 객체/bytes는 probe 전후 같았다.

| probe | 입력과 조작 | 실제 출력 |
|---|---|---|
| P1 unknown 필드 보존 | 유효 v1 state의 새 필드 + envelope 최상위 필드, 기존 완료 transition | `validate=[]`, state 확장 필드 보존 `true`, Undo의 확장 필드 보존 `true`, envelope 최상위 필드 보존 `false` |
| P2 구 prune | 같은 fixture에서 `meeting`을 `2026-10-01`로 schedule | action 성공. old today 배열은 `[checklist, washer-filter, memo-share, meeting]`에서 `[checklist, washer-filter, memo-share]`로 변경. state 확장 필드는 유지 |
| P3 배열 exact 보존과 old decoder | P2 결과에 old `orders.today`만 exact 원복하여 새 저장 계약을 흉내 냄 | 기존 검증은 `invalid-order`, old load는 `corrupt`. 반환된 seed에 `add-quick` 후 메모리 writer 실행 가능, 저장 결과의 확장 필드는 없음 |
| P4 같은 key/version2 | 유효 fixture의 envelope version만 2로 변경하여 old load | `corrupt` |
| P5 별도 key 격리 | 같은 메모리 저장소에 가상의 새 checkpoint sentinel을 두고 P3의 old-key writer 실행 | old-key set 1회만 발생. 새 checkpoint sentinel과 운영 sentinel은 그대로 |

P3은 **기존 모델의 fallback+writer 조합이 가능한지** 확인한 모델 증거다. 구 HTML의 실제 버튼을 눌러 재현한 브라우저 증거로 쓰면 안 된다. P5 역시 새 checkpoint adapter가 구현·검증됐다는 뜻이 아니라 저장 key가 다를 때 old-key writer가 새 key를 직접 덮지 않는다는 제한된 확인이다.

## 4. 같은 v1 안의 최소 확장안

가능한 형태는 기존 envelope `{version:1,state,undo}`를 유지하고 state 내부에 PoC 전용 필드를 두는 것이다. 이름은 예시이며 아직 승인된 schema가 아니다.

```text
state.timelineOrders = {
  contractVersion: 1,
  records: date / undated / overdue 별 순서,
  legacy: 원본 배열의 membership·anchor 근거,
  resolvedContexts: legacy 재적용을 종료한 context
}
```

구 필드가 없으면 legacy reader, 알려진 contractVersion이면 새 reader, unknown/손상이면 fail-closed로 구분한다. 기존 배열을 묵시적으로 새 날짜 순서로 변환하거나 삭제하지 않는다. 새 ref는 읽기 결과에만 기본 순서로 추가한다. 해당 날짜 reset은 canonical record만 제거하되 `resolvedContexts` 의미는 남겨 구 수동 순서가 다시 살아나지 않게 한다. state 전체가 기존 Undo snapshot에 들어가므로 새 순서와 Undo를 한 envelope로 관리할 수 있다.

이 안의 이점은 명확하다.

- target key, Plan/Quick K1-B journal target, handoff의 workspace key를 바꾸지 않는다.
- 기존 state clone/Undo는 추가 필드를 보존하는 구조다.
- shared `VERSION`을 올려 작성 초안·creator/source 계약까지 바꾸지 않아도 된다.

하지만 다음 한계도 남는다.

| 조건 | 같은 v1 확장안의 상태 |
|---|---|
| 구 배열이 없거나 membership이 그대로인 새 정렬만 저장 | old decoder가 v1을 받아들일 수 있고 추가 state 필드도 남을 수 있음 |
| old `orders` exact 보존 + 날짜 이동/새 항목/휴지통으로 membership 변경 | old decoder가 invalid-order로 seed fallback할 수 있음 |
| 구 HTML이 자기 정렬 UI로 이후 쓰기 | old `orders`를 다시 고치므로 새 metadata와 구 배열의 관계가 달라질 수 있음. 최신 의도를 timestamp로 추정할 수 없음 |
| 구 HTML이 reset 수행 | 같은 key의 새 데이터도 없어짐. 구 client 동작을 새 client 코드로 차단할 수 없음 |
| 새 reader가 baseline fingerprint만 검사 | 변화 감지는 가능하지만 같은 key가 이미 덮인 뒤 원래 새 데이터를 복원하는 독립 사본은 없음 |

원본 배열을 별도 archive로 보존하면서 `state.orders`는 old client용으로 계속 normalize하는 변형도 있다. 그러나 ‘기존 배열을 그대로 유지’에서 ‘archive는 보존하되 활성 필드는 다시 작성’으로 계약이 달라진다. K2-B에서 이를 몰래 같은 의미로 취급하지 않는다.

따라서 **lossless versioned reader만으로는 충분하지 않다.** 안전하게 축소하려면 old client 미지원 범위를 명시하거나, 호환을 증명하지 못한 membership 변경을 차단해야 한다. 새 key 도입 없이도 같은 날짜 순서만 구현할 수 있지만 전체 이동/완료/추가/Undo 흐름을 포함한 K2-B의 완료 대안은 아니다.

## 5. 새 key의 최소 구현 범위

새 key 선택은 ‘정렬 sidecar’가 아니라 **현재 workspace state + 날짜 순서 + 기존 단일 Undo**를 함께 담는 checkpoint여야 한다. 구 workspace key는 읽기 전용 원본으로 남긴다. 예시 suffix `:workspace-v2`는 기존 설계의 제안이며 이 문서에서 확정하지 않는다.

기본 안전 조건은 다음과 같다.

- 새 checkpoint가 없을 때만 검증된 v1을 read-only로 연다. 첫 명시 성공 변경 전에는 새 key를 쓰지 않는다.
- 새 checkpoint가 있으면 그것을 권위로 읽는다. 손상/unknown/read failure에서 old key나 seed로 자동 후퇴하지 않는다.
- old key의 **exact baseline bytes**를 보존·비교한다. fingerprint는 빠른 비교 보조이며 exact-byte 증거의 대체물이 아니다. old key drift가 발견되면 자동 merge/최신 추정을 하지 않고 두 저장본을 남긴 채 새 쓰기를 차단한다.
- 첫 변경의 Undo도 새 checkpoint 안에서 old state와 순서를 복원한다. Undo 때문에 old key를 다시 쓰거나 별도 순서 Undo lane을 만들지 않는다.
- 보존할 view 배열과 그 시점의 membership/anchor를 새 decoder가 검증한다. 현재 task 날짜 집합이 바뀌었다는 이유로 원본 배열을 corrupt로 판정하거나 정리하지 않는다.

### 5.1 필요한 호출면

아래는 새 target 선택 시 피할 수 없는 최소 영향이다. 계정/cloud/운영 migration이나 범용 저장 프레임워크로 확대할 필요는 없다.

| 호출면 | 현재 결합 | 최소 조치 |
|---|---|---|
| Workspace load/preflight | `M.loadEnvelope`, app startup, `editorExpectedRaw`와 읽기 검증 | 하나의 workspace adapter가 old/new 선택·unknown 차단·old baseline guard를 소유 |
| 일반 transition/write | `M.apply`의 old validator/prune, `M.writeEnvelope`의 hardcoded key | 새 날짜 order와 보존 legacy를 아는 순수 transition/decoder 분기. caller별로 prune 우회를 흩뿌리지 않음 |
| Undo | `M.undoEnvelope`가 v1 envelope 재구성 | 선택한 checkpoint 안에서 state+순서 metadata+undo를 일관되게 복원 |
| K1-B Plan/Quick journal | `plan-item-session.js`는 target literal과 journal `targetKey`를 exact 검사 | **명시적 버전/대상 adapter** 필요. 기존 v1 journal decode·recovery를 유지하고, pending이 있으면 신규 checkpoint 작성 전에 기존 복구를 먼저 처리 |
| Authoring handoff | `M.writeAuthoringCommit`는 workspace key 쓰기 + 작성 draft key 제거/rollback | 새 workspace target과 기존 draft 제거를 함께 검사하는 scoped adapter. old target을 건드리지 않고 두 key의 before/rollback 유지 |
| Reset/센티널 감시 | exact key 목록, app dataset/상태 표시 | 새 key 누락/중복 reset 금지. pending/confirmed journal gate를 reset으로 우회하지 않음 |

특히 K1-B에 **storage facade로 old key를 몰래 new key에 재매핑하는 축약**은 쓰지 않는다. journal의 `targetKey`는 old라고 기록하면서 실제 target만 바꾸면 exact ownership 증거가 틀려진다. 허용 target/contract를 명시적으로 고정한 scoped adapter가 필요하다. 무제한 key 문자열을 받는 범용 writer로 바꾸지 않는다.

shared `M.VERSION` 전역 상수를 올리지 않는다. workspace의 새 버전과 authoring draft/creator/source candidate 버전은 분리한다. creator/source 라이브러리의 key나 schema를 새로 만드는 것은 이 선택의 필수 조건이 아니다.

새 reader가 old-client drift를 감지해 잠그더라도 **구 HTML에서도 최신 checkpoint가 보인다**고 약속하지 않는다. old/new 동시 편집을 병합하는 기능은 제외한다. 이 구별을 UI와 QA에 남기는 것은 기술 호환 계약이지 새 제품 UX 정책을 정하는 일이 아니다.

## 6. 안전하게 실행할 소분할

| 작은 단계 | 기획·UX/설계 | 구현 범위 | gate와 종료 기준 |
|---|---|---|---|
| **K2B-R1: 날짜 읽기 모델** | 오늘/지난 미완료/월~일/당월 그룹과 날짜 context를 원본에 맞춤 | 순수 selector, clock 입력 adapter, 구 decoder 분리. active 저장 경로와 새 key 없음 | 같은 localToday의 React/standalone 집합 비교, 경계일/시간대, 입력 객체·storage mutation 0 |
| **K2B-R2: 구 순서 호환 읽기** | 일치·유일 후보·충돌/미해결의 표시와 변경 차단 | old arrays/anchor/membership의 read-only projection. title/updatedAt 기반 추정·archive 재쓰기 없음 | legacy 한 후보/동일 후보/충돌/부분/손상 fixture; reset 뒤 재등장 방지 의미를 순수 모델로 확정 |
| **K2B-C: 저장 선택 단독 gate** | old-client 비파괴 보증을 유지할지 제한할지 명확히 함 | 실제 사용자 데이터가 아닌 fixture로 v1 state 확장안과 새 checkpoint adapter를 대조 | P1–P5 정식 회귀화, unknown/old drift/첫 Undo/K1-B journal/handoff blast radius 확인. 선택 전 기간 write/UI 연결 금지 |
| **K2B-S1: 선택한 workspace adapter** | 버전·권위·실패·복구 범위만 구현 설계 | load/validate/transition/write/Undo + 필요한 K1-B 대상 연결. 하나의 새 workspace target, 별도 order sidecar 없음 | old arrays exact 보존, no-op/cancel0, write/readback/rollback/journal/crash 단계, 기존 74건 회귀. selector 구현과 별도 마감 |
| **K2B-S2: 기존 writer 교차점** | 새 저장 권위에서 개인 편집·handoff·일반 mutation의 일관성 | Plan/Quick, 일반 작업, explicit handoff, reset guard의 선택한 adapter 연결 | handoff draft 제거 실패·reload·첫 checkpoint Undo, old/new 변경 감지, source/완료/key 경계. 이 gate 전에 일부 화면만 새 key를 쓰지 않음 |
| **K2B-U: 기간 UI·공통 이동** | 날짜별 heading, 직접 정렬·해당 날짜 reset, 지난 미완료 구획 | 메뉴/drag/길게 누르기/키보드의 같은 context transition 및 결과 rank 소비 | 5 viewport, 동일 localToday cross-view/reload/Undo, cancel/자정/resize/stale0. 실제 UI와 모델 판정을 분리 |

R1/R2는 저장 선택이 끝나지 않아도 진행할 수 있다. 단, 새로운 기간 UI를 active mutator에 연결해 legacy 배열을 먼저 정리하는 ‘중간 임시 구현’은 피한다. 읽기 전용 설계/fixture 검증이 끝났다는 사실과 기능형 PoC 사용자 조작 완료는 다르게 보고한다.

S1/S2는 별도 목표로 나눌 수 있지만 중간 상태를 사용자 조작용 완성본으로 배포하지 않는다. 기존 route와 선택한 checkpoint의 writer 권위가 혼재하면 저장소 단일성 보장이 무너지기 때문이다. 새 key가 선택되더라도 branch/계정/cloud/양방향 sync나 운영 migration을 추가할 필요는 없다.

## 7. 주 작업자가 확정할 항목

| 판단 항목 | 권고 | 확인이 필요한 이유 |
|---|---|---|
| old HTML 재열기/후속 쓰기로부터 새 날짜 순서 보존 | 기존 보호 수준을 유지한다면 새 checkpoint | 같은-key v1의 membership/fallback 손실 경로가 확인됨 |
| 다음 즉시 목표 | R1+R2의 read-only selector/호환 모델 | 저장 전략을 이유로 기간 gap 조사를 멈추지 않으면서 K1-B를 다시 흔들지 않음 |
| 새 key 범위 | C gate를 먼저 마친 뒤 S1/S2 | K1-B exact journal target과 explicit handoff의 영향이 있어 단순 날짜 UI patch가 아님 |
| 같은 v1 축약안을 택하는 경우 | 지원하지 않는 old-client 경계를 별도로 기록하고 기존 강한 보존 조건을 충족했다고 표시하지 않음 | ‘알려진 위험’과 ‘해결한 요구’를 혼동하지 않기 위함 |

새 제품의 날짜 anchor·포함 owner·UI 정책을 이 검토에서 결정하지 않는다. 이 저장 선택만 주 작업자의 실행 범위 gate로 남긴다. 그 선택이 사용자가 승인한 보호 수준을 낮추어야 성립한다면 사용자 결정 없이 축소하지 않는다.

## 8. 검증과 미실행

- 수행: 정본/설계/현재 모델·writer 코드 확인, 모델 메모리 probe 명령 1회·관찰 5개, 원본 객체 불변 확인, 현재 모델과 K1-B 보관 모델의 SHA-256 일치 확인.
- 제품 코드/기존 문서/테스트 파일/실제 저장소 변경: 0. 메모리 fixture에서만 old-key set 1회로 fallback overwrite 가능성을 확인했다.
- 문서 검사: `npm.cmd run docs:check` PASS(필수 16개, 로컬 링크 4,877개). 신규 문서의 no-index 공백 검사에서 공백 오류는 없었고 LF→CRLF 안내만 출력됐다.
- K2-B 자동 test suite·production build·브라우저·실제 기기: **미실행**. 실제 Android/iOS와 관찰 사용자는 검사하지 않았고 관찰 사용자 0명이다.
- commit/push/PR/Preview/Production: 미실행.

원본 요구 근거는 v4.1 spec §표시 계약과 blueprint §5.4 TimelineOrder다. 날짜 순서는 개인 표시 순서이며 Flow 내부 순서나 폴더 순서를 대체하지 않는다. 이 문서는 저장 안전성 검토이므로 시각 완성도나 요구사항 전체 충족률을 새로 부여하지 않는다.
