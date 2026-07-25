# FlowMe P33 Cross-entry Canonical Alignment 통합 실행 계획

작성일: 2026-07-24  
상태: **Implemented locally - owner publish approval required**  
계획 기준 `origin/main`: `e491d99ca61ecae4fd0dd009f785e737b6a59516`  
Production app release: `30281a7a8ea9bea1194b4104b5a49b6211c07e3b`  
Production: <https://flowme2605.vercel.app>  
실제 관찰 사용자: `0`

## 1. 목적

Claude Design과 Codex의 독립 검토를 종합해, Home, Flow 찾기, URL lookup, public 상세, 저장 결과, My Flow, Calendar, export가 같은 콘텐츠를 하나의 사용자 Flow로 이어주도록 P33을 단계적으로 실행한다.

이번 계획의 핵심은 새 플랫폼이나 새 IA를 만드는 것이 아니다. 이미 결정된 다음 계약을 실제 진입 경로와 저장 identity까지 일관되게 연결하는 것이다.

- 사용자는 하나의 Flow 객체를 본다.
- Home, Flow 찾기, URL lookup은 역할이 다르지만 같은 Flow로 이어진다.
- Flow Map은 사용자에게 별도 저장 객체로 경쟁하지 않고 내부 source bundle 또는 alias 역할을 한다.
- source, personal overlay, execution run, occurrence, export identity는 서로 분리된다.
- P32 focused My Flow workspace와 Calendar 실행 모델은 유지한다.

이 문서는 두 검토 결과를 그대로 병합하지 않는다. 합의점, 충돌점, 데이터 위험, UX 가설을 분리하고 각 단계의 중단 조건과 rollback을 고정한다.

## 2. 검토 입력과 증거 경계

### 2.1 Claude Design

원본:

`D:\flowme2605\flow-mvp\claude_work\FlowMe P31 구조 검토 요청_02.zip`

주요 내용:

- verdict: `bounded_cross_entry_alignment`
- 대안 B 추천
- current production 화면 8장
- proposed B 화면 7장
- 8 personas x 3 sessions
- Home, Find, save-before, result choice, receipt, duplicate reconciliation wireframe
- 24개 전체판과 5개 핵심판을 하나의 Flow와 scope preset으로 표현하는 가설

제한:

- 라이브 production 조작, console, screen reader, 1024/1440 overflow는 직접 검증하지 않음
- current screenshot, source, prior decision, reference pattern, heuristic simulation 중심
- 실제 관찰 사용자 `0`

### 2.2 Codex

원본:

`D:\flowme2605\flow-p33-cross-entry-independent-main\docs\content-audit\2026-07-24-flowme-cross-entry-canonical-independent-review-codex`

주요 내용:

- verdict: `canonical_flow_contract_reopen`
- 대안 B 추천
- current production interaction과 current source 재현
- 24-cell: supported 8, partial 15, missing 1
- unit 587/587, related serial E2E 14/14, URL-first targeted 1/1
- route, storage, run, occurrence, export identity 위험 분석
- read-only registry부터 시작하는 P33-01~07 제안

제한:

- review package는 read-only evidence
- 앱 코드 변경 없음
- 실제 관찰 사용자 `0`

### 2.3 판단 우선순위

1. current production interaction
2. current source와 storage path
3. current production screenshot
4. structured review evidence
5. current product decision
6. proposed wireframe
7. external reference pattern

자동화, screenshot, heuristic simulation은 실제 사용자 검증이 아니다.

## 3. 통합 판정

### 3.1 최종 프로그램 판정

**`bounded canonical contract implementation`**

Claude Design의 표현처럼 P26의 `one user-facing Flow object` 결정 자체를 뒤집을 필요는 없다. 그러나 Codex 판단처럼 현재 runtime에는 cross-entry canonical registry, alias resolution, canonical save identity, legacy reconciliation 계약이 없다.

따라서 다음 두 문장을 동시에 채택한다.

1. 제품 방향과 4탭 IA를 재설계하지 않는다.
2. canonical identity와 저장 경계를 새로 구현해야 하므로 데이터 계약 수준의 단계별 gate가 필요하다.

즉, **제품 계약 재설계는 아니지만 미구현 identity 계약을 runtime에 추가하는 작업**이다.

### 3.2 대안

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| A. 한 `/f` route를 winner로 정하고 나머지를 redirect | 보류 | 빠르지만 저장 중복, 24/5 정본, catalog 혼재, vehicle promise, artifact false affordance를 남긴다. |
| B. canonical registry + role-specific shell + one save identity | **선택** | Home/Find 역할과 P32를 유지하면서 source/job/variant, alias, save identity, reconciliation을 함께 다룬다. |
| C. Home/Find/detail 전체 재설계 | 현재 기각 | 현재 증거보다 범위가 넓고 P31/P32 및 4탭 IA를 불필요하게 다시 연다. |

