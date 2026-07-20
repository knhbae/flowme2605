import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCanonicalPostSaveReceipt,
  buildPostSaveHref,
  parsePostSaveHandoff,
} from './post-save-receipt';

test('post-save handoff uses one encoded route contract for flow and map saves', () => {
  assert.equal(buildPostSaveHref({ kind: 'flow', id: 'my draft/one' }), '/my?savedFlow=my%20draft%2Fone');
  assert.equal(buildPostSaveHref({ kind: 'map', id: 'moving-d30' }), '/my?savedMap=moving-d30');
  assert.equal(buildPostSaveHref({ kind: 'flow', id: ' ' }), '/my');
  assert.deepEqual(parsePostSaveHandoff('?savedFlow=my%20draft%2Fone'), { kind: 'flow', id: 'my draft/one' });
  assert.deepEqual(parsePostSaveHandoff('?savedMap=moving-d30&savedFlow=ignored'), { kind: 'map', id: 'moving-d30' });
  assert.equal(parsePostSaveHandoff('?view=today'), undefined);
});

test('canonical receipt counts the effective rows that the whole Flow renders', () => {
  assert.deepEqual(
    buildCanonicalPostSaveReceipt({
      title: ' 이사 준비 ',
      items: [
        { flowSlug: 'moving', itemId: 'one', date: '2026-07-20' },
        { flowSlug: 'moving', itemId: 'two' },
        { flowSlug: 'moving', itemId: 'three', date: '2026-07-22' },
      ],
    }),
    {
      title: '이사 준비',
      flowCount: 1,
      totalCount: 3,
      datedCount: 2,
      undatedCount: 1,
      invalidDateCount: 0,
      duplicateIdentityCount: 0,
      summary: '할 일 3개 · 날짜 있음 2개 · 날짜 없음 1개',
    },
  );
});

test('receipt reports duplicate identity and treats malformed dates as undated without dropping rows', () => {
  const receipt = buildCanonicalPostSaveReceipt({
    title: '',
    items: [
      { flowSlug: 'draft', itemId: 'one', date: '2026-02-30' },
      { flowSlug: 'draft', itemId: 'one', date: '2026-08-01' },
      { flowSlug: 'draft', itemId: 'two' },
    ],
  });

  assert.equal(receipt.title, '저장한 Flow');
  assert.equal(receipt.totalCount, 3);
  assert.equal(receipt.datedCount, 1);
  assert.equal(receipt.undatedCount, 2);
  assert.equal(receipt.invalidDateCount, 1);
  assert.equal(receipt.duplicateIdentityCount, 1);
});
