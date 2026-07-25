import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AJD_MOVING_CANONICAL_FLOW_ID,
  AJD_MOVING_LEGACY_CANONICAL_FLOW_ID,
  getCanonicalFlowEntry,
} from './canonical-flow-registry';
import {
  CANONICAL_FLOW_ORIGIN_STORAGE_KEY,
  CANONICAL_FLOW_RECONCILIATION_STORAGE_KEY,
  applyCanonicalReconciliationDecision,
  inspectCanonicalSavedCopyGroup,
  loadCanonicalFlowOriginMetadata,
  loadCanonicalFlowReconciliationRecord,
  recordCanonicalFlowWrite,
} from './canonical-flow-storage';
import {
  PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY,
  loadPersonalFlowLifecycle,
} from './personal-flow-lifecycle';
import {
  buildFlowMeLocalBackup,
  isFlowMeExecutionStorageKey,
  restoreFlowMeLocalBackup,
} from './local-data-backup';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
    snapshot() {
      return Object.fromEntries(values);
    },
  };
}

function savedRecord(slug: string, savedAt: string, personalTitle?: string) {
  return JSON.stringify({
    slug,
    savedAt,
    selectedArtifactMode: 'calendar',
    dateIntent: 'custom',
    anchor: '2030-08-15',
    ...(personalTitle ? { personalTitle } : {}),
  });
}

const entry = getCanonicalFlowEntry(AJD_MOVING_CANONICAL_FLOW_ID);
assert.ok(entry);

test('P33-NO-STORAGE-WRITE-CHANGE shadow read finds one legacy saved copy without rewriting it', () => {
  const storage = memoryStorage({
    'flow:saved:source-backed-moving-d30': savedRecord(
      'source-backed-moving-d30',
      '2026-07-01T00:00:00.000Z',
      '우리 집 이사',
    ),
  });
  const before = storage.snapshot();
  const group = inspectCanonicalSavedCopyGroup(storage, entry);

  assert.equal(group.status, 'single');
  assert.equal(group.activeCopy?.originSlug, 'source-backed-moving-d30');
  assert.equal(group.activeCopy?.personalTitle, '우리 집 이사');
  assert.deepEqual(storage.snapshot(), before);
});

test('dual read exposes canonical and legacy records as a choice without merging item state', () => {
  const storage = memoryStorage({
    'flow:saved:moving-d30-basic': savedRecord('moving-d30-basic', '2026-07-02T00:00:00.000Z'),
    'flow:saved:source-backed-moving-d30': savedRecord('source-backed-moving-d30', '2026-07-01T00:00:00.000Z'),
    'flow:run-registry:source-backed-moving-d30': '{"runs":[{"status":"completed"}]}',
  });
  const before = storage.snapshot();
  const group = inspectCanonicalSavedCopyGroup(storage, entry);

  assert.equal(group.status, 'needs_choice');
  assert.equal(group.activeCopy, undefined);
  assert.deepEqual(group.copies.map((copy) => [copy.originSlug, copy.itemCount]), [
    ['moving-d30-basic', 24],
    ['source-backed-moving-d30', 5],
  ]);
  assert.deepEqual(storage.snapshot(), before);
});

test('canonical single write records additive origin metadata and ignores legacy writes', () => {
  const storage = memoryStorage();
  const legacy = recordCanonicalFlowWrite(
    storage,
    'source-backed-moving-d30',
    '2026-07-24T01:00:00.000Z',
  );
  const canonical = recordCanonicalFlowWrite(
    storage,
    'moving-d30-basic',
    '2026-07-24T02:00:00.000Z',
  );

  assert.equal(legacy, undefined);
  assert.equal(canonical?.canonicalSavedSlug, 'moving-d30-basic');
  assert.ok(storage.getItem(CANONICAL_FLOW_ORIGIN_STORAGE_KEY));
  assert.equal(
    loadCanonicalFlowOriginMetadata(storage).entries[AJD_MOVING_CANONICAL_FLOW_ID]?.lastCanonicalWriteAt,
    '2026-07-24T02:00:00.000Z',
  );
});

test('P33-CANONICAL-ID-COMPAT-READ exposes legacy preview metadata under the factory ID without rewriting storage', () => {
  const legacyMetadata = {
    schemaVersion: 1,
    entries: {
      [AJD_MOVING_LEGACY_CANONICAL_FLOW_ID]: {
        canonicalFlowId: AJD_MOVING_LEGACY_CANONICAL_FLOW_ID,
        canonicalSavedSlug: 'moving-d30-basic',
        legacyOriginSlugs: ['source-backed-moving-d30'],
        lastCanonicalWriteAt: '2026-07-24T01:00:00.000Z',
      },
    },
  };
  const storage = memoryStorage({
    [CANONICAL_FLOW_ORIGIN_STORAGE_KEY]: JSON.stringify(legacyMetadata),
  });
  const before = storage.snapshot();
  const loaded = loadCanonicalFlowOriginMetadata(storage);

  assert.equal(
    loaded.entries[AJD_MOVING_CANONICAL_FLOW_ID]?.canonicalSavedSlug,
    'moving-d30-basic',
  );
  assert.equal(
    loaded.entries[AJD_MOVING_LEGACY_CANONICAL_FLOW_ID]?.canonicalFlowId,
    AJD_MOVING_LEGACY_CANONICAL_FLOW_ID,
  );
  assert.deepEqual(loaded.compatibilityWarnings, [
    `legacy_canonical_id:${AJD_MOVING_LEGACY_CANONICAL_FLOW_ID}->${AJD_MOVING_CANONICAL_FLOW_ID}`,
  ]);
  assert.deepEqual(storage.snapshot(), before);
});

