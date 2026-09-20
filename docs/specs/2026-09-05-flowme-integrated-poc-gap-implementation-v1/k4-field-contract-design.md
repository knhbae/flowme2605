# K4-D — 기준일·포함 범위·WorkingSource 정렬 설계 검토안

2026-09-06. 상태는 **설계 검토안**이다. 제품 구현·운영 연결을 승인하거나 K4 요구를 PASS로 바꾸지 않는다. 신규 문서와 독립 characterization 검사 (로컬 전용 근거: `./k4-field-contract-characterization.test.ts`)만 작성했다. 기존 제품·검사·사용자 HTML·보고서·감사 원장은 수정하지 않았다. 원본 대화 전체를 다시 읽었다는 주장은 하지 않는다.

## 1. 범위와 직접 읽은 근거

[실행 계획 §11](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md)의 K4-D 다섯 단계와 [개선 설계 §8](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md)의 gate를 기준으로 한다. C3 로컬 색상·행동 크기 작업, K4-T 감사 원장 정정은 이 문서의 제품 범위가 아니다. 아래 코드 행은 조사 시점 기준이다.

| 요구 | 직접 확인한 원본·후속 승인 | 현재 경계 |
| --- | --- | --- |
| D1-006/023, K-D1-03 기준일 | D1 화면 (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html`) 821–841: 이사일을 먼저 고른 뒤 D-30/D-10/D-Day를 실제 날짜로 미리 봄. 896–901: 기준일과 변경 결과를 최종 확인 | Calendar 월 이동은 이 요구를 대신하지 않는다. 원본의 예시 날짜·24개는 제품 fixture나 실제 사용 근거가 아님 |
| D1-018, K-D1-05 포함 | 같은 원본 856–864: 선택/전체·구간별 포함 수, 원본 기준 재확인. D1 편집 정본 (로컬 전용 근거: `../../../../flow-plan-edit-trash-structure-unification-20260813/docs/specs/2026-08-13-plan-edit-trash-structure-unification/spec.md`) 23–35, 67–74: staged 거래·날짜 의도·reload의 inclusion 보존 | 부분 집합을 만들기 위해 full-order guard를 느슨하게 바꾸면 안 됨 |
| D2-018, P3K-D2-08 원문 날짜순 | D2 grammar §10–11 (로컬 전용 근거: `../../../../flow-text-authoring-review/docs/specs/2026-07-28-flowme-text-authoring-ux-v1/authoring-grammar-logic.md`) 253–283: Calendar 표시 정렬, 명시 action에서만 같은 Step의 Item+속성+하위 체크 block 이동·revision 1·Undo·identity/lineage 유지 | 작성 중 WorkingSource와 이미 저장된 사본/SourceSnapshot을 구별. 개인 순서 편집은 원문 정렬이 아님 |
| v4.1 실행 보존 | v4.1 정본 (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`) 12–21: 실행 날짜/목록 순서/폴더·Flow 소속 분리, 같은 위치 무변경, 시간순/직접 순서 | anchor·Plan membership·원문 정렬 때문에 실행 날짜/수동 순서/완료를 다시 쓰지 않음 |
| 이미 정해진 owner | [P3-F 결정](../2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md) 61–82: PersonalOverlay의 날짜/순서/포함, 별도 ExecutionRun, immutable SourceSnapshot와 mutable WorkingSource | 개인 포함 여부의 owner를 다시 사용자에게 선택시키지 않음. 실제 field/version/capability 계약은 별도 |
| 개인 날짜 3상태 | [Stage 3](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-3-contract.md) 42–55, 89–102와 Map 날짜 parity (로컬 전용 근거: `../../../../flow-mvp/docs/pr-history/2026-08-13-flow-map-item-date-parity.md`) 23–32, 45–51 | fixed pin은 source와 동값이어도 보존. reset만 현재 Plan anchor의 원문 투영을 다시 따름. 원래 미정과 명시 미정을 임의로 합치지 않음 |

옛 A0/P0의 제외 문구로 후속 승인된 회차·CreatorDraft·C2 원문 비교를 없애지 않는다. 반대로 그 기능이 존재한다는 사실도 K4의 새 owner/field를 승인하지 않는다.

## 2. 기준일 네 값과 현재 구현

