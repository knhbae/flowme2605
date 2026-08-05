import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  LEGACY_MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY,
  PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY,
  archivePersonalFlow,
  createEmptyPersonalFlowLifecycle,
  loadPersonalFlowLifecycle,
  readPersonalFlowLifecycle,
  restorePersonalFlow,
  savePersonalFlowLifecycle,
} from './personal-flow-lifecycle';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const writes: Array<{ key: string; value: string }> = [];
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      writes.push({ key, value });
      values.set(key, value);
    },
    snapshot() {
      return Object.fromEntries(values);
    },
    writes() {
      return [...writes];
    },
  };
}

function checksum(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

test('personal Flow lifecycle migrates the legacy hidden list without touching execution records', () => {
  const storage = memoryStorage({
    [LEGACY_MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY]: JSON.stringify(['moving-d30', 'moving-d30', ' washer ']),
    'flow:run-registry:moving-d30': '{"runs":[{"status":"completed"}]}',
  });

  const result = loadPersonalFlowLifecycle(storage, '2026-07-21T00:00:00.000Z');

  assert.equal(result.source, 'legacy_hidden_flows');
  assert.deepEqual(result.record.archivedFlowSlugs, ['moving-d30', 'washer']);
  assert.equal(result.record.migration?.source, 'legacy_hidden_flows');
  assert.ok(storage.getItem(PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY));
  assert.equal(
    storage.getItem('flow:run-registry:moving-d30'),
    '{"runs":[{"status":"completed"}]}',
  );
});

test('read-only lifecycle exposes legacy archived slugs without changing storage bytes', () => {
  const storage = memoryStorage({
    [LEGACY_MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY]: JSON.stringify([
      'moving-d30',
      'moving-d30',
      ' washer ',
    ]),
    'flow:run-registry:moving-d30': '{"runs":[{"status":"completed"}]}',
  });
  const before = checksum(storage.snapshot());

  const result = readPersonalFlowLifecycle(storage, '2026-07-21T00:00:00.000Z');

  assert.equal(result.source, 'legacy_hidden_flows');
  assert.deepEqual(result.record.archivedFlowSlugs, ['moving-d30', 'washer']);
  assert.equal(result.record.migration?.source, 'legacy_hidden_flows');
  assert.equal(storage.getItem(PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY), null);
  assert.equal(checksum(storage.snapshot()), before);
  assert.deepEqual(storage.writes(), []);
});

test('personal Flow archive and restore are reversible and keep a stable Flow slug', () => {
  const empty = createEmptyPersonalFlowLifecycle('2026-07-21T00:00:00.000Z');
  const archived = archivePersonalFlow(empty, 'moving-d30', '2026-07-21T01:00:00.000Z');
  const restored = restorePersonalFlow(archived, 'moving-d30', '2026-07-21T02:00:00.000Z');

  assert.deepEqual(archived.archivedFlowSlugs, ['moving-d30']);
  assert.deepEqual(restored.archivedFlowSlugs, []);
  assert.equal(empty.updatedAt, '2026-07-21T00:00:00.000Z');
  assert.equal(restored.updatedAt, '2026-07-21T02:00:00.000Z');
});

test('personal Flow lifecycle normalizes duplicates and mirrors legacy storage on save', () => {
  const storage = memoryStorage();
  const saved = savePersonalFlowLifecycle(storage, {
    schemaVersion: 1,
    archivedFlowSlugs: ['moving-d30', '', 'moving-d30', ' washer '],
    updatedAt: '2026-07-21T03:00:00.000Z',
  });

  assert.deepEqual(saved.archivedFlowSlugs, ['moving-d30', 'washer']);
  assert.deepEqual(
    JSON.parse(storage.getItem(LEGACY_MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY) ?? '[]'),
    ['moving-d30', 'washer'],
  );
});

test('malformed lifecycle data cannot archive or remove a valid Flow implicitly', () => {
  const storage = memoryStorage({
    [PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY]: '{broken',
    [LEGACY_MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY]: '{also-broken',
  });

  const result = loadPersonalFlowLifecycle(storage, '2026-07-21T04:00:00.000Z');

  assert.equal(result.source, 'empty');
  assert.deepEqual(result.record.archivedFlowSlugs, []);
  assert.deepEqual(result.warnings, [
    'malformed_lifecycle_record_ignored',
    'malformed_legacy_hidden_flows_ignored',
  ]);
});
