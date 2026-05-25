# Sinagong Study Source Replacement Spec

Date: 2026-05-25

## Goal

Replace `real-sinagong-computer-d30-study` broad Sinagong site source with the exact Gilbut/Sinagong book page used by the current computer-skills study example.

## User Story

As a FLOW editor, I need study routes to identify the exact source that supplies curriculum or exam-scope rows, so learners are not asked to design a progress table from a broad site.

## In Scope

- Update `real-sinagong-computer-d30-study` source metadata to the exact book page.
- Keep the route in `reshape_content_or_ux`.
- Update broad-source guard counts from 4 to 3.
- Update natural-artifact audit, tests, Flow Lab E2E expectations, docs, and screenshot evidence.

## Out Of Scope

- Representative/public-MVP promotion.
- Validation claims.
- Automatic curriculum extraction.
- Merging or removing the route.
- Rewriting all study progress rows in this batch.

## Acceptance Criteria

- `real-sinagong-computer-d30-study` has `source_precision: exact`.
- Its `source_url` is `https://www.gilbut.co.kr/m/book/view?bookcode=BN004603`.
- Its natural-artifact decision remains `reshape_content_or_ux`.
- Broad real-source guard count is 3 and representative leaks remain 0.
- `computer-skills-d30-study` remains the representative-eligible example; no route is called validated.
