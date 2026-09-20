# FlowMe 통합 PoC P3-C 검증 예시·StructureDraft 계약

## 목적

P3-B 기준 primary gap 14건 중 `D2-023 실제·검증 콘텐츠 예시`와 `D2-056 StructureDraft/compiler versioned internal asset` 두 건을 함께 닫는다. 이미 테스트로 동결된 31개 원문 사례를 사용자가 찾고 읽고 재생할 수 있게 하고, 개발2의 깨끗한 P0.2 기준선에 있는 재귀 StructureDraft·결정적 compiler·19-rule catalog·sidecar를 PoC 전용 자산으로 연결한다.

이번 단계는 일반 메모 작성 경험을 바꾸지 않는다. 작성 틀은 빈 골격이고 검증 예시는 완성된 원문 사본이다. 두 자산은 이름, 화면, 전환, provenance를 섞지 않는다. 질문·설명·예시·placeholder는 사용자가 명시적으로 `이 예시로 시작` 또는 `글 만들기`를 실행하기 전에는 원문이 될 수 없다.

## 경계

- 진입점은 `/my?personalWorkspacePoc=v1`, 작성 화면은 `/flows/new?personalWorkspacePoc=v1` exact query만 허용한다.
- 기본 `/my`, 기존 운영 key/schema/writer, 기존 Flow 원문은 바꾸지 않는다.
- PoC write는 `flow:poc:personal-workspace:v1:*`만 허용한다.
- StructureDraft sidecar 고정 key는 `flow:poc:personal-workspace:v1:structure-template-sidecars:p0.2`다.
- 기존 authoring FNV fingerprint/CAS는 유지하고 StructureDraft의 SHA-256 `raw-v2` fingerprint를 별도로 검증한다.
- 검색·필터·목록 선택·preview·취소·Escape·outside close·pointer cancel·비어 있지 않은 원문·같은 bytes·손상·unsupported·stale·저장 실패는 source/workspace/operating mutation 0이다.
- materialize는 비어 있는 같은 편집기에서 명시 행동으로만 한 번 실행하며 native Undo 한 번으로 되돌린다.
- AI, 외부 조회, 공개 후보, account/cloud, 운영 migration, 배포는 제외한다.

## 세 결과물의 역할

| 결과물 | 이번 단계에서 보존하거나 연결할 것 |
|---|---|
| v4.1 개인공간 | exact gate, 흰 본문·평면 목록·청록 강조, 개인 실행 projection, 이동·완료·Undo·reload, 운영 데이터 불변 |
| 개발1 | 네 saved-plan origin, 충돌 없는 identity, 기존 Flow 상세 no-write projection |
| 개발2 | 31개 검증 코퍼스, 일반 텍스트 우선 작성, SourceRow→Item→Step→Flow 경계, P0.2 StructureDraft/compiler/catalog/sidecar |

## D2-023 판정 단위

| ID | E4 수용 조건 |
|---|---|
| D2-023.1 | 31개 ID·순서·raw bytes와 `기본 1 / 실제 콘텐츠 8 / 날짜·반복 11 / 이전 입력·표 6 / 오류 입력 5` 그룹을 동결한다. |
| D2-023.2 | 각 사례의 이름, source shape, provenance, upstream boundary, 기대 Item 수와 보존 방식을 표시한다. |
| D2-023.3 | 작성 틀과 분리된 `검증 예시` 탐색기에서 검색·그룹 필터·전체 원문 preview를 제공하고 탐색 중 write는 0이다. |
| D2-023.4 | 선택한 사례를 현재 parser/result에 재생하며 React와 독립 HTML의 source bytes·의미가 같다. |
| D2-023.5 | 비어 있는 working source에서 명시 행동으로만 exact bytes를 한 번 넣고, 비어 있지 않은 원문·취소·Escape에서는 0건이다. |
| D2-023.6 | unknown/corrupt/unsupported catalog는 fail-closed하고 source에 없는 Item·날짜·행을 합성하지 않는다. |

## D2-056 판정 단위