### 3.3 대규모 구조 변경을 다시 검토할 조건

아래 중 하나가 발생하면 B안을 중단하고 broader discovery architecture 비교를 다시 연다.

- 대표 3개 이상의 source/job이 registry에서 route 전용 예외 없이는 표현되지 않는다.
- 같은 canonical Flow를 Home과 Find에 적용했을 때 두 역할의 정보 위계를 분리할 수 없다.
- 24개 전체판과 5개 핵심판이 scope preset도 intentional editorial variant도 아닌 별도 사용자 job으로 확인된다.
- canonical save adapter가 P32 source/personal/run/occurrence/export identity를 보존하지 못한다.
- 390px에서 하나의 canonical detail이 timeline, checklist, routine 중 2개 이상에서 작동하지 않는다.
- owner가 Home/Find 역할 분리 자체를 명시적으로 재개방한다.

이 조건이 없으면 P33 중간에 전면 IA 또는 visual reset을 섞지 않는다.

## 4. 현재 확인된 문제

### 4.1 합의된 High

| 문제 | Current | 목표 |
| --- | --- | --- |
| 같은 AJD source/job의 route 분기 | Home 24, Find 5, URL 5, alias 5 | entry가 달라도 하나의 canonical candidate와 detail projection |
| 저장 identity 분기 | slug별 3개 saved identity | 신규 저장은 canonical identity 1개 |
| My Flow 중복 | 24개와 5개 별도 객체 | 신규 저장 중복 0, 기존 중복은 명시적 reconciliation |
| artifact false affordance | moving/vehicle 버튼은 보이지만 결과가 안 바뀜 | 보이는 선택은 projection, CTA, save result를 모두 변경 |
| vehicle promise 불일치 | Home은 상시 checklist, 상세는 D-14 calendar | 하나의 user job과 artifact promise |
| Find inventory 불일치 | Home vehicle을 Find에서 재발견 못함 | Home example과 Find catalog가 같은 registry를 사용 |

### 4.2 Medium

- `/flow-maps`와 `/f`가 다른 상세·receipt 문법을 사용한다.
- 날짜 없이 저장한 workout에 raw RRULE이 노출된다.
- legacy detail과 public shell의 focus/accessibility 문법이 다르다.
- Calendar 예시와 `날짜 없이 시작`이 함께 보일 때 실제 저장 상태가 오해될 수 있다.

### 4.3 유지할 positive control

- wedding의 결과 형태 선택은 실제 projection을 변경한다.
- routine occurrence 계산과 Calendar projection은 정상이다.
- P32 focused My Flow의 `다음 행동 / 전체 계획 / 기록` 구조는 유지 가치가 있다.
- current catalog의 horizontal overflow와 console/page error는 0이었다.

## 5. P33 불변 조건

### 5.1 제품 불변 조건

1. 사용자에게는 하나의 Flow 객체가 보인다.
2. Home은 사용 예시와 이어서 실행을 담당한다.
3. Flow 찾기는 탐색, 검색, 비교, 재발견을 담당한다.
4. URL lookup은 source 해석과 prepared Flow 연결을 담당한다.
5. entry 역할은 달라도 title, content snapshot, artifact eligibility, saved state는 같은 canonical Flow에서 파생한다.
6. Flow Map은 내부 bundle 또는 alias이며 사용자용 별도 저장 문법을 만들지 않는다.
7. 가짜 사용량, 리뷰, 평점, 검증 수치를 추가하지 않는다.

### 5.2 데이터 불변 조건

1. source/content, personal overlay, execution run, occurrence, export identity를 분리한다.
2. source URL 하나만으로 canonicalFlowId를 만들지 않는다.
3. 24개와 5개를 배열 순서나 제목 유사도로 병합하지 않는다.
4. 기존 localStorage key를 초기 migration에서 삭제하지 않는다.
5. completion, memo, date override, exclusion, export selection을 추정 이동하지 않는다.
6. routine series와 occurrence ID를 재생성하지 않는다.
7. P33-04 write gate 전에는 저장 write path를 바꾸지 않는다.

### 5.3 UX 불변 조건

1. public `/f` shell과 4탭 IA를 유지한다.
2. P32 focused My Flow workspace를 유지한다.
3. 첫 화면 primary action은 하나를 유지한다.
4. 긴 설명으로 identity나 interaction 문제를 덮지 않는다.
5. unsupported artifact는 disabled tab으로 늘어놓지 않고 숨긴다.
6. 같은 역할의 control은 route가 달라도 같은 visible label, accessible name, focus contract를 사용한다.

