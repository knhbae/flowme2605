# FLOW Channel Content Inventory Design

> 작성일: 2026-05-22  
> 적용 선택지: 2번 - `source_status=real` 40개는 전수 1차 분류하고, 수동 source-fit audit 10개는 별도 검토 완료군으로 유지하며, 생성형 프리뷰 440개는 검증된 Flow가 아닌 샘플 후보로 격리한다.

## 배경

현재 seed inventory는 총 511개 Flow bundle이다.

| 구분 | 수량 | 현재 문제 |
|---|---:|---|
| 수동 source-fit audit Flow | 10 | 원본 적합성, 사용자 여정, 간극, 수정 방향이 수동 문서화되어 있다. 현재 seed에서는 `source_status`가 비어 있어 status-real 40개와 별도군이다. |
| `source_status=real` Flow | 40 | 실제 원본 metadata가 있으나 수동 source-fit audit은 아직 없다. 이번 작업에서 전부 derived review로 분류한다. |
| 생성형 채널 프리뷰 Flow | 440 | 채널별 미리보기 샘플인데 실행성 점수와 channel card 때문에 검증된 콘텐츠처럼 보일 수 있다. |
| legacy/기타 seed Flow | 21 | 기존 데모 접근성을 위해 직접 route는 유지하되 대표 검증 Flow처럼 보이면 안 된다. |

이 작업의 목적은 모든 콘텐츠를 한 번에 완성하는 것이 아니다. 사용자가 "이 Flow는 원본을 보고 실행형으로 정리할 가치가 있는가"와 "아직 샘플 후보인가"를 구분할 수 있게 만드는 것이 첫 단계다.

## 제품 원칙

1. `source_status=real` Flow 40개는 전부 inventory review 대상으로 분류한다.
2. 수동 source-fit audit 10개는 깊은 검토가 끝난 Flow로 유지한다.
3. 실제 원본 metadata가 있으나 수동 audit이 없는 40개는 source metadata 기반의 derived review로 표시한다. 이것은 "원본 페이지를 사람이 다시 열어 검토했다"는 뜻이 아니다.
4. 생성형 preview 440개는 검증 Flow가 아니라 "채널 샘플 후보"로 표시한다.
5. 어떤 Flow도 실제 사용자 행동 데이터 없이 "검증됨"이라고 부르지 않는다.
6. 공개 route는 삭제하지 않는다. 다만 catalog, channel, lab에서 노출 등급과 다음 작업을 정확히 표시한다.

## 콘텐츠 등급

### 1. Manual Source Fit

- 대상: `source-fit.ts`에 수동 audit record가 있는 Flow
- 의미: 원본 적합성, 사용자 여정, 현재 간극, 콘텐츠/UX 수정 방향을 사람이 문서화했다.
- 공개 처리:
  - `keep_representative`: 대표/추천 후보
  - `reshape_before_featured`: 직접 접근 가능, source review 필요
  - `catalog_preview_only`: 카탈로그 미리보기만
  - `hide_from_public_catalog`: 직접 URL만 유지하고 catalog 숨김

### 2. Derived Real Source Review

- 대상: `flow.source_status === 'real'` 이지만 수동 audit record가 없는 Flow
- 의미: source metadata, source precision, source type, risk, structure, item detail 존재 여부로 1차 분류했다.
- 공개 처리:
  - exact official/reference source이고 risk boundary가 명확하면 `source_review`
  - exact video/routine은 `catalog_preview` 또는 `source_review`
  - broad channel/source는 `catalog_preview`
  - health, diet, childcare 등 sensitive source는 대표 후보가 될 수 없다.
- UI copy: "원본 링크 기반 1차 분류" 또는 "원본 검토 대기"

### 3. Generated Preview Candidate

- 대상: `flow.source_status === 'preview'` 또는 preview channel generator로 생성된 Flow
- 의미: 채널별로 어떤 Flow가 나올 수 있는지 보여주는 샘플 후보. 원본별 검토가 완료된 콘텐츠가 아니다.
- 공개 처리:
  - channel page와 Content Lab에서는 볼 수 있다.
  - 대표 Flow, 검색 상위, 신뢰 카드에서는 제외한다.
  - UI copy는 "샘플 후보", "원본 검토 전", "제작 가능성 미리보기"를 사용한다.

### 4. Legacy Accessible

- 대상: source metadata가 없거나 기존 데모를 위해 남긴 seed Flow
- 의미: 기존 route 호환을 위해 접근은 유지하지만, 대표 검토 대상으로 보지 않는다.
- 공개 처리:
  - 직접 route 접근 가능
  - catalog 대표 노출은 제한
  - 이후 실제 source를 붙이거나 제거할 후보

## 점수와 결정

수동 source-fit 점수는 기존 0-100 source-fit scoring을 유지한다. Derived review는 같은 점수처럼 보이면 과신을 만들 수 있으므로 별도 maturity score를 사용한다.

