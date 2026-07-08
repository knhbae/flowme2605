# FlowMe 콘텐츠 소스 확장 계획

Date: 2026-07-04

Scope: 현재 앱 기획/개발 상태를 기준으로, 실제 원문 콘텐츠를 더 많이 수급하고 FlowMe 앱에 무리 없이 반영하기 위한 콘텐츠 확장 운영 계획이다. 이 문서는 앱 구현 계획이 아니라 `소스 탐색 -> 후보 판정 -> source row 추출 -> seed handoff -> 소량 앱 적용 -> 검증`의 반복 계획이다.

## 현재 앱 기준

현재 FlowMe는 단순 데모가 아니라 다음 사용자-facing 구조를 이미 갖고 있다.

- 4탭 IA: `홈 / Flow 찾기 / 캘린더 / 내 Flow`
- `/flows`: 기존 seed 콘텐츠와 9개 curated source-backed 콘텐츠가 통합 목록으로 노출된다.
- `/flow-maps/[map]`: source-backed 콘텐츠를 저장 전 확인하고 전체 저장할 수 있다.
- `/f/[slug]`: 단일 Flow 공유 진입점이다.
- `/calendar`: 저장된 dated Step의 전역 일정 실행면이다.
- `/my`: 저장한 콘텐츠의 Today/전체 실행 허브다.
- `lib/flow/curated-source-app-seed.ts`: `docs/content-audit/2026-07-01-curated-source-app-seed-v1.json`을 앱 런타임 `FlowBundle`과 source-backed Flow Map metadata로 변환한다.

중요한 현재 상태:

- 9개 curated source app seed는 이미 앱-facing seed 경로에 연결되어 있다.
- 기존 seed와 9개 curated source는 `/flows`의 같은 catalog 안에 섞여 보여야 한다.
- 사용자 화면에는 `Flow Map`, `Step`, `Item`, `source-backed`, `review`, `audit`, `sourceTrace` 같은 내부 문구를 노출하지 않는 방향으로 정리 중이다.
- 현재 검증은 자동 테스트와 브라우저 QA 중심이다. 실제 사용자 행동 데이터가 아니므로 어떤 콘텐츠도 `검증됨`이라고 부르지 않는다.

## 큰 목표

FlowMe의 콘텐츠 확장은 콘텐츠 개수를 늘리는 작업이 아니라, 현재 앱의 4탭 실행 구조와 seed adapter가 감당할 수 있는 `좋은 실행 콘텐츠 공급망`을 만드는 작업이다.

목표 흐름:

```text
앱 surface 기준 확인
-> 실제 URL 후보 수급
-> source shape / demand / row 여부 점수화
-> source row 추출
-> Flow Map / Flow / Step / Item 정규화
-> 앱 seed handoff
-> 5~8개 canary 앱 적용
-> 모바일 / 저장 / 실행 / export 회귀 검증
-> 다음 배치 확장
```

핵심 판단:

- 후보 탐색은 20~30개씩 해도 된다.
- 앱 적용은 한 번에 5~8개만 한다.
- 한 배치가 `/flows`, `/flow-maps`, `/my`, `/calendar`, export에서 문제없이 소화된 뒤 다음 배치로 간다.

## 비목표

- 한 번에 20~30개를 앱에 밀어 넣지 않는다.
- 현재 4탭 IA를 콘텐츠 확장 때문에 다시 흔들지 않는다.
- seed/source-backed 저장/export 스키마를 매 배치마다 바꾸지 않는다.
- 앱 화면을 콘텐츠 검토판처럼 만들지 않는다.
- 원문에 없는 Step/Item을 만들어 완성도 높아 보이게 하지 않는다.
- 민감 영역을 기록 관리 앱으로 확장하지 않는다.

## 확장 원칙

### 1. 앱 surface에 들어갈 수 있어야 seed 후보가 된다

좋은 원문이어도 아래 질문에 답하지 못하면 앱 적용 후보가 아니다.

```text
/flows 카드에서 5초 안에 무엇을 저장하면 무엇이 생기는지 보이는가?
/flow-maps/[map]에서 첫 할 일이 보이는가?
/my 저장 후 첫 할 일이 자연스럽게 이어지는가?
/calendar 또는 export에서 제목/날짜/메모/source link가 깨지지 않는가?
```

### 2. 후보 탐색 배치와 앱 적용 배치를 분리한다

후보 탐색은 넓게 한다. 앱 적용은 작게 한다.

