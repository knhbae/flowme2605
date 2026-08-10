import assert from 'node:assert/strict';
import test from 'node:test';

import type { EffectiveFlowProjectionManifest } from './effective-flow-contract';
import type { FlowExportDestination } from './export-scope';
import {
  buildSavedPlanTransferArtifact,
  buildSavedPlanTransferPreview,
  serializeSavedPlanTransferPreviewSnapshot,
  type SavedPlanTransferArtifact,
  type SavedPlanTransferInput,
} from './saved-plan-transfer-codec';
import {
  APPROVED_SAVED_PLAN_TRANSFER_REVALIDATION_REASON,
  prepareApprovedSavedPlanTransfer,
  revalidateApprovedSavedPlanTransfer,
} from './saved-plan-transfer-controller';
import {
  fingerprintResultTransferPayload,
  getResultTransferArtifactPayloadBytes,
} from './result-transfer';

const transferItems: SavedPlanTransferInput['items'] = [{
  itemId: 'item-a',
  portableInput: {
    flowTitle: '사본 1 · 이사 D-30 준비',
    stepId: 'item-a',
    stableEventIdentitySeed: 'saved-plan-a:item-a',
    stepTitle: '이사할 집 사진 남기기',
    date: '2026-08-12',
    rawMemoText: ['채광과 수납 공간을 기록합니다.', '', '- [ ] 거실 사진', '- [x] 창문 치수'].join('\n'),
    executionStatus: 'pending',
    generatedAt: '2026-08-10T00:00:00.000Z',
  },
  listRow: {
    itemId: 'item-a',
    title: '이사할 집 사진 남기기',
    date: '2026-08-12',
    scheduleState: 'all_day',
    status: 'pending',
    personalOrderRank: 0,
  },
}];

function transferInput(
  rawMemoText = transferItems[0].portableInput.rawMemoText,
): SavedPlanTransferInput {
  return {
    planTitle: '사본 1 · 이사 D-30 준비',
    generatedAt: '2026-08-10T00:00:00.000Z',
    items: [{
      ...transferItems[0],
      portableInput: {
        ...transferItems[0].portableInput,
        rawMemoText,
      },
    }],
  };
}

function manifest(
  destination: FlowExportDestination,
  snapshotHash = 'snapshot-a',
): EffectiveFlowProjectionManifest {
  const artifactKind = ({
    calendar: 'calendar_ics',
    checklist: 'portable_checklist',
    sheet: 'tabular_sheet',
    memo: 'portable_memo',
  } as const)[destination];
  return {
    schemaVersion: 1,
    artifactManifestVersion: 1,
    consumer: 'export_artifact',
    snapshotKind: 'effective_execution',
    snapshotVersion: 'source-v1|personal-v1|execution-v1',
    snapshotHash,
    identity: {
      flowId: 'flow-a',
      flowSlug: 'flow-a',
      sourceVersion: 'source-v1',
      personalVersion: 'personal-v1',
      executionVersion: 'execution-v1',
    },
    destination,
    artifactKind,
    scope: { kind: 'flow' },
    availability: 'available',
    canonicalItemIds: ['item-a'],
    requestedItemIds: ['item-a'],
    eligibleItemIds: ['item-a'],
    heldItemIds: [],
    unavailableItemIds: [],
    excludedItemIds: [],
    counts: {
      canonical: 1,
      requested: 1,
      eligible: 1,
      held: 0,
      unavailable: 0,
      excluded: 0,
      output: 1,
    },
    reasonsByItemId: {},
    fieldRules: [],
  };
}

const filenames: Record<FlowExportDestination, string> = {
  memo: 'plan.txt',
  checklist: 'plan.vtodo.ics',
  calendar: 'plan.ics',
  sheet: 'plan.xlsx',
};

