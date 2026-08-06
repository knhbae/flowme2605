import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildArtifactPreflight,
  buildAuthoringArtifactProjection,
} from './artifact-projection';
import { serializeAuthoringIcs } from './file-export';
import {
  checkMarkdownRoundTrip,
  exportTextAuthoringMarkdown,
} from './markdown-roundtrip';
import { createTextAuthoringDocument } from './parser';
import { TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS } from './grammar-simulation-cases';
import { runGrammarSimulation } from './grammar-simulation';

const NOW = '2026-07-31T00:00:00.000Z';

function scenario(id: string) {
  const value = TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS.find(
    (candidate) => candidate.id === id,
  );
  assert.ok(value, `Missing grammar simulation scenario: ${id}`);
  return value;
}

test('TA-GRAMMAR-SIM-01 runs all existing-content and single-change scenarios without expectation drift', () => {
  const results = runGrammarSimulation(
    TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS,
  );
  const failures = results.flatMap((result) => result.checks
    .filter((check) => !check.passed)
    .map((check) => ({
      scenarioId: result.id,
      check: check.key,
      expected: check.expected,
      actual: check.actual,
    })));

  assert.equal(results.length, 27);
  assert.deepEqual(
    Object.fromEntries(
      ['existing_content', 'condition_change', 'compatibility', 'error_boundary']
        .map((group) => [
          group,
          results.filter((result) => result.group === group).length,
        ]),
    ),
    {
      existing_content: 8,
      condition_change: 8,
      compatibility: 6,
      error_boundary: 5,
    },
  );
  assert.deepEqual(failures, []);
});

test('changing only the source ISO anchor moves dates and ICS while preserving Item semantics', () => {
  const document = createTextAuthoringDocument(
    scenario('change-relative-no-anchor').rawText,
    {
      documentId: 'ta-grammar-anchor-identity',
      fixtureVersion: 'ta-grammar-anchor-identity-v2',
      now: NOW,
    },
  );
  const augustDocument = createTextAuthoringDocument(
    scenario('change-relative-anchor-aug').rawText,
    {
      documentId: 'ta-grammar-anchor-identity-august',
      fixtureVersion: 'ta-grammar-anchor-identity-v2',
      now: NOW,
    },
  );
  const septemberDocument = createTextAuthoringDocument(
    scenario('change-relative-anchor-sep').rawText,
    {
      documentId: 'ta-grammar-anchor-identity-september',
      fixtureVersion: 'ta-grammar-anchor-identity-v2',
      now: NOW,
    },
  );
  const canonicalBefore = structuredClone(document.parseResult.canonical);
  const withoutAnchor = buildAuthoringArtifactProjection(document);
  const august = buildAuthoringArtifactProjection(augustDocument);
  const september = buildAuthoringArtifactProjection(septemberDocument);

  const itemSemantics = (value: typeof document) => (
    value.parseResult.canonical.items.map((item) => ({
      title: item.title,
      dayOffset: item.schedule?.kind === 'relative'
        ? item.schedule.dayOffset
        : undefined,
    }))
  );

  assert.deepEqual(itemSemantics(augustDocument), itemSemantics(document));
  assert.deepEqual(itemSemantics(septemberDocument), itemSemantics(document));
  assert.equal(withoutAnchor.artifacts.calendar.count, 0);
  assert.equal(
    withoutAnchor.artifacts.calendar.losses.filter(
      (loss) => loss.reason === 'relative_anchor_required',
    ).length,
    2,
  );
  assert.deepEqual(
    august.artifacts.calendar.rows.map((row) => row.date),
    ['2026-08-07', '2026-08-10'],
  );
  assert.deepEqual(
    september.artifacts.calendar.rows.map((row) => row.date),
    ['2026-09-07', '2026-09-10'],
  );
  assert.deepEqual(document.parseResult.canonical, canonicalBefore);
  assert.match(
    serializeAuthoringIcs(
      august.title,
      august.artifacts.calendar.rows,
      NOW,
    ),
    /DTSTART;VALUE=DATE:20260807/u,
  );
  assert.match(
    serializeAuthoringIcs(
      september.title,
      september.artifacts.calendar.rows,
      NOW,
    ),
    /DTSTART;VALUE=DATE:20260907/u,
  );
});