| 단계 | 배치 크기 | 목적 |
|---|---:|---|
| source scout | 20~30개 | 좋은 원문 후보를 넓게 찾기 |
| scored shortlist | 10~12개 | source row 확인과 변환 가능성 판단 |
| normalized handoff | 5~8개 | 앱 적용 전 정규화 |
| app canary batch | 5~8개 | 현재 catalog/My Flow/export에 실제 반영 |

### 3. 현재 seed adapter를 기본 계약으로 본다

새 콘텐츠는 우선 현재 `curated-source-app-seed` 중간 schema에 맞춘다.

필수 구조:

```text
contentBundles[]
  bundleId
  title
  category/categoryLabel
  status/userFacingStatus/appExposure
  sourceUrls
  recommendedFlowId
  setupFields
  flows[]
    flowId/slug/title/pattern/defaultDestination
    steps[]
      stepId/stepTitle/itemTitle/items/memo/detail/sourceUrl/sourceTrace
```

새 필드를 추가하기 전에 먼저 `memo/detail/sourceUrl/sourceTrace/setupFields`로 표현 가능한지 확인한다.

### 4. 사용자 화면 용어와 내부 계약을 분리한다

내부 데이터는 Flow Map / Flow / Step / Item이어도 된다. 사용자 화면은 다음 언어를 우선한다.

| 내부 | 사용자 화면 |
|---|---|
| Flow Map | 콘텐츠, 묶음 콘텐츠, 전체 준비 |
| Flow | 저장할 콘텐츠, 루틴, 체크리스트, 진도표 |
| Step | 할 일, 일정, 구간, 회차 |
| Item | 체크, 할 일 |
| sourceTrace | 원문 근거, 원문에서 옮긴 내용 |
| appExposure/status | 바로 시작 가능, 일부 보강 필요, 자료 보강 필요 |

### 5. Stage 0 검증 기준을 유지한다

콘텐츠 확장은 `open -> anchor 입력 -> copy/export -> check -> feedback` 행동을 더 잘 관찰하기 위한 수단이다. 콘텐츠가 많아지는 것 자체는 검증이 아니다.

## 현재 앱 병목 가설

확장 전에 확인할 병목은 아래다.

| 병목 | 왜 중요한가 | 확인 방법 |
|---|---|---|
| `/flows` 카드 밀도 | 콘텐츠가 늘면 사용자가 고르기 어려워질 수 있다. | 기존 seed + 9개 curated + canary 5개를 한 목록에서 본다. |
| source-backed 상세 길이 | 긴 Step/memo가 모바일에서 검토를 막을 수 있다. | 390px에서 first action, source, memo 접힘 확인 |
| 저장 후 이어하기 | 저장 후 `/my`에서 첫 할 일이 바로 보여야 한다. | source-backed 저장 E2E와 모바일 screenshot |
| export 일관성 | 콘텐츠 유형이 늘어도 calendar/checklist/sheet/memo가 같은 규칙으로 나와야 한다. | representative export sample 비교 |
| 상태 문구 | partial/source_import 콘텐츠가 사용자에게 경고처럼 보이거나 완성처럼 보일 수 있다. | `/flows`, `/flow-maps`, `/my` 문구 스캔 |
| runtime schema 한계 | 새 source shape가 현재 adapter의 date/structure/destination 파서와 안 맞을 수 있다. | seed parse + generated FlowBundle shape test |

## 후보 수급 전략

### 탐색 배치

한 번에 20개 후보를 수급한다. 단, 앱 적용은 상위 5~8개만 한다.

| 축 | 후보 수 | 앱 적용 상한 | 목적 |
|---|---:|---:|---|
| 공식/행정/기관 | 4 | 1~2 | calendar/deadline과 source/risk 경계 검증 |
| 공부/시험/진도표 | 4 | 1~2 | sheet/progress/table 구조 검증 |
| 생활/가족/취미 | 4 | 1~2 | resource routine과 memo/detail 검증 |
| 관리/점검/구매 | 4 | 1~2 | checklist/comparison 구조 검증 |
| creator/video/template | 4 | 1~2 | video/playlist/template source row 검증 |

제한:

- 같은 좁은 주제는 한 배치에 최대 3개.
- 같은 artifact shape와 같은 user moment는 한 배치에 최대 2개.
- 기존 9개와 같은 패턴만 반복하면 backup으로 둔다.
- 이사/결혼/신차처럼 이미 강한 timeline/checklist 패턴은 더 강한 source evidence가 있을 때만 승격한다.

