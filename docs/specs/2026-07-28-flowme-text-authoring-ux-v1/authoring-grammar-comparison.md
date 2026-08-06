# Authoring Grammar Comparison

현재 쓰기 정본은 [text-authoring-contract-v2.json](./text-authoring-contract-v2.json)이다.
[v1 계약](./text-authoring-contract-v1.json)은 대시 없는 속성과 legacy 별칭을 잃지 않고
읽기 위한 호환 기준으로만 보존한다.

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
- 줄 앞 `##`는 Step
- 줄 앞 `- [ ]`는 Item
- Item 바로 아래에 공백 두 칸으로 들여쓴 `key: value`는 그 Item의 property
- Item끼리의 묶음은 들여쓴 하위 목록이 아니라 새 `##` Step으로 표현
- plain bullet, `*`, `+`, 번호 목록은 가져오기 호환 입력으로만 읽고 canonical
  Markdown에서는 `- [ ]`로 통일

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

## 7. Text Authoring Grammar v2

### 7.1 목표

`TA-GRAMMAR-V2`의 목표는 입력 예시, 작성 형식 안내, 실시간 미리보기, Markdown
내보내기가 아래 한 가지 보이는 문법을 공유하게 하는 것이다.

```text
일반 메모는 원문으로 보존한다.
+ 구조는 익숙한 Markdown을 쓴다.
+ 날짜와 시간은 ISO 형태를 쓴다.
+ FlowMe 속성은 들여쓴 한국어 property bullet로 쓴다.
= 사용자는 공식 작성법 한 가지만 배운다.
```

### 7.2 공식 작성 문법

```markdown
# 여행 준비
- 기준일: 2026-08-10

## 예약
- [ ] 항공권 확인
  - 설명: 출발 시간과 수하물 조건을 확인한다.
  - 완료 기준: 예약번호를 메모에 남긴다.
  - 날짜: 2026-08-03
  - 시간: 08:20
  - 시간대: Asia/Seoul
  - 소요 시간: 20분
  - 반복: 매주 월요일
  - 장소: 김포공항
  - 조건: 가격이 예산 안일 때
  - 자료: [항공사 예약 페이지](https://example.com)
  - 안내: 여권 이름과 같은지 확인한다.
  - 주의: 결제 전 취소 규정을 확인한다.
  - 출처: [공식 안내](https://example.com/guide)

- [ ] 온라인 체크인
  - 상대 날짜: D-1
```

- 구조는 CommonMark/GFM에서 익숙한 `#`, `##`, `- [ ]`,
  `[이름](https://example.com)`을 쓴다.
- 속성은 해당 Item 바로 아래에 공백 두 칸 이상 들여쓴
  `- 공식 속성: 값` bullet 한 줄이다. 속성 bullet은 Item 수를 늘리지 않는다.
- v2의 정본 계층은 `Flow > Step > Item`이다. Item 안에 Item을 들여쓰는 문법은
  부모 관계를 보존하지 않으므로 공식 문법에 포함하지 않는다.
- 절대 날짜는 `YYYY-MM-DD`, 시간은 24시간제 `HH:mm`이다.
- `D-3`, `D-Day`, `D+2`는 기준일과의 관계를 나타내는 FlowMe의 짧은 확장이다.
- 실제 기준일은 Flow 제목 다음의 `- 기준일: YYYY-MM-DD` 한 줄만 사용한다.
  UI에서 기준일을 바꿔도 이 원문 줄을 함께 바꾼다.
- 제목 입력란과 붙여 넣은 첫 `# 제목`은 같은 Flow 제목이며 서로 즉시 동기화한다.
- 표식 없는 일반 문장은 원문과 텍스트 결과로 보존하며 canonical Item을 만들지 않는다.
  기존 자동 문장 분해는 명시적 가져오기 보조 또는 v1 fixture 읽기에만 적용한다.

### 7.3 공식 속성 이름

| 역할 | 공식 표기 |
|---|---|
| Flow 기준일 | `- 기준일: YYYY-MM-DD` |
| 설명 | `  - 설명: ...` |
| 완료 조건 | `  - 완료 기준: ...` |
| 절대 일정 | `  - 날짜: YYYY-MM-DD` |
| 상대 일정 | `  - 상대 날짜: D-3` |
| 시각 | `  - 시간: HH:mm` |
| 시간대 | `  - 시간대: Asia/Seoul` |
| 예상 작업량 | `  - 소요 시간: ...` |
| 반복 정의 문구 | `  - 반복: ...` |
| 장소 | `  - 장소: ...` |
| 실행 조건 | `  - 조건: ...` |
| 참고 자료 | `  - 자료: [이름](https://example.com)` |
| 안내 | `  - 안내: ...` |
| 주의 | `  - 주의: ...` |
| 출처 | `  - 출처: [이름](https://example.com)` |

### 7.4 호환 정책

작성 화면과 내보내기는 v2 공식 표기만 만든다. 파서는 기존 문서를 잃지 않기 위해
v1의 대시 없는 들여쓴 `key: value`와
`상세:`, `자세히:`, `방법:`, `완료:`, `상대일:`, `예상 시간:`, `링크:`,
`영상:`, `가이드:`, `경고:`와 `이름 | URL` 형태를 입력 호환 alias로만
받아들인다. 알 수 없는 `key: value`는 설명으로 조용히 흡수하지 않고 원문을
보존한 `unknown_property` issue로 표시한다. 들여쓴 `- [ ]`은 새 Item으로
평탄화하지 않고 `unsupported_nested_item` issue로 남긴다.

`반복:`과 `조건:`은 현재 사람이 읽을 수 있는 정의 문구를 보존하는 필드다. 반복
회차를 만들거나 ICS `RRULE`을 생성하지 않는다. RRULE이나 자연어 날짜 추론을
작성자에게 요구하는 기능은 v2 범위가 아니다.

### 7.5 완료 기준

- 공식 예시와 도움말에 호환 alias가 노출되지 않는다.
- 입력 수정과 제목 수정이 Structure와 Result에 즉시 반영된다.
- 공식 문법으로 내보낸 Markdown은 숨은 metadata 없이 다시 가져와도 같은
  Flow/Step/Item과 지원 속성을 복원한다.
- 잘못된 날짜와 알 수 없는 속성은 원문을 잃지 않고 issue가 된다.
- 속성 bullet과 지원하지 않는 중첩 Item은 ghost Item을 만들지 않는다.
- 기존 alias와 Step 제목의 상대 날짜 표기는 읽기 호환을 유지한다.
- 390/1024/1440px와 짧은 화면에서 작성 형식, 입력 끝, 결과 끝에 도달할 수 있다.

### 7.6 제외와 재검토 조건

AI 문장 해석, 자연어 날짜 계산, 실제 반복 회차 생성, RRULE 작성 UI, 외부
Calendar/Todo/Sheet 쓰기, 공개 배포, 사용자 관찰은 이번 목표에서 제외한다.
실제 반복 일정 생성이 제품 범위에 들어오거나 공식 문법으로 표현할 수 없는 필드가
추가될 때 이 결정을 다시 연다.
