# Study Flow Action Specificity Audit

Date: 2026-05-25

## Trigger

After the video Flow review, the same execution problem applies to study Flows: a D-30 calendar and progress table can look useful while each item still leaves the user asking what to do when the reminder appears.

The current focus is `computer-skills-d30-study`, which remains representative-eligible but not validated.

## Final Judgment

- Study sequence Flows should not read like generic "study harder" tasks.
- Each dated study item must say the concrete study action and the artifact field that receives the result.
- For `computer-skills-d30-study`, D-30 dates are FLOW's exam-date conversion, not a source-provided 30-day curriculum.
- Source-derived rows stay source-derived; users edit target date, status, note, score, wrong-answer type, retry date, and weak area.

## Issues

- High: dated calendar exports omitted item `how` text, so calendar alarms carried completion criteria but not the action method.
- Medium: several study item details were artifact-linked but still too generic to answer "what do I do now?"
- Medium: the source boundary needed clearer copy that the D-30 schedule is FLOW conversion, not a source-authored curriculum.
- Low: no Figma canvas is needed for this batch because the screen layout and mobile density are unchanged.

## Small Fix In This Batch

- Rewrote all nine `computer-skills-d30-study` item details with `실행:` and `기록:` cues.
- Pointed each item to a concrete output: D-30 학습표, 챕터 진도표, 기출 점수·오답 기록, 캘린더 일정, 실기 환경, or 시험장 준비.
- Added the source-boundary sentence to the Flow description.
- Included item action guidance in dated ICS event descriptions.

## Larger Work Excluded

- Automatic study-plan generation.
- Expanding source-derived rows beyond what the source supports.
- Merging or redesigning `real-sinagong-computer-d30-study`.
- Native long-term study dashboard features.
- Visual redesign in Figma.

## Figma Use

Use Figma for a later UX/UI batch if the study screen layout changes, especially if mobile table density, workbench ordering, or action-detail disclosure needs redesign. This batch changes content/export behavior only.
