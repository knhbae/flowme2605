import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyItemMemoFacadeWrite,
  buildItemMemoFacade,
} from './item-memo-facade';
import {
  buildFlowMeLocalBackup,
  parseFlowMeLocalBackup,
  restoreFlowMeLocalBackup,
  serializeFlowMeLocalBackup,
  type FlowMeStorageLike,
} from './local-data-backup';
import { prepareMyFlowPersonalExecutionStateForReuse } from './my-flow-personal-state';
import type { FlowRunRecord } from './storage';

function memoryStorage(seed: Record<string, string> = {}): FlowMeStorageLike {
  const values = new Map(Object.entries(seed));
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function completedRun(): FlowRunRecord {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    flowSlug: 'moving',
    status: 'completed',
    startedAt: '2026-07-01T00:00:00.000Z',
    completedAt: '2026-07-02T00:00:00.000Z',
    personalExecutionStateSnapshot: {
      itemDrafts: {
        'moving::boxes::draft-overlay': { memo: '복구용 실행 당시 Item 메모' },
      },
      dateOverrides: {},
    },
    completionSnapshot: {
      checks: { boxes: true },
      itemStates: { boxes: { note: '실행 당시 이전 Item note' } },
      stepItemChecks: {},
      comparisonState: { candidates: [], notes: {} },
      workbenchState: { occurrences: {}, logRows: {}, memoCards: {} },
      reactionLogs: {},
      itemSnapshots: [{
        itemId: 'boxes',
        title: '박스 준비',
        status: 'done',
        scheduleState: 'unscheduled',
        memo: '실행 당시 Item 메모',
        personalOrderRank: 0,
      }],
      executionNotes: [
        {
          itemId: 'moving::boxes::none',
          itemTitle: '박스 준비',
          kind: 'private',
          note: '실행 당시 비공개 메모',
          updatedAt: '2026-07-02T00:00:00.000Z',
        },
        {
          itemId: 'moving::boxes::none',
          itemTitle: '박스 준비',
          kind: 'source_correction',
          note: '실행 당시 원문 수정 제안',
          updatedAt: '2026-07-02T00:01:00.000Z',
        },
      ],
      completionFeedback: {
        flowSlug: 'moving',
        sourceCorrectionDraft: {
          scope: 'item',
          itemId: 'boxes',
          itemTitle: '박스 준비',
          note: '실행 완료 당시 원문 수정 초안',
          updatedAt: '2026-07-02T00:02:00.000Z',
        },
      },
    },
  };
}

test('memo facade keeps current, legacy, private, correction, and run stores distinguishable', () => {
  const writeKey = 'moving::boxes::draft-overlay';
  const occurrenceKey = 'moving::boxes::none';
  const facade = buildItemMemoFacade({
    flowSlug: 'moving',
    itemId: 'boxes',
    itemDraftReadKeys: [occurrenceKey, writeKey],
    itemMemoWriteKey: writeKey,
    itemDrafts: {
      [occurrenceKey]: { memo: '이전 occurrence 메모', location: '창고' },
      [writeKey]: { memo: '현재 Item 메모', title: '내 박스 준비' },
      'other-flow::item::draft-overlay': { memo: '다른 Flow 메모' },
    },
    personalCopyOverride: { userMemo: '기존 map personal-copy 메모' },
    legacyItemState: { note: '이전 Item note' },
    executionItemIds: [occurrenceKey],
    executionNotes: [
      {
        itemId: occurrenceKey,
        itemTitle: '박스 준비',
        kind: 'private',
        note: '현재 비공개 실행 메모',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        itemId: occurrenceKey,
        itemTitle: '박스 준비',
        kind: 'source_correction',
        note: '현재 원문 수정 제안',
        updatedAt: '2026-08-01T00:01:00.000Z',
      },
    ],
    completionFeedback: {
      flowSlug: 'moving',
      sourceCorrectionDraft: {
        scope: 'item',
        itemId: 'boxes',
        itemTitle: '박스 준비',
        note: '완료 후 원문 수정 초안',
        updatedAt: '2026-08-01T00:02:00.000Z',
      },
    },
    completedRuns: [completedRun()],
  });

  assert.equal(facade.defaultEntry?.store, 'item_draft');
  assert.equal(facade.defaultEntry?.storageIdentity, writeKey);
  assert.equal(facade.defaultEntry?.value, '현재 Item 메모');
  assert.deepEqual(
    new Set(facade.entries.map((entry) => entry.store)),
    new Set([
      'item_draft',
      'personal_copy',
      'legacy_item_state',
      'private_execution_note',
      'source_correction_note',
      'completion_source_correction',
      'run_item_snapshot',
      'run_personal_item_draft',
      'run_legacy_item_state',
      'run_private_execution_note',
      'run_source_correction_note',
      'run_completion_source_correction',
    ]),
  );
  assert.deepEqual(facade.generalExportFields.map((field) => ({
    kind: field.kind,
    value: field.value,
  })), [
    { kind: 'item_memo', value: '현재 Item 메모' },
    { kind: 'legacy_item_note', value: '이전 Item note' },
  ]);
  const generalExport = JSON.stringify(facade.generalExportFields);
  assert.doesNotMatch(generalExport, /비공개|수정 제안|실행 당시/u);
  assert.ok(facade.generalExportExcludedEntryIds.length >= 8);
});

