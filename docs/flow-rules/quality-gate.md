# FLOW Quality Gate

Use this gate before publishing or deploying content/UX changes.

## 1. Identify The Flow Job

Write:

```text
User:
Need:
Destination:
Structure:
Source:
Risk level:
```

If this cannot be filled in, the Flow is not ready.

## 2. Score The Rubric

Use [quality-rubric.md](./quality-rubric.md). Record only the lowest scoring dimensions in PR notes or task notes.

Required for public MVP:

- No hard fail
- Execution Clarity >= 4 for sensitive or representative flows
- Source/Safety >= 4 for sensitive flows
- Average >= 3.5

## 3. Check Copy Specificity

Search for weak language signals from [ux-copy.md](./ux-copy.md). Do not blindly delete them; repair them.

Repair:

```text
관리하기
→ 매주 월요일 10분 점검 일정으로 캘린더에 넣기
```

## 4. Check Destination Fit

Each public Flow should answer:

- What goes into calendar?
- What goes into sheet?
- What goes into memo/notion?
- What stays inside FLOW?

Not every Flow needs every output. But if an output exists, it should be shaped for that destination.

## 5. Check UI Load

Flag if:

- The first screen has more than one competing primary action.
- A 1-action Flow exposes week/month/tabs by default.
- Copy explains the same thing twice.
- A feature appears only because the component already supported it.

## 6. Check Source And Risk

For medical, health, finance, legal, baby/family, or safety content:

- Official/source fact is separate from creator experience.
- No outcome guarantee.
- Stop/contact-professional criteria exist where relevant.
- Source URL is near the action or source panel.

## 7. Verify Behavior

Minimum checks:

- Unit tests for conversion/export logic if changed.
- Build for app/runtime changes.
- E2E for user-facing flow changes.
- Browser or screenshot check for visual changes.

## 8. Write The Review Note

Use:

```md
FLOW quality note:
- User need:
- Destination:
- Rubric low points:
- Key decisions:
- Tests:
```

Do not claim real validation unless user behavior data exists.