### 우선 탐색할 빈 공간

현재 9개가 이미 커버한 축:

- 교육 resource queue
- 시험 계획표
- 이유식 table/file
- 독서 user-target routine
- 신차 구매 checklist
- 공식 예방접종 schedule
- 이사 timeline
- 결혼 timeline/vendor board
- 홈트 video routine

다음 확장에서 더 보고 싶은 축:

| 우선순위 | 축 | 이유 |
|---:|---|---|
| 1 | 공식/행정 deadline | 앱의 calendar/export 가치가 잘 드러난다. |
| 2 | 자격증/강의 curriculum | sheet/progress가 실제로 필요한지 볼 수 있다. |
| 3 | 템플릿/PDF/XLSX 배포글 | source row 품질이 높고 수요 흔적이 보이기 쉽다. |
| 4 | 반복 관리 루틴 | `/calendar`와 `/my` 반복 실행면을 테스트한다. |
| 5 | creator playlist/course | resource library와 multi-video sequence의 차이를 검증한다. |

## 후보 등록 schema

후보는 Flow로 만들기 전에 아래 구조로 등록한다.

```json
{
  "candidateId": "source-001",
  "title": "",
  "sourceUrl": "",
  "sourceType": "official | creator | blog | video | file | community",
  "contentShape": "timeline | checklist | table | playlist | single_video | resource_library | template | article",
  "userNeed": "As a..., I need to..., so that...",
  "visibleDemandEvidence": {
    "comments": "",
    "views": "",
    "downloads": "",
    "followUpPosts": "",
    "officialContext": ""
  },
  "sourceRowsAvailable": false,
  "attachmentAvailable": false,
  "expectedFlowUnit": "",
  "expectedStepUnit": "",
  "expectedItemUnit": "",
  "primaryDestination": "calendar | checklist | sheet | memo | hybrid",
  "appSurfaceFit": {
    "flowsCardPromise": "",
    "firstActionPreview": "",
    "myFlowContinuation": "",
    "exportFit": []
  },
  "inputFields": [],
  "riskBoundary": "",
  "score": {
    "sourceContext": 0,
    "userDesire": 0,
    "executionStructure": 0,
    "artifactFit": 0,
    "inputSimplicity": 0,
    "appSurfaceFit": 0,
    "reuseValue": 0
  },
  "status": "found",
  "nextAction": ""
}
```

## 상태값

| Status | 의미 |
|---|---|
| `found` | URL만 찾은 상태 |
| `opened` | 실제 원문 구조를 확인한 상태 |
| `source_rows_confirmed` | row, 일정, 단계, 영상 목록, 파일 구조를 확인한 상태 |
| `seed_candidate` | 현재 앱 seed 후보로 승격 가능 |
| `usable_after_simplification` | 줄이면 사용 가능 |
| `source_import_required` | 자료실/채널형이라 row import가 먼저 필요 |
| `app_surface_risk` | source는 좋지만 현재 `/flows`/`/my`/export에서 복잡해질 위험이 큼 |
| `backup` | 좋은 후보지만 이번 배치에서는 중복 |
| `reject` | FlowMe 실행 구조로 부적합 |

## 점수표

기존 source 점수에 `App Surface Fit`을 추가한다. 현재 앱에 실제로 들어갈 수 있는지가 중요해졌기 때문이다.

| Dimension | Weight | 질문 |
|---|---:|---|
| Source/creator context and user reaction | 25 | 댓글, 조회수, 다운로드, 후속글, 공식성, 사용 흔적이 있는가? |
| User desire | 15 | 사용자가 읽고 저장하고 싶을 만큼 실생활 행동과 연결되는가? |
| Execution structure | 20 | 날짜, 반복, row, 체크리스트, 단계, 표, 영상 목록이 있는가? |
| Natural artifact fit | 15 | calendar/checklist/sheet/memo 중 어디로 옮길지 분명한가? |
| Input simplicity | 10 | 시작일, 목표일, 반복 요일, 기준일, 메모 수준으로 실행 가능한가? |
| App Surface Fit | 10 | `/flows`, `/flow-maps`, `/my`, `/calendar`, export에서 자연스럽게 보이는가? |
| Reuse value | 5 | 반복 사용, 재방문, 공유, 업데이트 가치가 있는가? |

판정:

| Score | 판정 |
|---:|---|
| 4.5~5.0 | canary seed candidate |
| 3.8~4.4 | usable after simplification |
| 3.0~3.7 | source backlog only |
| 3.0 미만 | reject 또는 더 좋은 source 필요 |

승격 조건:

- `Execution structure >= 4`
- `Content fidelity` hard fail 없음
- `App Surface Fit >= 4`
- setup input이 현재 앱의 date/text/weekday/memo/check 수준을 넘지 않음

## Source Shape별 현재 앱 적용 기본값

| Source Shape | 앱 적용 기본값 | 주의점 |
|---|---|---|
| D-day checklist | Flow Map 또는 단일 timeline Flow | `/calendar`에 과도한 일정이 생기지 않게 Step을 묶는다. |
| official schedule | 공식 일정 Flow Map | 공식 row detail은 memo/source로 두고 record field를 만들지 않는다. |
| table/file schedule | file version별 Flow | Step은 row group, Item은 한 행동으로 묶는다. |
| resource library | Park -> row import -> 2주/1달 routine | row가 충분하지 않으면 앱 seed로 올리지 않는다. |
| single video | routine Flow | 영상 제목/URL/반복 요일만. 동작 sequence는 만들지 않는다. |
| playlist/course | Flow Map 또는 progress sheet | 영상/강의 제목과 URL이 확인된 row만 쓴다. |
| reading/habit | user-target routine | 책/목표일/요일은 사용자가 정한다. |
| purchase/comparison | checklist + memo/detail | 견적 세부는 Field가 아니라 memo/detail. |

## 단계별 계획

### Phase A. 현재 9개 앱 surface 기준선 재확인

목표: 이미 앱에 들어간 9개 curated source가 현재 UI/seed/export에서 어떤 제약을 만들고 있는지 확인한다.

- [ ] `/flows`에서 기존 seed와 9개 curated source가 통합 목록으로 보이는지 확인한다.
- [ ] 9개 카드가 제목, 입력/결과, 첫 할 일, CTA 중심으로 읽히는지 확인한다.
- [ ] `/flow-maps/[map]`에서 first action이 첫 화면에 보이는지 확인한다.
- [ ] 저장 후 `/my`에서 첫 할 일이 바로 이어지는지 확인한다.
- [ ] `/calendar`에서 dated Step이 일정으로 자연스럽게 보이는지 확인한다.
- [ ] export label과 export 내용이 목적지별로 예측 가능한지 확인한다.
- [ ] user route에서 내부 문구가 보이지 않는지 스캔한다.

산출물:

- `docs/content-audit/YYYY-MM-DD-current-9-app-surface-baseline-ko.md`
- 필요하면 모바일 검토용 HTML 또는 screenshot 목록

완료 기준:

- 새 배치를 넣기 전에 고쳐야 할 app-surface blocker가 분리되어 있다.
- blocker가 없으면 첫 canary 배치 규모를 확정한다.

### Phase B. 후보 20개 source scout

목표: 실제 URL을 열어 원문 구조와 사용 흔적을 확인한 후보 20개를 만든다.

- [ ] 5개 축에서 각 4개씩 후보를 찾는다.
- [ ] 후보마다 실제 URL을 연다.
- [ ] 댓글, 다운로드, 조회수, 후속글, 공식성, 파일 여부를 기록한다.
- [ ] source row, 단계, 표, 영상 목록, 일정이 있는지 확인한다.
- [ ] 앱 surface fit을 간단히 적는다.

산출물:

- `docs/content-audit/YYYY-MM-DD-source-expansion-candidates-v1.json`
- `docs/content-audit/YYYY-MM-DD-source-expansion-candidate-notes-ko.md`

완료 기준:

- 후보 20개 모두 URL과 contentShape가 있다.
- `source_rows_confirmed` 후보가 10개 이상이다.

### Phase C. 점수화와 canary 후보 5~8개 선정

목표: 앱에 넣을 소량 후보와 보류 후보를 분리한다.

- [ ] 각 후보를 7개 dimension으로 점수화한다.
- [ ] `seed_candidate`, `usable_after_simplification`, `source_import_required`, `app_surface_risk`, `backup`, `reject`로 판정한다.
- [ ] canary 배치는 source shape가 겹치지 않게 5~8개만 고른다.
- [ ] 현재 앱 schema와 맞지 않는 후보는 `app_surface_risk`로 둔다.

산출물:

- `docs/content-audit/YYYY-MM-DD-source-expansion-scored-candidates-ko.md`
- `docs/content-audit/YYYY-MM-DD-source-expansion-canary-selection-ko.md`

완료 기준:

- canary 후보마다 왜 지금 앱에 넣을 만한지 설명 가능하다.
- canary 후보마다 첫 할 일과 export destination이 있다.

### Phase D. source row 추출

목표: canary 후보의 실제 source row를 추출한다.

- [ ] 각 후보의 primary source를 하나로 고정한다.
- [ ] source row unit을 정한다.
- [ ] row별 title, detail, sourceTrace, sourceUrl을 기록한다.
- [ ] 첨부파일은 파일명, 시트명, row 범위를 기록한다.
- [ ] 영상/플레이리스트는 영상 제목, URL, 순서, 길이를 기록한다.
- [ ] 공식/민감 정보는 official fact와 user memo를 분리한다.

산출물:

- `docs/content-audit/YYYY-MM-DD-source-expansion-source-rows-v1.json`

완료 기준:

- 모든 canary 후보가 source row 기반으로 Step을 만들 수 있다.

### Phase E. normalized Flow draft

목표: canary 후보를 Flow Map / Flow / Step / Item으로 정규화한다.

- [ ] 각 후보의 user need를 `As a..., I need to..., so that...`로 쓴다.
- [ ] primary destination을 정한다.
- [ ] structure type을 정한다.
- [ ] Flow unit, Step unit, Item unit을 정한다.
- [ ] Step은 원문 row/기간/단계/영상 순서를 보존한다.
- [ ] Item은 체크할 최소 행동만 둔다.
- [ ] 세부 source fact는 memo/detail로 내린다.
- [ ] setupFields는 현재 앱에서 처리 가능한 값으로 제한한다.

산출물:

- `docs/content-audit/YYYY-MM-DD-source-expansion-normalized-flow-draft-data-ko.json`
- `docs/content-audit/YYYY-MM-DD-source-expansion-normalized-flow-review-ko.html`

완료 기준:

- JSON 파싱 가능.
- 각 Item이 원문 기반인지 설명 가능.
- HTML에서 모바일로 전체 콘텐츠를 검토 가능.

### Phase F. app seed handoff

목표: 현재 `curated-source-app-seed.ts` adapter가 읽을 수 있는 형태로 앱 구현 세션용 handoff를 만든다.

- [ ] normalized draft를 `contentBundles[]` seed schema로 변환한다.
- [ ] `status`, `userFacingStatus`, `appExposure`를 사용자용/내부용으로 분리한다.
- [ ] `recommendedFlowId`를 정한다.
- [ ] `setupFields`, `steps[].itemTitle`, `memo`, `detail`, `sourceUrl`, `sourceTrace`를 채운다.
- [ ] generic memoHint가 없는지 확인한다.
- [ ] implementation prompt, data mapping, QA checklist를 만든다.

산출물:

- `docs/content-audit/YYYY-MM-DD-source-expansion-app-seed-v1.json`
- `docs/content-audit/YYYY-MM-DD-source-expansion-app-implementation-prompt-ko.md`
- `docs/content-audit/YYYY-MM-DD-source-expansion-app-data-mapping-ko.md`
- `docs/content-audit/YYYY-MM-DD-source-expansion-app-qa-checklist-ko.md`

완료 기준:

- 앱 구현 세션이 이 4개 파일만 읽고 적용 범위를 이해할 수 있다.
- seed JSON은 파싱 가능하다.

### Phase G. canary 앱 적용

목표: canary 5~8개만 앱에 반영하고, 기존 UI/저장/export 회귀를 막는다.

- [ ] 새 seed JSON을 앱 adapter에 연결한다.
- [ ] `/flows` 목록에서 기존 seed + 기존 9개 + canary가 한 목록으로 보이는지 확인한다.
- [ ] `/flow-maps/[map]` 상세에서 first action과 source/detail hierarchy가 유지되는지 확인한다.
- [ ] 저장 후 `/my`에서 첫 할 일이 이어지는지 확인한다.
- [ ] `/calendar`와 export가 깨지지 않는지 확인한다.
- [ ] user-facing route 내부 문구 스캔을 통과한다.

검증:

```powershell
npm run docs:check
npm test
npm run build
npm run test:e2e
```

산출물:

- `docs/content-audit/YYYY-MM-DD-source-expansion-app-validation-ko.md`
- 필요하면 `docs/pr-history/YYYY-MM-DD-source-expansion-canary.md`

