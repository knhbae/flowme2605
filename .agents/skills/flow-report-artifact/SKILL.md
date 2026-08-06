---
name: flow-report-artifact
description: Create an inspected FlowMe report artifact for HTML, PPTX, DOCX, PDF, briefing, dashboard, or durable visual-summary requests. Route to the matching format skill.
---

# FLOW Report Artifact

## Route The Format

Honor an explicit format. Otherwise infer the review context and ask only when
the choice would materially change the deliverable.

| Request or use | Default artifact | Specialist skill |
| --- | --- | --- |
| `PPT`, `PPTX`, slides, presentation, meeting deck | `.pptx` | Load the environment's presentation skill; in Codex use `presentations:Presentations` |
| Formal editable report or memo | `.docx` | Load the document skill; in Codex use `documents:documents` |
| Print-ready or fixed-layout distribution | `.pdf` | Load the PDF skill; in Codex use `pdf:pdf` |
| `HTML`, dashboard, visual summary, "한눈에", ongoing status review | responsive `.html` | In Codex use `frontend-app-builder` for substantial visual composition and `playwright` for browser QA |

For a FlowMe progress, backlog, strategy, research, or readiness report with no
format specified, prefer a Korean visual HTML artifact. Prefer PPTX when the
user is preparing a presentation or asks for slide-by-slide communication.

Do not hand-roll PPTX, DOCX, or PDF generation when the environment provides a
dedicated artifact skill. Load that skill before creating or editing the file.

## Build From Evidence

1. Fix the date range, audience, decision question, and source boundary.
2. Read current repo evidence before older summaries. Label `current repo`,
   `prior artifact`, `inference`, and `unknown` separately.
3. Use the matching FlowMe domain skill as needed:
   - overall status or launch readiness: `flow-release-readiness`
   - UX journey or interface review: `flow-ux-review`
   - source conversion: `flow-content-conversion`
   - project-knowledge audit: `flow-knowledge-maintenance`
4. Create the artifact under
   `docs/content-audit/YYYY-MM-DD-<descriptive-name>-ko.<ext>` unless the user
   specifies another destination.
5. Keep the artifact visual. Use charts, timelines, comparison layouts,
   screenshots, or diagrams where they improve comprehension; do not turn a
   report into a decorated list.

## Inspect The Actual Artifact

- PPTX: keep one main idea per slide, render every slide, and inspect clipping,
  overflow, hierarchy, and image quality.
- DOCX: render pages and inspect pagination, tables, headings, and clipping.
- PDF: render pages and inspect the fixed output, not only the source.
- HTML: inspect desktop and 390px mobile widths in a real browser; check
  horizontal overflow, broken images, console/page errors, and text overlap.
- Run `npm run docs:check` after adding a durable repo artifact.

Automated rendering and screenshots are artifact QA, not observed-user
validation. Preserve dirty-worktree ownership, and do not commit, publish, or
replace a canonical current-status artifact unless the user separately asks.
