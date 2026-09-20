# K3-B B2 — 개인 구간·전체 Plan 순서 capability gate

2026-09-05. **구현 전 설계와 현행 특성 검사 5개만 완료했다. B2 제품 구현·UI 검증 완료가 아니다.** 제품, app, builder, 생성 HTML, 공용 보고서는 바꾸지 않았다. P/E2의 현재 section/order 미지원도 그대로다.

## 1. 정본과 조사 범위

[K3-B 설계 §2·4·5·6](./k3b-design.md)의 `K-D1-02,06`, `B-T09·10·13`과 [P2-C 계약](../2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md) 전문을 대조했다. P2-C의 D1-012는 **개인 소유가 입증된 stable section의 제목 별칭**만 허용한다. D2-021의 저장 후 원문 역수정 금지도 유지한다. 개인 Plan 순서는 section 제목 capability와 다른 축이다.

이번에 원본 세션 대화를 다시 조회하지 않았다. 문서에 회수된 후속 결정, 실제 React·standalone 코드와 테스트 정의를 읽었다. 테스트 정의를 읽은 것을 재실행 PASS로 세지 않는다. `flow-ux-review`의 조작·설명 중복 제거 원칙을 적용했고, `figma-ux-ui-design`은 기존 코드 기반의 상태·capability 설계에만 사용했다. Figma 파일·새 wizard·전역 theme·새 export-first 화면은 만들지 않는다.

| 요구 | 현재 근거 | B2의 종료 기준 |
| --- | --- | --- |
| D1-012 / B-T09 개인 구간 | P2-C의 stable personal-draft·materialized handoff만 shadow title | 한 sectionId의 별칭을 한 번 저장하고 같은 section을 읽는 결과·상세에서 동일하게 표시. source-owned/derived에는 입력 없음 |
| B-T10 전체 Plan 순서 | React `orderedItemRefs`는 전체 Item ref의 permutation | Item 누락·중복·foreign 없이 순서만 바꿈. 원문 Step 소속·날짜·수동 TimelineOrder/rank는 불변 |
| B-T07 부모/자식 | K3-B 및 [B1-E 설계](./k3b-plan-session-connection-design.md) | child는 자기 title/memo/schedule만 반영하고 부모 section/order를 exact 보존. child·취소는 journal까지 0쓰기 |
| B-T13 source 업데이트 | React source → personal overlay 합성, [Sa reader 계약](./k3b-plan-source-reader-design.md) | 검증된 exact identity로만 개인 값 보존. 새 Item/구간·소속 변화는 별도 reader capability를 통과해야 함 |

## 2. 실제 stable owner는 어디서 오는가

### React에서 이미 확인되는 근거

- [read-model의 projectFlowSections](../../../lib/flow/personal-workspace-poc-read-model.ts)는 실제 `bundle.sections[].id`를 그대로 사용한다. 비어 있거나 trim이 달라지는 id, 중복 id, 잘못된 order/title은 거절한다. Item의 `section_id`를 이 catalog에 정확히 연결한다.
- `personal-draft`라는 origin 문자열만으로 편집을 열지 않는다. [isPersonalDraftStructuralEditEligible](../../../lib/flow/personal-draft-structural-edit.ts)는 `flow.status='draft'`, `slug`의 `url-draft-` 시작, `내 초안` tag, source title `내 메모` 또는 `사용자가 넣은 링크`를 함께 확인한다. source-owned section은 읽기 전용이다.
- [authoring materializer](../../../lib/flow/personal-workspace-poc-authoring.ts)는 확인된 handoff의 지원 `##` source line에서 sectionId를 **최초 생성 때** 발급하고 `identityMap['section:line:…']`와 Items에 저장한다. 기존 생성 알고리즘의 line/title 입력을 이번 B2의 새 owner 추정과 혼동하지 않는다. B2는 이미 저장된 id와 검증된 mapping을 재사용하며, 수정한 제목·현재 배열 index로 다시 만들지 않는다.
- [Plan editor](../../../lib/flow/personal-workspace-poc-plan-editor.ts)의 section guard는 id·sourceOrder·titleOwner·editCapability·Item membership을 묶는다. `poc-shadow`는 personal-draft/existing-personal 또는 authoring-handoff/authoring 조합만 가능하다. 반면 전체 Plan order draft는 네 saved origin과 handoff에 모두 열린다.