| 값 | 의미·owner | 허용 동작 | 지금 혼동하면 안 되는 값 |
| --- | --- | --- | --- |
| `monthCursor` | 보고 있는 달, 메모리 presentation | 이전/다음 달, 복귀 | 현재 Result의 `baseDate`를 개인 anchor write로 해석하지 않음 |
| `selectedDate` | 그 달에서 선택한 날짜, 메모리 presentation | 날짜 행 선택·조회 | 그 날짜로 전체 Plan이나 실행 Items를 옮기지 않음 |
| source anchor | 실제 원문이 명시한 기준일, source/authoring owner | 읽기. WorkingSource의 별도 명시 편집만 해당 owner 사용 | saved record의 anchor, localToday, sourceTimingLabel에서 만들어 내지 않음 |
| personal anchor | 개인 사본 기준일. 기존 imported personal 값과 새 PoC override intent를 구별 | 지원 capability에서 staged preview→최종 Plan 저장 | 보기 월·원문 기준일·개별 fixed/미정/실행일과 별개 |

현재 [Result projection](../../../lib/flow/personal-workspace-poc-result-projection.ts) 520–588은 계획 날짜와 실행 placement를 분리한다. 1096–1103의 `baseDate`/`selectedDate`는 Calendar lens 입력이고, 1144–1151의 Plan 날짜 해석에는 전달하지 않는다. [Presenter](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocResultPresenter.tsx) 484–485의 이전/다음 버튼도 월 이동이다. standalone `model.js:1301–1303`의 `baseDate`도 Calendar 조립 입력이다.

현재 [read model](../../../lib/flow/personal-workspace-poc-read-model.ts) 1387–1394는 Map snapshot 또는 saved record의 anchor를 `existing-personal`로 읽고, 1483–1485도 그 owner를 보존한다. 따라서 `flow.anchorDate` 존재만으로 원문 기준일을 표시하거나 원문 수정 권한을 발급할 수 없다. 실제 source anchor가 없으면 없다고 남긴다.

[공유 계약](../../../lib/flow/personal-workspace-poc-contract.ts) 74–117에는 source/기존 개인 schedule의 `day-offset/absolute/none/unsupported`, 실제 anchor 입력과 직접 override를 구분할 수 있는 자료가 있다. 다만 375–408의 legacy fallback은 표시 timing label에서도 offset을 읽는다. 기존 read 호환을 깨지 않되, **이 fallback 하나만으로 K4의 새 계산·저장 capability를 부여하지 않는다.** 검증된 raw/typed source schedule 및 full identity 결합이 필요하다. D-offset을 시각으로 파싱하지 않는다.

### 2.1 최소 anchor preview 제안 — 아직 API·제품 없음

메모리 `inspect/preview`는 실제 source-only schedule catalog + exact Flow/Item refs + 현재 personal intent + execution 상태를 받는다. 읽기 성공과 편집 가능성을 분리하고, UI boolean이나 단순 origin 문자열로 권한을 만들지 않는다. invalid source/unsupported schedule/기준 소유 불명/foreign ref에는 이유를 돌려주며 날짜를 추정하지 않는다.

새 개인 anchor 후보로 계산할 때의 보존 순서는 다음과 같다.

1. 실행 fixed/미정 placement는 기존 값 그대로. 계획 preview와 실행 위치를 각각 표시한다.
2. PoC Item fixed pin/명시 unscheduled는 그대로. source 동값 pin도 자동 삭제하지 않는다.
3. imported 개인 직접 fixed/미정은 그대로. imported `day-offset`처럼 기준일을 사용하는 schedule은 그 owner와 적용 범위가 증명된 경우에만 새 계산 후보로 포함한다.
4. 원문 absolute date는 그대로. 원문 relative offset 중 scope가 입증된 것만 후보 anchor로 재계산한다.
5. 원래 undated는 계속 미정. anchor 누락·손상에는 localToday나 선택일을 넣지 않는다.

같은 source snapshot을 사용하는 A→B→명시 A와 `inherit`는 다를 수 있다. 숫자가 같다는 이유만으로 override intent를 지우지 않는다. 원문 기준일 변경을 따라갈지/개인 기준일로 고정할지와 실제 날짜 비교는 별개의 계약이다.

