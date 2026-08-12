import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyPersonalDraftSourceDatePersonalizations,
  applySavedPlanEditorSourceDatePersonalizations,
  buildLegacySavedPlanEditorRecord,
  getSavedPlanEditorTitlePatch,
  patchSavedPlanEditorBundleFlowRaw,
  patchSavedPlanEditorBundleTitleRaw,
  patchSavedPlanEditorSavedRecordRaw,
  mergeSavedPlanEditorMapPersistenceRaw,
  mergeSavedPlanEditorMapSnapshotRaw,
  mergeSavedPlanEditorPersonalStructuralOverlayRaw,
  parseSavedPlanEditorMapPersistence,
  parseSavedPlanEditorMapSnapshot,
} from './saved-plan-editor-persistence';
import { MY_FLOW_DATE_REMOVED_OVERRIDE } from './my-flow-personal-state';
import type { PersonalStructuralOverlay } from './personal-structural-overlay';
import {
  getSourceBackedFlowMapSnapshotStorageKey,
  type SourceBackedFlowMapChildBinding,
  type SourceBackedFlowMapPersistenceRecord,
  type SourceBackedFlowMapSavedSnapshot,
  type SourceBackedFlowMapStepBinding,
} from './source-backed-my-flow';

test('display-only Map title normalization never becomes a persistence patch', () => {
  assert.equal(getSavedPlanEditorTitlePatch('이사 준비', '이사 준비'), undefined);
  assert.equal(getSavedPlanEditorTitlePatch('이사 준비', ' 새 이사 준비 '), '새 이사 준비');
});

test('legacy save preserves unknown fields and never synthesizes schema-v2 identity', () => {
  const raw = {
    slug: 'legacy-plan',
    savedAt: '2026-08-01T00:00:00.000Z',
    selectedArtifactMode: 'checklist',
    dateIntent: 'custom',
    anchor: '2026-09-01',
    executionSentinel: { keep: true },
  };
  const unchangedTitle = buildLegacySavedPlanEditorRecord({
    rawRecord: raw,
    flowSlug: 'legacy-plan',
    openedTitle: '원본 제목',
    nextTitle: '원본 제목',
    savedAt: '2026-08-12T00:00:00.000Z',
  });
  assert.deepEqual(unchangedTitle.executionSentinel, { keep: true });
  assert.equal(unchangedTitle.personalTitle, undefined);
  assert.equal(unchangedTitle.schemaVersion, undefined);
  assert.equal(unchangedTitle.lastSaveRequestId, undefined);
  assert.equal(unchangedTitle.savedItemCount, undefined);

  const renamed = buildLegacySavedPlanEditorRecord({
    rawRecord: raw,
    flowSlug: 'legacy-plan',
    openedTitle: '원본 제목',
    nextTitle: '내 제목',
    savedAt: '2026-08-12T00:00:00.000Z',
  });
  assert.equal(renamed.personalTitle, '내 제목');
  assert.equal(Object.prototype.hasOwnProperty.call(renamed, 'schemaVersion'), false);
});

test('bundle Flow patch changes only the matching title and anchor metadata', () => {
  const raw = [
    {
      flow: {
        id: 'sibling-id',
        slug: 'sibling',
        title: 'Sibling',
        anchor_type: 'none',
        updated_at: '2026-08-01T00:00:00.000Z',
      },
      items: [],
      futureSibling: { keep: true },
    },
    {
      flow: {
        id: 'personal-id',
        slug: 'url-draft-memo-1',
        title: 'Original title',
        anchor_type: 'none',
        source_url: 'https://example.com/source',
        source_fragment: { line: 17, quote: 'keep source bytes' },
        updated_at: '2026-08-01T00:00:00.000Z',
        futureFlow: { keep: true },
      },
      sections: [{ id: 'section-a', futureSection: { keep: true } }],
      items: [{ id: 'item-a', title: 'Source Item', futureItem: { keep: true } }],
      sourceFragments: [{ id: 'fragment-a', futureFragment: { keep: true } }],
      futureBundle: { keep: true },
    },
  ];
  const patched = patchSavedPlanEditorBundleFlowRaw({
    raw: JSON.stringify(raw),
    flowId: 'personal-id',
    flowSlug: 'url-draft-memo-1',
    title: 'Edited title',
    anchor: '2026-08-24',
    updatedAt: '2026-08-12T00:00:00.000Z',
  });
  assert.ok(patched);
  assert.deepEqual(patched[0], raw[0]);
  const target = asRecord(patched[1]);
  const flow = asRecord(target.flow);
  assert.equal(flow.title, 'Edited title');
  assert.equal(flow.anchor_type, 'start_date');
  assert.equal(flow.updated_at, '2026-08-12T00:00:00.000Z');
  assert.equal(flow.source_url, 'https://example.com/source');
  assert.deepEqual(flow.source_fragment, { line: 17, quote: 'keep source bytes' });
  assert.deepEqual(flow.futureFlow, { keep: true });
  assert.deepEqual(target.sections, raw[1]!.sections);
  assert.deepEqual(target.items, raw[1]!.items);
  assert.deepEqual(target.sourceFragments, raw[1]!.sourceFragments);
  assert.deepEqual(target.futureBundle, { keep: true });
});

