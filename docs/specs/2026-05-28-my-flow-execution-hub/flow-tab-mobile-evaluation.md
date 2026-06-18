# Flow Tab Mobile Evaluation

**Date:** 2026-05-31  
**Scope:** `/my?demo=ux12` Flow tab on mobile

## Evaluation Criteria

The Flow tab should be judged as an execution surface, not as a catalog manager.

| Criterion | Question | Target |
|---|---|---|
| First-purpose clarity | Can the user tell what they should look at first? | The first default job is `what needs attention now?` |
| Execution priority | Are overdue and next actions above inventory management? | `Flow 상태판` and `지금 볼 Flow` beat the full list |
| Mobile vertical load | Does the default mobile view stack too many large cards? | Full inventory is not a default body card |
| Inventory access | Can the user still reach all Flows quickly? | One explicit `전체 Flow N개 보기` entry point |
| Tap predictability | Do status numbers lead to the relevant list? | `밀림`, `다음 실행`, and `진행 중` open scoped lists |
| Native-app familiarity | Does it resemble calendar/reminder app hierarchy? | Execution smart lists first, `All` list on request |
| Repeat-use fatigue | Will the same user see management controls every visit? | Search/filter only appear after opening all Flows |

## Reference Lens

- Apple Reminders separates smart lists such as `Today`, `Scheduled`, and `All`, so execution views and full inventory are not the same first surface.
- Apple Calendar lets the user switch month views into event lists instead of showing every event list as default month content.
- Samsung Reminder keeps reminder creation, categories, and completed reminder management accessible but separate from the immediate reminder list.

## Before Simulation

Mobile default Flow tab sequence:

1. `Flow 상태판`
2. `실행 우선순위`
3. `전체 Flow 목록` card with search, filters, and an inventory toggle

Observed mobile measurements from Playwright:

| Section | Height |
|---|---:|
| `Flow 상태판` | 318px |
| `실행 우선순위` | 450px |
| `전체 Flow 목록` header | 224px |

Finding: the screen answered both `what should I do now?` and `how do I manage every Flow?` at the same hierarchy. On mobile this made the tab feel like a dashboard/catalog instead of an execution hub.

## Accepted Optimization

Mobile only:

- Keep `Flow 상태판`.
- Keep `실행 우선순위` as the main default body.
- Remove the default `전체 Flow 목록` body card.
- Add one lightweight CTA: `전체 Flow N개 보기`.
- Open the full inventory in a bottom sheet with search and filters.
- Keep `밀림` and `다음 실행` as actionable bottom sheets.
- Make `진행 중` open the full inventory sheet with the `진행 중` filter selected.

Desktop/tablet:

- Keep the existing status board, priority cards, and full inventory because the screen width and scan capacity are higher.

## After Simulation

Mobile default Flow tab sequence:

1. `Flow 상태판`
2. `실행 우선순위`
3. `전체 Flow 12개 보기` CTA

Observed mobile measurements after the optimization:

| Section | Height |
|---|---:|
| `Flow 상태판` | 318px |
| `실행 우선순위` | 450px |
| `전체 Flow 12개 보기` CTA | 46px |

The full inventory still opens through a bottom sheet. The sheet contains search, status filters, and compact Flow rows, so inventory access remains one tap away without competing with the default execution view.

## Verification Targets

- Mobile default Flow tab has no `my-flow-overview-summary` body section.
- Mobile default Flow tab shows `my-flow-mobile-inventory-open`.
- Tapping the inventory CTA opens a dialog labeled `전체 Flow 목록`.
- Tapping `진행 중` opens the same dialog with the `진행 중` filter selected.
- Tapping `밀림` and `다음 실행` opens scoped action sheets.
- Desktop Flow tab keeps the existing full inventory behavior.

