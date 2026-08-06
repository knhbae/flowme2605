import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCanonicalFlowValueKey } from './projection-identity';
import { normalizeMyFlowMutationProjectionValues } from './my-flow-mutation-projection';

test('mutation projection normalizes a current Flow legacy alias identically on rendered and fresh paths', () => {
  const flowSlug = 'draft-flow';
  const itemId = 'source-a';
  const legacyKey = `${flowSlug}::${itemId}::none`;
  const canonicalKey = buildCanonicalFlowValueKey(flowSlug, itemId);
  const legacyDraft = { title: 'legacy title', memo: 'keep me' };

  const fresh = normalizeMyFlowMutationProjectionValues({
    flowSlug,
    itemIds: [itemId],
    itemDrafts: { [legacyKey]: legacyDraft },
    dateOverrides: { [legacyKey]: '2026-08-06' },
  });
  const rendered = normalizeMyFlowMutationProjectionValues({
    flowSlug,
    itemIds: [itemId],
    itemDrafts: { [legacyKey]: legacyDraft, [canonicalKey]: legacyDraft },
    dateOverrides: { [legacyKey]: '2026-08-06', [canonicalKey]: '2026-08-06' },
  });

  assert.deepEqual(fresh, rendered);
  assert.deepEqual(fresh.itemDrafts[canonicalKey], legacyDraft);
  assert.equal(fresh.dateOverrides[canonicalKey], '2026-08-06');
});

test('mutation projection excludes unrelated Flow values and sorts current Flow keys', () => {
  const normalized = normalizeMyFlowMutationProjectionValues({
    flowSlug: 'flow-a',
    itemIds: ['item-b', 'item-a'],
    itemDrafts: {
      'flow-b::item-a::draft-overlay': { title: 'unrelated' },
      'flow-a::item-b::draft-overlay': { title: 'second' },
      'flow-a::item-a::draft-overlay': { title: 'first' },
    },
    dateOverrides: {
      'flow-b::item-a::draft-overlay': '2026-09-01',
      'flow-a::item-b::draft-overlay': '2026-08-02',
      'flow-a::item-a::draft-overlay': '2026-08-01',
    },
  });

  assert.deepEqual(Object.keys(normalized.itemDrafts), [
    'flow-a::item-a::draft-overlay',
    'flow-a::item-b::draft-overlay',
  ]);
  assert.deepEqual(Object.keys(normalized.dateOverrides), [
    'flow-a::item-a::draft-overlay',
    'flow-a::item-b::draft-overlay',
  ]);
});
