---
name: flow-copy-editor
description: Use when FLOW UI text, action titles, completion criteria, warnings, or export labels feel generic, obvious, verbose, or not tied to a user's concrete next action.
---

# FLOW Copy Editor

Use this skill to rewrite copy after the product decision is clear.

## Required Reference

- `docs/flow-rules/ux-copy.md`

## Edit Procedure

1. Run the zero-copy test: if layout, control label, value, or state already communicates the sentence's job, delete it instead of rewriting it.
2. Identify the remaining sentence's job: button outcome, action title, how-to detail, warning, source note, or empty-state.
3. Remove generic motivation unless it changes user behavior.
4. Add one of: tool, date, object, decision, completion signal, or stop condition.
5. Keep user-facing words concrete and familiar.
6. Check that the revised copy still matches the actual UI behavior.

Do not keep both a heading and helper sentence when they say the same thing.
Permanent helper copy must explain a consequence, exception, risk, or recovery
path; move optional how-to detail behind contextual help.

## Rewrite Patterns

```text
관리하기 → [대상]을 [도구/시점]에 넣고 [완료 기준]으로 표시하기
확인하기 → [무엇]을 보고 [결정]하기
기록하기 → [어디에] [어떤 값]을 남기기
실천하기 → [오늘/다음 식사/이번 주] [행동] 하기
상황에 맞게 → [구체 예외/중단 조건]이면 [대체 행동] 하기
```

## Before / After

Weak:

```text
식단을 관리하고 기록합니다.
```

Better:

```text
다음 식사 한 끼에서 단백질 먼저 먹기를 적용하고, 유지할지 중단할지 표시합니다.
```

Weak:

```text
운동을 꾸준히 실천합니다.
```

Better:

```text
월/수/금 20분 운동으로 캘린더에 넣고, 실행한 날만 완료로 표시합니다.
```

## Stop Conditions

Do not rewrite around a bad product decision. If the button outcome, destination, or source/risk boundary is unclear, return to `flow-ux-review` first.
Do not delete accessibility labels, safety warnings, source attribution, error
recovery, or irreversible-action consequences merely to make the screen shorter.