### standalone에서 아직 부족한 근거

[model.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js)의 실제 값은 다음과 같다. 아래 local Step id는 **그 자체로 전역 section ref나 편집 권한이 아니다**.

| Flow | origin / full Flow ref | 저장된 Step id | 구간 제목 편집 판정 |
| --- | --- | --- | --- |
| memo seed | personal-draft / `saved-flow:copy-draft-memo:flow-memo` | `outline` | 개인 초안 예시라는 source 코드 근거는 있으나, imported bundle의 capability 증거는 없음. 아래 별도 seed gate 후보 |
| moving seed | source-backed-map / `saved-flow:copy-map-moving:flow-moving` | `select` | source-owned 읽기 전용 |
| washer seed | canonical-personal-copy / `saved-flow:copy-canonical-washer:flow-washer` | `care` | source-owned 읽기 전용 |
| inspection seed | legacy-saved-plan / `saved-flow:copy-legacy-check:flow-check` | `prepare` | 읽기 전용 |
| 실제 commit-authoring | authoring-handoff / 각 저장 사본의 full tuple | `step-1`, `step-2` 등 최초 저장 id | exact handoff/raw/membership 검증과 id 검사를 통과한 것만 후보 |

`M.validate`는 Step title·itemIds와 Item 소속을 검사하지만 Step id 부재/중복을 거절하지 않는다. `standaloneAuthoredFlowForSourceUpdate`는 id가 없으면 index 기반 `step-N`을 넣고 title에도 fallback을 쓴다. **그 projection의 `poc-shadow` 표시를 곧바로 B2 권한으로 신뢰하면 안 된다.** 일반 old payload validator를 전면 강화해 옛 자료를 모두 깨뜨리는 대신, B2 전용 section capability 검사에서 편집만 제한한다.

## 3. 허용 matrix와 정확한 capability packet

| 입력 종류 | 개인 구간 제목 | 전체 Plan 순서 |
| --- | --- | --- |
| React 실제 structural personal-draft | 검증된 bundle sectionId만 | 검증된 전체 full Item ref |
| standalone personal-draft 일반 payload | 원본 bundle proof를 전달하는 trusted adapter가 없으면 읽기만 | 기존 P/C가 전체 Flow/Item identity를 검증하면 후보. section 편집 미지원과 별개 |
| standalone memo seed | `outline`을 사용하는 **명시 fixture-only 계약**을 별도 gate로 검토. 아직 허용 구현 아님 | 검증된 전체 refs로 가능하도록 설계 |
| confirmed authoring handoff | 저장된 정확 Step id + handoff/source lineage + 소속이 입증된 구간만 | 검증된 전체 refs |
| Quick→새 Flow | 새 handoff/변환 영수증의 exact tuple·source mapping을 같은 검사로 입증한 경우만. origin 라벨로 통과하지 않음 | 실제 새 Flow의 전체 refs. 원래 Quick은 별도 owner |
| canonical / Map / legacy | source 구간은 읽기 전용 | 네 origin 공통 개인 Plan order 범위 유지 |
| 날짜·D-day·완료·회차·Timeline group label | section으로 취급하지 않음 | Plan 순서의 Item 또는 section ref로 사용하지 않음 |
| origin allowlist 밖 또는 손상 payload | 기존 exact-query fail-closed를 유지. 정상 PoC로 받아들이지 않음 | 같은 경계 |

capability 발급은 UI flag가 아니라 순수 adapter의 검증 결과다. 이후 계약에는 full Flow tuple, exact sectionId/title/sourceOrder, titleOwner, editCapability, section별 exact Item ref membership, source/base fingerprint와 **정확 raw/source bytes에 묶인 opaque context**가 필요하다. fingerprint만 같다고 source 동일을 확정하지 않는다. `sectionTitles`는 이때 발급한 editable id 집합만 받는다.

추가 검사: id는 안전한 own string·nonblank·trim exact·unique, sourceOrder는 유효하고 unique, 모든 Item은 정확히 한 section 또는 원본에서 입증된 무구간 상태여야 한다. 같은 제목은 허용하지만 같은 id는 허용하지 않는다. 다른 사본의 `step-1`은 full Flow tuple이 다르므로 별개다. 표시 제목·DOM list index·`sourceOrder`는 owner id를 만드는 재료가 아니다.

