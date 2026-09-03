import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT,
  buildPersonalWorkspacePocOccurrenceSeriesId,
  expandPersonalWorkspacePocOccurrences,
  isPersonalWorkspacePocOccurrenceIdFor,
  parsePersonalWorkspacePocRecurrence,
  type ExpandPersonalWorkspacePocOccurrencesInput,
  type PersonalWorkspacePocOccurrenceManifest,
  type PersonalWorkspacePocRecurrenceRule,
} from './personal-workspace-poc-occurrence';

function parsedRule(
  recurrence: string,
  recurrenceEnd?: string,
): PersonalWorkspacePocRecurrenceRule {
  const parsed = parsePersonalWorkspacePocRecurrence({ recurrence, recurrenceEnd });
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.rule;
}

function expandedManifest(
  input: ExpandPersonalWorkspacePocOccurrencesInput,
): PersonalWorkspacePocOccurrenceManifest {
  const expanded = expandPersonalWorkspacePocOccurrences(input);
  if (!expanded.ok) throw new Error(expanded.reason);
  return expanded.manifest;
}

test('the exact D2 Korean grammar parses into deterministic versioned rules', () => {
  assert.deepEqual(parsedRule('매일'), {
    version: 1,
    raw: '매일',
    frequency: 'daily',
    interval: 1,
  });
  assert.deepEqual(parsedRule('2일마다', '12 회'), {
    version: 1,
    raw: '2일마다',
    frequency: 'daily',
    interval: 2,
    end: { mode: 'count', count: 12, raw: '12 회' },
  });
  assert.deepEqual(parsedRule('매주 일요일'), {
    version: 1,
    raw: '매주 일요일',
    frequency: 'weekly',
    interval: 1,
    weekdays: ['SU'],
  });
  assert.deepEqual(parsedRule('2주마다 목, 화, 목'), {
    version: 1,
    raw: '2주마다 목, 화, 목',
    frequency: 'weekly',
    interval: 2,
    weekdays: ['TU', 'TH'],
  });
  assert.deepEqual(parsedRule('매월 15일'), {
    version: 1,
    raw: '매월 15일',
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: 15,
  });
  assert.deepEqual(parsedRule('3개월마다 10일', '2027-12-31'), {
    version: 1,
    raw: '3개월마다 10일',
    frequency: 'monthly',
    interval: 3,
    dayOfMonth: 10,
    end: { mode: 'until', date: '2027-12-31', raw: '2027-12-31' },
  });
});

test('unsupported or malformed recurrence input fails explicitly instead of inventing a row', () => {
  assert.deepEqual(parsePersonalWorkspacePocRecurrence({ recurrence: '주 3회' }), {
    ok: false,
    reason: 'invalid-recurrence',
  });
  assert.deepEqual(parsePersonalWorkspacePocRecurrence({ recurrence: '0일마다' }), {
    ok: false,
    reason: 'invalid-recurrence',
  });
  assert.deepEqual(parsePersonalWorkspacePocRecurrence({ recurrence: '매월 32일' }), {
    ok: false,
    reason: 'invalid-recurrence',
  });
  assert.deepEqual(
    parsePersonalWorkspacePocRecurrence({ recurrence: '매일', recurrenceEnd: '언젠가' }),
    { ok: false, reason: 'invalid-recurrence-end' },
  );
  assert.deepEqual(
    expandPersonalWorkspacePocOccurrences({
      sourceItemRef: 'copy/flow/item',
      startDate: '2026-08-03',
      recurrence: '주 3회',
    }),
    { ok: false, reason: 'invalid-recurrence' },
  );
});

