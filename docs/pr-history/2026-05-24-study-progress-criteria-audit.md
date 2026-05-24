# Study Progress Criteria And UX Audit PR History

**Date:** 2026-05-24
**Branch:** `docs/study-progress-audit-criteria`
**PR:** [#41 Document study progress criteria and export audit](https://github.com/knhbae/flowme2605/pull/41)
**Status:** Merged
**Vercel:** [Deploy check](https://vercel.com/flowme/flowme2605/HQdCyfihekpthD7F57PmBntP253s)
**Related spec:** [2026-05-24-study-progress-criteria-audit](../specs/2026-05-24-study-progress-criteria-audit/spec.md)
**Related audits:** [study progress criteria](../content-audit/2026-05-24-study-progress-table-criteria.md), [export-first user audit](../content-audit/2026-05-24-export-first-user-audit.md)

## Why

The current product direction says study content should not ask users to design a blank progress table. FLOW should use source structure when it exists, and otherwise choose a simpler artifact such as checklist, memo, routine, score log, or comparison table.

## What Changed

- Added a durable study progress-table rule under `docs/flow-rules`.
- Added creator checks for deciding whether a study source really supports progress rows.
- Recorded `computer-skills-d30-study` as the current example of source-derived progress rows.
- Added a six-route export-first UX audit with natural artifact simulations, mobile density notes, current UX gaps, content/UX reinforcements, export-first fit, and source/risk separation.
- Rechecked representative/public MVP candidate wording without calling anything validated.

## Not Done

- No automatic progress-table generation.
- No URL ingestion.
- No external app integration.
- No native FLOW long-term record feature.
- No login, payment, community, or AI auto-publishing.
- No UI code change in this batch.

## Decisions

- Progress tables require a source row basis: table of contents, curriculum, exam scope, past-exam rounds, weekly plan, lesson list, or equivalent structure.
- Review, tip, advice, diary, and motivation content should not be forced into a progress table.
- Users edit target date, status, memo, wrong-answer note, retry date, weak area, and score; creators supply row structure.
- `computer-skills-d30-study` remains representative-eligible but not validated.
- `diet-habit-2week` and `new-car-delivery-check` remain public MVP candidates with guardrails.

## Files Touched

- `docs/flow-rules/study-progress-tables.md`
- `docs/flow-rules/content-conversion-playbooks.md`
- `docs/flow-rules/README.md`
- `docs/content-audit/2026-05-24-study-progress-table-criteria.md`
- `docs/content-audit/2026-05-24-export-first-user-audit.md`
- `docs/specs/2026-05-24-study-progress-criteria-audit/`
- `docs/STATUS.md`

## Verification

- `npm run docs:check` passed: 14 required files, 200 local links.
- `npm test` passed: 129 tests.
- `npm run build` passed.
- `npm run test:e2e` passed: 46 tests.
- Vercel check passed for commit `31d65623ce47e0589a49042ade8998e36b94305d`.
- Merged as squash commit `da8f287a045102e394e7c2a0ff1fa50baef78d94`.

## Risks

- This is a documentation guardrail. It does not yet enforce the rule in tests or UI copy.
- Mobile density findings still need screenshot-backed follow-up if the next batch changes layout.

## Follow-Ups

- Add a small UI/copy PR only if mobile screenshots show a specific high-density issue.
- Add a test guard for `computer-skills-d30-study` source-derived row labels if the next batch touches study UX.