## 6. Canonical identity 계약

### 6.1 최소 identity

```ts
type CanonicalFlowIdentity = {
  canonicalSourceId: string;
  userJobId: string;
  editorialVariantId: string;
  canonicalFlowId: string;
};
```

의미:

- `canonicalSourceId`: URL 문자열이 아니라 정규화된 source record identity
- `userJobId`: 사용자가 달성하려는 구체적인 일
- `editorialVariantId`: 의도적으로 다른 전체판, 핵심판, 대상별 판본
- `canonicalFlowId`: 위 세 요소의 안정된 product identity

### 6.2 Alias registry

```ts
type CanonicalFlowAlias = {
  canonicalFlowId: string;
  publicSlugs: string[];
  flowMapIds: string[];
  lookupResultIds: string[];
  legacySavedSlugs: string[];
  status: "resolved" | "requires_editorial_resolution" | "held";
};
```

registry가 담당할 것:

- Home card target
- Find catalog target
- URL lookup result
- direct public alias
- legacy Flow Map
- saved-state lookup
- diagnostic

registry가 담당하지 않을 것:

- Item completion
- personal title/date/memo
- execution run
- occurrence
- export selection

### 6.3 Editorial variant와 scope preset 구분

| 구분 | 같은 canonicalFlowId인가 | 별도 저장 객체인가 | 예 |
| --- | --- | --- | --- |
| Artifact 선택 | 같음 | 아니오 | Calendar 24개, Checklist 24개 |
| Scope preset | 같음 | 아니오 | 전체 24개, 핵심 5개만 선택 |
| Personal include/exclude | 같음 | 아니오 | 사용자가 24개 중 7개 제외 |
| Intentional editorial variant | 다른 `editorialVariantId` | 가능 | 원룸 전용과 가족 이사 전체판이 실제로 다른 job/완료 기준을 가짐 |
| Alias bug | 같아야 함 | 아니오 | 같은 source/job인데 route만 달라 24/5로 갈림 |

## 7. AJD moving 24개/5개 결정 절차

Claude Design의 `24개 canonical + 핵심 5개 scope preset`은 유력한 UX 가설이다. 그러나 현재 evidence만으로 확정하지 않는다.

### 7.1 Source fidelity audit

24개와 5개 각각에 대해 아래 표를 만든다.

- stable source row ID
- source 문장 또는 구간
- user action
- completion criterion
- relative date
- resource/warning 여부
- 24-item ID
- 5-item ID
- relation: exact / grouped / partial / unrelated / unsupported

### 7.2 결정 규칙

#### Outcome A - 24개 canonical + 5개 scope preset

다음을 모두 만족할 때만 선택한다.

- 24개가 source-backed action을 과장 없이 보존한다.
- 5개가 24개의 명확한 subset 또는 명시적 group preset이다.
- 5개 선택이 personal include/exclude로 표현 가능하다.
- 각 5개 항목의 source 범위가 24개 Item과 추적 가능하다.
- 5개 legacy run을 24개 Item에 자동 이관하지 않아도 기존 기록을 보존할 수 있다.

#### Outcome B - 두 intentional editorial variant

다음에 해당하면 variant를 분리한다.

- user job 또는 대상 사용자가 다르다.
- 5개가 24개의 단순 subset이 아니라 여러 항목을 합친 다른 완료 단위다.
- 날짜 계산이나 completion criterion이 다르다.
- 하나의 Item identity로 state를 보존할 수 없다.

이 경우 사용자에게 판본 차이를 명시한다. route alias처럼 숨기지 않는다.

#### Outcome C - canonical content 재편집

다음에 해당하면 24/5 어느 쪽도 바로 canonical로 선택하지 않는다.

- source 근거가 없는 filler가 포함된다.
- source에서 중요한 실행 단계가 누락된다.
- resource/warning이 completion Item으로 섞인다.
- 날짜 기준이 source와 맞지 않는다.

### 7.3 금지

- route가 새롭다는 이유로 24개 선택
- item 수가 적다는 이유로 5개 선택
- 조회수나 가짜 사용량으로 선택
- title similarity로 state 병합
- `합치기`라는 label을 먼저 만들고 데이터 mapping을 나중에 결정

### 7.4 owner gate

P33-02 app 변경 전에 owner가 아래 중 하나를 승인한다.

- `24 canonical + core_5 preset`
- `two explicit editorial variants`
- `canonical re-edit required`