test('bundle Flow patch is a no-op without a real metadata change', () => {
  const raw = JSON.stringify([{
    flow: {
      id: 'personal-id',
      slug: 'url-draft-memo-1',
      title: 'Same title',
      anchor_type: 'start_date',
      updated_at: '2026-08-01T00:00:00.000Z',
    },
    items: [{ id: 'item-a' }],
  }]);
  assert.equal(patchSavedPlanEditorBundleFlowRaw({
    raw,
    flowId: 'personal-id',
    flowSlug: 'url-draft-memo-1',
    title: 'Same title',
    anchor: '2026-08-24',
    updatedAt: '2026-08-12T00:00:00.000Z',
  }), undefined);
  assert.equal(patchSavedPlanEditorBundleTitleRaw({
    raw,
    flowId: 'personal-id',
    flowSlug: 'url-draft-memo-1',
    title: 'Same title',
    updatedAt: '2026-08-12T00:00:00.000Z',
  }), undefined);
  assert.throws(() => patchSavedPlanEditorBundleFlowRaw({
    raw,
    flowId: 'different-id',
    flowSlug: 'url-draft-memo-1',
    anchor: '2026-08-24',
    updatedAt: '2026-08-12T00:00:00.000Z',
  }), /identity changed/u);
});

test('bundle Flow patch returns a personal draft to undated metadata when its anchor is cleared', () => {
  const raw = JSON.stringify([{
    flow: {
      id: 'personal-id',
      slug: 'url-draft-memo-1',
      title: 'Same title',
      anchor_type: 'start_date',
      updated_at: '2026-08-01T00:00:00.000Z',
      futureFlow: { keep: true },
    },
    items: [{ id: 'item-a', futureItem: { keep: true } }],
  }]);
  const patched = patchSavedPlanEditorBundleFlowRaw({
    raw,
    flowId: 'personal-id',
    flowSlug: 'url-draft-memo-1',
    anchor: '',
    updatedAt: '2026-08-12T00:00:00.000Z',
  });
  assert.ok(patched);
  const target = asRecord(patched[0]);
  const flow = asRecord(target.flow);
  assert.equal(flow.anchor_type, 'none');
  assert.equal(flow.updated_at, '2026-08-12T00:00:00.000Z');
  assert.deepEqual(flow.futureFlow, { keep: true });
  assert.deepEqual(target.items, [{ id: 'item-a', futureItem: { keep: true } }]);
});

