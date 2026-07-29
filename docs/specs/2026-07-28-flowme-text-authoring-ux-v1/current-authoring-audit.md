# Current Authoring Audit

## Verdict

기존 Input Composer v1.1은 버릴 대상이 아니다. 실제 source-backed 콘텐츠,
3열 workbench, source 범위, 자연스러운 artifact 판단은 유지할 기반이다.
다만 현재 surface는 입력 경로를 먼저 고르게 하고 preview에서 끝나며,
제작자와 최종 사용자 write path를 한 화면에 섞는다.

Evidence:

- `current_prototype_interaction`
- `current_prototype_source`
- `current_source`
- `heuristic_simulation`

## Keep

- wide의 source/input, interpreted result, artifact preview 관계
- 여덟 source-specific 사례
- source 범위와 가져오지 못한 범위를 숨기지 않는 태도
- 조건에 따라 필요한 값만 묻는 일부 progressive field
- source-derived와 personal value 요약

## Change

1. 입력 경로 선선택을 하나의 composer와 감지 결과 확인으로 바꾼다.
2. 고정 5개 artifact tab을 primary 1개 + secondary 최대 2개로 줄인다.
3. `결과 미리보기`를 destination, 범위, 개수가 있는 행동으로 바꾼다.
4. creator/personal mode toggle을 entry-aware lane으로 분리한다.
5. mobile은 case/route/source 설명보다 입력과 result summary를 먼저 둔다.
6. structure correction과 advanced property를 contextual editor로 옮긴다.
7. save/export receipt와 돌아올 위치를 추가한다.

## Remove

- 결과보다 먼저 나오는 네 입력 경로 버튼
- 사용할 수 없는 artifact의 클릭 가능한 tab
- 소비자 surface의 creator review control
- 내부 taxonomy와 backend field 이름
- 범위가 없는 `저장`, `실행`, `내보내기`
- 전체 문서와 모든 Item을 동시에 편집하는 full editor

## Defer

- 실제 crawler/provider
- AI generation
- account/server sync
- direct API integration
- source update 자동 merge
- rights/safety approval operation

## Severity findings

### Blocking: preview 이후가 없다

- 기대: artifact 범위 확인, 저장/export, receipt, return
- 실제: 이미 보이는 결과 옆에 `결과 미리보기`
- 영향: source-to-use 여정 검증 불가
- 해결: concrete CTA와 receipt

### High: 입력 방식 자체가 선행 지식이다

- 기대: 먼저 입력하고 감지 결과를 수정
- 실제: 한 줄, 여러 줄, URL, 표 경로를 먼저 선택
- 영향: 잘못된 경로와 mobile 부담
- 해결: unified composer, 표만 보조 import

### High: source 편집과 개인화가 같은 surface다

- 기대: entry와 ownership에 따른 write path
- 실제: 제작/개인 mode가 항상 함께 노출
- 영향: canonical 원본과 개인 값 혼동
- 해결: creator draft, personal draft, suggestion을 별도 저장 행동으로 분기

### High: mobile에서 useful result가 늦다

- 기대: 첫 viewport 또는 짧은 scroll 내 result summary
- 실제: route, case, source, input, derived list 뒤에 preview
- 해결: composer + result summary 우선, source detail 접힘

### High: long progress 콘텐츠의 현재 위치가 없다

- K-MOOC 14주와 LibriVox 38장은 모두 펼치기만 제공한다.
- current row, search, progress filter, resume가 필요하다.
- 14/38행을 축약하는 방식으로 해결하지 않는다.

### Medium: recovery와 source update가 보이지 않는다

- local draft가 남아도 복구 여부를 설명하지 않는다.
- source version change와 personal overlay 보존을 확인할 수 없다.
- explicit recovery와 compare state가 필요하다.

### Medium: selection semantics가 시각 스타일에 의존한다

- role, artifact, lane switch는 button style이 아니라 pressed/radio/tab semantics가 필요하다.

## Complexity baseline

| 지표 | 현재 | 권장 |
|---|---:|---:|
| composer 전 route control | 4 | 0 |
| 평가용 case control | 8 | 1 selector |
| 항상 보이는 artifact | 5 | primary 1 + secondary 최대 2 |
| active surface primary action | 다수 | 1 |
| first preview 전 사용자 입력 | 사례별 1~2 | 일반 사례 0~2 |
| mobile 단계 | 긴 단일 column | Input -> Structure -> Result |

## Current capability boundary

- deterministic memo segmentation: current source/e2e evidence 있음
- source-backed projection: fixture evidence 있음
- structural authoring persistence: 제안
- source/user conflict resolution: 제안
- Markdown round-trip receipt: 제안
- actual AI parsing: 없음
- account/cloud persistence: 없음
