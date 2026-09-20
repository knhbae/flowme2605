# K4-D — 같은 Step WorkingSource 날짜순의 lossless 설계 실험

2026-09-06. 이 문서와 신규 검사 (로컬 전용 근거: `./k4-working-source-order-simulation.test.ts`)는 **설계 검토용 패키지**다. 검사 안에 새로 만든 planner는 test-local 시뮬레이션이며 제품 API가 아니다. 실제 parser·fidelity locator·최초 materializer·source validator를 사용하되 제품, 기존 schema, 기존 검사, 사용자 HTML, 감사 원장과 보고서는 수정하지 않았다. 저장·브라우저·native Undo 구현 완료를 뜻하지 않는다.

## 1. 요구와 근거

[실행 계획 §11 K4-D](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md#11-k4--필드-계약대체-결정-정리) 226–234와 [개선 설계 §8](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md#8-설계-gate-지금-추정-구현하지-않을-것) 215–224는 같은 Step 날짜순 preview·취소·Undo, block round-trip, owner/version/identity/원자성 조사를 승인했다. K4-D 종료는 설계 완료이며 기능 완료가 아니다. 이 작업은 [기존 K4-D §4](./k4-field-contract-design.md#4-workingsource-날짜순--블록-이동이지-재인계가-아님)의 선행 gate를 좁혀 실험한다.

| 요구 | 직접 읽은 원본 | 이번 대응 |
| --- | --- | --- |
| D2-018 / P3K-D2-08 | D2 grammar (로컬 전용 근거: `../../../../flow-text-authoring-review/docs/specs/2026-07-28-flowme-text-authoring-ux-v1/authoring-grammar-logic.md`) §10–11, 253–283: Calendar 날짜·종일·시각·원문 순서, 명시 원문 적용, 같은 Step Item+속성+하위 체크, revision 1/Undo, identity·lineage 유지 | 실제 날짜가 있는 일반 Item의 명시 순열 preview. Calendar 조회만으로 raw를 바꾸지 않음 |
| 원문 문법과 손실 방지 | 같은 grammar 전문: 첫 H1/명시 H2/root checkbox/2칸 속성/1단계 하위 체크, 알 수 없는 속성은 description 보존, table/shared range/중복 속성 등 부분 편집 차단 | 현재 parser가 인정한 owned 범위를 재사용. 일부 문법을 지원 범위 밖으로 막는 것과 grammar 오류를 구별 |
| 과거 원본의 실제 거래 | 원본 operations (로컬 전용 근거: `../../../../flow-text-authoring-review/lib/flow/text-authoring/operations.ts`) 766–985, 2560–2743: line+EOL 분리, block 순열, 기존 IDs/lineage·range 갱신, revision snapshot·Undo | 원본 기술 방식의 근거. 파일 전체 기능을 이 PoC에 이식하거나 검증했다고 주장하지 않음 |
| immutable source와 WorkingSource 구별 | [P3-F 결정](../2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md) 61–82 및 개선 설계 §8 | 현재 작성 문서의 명시 편집만 후속 대상. 저장 사본·source snapshot·C2 candidate·effective pointer 쓰기 금지 |

원본 grammar 전문과 operations의 정렬·range 재작성·snapshot/Undo 구간을 읽었다. D2 전체 대화나 원본 앱 전체를 다시 검증한 것은 아니다. 현행 감사 원장의 D2-018 parent 판정은 이번 작업에서 바꾸지 않는다.

## 2. 현재 코드와 원본의 차이

| 실제 코드 | 확인한 사실 | 후속 구현에서 피할 오용 |
| --- | --- | --- |
| [PoC parser](../../../lib/flow/personal-workspace-poc-authoring.ts) 642–887 | 문법 해석용 줄은 CRLF/CR을 LF로 정규화한다. 반환 rawText와 fidelity는 실제 원문을 보유한다 | parse 결과를 Markdown으로 다시 출력해 원문 정렬을 대신하지 않음 |
| [PoC fidelity](../../../lib/flow/personal-workspace-poc-authoring-fidelity.ts) 48–65, 136–208, 347–541 | 각 논리 줄의 rawLine은 종결자 제외, locator는 종결자 포함. final empty line까지 연결하면 원문 exact. Item/속성/subcheck의 ownerItemLine 제공 | `sectionTitle`이나 제목 문자열만으로 경계 추정하지 않음. blank/prose/Flow anchor의 owner를 Item으로 강제하지 않음 |
| PoC materializer 1094–1135 | 최초 Step ID는 handoff+line+title, Item ID는 handoff+line+sourceOrder. sourceLineItemIdentityMap에 full tuple 제공 | 같은 handoff로 afterRaw를 재materialize하여 기존 identity를 보존했다고 주장하지 않음 |
| PoC parser 698–713 | subcheckId도 부모/자식 source line에 의존 | 재parse한 subcheckId를 기존 subcheck에 자동 덮어쓰지 않음 |
| [actual source validator](../../../lib/flow/personal-workspace-poc-source-attributes.ts) 338–350 | authored raw/parsed/map/tuple 관계를 검사 | afterRaw를 예전 saved Flow의 raw에 덮어 기존 proof를 가장하지 않음 |
| 원본 operations 892–976 | 기존 canonical itemIds를 유지하며 Item 시작부터 다음 Item/Step까지 줄 블록을 옮긴다. EOL을 보정하여 마지막 개행 유무를 유지 | unknown 문장까지 자동으로 앞 Item 소유로 확정하거나 원본 helper를 현재 PoC writer로 그대로 연결하지 않음 |
| 원본 operations 830–881, 2630–2743 | SourceRow/block/issue range를 old-line→new-line map으로 갱신. raw·parseResult·sourceState를 snapshot에서 Undo | 현재 PoC에도 이 working-document revision 구조가 이미 있다는 주장 금지 |

기존 KD-C03에 이어 신규 WS09도 **현재 materializer가 정렬 뒤 같은 논리 Item에 다른 ref를 발급할 수 있음**을 확인한다. 이는 기존 UI에서 그런 잘못된 저장을 수행한다는 재현이 아니다. 최초 인계 함수를 reorder planner로 재사용할 수 없다는 기술 제약이다.

## 3. 가장 작은 preview 계약

### 3.1 범위

하나의 작성 문서, 하나의 명시 H2 Step, 두 개 이상의 일반 root Item만 대상으로 한다. 선택된 Step의 모든 Item에는 실제 유효한 absolute `날짜`가 있어야 한다. 시각이 있으면 현재 parser가 확인한 HH:mm 값을 사용한다. 정렬은 날짜 오름차순 → 종일 → 시각 → 기존 source 위치 순이다. 날짜 계산, 오늘 추정, 개인 날짜 투영은 없다.

root가 승인한 이 단계는 제품 연결 없는 실험이다. 첫 실제 구현도 이 범위로 제한할 수 있지만, 그 구현 승인과 API 계약은 별도다. 다른 Step의 Item은 더 이른 날짜여도 그대로 둔다. 같은 이름의 H2도 source line과 최초 sectionId로 구별한다.

| 입력 | 역할 | 권한에 관한 한계 |
| --- | --- | --- |
| exact WorkingSource raw/documentId/revisionId | 정렬할 작성 초안의 캡처 | 실제 draft I/O가 최신이라는 보증은 caller 문자열만으로 만들 수 없음 |
| 관찰 epoch와 full Flow tuple | stale/관측 A→B→A를 구분 | 실험의 숫자 epoch는 메모리 guard 모델이다. 브라우저 관측 연결은 미구현 |
| actual parser/fidelity와 최초 actual materializer binding | syntax, 소유 줄, 범위, Item/subcheck identity의 초기 근거 | materializer는 fixture의 초기 identity oracle일 뿐, 새 저장/인계 호출 아님 |
| 선택 범위 start/end/direction | 원문 JS UTF-16 offset의 이동 계산 | DOM selection·IME·scroll/native history 검증 아님 |

시험 안의 `createLaboratory()`는 private WeakMap capture와 inverse record를 만든다. 외부 제품에서 import할 export는 없다. 정렬 결과는 `scope: k4-test-laboratory-permutation`, before/after raw·bindings·selection·gap이다. candidate writer, 성공 receipt, durable revision 번호, 저장 capability를 반환하지 않는다. capture clone과 inverse clone은 거절한다.

### 3.2 문자·개행·빈줄 경계

현재 fidelity가 확인한 Item 시작 줄에서 마지막 소유 속성/subcheck 줄의 **본문 끝**까지를 movable body로 삼는다. body 내부의 문자, 공백, 속성 순서, source checkbox 값, URL, 내부 줄바꿈은 하나도 고치지 않는다. 본문 사이에 끼어 있는 blank는 body와 함께 움직인다.

마지막 소유 줄의 종결자부터 다음 Item 시작까지의 blank-only 구간은 gap slot이다. gap은 그 순서 위치에 남긴다. 첫 Item 앞 prefix와 마지막 Item 뒤 suffix는 untouched다. 이 분리는 마지막 Item에 개행이 없어도 앞으로 옮길 때 다음 Item과 붙지 않게 하며, 마지막 개행 유무와 blank bytes를 그대로 유지한다.

```text
before = prefix + body(B) + gap(0) + body(A) + suffix
after  = prefix + body(A) + gap(0) + body(B) + suffix
inverse(after, same exact binding) = before
```

이 규칙은 **실험용 보수적 whitespace 귀속**이다. 원본 operations처럼 Item 뒤 모든 빈줄을 함께 옮기는 방식과 같다고 쓰지 않는다. 원안은 Item+속성+하위 체크의 동반 이동을 정했지만 blank-only separator의 소유까지 이 PoC에 확정하지 않았다. 혼합 EOL, source prose/shared schedule을 동반한 간격은 이 실험에서 차단한다. LF 또는 CRLF 한 종류만 허용하며 CR 단독도 보류한다.

검사는 `string.length`, UTF-8 `Buffer.byteLength`, 각 body exact slice, 내부 subcheck exact slice, gap/prefix/suffix, 역순 문자열·Buffer equality를 함께 확인한다. afterRaw의 전체 bytes가 beforeRaw와 같다는 뜻은 아니다. **허용된 순열 외 내용 bytes가 바뀌지 않고 inverse가 전체 원문을 exact 복원한다**는 뜻이다.

### 3.3 identity와 range

초기 actual Flow의 `savedCopyId + flowId + itemId + full ref`, sectionId, subcheckId를 캡처한다. 새 order는 캡처한 객체의 순열이다. 제목이나 raw body를 key로 사용하지 않으므로 같은 제목·같은 내용인 두 Item도 서로 다른 owner를 유지한다.

각 새 body start/end는 prefix와 앞선 body/gap 길이의 합으로 계산한다. subcheck는 원래 부모 body 안의 상대 start/end와 id를 보존한다. afterRaw는 실제 parser로 다시 읽어 날짜·시각·하위 체크 개수·새 Item 시작 경계가 일치하는지 확인한다. 이때 재parse가 새로 만든 line-derived subcheckId를 채택하지 않는다. 본문 exact equality가 그 밖의 property/source 체크 내용 보존 근거다.

후속 제품은 Item/subcheck뿐 아니라 현재 작성 UI가 사용하는 source line locator·helper capture·issue range를 새 위치로 연결해야 한다. 이전 helper ticket을 새 위치로 자동 rebind하면 안 된다. 이번 시험은 전체 helper/editor 구현의 identity round-trip을 완료하지 않았다.

### 3.4 selection과 취소

하나의 body 안에 모두 들어가는 start/end는 `newBodyStart + oldOffsetInBody`로 이동한다. forward/backward 방향도 보존한다. 접힌 caret도 같은 산식을 쓴다. preview 이전 prefix 또는 이후 suffix 안의 선택은 전체 길이가 같으므로 그대로 둔다.

여러 Item에 걸친 선택, 움직이는 body와 gap에 걸친 선택은 미리보기를 차단한다. 뒤집힌 endpoints를 임의로 합치거나 넓혀 선택하지 않는다. 이 제한은 제품의 multi-line selection 지원 여부를 새로 결정한 것이 아니라, 이 실험이 증명한 범위를 좁힌 것이다. preview 취소는 문자열을 반환해 적용하는 행동 없이 inverse record만 종료한다. 이미 정렬된 순서는 `noop`이며 새 plan이나 성공을 만들지 않는다.

## 4. 차단 범위와 아직 필요한 선택

| 경우 | 이번 처리 | 원본·현행 기능과의 관계 |
| --- | --- | --- |
| unknown property | 새 reorder capability 차단 | 원본/현재 parser가 description으로 보존하는 정상 문법일 수 있음. grammar 오류라고 안내하지 않음 |
| table/CSV/TSV/공유 range/깨진 locator | 현재 validator 또는 실험 range gate에서 차단 | 일부 셀만 움직이거나 행 소유를 추정하지 않음 |
| 중복 property | 차단 | parser가 읽더라도 단일 필드 owner로 승인하지 않음 |
| 본문 사이 일반 문장/Flow anchor/shared schedule | 차단 | 다음 Item이나 이전 Item의 내용으로 조용히 귀속시키지 않음 |
| Step 횡단/다른 full tuple | 차단 | 기존 v4.1 이동 기능이나 개인 global order 정책을 바꾸지 않음 |
| 미정/relative/반복/반복 종료 | 차단 | 날짜순 대표 위치·반복 occurrence별 원문 복제를 새로 정하지 않음. 기존 반복 기능은 그대로 |
| 혼합 EOL/CR 단독/경계를 넘는 selection | 실험 범위 밖 | byte/selection 보존 규칙을 넓히기 전 별도 fixture와 결정 필요 |
| 일반 입력이 membership/줄 위치를 변경 | 기존 capture 폐기 | 현재 C2의 추가·삭제 수용/retained refs를 막는 계약 아님. K4 capture만 current typed owner 집합에 묶음 |

가장 좁은 구현에 새 영구 정책이 꼭 필요한 것은 아니다. 고정 날짜·ordinary·동일 Step·명확한 body/gap만 지원하고 나머지는 원문 편집으로 남길 수 있다. 다만 첫 제품 planner 전에 **blank gap 귀속과 selection 밖 지원 범위**는 root가 기술 계약으로 고정해야 한다. 미정·상대·반복의 정렬 위치나 Step 횡단을 지원하려면 원본 근거를 더 확인하고 필요한 의미 선택만 별도로 올린다.

## 5. 제안 상태표 — 실제 UI/저장은 모두 미구현

| 상태/행동 | 원문·binding·선택 | 쓰기/초점·실패 경계 |
| --- | --- | --- |
| Calendar 열기/render/월 이동 | WorkingSource 그대로 | 0 native edit, 0 draft write. 정렬 성공 표시 없음 |
| 명시 날짜순 요청 | 현재 document/revision/raw/epoch·parser/범위 확인 | 정상 capability에서만 preview. 불명확 범위는 이유+원문 편집 경로 |
| preview | before/after 순서와 영향 범위, 선택 Item owner를 메모리 보유 | 0 durable write. 입력·IME·scope drift 관측 시 옛 preview 폐기 |
| 같은 순서 | 원문/선택 그대로 | 성공/Undo/새 revision 없이 닫을지 제자리에 둘지는 후속 UI 검토 |
| 취소/Escape | retained textarea·선택·scroll 복귀 | 0 writer. 새 문서/다른 source owner 재활성 금지 |
| 명시 적용 | 실제 native transaction 1 + WorkingSource revision 1의 원자 후보 | 이 단계 미구현. lock/쓰기 직전과 readback 후 exact owner 검사 필요 |
| 저장 실패 | 자기 candidate 소유를 확인한 복원만 허용 | 이전 A·native history·binding을 함께 보존. 외부 B이면 덮지 않고 uncertain/recovery |
| 성공 뒤 일반 typing | 새 raw/position에 맞는 binding 유지 또는 명시 invalidation | 기존 source snapshot·saved copy·library·C2 store 쓰기 없음 |
| Undo | 직전 단일 source transaction의 raw·binding·selection 복원 | native Undo를 실제로 실행해 durable result와 같은지 확인해야 함. 실험 inverse와 구별 |
| Undo 뒤 Redo | 같은 owner와 대응표로 다시 이동 | 실제 native redo와 history 중간 삽입 미검사 |
| 외부 변경/관측 ABA | 옛 capture·late callback 종료 | bytes가 다시 A여도 epoch stale은 되살리지 않음. 새 명시 preview만 새 capture |
| reload | durable raw를 실제 decoder로 읽음 | memory capture 소실. line index 재materialize로 old binding을 되살리지 않음 |

시뮬레이션의 inverse는 **같은 메모리 capture 문맥에서 가상 afterRaw를 역순열하는 함수**다. 실제 적용 후 새 revision/epoch를 발급·검증하는 adapter가 아니다. 테스트에서는 비교할 raw만 afterRaw로 바꾸며 capture scope는 유지한다. 이 산술 증명을 제품 commit 후 freshness/Undo 권한으로 소비하면 안 된다.

## 6. 작은 후속 구현 gate

1. **순수 WorkingSource preview 모듈:** 테스트 안의 알고리즘을 그대로 제품으로 승격하지 않는다. actual WorkingSource document의 private binding producer·exact source range reader를 먼저 정의한다. source snapshot/개인 Flow DTO는 mutable 문서 권한이 아니다. genuine initial capture, strict input·unknown/accessor/cycle·foreign tamper, one-use late owner 검사를 제품 기준으로 새로 시험한다.
2. **binding 수명 계약:** 메모리 범위만으로 첫 기능을 만들지, reload 후 유지할 versioned draft field가 필요한지 정한다. 이 결정 전에는 legacy draft에 필드를 추가하거나 saved copy에 map을 저장하지 않는다. raw만 저장하고 기억 속 full refs가 reload 뒤 보존됐다고 가장하지 않는다.
3. **기존 native source helper 연결 조사:** 실제 K1-A/standalone helper가 한 transaction에서 raw와 selection·durable draft를 다루는 경로를 읽고 block permutation을 안전하게 받을 수 있는지 확인한다. 중복 제목·임의 typing·IME·Undo/Redo 후 binding sync까지 실제 테스트한다. 사용 중인 textarea를 remount하여 history를 버리는 해법은 제외한다.
4. **실제 적용 fault/상태 원자성:** read-only preview와 apply 권한을 분리한다. draft quota/readback/자기 candidate rollback/외부 B/관측 ABA/lock+rAF owner 종료/reload가 새 RED 계획이다. writer0 시뮬레이션의 PASS로 대체할 수 없다.
5. **UI 승인:** 명시 action·같은 Step preview·취소·결과/Undo 및 error/recovery의 실제 5 viewport·키보드·48px/hit·native selection을 별도 검증한다. 운영 writer·publish·새 source candidate는 이 기능을 만드는 우회로가 아니다.

기술적으로 먼저 넘길 수 있는 최소 목표는 1번의 **write 0 preview+private range binding**이다. 2–5번이 채워지기 전 실제 저장/원문 적용 버튼은 연결하지 않는다. anchor·포함/제외·C2 membership 변경을 이 reorder 구현과 한 거래로 묶지 않는다.

## 7. 실제 검증 범위와 기록

신규 등록은 **WS01–WS09 9개**다. 실제 제품 parser/materializer/source validator를 초기 fixture와 확인에 사용했고, 새로운 순열·역순열 함수는 이 검사 파일 안에서만 실행했다. 미래 제품 API mock이나 UI PASS가 아니다.

| ID | 실제 검사 | 범위 밖 |
| --- | --- | --- |
| WS01 | Item+properties+subchecks exact 이동, 동일 제목 이웃 Step 그대로, source snapshot 불변, inverse | native source 수정/저장 |
| WS02 | 날짜→종일→시각→source tie, 같은 제목·같은 body의 distinct ref | 미정/상대/반복 정렬 의미 |
| WS03 | LF/CRLF×끝 개행 유무×gap 두 종류의 8변형, 내부 blank 포함, exact inverse | mixed EOL 일반 지원 |
| WS04 | forward/backward/caret 3변형, emoji 포함 UTF-16 선택 slice와 inverse | DOM selection/scroll/IME/native Undo |
| WS05 | no-op/cancel/cross-owner selection·clone/reuse 거절 | 제품 helper/취소 UI |
| WS06 | unknown/shared/prose/table/duplicate 속성, 실제 lineage locator 손상, explicit Step gate | 전체 grammar의 새 지원 판정 |
| WS07 | 실제 parser가 읽는 미정·상대·반복과 mixed EOL의 simulation 차단 | 기존 recurrence 동작 변경 |
| WS08 | exact document/revision/Flow/raw/epoch, 관측 ABA latch, 다른 사본, inverse stale | 실제 storage event/다중 탭 |
| WS09 | 재materialize ref 재발급 위험 실제 확인, 순열 table에서는 기존 binding 보존 | 기존 UI의 잘못된 저장을 재현한 것 |

첫 실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/working-source-order-simulation-first-2026-09-06T07-25-38-192Z.json`)은 9/9 PASS, fail/skip 0이다. 첫 strict (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/working-source-order-strict-first-2026-09-06T07-25-39-130Z.json`)는 하니스 오류 4개였다. `assert.equal`로 이미 좁혀진 실패 branch에서 reason을 다시 읽는 3곳과 readonly 손상 fixture 대입 1곳이다. 원본 test SHA `0FE9B9D5D9881EC13DC1BAE7F3C304A5AFFD867B50C3395526088E6EBA7993AB`를 `output/poc-gap-implementation/k4/before-working-source-order-type-correction-20260906-01/`에 보존했다. 새 파일 안에서 타입과 selection expected slice 표현만 정정했으며 기존 assertion 의미를 완화하지 않았다. 이 이력은 제품 RED→GREEN이 아니다.