test('unversioned saved-record anchor patch preserves unknown fields without migration', () => {
  const raw = {
    slug: 'url-draft-memo-1',
    savedAt: '2026-08-01T00:00:00.000Z',
    selectedArtifactMode: 'memo',
    dateIntent: 'undated',
    futureRecord: { nested: { keep: true } },
  };
  const patched = patchSavedPlanEditorSavedRecordRaw({
    rawRecord: raw,
    flowSlug: 'url-draft-memo-1',
    title: 'Edited draft',
    anchor: '2026-08-24',
    savedAt: '2026-08-12T00:00:00.000Z',
  });
  assert.ok(patched);
  assert.equal(patched.personalTitle, 'Edited draft');
  assert.equal(patched.anchor, '2026-08-24');
  assert.equal(patched.dateIntent, 'custom');
  assert.equal(patched.savedAt, '2026-08-12T00:00:00.000Z');
  assert.deepEqual(patched.futureRecord, { nested: { keep: true } });
  assert.equal(Object.prototype.hasOwnProperty.call(patched, 'schemaVersion'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(patched, 'personalCopyKey'), false);

  const cleared = patchSavedPlanEditorSavedRecordRaw({
    rawRecord: patched,
    flowSlug: 'url-draft-memo-1',
    anchor: null,
    savedAt: '2026-08-12T01:00:00.000Z',
  });
  assert.ok(cleared);
  assert.equal(Object.prototype.hasOwnProperty.call(cleared, 'anchor'), false);
  assert.equal(cleared.dateIntent, 'undated');
  assert.equal(cleared.personalTitle, 'Edited draft');
  assert.deepEqual(cleared.futureRecord, { nested: { keep: true } });
});

test('schema-v2 saved-record patch retains identity and unknown nested bytes', () => {
  const raw = {
    schemaVersion: 2,
    slug: 'moving-copy-1',
    personalCopyKey: 'moving-copy-1',
    sourceFlowKey: 'moving-home@v4',
    sourceFlowSlug: 'moving-home',
    sourceVersion: 'v4',
    lastSaveRequestId: 'request-1',
    savedItemCount: 7,
    savedAt: '2026-08-01T00:00:00.000Z',
    selectedArtifactMode: 'calendar',
    dateIntent: 'custom',
    anchor: '2026-08-20',
    personalTitle: 'Original copy',
    identitySentinel: { nested: { keep: true } },
  };
  const patched = patchSavedPlanEditorSavedRecordRaw({
    rawRecord: raw,
    flowSlug: 'moving-copy-1',
    title: 'Edited copy',
    anchor: null,
    allowAnchorClear: true,
    savedAt: '2026-08-12T00:00:00.000Z',
  });
  assert.ok(patched);
  assert.equal(patched.schemaVersion, 2);
  assert.equal(patched.personalCopyKey, 'moving-copy-1');
  assert.equal(patched.sourceFlowKey, 'moving-home@v4');
  assert.equal(patched.sourceFlowSlug, 'moving-home');
  assert.equal(patched.sourceVersion, 'v4');
  assert.equal(patched.lastSaveRequestId, 'request-1');
  assert.equal(patched.savedItemCount, 7);
  assert.equal(patched.personalTitle, 'Edited copy');
  assert.equal(Object.prototype.hasOwnProperty.call(patched, 'anchor'), false);
  assert.equal(patched.dateIntent, 'undated');
  assert.deepEqual(patched.identitySentinel, { nested: { keep: true } });

  assert.equal(patchSavedPlanEditorSavedRecordRaw({
    rawRecord: patched,
    flowSlug: 'moving-copy-1',
    title: 'Edited copy',
    anchor: null,
    savedAt: '2026-08-12T01:00:00.000Z',
  }), undefined);
  assert.throws(() => patchSavedPlanEditorSavedRecordRaw({
    rawRecord: raw,
    flowSlug: 'different-copy',
    anchor: '2026-08-24',
    savedAt: '2026-08-12T00:00:00.000Z',
  }), /identity changed/u);
  assert.throws(() => patchSavedPlanEditorSavedRecordRaw({
    rawRecord: raw,
    flowSlug: 'moving-copy-1',
    anchor: null,
    allowAnchorClear: false,
    savedAt: '2026-08-12T00:00:00.000Z',
  }), /clearing is not allowed/u);
});

test('personal-draft source dates use the canonical value key while user-created dates stay structural', () => {
  const result = applyPersonalDraftSourceDatePersonalizations({
    flowSlug: 'url-draft-memo-1',
    sources: [
      {
        itemId: 'source-a',
        date: '2026-08-20',
        originalDate: '2026-08-20',
        dateOwnerKey: 'url-draft-memo-1::source-a::draft-overlay',
        ownership: 'source',
      },
      { itemId: 'personal-b', date: '2026-08-21', ownership: 'user_created' },
    ],
    personalizations: {
      'source-a': { date: null },
      'personal-b': { date: '2026-08-22' },
    },
    itemDrafts: {
      'url-draft-memo-1::source-a::draft-overlay': { memo: 'keep', repeatPreset: 'weekly' },
      unrelated: { title: 'keep' },
    },
    dateOverrides: {
      'url-draft-memo-1::source-a::draft-overlay': '2026-08-20',
      unrelated: '2026-09-01',
    },
  });

  assert.deepEqual(result.itemDrafts['url-draft-memo-1::source-a::draft-overlay'], {
    memo: 'keep',
    repeatPreset: 'weekly',
    date: '',
  });
  assert.equal(result.dateOverrides['url-draft-memo-1::source-a::draft-overlay'], undefined);
  assert.equal(result.itemDrafts['url-draft-memo-1::personal-b::draft-overlay'], undefined);
  assert.deepEqual(result.itemDrafts.unrelated, { title: 'keep' });
  assert.equal(result.dateOverrides.unrelated, '2026-09-01');
});

test('source date A -> B -> none -> A stays bound to the immutable original owner', () => {
  const flowSlug = 'legacy-plan';
  const valueOwnerKey = 'legacy-plan::source-a::draft-overlay';
  const dateOwnerKey = 'legacy-plan::source-a::2026-08-20';
  const source = {
    itemId: 'source-a',
    date: '2026-08-20',
    originalDate: '2026-08-20',
    valueOwnerKey,
    dateOwnerKey,
    ownership: 'source' as const,
  };

  const moved = applySavedPlanEditorSourceDatePersonalizations({
    flowSlug,
    sources: [source],
    personalizations: { 'source-a': { date: '2026-08-24' } },
    itemDrafts: {
      [valueOwnerKey]: { memo: 'keep' },
      [dateOwnerKey]: { date: '2026-08-20', why: 'keep date-owner note' },
      unrelated: { title: 'keep' },
    },
    dateOverrides: {
      [dateOwnerKey]: MY_FLOW_DATE_REMOVED_OVERRIDE,
      unrelated: '2026-09-01',
    },
  });
  assert.deepEqual(moved.itemDrafts[valueOwnerKey], {
    memo: 'keep',
    date: '2026-08-24',
  });
  assert.deepEqual(moved.itemDrafts[dateOwnerKey], { why: 'keep date-owner note' });
  assert.equal(moved.dateOverrides[dateOwnerKey], undefined);

  const removed = applySavedPlanEditorSourceDatePersonalizations({
    flowSlug,
    sources: [{ ...source, date: '2026-08-24' }],
    personalizations: { 'source-a': { date: null } },
    itemDrafts: moved.itemDrafts,
    dateOverrides: moved.dateOverrides,
  });
  assert.deepEqual(removed.itemDrafts[valueOwnerKey], { memo: 'keep' });
  assert.equal(removed.dateOverrides[dateOwnerKey], MY_FLOW_DATE_REMOVED_OVERRIDE);
  assert.equal(
    removed.dateOverrides['legacy-plan::source-a::2026-08-24'],
    undefined,
  );

  const reset = applySavedPlanEditorSourceDatePersonalizations({
    flowSlug,
    sources: [{ ...source, date: undefined }],
    personalizations: { 'source-a': { date: '2026-08-20' } },
    itemDrafts: removed.itemDrafts,
    dateOverrides: removed.dateOverrides,
  });
  assert.deepEqual(reset.itemDrafts[valueOwnerKey], { memo: 'keep' });
  assert.equal(reset.dateOverrides[dateOwnerKey], undefined);
  assert.deepEqual(reset.itemDrafts.unrelated, { title: 'keep' });
  assert.equal(reset.dateOverrides.unrelated, '2026-09-01');
});

test('external date owners keep only the original-owner unscheduled tombstone', () => {
  const valueOwnerKey = 'map-flow::step-a::draft-overlay';
  const dateOwnerKey = 'map-flow::step-a::2026-08-20';
  const base = {
    flowSlug: 'map-flow',
    sources: [{
      itemId: 'step-a',
      date: '2026-08-24',
      originalDate: '2026-08-20',
      valueOwnerKey,
      dateOwnerKey,
      ownership: 'source' as const,
    }],
    itemDrafts: {
      [valueOwnerKey]: { memo: 'keep', date: '2026-08-23' },
      [dateOwnerKey]: { date: '2026-08-23', caution: 'keep' },
      'map-flow::step-a::2026-08-24': { date: '2026-08-24', location: 'keep' },
      unrelated: { why: 'keep' },
    },
    dateOverrides: {
      [dateOwnerKey]: '2026-08-23',
      unrelated: '2026-09-01',
    },
    valueOwner: 'external' as const,
  };

  const moved = applySavedPlanEditorSourceDatePersonalizations({
    ...base,
    personalizations: { 'step-a': { date: '2026-08-25' } },
  });
  assert.deepEqual(moved.itemDrafts[valueOwnerKey], { memo: 'keep' });
  assert.deepEqual(moved.itemDrafts[dateOwnerKey], { caution: 'keep' });
  assert.deepEqual(moved.itemDrafts['map-flow::step-a::2026-08-24'], { location: 'keep' });
  assert.equal(moved.dateOverrides[dateOwnerKey], undefined);

  const removed = applySavedPlanEditorSourceDatePersonalizations({
    ...base,
    itemDrafts: moved.itemDrafts,
    dateOverrides: moved.dateOverrides,
    personalizations: { 'step-a': { date: null } },
  });
  assert.deepEqual(removed.itemDrafts[valueOwnerKey], { memo: 'keep' });
  assert.equal(removed.dateOverrides[dateOwnerKey], MY_FLOW_DATE_REMOVED_OVERRIDE);
  assert.deepEqual(removed.itemDrafts.unrelated, { why: 'keep' });
  assert.equal(removed.dateOverrides.unrelated, '2026-09-01');
});

test('literal-none source supports undated -> date -> none without a tombstone', () => {
  const moved = applySavedPlanEditorSourceDatePersonalizations({
    flowSlug: 'legacy-plan',
    sources: [{
      itemId: 'source-a',
      originalDate: 'none',
      valueOwnerKey: 'value-owner',
      dateOwnerKey: 'date-owner-none',
      ownership: 'source',
    }],
    personalizations: { 'source-a': { date: '2026-08-24' } },
    itemDrafts: { 'value-owner': { memo: 'keep' } },
    dateOverrides: {},
  });
  assert.deepEqual(moved.itemDrafts['value-owner'], {
    memo: 'keep',
    date: '2026-08-24',
  });
  assert.equal(moved.dateOverrides['date-owner-none'], undefined);

  const removed = applySavedPlanEditorSourceDatePersonalizations({
    flowSlug: 'legacy-plan',
    sources: [{
      itemId: 'source-a',
      date: '2026-08-24',
      originalDate: 'none',
      valueOwnerKey: 'value-owner',
      dateOwnerKey: 'date-owner-none',
      ownership: 'source',
    }],
    personalizations: { 'source-a': { date: null } },
    itemDrafts: {
      ...moved.itemDrafts,
      'legacy-plan::source-a::2026-08-24': { date: '2026-08-24', memo: 'keep alias' },
    },
    dateOverrides: {
      ...moved.dateOverrides,
      'legacy-plan::source-a::2026-08-24': '2026-08-24',
    },
  });
  assert.deepEqual(removed.itemDrafts['value-owner'], { memo: 'keep' });
  assert.equal(removed.dateOverrides['date-owner-none'], undefined);
  assert.deepEqual(
    removed.itemDrafts['legacy-plan::source-a::2026-08-24'],
    { memo: 'keep alias' },
  );
  assert.equal(removed.dateOverrides['legacy-plan::source-a::2026-08-24'], undefined);
});

function buildStructuralOverlay(): PersonalStructuralOverlay {
  return {
    schemaVersion: 1,
    savedCopyId: 'url-draft-memo-1',
    flowId: 'flow-id-1',
    userItems: [
      {
        itemId: 'user-a',
        provenance: 'user_created',
        title: 'Edited user item',
        personalMemo: 'Edited memo',
        schedule: { mode: 'fixed_date', date: '2026-08-24' },
        createdAt: '2026-08-10T00:00:00.000Z',
        orderKey: 2,
      },
      {
        itemId: 'user-c',
        provenance: 'user_created',
        title: 'New user item',
        createdAt: '2026-08-12T00:00:00.000Z',
        orderKey: 3,
      },
    ],
    itemTombstones: [{
      itemId: 'source-z',
      ownership: 'source',
      deletedAt: '2026-08-12T00:00:00.000Z',
    }],
    orderOverride: ['source-z', 'user-a', 'user-c'],
    selection: {
      mode: 'all_except_excluded',
      includedItemIds: [],
      excludedItemIds: ['source-z'],
    },
    updatedAt: '2026-08-12T00:00:00.000Z',
    migration: {
      source: 'legacy_item_selection',
      migratedAt: '2026-08-10T00:00:00.000Z',
      sourceSchemaVersion: 0,
    },
  };
}

test('structural overlay raw merge preserves future fields by owner identity', () => {
  const raw = {
    schemaVersion: 1,
    savedCopyId: 'url-draft-memo-1',
    flowId: 'flow-id-1',
    userItems: [
      {
        itemId: 'user-a',
        provenance: 'user_created',
        title: 'Original user item',
        personalMemo: 'Original memo',
        schedule: {
          mode: 'fixed_date',
          date: '2026-08-20',
          futureSchedule: { keep: true },
        },
        createdAt: '2026-08-10T00:00:00.000Z',
        orderKey: 1,
        futureUserItem: { keep: true },
      },
      {
        itemId: 'user-b',
        provenance: 'user_created',
        title: 'Removed user item',
        createdAt: '2026-08-10T00:00:00.000Z',
        orderKey: 2,
        futureRemoved: { should: 'leave with removed owner' },
      },
    ],
    itemTombstones: [{
      itemId: 'source-z',
      ownership: 'source',
      deletedAt: '2026-08-11T00:00:00.000Z',
      futureTombstone: { keep: true },
    }],
    orderOverride: ['user-a', 'user-b'],
    selection: {
      mode: 'all_except_excluded',
      includedItemIds: [],
      excludedItemIds: [],
      futureSelection: { keep: true },
    },
    updatedAt: '2026-08-11T00:00:00.000Z',
    migration: {
      source: 'legacy_item_selection',
      migratedAt: '2026-08-10T00:00:00.000Z',
      sourceSchemaVersion: 0,
      futureMigration: { keep: true },
    },
    futureOverlay: { keep: true },
  };
  const merged = mergeSavedPlanEditorPersonalStructuralOverlayRaw(
    raw,
    buildStructuralOverlay(),
  );

  assert.deepEqual(merged.futureOverlay, { keep: true });
  assert.deepEqual(asRecord(merged.selection).futureSelection, { keep: true });
  assert.equal(asRecordArray(merged.userItems).length, 2);
  const mergedUserA = asRecordArray(merged.userItems).find((item) => item.itemId === 'user-a');
  assert.ok(mergedUserA);
  assert.equal(mergedUserA.title, 'Edited user item');
  assert.deepEqual(mergedUserA.futureUserItem, { keep: true });
  assert.deepEqual(asRecord(mergedUserA.schedule).futureSchedule, { keep: true });
  assert.equal(
    asRecordArray(merged.userItems).some((item) => item.itemId === 'user-b'),
    false,
  );
  const mergedUserC = asRecordArray(merged.userItems).find((item) => item.itemId === 'user-c');
  assert.ok(mergedUserC);
  assert.equal(Object.prototype.hasOwnProperty.call(mergedUserC, 'futureUserItem'), false);
  assert.deepEqual(
    asRecord(asRecordArray(merged.itemTombstones)[0]).futureTombstone,
    { keep: true },
  );
  assert.deepEqual(asRecord(merged.migration).futureMigration, { keep: true });
});

test('structural overlay raw merge removes an optional known owner without retaining stale bytes', () => {
  const next = buildStructuralOverlay();
  next.userItems[0] = {
    ...next.userItems[0]!,
    personalMemo: undefined,
    schedule: undefined,
  };
  delete next.migration;
  const raw = structuredClone(buildStructuralOverlay()) as unknown as Record<string, unknown>;
  (raw.userItems as unknown as Record<string, unknown>[])[0]!.futureUserItem = { keep: true };
  asRecord((raw.userItems as unknown as Record<string, unknown>[])[0]!.schedule).futureSchedule = { keep: true };
  raw.futureOverlay = { keep: true };

  const merged = mergeSavedPlanEditorPersonalStructuralOverlayRaw(raw, next);
  const userA = asRecordArray(merged.userItems)[0]!;
  assert.equal(Object.prototype.hasOwnProperty.call(userA, 'personalMemo'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(userA, 'schedule'), false);
  assert.deepEqual(userA.futureUserItem, { keep: true });
  assert.equal(Object.prototype.hasOwnProperty.call(merged, 'migration'), false);
  assert.deepEqual(merged.futureOverlay, { keep: true });
});

test('structural overlay raw merge fails closed for normalized data loss', () => {
  const duplicate = structuredClone(buildStructuralOverlay()) as unknown as Record<string, unknown>;
  (duplicate.userItems as unknown[]).push(structuredClone((duplicate.userItems as unknown[])[0]));
  assert.throws(
    () => mergeSavedPlanEditorPersonalStructuralOverlayRaw(duplicate, buildStructuralOverlay()),
    /malformed user Item/u,
  );

  const malformedSelection = structuredClone(buildStructuralOverlay()) as unknown as Record<string, unknown>;
  asRecord(malformedSelection.selection).includedItemIds = 'not-an-array';
  assert.throws(
    () => mergeSavedPlanEditorPersonalStructuralOverlayRaw(
      malformedSelection,
      buildStructuralOverlay(),
    ),
    /malformed or changed identity/u,
  );
});

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Expected a record fixture.');
  }
  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new TypeError('Expected a record-array fixture.');
  }
  return value as Record<string, unknown>[];
}