memo seed 최소안은 기존 `M.seedState`에 명시된 tuple/`outline`/membership과 C의 seed/legacy provenance를 검사하는 **trusted fixture catalog**다. 새 상태를 열 때 origin이나 현재 title만 보고 그 catalog를 자동 발급하면 안 된다. 기존 fixture의 변경 가능한 완료·실행 날짜까지 고정값으로 요구하지 않되, 보존된 seed baseline에서 section 소유를 증명해야 한다. 이 작은 technical gate가 승인·검증되기 전에는 제목 입력을 열지 않는다. 일반 imported personal-draft는 React의 validated bundle section DTO를 읽기 adapter로 전달하는 별도 경로가 필요하다. 출처 자료가 없는 payload에서 동등한 owner를 제조하는 것은 대안이 아니다.

## 4. 순서와 구간을 투영하는 방법

1. 개인 구간 별칭은 full Flow ref 아래 `sectionTitles[exactSectionId]`에 한 번만 둔다. Item마다 복사하거나 raw `flow.steps[].title`에 저장하지 않는다. 표시용 복사본에서만 해당 section을 참조하는 Item의 effective section title을 읽는다.
2. 개인 순서는 `orderedItemRefs` 전체 permutation이다. Item dictionary의 열거 순서, `task` 배열 위치, Step별 `itemIds` 재배치로 저장하지 않는다. 중복/누락/foreign/다른 사본 ref를 거절한다.
3. 서로 다른 Step의 Items를 교차 배치해도 원래 `sectionId`와 Step membership은 유지한다. 전체 Plan 순서가 A1→B1→A2면 같은 순서의 행과 각 행의 원래 구간 문맥을 보여 준다. 다시 Step별로 모아 A1→A2→B1을 만들면 기능 누락이다. raw 구조를 바꿔 우회하지 않는다.
4. 최소 reader는 검증된 source-before-personal view와 개인 overlay를 받아 **view-only section catalog + ordered Item refs**를 제공한다. 기존 source parser·line map은 개인 순서를 적용하기 전 자료로 검증한다. app/상세/Plan 편집/Text·Todo·Calendar·Sheet·TXT는 같은 effective reader를 사용한다. 저장 candidate는 여전히 authoritative raw만 받는다.
5. 원래 순서 복귀는 저장된 개인 order override만 제거한다. 기존 source membership을 새로 해석하거나 TimelineOrder reset을 호출하지 않는다. 편집 중 baseline으로 돌아와도 다른 필드 변경과 root dirty/Undo는 보존한다. 현재 React Plan 화면에는 위/아래 이동은 있으나, 읽은 JSX 구간에서 별도 원래 순서 복귀 버튼은 확인되지 않았다. K3-B B-T10의 이 control은 구현/브라우저 재확인이 필요한 항목으로 남긴다.

**TimelineOrder 불변의 정확한 뜻:** [React view model](../../../lib/flow/personal-workspace-poc-view-model.ts)의 기본 기간 정렬은 time → effective sourceOrder → title이다. [개인 overlay composition](../../../lib/flow/personal-workspace-poc-composition.ts)은 개인 Plan order를 effective sourceOrder로 투영한다. 이후 수동 TimelineOrder가 우선 적용된다. 따라서 날짜/시간·수동 TimelineOrder·standalone의 명시 date rank 저장값은 불변이어야 하지만, 수동 순서가 없는 동률 행의 기본 표시까지 무조건 동일해야 한다는 뜻은 아니다. 이 차이를 새 제품 정책으로 바꾸지 않고 양쪽 fixture로 대조한다.

## 5. source 후보·새 Item의 경계

[React canonical ownership](../../../lib/flow/personal-workspace-poc-canonical-ownership.ts)의 `reconcilePersonalWorkspacePocPersonalPlanOverlayForSourceVersion`은 기존 개인 순서의 refs가 모두 새 source에도 있으면 **검증된 새 ref만 원문 순서로 뒤에 붙인 읽기 overlay**를 만든다. stored overlay를 조회 중 수정하지 않는다. 기존 ref가 사라지거나 foreign이면 충돌을 차단한다. 이 기존 동작을 B2의 새 임의 정책으로 다시 정하지 않는다.