결정이 없으면 registry는 `requires_editorial_resolution` 상태를 유지하고 canonical write를 차단한다.

## 8. 목표 사용자 여정

### 8.1 Home

- `Flow를 이렇게 써요` 역할 유지
- 카드에 canonical title, source, 실제 result/count를 표시
- 저장 상태가 있으면 `이어 실행`
- Find에서 같은 Flow라는 연결을 표시
- 카드 전체가 same canonical detail로 이동

### 8.2 Flow 찾기

- Home과 동일한 Flow identity/anatomy 사용
- 역할 차이는 대표 Item, category, 검색·필터 문맥으로 표현
- `더보기` 또는 `자세히`는 canonical detail로 이동
- Flow Map을 별도 product object처럼 노출하지 않음
- Home example은 검색 결과에서 재발견 가능

### 8.3 URL lookup

- canonical source를 찾으면 same canonical detail로 이동
- source 접근 필요, held, miss 상태는 기존 계약 유지
- route alias가 달라도 저장 여부와 개인 상태를 공유

### 8.4 Save-before

한 화면에서 다음 순서를 유지한다.

1. canonical title와 source
2. required input
3. 선택한 실제 artifact와 count
4. compact real-data preview
5. 필요할 때 scope preset 또는 항목 고르기
6. 결과를 예측할 수 있는 하나의 primary CTA

Artifact 선택은 다음을 동시에 바꾼다.

- selected state
- preview
- count
- CTA
- save result
- export eligibility

### 8.5 Receipt

- entry와 무관하게 같은 receipt grammar
- canonical title
- 저장한 effective item count
- artifact
- anchor 또는 undated 상태
- `첫 할 일 시작`
- `전체 보기`

### 8.6 My Flow

- canonical 신규 저장은 한 객체만 생성
- P32 focused workspace 유지
- legacy duplicate는 normal list에 조용히 중복 표시하지 않고 reconciliation 상태를 표시
- active copy를 선택하기 전에는 state를 병합하지 않음

### 8.7 Calendar와 export

- canonical saved object를 기준으로 Flow scope를 표시
- effective included rows만 projection
- artifact, count, title이 receipt와 일치
- raw RRULE 대신 사용자 문구 사용
- occurrence identity와 export UID는 유지

## 9. 단계별 실행 프로그램

P33 전체를 한 PR이나 한 세션에서 처리하지 않는다.

### P33-01A - Decision and contract gate

목표:

두 독립 검토의 번호와 정책 충돌을 해소하고 registry가 표현해야 할 상태를 문서와 fixture로 확정한다.

범위:

- AJD alias graph 확정
- 24/5 source fidelity matrix 작성
- variant vs preset 결정 규칙
- vehicle user job 결정 질문
- duplicate reconciliation 상태표
- proposed 390/1024 wireframe 재검토
- canonical identity naming과 ownership
- feature flag와 rollback 경계

Claude 제안에서 유지:

- Home/Find는 역할이 다르지만 동일 Flow anatomy
- 24개 전체와 핵심 preset을 한 객체에서 표현하는 UX 가설
- artifact 선택이 preview/CTA/save를 함께 변경
- receipt와 My Flow의 동일 identity

Claude 제안에서 수정:

- `하나로 합치기`는 데이터 mapping이 증명되기 전 노출 금지
- 기본 action은 `이 Flow를 대표로 사용`, `두 개 모두 유지`, `나중에 결정`
- 24/5는 wireframe으로 먼저 확정하지 않고 source audit 후 결정

산출물:

- `canonical-source-job-variant-matrix.json`
- `moving-24-5-item-map.json`
- `duplicate-reconciliation-state-matrix.json`
- current/proposed 390/1024 comparison
- owner decision record

Go gate:

- source/job/variant가 구분된다.
- unresolved 상태가 canonical write를 차단한다.
- 24/5 자동 병합 금지가 명확하다.

No-go:

- 24/5 정본을 source mapping 없이 정함
- reconciliation copy가 실제 보존 범위보다 강하게 약속함

앱 코드: 변경하지 않음

### P33-01B - Read-only canonical registry and invariant foundation

목표:

production route와 storage write를 바꾸지 않고 canonical candidate를 진단하는 pure registry와 invariant test를 구현한다.

범위:

- `CanonicalFlowIdentity`와 alias type
- read-only registry
- Home, Find, URL lookup, public alias resolver
- AJD 4개 entry fixture
- `requires_editorial_resolution`
- title/count/artifact/save identity diagnostic
- cross-entry invariant unit test

예상 파일:

- `lib/flow/canonical-flow-registry.ts`
- `lib/flow/canonical-flow-registry.test.ts`
- `lib/flow/cross-entry-invariant.ts`
- `lib/flow/cross-entry-invariant.test.ts`
- relevant source registration files

비범위:

- route redirect
- public UI 변경
- save key 변경
- localStorage migration
- duplicate UI

Acceptance:

- 네 AJD entry가 하나의 source/job candidate group으로 탐지된다.
- 24/5 충돌이 silent pass되지 않는다.
- 다른 user job은 같은 source URL이라는 이유만으로 합쳐지지 않는다.
- registry가 source Item이나 saved record를 변경하지 않는다.

Marker:

- `P33-CANONICAL-REGISTRY`
- `P33-CROSS-ENTRY-INVARIANT`
- `P33-UNRESOLVED-VARIANT-GATE`
- `P33-NO-STORAGE-WRITE-CHANGE`

Rollback:

- registry consumer를 제거하면 legacy runtime이 그대로 동작한다.

### P33-02A - AJD editorial resolution

Dependency:

- P33-01A
- P33-01B

목표:

24/5의 관계를 source fidelity와 user job 기준으로 확정한다.

범위:

- source row 재검토
- item mapping fixture
- canonical version 선정
- scope preset 또는 editorial variant 선정
- canonical title, source title, anchor model, artifact eligibility 확정
- legacy alias 역할 확정

비범위:

- 저장 migration
- legacy record 삭제
- 전체 catalog rollout

Acceptance:

- 모든 canonical Item에 source trace 또는 user-authored provenance가 있다.
- core preset이면 canonical Item ID의 subset으로 표현된다.
- variant이면 사용자에게 차이가 설명 가능한 별도 `editorialVariantId`가 있다.
- unresolved 상태가 해제되기 전 P33-02B로 진행하지 않는다.

### P33-02B - Moving canonical vertical slice

Dependency:

- P33-02A

목표:

Home, Find, URL lookup, direct alias가 같은 moving detail projection을 사용한다. 이 단계에서는 기존 저장 key를 아직 바꾸지 않는다.

범위:

- canonical detail view model
- role-specific entry context
- shared title/source/count/artifact eligibility
- `/flow-maps/moving-d30`의 internal bundle 또는 handoff 역할
- Home/Find/URL/direct alias route comparison
- 390/1024 current/proposed 구현

비범위:

- canonical single-write
- duplicate reconciliation
- 모든 `/flow-maps` rollout

Acceptance:

- entry별 title/count/content projection이 같다.
- route context만 Home example, Find discovery, URL source lookup으로 다르다.
- save 전에는 existing personal state를 읽기만 한다.
- P32 My Flow와 Calendar behavior는 바뀌지 않는다.

Marker:

- `P33-AJD-ONE-FLOW-PROJECTION`
- `P33-AJD-COUNT-PARITY`
- `P33-ROLE-SPECIFIC-SHELL`

Rollback:

- moving route-level feature flag를 끄면 legacy detail로 복귀한다.

### P33-03 - Artifact and entry promise correctness

Dependency:

- P33-01B
- moving은 P33-02B proof 통과

목표:

보이는 artifact 선택과 Home/Find promise가 실제 결과를 정확히 예측하게 한다.

범위:

- category hardcode 제거
- eligibility 기반 result selection
- selected artifact가 preview/count/CTA/save result에 반영
- unsupported artifact 미렌더
- vehicle Home card, detail target, Find inventory 정합
- Home example과 Find rediscovery
- raw RRULE display adapter

예상 파일:

- `components/flow/AppClient.tsx`
- `components/flow/FlowArtifactDataPreview.tsx`
- `lib/flow/artifact-recommendation.ts`
- `lib/flow/flow-experience-projection.ts`
- `lib/flow/url-first-lookup.ts`
- discovery inventory modules

Vehicle decision:

- `법정검사 D-14 Calendar`와 `상시 차량 점검 Checklist`는 같은 job으로 숨겨 합치지 않는다.
- source와 user job이 다르면 두 Flow로 분리하고 title/source/result를 명확히 한다.
- source가 실제로 하나의 job만 지원하면 Home promise를 target에 맞춘다.

Acceptance:

- visible artifact choice projection change 100%
- false affordance 0
- Home promise와 target artifact/count 일치
- vehicle Find result 1개 이상
- raw RRULE visible 0

Marker:

- `P33-ARTIFACT-CONTROL`
- `P33-ENTRY-PROMISE-PARITY`
- `P33-HOME-FIND-REDISCOVERY`
- `P33-RRULE-DISPLAY`

