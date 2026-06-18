# 2026-06-09 Category Expansion Next Samples Note

## Purpose

`jeonse-contract-precheck-docs` is accepted as the first source-to-Flow UX sample. The next step is not to keep polishing jeonse details, but to test whether the same lightweight FlowMe model works across different content domains and artifact shapes.

This is source-to-Flow QA, not user-behavior validation.

## New Review Artifact

- Static UX/UI pack: [2026-06-09-category-expansion-ux-ui-pack.html](./2026-06-09-category-expansion-ux-ui-pack.html)

The file is a user-screen-oriented prototype pack, not a full review report. It separates the executable screen from the side review notes so the main surface can be judged like a user-facing Flow.

## Samples Covered

| Candidate | Domain | Artifact shape | Main validation question |
|---|---|---|---|
| `elementary-school-entry-d30` | parenting/education | D-30 timeline + checklist | Can official school guidance and parent prep tips stay separated while still becoming a useful parent Flow? |
| `kids-printable-squishy-craft` | kids play / creator material | source link + checklist | Can a creator template be preserved by link without copying the source into FlowMe? |
| `remote-help-session-precheck` | digital procedure | ordered permission checklist | Can remote help be prepared without storing access codes, passwords, session links, screenshots, chats, or device lists? |
| `fridge-cleanout-weekly-plan` | food / groceries | small inventory sheet + checks | Can a fridge-cleanout source become a lightweight table without becoming a diet, nutrition, or savings app? |

## Criteria To Keep Applying

- Use real source-backed content, preferably Korean where source quality and copy can be judged quickly.
- Choose content with visible execution structure: date, D-day, repeat rule, checklist row, table row, prompt, submission, visit, or decision point.
- Keep setup at calendar/reminder/checklist complexity: usually one to three inputs.
- Move method, caution, source URL, and optional details into memo/detail/URL surfaces.
- Keep official facts, creator experience, and cautions separate.
- Do not store sensitive values or imply legal, medical, financial, security, education, or nutrition certainty.
- Avoid proving the same pattern repeatedly. The goal is to test whether FlowMe's calendar/checklist/sheet/memo model works when the source shape changes.

## Current Judgment

The recommended next sample remains `elementary-school-entry-d30`, because it follows the date-based structure from jeonse but changes the user moment to parent/school entry preparation. After that, move quickly to `kids-printable-squishy-craft`, `remote-help-session-precheck`, and `fridge-cleanout-weekly-plan` so the review covers creator material, digital procedure, and sheet/inventory shapes.

Update on 2026-06-10: `elementary-school-entry-d30` was already public, so the next executed step was `kids-printable-squishy-craft`. It now has `/f/kids-printable-squishy-craft` as a public source-review route. The route proves the creator-material axis by keeping the original printable as a URL/detail artifact while FlowMe stores only the parent-side execution checklist.

Second update on 2026-06-10: `remote-help-session-precheck` was promoted into `/f/remote-help-session-precheck` as the digital-procedure sample. The route is intentionally an `internal_check` Flow, not a calendar: it starts with requester/scope, asks whether screen sharing is enough, treats one-time remote control and repeated access separately, stores no codes/IDs/passwords/session URLs/tokens/screenshots/chats/device lists, and ends with session closeout. Handoff: [2026-06-10-remote-help-session-public-route-note.md](./2026-06-10-remote-help-session-public-route-note.md).

Third update on 2026-06-10: `fridge-cleanout-weekly-plan` was promoted into `/f/fridge-cleanout-weekly-plan` as the sheet/inventory sample. The route converts a creator fridge-cleanout article into a 7-day inventory sheet with `우선 재료`, `메뉴 후보`, `장보기 보류`, `상태`, and `메모` columns. It deliberately avoids diet, nutrition, food-safety, grocery recommendation, and savings guarantee behavior. On mobile, the sheet artifact appears before setup so the user sees the executable table in the first viewport. Handoff: [2026-06-10-fridge-cleanout-public-route-note.md](./2026-06-10-fridge-cleanout-public-route-note.md).

Completion update on 2026-06-11: the current 3-5 sample loop is closed. The completion audit compares the five representative public routes and records the judgment that this is enough source-to-Flow QA evidence before comparison or real-user observation. Handoff: [2026-06-11-category-expansion-completion-audit.md](./2026-06-11-category-expansion-completion-audit.md).

## Follow-Up QA

- Open the UX/UI pack on mobile width and verify that each sample's first screen shows executable content before review notes.
- Check that source links are actual source links, not root placeholders.
- Check that no sample asks for more than three top-level inputs.
- Compare the four samples with the jeonse sample and decide whether FlowMe reads as "online content to personal execution Flow", not as a single-category checklist app.