test('one default write targets Item memo only and preserves every existing key and field', () => {
  const writeKey = 'moving::boxes::draft-overlay';
  const original = {
    [writeKey]: { title: '내 박스 준비', memo: '기존 메모', detailOverlay: { schemaVersion: 1 as const } },
    'moving::boxes::2026-08-01': { memo: 'occurrence 메모', time: '09:00' },
    'other-flow::item::draft-overlay': { memo: '다른 Flow 메모' },
  };
  const before = structuredClone(original);
  const result = applyItemMemoFacadeWrite({
    itemDrafts: original,
    itemMemoWriteKey: writeKey,
    value: '새 Item 메모\n원문과 분리해 보존',
  });

  assert.deepEqual(original, before);
  assert.deepEqual(result.deletedKeys, []);
  assert.deepEqual(Object.keys(result.itemDrafts).sort(), Object.keys(original).sort());
  assert.deepEqual(result.itemDrafts[writeKey], {
    ...original[writeKey],
    memo: '새 Item 메모\n원문과 분리해 보존',
  });
  assert.strictEqual(
    result.itemDrafts['moving::boxes::2026-08-01'],
    original['moving::boxes::2026-08-01'],
  );

  const cleared = applyItemMemoFacadeWrite({
    itemDrafts: result.itemDrafts,
    itemMemoWriteKey: writeKey,
    value: '',
  });
  assert.ok(Object.prototype.hasOwnProperty.call(cleared.itemDrafts[writeKey], 'memo'));
  assert.equal(cleared.itemDrafts[writeKey].memo, '');
  assert.deepEqual(cleared.deletedKeys, []);
});

test('a legacy map memo is a readable fallback until the first Item memo write', () => {
  const writeKey = 'moving::boxes::draft-overlay';
  const initial = buildItemMemoFacade({
    flowSlug: 'moving',
    itemId: 'boxes',
    itemDraftReadKeys: [writeKey],
    itemMemoWriteKey: writeKey,
    itemDrafts: {},
    personalCopyOverride: { userMemo: 'map에 보존된 메모' },
  });
  assert.equal(initial.defaultEntry?.store, 'personal_copy');
  assert.equal(initial.defaultEntry?.value, 'map에 보존된 메모');

  const written = applyItemMemoFacadeWrite({
    itemDrafts: {},
    itemMemoWriteKey: writeKey,
    value: '새 Item 메모',
  });
  const after = buildItemMemoFacade({
    flowSlug: 'moving',
    itemId: 'boxes',
    itemDraftReadKeys: [writeKey],
    itemMemoWriteKey: writeKey,
    itemDrafts: written.itemDrafts,
    personalCopyOverride: { userMemo: 'map에 보존된 메모' },
  });
  assert.equal(after.defaultEntry?.store, 'item_draft');
  assert.equal(after.defaultEntry?.value, '새 Item 메모');
  assert.equal(
    after.entries.find((entry) => entry.store === 'personal_copy')?.value,
    'map에 보존된 메모',
  );
});

test('reuse keeps Item memo as a separate draft and drops occurrence-only execution fields', () => {
  const reused = prepareMyFlowPersonalExecutionStateForReuse({
    itemDrafts: {
      'moving::boxes::2026-08-01': {
        title: '내 박스 준비',
        memo: '다음 실행에도 쓸 Item 메모',
        location: '이번 실행 창고',
        logValue: '이번 실행 기록',
      },
    },
    dateOverrides: { 'moving::boxes::2026-08-01': '2026-08-01' },
  }, { keepFixedDates: false });

  assert.deepEqual(reused, {
    itemDrafts: {
      'moving::boxes::draft-overlay': {
        title: '내 박스 준비',
        memo: '다음 실행에도 쓸 Item 메모',
      },
    },
    dateOverrides: {},
  });
});

test('backup and restore round-trip every memo store byte-for-byte without touching unrelated data', () => {
  const entries = {
    'flow:my-flow:item-drafts': JSON.stringify({
      'moving::boxes::draft-overlay': { memo: '현재 Item 메모' },
    }),
    'flow_builder_mvp_item_state_moving': JSON.stringify({
      boxes: { note: '이전 Item note' },
    }),
    'flow:my-flow:execution-notes:moving': JSON.stringify([
      { itemId: 'moving::boxes::none', kind: 'private', note: '비공개 실행 메모' },
      { itemId: 'moving::boxes::none', kind: 'source_correction', note: '원문 수정 제안' },
    ]),
    'flow:my-flow:completion-feedback:moving': JSON.stringify({
      sourceCorrectionDraft: { scope: 'item', itemId: 'boxes', note: '완료 후 수정 초안' },
    }),
    'flow:run-registry:moving': JSON.stringify({
      schemaVersion: 1,
      runs: [{ runId: 'run-1', completionSnapshot: { itemSnapshots: [{ itemId: 'boxes', memo: '실행 당시 메모' }] } }],
    }),
  };
  const source = memoryStorage({ ...entries, 'flow:auth:demo-user': 'keep-source-private' });
  const backup = parseFlowMeLocalBackup(serializeFlowMeLocalBackup(
    buildFlowMeLocalBackup(source, '2026-08-01T09:00:00.000Z'),
  ));
  assert.deepEqual(backup.entries, entries);

  const target = memoryStorage({
    'flow:my-flow:item-drafts': '{"stale":true}',
    'flow:auth:demo-user': 'keep-target-private',
  });
  restoreFlowMeLocalBackup(target, backup);
  Object.entries(entries).forEach(([key, value]) => {
    assert.equal(target.getItem(key), value);
  });
  assert.equal(target.getItem('flow:auth:demo-user'), 'keep-target-private');
});