### P33-04A - Canonical save adapter shadow read

Dependency:

- P33-01B
- P33-02B

목표:

기존 write를 유지하면서 alias를 통해 canonical saved state를 진단하고 dual-read 결과를 비교한다.

범위:

- canonical saved identity proposal
- alias index
- legacy origin IDs
- read precedence diagnostic
- backup format
- one-record / multi-record / mismatch fixtures
- feature flag off by default

비범위:

- canonical single-write 활성화
- legacy key 삭제
- duplicate merge

Acceptance:

- shadow read가 current legacy result와 다르면 write gate를 차단한다.
- source/personal/run/occurrence/export key가 모두 inventory된다.
- malformed record가 valid legacy data를 숨기지 않는다.

Marker:

- `P33-CANONICAL-SAVE-SHADOW`
- `P33-LEGACY-DUAL-READ`
- `P33-MIGRATION-BACKUP`

### P33-04B - Gated canonical single-write

Dependency:

- P33-04A fixture와 rollback pass

목표:

신규 저장만 canonical identity로 쓰고 legacy aliases에서 같은 saved state를 읽는다.

범위:

- feature-gated canonical save record
- dual-read legacy keys
- canonical single-write
- `legacyOriginIds`
- save receipt와 existing-saved signal
- backup and rollback

비범위:

- existing duplicate automatic merge
- legacy key deletion

Acceptance:

- Home, Find, URL alias를 순서대로 신규 저장해도 My Flow object 1개
- Calendar/export duplicate projection 0
- old key는 유지
- feature flag off 시 legacy read로 복귀

Marker:

- `P33-CANONICAL-SAVE-ID`
- `P33-ONE-NEW-SAVE-OBJECT`
- `P33-LEGACY-ROLLBACK`

### P33-05 - Legacy duplicate reconciliation

Dependency:

- P33-04B

목표:

기존 24/5 duplicate를 데이터 손실 없이 사용자가 정리하거나 유지할 수 있게 한다.

Record 상태:

1. legacy record 0개
2. legacy record 1개, unambiguous
3. 같은 canonical content/version의 record 여러 개
4. item cardinality 또는 version이 다른 record 여러 개
5. malformed 또는 partial record

기본 정책:

- 0개: 아무 작업 없음
- 1개: canonical active pointer로 adopt 가능, 원본 key 보존
- 여러 개: active copy 선택
- 24/5 mismatch: 자동 merge 금지
- 선택하지 않은 record: archived legacy로 보존
- 사용자가 `두 개 모두 유지` 선택 가능
- backup 전 destructive action 금지

권장 UI 동사:

- `이 Flow를 대표로 사용`
- `두 개 모두 유지`
- `나중에 결정`
- `보관한 이전 Flow 보기`

조건부 동사:

- `하나로 합치기`는 Item stable mapping과 모든 personal/run 필드 보존 테스트가 통과한 동일-cardinality record에서만 검토한다.
- 24/5 mismatch에는 표시하지 않는다.

비범위:

- title similarity merge
- savedAt winner
- legacy history 삭제
- cross-device sync

Acceptance:

- active copy 선택 전 데이터 write 0
- completion, date, memo, exclusion, run history, export selection loss 0
- archived legacy restore 가능
- reload와 rollback 후 동일 상태

Marker:

- `P33-DUPLICATE-RECONCILE`
- `P33-NO-AUTO-MERGE`
- `P33-ACTIVE-COPY-SELECTION`
- `P33-LEGACY-RESTORE`

### P33-06 - Catalog, receipt, downstream parity

Dependency:

- P33-02B
- P33-03
- P33-04B
- P33-05

목표:

moving proof를 나머지 eligible legacy catalog에 확장하고 receipt, My Flow, Calendar, export의 canonical identity를 맞춘다.

범위:

- remaining `/flow-maps` catalog alias/handoff
- server fallback와 hydrated catalog inventory 일치
- one receipt anatomy
- canonical title/count in My Flow
- Calendar Flow scope identity
- whole/selected/current export identity
- recurrence human-readable summary
- cross-entry accessible name과 focus return

비범위:

- P32 workspace 재설계
- Calendar engine 교체
- 새 export format

Acceptance:

- catalog에서 legacy/current 시스템 세대 차이가 사용자 문법으로 노출되지 않는다.
- receipt count = My Flow effective count = export preflight count
- Calendar와 export가 canonical Flow identity를 공유한다.
- raw internal term 0

Marker:

- `P33-CATALOG-CANONICAL-ROLLOUT`
- `P33-RECEIPT-PARITY`
- `P33-DOWNSTREAM-IDENTITY`
- `P33-A11Y-CROSS-ENTRY`

