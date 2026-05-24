# Study Progress Table Rules

Use a study progress table only when the source already has a structure that can become rows.

## Eligible Sources

A study Flow may use a progress table when the original content includes at least one of:

- A table of contents, chapter list, or lesson list.
- A curriculum, syllabus, weekly plan, or course outline.
- An exam scope, subject breakdown, or official test domain list.
- Past-exam rounds, mock-test rounds, assignments, or practice sets.
- A source-provided sequence such as week 1, module 2, chapter 3, or part A.

The creator should copy or summarize those source rows into FLOW during conversion. The user should not start from a blank table.

## Ineligible Sources

Do not force a progress table when the source is mainly:

- A review, testimonial, or study diary.
- General tips, motivation, advice, or lessons learned.
- A single explanation video without a source sequence.
- A tool recommendation list without a curriculum.
- A loose Q&A or opinion thread.

These sources usually fit better as a checklist, memo, routine, or decision note.

## Creator Responsibilities

Before publishing a study Flow, the creator checks:

- Is this content actually a progress table, or is it a checklist, memo, routine, comparison table, or score log?
- Which rows came from the source table of contents, curriculum, exam scope, past-exam rounds, or weekly plan?
- Are row names concrete enough that the learner can recognize the source material?
- Did FLOW leave only user-editable fields such as target date, status, memo, wrong-answer note, retry date, weak area, or score?
- Are source-derived rows framed as editable defaults, not as an auto-generated or guaranteed study plan?
- Are score and wrong-answer records separated from any claim about exam outcome?

## User-Editable Fields

For Stage 0, keep the user edit surface narrow:

- Target date.
- Status.
- Memo.
- Wrong-answer note.
- Retry date.
- Weak-area note.
- Mock score or practice result when the source includes practice rounds.

Avoid asking users to design row categories, decide every chapter grouping, or build the table schema themselves.

## Current Example

`computer-skills-d30-study` is the current representative example.

- The Flow uses an exam-date anchor and source-derived progress rows.
- The progress table starts with chapter or skill rows instead of empty week labels.
- The user edits target dates, status, notes, mock scores, wrong answers, retry dates, and weak areas.
- The natural artifact is a D-30 calendar plus spreadsheet, not a native FLOW study dashboard.

This is still manual conversion. It is not automatic curriculum generation, URL ingestion, or AI study-plan publishing.