현재 standalone M composer는 새 source version의 추가 Item을 raw tasks에 만들지 않는다. 최신 P Sa reader는 이 조합을 `source-membership-not-supported`로 명시 차단한다. B2는 이 보호를 풀거나 view를 raw로 저장해서 통과시키면 안 된다. 우선 same-membership source의 개인 구간/순서를 연결하고, 추가 Item은 다음 조건을 닫은 뒤 연다.

- source version의 exact tuple/retained Item refs/새 refs·section catalog 검증과 기존 개인 overlay reconciliation을 같은 reader에서 수행한다.
- 새 view Item에 없는 실행 날짜·완료·memo baseline을 임의로 만들지 않는다. raw source import/실행 초기화 정책과 읽기 투영을 구분한다.
- 동명 구간의 source title 변경은 exact sectionId가 같을 때만 개인 별칭을 보존한다. 새 section id·소속 변화·기존 ref 제거를 제목 유사도나 배열 위치로 맞추지 않는다.
- pending/deferred 후보는 source 적용으로 보지 않는다. applied/Undo 및 source key만 바뀐 경우 Plan source ticket/관찰 epoch를 무효화한다. draft는 보존하고 자동 rebase·자동 재저장은 하지 않는다.

이 membership 제약은 현재 단계의 명시 미지원이지 영구 제품 정책이 아니다. B2 전체 완료로 보고하려면 새 Item 동등성까지 후속 gate의 실제 증거를 연결하거나 해당 요구를 미충족으로 남겨야 한다.

## 6. P/C/E2/D 버전 gate — 지금 확장하지 않음

[P v1 계약](./k3b-plan-context-contract.md)은 title/memo/schedule만 지원한다. section/order는 빈 객체/배열도 거절한다. 최신 Sa reader API가 추가됐어도 이 metadata/draft 계약은 바뀌지 않았다. 현재 E2와 [B1-E 신규 모드 설계](./k3b-plan-session-connection-design.md) 역시 B2 필드를 받는 계약이 아니다.

권고는 같은 workspace-v2 안에서 **다음 개인 Plan draft/metadata contract를 명시 구분**하는 것이다. 후보는 기존 reserved metadata 위치의 version2 branch이며, 정확 이름·version·필드 표는 구현 전 contract diff에서 승인한다. 새 localStorage key·운영 schema·독립 Undo는 만들지 않는다. P2-C의 React optional v1 필드 계약을 standalone strict v1의 무조건 unknown 허용 근거로 가져오지 않는다.

| 연결점 | 반드시 함께 닫을 검사 |
| --- | --- |
| P capability/baseline | 현재 raw binding 외에 exact section catalog·membership·원래 순서를 캡처. 값 편집으로 stable owner를 재발급하지 않음 |
| P draft/normalize | version별 exact keys. editable section 집합, mode, full-ref permutation. source baseline 복귀와 실제 no-op을 구별 |
| P candidate/reader | raw Step/title/소속·execution·unknown 보존, revision +1, 직전 전체 state Undo 한 벌. projection을 raw로 재사용하지 않음 |
| C current/Undo/legacy | v1/v2를 각각 strict 검사. metadata 없는 old payload 및 old Undo 읽기 유지, reserved collision 차단. read/open에서 전환 0 |
| E2 root/child/attempt | 새 discriminator와 genuine P context. child copy는 자기 field만; 부모 section/order exact 보존. journal decoder도 같은 draft→candidate 재계산 관계 검사 |
| old/new recovery | 기존 prepared/confirmed 먼저 처리. context JSON 복원 금지, version fallback/자동 downgrade 0. confirmed target rollback 금지 |
| source freshness | Sa/Sb의 실제 raw/source packet과 opaque context를 재사용. UI `ready` 플래그나 index fallback을 authority로 사용하지 않음 |
| D 영구 삭제 | current/Undo의 대상 section/order/capture까지 exact owner 제거. 이웃 copy·Quick·source 후보·archive 보존/정리 범위, 확정 cleanup까지 재검증 |
| 일반 action | move/date/complete/reopen/Quick/folder/trash/reset/handoff/Undo가 metadata를 보존하거나 명시 target만 정리. managed raw drift를 자동 덮지 않음 |