test('captures the deterministic preview before artifact generation and constructs the immutable request', async () => {
  const source = transferInput();
  let itemReads = 0;
  const observedInput: SavedPlanTransferInput = {
    ...source,
    get items() {
      itemReads += 1;
      return source.items;
    },
  };
  let capturedArtifact: SavedPlanTransferArtifact | undefined;

  const prepared = await prepareApprovedSavedPlanTransfer({
    requestId: 'saved-transfer-a',
    savedPlanId: 'saved-plan-a',
    createdAt: '2026-08-11T01:02:03.000Z',
    projection: {
      manifest: manifest('memo'),
      transferInput: observedInput,
      filename: filenames.memo,
    },
  }, {
    buildArtifact: async (input, destination) => {
      assert.ok(itemReads > 0, 'preview must read the projection before artifact generation starts');
      capturedArtifact = await buildSavedPlanTransferArtifact(input, destination);
      return capturedArtifact;
    },
  });

  assert.ok(capturedArtifact);
  assert.equal(
    prepared.previewSnapshot,
    serializeSavedPlanTransferPreviewSnapshot(buildSavedPlanTransferPreview(source, 'memo')),
  );
  assert.equal(prepared.request.requestId, 'saved-transfer-a');
  assert.equal(prepared.request.savedPlanId, 'saved-plan-a');
  assert.equal(prepared.request.createdAt, '2026-08-11T01:02:03.000Z');
  assert.equal(prepared.request.persistence, 'persistent_receipt');
  assert.equal(prepared.request.format, 'memo');
  assert.deepEqual(prepared.request.itemIds, ['item-a']);
  assert.equal(prepared.request.itemCount, 1);
  assert.equal(prepared.request.outputCount, 1);
  assert.equal(prepared.request.artifact.target, 'clipboard');
  assert.equal(prepared.request.artifact.payload, capturedArtifact.payload);
  assert.equal(
    prepared.request.artifact.payloadHash,
    fingerprintResultTransferPayload(capturedArtifact.payload as string),
  );
  assert.equal(Object.isFrozen(prepared.request), true);
});

test('preserves the exact generated bytes for TXT, VTODO, VEVENT, and XLSX requests', async () => {
  const destinations: readonly FlowExportDestination[] = ['memo', 'checklist', 'calendar', 'sheet'];

  for (const destination of destinations) {
    let capturedArtifact: SavedPlanTransferArtifact | undefined;
    const prepared = await prepareApprovedSavedPlanTransfer({
      requestId: `saved-transfer-${destination}`,
      savedPlanId: 'saved-plan-a',
      createdAt: '2026-08-11T01:02:03.000Z',
      projection: {
        manifest: manifest(destination),
        transferInput: transferInput(),
        filename: filenames[destination],
      },
    }, {
      buildArtifact: async (input, requestedDestination) => {
        capturedArtifact = await buildSavedPlanTransferArtifact(input, requestedDestination);
        return capturedArtifact;
      },
    });

    assert.ok(capturedArtifact);
    const capturedBytes = typeof capturedArtifact.payload === 'string'
      ? new TextEncoder().encode(capturedArtifact.payload)
      : new Uint8Array(capturedArtifact.payload);
    assert.deepEqual(
      Array.from(getResultTransferArtifactPayloadBytes(prepared.request.artifact)),
      Array.from(capturedBytes),
      `${destination} request must own the exact artifact bytes`,
    );
    assert.equal(prepared.request.artifact.payloadByteLength, capturedBytes.byteLength);
    assert.equal(prepared.request.outputCount, capturedArtifact.outputCount);
    assert.deepEqual(prepared.request.itemIds, capturedArtifact.itemIds);
    if (destination === 'memo') {
      assert.equal(prepared.request.artifact.target, 'clipboard');
      assert.equal(prepared.request.artifact.filename, undefined);
    } else {
      assert.equal(prepared.request.artifact.target, 'local_file');
      assert.equal(prepared.request.artifact.filename, filenames[destination]);
    }
    if (destination === 'sheet') {
      assert.equal(prepared.request.artifact.payloadEncoding, 'octets');
    }
  }
});