test('a count end includes the explicit start date as occurrence one', () => {
  const manifest = expandedManifest({
    sourceItemRef: 'saved-copy-a/flow-a/item-a',
    startDate: '2026-08-04',
    recurrence: '매주 월요일',
    recurrenceEnd: '3회',
  });

  assert.equal(manifest.mode, 'finite');
  assert.equal(manifest.totalCount, 3);
  assert.equal(manifest.hasMore, false);
  assert.deepEqual(manifest.rows.map((row) => row.originalDate), [
    '2026-08-04',
    '2026-08-10',
    '2026-08-17',
  ]);
  assert.deepEqual(manifest.rows.map((row) => row.occurrenceIndex), [1, 2, 3]);
});

test('finite series defaults to 30 rows and extension keeps every existing ID and order', () => {
  const base = {
    sourceItemRef: 'saved-copy-b/flow-b/item-b',
    startDate: '2026-08-01',
    recurrence: '매일',
    recurrenceEnd: '35회',
  } as const;
  const first = expandedManifest(base);
  const grown = expandedManifest({ ...base, finiteLimit: 35 });
  const tail = expandedManifest({ ...base, finiteOffset: 30 });

  assert.equal(PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.finitePageSize, 30);
  assert.equal(first.rows.length, 30);
  assert.equal(first.totalCount, 35);
  assert.equal(first.hasMore, true);
  assert.equal(grown.rows.length, 35);
  assert.equal(grown.hasMore, false);
  assert.deepEqual(
    grown.rows.slice(0, 30).map((row) => row.occurrenceId),
    first.rows.map((row) => row.occurrenceId),
  );
  assert.deepEqual(
    tail.rows.map((row) => row.occurrenceId),
    grown.rows.slice(30).map((row) => row.occurrenceId),
  );
  assert.deepEqual(tail.rows.map((row) => row.occurrenceIndex), [31, 32, 33, 34, 35]);
});

test('open-ended series defaults to four weeks and cumulative or offset windows remain stable', () => {
  const base = {
    sourceItemRef: 'saved-copy-c/flow-c/item-c',
    startDate: '2026-08-03',
    recurrence: '매일',
  } as const;
  const first = expandedManifest(base);
  const grown = expandedManifest({ ...base, windowWeeks: 8 });
  const next = expandedManifest({ ...base, windowWeeks: 4, windowOffsetWeeks: 4 });

  assert.equal(PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.openEndedWindowWeeks, 4);
  assert.deepEqual(first.window, {
    start: '2026-08-03',
    end: '2026-08-30',
    offsetWeeks: 0,
    weeks: 4,
  });
  assert.equal(first.rows.length, 28);
  assert.equal(grown.rows.length, 56);
  assert.deepEqual(
    grown.rows.slice(0, 28).map((row) => row.occurrenceId),
    first.rows.map((row) => row.occurrenceId),
  );
  assert.deepEqual(
    next.rows.map((row) => row.occurrenceId),
    grown.rows.slice(28).map((row) => row.occurrenceId),
  );
  assert.deepEqual(next.rows.map((row) => row.occurrenceIndex),
    Array.from({ length: 28 }, (_, index) => index + 29));
});

test('series and occurrence identity is stable, copy-safe, and independently checkable', () => {
  const compact = parsedRule('2주마다 화,목', '5회');
  const spaced = parsedRule('2 주마다 화 / 목', '5 회');
  const sourceItemRef = 'savedCopyId:copy-a|flowId:flow-a|itemId:item-a';
  const sameSeries = buildPersonalWorkspacePocOccurrenceSeriesId(sourceItemRef, compact);

  assert.equal(
    sameSeries,
    buildPersonalWorkspacePocOccurrenceSeriesId(sourceItemRef, spaced),
  );
  assert.notEqual(
    sameSeries,
    buildPersonalWorkspacePocOccurrenceSeriesId(
      'savedCopyId:copy-b|flowId:flow-a|itemId:item-a',
      compact,
    ),
  );
  assert.notEqual(
    sameSeries,
    buildPersonalWorkspacePocOccurrenceSeriesId(sourceItemRef, parsedRule('2주마다 화,목', '6회')),
  );

  const manifest = expandedManifest({
    sourceItemRef,
    startDate: '2026-08-04',
    recurrence: '2주마다 화,목',
    recurrenceEnd: '5회',
  });
  const row = manifest.rows[2];
  assert.ok(row);
  assert.equal(row.rowId, row.occurrenceId);
  assert.equal(row.sourceItemRef, sourceItemRef);
  assert.equal(isPersonalWorkspacePocOccurrenceIdFor({
    occurrenceId: row.occurrenceId,
    sourceItemRef,
    originalDate: row.originalDate,
    recurrence: '2 주마다 화 / 목',
    recurrenceEnd: '5 회',
  }), true);
  assert.equal(isPersonalWorkspacePocOccurrenceIdFor({
    occurrenceId: row.occurrenceId,
    sourceItemRef,
    originalDate: '2026-12-31',
    recurrence: '2주마다 화,목',
    recurrenceEnd: '5회',
  }), false);
});

