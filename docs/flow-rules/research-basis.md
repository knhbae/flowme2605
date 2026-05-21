# Research Basis

이 문서는 FLOW 품질 기준을 만들 때 참고한 외부 UX, accessibility, content design 기준과 FLOW에 적용할 해석을 정리한다. 외부 기준은 그대로 복사하지 않고 FLOW의 “콘텐츠를 실행 도구로 옮기는 서비스”라는 맥락에 맞게 번역한다.

## External Standards Compared

| Source | Useful Standard | FLOW Interpretation |
|---|---|---|
| Nielsen Norman Group, 10 usability heuristics | Heuristics are broad rules of thumb, not rigid rules. UI should use user language, reduce memory load, keep only relevant information, and give clear feedback. | FLOW rules should be broad enough for many categories. Avoid internal terms like `routine` or `anchor` when user-facing. Keep exact-video flows light, but allow complex plans when the content and user need justify it. |
| GOV.UK content design | Start with a valid user need, write in plain English, use audience vocabulary, and choose formats around the user need. | Every Flow needs a user-need statement: “As a [person], I need to [do something], so that [outcome].” Do not create Flow structure to justify existing UI. Choose calendar, sheet, memo, or internal check based on need. |
| WCAG 2.2 / W3C | Content and UI must be perceivable, operable, understandable, and robust. | A Flow is not useful if controls, language, or exported files cannot be understood or operated by the intended user. Accessibility is part of content quality, not only CSS. |
| Material Design writing | Clear, accurate, concise text makes interfaces more usable and trustworthy. UI text should be understandable across culture and language. | FLOW copy should predict what happens next. Buttons should say the outcome, not the feature category. |
| Atlassian Design System content | UI content should be clear, concise, conversational, consistent, and localizable. | FLOW should use stable, predictable terms for repeated concepts: “캘린더에 넣기”, “엑셀 실행표 받기”, “메모/노션에 복사”. |
| Microsoft Inclusive Design | Recognize exclusion, learn from diversity, solve for one and extend to many. | Design for anxious, busy, low-context users first: people on mobile, people trying a creator’s routine for the first time, people managing family/health/admin tasks under time pressure. Improvements for them usually help everyone. |

## Derived FLOW Design Principles

1. **User need before format.** Do not decide timeline/routine/checklist before naming the user need and target tool.
2. **User language before system language.** User-facing copy should say “운동 요일” or “적용 요일”, not `routine`.
3. **Portable by default.** FLOW’s value increases when the result moves into a user’s existing tool.
4. **Minimum necessary complexity.** A single video may need one action; an exam plan may need calendar plus sheet; a baby meal plan may need logs. Complexity is justified by user need, not by agent effort.
5. **Visible next step.** The user should be able to see what happens now, what happens after export/copy, and how completion is judged.
6. **Safety and source separation.** Sensitive categories must separate official information, creator experience, and risk warnings.

## Sources

- Nielsen Norman Group, “10 Usability Heuristics for User Interface Design”: https://www.nngroup.com/articles/ten-usability-heuristics/
- GOV.UK, “What is content design?”: https://www.gov.uk/guidance/content-design/what-is-content-design
- GOV.UK, “User needs”: https://www.gov.uk/guidance/content-design/user-needs
- GOV.UK, “Writing for GOV.UK”: https://www.gov.uk/guidance/content-design/writing-for-gov-uk
- W3C WAI, “Understanding WCAG 2.2”: https://w3c.github.io/wcag/understanding/intro
- Material Design, “Writing”: https://m1.material.io/style/writing.html
- Atlassian Design System, “Content”: https://atlassian.design/foundations/content
- Microsoft Inclusive Design: https://inclusive.microsoft.design/
