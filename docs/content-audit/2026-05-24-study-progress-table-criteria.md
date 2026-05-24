# Study Progress Table Criteria Audit

**Date:** 2026-05-24
**Branch:** `docs/study-progress-audit-criteria`
**Primary route:** `computer-skills-d30-study`

## Decision

Study content becomes a progress table only when the original source already contains rows the creator can bring into FLOW: table of contents, curriculum, exam scope, past-exam rounds, weekly plan, lesson list, or assignment set.

Do not turn review, tip, advice, or motivation content into a progress table just because study content often benefits from tracking. Those sources should usually become a checklist, memo, routine, or short score/wrong-answer log.

## Conversion Rule

| Source shape | Progress table? | Better artifact when not eligible |
| --- | --- | --- |
| Course curriculum, syllabus, table of contents, chapter list | Yes | Not applicable |
| Official exam scope, subject list, test-domain list | Yes | Not applicable |
| Past-exam rounds, mock-test rounds, assignment sequence | Yes | Score/wrong-answer log plus calendar |
| Weekly plan or challenge sequence | Yes, if each week has concrete source rows | Routine calendar if rows are too loose |
| Study diary, review, tips, or advice post | No | Memo, checklist, or routine |
| Single explainer video without lessons/modules | No | One action checklist or memo |

## Creator Checklist

- Confirm that the content is a progress table candidate before choosing the table UI.
- Record which row source was used: table of contents, curriculum, exam scope, past-exam rounds, weekly plan, or lesson list.
- Pre-fill row labels from the source during conversion.
- Keep user editing to target date, status, memo, wrong-answer note, retry date, weak area, and score where relevant.
- Keep score and wrong-answer logs separate from any guarantee about passing.
- If row source is missing, downgrade the artifact to checklist, memo, routine, or comparison table.

## Current Example

`computer-skills-d30-study` fits the current rule:

- It has a fixed exam-date anchor.
- Its study rows are source-derived chapter or skill rows, not blank table rows.
- It pairs the progress table with a D-30 calendar and mock-score/wrong-answer records.
- It asks the user to adjust dates, status, notes, weak areas, wrong answers, and retry dates.
- It remains export-first: calendar and spreadsheet first, native study record later only if user behavior proves demand.

## Not In Scope

- No automatic progress-table generation.
- No URL ingestion.
- No AI-generated curriculum publishing.
- No native study dashboard.
- No claim that `computer-skills-d30-study` is validated by user data.