타입 정정 후 재검 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/working-source-order-simulation-final-2026-09-06T07-32-19-844Z.json`)은 9/9 PASS, fail/skip 0, strict (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/working-source-order-strict-final-2026-09-06T07-32-20-748Z.json`)는 diagnostics 0이었다. skill sync (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/working-source-order-skills-check-2026-09-06T07-32-22-886Z.json`)와 문서 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/working-source-order-docs-first-2026-09-06T07-32-23-425Z.json`)도 PASS(16 required files / 6,749 local links)였다. 이어 증거 링크 추가 뒤 문서 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/working-source-order-docs-final-2026-09-06T07-33-10-328Z.json`)는 16 / 6,779 PASS였다. 각 검사의 실행 시점을 보존한다.

마지막 self-review에서 inverse mismatch 뒤 inverse만 종료되고 capture가 재사용될 수 있는 **실험 하니스 결함**을 찾았다. 같은 WS08 안에서 inverse stale→원문 A 복귀→옛 preview 거절을 추가하자 8 PASS / 1 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/working-source-inverse-latch-red-2026-09-06T07-34-41-314Z.json`)를 확인했다. 테스트 안의 inverse mismatch에도 capture stale latch를 올리는 최소 수정 후 최종 9/9 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/working-source-order-final2-2026-09-06T07-35-06-992Z.json`), 최종 strict 0 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/working-source-order-strict-final2-2026-09-06T07-35-07-778Z.json`)을 확인했다. 수정 전 9 PASS 파일·문서와 강화 RED 파일은 `output/poc-gap-implementation/k4/before-working-source-inverse-latch-20260906-01/`에 따로 보존했다. 제품 기능의 RED나 수정으로 합산하지 않는다.