function buildMapStep(stepId = 'step-a'): SourceBackedFlowMapStepBinding {
  return {
    stepId,
    title: `Step ${stepId}`,
    destination: 'calendar',
    calendar: {
      mode: 'anchor_offset',
      anchorType: 'start_date',
      dayOffset: 2,
      allDay: true,
      window: {
        label: 'Week one',
        startDayOffset: 1,
        endDayOffset: 7,
      },
    },
    textFallback: {
      title: `Fallback ${stepId}`,
      description: 'Fallback description',
      items: ['One detail'],
      memoHint: 'Keep a note',
    },
    sourceUrl: 'https://example.com/source',
    sourceType: 'official',
    riskLevel: 'low',
  };
}

function buildMapChild(
  slug = 'flow-a',
  flowId = 'flow-a-id',
  stepId = 'step-a',
): SourceBackedFlowMapChildBinding {
  return {
    slug,
    flowId,
    title: `Flow ${slug}`,
    category: 'planning',
    structureType: 'timeline',
    anchorType: 'start_date',
    primaryDestination: 'calendar',
    riskLevel: 'low',
    sourceTitle: 'Example source',
    sourceUrl: 'https://example.com/source',
    sourceCheckedAt: '2026-08-10T00:00:00.000Z',
    stepCount: 1,
    itemFallbackCount: 1,
    stepIds: [stepId],
    steps: [buildMapStep(stepId)],
  };
}

