import assert from 'node:assert/strict';
import test from 'node:test';

import { PERSONAL_WORKSPACE_POC_STATE_KEY } from './personal-workspace-poc-contract';
import {
  createPersonalWorkspacePocEditorEvidenceStorage,
  createPersonalWorkspacePocEditorStorageEvidence,
  instrumentPersonalWorkspacePocEditorStorageCommit,
  isPersonalWorkspacePocEditorStateRawCurrent,
  resolvePersonalWorkspacePocEditorFailureEvidence,
} from './personal-workspace-poc-editor-storage-evidence';
import type { PersonalWorkspacePocStorage } from './personal-workspace-poc-storage';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';

function memoryStorage(): PersonalWorkspacePocStorage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

test('records successful target and support mutations separately', () => {
  const evidence = createPersonalWorkspacePocEditorStorageEvidence();
  const storage = createPersonalWorkspacePocEditorEvidenceStorage(memoryStorage(), evidence);

  storage.setItem(PERSONAL_WORKSPACE_POC_STATE_KEY, '{}');
  storage.setItem('flow:poc:personal-workspace:v1:journal', 'journal');
  storage.removeItem('flow:poc:personal-workspace:v1:journal');

  assert.equal(evidence.successfulTargetMutationCount, 1);
  assert.equal(evidence.successfulSupportMutationCount, 2);
  assert.equal(evidence.lastSuccessfulTargetRaw, '{}');
});

test('records the exact latest bytes accepted by the target writer', () => {
  const evidence = createPersonalWorkspacePocEditorStorageEvidence();
  const storage = createPersonalWorkspacePocEditorEvidenceStorage(memoryStorage(), evidence);

  storage.setItem(PERSONAL_WORKSPACE_POC_STATE_KEY, '{"revision":1}');
  storage.setItem(PERSONAL_WORKSPACE_POC_STATE_KEY, '{"revision":2}');
  assert.equal(evidence.successfulTargetMutationCount, 2);
  assert.equal(evidence.lastSuccessfulTargetRaw, '{"revision":2}');

  storage.removeItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
  assert.equal(evidence.successfulTargetMutationCount, 3);
  assert.equal(evidence.lastSuccessfulTargetRaw, null);
});

test('binds the exact target re-read and strict parsed state before commit succeeds', async () => {
  const actualStorage = memoryStorage();
  const evidence = createPersonalWorkspacePocEditorStorageEvidence();
  const storage = createPersonalWorkspacePocEditorEvidenceStorage(actualStorage, evidence);
  const state = { ...createPersonalWorkspacePocState('2026-09-02T00:00:00.000Z'), revision: 1 };
  const raw = JSON.stringify(state);
  const operation = instrumentPersonalWorkspacePocEditorStorageCommit({
    commit: () => storage.setItem(PERSONAL_WORKSPACE_POC_STATE_KEY, raw),
    rollbackAndVerify: () => true,
  }, evidence, {
    readTargetRaw: () => actualStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY),
    parseTargetRaw: (candidate) => candidate === raw ? state : undefined,
  });

  await operation.commit();
  assert.equal(evidence.verifiedTargetRaw, raw);
  assert.deepEqual(evidence.verifiedTargetState, state);
});

test('exact target mismatch fails as recoverable storage evidence before close', async () => {
  const actualStorage = memoryStorage();
  const evidence = createPersonalWorkspacePocEditorStorageEvidence();
  const storage = createPersonalWorkspacePocEditorEvidenceStorage(actualStorage, evidence);
  const operation = instrumentPersonalWorkspacePocEditorStorageCommit({
    commit: () => storage.setItem(PERSONAL_WORKSPACE_POC_STATE_KEY, '{"revision":1}'),
    rollbackAndVerify: () => true,
  }, evidence, {
    readTargetRaw: () => '{"revision":2}',
    parseTargetRaw: () => undefined,
  });

  await assert.rejects(operation.commit(), (error: unknown) => {
    const failure = error as { kind?: string; code?: string };
    return failure.kind === 'storage' && failure.code === 'editor-target-bytes-mismatch';
  });
  assert.equal(evidence.verifiedTargetRaw, undefined);
  assert.equal(evidence.verifiedTargetState, undefined);
});

test('records complete rollback after a failed commit', async () => {
  const evidence = createPersonalWorkspacePocEditorStorageEvidence();
  const operation = instrumentPersonalWorkspacePocEditorStorageCommit({
    commit: () => { throw new Error('save-failed'); },
    rollbackAndVerify: () => true,
  }, evidence);

  await assert.rejects(operation.commit(), /save-failed/u);
  assert.equal(await operation.rollbackAndVerify(), true);
  assert.deepEqual(resolvePersonalWorkspacePocEditorFailureEvidence(evidence, false), {
    supportWriteCount: 0,
    rollback: 'complete',
  });
});

test('records recovery-required without inventing a support write', async () => {
  const evidence = createPersonalWorkspacePocEditorStorageEvidence();
  const operation = instrumentPersonalWorkspacePocEditorStorageCommit({
    commit: () => undefined,
    rollbackAndVerify: () => false,
  }, evidence);

  await operation.commit();
  assert.equal(await operation.rollbackAndVerify(), false);
  assert.deepEqual(resolvePersonalWorkspacePocEditorFailureEvidence(evidence, true), {
    supportWriteCount: 0,
    rollback: 'recovery-required',
  });
});

test('recovery-required preserves only observed successful support writes', () => {
  const evidence = createPersonalWorkspacePocEditorStorageEvidence();
  const storage = createPersonalWorkspacePocEditorEvidenceStorage(memoryStorage(), evidence);

  storage.setItem('flow:poc:personal-workspace:v1:editor-storage-recovery:v1', 'journal');
  storage.removeItem('flow:poc:personal-workspace:v1:editor-storage-commit-marker:v1');

  assert.deepEqual(resolvePersonalWorkspacePocEditorFailureEvidence(evidence, true), {
    supportWriteCount: 2,
    rollback: 'recovery-required',
  });
});

test('preflight failures report zero mutation and no rollback', () => {
  assert.deepEqual(resolvePersonalWorkspacePocEditorFailureEvidence(undefined, false), {
    supportWriteCount: 0,
    rollback: 'not-needed',
  });
});

test('exact state bytes accept the initial empty key and reject stale or reordered bytes', () => {
  const initial = createPersonalWorkspacePocState('2026-09-02T00:00:00.000Z');
  assert.equal(isPersonalWorkspacePocEditorStateRawCurrent(initial, null), true);
  assert.equal(isPersonalWorkspacePocEditorStateRawCurrent(initial, JSON.stringify(initial)), true);
  assert.equal(isPersonalWorkspacePocEditorStateRawCurrent(initial, '{"revision":0}'), false);

  const advanced = { ...initial, revision: 1 };
  assert.equal(isPersonalWorkspacePocEditorStateRawCurrent(advanced, null), false);
});
