# FLOW Quality Rubric

이 rubric은 좁은 규칙이 아니라 판단 도구다. Flow마다 1-5점으로 평가하고, 낮은 항목부터 개선한다.

## Scoring Scale

| Score | Meaning |
|---|---|
| 1 | 실패. 사용자가 실행하거나 판단하기 어렵다. |
| 2 | 약함. 일부 정보는 있으나 많은 추측이 필요하다. |
| 3 | 사용 가능. 기본 실행은 가능하지만 friction이 있다. |
| 4 | 좋음. 목적, 실행, 내보내기가 대체로 명확하다. |
| 5 | 강함. 원본 핵심, 사용자 목적, 도구 이식성이 모두 잘 맞는다. |

## Dimensions

### 1. User Need Fit

- 1: 카테고리 이름만 있고 구체 사용자 상황이 없다.
- 3: 사용자 목적은 보이나 도구/상황이 애매하다.
- 5: 누가, 언제, 왜 이 Flow를 쓰는지 명확하다.

### 2. Execution Clarity

- 1: “관리/확인/기록” 같은 추상 행동뿐이다.
- 3: 첫 행동은 있으나 완료 기준이나 시점이 약하다.
- 5: 첫 행동, 날짜/시점, 완료 기준, 중단/예외 조건이 보인다.

### 3. Content Fidelity

- 1: 원본 콘텐츠와 무관한 일반론으로 채운다.
- 3: 원본 주제는 맞지만 핵심 구조나 맥락이 약하다.
- 5: 원본의 핵심 판단, 순서, 조건을 실행 형태로 보존한다.

### 4. Portability

- 1: FLOW 안에서만 읽을 수 있다.
- 3: 복사/엑셀은 있으나 목적지별 형태가 약하다.
- 5: 캘린더/시트/메모 등 목적지에 맞는 제목, 날짜, 반복, 링크, 완료 기준이 있다.

### 5. Cognitive Load

- 1: 탭, 카드, 체크리스트, 설명이 목적보다 많다.
- 3: 기능은 있으나 우선순위가 희미하다.
- 5: 첫 화면에서 중요한 순서가 명확하고, 고급 정보는 접혀 있거나 뒤에 있다.

### 6. Copy Specificity

- 1: 뻔한 문장과 추상어가 많다.
- 3: 일부 구체 행동이 있으나 generic filler가 남아 있다.
- 5: 문장마다 사용자가 손으로 할 수 있는 행동, 판단, 결과가 있다.

### 7. Source And Safety Separation

- 1: 공식 정보, 제작자 경험, 위험 경고가 섞인다.
- 3: 출처는 있으나 위험/경험/공식 정보의 경계가 약하다.
- 5: 출처, 경험, 주의, 중단 조건이 구조적으로 분리된다.

### 8. Accessibility And Operability

- 1: 버튼/입력/상태가 이해되거나 조작되기 어렵다.
- 3: 기본 조작은 가능하지만 label, feedback, hierarchy가 약하다.
- 5: 주요 조작이 keyboard/screen reader/모바일 맥락에서도 이해 가능하고, 결과 feedback이 분명하다.

## Release Thresholds

| Status | Requirement |
|---|---|
| Draft only | 평균 3.0 이상, hard fail 없음 |
| Public MVP | 평균 3.5 이상, Execution Clarity/Source Safety 4 이상 |
| Featured/representative | 평균 4.0 이상, Portability/Copy Specificity 4 이상 |
| Validated | Public MVP 기준 + 실제 사용자 행동 데이터 |

## Hard Fail Conditions

다음은 점수와 무관하게 수정 전 공개하지 않는다.

- 건강/의료/다이어트/재무/법률에서 효과나 결과를 보장한다.
- 출처 없는 내용을 공식 정보처럼 표현한다.
- 사용자가 위험 행동을 중단할 기준이 없다.
- 버튼 이름과 실제 결과가 다르다.
- 주요 action이 캘린더/시트/메모/체크 중 어디로 가는지 알 수 없다.
- UI copy가 기능을 설명하지만 사용자의 다음 행동을 말하지 않는다.

## Review Output Format

```md
Rubric summary:
- User Need Fit: 4
- Execution Clarity: 3
- Content Fidelity: 4
- Portability: 2
- Cognitive Load: 3
- Copy Specificity: 2
- Source/Safety: 4
- Accessibility/Operability: 3

Top fixes:
1. Replace generic action titles with destination-specific actions.
2. Add calendar title/repeat/source URL for export.
3. Move non-essential explanation below the first action.
```
