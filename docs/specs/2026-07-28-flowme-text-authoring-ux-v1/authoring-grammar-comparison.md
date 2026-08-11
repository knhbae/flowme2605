# Authoring Grammar Comparison

> 이 문서는 초기 문법 후보 비교를 보존하는 역사 문서다. 현재 사용자 문법과
> 파싱·검증·투영 규칙은 [현재 문법·처리 로직](./authoring-grammar-logic.md),
> 기계 계약은 [Text Authoring contract v2](./text-authoring-contract-v2.json)를 따른다.

## 1. 비교 결론

FlowMe 전용 문법을 새로 가르치지 않는다. 기본은 일반 텍스트와 익숙한 Markdown을
감지하고, 구조 보정은 outline UI, 복잡한 속성은 inspector가 맡는다.

```text
plain text first
+ familiar Markdown hints
+ readable Korean labels
+ contextual property controls
= hybrid authoring grammar
```

## 2. 문법 후보

### Label 기반

```text
날짜: 2026-08-03
장소: 김포공항
완료 기준: 예약번호를 메모에 남김
```

판정: `adopt`

- 사람이 읽을 수 있다.
- plain Markdown에서 유지된다.
- 충돌 시 inspector에서 source/user 값을 비교할 수 있다.
- label alias가 늘어날 수 있으므로 canonical 저장에는 normalized key가 필요하다.

### Inline token

```text
항공권 확인 @2026-08-03 @김포공항 @45분
```

판정: `adapt`

- 기존 문서에서 감지할 수 있다.
- 빠른 숙련 사용자 입력에는 유용하다.
- 기본 문법으로 가르치면 날짜/장소/태그가 모호하다.
- prototype에서는 감지만 하고 작성 도움의 기본으로 노출하지 않는다.

### Property inspector

판정: `adopt`

- recurrence, condition, timezone, relative date 같은 복잡한 값을 안전하게 다룬다.
- 원문을 metadata로 채우지 않는다.
- mobile에서는 selected Item detail sheet로 연다.

### Slash command

판정: `defer`

- block editor에 익숙한 사용자에게는 빠르다.
- 첫 버전에서 명령 vocabulary를 새로 학습시킨다.
- keyboard accelerator는 검토할 수 있지만 primary path가 아니다.

## 3. A/B/C 비교

| 평가 항목 | A Markdown-first | B Block/outline | C Hybrid |
|---|---:|---:|---:|
| 첫 preview 전 학습 | 3 | 2 | 1 |
| 원문 소유감 | 5 | 3 | 5 |
| 구조 오류 수정 | 3 | 5 | 5 |
| mobile 부담 | 3 | 4 | 2 |
| 표 보존 | 3 | 4 | 5 |
| source lineage | 4 | 3 | 5 |
| round-trip | 5 | 2 | 5 |
| 범용 editor로 커질 위험 | 중 | 높음 | 낮음 |

점수는 heuristic comparison이며 observed-user metric이 아니다.

## 4. 입력 형태별 처리

### 일반 메모

- 문장/쉼표/줄바꿈을 Item 후보로 감지한다.
- 결과를 먼저 보여 주고 불명확한 분리만 확인한다.
- punctuation을 원문에서 삭제하지 않는다.

### Markdown heading/checklist

- 첫 `#`은 Flow title 후보
- `##` 이하는 Step 후보
- `- [ ]`은 Item 후보
- indented text는 detail 또는 property
- plain bullet은 Item/resource/guide 후보

### Obsidian Markdown

- wikilink, tag, callout, frontmatter는 원문에 유지한다.
- 지원되는 URL만 resource/source 후보로 읽는다.
- unsupported syntax는 issue에 표시한다.
- internal vault path를 외부 URL로 가장하지 않는다.

### TSV/table

- header와 row count를 먼저 확인한다.
- 모든 행을 보존한다.
- header가 불명확하면 mapping을 묻는다.
- 날짜 열이 없으면 Calendar를 만들지 않는다.

### URL + 설명

- URL을 source link 후보로 감지한다.
- provider가 없으면 source content를 가져왔다고 표현하지 않는다.
- 설명 문장만으로 개인 draft를 만들지, 원문 import를 기다릴지 선택하게 한다.

### 날짜·장소·반복 자연어

- 명확한 ISO/local date만 proposal로 표시한다.
- `다음 달`, `매주`, `가끔`은 confirmation issue다.
- timezone과 종료 조건 없는 recurrence는 저장 전에 확인한다.

### Source + personal memo 혼합

- source 구간과 `내 메모` 구간을 분리 표시한다.
- 개인 값이 source 필드를 바꾸면 override로 저장한다.
- source line을 개인 메모로 이동할 때 lineage를 유지한다.

## 5. Unsupported policy

1. 모르는 syntax를 삭제하지 않는다.
2. 자동으로 detail로 숨기지 않는다.
3. 원문 위치와 issue를 표시한다.
4. 사용자는 text로 유지, Item으로 전환, 제외 중 하나를 선택할 수 있다.
5. 권리·안전 문제는 parsing issue와 구분한다.

## 6. Round-trip

Markdown export는 다음을 보장한다.

- Flow/Step/Item 순서
- Item title, detail, completion
- 읽을 수 있는 label
- source/resource URL
- unresolved note
- personal override 표식

다음은 손실 가능성을 preflight에 표시한다.

- complex recurrence
- execution completion history
- occurrence identity
- binary include/exclude metadata
- source revision IDs

Markdown으로 다시 가져오면 같은 Item ID를 보장하지 않는다. `RoundTripReceipt`가
matched/changed/unresolved 수를 보여 준다.