다음 version을 첫 명시 변경에서만 만들더라도 v1 entry를 새 capture로 자동 바꾸면 안 된다. v1 current와 v2 candidate·v1 Undo가 공존하는 fixture, 마지막 override 제거, 옛 client 후속 쓰기와 source drift를 먼저 검사한다. version별 dual decoder·삭제·복구가 갖춰지기 전에는 UI 저장을 열지 않는다.

## 7. UX와 상태 — 기존 한 Plan 저장 유지

순서는 기존 기준 → 내 Flow 제목 → 지원 개인 구간 → 전체 Item 순서 → 실제 변경 요약이다. 구간마다 소유권 badge를 반복하지 않고 영역 안내 한 번과 필요한 readonly 이유만 둔다. 동명 구간은 원래 위치/대표 Item 문맥으로 구분하되 내부 ref를 일반 라벨로 노출하지 않는다. 방향키를 텍스트 입력에서 가로채지 않고 기존 위/아래 버튼과 키보드 Tab 경로를 제공한다.

| 상태 | 표시·주 행동 | 보존/쓰기 |
| --- | --- | --- |
| 열기 | 지원 구간만 제목 mode/control, 전체 순서 행 | 조회·context 발급·DOM 표시 0쓰기 |
| 구간/순서 변경 | 해당 구간/행을 유지, 실제 영향 수와 요약 | 메모리 staged. 한 구간 변경을 Item 수만큼 저장하지 않음 |
| 경계/같은 값 | 경계 버튼 disabled, 0변경 안내 | journal/target/새 Undo 0 |
| child 적용/취소 | 부모 같은 Item opener로 복귀 | 다른 field·section/order 유지, journal 0 |
| invalid/stale | 해당 오류와 입력 유지. 미지원 capability 이유 표시 | 자동 reset·owner 재배정·다른 copy 쓰기 0 |
| dirty 닫기 | 기존 계속 편집/변경 버리기 | root/child 범위와 focus·scroll 복구 유지 |
| 저장/실패/복구 | 기존 session·attempt·persistent feedback와 복구 gate | target와 journal 계수를 분리, 불확실 상태의 일반 writer 잠금 |
| 성공/Undo/reload | same-attempt section/order diff와 기존 receipt | Plan 논리 transaction 1개. source·TimelineOrder·다른 copy 보존 |

390×844, 375×812, 844×390, 1024×768, 1440×900에서 동명·긴 한글·공백 없는 token·마지막 행·오류·복구를 확인한다. 핵심 버튼/입력의 전체 rect와 여러 점 hit, 내부 overflow, 초점·단일 live owner를 함께 검사한다. 반복 header/과도한 중첩 스크롤은 줄이되 정보 삭제·폰트 축소·검사 완화로 통과시키지 않는다. 이번 설계에서는 실제 화면 점수나 UX rubric 점수를 매기지 않았다.

## 8. 다음 구현·검증 묶음

**B2-a capability/버전 diff → B2-b P/C/E2/D 순수 gate → B2-c shared reader/기존 두 UI → B2-d source·복구·5 viewport** 순서다. 아래 14개는 예정 검사 묶음이며 실제 등록 테스트 수가 아니다.