8/3 fixture 변형과 재실행은 신규 등록 수에 더하지 않는다. storage port/제품 writer/브라우저/native Undo 실행 0이며, 이는 코드 경계상 호출 경로가 없다는 사실이다. 운영 storage API 감시를 실제 브라우저에서 했다는 뜻이 아니다. commit/push/PR/deploy/관찰 사용자 검증은 모두 0이다.

## 8. 직접 검사한 제품 소스 고정값

9개 실행의 before/after SHA equality는 아래 다섯 파일에만 적용한다. 전체 repo·root 동시 작업·생성 HTML의 동결을 주장하지 않는다.

| 파일 | SHA-256 |
| --- | --- |
| `personal-workspace-poc-authoring.ts` | `512072EA2EADE3DB2D826A595DD74042507B9CA7BF65D95D501C315D3702836E` |
| `personal-workspace-poc-authoring-fidelity.ts` | `A28981054BF696F2B160FE402797ADC9CE0D46D65003303AE88A5E64AD677DC7` |
| `personal-workspace-poc-source-attributes.ts` | `684D5753193FD2B526342DF1A3925DFB1DE9D3BBC42705EF0D2678D3C28C3E4B` |
| `personal-workspace-poc-contract.ts` | `89BC25256E6E9251C73820A3D719290C3D1117F00B2F741DC8B43A6F15F2131B` |
| `personal-workspace-poc-state.ts` | `7FDB9D4E1B117E50DCF30DD36D781CF190FCAC9B0A89D9CCA62BC89D769A4A10` |