화면 초안: Plan의 지원되는 일정 영역에서 현재 기준일의 owner를 읽고 새 개인 기준일을 고른다. 바로 아래에 달라지는 **계획** 날짜 n개와 유지되는 fixed/미정/실행 위치를 구분한다. 취소/Escape는 부모 draft 범위로 돌아가며 write 0. 저장은 기존 Plan 최종 거래만 사용한다. Calendar 상단의 월 이동 control을 이 편집기로 바꾸지 않는다.

## 3. 포함·제외·복원 — 순열과 membership을 분리

현재 [React Plan draft](../../../lib/flow/personal-workspace-poc-plan-editor.ts) 96–110에는 anchor나 inclusion field가 없다. 789–817은 전체 Item과 guard의 exact membership을 요구한다. [State validator](../../../lib/flow/personal-workspace-poc-state.ts) 328–379는 overlay unknown key를 거절하고, 742–747은 전체 순열을 검사한다. [Result](../../../lib/flow/personal-workspace-poc-result-projection.ts) 1135–1140도 같은 경계다. standalone P의 `fullPermutation`, `normalizeStructureDraft`도 전체 refs를 요구한다.

**개인 순서의 전체 ref 집합을 줄여 제외를 저장하지 않는다.** 전체 owner catalog/전체 order는 보존하고, 별도 membership intent로 실행·결과에 포함할 subset을 투영해야 복원이 가능하다. Timeline `excluded`는 기간 표시 정책이고, trash/tombstone은 삭제·수명 상태다. 두 필드를 Plan 제외로 재사용하지 않는다.

| 상태 | 화면과 허용 행동 | 보존해야 하는 값·쓰기 |
| --- | --- | --- |
| 포함 · committed | 현재 Plan에 포함된 행. 제외를 명시 선택 가능 | 전체 identity/원문·criteria/개인 값/실행 상태 유지 |
| 제외 후보 · staged | 포함 수 감소와 제외될 행을 부모 초안에서 확인. 즉시 복원 가능 | Item apply/preview/취소 모두 durable 0 |
| 제외 · committed | 별도 제외 목록에서 같은 Item을 확인·복원 | record 삭제 0, completion/occurrence/날짜/메모 유지 |
| 복원 후보 · staged | 이전 exact ref로 포함 후보 복귀 | 새 id·빈 메모·새 완료 초기값 생성 0 |
| 저장 실패/복구 | 입력과 포함 선택 유지, 현재 owner의 오류/복구 우선 | 기존 verified rollback/재시도 gate. 실패를 적용으로 표시하지 않음 |
| Undo | 이전 membership intent로 복귀 | 한 거래의 이전 전체 상태·metadata 복원. 새 무한 history 없음 |

### 3.1 이미 imported 단계에서 제외된 항목

`read-model.ts:1189–1201`은 Map의 `includedStepIdsByFlow`/`excludedStepIdsByFlow`에 따라 **PoC Flow Item catalog를 만들기 전에** 항목을 제거한다. 반면 [기존 Map result adapter](../../../lib/flow/effective-flow-map-result.ts) 187–284에는 validated canonical/excluded rows를 읽는 별도 경로가 있다.

따라서 지금 Flow `items`만 보고 `전체 원문 n개` 또는 `모든 제외 항목을 복원 가능`이라 표시하면 틀릴 수 있다. 첫 bounded 구현 후보는 **현재 검증된 사본 catalog의 Item만** 개인 제외/복원하고 imported 바깥 항목은 untouched로 두는 방식이다. 원문 전체 복원이 요구되면 실제 imported owner의 excluded catalog를 읽기 DTO로 공급하는 별도 gate가 선행해야 한다. 누락 row를 제목·local id·원문 문자열만으로 복구하지 않는다.

### 3.2 아직 고정하지 않은 field 의미

`includedRefs` whitelist와 `excludedRefs` blacklist는 새 source Item이 들어올 때 반대 결과를 낸다. 어느 것을 저장할지는 기술 이름만의 문제가 아니다. **기존 C2의 source 추가·삭제 수용·retained ref 동작은 유지**하고, 새 K4 capture를 현재 typed owner 집합·source version에 묶는다. 관측된 membership 변화 뒤에는 옛 K4 capture만 폐기하면, 후속 새 Item 기본 정책을 지금 결정하지 않고 동일 owner 집합의 제외/복원부터 검토할 수 있다. C2 전체를 membership 미지원으로 표현했던 초기 설명은 actual canonical/source-candidate 검사를 대조해 정정했다. 전체 제외(0개) 허용과 그 상태의 저장/빈 결과 문법도 직접 읽은 원본만으로 확정하지 않았다.