function buildPersonalCopy(): NonNullable<SourceBackedFlowMapSavedSnapshot['personalCopy']> {
  return {
    source: 'personal_edit',
    originalTitle: 'Original map',
    includedStepIdsByFlow: {
      'flow-a': ['step-a', 'retained-step'],
    },
    excludedStepIdsByFlow: {
      'flow-a': [],
    },
    stepOverridesByFlow: {
      'flow-a': {
        'step-a': {
          title: 'Personal step',
          schedule: { mode: 'fixed_date', date: '2026-08-20' },
          userMemo: 'Personal memo',
        },
      },
    },
    retainedStepsByFlow: {
      'flow-a': {
        'retained-step': buildMapStep('retained-step'),
      },
    },
  };
}

function buildMapSnapshot(): SourceBackedFlowMapSavedSnapshot {
  return {
    mapId: 'map-a',
    title: 'Map A',
    version: 'v1',
    savedAt: '2026-08-12T00:00:00.000Z',
    anchor: '2026-08-15',
    flowSlugs: ['flow-a'],
    stepCountsByFlow: { 'flow-a': 1 },
    riskLevelsByFlow: { 'flow-a': 'low' },
    sourceCheckedAtByFlow: { 'flow-a': '2026-08-10T00:00:00.000Z' },
    personalCopy: buildPersonalCopy(),
  };
}