| ID | E4 수용 조건 |
|---|---|
| D2-056.1 | catalog version, StructureDraft contract version, snapshot manifest와 파일 SHA를 고정하고 strict validation한다. |
| D2-056.2 | `p0.2` draft의 template/version/fingerprint/revision, 재귀 group, stable instance ID/order, dismissed slot, materialized 상태를 보존한다. |
| D2-056.3 | 3 archetype·6 positive fixture가 deterministic compiler로 expected raw source와 byte-identical하며 현재 parser에서 6/6 issues 0이다. |
| D2-056.4 | shared 2 + template 17 = 19 validation rule과 20 negative patch가 exact code/scope/slot으로 materialization을 차단한다. |
| D2-056.5 | 질문·설명·예시·placeholder·빈 slot/group·가짜 source row는 compiled source에 들어가지 않는다. |
| D2-056.6 | 빈 source sidecar reload와 explicit one-transaction materialize를 제공하고 wrong version/corrupt/fingerprint/stale/IME/save failure는 bytes를 보존하며 fail-closed한다. |

두 부모 요구는 독립 판정한다. 31개 예시가 완전하지 않으면 StructureDraft가 통과해도 D2-023은 실패하고, 재귀 draft·sidecar·19-rule·결정적 compiler가 없으면 예시 UI가 통과해도 D2-056은 실패한다.

## 정보 구조와 UX

- `입력 / 결과 / 내 초안` navigation은 유지하고 4번째 주 navigation을 만들지 않는다.
- 입력 화면의 작성 틀 보조행 옆에 `검증 예시` 보조행을 둔다.
- 작성 틀의 ghost toggle 문구는 실제 예시와 혼동되지 않도록 `빈칸 힌트`로 부른다.
- 검증 예시 탐색기는 이름·형태·경계를 검색하고 다섯 그룹으로 필터한다.
- 목록 선택은 preview만 바꾸며 `이 예시로 시작`이 유일한 적용 행동이다.
- 원문이 비어 있지 않으면 적용 행동을 막고 현재 원문 보존 이유를 표시한다.
- 390×844와 375×812는 목록→상세 두 단계, 844×390·1024×768·1440×900은 가능한 너비에서 목록/상세를 함께 표시한다.
- 열 때 검색에 focus, Enter/Space로 사례 선택, Escape는 현재 탐색기만 닫고 opener로 focus를 돌린다. 성공 뒤 원문 편집기로 focus를 옮긴다.
- 긴 원문은 preview 내부에서만 세로 스크롤하고 page horizontal overflow를 만들지 않는다.

## versioned read-only asset registry

UI는 하나의 결정적 registry를 읽는다.

- `corpus`: 31개 기존 lossless case를 exact bytes로 참조한다.
- `structure`: P0.2 positive fixture 6개를 pinned compiler로 다시 만들고 expected bytes와 비교한 결과만 노출한다.
- 각 항목은 stable ID, group, label, description, rawText, provenance, boundary, expected item count, source kind, contract version을 가진다.
- registry 직렬화는 React와 single-file 생성기에 동일한 bytes를 공급한다.
- runtime browse state는 저장하지 않는다. source materialization만 기존 PoC working-draft transaction을 사용한다.

## StructureDraft 연결

- 기준선은 `D:\flowme2605\flow-text-authoring-structure-template-p0-baseline-20260829`의 clean HEAD `974db8f248f04641dd086817dc9c50436770356e`다.
- 원본 core를 축약 재작성하지 않고 PoC-local 모듈로 가져온다.
- 원본 sidecar key는 사용하지 않고 위 PoC 고정 key로 감싼다.
- positive fixture는 catalog definition + StructureDraft로 compiler/materialization planner를 실행한다.
- planner가 ready이고 compiled bytes가 fixture `expectedRawText`와 정확히 같을 때만 registry에 포함한다.
- editor 적용 직전 SHA fingerprint와 기존 editor snapshot CAS를 모두 확인한다.

## 성공 판정

P3-C 관련 focused model/component/standalone/browser gate가 모두 PASS하고, 두 부모의 모든 하위 조건이 current E4이며, prefix 밖 write/remove/clear 0과 non-PoC `flow:*` bytes 불변이 fresh evidence로 확인됐을 때만 두 부모를 `충족 E4`로 승격한다. 목표 집계는 `133 충족 / 8 부분 / 4 미충족 / 11 의도적 변경 / 12 제외`, primary gap 12다.

실제 Android Chrome, iOS Safari, screen reader, 관찰 사용자 검증은 자동 브라우저 검사와 별도로 보고한다.