## 4. WorkingSource 날짜순 — 블록 이동이지 재인계가 아님

승인된 원안은 같은 Step 안에서 Item+속성+하위 체크 block을 함께 옮기는 명시 행동이다. Calendar 정렬, 개인 Plan 전체 order, 날짜 목록 TimelineOrder와 다르다. 이미 저장된 SourceSnapshot·기존 개인 사본의 raw·C2 candidate effective pointer를 이 작업에서 다시 쓰지 않는다.

### 4.1 현재 identity 위험의 실제 확인

[현재 Authoring materializer](../../../lib/flow/personal-workspace-poc-authoring.ts) 1094–1100은 section 최초 ID에 source line/title을, 1117–1122는 Item 최초 ID에 handoffId/sourceLine/sourceOrder를 쓴다. 이것은 최초 인계 알고리즘이며 기존 Item의 이동 identity map이 아니다. parse의 subcheckId도 703–708에서 source line에 의존한다.

신규 KD-C03은 같은 길이의 Alpha/Beta block을 뒤집어 **같은 handoffId로** 현재 materializer를 두 번 호출했다. 두 결과의 Flow ref와 Item ref 배열이 같아도 Alpha의 ref는 달라지고 이전 Alpha ref가 Beta를 가리켰다. 둘 다 메모리 후보이고 실제 저장하지 않았다. 이는 제품의 허용 update 경로가 이 재인계를 실행한다는 뜻이 아니라, **이 함수를 새 reorder 구현으로 재사용하거나 full-ref set 동일만 검사하면 안전하지 않음**을 보여 준다.

standalone P [B2 계약](./k3b-section-order-contract-diff.md) §2도 저장 raw/proof와 같은 membership·구간·source 순서를 전제로 한다. K4의 WorkingSource 변경을 기존 P capture에 몰래 끼워 넣거나, 기존 저장 사본 proof를 최신 raw로 rebind하면 안 된다.

### 4.2 최소 reorder planner 제안 — 아직 구현 없음

- 입력은 exact WorkingSource document/revision/raw와 검증된 block range·stable Item/subcheck binding이다. parse presentation DTO만으로 mutable source 권한을 만들지 않는다.
- preflight는 CRLF/LF, blank lines, 속성·하위 체크·URL·일반 문장·주석 등 모든 bytes가 한 소유 block 또는 움직이지 않는 경계에 정확히 귀속되는지 검사한다. 해석 불명 줄·중복 속성·table/shared schedule/깨진 range는 일부만 이동하지 않고 해당 요청을 차단한다.
- 정렬 키는 원안 Calendar의 날짜→종일→시각→기존 source order를 읽되, **Item block은 한 번만** 배치한다. 반복 occurrence를 각각 source block으로 만들지 않는다. 미정 Item과 날짜 해석 불가 Item의 정확 배치, 반복의 정렬 대표 날짜는 별도 확인 gate다.
- Step 횡단 이동 0. 블록 내부 byte 순서 0변경. 제목·line index로 id를 다시 발급하지 않고 같은 Item/subcheck binding의 새 range를 만든다. same-title/same-content 두 항목도 별개다.
- before→after reorder preview는 write 0. 취소·stale·같은 순서는 native edit/draft write/새 성공 0. 명시 적용만 한 native transaction + revision 1이며 직후 재분석에서 same owner/같은 필드/새 위치를 검증한다.
- 기존 K1-A native source 적용·durable draft writer의 실패/rollback/recovery를 재사용할 수 있는지 실제 함수 단위로 먼저 검증한다. 기존 `applyPersistedSourceHelper`나 standalone helper 경로에 정렬 payload를 임의 추가하는 구현 지시는 아니다.
- Undo는 source bytes+selection/scroll+block binding을 함께 복원해야 한다. 기존 사본·CreatorDraft library·C2 source store를 Undo 대상으로 확장하지 않는다. 원문 편집 owner/epoch가 끝나면 지연 apply/Undo 0쓰기다.

