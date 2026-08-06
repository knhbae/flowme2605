import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectPermanentSavedFlowDeletion,
  runPermanentSavedFlowDeletionTransaction,
} from './permanent-saved-flow-deletion-transaction';
import {
  clearPermanentSavedFlowDeletionRecoveryJournal,
  confirmPermanentSavedFlowDeletionRecoveryJournal,
  isPermanentSavedFlowDeletionConfirmedForPlan,
  PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY,
  preparePermanentSavedFlowDeletionRecoveryJournal,
  readPermanentSavedFlowDeletionRecoveryJournal,
} from './permanent-saved-flow-deletion-recovery-journal';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  onSet?: (key: string, value: string) => void;
  onRemove?: (key: string) => void;

  constructor(initial: Record<string, string> = {}) {
    Object.entries(initial).forEach(([key, value]) => this.values.set(key, value));
  }

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) {
    this.values.delete(key);
    this.onRemove?.(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
    this.onSet?.(key, value);
  }
  rawSet(key: string, value: string) { this.values.set(key, value); }
  snapshot() { return Object.fromEntries(this.values); }
}

const slug = 'delete-me';
const lifecycle = JSON.stringify({
  schemaVersion: 1,
  archivedFlowSlugs: [slug, 'keep-flow'],
  updatedAt: '2026-08-06T00:00:00.000Z',
});

function mapSnapshot(mapId: string, flowSlugs: string[]) {
  return JSON.stringify({
    mapId,
    title: mapId,
    version: 'v1',
    savedAt: '2026-08-06T00:00:00.000Z',
    flowSlugs,
    stepCountsByFlow: Object.fromEntries(flowSlugs.map((flowSlug) => [flowSlug, 1])),
    personalCopy: {
      source: 'test',
      originalTitle: mapId,
      includedStepIdsByFlow: Object.fromEntries(flowSlugs.map((flowSlug) => [flowSlug, [`${flowSlug}-step`]])),
      excludedStepIdsByFlow: {},
      stepOverridesByFlow: Object.fromEntries(flowSlugs.map((flowSlug) => [flowSlug, {}])),
    },
  });
}

function persistence(mapId: string, flowSlugs: string[]) {
  return JSON.stringify({
    schemaVersion: 1,
    recordType: 'saved_source_backed_flow_map',
    bridgeStorageKey: `flow:map:saved:${mapId}`,
    map: { id: mapId, title: mapId, userLabel: mapId, version: 'v1', updatedAt: '', updatePolicy: 'manual_review', sourceTitle: '', sourceUrl: '' },
    saved: { savedAt: '2026-08-06T00:00:00.000Z', sourceSurface: 'public_save' },
    readiness: { content: 'ready_for_my_flow', update: 'up_to_date', reasons: [] },
    childFlows: flowSlugs.map((flowSlug) => ({ slug: flowSlug })),
    updateAssessment: { status: 'up_to_date', userAction: 'none', canApplyAutomatically: true, savedVersion: 'v1', affectedFlows: flowSlugs, reasons: [] },
    personalCopy: {
      source: 'test',
      originalTitle: mapId,
      includedStepIdsByFlow: Object.fromEntries(flowSlugs.map((flowSlug) => [flowSlug, [`${flowSlug}-step`]])),
      excludedStepIdsByFlow: {},
      stepOverridesByFlow: Object.fromEntries(flowSlugs.map((flowSlug) => [flowSlug, {}])),
    },
  });
}