### P33-07 - Independent final gate and release

Dependency:

- P33-01~06

범위:

- 8 personas x 3 sessions 재실행
- 390x844, 1024x768, 1440x900
- Home, Find, URL, alias cross-entry E2E
- canonical save and rollback rehearsal
- duplicate reconciliation fixtures
- source/personal/run/occurrence/export preservation
- production smoke and screenshot package
- owner acceptance

Release gate:

- same source/job effective Flow object 1
- new-save My Flow object 1
- 24/5 unresolved conflict 0
- visible artifact false affordance 0
- Home example rediscovery pass
- raw RRULE 0
- horizontal overflow 0
- fixed overlap 0
- unnamed focusable 0
- console/page error 0
- migration rollback pass

실제 사용자 관찰은 별도다. 자동 24-cell이 green이어도 observed-user count는 `0`으로 기록한다.

Marker:

- `P33-FINAL-CROSS-ENTRY-GATE`
- `P33-24-CELL`
- `P33-ROLLBACK-REHEARSAL`
- `P33-PRODUCTION-SMOKE`

## 10. 단계 간 simulation과 재계획

### Gate A - P33-01A 이후

시뮬레이션:

- Home-first moving
- Find-first moving
- URL-first moving
- existing 24/5 duplicate
- vehicle expectation
- workout recurrence
- wedding positive control
- keyboard/responsive

각 persona에서 확인:

- 같은 Flow라고 인식 가능한가?
- 어떤 정보가 entry 역할 때문에 달라지고 어떤 정보는 같아야 하는가?
- CTA 결과를 예측 가능한가?
- duplicate choice가 데이터 보존 범위를 과장하지 않는가?

결과:

- source/editorial decision이 없으면 P33-02 중단
- registry schema가 3개 이상의 example을 표현하지 못하면 P33-01B 재설계

### Gate B - P33-02B moving proof 이후

확인:

- 390/1024에서 same content, different entry role
- shared detail이 과밀하지 않은가?
- P32 receipt/My Flow continuity가 유지되는가?
- scope preset이 실제 included Item으로 계산되는가?

2개 이상의 content shape에서 공통 anatomy가 깨지면 catalog rollout을 중단한다.

### Gate C - P33-04A storage rehearsal 이후

확인:

- backup completeness
- dual-read precedence
- malformed data defense
- same-cardinality duplicate
- 24/5 mismatch
- rollback

데이터 loss 가능성이 1건이라도 남으면 single-write를 활성화하지 않는다.

### Gate D - P33-07

독립 Codex review와 Claude Design hierarchy review를 다시 분리해 수행한다.

- Codex: current production, storage, rollback, tests
- Claude Design: 390/1024 hierarchy, role-specific shell, reconciliation comprehension

두 검토에서 High가 남으면 production rollout을 멈춘다.

## 11. 검증 전략

### 11.1 Unit

- canonical ID는 source URL만으로 생성되지 않음
- same source + different job은 별도 identity
- same source/job + unresolved variant는 write 차단
- alias graph resolution
- registry duplicate/malformed defense
- artifact eligibility와 selected projection
- human-readable recurrence
- dual-read precedence
- backup/rollback
- active copy selection

### 11.2 Cross-entry invariant

최소 assertion:

1. Home, Find, URL, alias가 same canonical candidate를 반환
2. resolved 상태에서 title/count/artifact parity
3. unresolved 상태에서 canonical write disabled
4. visible artifact selection changes projection
5. Home example appears in Find
6. same aliases save to one new object
7. receipt/My Flow/Calendar/export identity parity
8. legacy record preservation

### 11.3 E2E

- Home moving -> detail -> save -> receipt -> My Flow
- Find moving -> same detail -> existing saved signal
- URL lookup -> same detail
- direct alias -> same detail
- Home + Find sequential save -> one new object
- 24/5 duplicate -> active copy selection -> archive -> restore
- vehicle Home promise -> detail -> Find rediscovery
- moving/vehicle artifact selection
- workout undated save -> human-readable recurrence
- Calendar and export parity

### 11.4 Browser

Viewports:

- 390x844
- 1024x768
- 1440x900

검사:

- horizontal overflow
- fixed/sticky overlap
- title/count wrapping
- card/detail identity
- dialog/sheet focus trap
- focus return
- accessible name
- keyboard-only journey
- console/page error

### 11.5 Commands

각 implementation slice:

```powershell
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
```

영향 범위에 따라:

```powershell
npm.cmd run test:e2e
```