화면 초안은 WorkingSource 결과의 지원된 Calendar에서 `날짜순을 원문에도 적용`을 명시 선택→같은 Step의 변경 순서 preview→취소/적용이다. 지원되지 않는 문서에 활성처럼 보이는 버튼을 만들지 않는다. 단일 textarea/native history, IME 중 apply 차단, 적용 후 같은 논리 Item의 selection을 유지한다. 모든 source byte를 canonical Markdown으로 재출력해 정렬을 우회하지 않는다.

## 5. 버전·legacy·원자성 연결 gate

| 계층 | 현재 보호 계약 | 후속 구현에서 먼저 증명할 것 |
| --- | --- | --- |
| React state/Plan | state v1 strict overlay, Plan v1 full guard. missing 새 field는 기존 의미 | 현재 v1을 느슨하게 만들지 않고 새 branch 또는 별도 strict metadata를 검토. numeric version/key명은 아직 확정하지 않음 |
| standalone P | `personalPlanContextV1` 내부 v1/v2 dual decode, v2 구조 metadata와 전체 order/capture | 옛 branch exact 유지. absent 개인 anchor/membership은 기존 동작. baseline owner 없는 데이터는 읽기만 |
| C checkpoint | v2 envelope, legacyBaseRaw 연결, state/actual Undo의 snapshot provenance | 새 metadata를 current뿐 아니라 reachable Undo에서도 검증. old raw 자동 migration·재작성 0 |
| E2 | v1–v4 decoder, 현재 source-bound 구조 draft v2/journal v4 | 새 draft가 기존 journal로 가장되지 않음. before+captured source로 단일 candidate 재도출, private token 직렬화 0 |
| PD/source | actual current+Undo 표시 gate, source-read failure와 absence 구별 | anchor/membership의 미지원 source 합성도 fail-closed. valid raw→개인 표시 fallback으로 우회하지 않음 |
| D 영구 삭제 | target exact owner scrub와 보존 provenance | 새 metadata가 대상 원문/개인 정보라면 exact ref 제거 범위에 포함. 이웃·unknown owner는 기존 보수적 경계 유지 |
| WorkingSource | native 원문/history + draft 저장, 개인 저장과 별개 | raw+identity binding 원자성 필요. 새 saved copy/old source/history owner를 쓰는 방식을 금지 |

저장 전 fresh source/state bytes, 관측 ABA epoch, exact owner/flow refs, 현재 source capability를 확인한다. lock 획득 후와 실제 write 직전·readback 후에도 필요한 guard를 유지한다. lookup·preview·staged·close에는 write 0이다. 성공 뒤에 scope가 바뀌어도 이미 확인된 실제 저장을 취소했다고 속이지 않고 늦은 표시 owner만 폐기한다. rollback은 자기 candidate 소유 확인 후에만 수행하며 외부 B를 덮지 않는다.

현재 [P/E2/PD](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-display.js) 경로를 새 정책으로 대체하지 않는다. `PD:128–150`의 current/actual Undo pair 검증과 `E2`의 actual source read/epoch·복구 재개는 최소 보존 경계다. 일반 writer에 capability boolean을 전달해 새 branch를 열지 않는다.

## 6. 기존 승인으로 진행 가능한 것 / 확인이 필요한 것

### 지금 기술 설계·제한된 순수 preview로 진행 가능한 범위

- 네 날짜 값 분리, 검증된 상대 일정의 read-only 계산, fixed/미정/실행일·owner provenance 보존.
- 현재 검증된 동일 사본 Item 집합에서 포함/제외/복원의 staged 상태표. source/완료/criteria/전체 order를 보존하는 별도 membership 모델 후보 비교.
- 같은 Step raw block의 lossless range 검증·순서 preview·stable binding 설계. 미래 제품 API를 mock하여 구현 PASS로 만들지 않음.
- 기존 v1/v2/v3/v4 데이터의 untouched read와 unknown/foreign/손상 fail-closed, 정확 source/state drift·ABA/복구 fixture 준비.

### root 검토 후 구현 묶음에 고정할 기술 선택