function buildMapPersistence(): SourceBackedFlowMapPersistenceRecord {
  return {
    schemaVersion: 1,
    recordType: 'saved_source_backed_flow_map',
    bridgeStorageKey: getSourceBackedFlowMapSnapshotStorageKey('map-a'),
    map: {
      id: 'map-a',
      title: 'Map A',
      userLabel: 'My map',
      version: 'v1',
      updatedAt: '2026-08-10T00:00:00.000Z',
      updatePolicy: 'review_before_apply',
      sourceTitle: 'Example source',
      sourceUrl: 'https://example.com/source',
    },
    saved: {
      savedAt: '2026-08-12T00:00:00.000Z',
      sourceSurface: 'public_save',
      anchor: '2026-08-15',
    },
    readiness: {
      content: 'ready_for_my_flow',
      update: 'up_to_date',
      reasons: [],
    },
    childFlows: [buildMapChild()],
    updateAssessment: {
      status: 'up_to_date',
      userAction: 'none',
      canApplyAutomatically: true,
      savedVersion: 'v1',
      currentVersion: 'v1',
      reasons: [],
      affectedFlows: [],
    },
    personalCopy: buildPersonalCopy(),
  };
}

type RawCorruption = Readonly<{
  name: string;
  mutate: (raw: Record<string, unknown>) => void;
}>;

const snapshotCorruptions: readonly RawCorruption[] = [
  {
    name: 'duplicate flow slug',
    mutate: (raw) => { raw.flowSlugs = ['flow-a', 'flow-a']; },
  },
  {
    name: 'non-string flow ID',
    mutate: (raw) => { raw.flowSlugs = ['flow-a', 7]; },
  },
  {
    name: 'malformed personal-copy sibling',
    mutate: (raw) => {
      const personalCopy = asRecord(raw.personalCopy);
      asRecord(personalCopy.includedStepIdsByFlow).sibling = 'not-an-array';
    },
  },
  {
    name: 'overlapping included and excluded step ID',
    mutate: (raw) => {
      const personalCopy = asRecord(raw.personalCopy);
      asRecord(personalCopy.excludedStepIdsByFlow)['flow-a'] = ['step-a'];
    },
  },
  {
    name: 'invalid nested fixed date',
    mutate: (raw) => {
      const personalCopy = asRecord(raw.personalCopy);
      const flowOverrides = asRecord(asRecord(personalCopy.stepOverridesByFlow)['flow-a']);
      asRecord(asRecord(flowOverrides['step-a']).schedule).date = '2026-02-31';
    },
  },
  {
    name: 'retained-step key and ID mismatch',
    mutate: (raw) => {
      const personalCopy = asRecord(raw.personalCopy);
      const flowSteps = asRecord(asRecord(personalCopy.retainedStepsByFlow)['flow-a']);
      asRecord(flowSteps['retained-step']).stepId = 'different-step';
    },
  },
  {
    name: 'array-shaped count map',
    mutate: (raw) => { raw.stepCountsByFlow = []; },
  },
  {
    name: 'invalid anchor date',
    mutate: (raw) => { raw.anchor = '2026-02-31'; },
  },
];

snapshotCorruptions.forEach(({ name, mutate }) => {
  test(`Map snapshot parser rejects ${name}`, () => {
    const raw = structuredClone(buildMapSnapshot()) as unknown as Record<string, unknown>;
    mutate(raw);
    assert.equal(parseSavedPlanEditorMapSnapshot(JSON.stringify(raw), 'map-a', 'flow-a'), undefined);
  });
});

test('Map snapshot parser accepts a strict record and retains raw future fields', () => {
  const raw = structuredClone(buildMapSnapshot()) as unknown as Record<string, unknown>;
  raw.futureSnapshot = { keep: true };
  const parsed = parseSavedPlanEditorMapSnapshot(JSON.stringify(raw), 'map-a', 'flow-a');
  assert.ok(parsed);
  assert.deepEqual(parsed.rawValue.futureSnapshot, { keep: true });
  assert.equal(parsed.snapshot.personalCopy?.retainedStepsByFlow?.['flow-a']?.['retained-step'].stepId, 'retained-step');
});