P33-04~07은 storage와 cross-entry blast radius가 넓으므로 full E2E와 rollback fixture를 필수로 한다.

## 12. Evidence package 규칙

각 slice는 다음 구조를 사용한다.

```text
docs/content-audit/YYYY-MM-DD-p33-XX-.../
  README.md
  audit.md
  route-evidence.json
  screenshots/
  fixtures/
```

각 finding에 포함:

- route
- viewport
- initial storage state
- reproduction steps
- expected
- actual
- evidenceKind
- data impact
- rollback result

Evidence kind:

- `current_production_interaction`
- `current_source`
- `current_command`
- `current_package_screenshot`
- `heuristic_simulation`
- `reference_pattern`
- `observed_user`
- `inaccessible`

## 13. Tracking 문서 갱신 순서

이 계획은 아직 owner review 단계이므로 현재 `STATUS`, `ROADMAP`, `DECISIONS`를 바로 바꾸지 않는다.

Owner가 P33 착수를 승인하면:

1. 이 계획을 `spec.md`, `tasks.md`, `qa.md`로 분리한다.
2. `docs/specs/README.md` Active Gate를 P33-01로 갱신한다.
3. `docs/ROADMAP.md`에 P33-01~07 요약과 dependency만 기록한다.
4. `docs/DECISIONS.md`에 canonical identity, variant/preset, no-auto-merge 정책을 기록한다.
5. `docs/STATUS.md`는 실제 active slice와 blocker만 기록한다.
6. route, data ownership, persistence가 실제로 변경되는 P33-04에서 `docs/SERVICE_STRUCTURE.md`를 갱신한다.

## 14. Reference pattern 사용 원칙

Claude Design이 비교한 reference는 구조 원칙만 사용한다.

- Notion: template preview에서 명시적 duplicate 후 하나의 object 생성
- Todoist: 같은 task/project identity 위에서 날짜와 view가 바뀜
- Things/TickTick: Today와 Logbook은 object 복제가 아니라 projection
- Wanderlog: 하나의 trip 안에 date, checklist, resource가 공존
- Hevy: routine definition과 logged occurrence 분리

복제하지 않을 것:

- 무거운 planner
- social feed
- 가짜 review/popularity
- workout 전용 execution grammar
- provider-specific IA

## 15. 권장 즉시 다음 목표

다음 작업은 **P33-01A + P33-01B**다.

한 번에 허용할 범위:

- source/job/variant matrix
- 24/5 mapping fixture
- reconciliation state contract
- read-only registry
- invariant diagnostic
- unit tests
- docs

허용하지 않을 범위:

- route 변경
- UI 변경
- save key 변경
- localStorage migration
- duplicate reconciliation UI

P33-01 완료 후 owner에게 반드시 보고할 결정:

1. 24개와 5개의 실제 관계
2. canonicalFlowId 구성
3. unresolved gate 결과
4. alias graph
5. storage write 무변경 근거
6. P33-02A에 필요한 editorial input

## 16. P33 전체 완료 기준

- 같은 source/job/variant는 entry와 무관하게 하나의 canonical Flow로 이어진다.
- role-specific shell은 유지되지만 content identity와 저장 결과는 같다.
- Home example은 Find와 URL lookup에서 같은 Flow로 재발견된다.
- 보이는 artifact 선택은 실제 결과를 바꾼다.
- 신규 저장은 My Flow에 한 객체만 만든다.
- 기존 duplicate는 자동 병합되지 않고 active copy 선택과 legacy 보존을 제공한다.
- receipt, My Flow, Calendar, export가 같은 effective title/count/identity를 읽는다.
- raw recurrence/internal term이 사용자 화면에 노출되지 않는다.
- P32 focused workspace, 4탭 IA, public `/f`, source/personal/run/occurrence/export identity가 유지된다.
- rollback rehearsal이 통과한다.
- 자동 QA와 실제 사용자 검증이 분리된다.

## 17. 남은 실제 사용자 질문

이 질문은 P33 자동화로 답하지 않는다.

1. 24개 전체판과 5개 핵심판을 같은 Flow의 범위 선택으로 이해하는가?
2. Home과 Find의 역할 차이가 유용한가, 중복으로 느끼는가?
3. result shape 선택을 저장 destination 선택으로 이해하는가?
4. 중복 Flow가 발견됐을 때 대표본 선택과 두 개 유지의 차이를 이해하는가?
5. vehicle Home 카드에서 상시 점검과 법정검사 중 무엇을 기대하는가?
6. 예시 Calendar와 실제 anchor/undated 저장 상태를 구분하는가?

Observed-user count는 실제 세션 전까지 `0`이다.