| ID | 예정 검증 |
| --- | --- |
| B2-01 | 실제 structural bundle·verified handoff·seed proof와 spoofed origin 비교. exact id 없는 구간은 편집 거절 |
| B2-02 | Step id missing/duplicate/blank/trim mismatch, derived label, sourceOrder 중복, foreign membership. getter/배열 descriptor는 읽기 전에 차단 |
| B2-03 | 동명 두 section과 같은 local id의 다른 copy. 한 별칭만 같은 section 모든 소비 화면에 반영 |
| B2-04 | canonical/Map/legacy section readonly와 전체 Plan order 편집을 독립 검사. 알 수 없는 origin fail-closed |
| B2-05 | 전 refs permutation, 다른 section 교차 이동, 누락·중복·foreign 거절, 경계 no-op·원래 순서 복귀 |
| B2-06 | Item title/memo/date child 적용·discard 뒤 부모 title/section/order exact. 입력 엔터·이중 저장·late outcome도 하나의 owner |
| B2-07 | source raw/Step membership/기존 unknown/완료·회차/date/time/folder 불변. timeline 수동 order/rank 우선, time 동률 기본 Plan order는 양쪽 비교 |
| B2-08 | Text·Todo·Calendar·Sheet·TXT·Flow/Item 상세·기간의 같은 section/ref/order. 읽기 때 stored overlay 불변 |
| B2-09 | current v1/새 v2/old Undo/archive/reserved 충돌·missing module·unknown contract. open/no-op 자동 전환 0 |
| B2-10 | source same id rename·pending/deferred/apply/Undo·새 Item append·기존 ref 제거·새 section. 미지원 reader를 우회하지 않음 |
| B2-11 | source/workspace 별도 drift·관찰 ABA·read-error·Quota/readback/rollback 실패. draft 보존과 명시 retry/recovery |
| B2-12 | prepared/confirmed reload·candidate tamper·새 draft 재계산·target/journal API 수 분리. confirmed rollback 0 |
| B2-13 | 대상 영구 삭제 후 section/order/capture/Undo 부활 0. 이웃 copy·변환 원래 Quick·source 자료 보존 |
| B2-14 | 5 viewport·긴 내용·키보드/비드래그·dirty Back/초점·live owner 및 운영 sentinel exact/prefix 밖·clear 0 |

순수 모델만 통과하고 버튼을 연결하는 것으로 B2를 닫지 않는다. root가 범위별 실제 고유 테스트 수, 전체 npm/build, 두 runtime 시나리오와 미실행 항목을 모아 판정한다. 같은 실행을 재실행 횟수나 viewport 반복만큼 고유 테스트에 더하지 않는다.

## 9. 이번에 실행한 것과 한계

[신규 characterization test](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/k3b-section-order-gate.test.cjs)는 **고유 5개**다. 첫 실행 5/5 (로컬 전용 근거: `../../../output/k3b/section-order-characterization-first-20260905.tap`) 뒤 B2G05에 최신 Sa 차단을 보강했고, 최종 재실행도 5/5 PASS (로컬 전용 근거: `../../../output/k3b/section-order-characterization-final-20260905.tap`), fail/skip/cancel/todo 0이다. 등록 5개를 두 번 실행했으며 고유 10개가 아니다.

| 실제 검사 | 관측 결과 — B2 완료 판정 아님 |
| --- | --- |
| B2G01 | memo seed `outline`은 저장돼 있으나 imported bundle capability proof는 없음 |
| B2G02 | 일반 M validator는 missing/duplicate Step id를 통과. source adapter의 index fallback/중복 projection을 확인 |
| B2G03 | 실제 handoff의 동명 구간은 저장 id로 구별하고 같은 local Step id의 다른 사본은 full refs로 분리 |
| B2G04 | P v1은 sectionTitles/orderedItemRefs를 빈 값이어도 거절하고 원본 state를 바꾸지 않음 |
| B2G05 | 실제 적용 source version은 Item 3개, 기존 M view는 기존 2개. 최신 Sa는 `source-membership-not-supported`/canEdit false로 차단, raw membership 불변 |

이번 시험은 순수 메모리 호출이다. storage API·브라우저·운영 실사용자 profile은 사용하지 않았으므로 운영 데이터 실측 불변 증거를 주장하지 않는다. 전체 npm/build, 새로운 UI/브라우저, 실제 Android Chrome/iOS Safari·IME·보조기술은 미실행, 관찰 사용자 0명. commit/push/PR/Preview/Production 없음.

최종 조사 시 M SHA256 `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67`, P `BDBF71E8663F25DAC24C6BDE3B1C71090D903E334C68C1D807E415A206172AAD`, E2 `FD249B599E122E84DF614C89771EE5A31FCF06B01585BC5093810F43387F6AA7`다. P는 병렬 Sa 구현으로 초기 조사보다 달라졌고 최종 5개는 이 최신 API를 사용했다. 이후 B1-Sb/E2 변경은 구현 착수 시 다시 대조한다.

문서 검사 `npm.cmd run docs:check` PASS — required files 16개, local links 5,514개. 이는 순수 모델/제품 테스트 수에 합산하지 않는다.