test('allows an unchanged confirmed projection and returns the current text payload fingerprint', async () => {
  const currentManifest = manifest('checklist');
  const currentTransferInput = transferInput();
  const prepared = await prepareApprovedSavedPlanTransfer({
    requestId: 'saved-transfer-checklist',
    savedPlanId: 'saved-plan-a',
    createdAt: '2026-08-11T01:02:03.000Z',
    projection: {
      manifest: currentManifest,
      transferInput: currentTransferInput,
      filename: filenames.checklist,
    },
  });

  const decision = revalidateApprovedSavedPlanTransfer({
    request: prepared.request,
    confirmedPreviewSnapshot: prepared.previewSnapshot,
    currentManifest,
    currentTransferInput,
  });
  const currentPreview = buildSavedPlanTransferPreview(currentTransferInput, 'checklist');

  assert.deepEqual(decision, {
    allowed: true,
    currentSnapshotHash: 'snapshot-a',
    currentArtifactPayloadHash: fingerprintResultTransferPayload(
      currentPreview.body.kind === 'text' ? currentPreview.body.content : '',
    ),
    reason: APPROVED_SAVED_PLAN_TRANSFER_REVALIDATION_REASON,
  });
});

test('blocks changed snapshot, item content, IDs, or output while keeping XLSX revalidation projection-based', async () => {
  const sheetManifest = manifest('sheet');
  const originalInput = transferInput();
  const prepared = await prepareApprovedSavedPlanTransfer({
    requestId: 'saved-transfer-sheet',
    savedPlanId: 'saved-plan-a',
    createdAt: '2026-08-11T01:02:03.000Z',
    projection: {
      manifest: sheetManifest,
      transferInput: originalInput,
      filename: filenames.sheet,
    },
  });

  const unchanged = revalidateApprovedSavedPlanTransfer({
    request: prepared.request,
    confirmedPreviewSnapshot: prepared.previewSnapshot,
    currentManifest: sheetManifest,
    currentTransferInput: originalInput,
  });
  assert.equal(unchanged.allowed, true);
  assert.equal(unchanged.currentArtifactPayloadHash, undefined);

  const changedSnapshot = revalidateApprovedSavedPlanTransfer({
    request: prepared.request,
    confirmedPreviewSnapshot: prepared.previewSnapshot,
    currentManifest: manifest('sheet', 'snapshot-b'),
    currentTransferInput: originalInput,
  });
  assert.equal(changedSnapshot.allowed, false);
  assert.equal(changedSnapshot.currentSnapshotHash, 'snapshot-b');

  const changedContent = revalidateApprovedSavedPlanTransfer({
    request: prepared.request,
    confirmedPreviewSnapshot: prepared.previewSnapshot,
    currentManifest: sheetManifest,
    currentTransferInput: transferInput('다른 메모\n\n- [ ] 다른 확인'),
  });
  assert.equal(changedContent.allowed, false);

  const changedItems: SavedPlanTransferInput = {
    ...originalInput,
    items: [{
      ...originalInput.items[0],
      itemId: 'item-b',
      portableInput: {
        ...originalInput.items[0].portableInput,
        stepId: 'item-b',
        stableEventIdentitySeed: 'saved-plan-a:item-b',
      },
      listRow: { ...originalInput.items[0].listRow, itemId: 'item-b' },
    }],
  };
  const changedIds = revalidateApprovedSavedPlanTransfer({
    request: prepared.request,
    confirmedPreviewSnapshot: prepared.previewSnapshot,
    currentManifest: sheetManifest,
    currentTransferInput: changedItems,
  });
  assert.equal(changedIds.allowed, false);

  const changedOutput: SavedPlanTransferInput = { ...originalInput, items: [] };
  const changedOutputDecision = revalidateApprovedSavedPlanTransfer({
    request: prepared.request,
    confirmedPreviewSnapshot: prepared.previewSnapshot,
    currentManifest: sheetManifest,
    currentTransferInput: changedOutput,
  });
  assert.equal(changedOutputDecision.allowed, false);
});