test('Map snapshot merge does not synthesize absent optional legacy metric maps', () => {
  const raw = structuredClone(buildMapSnapshot()) as unknown as Record<string, unknown>;
  delete raw.stepCountsByFlow;
  delete raw.riskLevelsByFlow;
  delete raw.sourceCheckedAtByFlow;
  const parsed = parseSavedPlanEditorMapSnapshot(JSON.stringify(raw), 'map-a', 'flow-a');
  assert.ok(parsed);

  const merged = mergeSavedPlanEditorMapSnapshotRaw(parsed.rawValue, parsed.snapshot);
  assert.equal(Object.prototype.hasOwnProperty.call(merged, 'stepCountsByFlow'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(merged, 'riskLevelsByFlow'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(merged, 'sourceCheckedAtByFlow'), false);
});

const persistenceCorruptions: readonly RawCorruption[] = [
  {
    name: 'malformed sibling child',
    mutate: (raw) => { asRecordArray(raw.childFlows).push({ slug: 'broken-sibling' }); },
  },
  {
    name: 'duplicate child slug',
    mutate: (raw) => {
      const flows = asRecordArray(raw.childFlows);
      const duplicate = structuredClone(flows[0]!);
      duplicate.flowId = 'different-flow-id';
      flows.push(duplicate);
    },
  },
  {
    name: 'duplicate child flow ID',
    mutate: (raw) => {
      const flows = asRecordArray(raw.childFlows);
      const sibling = structuredClone(flows[0]!);
      sibling.slug = 'flow-b';
      flows.push(sibling);
    },
  },
  {
    name: 'non-string step ID',
    mutate: (raw) => { asRecord(asRecordArray(raw.childFlows)[0]).stepIds = [7]; },
  },
  {
    name: 'duplicate nested step ID',
    mutate: (raw) => {
      const child = asRecord(asRecordArray(raw.childFlows)[0]);
      const steps = asRecordArray(child.steps);
      steps.push(structuredClone(steps[0]!));
      child.stepIds = ['step-a', 'step-a'];
      child.stepCount = 2;
      child.itemFallbackCount = 2;
    },
  },
  {
    name: 'mismatched fallback count',
    mutate: (raw) => { asRecord(asRecordArray(raw.childFlows)[0]).itemFallbackCount = 0; },
  },
  {
    name: 'invalid required readiness enum',
    mutate: (raw) => { asRecord(raw.readiness).update = 'future-status'; },
  },
  {
    name: 'invalid required map title',
    mutate: (raw) => { asRecord(raw.map).title = ''; },
  },
  {
    name: 'malformed nested text fallback',
    mutate: (raw) => {
      const child = asRecord(asRecordArray(raw.childFlows)[0]);
      const step = asRecord(asRecordArray(child.steps)[0]);
      asRecord(step.textFallback).items = ['valid', 5];
      child.itemFallbackCount = 2;
    },
  },
];

persistenceCorruptions.forEach(({ name, mutate }) => {
  test(`Map persistence parser rejects ${name}`, () => {
    const raw = structuredClone(buildMapPersistence()) as unknown as Record<string, unknown>;
    mutate(raw);
    assert.equal(parseSavedPlanEditorMapPersistence(JSON.stringify(raw), 'map-a', 'flow-a'), undefined);
  });
});

test('Map persistence parser validates every child and accepts the complete contract', () => {
  const raw = structuredClone(buildMapPersistence()) as unknown as Record<string, unknown>;
  const sibling = buildMapChild('flow-b', 'flow-b-id', 'step-b');
  (raw.childFlows as SourceBackedFlowMapChildBinding[]).push(sibling);
  raw.futurePersistence = { keep: true };
  const parsed = parseSavedPlanEditorMapPersistence(JSON.stringify(raw), 'map-a', 'flow-a');
  assert.ok(parsed);
  assert.equal(parsed.record.childFlows.length, 2);
  assert.deepEqual(parsed.rawValue.futurePersistence, { keep: true });
});

test('Map snapshot merge preserves nested future fields by flow and step identity', () => {
  const raw = structuredClone(buildMapSnapshot()) as unknown as Record<string, unknown>;
  raw.futureSnapshot = { keep: true };
  const rawPersonalCopy = asRecord(raw.personalCopy);
  rawPersonalCopy.futurePersonalCopy = { keep: true };
  const rawOverrides = asRecord(asRecord(rawPersonalCopy.stepOverridesByFlow)['flow-a']);
  const rawOverride = asRecord(rawOverrides['step-a']);
  rawOverride.futureOverride = { keep: true };
  asRecord(rawOverride.schedule).futureSchedule = { keep: true };
  const rawRetained = asRecord(asRecord(rawPersonalCopy.retainedStepsByFlow)['flow-a']);
  const rawRetainedStep = asRecord(rawRetained['retained-step']);
  rawRetainedStep.futureStep = { keep: true };
  const rawRetainedCalendar = asRecord(rawRetainedStep.calendar);
  rawRetainedCalendar.futureCalendar = { keep: true };
  asRecord(rawRetainedCalendar.window).futureWindow = { keep: true };
  asRecord(rawRetainedStep.textFallback).futureText = { keep: true };

  const next = buildMapSnapshot();
  next.title = 'Edited map';
  next.personalCopy!.stepOverridesByFlow!['flow-a']!['step-a']!.title = 'Edited step';
  next.personalCopy!.stepOverridesByFlow!['flow-a']!['step-a']!.schedule!.date = '2026-08-22';
  next.personalCopy!.retainedStepsByFlow!['flow-a']!['retained-step']!.title = 'Edited retained step';
  next.personalCopy!.retainedStepsByFlow!['flow-a']!['retained-step']!.calendar.window!.label = 'Edited window';

  const merged = mergeSavedPlanEditorMapSnapshotRaw(raw, next);
  assert.deepEqual(merged.futureSnapshot, { keep: true });
  const mergedPersonalCopy = asRecord(merged.personalCopy);
  assert.deepEqual(mergedPersonalCopy.futurePersonalCopy, { keep: true });
  const mergedOverride = asRecord(asRecord(asRecord(mergedPersonalCopy.stepOverridesByFlow)['flow-a'])['step-a']);
  assert.equal(mergedOverride.title, 'Edited step');
  assert.deepEqual(mergedOverride.futureOverride, { keep: true });
  assert.deepEqual(asRecord(mergedOverride.schedule).futureSchedule, { keep: true });
  const mergedRetained = asRecord(asRecord(asRecord(mergedPersonalCopy.retainedStepsByFlow)['flow-a'])['retained-step']);
  assert.equal(mergedRetained.title, 'Edited retained step');
  assert.deepEqual(mergedRetained.futureStep, { keep: true });
  assert.deepEqual(asRecord(mergedRetained.calendar).futureCalendar, { keep: true });
  assert.deepEqual(asRecord(asRecord(mergedRetained.calendar).window).futureWindow, { keep: true });
  assert.deepEqual(asRecord(mergedRetained.textFallback).futureText, { keep: true });
});

test('Map persistence merge preserves top-level and nested future fields without touching a sibling', () => {
  const rawRecord = buildMapPersistence();
  rawRecord.childFlows.push(buildMapChild('flow-b', 'flow-b-id', 'step-b'));
  const next = buildMapPersistence();
  next.childFlows.push(buildMapChild('flow-b', 'flow-b-id', 'step-b'));
  const raw = structuredClone(rawRecord) as unknown as Record<string, unknown>;
  raw.futurePersistence = { keep: true };
  for (const key of ['map', 'saved', 'readiness', 'updateAssessment'] as const) {
    asRecord(raw[key]).futureOwner = { owner: key };
  }
  const rawFlows = asRecordArray(raw.childFlows);
  const rawTarget = rawFlows[0]!;
  rawTarget.futureChild = { keep: true };
  const rawTargetStep = asRecordArray(rawTarget.steps)[0]!;
  rawTargetStep.futureStep = { keep: true };
  const rawCalendar = asRecord(rawTargetStep.calendar);
  rawCalendar.futureCalendar = { keep: true };
  asRecord(rawCalendar.window).futureWindow = { keep: true };
  asRecord(rawTargetStep.textFallback).futureText = { keep: true };
  const rawSibling = rawFlows[1]!;
  rawSibling.futureSibling = { keep: true };
  asRecordArray(rawSibling.steps)[0]!.futureSiblingStep = { keep: true };

  const rawPersonalCopy = asRecord(raw.personalCopy);
  rawPersonalCopy.futurePersonalCopy = { keep: true };
  const rawOverride = asRecord(asRecord(asRecord(rawPersonalCopy.stepOverridesByFlow)['flow-a'])['step-a']);
  rawOverride.futureOverride = { keep: true };
  asRecord(rawOverride.schedule).futureSchedule = { keep: true };
  const rawRetained = asRecord(asRecord(asRecord(rawPersonalCopy.retainedStepsByFlow)['flow-a'])['retained-step']);
  rawRetained.futureRetained = { keep: true };
  asRecord(rawRetained.calendar).futureRetainedCalendar = { keep: true };
  asRecord(rawRetained.textFallback).futureRetainedText = { keep: true };

  next.map.title = 'Edited map';
  next.saved.savedAt = '2026-08-12T01:00:00.000Z';
  next.childFlows[0]!.title = 'Edited child';
  next.childFlows[0]!.steps[0]!.title = 'Edited source step';
  next.childFlows[0]!.steps[0]!.calendar.window!.label = 'Edited source window';
  next.personalCopy!.stepOverridesByFlow!['flow-a']!['step-a']!.schedule!.date = '2026-08-23';
  next.personalCopy!.retainedStepsByFlow!['flow-a']!['retained-step']!.title = 'Edited retained step';

  const merged = mergeSavedPlanEditorMapPersistenceRaw(raw, next);
  assert.deepEqual(merged.futurePersistence, { keep: true });
  for (const key of ['map', 'saved', 'readiness', 'updateAssessment'] as const) {
    assert.deepEqual(asRecord(merged[key]).futureOwner, { owner: key });
  }
  const mergedFlows = asRecordArray(merged.childFlows);
  const mergedTarget = mergedFlows[0]!;
  assert.equal(mergedTarget.title, 'Edited child');
  assert.deepEqual(mergedTarget.futureChild, { keep: true });
  const mergedTargetStep = asRecordArray(mergedTarget.steps)[0]!;
  assert.equal(mergedTargetStep.title, 'Edited source step');
  assert.deepEqual(mergedTargetStep.futureStep, { keep: true });
  assert.deepEqual(asRecord(mergedTargetStep.calendar).futureCalendar, { keep: true });
  assert.deepEqual(asRecord(asRecord(mergedTargetStep.calendar).window).futureWindow, { keep: true });
  assert.deepEqual(asRecord(mergedTargetStep.textFallback).futureText, { keep: true });
  assert.deepEqual(mergedFlows[1], rawSibling);

  const mergedPersonalCopy = asRecord(merged.personalCopy);
  assert.deepEqual(mergedPersonalCopy.futurePersonalCopy, { keep: true });
  const mergedOverride = asRecord(asRecord(asRecord(mergedPersonalCopy.stepOverridesByFlow)['flow-a'])['step-a']);
  assert.deepEqual(mergedOverride.futureOverride, { keep: true });
  assert.deepEqual(asRecord(mergedOverride.schedule).futureSchedule, { keep: true });
  const mergedRetained = asRecord(asRecord(asRecord(mergedPersonalCopy.retainedStepsByFlow)['flow-a'])['retained-step']);
  assert.deepEqual(mergedRetained.futureRetained, { keep: true });
  assert.deepEqual(asRecord(mergedRetained.calendar).futureRetainedCalendar, { keep: true });
  assert.deepEqual(asRecord(mergedRetained.textFallback).futureRetainedText, { keep: true });
});