test('old and factory canonical records remain separate and produce a diagnostic instead of auto-merging', () => {
  const factoryRecord = {
    canonicalFlowId: AJD_MOVING_CANONICAL_FLOW_ID,
    activeOriginSlug: 'moving-d30-basic',
    archivedOriginSlugs: ['source-backed-moving-d30'],
    decidedAt: '2026-07-25T01:00:00.000Z',
  };
  const legacyRecord = {
    canonicalFlowId: AJD_MOVING_LEGACY_CANONICAL_FLOW_ID,
    activeOriginSlug: 'source-backed-moving-d30',
    archivedOriginSlugs: ['moving-d30-basic'],
    decidedAt: '2026-07-24T01:00:00.000Z',
  };
  const storage = memoryStorage({
    [CANONICAL_FLOW_RECONCILIATION_STORAGE_KEY]: JSON.stringify({
      schemaVersion: 1,
      decisions: {
        [AJD_MOVING_CANONICAL_FLOW_ID]: factoryRecord,
        [AJD_MOVING_LEGACY_CANONICAL_FLOW_ID]: legacyRecord,
      },
    }),
  });
  const before = storage.snapshot();
  const loaded = loadCanonicalFlowReconciliationRecord(storage);

  assert.deepEqual(loaded.decisions[AJD_MOVING_CANONICAL_FLOW_ID], factoryRecord);
  assert.deepEqual(loaded.decisions[AJD_MOVING_LEGACY_CANONICAL_FLOW_ID], legacyRecord);
  assert.ok(loaded.compatibilityWarnings.some((warning) => warning.startsWith('multiple_canonical_id_records:')));
  assert.deepEqual(storage.snapshot(), before);
});

test('backup and restore preserve the raw legacy metadata while compatibility reads expose the factory ID', () => {
  const legacyMetadata = JSON.stringify({
    schemaVersion: 1,
    entries: {
      [AJD_MOVING_LEGACY_CANONICAL_FLOW_ID]: {
        canonicalFlowId: AJD_MOVING_LEGACY_CANONICAL_FLOW_ID,
        canonicalSavedSlug: 'moving-d30-basic',
        legacyOriginSlugs: ['source-backed-moving-d30'],
        lastCanonicalWriteAt: '2026-07-24T01:00:00.000Z',
      },
    },
  });
  const sourceStorage = memoryStorage({
    [CANONICAL_FLOW_ORIGIN_STORAGE_KEY]: legacyMetadata,
  });
  const backup = buildFlowMeLocalBackup(sourceStorage, '2026-07-25T03:00:00.000Z');
  const restoredStorage = memoryStorage();

  restoreFlowMeLocalBackup(restoredStorage, backup);

  assert.equal(restoredStorage.getItem(CANONICAL_FLOW_ORIGIN_STORAGE_KEY), legacyMetadata);
  assert.equal(
    loadCanonicalFlowOriginMetadata(restoredStorage).entries[AJD_MOVING_CANONICAL_FLOW_ID]?.canonicalFlowId,
    AJD_MOVING_CANONICAL_FLOW_ID,
  );
});

test('reconciliation called with the legacy preview ID writes the factory ID only', () => {
  const storage = memoryStorage({
    'flow:saved:moving-d30-basic': savedRecord('moving-d30-basic', '2026-07-02T00:00:00.000Z'),
    'flow:saved:source-backed-moving-d30': savedRecord('source-backed-moving-d30', '2026-07-01T00:00:00.000Z'),
  });

  applyCanonicalReconciliationDecision(
    storage,
    AJD_MOVING_LEGACY_CANONICAL_FLOW_ID,
    'moving-d30-basic',
    '2026-07-25T02:00:00.000Z',
  );
  const raw = JSON.parse(storage.getItem(CANONICAL_FLOW_RECONCILIATION_STORAGE_KEY) ?? '{}') as {
    decisions?: Record<string, { canonicalFlowId?: string }>;
  };

  assert.equal(raw.decisions?.[AJD_MOVING_CANONICAL_FLOW_ID]?.canonicalFlowId, AJD_MOVING_CANONICAL_FLOW_ID);
  assert.equal(raw.decisions?.[AJD_MOVING_LEGACY_CANONICAL_FLOW_ID], undefined);
});