완료 기준:

- canary 콘텐츠가 앱에서 확인/저장/실행/export 가능하다.
- 기존 9개와 기존 seed 동선이 깨지지 않는다.
- 모바일 390px에서 가로 overflow가 없다.

### Phase H. 다음 배치 확대

목표: canary 결과를 바탕으로 다음 10개 또는 20개 확장 여부를 정한다.

- [ ] canary에서 문제가 된 source shape를 기록한다.
- [ ] app adapter/schema 보강이 필요한지 판단한다.
- [ ] `/flows` catalog가 과밀해졌는지 판단한다.
- [ ] 실제 사용자 관찰이 있다면 open/anchor/export/check/feedback 신호를 분리한다.
- [ ] 다음 배치 크기를 정한다.

판정:

| 결과 | 다음 행동 |
|---|---|
| 앱 surface 문제 없음 | 다음 canary 8~10개 |
| `/flows` 과밀 | catalog filter/grouping 먼저 정리 |
| `/my` 이어하기 약함 | 저장 후 실행 UX 먼저 보강 |
| export 불일치 | export mapping 먼저 보강 |
| source row 품질 약함 | 후보 탐색 규칙 강화 |

## Hard Fail

아래에 해당하면 seed 후보로 올리지 않는다.

- 원문을 실제로 읽을 수 없다.
- 원문 구조가 없고 일반론만 있다.
- Step/Item을 만들려면 AI가 내용을 상상해야 한다.
- 여러 원문을 섞어야만 Flow가 성립한다.
- 사용자가 입력해야 할 값이 캘린더/투두/메모 앱 수준을 넘는다.
- 건강/법률/재무/안전 영역에서 FlowMe가 판단을 대신하게 된다.
- 앱 화면이 review note나 기획 설명 없이는 이해되지 않는다.
- `/flows` 카드에서 첫 행동과 저장 결과가 5초 안에 보이지 않는다.
- 저장 후 `/my`에서 다음 행동이 이어지지 않는다.

## 다음 작업 추천

현재 앱 상황을 고려하면 바로 후보 20개 탐색으로 들어가기보다 아래 순서가 더 안전하다.

1. 현재 9개 curated source의 앱 surface baseline을 짧게 만든다.
2. 그 결과에서 canary 배치 허용 규모를 정한다.
3. 실제 URL 후보 20개를 scout한다.
4. 상위 5~8개만 normalized + app seed handoff로 만든다.
5. canary 앱 적용 후 회귀 검증한다.

## 다음 세션 목표 예시

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
현재 앱에 반영된 기존 seed와 9개 curated source 콘텐츠를 기준으로, 콘텐츠 확장을 시작하기 전에 app surface baseline을 점검한다.
앱 코드는 수정하지 않고, `/flows`, `/flow-maps/[map]`, 저장 후 `/my`, `/calendar`, export 관점에서 어떤 source shape가 다음 확장에 안전한지 문서화한다.

반드시 확인할 것:
- 기존 seed와 9개 curated source가 `/flows`에서 통합 목록으로 보이는지
- 9개 curated source의 first action, source/detail, memo, status 문구가 사용자 화면에서 자연스러운지
- 저장 후 `/my`에서 첫 할 일이 이어지는지
- `/calendar`와 export가 확장 배치에 충분한 구조인지
- 새 콘텐츠를 한 번에 몇 개까지 넣어도 될지

산출물:
- docs/content-audit/YYYY-MM-DD-current-9-app-surface-baseline-ko.md
- docs/content-audit/YYYY-MM-DD-source-expansion-canary-scope-ko.md

완료 기준:
- 첫 확장 canary 배치 규모와 우선 source shape가 정해진다.
- 앱 구현 없이 검토 문서만 만든다.
```

## 완료 기준

이 계획은 다음 조건을 만족하면 유효하다.

- 현재 앱의 4탭 IA, 통합 `/flows` catalog, source-backed save/My Flow/export 구조를 전제로 한다.
- 후보 탐색과 앱 적용 배치가 분리되어 있다.
- 첫 앱 적용 배치는 5~8개 canary로 제한되어 있다.
- 현재 seed adapter가 요구하는 데이터 구조가 계획에 반영되어 있다.
- 사용자 화면과 내부 검토 문구 분리 기준이 들어 있다.
- 실제 사용자 검증 전에는 확장을 검증으로 부르지 않는다.