1. typed source capability가 실제 존재하는 origin부터 시작하는 작은 지원 matrix. imported legacy fallback이 있는 것만으로 확대하지 않는다.
2. 새 metadata/draft/journal branch의 구체 번호·strict 모양과 명시 저장 시점. 자동 migration 없이 구현 가능한지 검증한다.
3. WorkingSource용 지속/메모리 stable block binding을 어디서 유지하며 native Undo와 어떻게 동기화할지. 재인계 helper 재사용은 답이 아니다.

### 원본·후속 근거만으로 아직 확정하지 않은 의미

| 선택 | 영향 | 현재 추천하는 보수적 경계 |
| --- | --- | --- |
| 개인 anchor 해제의 의미: 원래 개인 anchor/원문 anchor 따르기 vs 상대 날짜 전체 미정 | 모든 상대 Item의 날짜·반복 시작에 영향 | 우선 유효 날짜 지정 preview만. `clear`를 추가하지 않고 명시 inherit/reset 의도부터 확인 |
| Map child별 anchor vs 저장된 Map 전체 anchor | 같은 Map의 다른 child까지 바뀔 수 있음 | 이번 선택 full Flow tuple 밖 write 0. 공통 anchor의 일괄 변경은 별도 승인 없으면 차단 |
| imported 바깥 제외 Items까지 복원, 전체 제외 허용 | 전체 수/빈 Plan 저장·복원 범위가 달라짐 | 현재 검증된 사본 catalog를 사실대로 표시. 없는 owner를 창작하지 않음 |
| source membership 변경 후 새 Item의 기본 포함 | whitelist/blacklist 선택이 다음 원문 변경 때 다른 결과 | 기존 C2 처리는 유지하고 옛 K4 preview capture만 폐기. 이미 새 membership이 저장된 뒤의 source 변경은 별도 결합 정책 gate |
| source 날짜순에서 미정·반복·해석 불가 block의 위치 | source bytes 순서·반복 Item 맥락이 달라짐 | 순수 preview에서 케이스를 보여 준 뒤 결정. 자동 Step 횡단/occurrence별 복제는 금지 |

위 선택을 사용자에게 한꺼번에 질문하지 않는다. 좁은 구현에 실제 필요한 선택만 근거·영향과 함께 root에 올린다. PersonalOverlay owner, source snapshot 불변, execution 별도, 한 거래/Undo, 운영 key 금지는 이미 결정된 내용이다.

## 7. 검증 — 실제 실행과 다음 계획 구분

신규 characterization 4개 (로컬 전용 근거: `./k4-field-contract-characterization.test.ts`), 최종 실행 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/field-contract-characterization-final-2026-09-06T06-39-18-406Z.json`): **4/4 PASS**, 실패/skip 0. 최종 strict (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/field-contract-strict-final-2026-09-06T06-39-18-435Z.json`)는 diagnostics 0이다. 모두 기존 actual 함수의 현재 계약을 확인한 메모리 시험이다. K4 신규 기능 시험, 브라우저/기기/사용자 검증이 아니다.

첫 실행도 4/4 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/field-contract-characterization-first-2026-09-06T06-33-03-192Z.json`)였으나 첫 strict (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/field-contract-strict-2026-09-06T06-38-39-997Z.json`)에서 하니스 타입 오류 3개를 발견했다. KD-C01의 잘못된 `itemRef` 조회 2곳을 실제 Result의 `ref`로 고치고 실제 fixture refs와 직접 비교를 추가했다. 이미 assert로 좁혀진 실패 branch의 `reason` 접근 1곳도 수정했다. 최초 파일은 `output/poc-gap-implementation/k4/before-characterization-type-correction-20260906-01/`에 보존했다. 첫 단계의 날짜 불변 근거는 유지하되 identity 비교 근거는 최종 강화 검사로만 삼는다. 새 제품 결함이나 새 테스트 8개로 세지 않는다.

