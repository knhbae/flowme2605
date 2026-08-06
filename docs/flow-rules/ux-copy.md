# FLOW UX Copy Rules

UX copy should make the next action predictable. It should not compensate for unclear product decisions with more explanation.

## Zero-Copy First

Before rewriting text, test whether it should exist.

- Delete copy that repeats a heading, button, selected value, visible state, or familiar control.
- Do not explain a feature merely because it is present.
- Keep permanent helper text only for a consequence, exception, risk, source boundary, or recovery path the UI cannot express.
- Move optional instructions and advanced detail behind contextual disclosure.
- Never remove accessibility names, safety warnings, source attribution, error recovery, undo, or destructive-action consequences for visual simplicity.

## Copy Principles

### 1. Outcome Before Mechanism

Button names should describe what the user gets.

Good:

- `캘린더에 넣기`
- `엑셀 실행표 받기`
- `메모/노션에 복사`

Weak:

- `내보내기`
- `저장하기`
- `실행하기`

### 2. Concrete Action Before Abstract Intent

Weak:

```text
식단을 관리하고 체중 변화를 확인합니다.
```

Better:

```text
다음 식사 한 끼에서 단백질 먼저 먹기를 적용하고, 과한 제한감이 있으면 중단합니다.
```

### 3. User Tool Vocabulary Before Internal Vocabulary

Use:

- `운동 요일`
- `적용 요일`
- `시험일`
- `이사일`
- `캘린더 일정`
- `엑셀 실행표`

Avoid in user-facing copy:

- `anchor`
- `routine`
- `structure_type`
- `export mode`
- `bundle`

### 4. Specific Defaults, Visible Escape

Good UI gives a useful default and lets the user change it.

Example:

```text
월/수/금 20분 운동으로 시작합니다. 요일은 바꿀 수 있습니다.
```

Avoid:

```text
상황에 맞게 자유롭게 설정하세요.
```

### 5. Explain Risk As A Decision Point

Weak:

```text
건강 상태에 따라 조절하세요.
```

Better:

```text
통증, 어지러움, 기존 질환 악화가 있으면 중단하고 전문가 상담을 우선하세요.
```

## Weak Language Signals

다음 단어는 금지가 아니다. 단독으로 쓰이면 약한 copy라는 신호다. 구체 행동, 날짜, 도구, 완료 기준을 붙여야 한다.

- 관리
- 확인
- 기록
- 점검
- 실천
- 습관
- 꾸준히
- 상황에 맞게
- 참고
- 준비

Repair pattern:

```text
[추상어] + [대상] + [시점/도구] + [완료 기준]
```

Example:

```text
기록하기
→ 오늘 실행 여부를 캘린더 일정에 완료로 표시하기
```

## Section Titles

Section titles should tell users what job the section does.

Good:

- `오늘 실행`
- `내 도구로 옮기기`
- `이번 주 적용 설정`
- `출처와 주의 정보`

Weak:

- `안내`
- `정보`
- `관리`
- `세부 설정`

## Action Item Formula

```text
Title: [verb phrase the user can do]
Why: [why this action matters for this Flow, not generic motivation]
How: 준비 / 실행 / 마무리, or 시점 / 도구 / 완료 기준
Completion: [observable done state]
```

## Microcopy Review Questions

Before shipping UI copy, ask:

1. Can the user predict what happens after clicking?
2. Does the sentence contain a real-world object, tool, date, or decision?
3. Could this sentence appear in any other app? If yes, make it more FLOW-specific.
4. Is this explanation hiding a UI/design problem?
5. Can a user complete the action without reading a paragraph?
