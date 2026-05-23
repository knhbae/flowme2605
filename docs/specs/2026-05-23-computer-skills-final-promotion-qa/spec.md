# Computer Skills Final Promotion QA Spec

## Goal

Promote `computer-skills-d30-study` from final QA candidate to representative-eligible after real screen and export checks.

## Flow Job

| Field | Value |
| --- | --- |
| User | A learner with a fixed computer-skills exam date |
| Need | Convert the last 30 days into a calendar plus score/error log |
| Destination | Calendar + spreadsheet |
| Structure | Timeline with study log tables |
| Source | `2026 한 권으로 끝내는 시나공 컴활 1급 필기+실기` |
| Risk level | Low |

## Acceptance Criteria

- Desktop first-screen QA shows title, exam-date input, first action, progress, export state, calendar preview, chapter log, and mock-score log.
- Mobile first-screen QA shows no text/control overlap at 390px width.
- Mobile export bottom sheet opens after one item is checked.
- Export downloads produce `computer-skills-d30-study.xlsx` and `computer-skills-d30-study.ics`.
- Source-fit summary moves exactly one route from `reshape_before_featured` to `keep_representative`.
- `new-car-delivery-check` and `diet-habit-2week` remain in `fix`.