function createStorage() {
  return new MemoryStorage({
    'flow:my-flow:lifecycle:v1': lifecycle,
    'flow:my-flow:hidden-flows': JSON.stringify([slug, 'keep-flow']),
    'flow_builder_mvp_bundles_v11': JSON.stringify([
      { flow: { slug, id: slug } },
      { flow: { slug: 'keep-flow', id: 'keep-flow' } },
    ]),
    [`flow:saved:${slug}`]: 'saved-record',
    [`flow_builder_mvp_checks_${slug}`]: '{"step":true}',
    [`flow:map:saved:map-only`]: mapSnapshot('map-only', [slug]),
    [`flow:map:persistence:map-only`]: persistence('map-only', [slug]),
    [`flow:map:saved:map-shared`]: mapSnapshot('map-shared', [slug, 'keep-flow']),
    [`flow:map:persistence:map-shared`]: persistence('map-shared', [slug, 'keep-flow']),
    'flow:calendar:selected-flows:v1': JSON.stringify([slug, 'keep-flow']),
    'flow:my-flow:step-item-checks': JSON.stringify({ [`${slug}::step`]: true, 'keep-flow::step': true }),
    'flow:my-flow:item-drafts': JSON.stringify({ [`${slug}::step`]: { memo: 'delete' }, 'keep-flow::step': { memo: 'keep' } }),
    'flow:my-flow:date-overrides': JSON.stringify({ [`${slug}::step`]: '2026-08-06', 'keep-flow::step': '2026-08-07' }),
    'flow:my-flow:occurrence-execution': JSON.stringify({ [`${slug}::occurrence`]: { state: 'done' }, 'keep-flow::occurrence': { state: 'done' } }),
    [`flow:my-flow:structural-overlay:${slug}`]: JSON.stringify({ schemaVersion: 1, savedCopyId: slug, flowId: slug }),
    'flow:meta:last-visit': 'before',
  });
}

test('successful permanent delete atomically removes one Map, updates another, and preserves unrelated state', () => {
  const storage = createStorage();
  const inspection = inspectPermanentSavedFlowDeletion(storage, { flowSlug: slug, personalDraft: true });
  assert.ok(inspection);
  const result = runPermanentSavedFlowDeletionTransaction({
    storage,
    expected: inspection,
    deletedAt: '2026-08-06T01:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.result.removedSavedMapIds, ['map-only']);
  assert.deepEqual(result.result.updatedSavedMapIds, ['map-shared']);
  assert.equal(storage.getItem('flow:map:saved:map-only'), null);
  assert.equal(storage.getItem('flow:map:persistence:map-only'), null);
  assert.deepEqual(JSON.parse(storage.getItem('flow:map:saved:map-shared') ?? '{}').flowSlugs, ['keep-flow']);
  assert.equal(storage.getItem(`flow:saved:${slug}`), null);
  assert.deepEqual(JSON.parse(storage.getItem('flow:my-flow:item-drafts') ?? '{}'), {
    'keep-flow::step': { memo: 'keep' },
  });
  assert.deepEqual(JSON.parse(storage.getItem('flow_builder_mvp_bundles_v11') ?? '[]').map((entry: { flow: { slug: string } }) => entry.flow.slug), ['keep-flow']);
});

test('changed bytes or a newly referenced Map fail stale with zero transaction writes', () => {
  const storage = createStorage();
  const inspection = inspectPermanentSavedFlowDeletion(storage, { flowSlug: slug, personalDraft: true });
  assert.ok(inspection);
  storage.setItem('flow:map:saved:late-map', mapSnapshot('late-map', [slug]));
  storage.setItem('flow:map:persistence:late-map', persistence('late-map', [slug]));
  const before = storage.snapshot();

  const result = runPermanentSavedFlowDeletionTransaction({ storage, expected: inspection });

  assert.deepEqual(result, { ok: false, reason: 'stale' });
  assert.deepEqual(storage.snapshot(), before);
});

test('mutate-then-throw failure rolls back every owned deletion byte', () => {
  const storage = createStorage();
  const inspection = inspectPermanentSavedFlowDeletion(storage, { flowSlug: slug, personalDraft: true });
  assert.ok(inspection);
  const before = storage.snapshot();
  let thrown = false;
  storage.onSet = (key, value) => {
    if (!thrown && key === 'flow:my-flow:item-drafts' && !value.includes(`${slug}::`)) {
      thrown = true;
      throw new Error('quota after mutation');
    }
  };

  const result = runPermanentSavedFlowDeletionTransaction({ storage, expected: inspection });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, 'transaction_failed');
  assert.equal(result.transaction?.rollbackComplete, true);
  assert.deepEqual(storage.snapshot(), before);
});

test('rollback preserves an external replacement that the delete transaction never owned', () => {
  const storage = createStorage();
  const inspection = inspectPermanentSavedFlowDeletion(storage, { flowSlug: slug, personalDraft: true });
  assert.ok(inspection);
  let thrown = false;
  storage.onRemove = (key) => {
    if (!thrown && key === `flow:saved:${slug}`) {
      thrown = true;
      storage.rawSet(`flow:saved:${slug}`, 'external-newer-record');
      throw new Error('saved record removal failed after an external save');
    }
  };

  const result = runPermanentSavedFlowDeletionTransaction({ storage, expected: inspection });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.transaction?.rollbackComplete, false);
  assert.equal(storage.getItem(`flow:saved:${slug}`), 'external-newer-record');
});