test('calendar preflight requires an ISO anchor in the authored source', () => {
  const withoutAnchorDocument = createTextAuthoringDocument(
    scenario('change-relative-no-anchor').rawText,
    {
      documentId: 'ta-grammar-anchor-preflight-without',
      fixtureVersion: 'ta-grammar-anchor-preflight-v2',
      now: NOW,
    },
  );
  const withAnchorDocument = createTextAuthoringDocument(
    scenario('change-relative-anchor-aug').rawText,
    {
      documentId: 'ta-grammar-anchor-preflight-with',
      fixtureVersion: 'ta-grammar-anchor-preflight-v2',
      now: NOW,
    },
  );
  const withoutAnchor = buildArtifactPreflight(
    buildAuthoringArtifactProjection(withoutAnchorDocument),
    { artifact: 'calendar' },
  );
  const withAnchor = buildArtifactPreflight(
    buildAuthoringArtifactProjection(withAnchorDocument),
    { artifact: 'calendar' },
  );

  assert.equal(withoutAnchor.eligible, false);
  assert.equal(withoutAnchor.count, 0);
  assert.equal(withAnchor.eligible, true);
  assert.equal(withAnchor.count, 2);
  assert.deepEqual(withAnchor.dateRange, {
    start: '2026-08-07',
    end: '2026-08-10',
  });
});

/*
 * v1 compatibility fixtures below still opt into import-assist through their
 * fixture version. Canonical v2 examples above carry their anchor in source.
 */
test('repeat and condition survive the canonical Markdown round-trip but do not create RRULE or extra events', () => {
  for (const id of [
    'change-repeat-condition-weekly',
    'change-repeat-condition-monthly',
  ]) {
    const fixture = scenario(id);
    const document = createTextAuthoringDocument(fixture.rawText, {
      documentId: `ta-grammar-roundtrip-${id}`,
      fixtureVersion: 'ta-grammar-repeat-condition-v2',
      now: NOW,
    });
    const projection = buildAuthoringArtifactProjection(document);
    const markdown = exportTextAuthoringMarkdown(document);
    const receipt = checkMarkdownRoundTrip(document, {
      markdown,
      receiptId: `receipt-${id}`,
      checkedAt: NOW,
    });
    const ics = serializeAuthoringIcs(
      projection.title,
      projection.artifacts.calendar.rows,
      NOW,
    );

    assert.equal(receipt.unresolvedCount, 0, id);
    assert.equal(receipt.sourcePreserved, true, id);
    assert.match(markdown, /^  - 반복: /mu, id);
    assert.match(markdown, /^  - 조건: /mu, id);
    assert.equal(ics.match(/^BEGIN:VEVENT$/gmu)?.length ?? 0, 1, id);
    assert.doesNotMatch(ics, /^RRULE:/gmu, id);
    assert.match(ics, /반복:/u, id);
    assert.match(ics, /조건:/u, id);
  }
});

test('legacy aliases are read but the canonical writer emits only the official labels', () => {
  const fixture = scenario('compat-legacy-aliases');
  const document = createTextAuthoringDocument(fixture.rawText, {
    documentId: 'ta-grammar-legacy-writer',
    fixtureVersion: 'ta-grammar-legacy-writer-v1',
    now: NOW,
  });
  const markdown = exportTextAuthoringMarkdown(document);

  assert.match(markdown, /^  - 설명: 이전 설명입니다\.$/mu);
  assert.match(markdown, /^  - 소요 시간: 45분$/mu);
  assert.match(
    markdown,
    /^  - 자료: \[이전 자료\]\(https:\/\/example\.com\/legacy\)$/mu,
  );
  assert.doesNotMatch(markdown, /^(?:\s*)(?:자세히|예상 시간|link):/gmu);
});

test('invalid and unsupported input stays in source rows and never becomes invented canonical detail', () => {
  for (const id of [
    'error-unknown-property',
    'error-ambiguous-date',
    'error-invalid-relative-date',
    'error-url-only',
    'error-explanatory-prose',
  ]) {
    const fixture = scenario(id);
    const document = createTextAuthoringDocument(fixture.rawText, {
      documentId: `ta-grammar-error-${id}`,
      fixtureVersion: 'ta-grammar-error-boundary-v2',
      now: NOW,
    });
    const retainedSource = document.parseResult.canonical.sourceRows
      .map((row) => row.rawText)
      .join('\n');

    assert.ok(document.parseResult.issues.length > 0, id);
    document.parseResult.issues.forEach((issue) => {
      issue.sourceRowIds.forEach((sourceRowId) => {
        assert.ok(
          document.parseResult.canonical.sourceRows.some(
            (row) => row.sourceRowId === sourceRowId,
          ),
          `${id}: ${sourceRowId}`,
        );
      });
    });
    assert.ok(
      fixture.rawText
        .split(/\r?\n/u)
        .filter(Boolean)
        .some((line) => retainedSource.includes(line.trim())),
      id,
    );
    if (id === 'error-unknown-property') {
      assert.equal(
        document.parseResult.canonical.items[0]?.detail,
        undefined,
      );
    }
  }
});