test('ISO end is inclusive and monthly rules skip nonexistent month days', () => {
  const manifest = expandedManifest({
    sourceItemRef: 'saved-copy-d/flow-d/item-d',
    startDate: '2026-01-31',
    recurrence: '매월 31일',
    recurrenceEnd: '2026-05-31',
  });

  assert.deepEqual(manifest.rows.map((row) => row.originalDate), [
    '2026-01-31',
    '2026-03-31',
    '2026-05-31',
  ]);
  assert.equal(manifest.totalCount, 3);
  assert.equal(manifest.hasMore, false);
});

test('invalid identity, date, end range, and projection bounds return named failures', () => {
  assert.deepEqual(expandPersonalWorkspacePocOccurrences({
    sourceItemRef: ' ',
    startDate: '2026-08-03',
    recurrence: '매일',
  }), { ok: false, reason: 'invalid-source-item-ref' });
  assert.deepEqual(expandPersonalWorkspacePocOccurrences({
    sourceItemRef: 'copy/flow/item',
    startDate: '2026-02-30',
    recurrence: '매일',
  }), { ok: false, reason: 'invalid-start-date' });
  assert.deepEqual(expandPersonalWorkspacePocOccurrences({
    sourceItemRef: 'copy/flow/item',
    startDate: '2026-08-03',
    recurrence: '매일',
    recurrenceEnd: '2026-08-02',
  }), { ok: false, reason: 'recurrence-end-before-start' });
  assert.deepEqual(expandPersonalWorkspacePocOccurrences({
    sourceItemRef: 'copy/flow/item',
    startDate: '2026-08-03',
    recurrence: '매일',
    recurrenceEnd: '31회',
    finiteLimit: 0,
  }), { ok: false, reason: 'invalid-finite-window' });
  assert.deepEqual(expandPersonalWorkspacePocOccurrences({
    sourceItemRef: 'copy/flow/item',
    startDate: '2026-08-03',
    recurrence: '매일',
    windowWeeks: 0,
  }), { ok: false, reason: 'invalid-open-ended-window' });
});

test('projection is pure and does not mutate caller input', () => {
  const input: ExpandPersonalWorkspacePocOccurrencesInput = Object.freeze({
    sourceItemRef: 'saved-copy-e/flow-e/item-e',
    startDate: '2026-08-03',
    recurrence: '매주 월, 수, 금',
    recurrenceEnd: '6회',
  });
  const before = JSON.stringify(input);

  const manifest = expandedManifest(input);

  assert.equal(JSON.stringify(input), before);
  assert.equal(manifest.rows.length, 6);
  assert.equal(new Set(manifest.occurrenceIds).size, 6);
  assert.deepEqual(manifest.occurrenceIds, manifest.rows.map((row) => row.occurrenceId));
  assert.deepEqual(manifest.rowIds, manifest.rows.map((row) => row.rowId));
  assert.deepEqual(manifest.originalDates, manifest.rows.map((row) => row.originalDate));
});