| 실제 ID | 확인한 사실 | 확인하지 않은 것 |
| --- | --- | --- |
| KD-C01 | Calendar cursor/선택일 변경에도 Item plan/effective date·source/state exact 유지 | 새 개인 anchor 재계산·저장 |
| KD-C02 | v1 unknown anchor 거절, subset order는 shape가 유효해도 full membership 검증 실패 | 새 포함/제외 기능 |
| KD-C03 | 같은 full ref 집합으로 재인계해도 block 이동 뒤 semantic owner가 바뀔 수 있음 | 기존 제품 UI가 그 잘못된 update를 실행함, stable reorder 구현 |
| KD-C04 | 실제 source parser의 leap-day 상대 날짜 계산, fixed/미정 분리, missing anchor 차단 | personal anchor/운영 source writer/round-trip 전체 |

초기 조사에서 정한 후속 8개 범주는 아래와 같다. 이후 anchor·포함·원문 정렬의 일부 순수 실험을 실행했으며 현재 범위와 남은 제품 검사는 [통합 gate](./k4-implementation-gates.md)에 연결한다. 아래 범주 전체를 실행 완료로 표시하지 않으며 origin/viewport loop를 신규 고유 테스트처럼 합산하지 않는다.

1. A01 네 값과 owner presence/absent/invalid; 월·선택일0write.
2. A02 상대/fixed source/개인 동값 pin/명시 미정/실행 placement/반복/윤일·연말 preview와 reset.
3. I01 include→exclude→restore exact ref/원문 criteria/개인 메모·날짜/완료·occurrence 보존.
4. I02 전체 order와 subset 별도, foreign/duplicate/unknown·imported 제외범위·빈 Plan gate.
5. W01 같은 Step block bytes 및 subcheck identity, 같은 제목/같은 내용, blank/CRLF/마지막 개행 round-trip.
6. W02 unknown/shared/table range·날짜 미정·반복 unsupported, Step 횡단0, 같은 순서0.
7. T01 staged/cancel0write, 최종1transaction, quota/readback/rollback/ABA/late callback, Undo/reload/legacy current+undo.
8. U01 양쪽 runtime 5 viewport·키보드·실패 원인/재시도·초점/selection/native history, 운영 prefix 밖 API/clear0.

문서와 harness의 기술 검증만 수행한다. full npm/build/현재 browser/실제 기기/배포/관찰 사용자는 이번 K4-D에서 미실행이다. C2 최종23 및 C3 과거 36회 48px 미달 측정은 별도 근거이며 여기에 합산하지 않는다. Figma 산출물은 없고 이 문서는 상태·소유권 설계다.

## 8. 조사 시점 코드 snapshot

다음 SHA-256은 characterization 실행 뒤 읽은 현 소스 식별이다. 전체 repo의 실행 전후 불변이나 제품 빌드 hash라는 주장이 아니다. 이 작업의 제품 수정은 0이다.

| 파일 | SHA-256 |
| --- | --- |
| `personal-workspace-poc-authoring.ts` | `512072EA2EADE3DB2D826A595DD74042507B9CA7BF65D95D501C315D3702836E` |
| `personal-workspace-poc-contract.ts` | `89BC25256E6E9251C73820A3D719290C3D1117F00B2F741DC8B43A6F15F2131B` |
| `personal-workspace-poc-read-model.ts` | `FDEADF37B9FED784A7214ED389DAF442724459EB14190ECF9F99C3339A8D6FCD` |
| `personal-workspace-poc-plan-editor.ts` | `34F10DD8BF914FFCDDC8F6AC18C5FCCB0958E891B709029894079B5930472569` |
| `personal-workspace-poc-state.ts` | `7FDB9D4E1B117E50DCF30DD36D781CF190FCAC9B0A89D9CCA62BC89D769A4A10` |
| `personal-workspace-poc-result-projection.ts` | `C57B08E4F6D9D4B6513E978D9E2D755B9E39A39297974F2901075315E5ACAB9F` |
| standalone `personal-plan-context.js` | `5F42761D3B16B7F552F8795095760E6F7FA83918DBF24CF7FEEC92A852C59B5A` |
| standalone `model.js` | `9DA7BB715907F42CD69E0940BF7C3C9A256EF81F7AC5726CA2B3CF918E55D038` |

권장 다음 순서는 **typed source capability/4값 preview 계약 → 같은 사본 membership 계약 → stable WorkingSource block binding**이다. 세 항목을 한 writer 변경으로 묶지 않는다. 이 문서는 root의 항목별 검토를 위한 패키지이며 K4 구현 gate가 전부 통과됐다는 완료 선언은 아니다.