test('deletion recovery journal persists prepared and confirmed phases across reads', () => {
  const storage = new MemoryStorage();

  const prepared = preparePermanentSavedFlowDeletionRecoveryJournal(storage, {
    savedPlanId: slug,
    flowTitle: 'Delete me',
  });
  assert.equal(prepared.status, 'stored');
  assert.equal(readPermanentSavedFlowDeletionRecoveryJournal(storage).journal?.phase, 'prepared');
  assert.equal(
    isPermanentSavedFlowDeletionConfirmedForPlan(
      readPermanentSavedFlowDeletionRecoveryJournal(storage),
      slug,
    ),
    false,
  );

  const confirmed = confirmPermanentSavedFlowDeletionRecoveryJournal(storage, slug);
  assert.equal(confirmed.status, 'stored');
  assert.equal(readPermanentSavedFlowDeletionRecoveryJournal(storage).journal?.phase, 'deletion_confirmed');
  assert.equal(
    isPermanentSavedFlowDeletionConfirmedForPlan(
      readPermanentSavedFlowDeletionRecoveryJournal(storage),
      slug,
    ),
    true,
  );
  assert.equal(
    isPermanentSavedFlowDeletionConfirmedForPlan(
      readPermanentSavedFlowDeletionRecoveryJournal(storage),
      'different-plan',
    ),
    false,
  );

  assert.deepEqual(clearPermanentSavedFlowDeletionRecoveryJournal(storage, slug), { status: 'cleared' });
  assert.equal(readPermanentSavedFlowDeletionRecoveryJournal(storage).status, 'empty');
});

test('an unresolved deletion recovery journal blocks another permanent-delete attempt', () => {
  const storage = new MemoryStorage();
  assert.equal(preparePermanentSavedFlowDeletionRecoveryJournal(storage, {
    savedPlanId: slug,
    flowTitle: 'Delete me',
  }).status, 'stored');

  const repeated = preparePermanentSavedFlowDeletionRecoveryJournal(storage, {
    savedPlanId: slug,
    flowTitle: 'Delete me',
  });
  assert.equal(repeated.status, 'blocked');
  assert.equal(repeated.journal?.phase, 'prepared');
});

test('malformed deletion recovery bytes fail closed and are not overwritten', () => {
  const raw = '{not-json';
  const storage = new MemoryStorage({
    [PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY]: raw,
  });

  assert.equal(readPermanentSavedFlowDeletionRecoveryJournal(storage).status, 'malformed');
  assert.equal(preparePermanentSavedFlowDeletionRecoveryJournal(storage, {
    savedPlanId: slug,
    flowTitle: 'Delete me',
  }).status, 'blocked');
  assert.equal(storage.getItem(PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY), raw);
});