test('explicit reconciliation archives the inactive copy while preserving every personal data key', () => {
  const storage = memoryStorage({
    'flow:saved:moving-d30-basic': savedRecord('moving-d30-basic', '2026-07-02T00:00:00.000Z'),
    'flow:saved:source-backed-moving-d30': savedRecord('source-backed-moving-d30', '2026-07-01T00:00:00.000Z'),
    'flow_builder_mvp_checks_source-backed-moving-d30': '{"moving-method-quotes":true}',
    'flow:run-registry:source-backed-moving-d30': '{"runs":[{"status":"completed"}]}',
    'flow:my-flow:completion-feedback:source-backed-moving-d30': '{"reflection":{"note":"legacy note"}}',
  });
  const protectedKeys = [
    'flow:saved:moving-d30-basic',
    'flow:saved:source-backed-moving-d30',
    'flow_builder_mvp_checks_source-backed-moving-d30',
    'flow:run-registry:source-backed-moving-d30',
    'flow:my-flow:completion-feedback:source-backed-moving-d30',
  ];
  const before = storage.snapshot();

  const group = applyCanonicalReconciliationDecision(
    storage,
    AJD_MOVING_CANONICAL_FLOW_ID,
    'moving-d30-basic',
    '2026-07-24T03:00:00.000Z',
  );

  assert.equal(group?.status, 'resolved');
  assert.equal(group?.activeCopy?.originSlug, 'moving-d30-basic');
  assert.deepEqual(loadPersonalFlowLifecycle(storage).record.archivedFlowSlugs, ['source-backed-moving-d30']);
  for (const key of protectedKeys) assert.equal(storage.getItem(key), before[key]);
  assert.ok(storage.getItem(CANONICAL_FLOW_RECONCILIATION_STORAGE_KEY));
  assert.ok(storage.getItem(PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY));
});

test('choosing the legacy copy keeps canonical data intact and archives only the canonical copy', () => {
  const storage = memoryStorage({
    'flow:saved:moving-d30-basic': savedRecord('moving-d30-basic', '2026-07-02T00:00:00.000Z'),
    'flow:saved:source-backed-moving-d30': savedRecord('source-backed-moving-d30', '2026-07-01T00:00:00.000Z'),
  });
  const group = applyCanonicalReconciliationDecision(
    storage,
    AJD_MOVING_CANONICAL_FLOW_ID,
    'source-backed-moving-d30',
    '2026-07-24T04:00:00.000Z',
  );

  assert.equal(group?.activeCopy?.originSlug, 'source-backed-moving-d30');
  assert.deepEqual(loadPersonalFlowLifecycle(storage).record.archivedFlowSlugs, ['moving-d30-basic']);
  assert.ok(storage.getItem('flow:saved:moving-d30-basic'));
});

test('restoring a previously archived duplicate reopens the choice instead of silently merging', () => {
  const storage = memoryStorage({
    'flow:saved:moving-d30-basic': savedRecord('moving-d30-basic', '2026-07-02T00:00:00.000Z'),
    'flow:saved:source-backed-moving-d30': savedRecord('source-backed-moving-d30', '2026-07-01T00:00:00.000Z'),
  });
  applyCanonicalReconciliationDecision(
    storage,
    AJD_MOVING_CANONICAL_FLOW_ID,
    'moving-d30-basic',
    '2026-07-24T05:00:00.000Z',
  );

  const reopened = inspectCanonicalSavedCopyGroup(storage, entry, []);
  assert.equal(reopened.status, 'needs_choice');
});

test('malformed saved or metadata records cannot hide a valid canonical copy', () => {
  const storage = memoryStorage({
    'flow:saved:moving-d30-basic': savedRecord('moving-d30-basic', '2026-07-02T00:00:00.000Z'),
    'flow:saved:source-backed-moving-d30': '{broken',
    [CANONICAL_FLOW_ORIGIN_STORAGE_KEY]: '{broken',
    [CANONICAL_FLOW_RECONCILIATION_STORAGE_KEY]: '{broken',
  });
  const group = inspectCanonicalSavedCopyGroup(storage, entry);

  assert.equal(group.status, 'single');
  assert.equal(group.activeCopy?.originSlug, 'moving-d30-basic');
  assert.deepEqual(group.warnings, ['malformed_saved_copy:source-backed-moving-d30']);
  assert.deepEqual(loadCanonicalFlowOriginMetadata(storage).entries, {});
});

test('canonical origin and reconciliation metadata are included in local backup scope', () => {
  assert.equal(isFlowMeExecutionStorageKey(CANONICAL_FLOW_ORIGIN_STORAGE_KEY), true);
  assert.equal(isFlowMeExecutionStorageKey(CANONICAL_FLOW_RECONCILIATION_STORAGE_KEY), true);
});
