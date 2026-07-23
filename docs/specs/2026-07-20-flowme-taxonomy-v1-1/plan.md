# FlowMe Taxonomy v1.1 Plan

## Objective

Preserve the canonical hierarchy and independent state ownership, then make taxonomy classification reproducible enough for the URL-to-Flow backend to emit a valid DTO without relying on runtime `category`, `structure_type`, `primary_destination`, or free-text provider/format values.

## Work Sequence

1. **Baseline and ownership**
   - Run Full session-start lane.
   - Record branch/HEAD/dirty state.
   - Own only the new v1.1 spec folder and one new HTML review file.
2. **Evidence audit**
   - Read canonical v1, backend readiness, flow rules, P0/36/deep data and current runtime types/seeds.
   - Separate verified fact, current implementation, strategy proposal and unverified hypothesis.
3. **Contract design**
   - Split content meaning, source anatomy, execution, artifact, applicability, access, rights and review.
   - Add value rules, exclusions, confusion pairs and tie-breakers.
4. **Reclassification**
   - Reclassify P0 24, expansion 36, deep 12 and 12 representative runtime seeds.
   - Record old/new values, ambiguity, loss/hold and private/public gates.
5. **Independent comparison**
   - Freeze 20 ambiguous/representative cases.
   - Run deterministic rules and two independent agent reviewers without sharing outputs.
   - Measure pairwise agreement and unanimous exact match.
   - Add only general tie-breakers, then replay once.
6. **Machine contract**
   - Write catalog, JSON Schema, legacy mapping and 10 DTOs.
   - Implement validator and mutation tests.
7. **Stakeholder review**
   - Generate a visual concept first.
   - Implement example-first PPT-style Korean HTML.
   - Review desktop/mobile behavior and concept fidelity.
8. **Closeout**
   - Run targeted validators/tests, docs check, browser QA, scoped work-closeout and dirty-scope audit.

## Iteration Rule

- Round 1 identifies systemic disagreements.
- Change rules only when one general distinction explains multiple cases.
- Do not add a slug/source-specific taxonomy exception merely to raise agreement.
- Stop after Round 2 if all four core axes are at least 85%; allow Round 3 only for another systemic ambiguity.

## Exit Criteria

- Required files exist and parse.
- 84 reclassified records reconcile to 24/36/12/12.
- No new `primaryArtifact=hybrid` or free-text category enum exists.
- All 10 DTO scenarios exist and expose all five projection decisions.
- SourceRow/Item/Step references pass.
- Access, rights, completeness, locale, safety, privacy and promotion remain independently recordable.
- Core axis agreement is at least 85% after 2–3 rounds.
- Legacy automatic/proposal/manual counts are numeric.
- Runtime, DB, LLM, crawler, commit/push/PR/merge/deploy remain untouched.