| 항목 | 점수 기여 |
|---|---:|
| real source link 존재 | 20 |
| exact source precision | 20 |
| official/reference source | 15 |
| item detail의 why/how/completion 존재 | 15 |
| calendar/todo/sheet로 옮길 구조가 명확함 | 15 |
| risk boundary가 명확함 | 15 |

Generated preview는 maturity score를 공개 신뢰 점수로 표시하지 않는다. 대신 preview count와 sample candidate label만 표시한다.

## 앱 반영 범위

### Content Lab

Content Lab은 source-fit audit 10개만 보여주는 화면에서 inventory coverage 화면으로 확장한다.

노출해야 할 핵심 수치:

- 전체 Flow 수
- 실제 원본 Flow 수
- 수동 source-fit audit 수
- derived real-source review 수
- generated preview candidate 수
- legacy accessible 수
- source-status-real coverage: `derived === source_status=real count`
- source-backed inventory coverage: `manual + derived`

수동 audit table은 유지한다. 단, 제목을 "수동 Source-Fit Audit"로 바꿔 metadata 기반 1차 분류와 혼동하지 않게 한다.

### Channel Directory

채널 카드는 "execution score" 중심에서 "콘텐츠 성숙도" 중심으로 바꾼다.

기존:

- `46 flows`
- `출처 확인 2`
- `샘플 44`
- `실행성 점수 89`

변경:

- `실제 원본 2개`
- `샘플 후보 44개`
- `수동 검토 0개` 또는 `수동 검토 2개`
- `다음 작업: 원본별 검토 필요`

채널별 프리뷰는 사라지면 안 된다. 사용자가 채널별로 어떤 Flow 확장이 가능한지 보는 것은 제품 탐색에 필요하다. 다만 샘플 후보와 검토 완료 Flow를 시각적으로 구분한다.

### Catalog/Home

대표 섹션은 `keep_representative` manual audit Flow 위주로 유지한다. Generated preview candidate는 대표 섹션에 들어가지 않는다.

Preview/sample을 완전히 숨기지는 않는다. 별도 섹션명은 "채널별 샘플 후보" 또는 "원본 검토 전 아이디어"를 사용한다.

### Direct Flow Page

직접 route로 들어온 사용자는 기존처럼 Flow를 볼 수 있다.

상단 status banner는 manual source-fit decision이 있을 때 지금처럼 구체 결정을 보여준다. Derived review만 있는 경우에는 "원본 링크 기반 1차 분류" 수준의 낮은 강도 안내만 보여준다. Preview candidate는 "샘플 후보"임을 표시해야 한다.

## 데이터 흐름

새 모듈을 추가한다.

```ts
reviewContentInventory(bundle: FlowBundle): ContentInventoryReview
summarizeContentInventory(bundles: FlowBundle[]): ContentInventorySummary
```

`reviewContentInventory`는 먼저 `getSourceFitAudit(slug)`를 확인한다. 수동 audit이 있으면 manual review를 반환한다. 없으면 `flow.source_status`, `flow.source_precision`, `flow.source_type`, `flow.risk_level`, `itemDetails`, `structure_type`를 읽어 derived review 또는 preview/legacy review를 반환한다.

이 모듈은 public exposure를 즉시 크게 바꾸는 책임을 갖지 않는다. 공개 노출 gating은 기존 `execution-model.ts`의 manual source-fit 정책을 유지한다. 이번 작업은 먼저 inventory language와 channel/lab UI를 정비하는 것이다.

## 테스트 기준

1. 511개 전체 bundle이 정확히 하나의 inventory review를 가진다.
2. `source_status=real` 40개는 derived review로 전부 커버된다.
3. manual audit 수는 10개로 유지된다.
4. generated preview 440개는 모두 `generated_preview_candidate`로 분류된다.
5. Content Lab summary가 real-source coverage와 preview candidate count를 노출한다.
6. Channel summary가 preview candidate를 검증 Flow처럼 보이는 score로 포장하지 않는다.
7. 기존 representative gating 테스트는 깨지지 않는다.

## 비목표

- 이번 작업에서 실제 원본 페이지 30개를 사람이 다시 열어 수동 검토했다고 주장하지 않는다.
- 440개 preview Flow의 콘텐츠를 모두 작성하지 않는다.
- route를 대량 삭제하지 않는다.
- 검색/추천 알고리즘을 새로 만들지 않는다.
- 로그인, 서버 DB, 이벤트 수집을 추가하지 않는다.

## Self Review

- Placeholder scan: 빈칸으로 남겨둔 요구사항 없음.
- Internal consistency: manual audit과 derived review를 명확히 분리했고, preview channel을 유지하되 검증 표현은 제거한다.
- Scope check: source inventory model, Content Lab, channel UI에 한정한다. 월별 캘린더/루틴 UX 정비는 별도 실행 모델 작업으로 남긴다.
- Ambiguity check: derived review는 사람이 원본을 재검토한 것이 아니라 metadata 기반 분류라고 명시했다.
