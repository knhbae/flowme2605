# K4-D 후속 — typed 일정과 네 날짜 값의 읽기 preview 계약

2026-09-06. **검토용 계약과 메모리 실험**이다. 제품 모듈·편집 UI·저장 schema·writer는 구현하지 않았다. [선행 설계](./k4-field-contract-design.md)를 수정하거나 K4 기능 판정을 승격하지 않는다. 새 파일은 이 문서와 실험 9개 (로컬 전용 근거: `./k4-anchor-preview-simulation.test.ts`)뿐이다.

## 1. 이번에 고정할 범위와 근거

[실행 계획 §11 K4-D](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md#11-k4--필드-계약대체-결정-정리), [개선 설계 §8](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md#8-설계-gate-지금-추정-구현하지-않을-것)이 승인한 선행 작업은 네 날짜 값의 구분, source DTO 조사, 상대 일정의 write 0 preview다. 여기서는 **선택한 개인 사본 한 Flow에 유효한 날짜를 명시 지정하는 경우**만 다룬다. 기준일 해제·reset/inherit, Map 전체 변경, 포함/제외, WorkingSource 정렬, 새 source 도착 정책은 제외한다.

| 요구·결정 | 직접 대조한 근거 | 이번 해석 |
| --- | --- | --- |
| D1-006/023, K-D1-03 | D1 원본 화면 (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html`) 821–841, 892–903: 기준일을 고른 뒤 D-offset의 실제 날짜와 저장 전 요약을 확인 | Calendar 월 이동으로 대신하지 않는다. 원문의 24개·이사일은 예시이며 제품 fixture 사실로 쓰지 않는다. |
| 날짜 의도 보존 | D1 편집 계약 (로컬 전용 근거: `../../../../flow-plan-edit-trash-structure-unification-20260813/docs/specs/2026-08-13-plan-edit-trash-structure-unification/spec.md`) 23–35: 부모 staging, 최종 1거래, fixed pin·미정·원래 날짜의 구별 | 동값 fixed pin을 anchor 계산에서 제거하지 않는다. 이번 실험은 그 저장 API를 새로 만들지 않는다. |
| 개인/원문/실행 소유 | [P3-F 결정](../2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md) 61–74: PersonalOverlay의 날짜, ExecutionRun의 완료·회차, 원본 version/identity 불변 | 개인 anchor를 운영 saved record나 SourceSnapshot에 쓰지 않는다. 기존 실행 배치·완료는 입력 그대로다. |
| v4.1 실행 영역 | v4.1 원본 (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`) 12–21, [선행 설계 §1](./k4-field-contract-design.md#1-범위와-직접-읽은-근거) | 실행 날짜·폴더·목록 순서의 owner를 기준일로 대체하지 않는다. |
| 이번 root 범위 | typed source capability/네 값, 명시 개인 anchor 지정, relative만 재계산, full tuple/관측 ABA 거절 | 새 영구 정책을 정하지 않고 가장 작은 read-preview 구현 gate만 제안한다. |

원본의 `날짜 없이 보기`는 보기 선택까지 포함한 문맥이다. 이를 개인 기준일 영구 해제나 모든 상대 Item의 명시 미정 저장으로 자동 해석하지 않는다.

## 2. 네 값: 날짜 문자열이 같아도 owner는 다르다

| 필드 개념 | 이번 계약의 owner·presence | 변경의 영향 |
| --- | --- | --- |
| `monthCursor` | 메모리 보기. 실제 Result의 `calendar.baseDate` 대응 | 월 grid만 이동. Item 날짜·source/개인 anchor는 불변 |
| `selectedDate` | 메모리 보기. 선택일 부재와 유효 날짜 구별 | 선택한 날짜의 조회만 변경 |
| `sourceAnchor` | 검증된 원문이 명시한 값 또는 `unavailable` | 읽기만. saved record의 개인 anchor를 원문 값으로 올리지 않음 |
| `personalAnchor` | 기존 imported 개인 anchor와 이번 `set` 후보를 별도 층으로 표시 | 지원하는 상대 **계획** 날짜만 재계산. 아직 새 durable field 없음 |

현재 [Result](../../../lib/flow/personal-workspace-poc-result-projection.ts) 520–588, 1057 이후는 저장된 날짜와 Calendar 렌즈를 분리한다. [read-model](../../../lib/flow/personal-workspace-poc-read-model.ts) 1387–1395, 1483–1485는 saved record/Map snapshot anchor를 `existing-personal`로 제공한다. 네 저장 origin의 실험에서도 source anchor는 값 없음이고 개인 anchor만 `2026-09-18`이었다(KAP01). `flow.anchorDate` 하나로 원문/개인을 판정하면 안 된다.

현재 source anchor가 없는 저장 사본이라도 typed `day_offset`와 개인 anchor가 검증되면 상대 일정의 읽기 계산은 가능하다. **source anchor 부재와 source schedule 부재는 다른 것**이다. 반대로 authored 원문에서 상대 일정이 있는데 필수 기준일이 빠진 경우 실제 parser는 `relative-date-requires-anchor`로 차단한다(KAP05). 이를 localToday·선택일로 채우지 않는다.

같은 숫자의 `sourceAnchor`, imported 개인 anchor, 새 명시 개인 anchor는 동등한 저장 의도가 아니다. preview는 `intent: set`을 보존하고, 날짜 차이가 0개라는 이유로 이를 inherit로 정규화하지 않는다. 실제 저장 no-op 규칙은 새 field/draft 계약을 검토할 때 고정한다.

## 3. 실제 source 지원 matrix

공유 계약의 [`ScheduleInput`/`DateDerivation`](../../../lib/flow/personal-workspace-poc-contract.ts) 74–117은 `day-offset / absolute / none / unsupported`와 source/기존 개인/direct override를 구별한다. 하지만 DTO가 존재한다는 사실과 그 DTO의 출처가 검증됐다는 사실은 별개다.

| 입력 경로 | 현재 확인 가능한 자료 | 첫 read-preview gate 제안 | 현재 실험 범위 |
| --- | --- | --- | --- |
| legacy-saved-plan + 실제 bundle | actual saved-record decoder·FlowBundle의 `day_offset`·typed fieldOwnership | actual read-model producer에서 받은 정수 offset과 exact 사본만. origin 이름이 legacy라는 이유만으로 전부 거절하지 않음 | KAP01/05/09. 네 origin 공통 fixture에서 실제 classifier 사용 |
| canonical-personal-copy | source bundle + copy key/source version 관계, 독립 full tuple, imported 개인 anchor | 원문 version/source read exact 결합. 같은 source를 쓴 다른 copy의 anchor는 불변이어야 함 | KAP01/06. 새 개인 anchor 저장은 미실행 |
| personal-draft | 실제 draft bundle·source와 personal structural schedule·override 구분 | source relative부터. 개인 추가 Item에 source schedule을 꾸미지 않음. 개인 structural relative의 별도 소비 범위는 후속 gate | KAP01/02. 직접 imported fixed/미정과 PoC pin/미정 보존 |
| source-backed-map + bundle | 실제 Map snapshot과 child tuple, bundle offset. 저장 anchor는 Map 공유 소유 | 첫 제품 구현은 Map 제외를 권장. 읽기 자료는 표시하되 선택 child 하나의 shadow anchor에 대한 계산·표시 계약을 먼저 검증 | KAP01/04. 공통 anchor 변경 fixture는 두 child 모두 바뀜을 확인 |
| source-backed-map + typed persistence | [reader](../../../lib/flow/personal-workspace-poc-read-model.ts) 197–245의 `calendar.anchor_offset/absolute/none`, saved-map-persistence provenance | 전체 child/step binding 검증 필수. `absolute`인데 날짜가 없는 legacy값을 기준일로 채우지 않음 | 현재 코드를 읽음. 이번 9개에는 persistence variant 재등록/실행 없음 |
| authored handoff, complete raw/line map | 실제 raw·fingerprint·parsedItems·sourceLineItemIdentityMap와 source anchor | actual persisted-source validator와 genuine index 통과, ordinary Item relative부터. 단순 timing label 사용 금지 | KAP03. 실제 materializer/line-map·parser·index |
| C2 effective source, typed map unavailable | base+store를 실제 composer로 검증한 읽기 source. 이번에 검증한 effective update는 typed map이 없음 | 기존 기능·읽기는 유지하지만 해당 입력의 K4 anchor 재계산 capability는 `typed-source-unavailable`. 오래된 base의 parsed attrs를 복사하지 않음 | KAP07. itemMapping=`legacy-unavailable`, context Map 0, 옛 source+새 index 거절 |
| fieldOwnership 없는 additive-v1 DTO | 현재 compatibility helper는 `sourceTimingLabel`의 D표기에서 fallback offset 생성 가능 | 읽기 호환은 보존. 그 fallback만으로 새 anchor preview 계산 capability를 발급하지 않음 | KAP05. 실제 index 성공과 provenance=`legacy-v1-fallback`을 함께 확인 |

특히 [`buildPersonalWorkspacePocSourceReadIndex`](../../../lib/flow/personal-workspace-poc-source-attributes.ts) 298–408은 full identity와 authored lineage를 검증하고 private index를 발급한다. **non-authored fieldOwnership의 모든 값이 actual operating decoder에서 나왔다는 권한 증명까지 제공하지는 않는다.** 미래 preview가 외부 caller의 `canEdit:true`, origin 교체, 임의 fieldOwnership 객체를 받는 API로 시작해서는 안 된다. actual captured read inputs를 기존 `buildPersonalWorkspacePocReadModel`로 재독해한 경로와 authored 검증 경로를 구분해야 한다.

C2의 source Item 추가·삭제 지원 전체를 미지원이라고 판정하지 않는다. 기존 [canonical ownership 시험](../../../lib/flow/personal-workspace-poc-canonical-ownership.test.ts) 202–258은 개인 순서 뒤 새 source Item을 붙이며 overlay를 보존하고, [source candidate 시험](../../../lib/flow/personal-workspace-poc-source-candidates.test.ts) 219–247은 source 삭제 수용 뒤 기존 ref를 retained로 보존한다. 이번에는 그 기존 시험을 재실행하거나 판정을 바꾸지 않았다. K4가 확인할 것은 **새 capture의 현재 typed owner 집합과 일정이 정확히 결합되는가**다. source version/membership 변경을 관측하면 옛 K4 capture만 폐기하며, C2 composition·기록·기존 조작·다음 source Item 처리 규칙은 그대로 유지한다.

### 최소 지원 시작점

root 검토를 위한 권고는 **non-Map saved 사본의 actual typed bundle relative + complete authored ordinary relative**다. 명시 fixed·미정·실행 위치는 모두 읽기 보존한다. source mode가 unsupported이거나 정수가 아닌 offset, absolute date 부재, raw/metadata 불일치, source 없는 개인 추가 relative, 상대 반복 Item은 첫 구현에서 부분 계산하지 않고 이유와 함께 차단한다. 상대 반복은 date 이동 뒤 occurrence identity 및 기존 execution record와의 연결을 추가 검증할 때 확대한다. 이는 현재 반복 실행 기능을 없애는 제안이 아니다.

## 4. 검토용 preview 계약 — 아직 함수·제품 없음

아래는 **다음 순수 모듈을 리뷰할 계약 초안**이다. 현재 export되거나 UI에서 호출되는 API가 아니다. 임시 문서 식별은 `flowme-personal-anchor-review-v1 / version:1`이며 기존 state v1, P metadata, C checkpoint, E2 journal 번호를 바꾸지 않는다. 새 durable version은 이 문서에서 확정하지 않는다.

### 4.1 입력과 private capture

1. source producer는 읽은 원문 bytes/정본 bundle/현재 state를 captured read input으로 갖는다. imported 경로는 기존 read-model decoder, authored/C2 경로는 기존 source decoder/composer를 **모듈 내부에서** 재사용한다. 단순 공개 model DTO를 typed schedule 권한으로 승격하지 않는다.
2. target은 `{flowRef, savedCopyId, flowId, origin, sourceSlug}` 전체와 실제 전체 Item tuple 집합이다. Item은 `{itemRef, savedCopyId, flowId, itemId}`가 동일해야 한다. ref 문자열만 맞거나 같은 제목·local id라는 이유로 채택하지 않는다.
3. source/state의 exact captured bytes, 모델 JSON, 현재 관측 `sourceEpoch/workspaceEpoch`를 함께 묶는다. epoch는 유한한 비음수 정수이고 현재 관측치와 일치해야 한다. hash는 evidence용이며 exact bytes 비교를 대체하지 않는다.
4. 검증된 source read index와 위 binding은 private capture에 둔다. 공개 handle/clone은 편집·저장/Undo 권한이 아니다. UI의 capability boolean이나 serializable ticket을 다시 private context로 받아들이지 않는다.
5. 명시 요청은 `{intent:'set-personal-anchor', date:'YYYY-MM-DD'}`만 허용한다. 빈 문자열/null/undefined/invalid date, unknown intent·keys는 거절한다. `clear`, Map 전체 target, subset membership은 이 계약에 없다.

실제 storage 접근·관측 event가 없었던 pure 함수가 “현재 저장소가 최신”을 증명할 수는 없다. future caller는 open/preview/최종 저장 경계마다 actual I/O와 epoch를 다시 제공해야 한다. 지금은 writer가 없으므로 그 단계의 저장 권한을 발급하지 않는다.

### 4.2 읽기 결과

성공 결과는 frozen 메모리 DTO와 검토 범위만 반환한다. `candidateState`, `candidateBytes`, writer, revision+1, Undo, success receipt는 반환하지 않는다.

| 필드 | 보존·검증 내용 |
| --- | --- |
| `scope: 'read-only-anchor-preview'` | capture 시점 preview. 현재 I/O 또는 저장 허가가 아님 |
| `target` | 위 exact Flow tuple |
| `dates` | monthCursor / selectedDate / sourceAnchor / existingPersonalAnchor / proposedPersonalAnchor. 각 층의 presence·owner·provenance를 유지 |
| `rows[]` | 모든 현재 Item tuple, source schedule, 기존 personal schedule/direct override/PoC intent, 실행 placement를 구별 |
| 각 row의 before/after | planDate와 effective execution date를 별도 optional 값으로 표시. absent는 `''`나 localToday로 채우지 않음 |
| `effect` | `recalculated-relative` / `preserved-source-fixed` / `preserved-personal-pin` / `preserved-undated` 등의 읽기 설명. field owner를 대체하지 않음 |
| `counts` | 달라진 plan 날짜 Item 수와 실행 표시 위치 변화 수를 별개 집계. Flow1로 합쳐 필드 변화를 숨기지 않음 |
| `limitations` | source absence·unsupported scope 등의 실제 이유. unknown source를 지원됨으로 표시하지 않음 |

잘못된 입력이면 handle/부분 결과 없이 `{ok:false, scope, reason}`을 반환하는 안을 제안한다. 같은 source의 다른 copy·중복 ref·foreign row, source/context drift, 관측 ABA는 해당 capture를 영구 폐기한다. 닫기/재열기/동일 A bytes 복귀로 옛 owner가 살아나지 않는다. 명시 재조회만 새 capture를 만든다.

### 4.3 계산 순서와 실행 보존의 정확한 뜻

1. source schedule은 actual typed owner 자료에서 읽는다. 이미 계산된 `item.sourceDate`, 표시용 D-label, Calendar 선택일을 역산해 offset으로 만들지 않는다.
2. PoC Item fixed pin/명시 unscheduled가 있으면 계획 날짜는 그대로다. pin이 이전 상대 날짜와 숫자가 같아도 보존한다.
3. imported 직접 fixed/미정은 presence와 owner를 유지한다. source relative를 덮은 개인 structural relative는 첫 구현에서 임의로 source relative와 합치지 않는다.
4. 남은 source absolute는 그대로, 원래 none은 미정이다. 검증된 source relative만 명시 date에 offset을 더한다. 범위를 벗어난 연도·invalid 결과는 전체 preview를 차단한다.
5. 실행 fixed/미정 placement와 completion/memo/order/timeline payload는 exact 불변이다. **실행 mode가 inherit이면 계획 날짜 변경에 따라 표시되는 실행 날짜도 달라질 수 있다.** “실행 보존”을 모든 effectiveDate 고정으로 잘못 구현하지 않는다.
6. source Flow/raw/lineage를 다시 materialize하거나 그 `anchorDate/sourceDate`를 변경해 계산을 우회하지 않는다. KAP03에서 source anchor 필드만 바꾼 handoff는 actual source validator가 거절했다. preview의 after-date는 별도 행 DTO에 두어야 한다.

실제 일반 Result는 새 개인 anchor field를 아직 소비하지 않는다. read-preview를 위해 source model의 날짜를 덮어 기존 Result에 통과시키거나, fake source index로 결과를 렌더하는 안은 금지한다. 미래 consumer는 검증된 별도 preview 행을 표시하거나 별도 합의된 개인 계획 projection을 사용해야 한다.

## 5. 이번 실험: 무엇을 실제로 했는가

첫 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/anchor-preview-simulation-first-2026-09-06T07-06-39-091Z.json`) **9/9 PASS**, skip/fail 0. strict (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/anchor-preview-simulation-strict-first-2026-09-06T07-06-39-090Z.json`) diagnostics 0. 처음부터 실제 현재 계약을 확인하는 characterization이며, missing 미래 API에 대한 RED→GREEN 제품 구현이라고 표현하지 않는다.

문서 검사 첫 호출은 존재하지 않는 `scripts/check-doc-references.mjs`를 지정해 검사 시작 전 실패했다(실행 기록 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/anchor-preview-docs-check-2026-09-06T07-11-38-241Z.json`)). 문서 오류나 제품 실패로 세지 않는다. 이후 package.json의 실제 `docs:check` 구성으로 실행한 skill sync (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/anchor-preview-skills-check-2026-09-06T07-12-38-227Z.json`)는 PASS, 문서 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/anchor-preview-docs-final-2026-09-06T07-12-38-572Z.json`)는 16 required files / 6,644 links PASS다. 이 숫자는 해당 검사 시점 값이며 이어 추가한 evidence 링크를 소급 집계하지 않는다.

| ID | 실제 호출과 확인 | 그 시험이 증명하지 않는 것 |
| --- | --- | --- |
| KAP01 | actual saved record/classifier/read-model/Result로 네 origin의 typed offset·existing-personal anchor·별도 month/selected 확인 | 네 origin에 새 개인 anchor 저장이 구현됨 |
| KAP02 | isolated 메모리 record의 anchor A/B를 각각 실제 reader로 투영. 상대만 재계산, PoC 동값 pin·명시 미정·imported fixed/미정·실행 fixed/미정·시간/완료/메모·full refs 보존 | 운영 record 수정 또는 제품 preview candidate. fixture의 입력 파일/저장소를 실제로 바꾸지 않음 |
| KAP03 | genuine authored raw/line-map index, actual parser의 윤일 계산·source fixed/none 보존. source anchor 필드만 덮은 payload 거절 | source raw의 기준일 치환을 개인 anchor 구현으로 사용 가능함 |
| KAP04 | 같은 Map의 두 child를 actual reader로 읽었을 때 공통 anchor fixture 변경이 둘 다 재계산됨 | Map 일괄 변경 승인, 단일 child shadow 의미가 이미 정해짐 |
| KAP05 | 기존 additive-v1 fallback은 읽히지만 provenance가 legacy-fallback임. actual parser는 기준일 없는 relative 차단 | 기존 읽기 호환을 새 편집 capability로 승격 |
| KAP06 | 실제 source index/task context가 foreign tuple·duplicate·다른 사본 row·위조 handle 거절 | 향후 preview packet의 strict unknown/accessor 검사 구현 |
| KAP07 | actual C2 candidate stage/resolve/apply/composer 결과가 mapping unavailable. 옛 base에 새 index를 빌려 쓰면 거절 | typed source generator가 구현됐거나 C2 기본 읽기가 차단됨 |
| KAP08 | 기존 ephemeral navigation memory에서 exact mismatch 폐기·명시 invalidate 후 ABA old-ticket 복귀 불가. 기존 source index는 observation을 모름도 확인 | K4의 새로운 epoch 입력 검사가 구현됨. 실제 두 탭/브라우저 관측을 수행함 |
| KAP09 | 기존 date validator의 invalid/empty 거절, Result month/selected 이동에도 모든 plan/effective dates 불변 | 기준일 해제 의미를 결정하거나 새 intent decoder 구현 |

메모리 `ReadPort`의 set/remove/clear는 호출되면 throw하고 카운터가 증가한다. 실행한 모든 reader에서 호출 0이다. source 후보 transition은 I/O 없는 실제 모델 함수를 썼다. 브라우저 storage·실제 운영 key·writer·network는 접근하지 않았다. `flow:*` 문자열은 테스트 소유 메모리 record의 key일 뿐이다. source 9파일 SHA를 실행 시작/끝에 비교해 불변을 확인했고 로그의 `k4-design-only-source-pins`에 전체 hash를 남겼다. C3 UI 병렬 소스 변경이나 전체 repository 불변까지 주장하지 않는다.

등록은 신규 **9개**다. KAP01의 네 origin, KAP02의 여덟 Item, KAP04의 두 child, invalid 입력 loop를 신규 시험으로 합산하지 않는다. 선행 K4-D 4개, C3/C2 회귀와도 별도다.

## 6. 다음 가장 작은 구현 gate와 미정 항목

권장 순서는 다음과 같다. 지금 실행한 9개만으로 이 gate를 모두 통과했다고 판정하지 않는다.

1. **새 pure read-preview만** 구현 대상으로 승인한다. 기존 schema/writer/UI는 제외한다. 내부 actual producer decode·strict descriptor clone·genuine capture·full tuple·epoch mismatch/ABA 폐기를 먼저 검사한다. unknown/accessor/prototype/cycle·동명 다른 copy·current/실제 Undo의 지원 불가 조합은 새 negative가 필요하다.
2. typed가 확인된 non-Map 사본과 complete authored ordinary relative에만 `set(date)`를 계산한다. pin/none/imported/execution 우선순위를 위 계약대로 비교하고 source/state/Undo/library bytes 불변을 검사한다. 이때 별도 preview row DTO가 실제 화면 없이도 충분한지 root가 리뷰한다.
3. 해당 pure 계약을 통과한 뒤에만 실제 Plan draft·C/E2 재도출·저장 원자성·복구·Undo·legacy branch의 별도 설계를 승인받는다. source raw를 바꾸거나 운영 saved anchor writer를 빌리는 구현은 선택하지 않는다.

현재 유효한 날짜를 명시 지정하는 **읽기 preview**를 만들기 위해 새 사용자 영구 정책을 결정할 필요는 없다. 아래는 현재 원문/후속 승인만으로 자동 확정하지 않은 항목이다.

- 개인 anchor 해제/reset/inherit의 의미와 기존 개인 값의 복귀 대상. 이번 요청에는 입력 경로 자체가 없다.
- Map child별 개인 anchor와 Map 공통 anchor의 관계. KAP04의 두 child 변화는 일괄 write의 근거가 아니라 좁은 target gate가 필요한 근거다.
- source 없는 개인 추가 relative Item 및 상대 반복의 anchor 소비·회차 identity. 첫 지원 범위 확대 전에 실제 field binding을 검토한다.
- 새 durable metadata/draft/journal의 strict version·missing field 의미·동값 set의 normalized intent. 현재 v1의 unknown key 거절을 느슨하게 바꾸지 않는다.
- source 기준일/version이 바뀐 뒤 개인 anchor가 따라갈지 고정될지. 이번 preview는 same-source capture만 유효하고 source 변화 뒤 명시 재조회한다.

제품/기존 문서/기존 시험/HTML/report 변경0, full npm/build/browser/실기/배포 미실행, 관찰 사용자0이다. 이 문서는 다음 bounded pure 구현을 검토할 자료이며 K4 기능 완료 보고가 아니다.
