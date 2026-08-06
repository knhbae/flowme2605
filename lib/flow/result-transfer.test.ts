import assert from 'node:assert/strict';
import test from 'node:test';

import type { EffectiveFlowProjectionManifest } from './effective-flow-contract';
import {
  ResultTransferContractError,
  ResultTransferEffectError,
  buildResultTransferArtifactSuccess,
  buildResultTransferRequest,
  buildResultTransferTransportIdentity,
  createResultTransferRunner,
  fingerprintResultTransferPayload,
  isResultTransferPersistentReceipt,
  type ResultTransferRequest,
} from './result-transfer';

async function buildObservedArtifactSuccess(
  request: ResultTransferRequest,
  completedAt: string,
) {
  const transport = await buildResultTransferTransportIdentity(
    new TextEncoder().encode(request.artifact.payload),
    'preserve',
  );
  return buildResultTransferArtifactSuccess(request, completedAt, transport);
}

function buildManifest(options: Readonly<{
  snapshotKind?: EffectiveFlowProjectionManifest['snapshotKind'];
  destination?: EffectiveFlowProjectionManifest['destination'];
  scope?: EffectiveFlowProjectionManifest['scope'];
  eligibleItemIds?: string[];
  outputCount?: number;
}> = {}): EffectiveFlowProjectionManifest {
  const eligibleItemIds = options.eligibleItemIds ?? ['item-a', 'item-b'];
  const destination = options.destination ?? 'checklist';
  const artifactKind = ({
    calendar: 'calendar_ics',
    checklist: 'portable_checklist',
    sheet: 'tabular_sheet',
    memo: 'portable_memo',
  } as const)[destination];
  return {
    schemaVersion: 1,
    artifactManifestVersion: 1,
    consumer: options.snapshotKind === 'effective_authoring' ? 'public_preview' : 'saved_detail',
    snapshotKind: options.snapshotKind ?? 'effective_execution',
    snapshotVersion: 'source-v1|personal-v2|execution-v3',
    snapshotHash: 'a1b2c3d4',
    identity: {
      flowId: 'flow-id-a',
      flowSlug: 'flow-a',
      sourceVersion: 'source-v1',
      personalVersion: 'personal-v2',
      executionVersion: 'execution-v3',
    },
    destination,
    artifactKind,
    scope: options.scope ?? { kind: 'flow' },
    availability: 'available',
    canonicalItemIds: ['item-a', 'item-b', 'item-c'],
    requestedItemIds: [...eligibleItemIds],
    eligibleItemIds: [...eligibleItemIds],
    heldItemIds: ['item-held'],
    unavailableItemIds: ['item-unavailable'],
    excludedItemIds: ['item-excluded'],
    counts: {
      canonical: 3,
      requested: eligibleItemIds.length,
      eligible: eligibleItemIds.length,
      held: 1,
      unavailable: 1,
      excluded: 1,
      output: options.outputCount ?? eligibleItemIds.length,
    },
    reasonsByItemId: {
      'item-held': '날짜가 필요합니다.',
      'item-unavailable': '이 형식을 지원하지 않습니다.',
    },
    fieldRules: [],
  };
}

function buildSavedRequest(options: Readonly<{
  requestId?: string;
  savedPlanId?: string;
  destination?: EffectiveFlowProjectionManifest['destination'];
  target?: 'clipboard' | 'local_file';
  projectionOutputCount?: number;
  artifactOutputCount?: number;
}> = {}): ResultTransferRequest {
  const manifest = buildManifest({
    destination: options.destination,
    outputCount: options.projectionOutputCount,
  });
  const target = options.target ?? 'clipboard';
  return buildResultTransferRequest({
    requestId: options.requestId ?? 'request-a',
    route: 'saved_transfer',
    savedPlanId: options.savedPlanId ?? 'saved-plan-a',
    createdAt: '2026-08-04T01:00:00.000Z',
    manifest,
    artifact: {
      target,
      mediaType: manifest.destination === 'calendar' ? 'text/calendar' : 'text/plain',
      payload: '첫째\n둘째\n',
      ...(target === 'local_file' ? { filename: 'result.ics' } : {}),
      itemIds: [...manifest.eligibleItemIds],
      outputCount: options.artifactOutputCount ?? manifest.counts.output,
    },
  });
}

function buildPublicRequest(): ResultTransferRequest {
  const manifest = buildManifest({ snapshotKind: 'effective_authoring' });
  return buildResultTransferRequest({
    requestId: 'public-request-a',
    route: 'public_quick',
    createdAt: '2026-08-04T01:00:00.000Z',
    manifest,
    artifact: {
      target: 'clipboard',
      mediaType: 'text/plain;charset=utf-8',
      payload: '공개 결과\n',
      itemIds: [...manifest.eligibleItemIds],
      outputCount: manifest.counts.output,
    },
  });
}

test('immutable request freezes identity, projection/artifact counts, omissions, and payload metadata', () => {
  const manifest = buildManifest({ destination: 'calendar', outputCount: 1 });
  const request = buildResultTransferRequest({
    requestId: 'calendar-request',
    route: 'saved_transfer',
    savedPlanId: 'saved-plan-calendar',
    createdAt: '2026-08-04T01:00:00.000Z',
    manifest,
    artifact: {
      target: 'local_file',
      mediaType: 'text/calendar;charset=utf-8',
      filename: '내-계획.ics',
      payload: 'BEGIN:VCALENDAR\r\n한글\r\nEND:VCALENDAR\r\n',
      itemIds: ['item-a', 'item-b'],
      outputCount: 4,
    },
  });

  assert.equal(request.itemCount, 2);
  assert.equal(request.projectionOutputCount, 1);
  assert.equal(request.outputCount, 4);
  assert.equal(request.artifact.itemCount, 2);
  assert.equal(request.artifact.outputCount, 4);
  assert.deepEqual(request.countUnits, {
    itemCount: 'item',
    projectionOutputCount: 'projection_output',
    outputCount: 'artifact_output',
  });
  assert.ok(request.artifact.payloadByteLength > request.artifact.payload.length);
  assert.match(request.artifact.payloadHash, /^[0-9a-f]{8}$/u);
  assert.equal(
    request.artifact.payloadHash,
    fingerprintResultTransferPayload(request.artifact.payload),
  );
  assert.deepEqual(request.omitted.heldItemIds, ['item-held']);
  assert.deepEqual(
    Object.keys(request.omitted.reasonsByItemId).sort(),
    ['item-excluded', 'item-held', 'item-unavailable'],
  );
  assert.match(request.omitted.reasonsByItemId['item-excluded'] ?? '', /excluded/u);
  assert.equal(request.persistence, 'persistent_receipt');
  assert.equal(request.savedPlanId, 'saved-plan-calendar');
  assert.equal(request.oneWay, true);
  assert.equal(request.duplicateRisk, true);
  assert.equal(Object.isFrozen(request), true);
  assert.equal(Object.isFrozen(request.snapshot.identity), true);
  assert.equal(Object.isFrozen(request.itemIds), true);
  assert.equal(Object.isFrozen(request.omitted.reasonsByItemId), true);

  manifest.eligibleItemIds[0] = 'mutated';
  manifest.identity.flowSlug = 'mutated';
  assert.deepEqual(request.itemIds, ['item-a', 'item-b']);
  assert.equal(request.snapshot.identity.flowSlug, 'flow-a');
  assert.throws(() => (request.itemIds as string[]).push('item-c'), TypeError);
});

test('request builder rejects identity/count drift and illegal public scope', () => {
  const manifest = buildManifest();
  assert.throws(() => buildResultTransferRequest({
    requestId: 'bad-items',
    route: 'saved_transfer',
    savedPlanId: 'saved-plan-a',
    createdAt: '2026-08-04T01:00:00.000Z',
    manifest,
    artifact: {
      target: 'clipboard',
      mediaType: 'text/plain',
      payload: 'x',
      itemIds: ['item-b', 'item-a'],
      outputCount: 2,
    },
  }), ResultTransferContractError);
  assert.throws(() => buildResultTransferRequest({
    requestId: 'bad-count',
    route: 'saved_transfer',
    savedPlanId: 'saved-plan-a',
    createdAt: '2026-08-04T01:00:00.000Z',
    manifest,
    artifact: {
      target: 'clipboard',
      mediaType: 'text/plain',
      payload: 'x',
      itemIds: ['item-a', 'item-b'],
      outputCount: 1,
    },
  }), /output count/u);
  assert.throws(() => buildResultTransferRequest({
    requestId: 'missing-saved-plan-id',
    route: 'saved_transfer',
    createdAt: '2026-08-04T01:00:00.000Z',
    manifest,
    artifact: {
      target: 'clipboard',
      mediaType: 'text/plain',
      payload: 'x',
      itemIds: ['item-a', 'item-b'],
      outputCount: 2,
    },
  }), /savedPlanId/u);
  assert.throws(() => buildResultTransferRequest({
    requestId: 'bad-public-scope',
    route: 'public_quick',
    createdAt: '2026-08-04T01:00:00.000Z',
    manifest: buildManifest({
      snapshotKind: 'effective_authoring',
      scope: { kind: 'selected', itemIds: ['item-a'] },
    }),
    artifact: {
      target: 'clipboard',
      mediaType: 'text/plain',
      payload: 'x',
      itemIds: ['item-a', 'item-b'],
      outputCount: 2,
    },
  }), /cannot change scope/u);
});

test('request omission lineage is restricted to the requested scope with one reason per omitted Item', () => {
  const manifest = buildManifest({
    scope: { kind: 'item', itemId: 'item-excluded' },
    eligibleItemIds: [],
    outputCount: 0,
  });
  manifest.reasonsByItemId['out-of-scope'] = 'must not leak';
  const request = buildResultTransferRequest({
    requestId: 'scoped-omission',
    route: 'saved_transfer',
    savedPlanId: 'saved-plan-a',
    createdAt: '2026-08-04T01:00:00.000Z',
    manifest,
    artifact: {
      target: 'clipboard',
      mediaType: 'text/plain',
      payload: '',
      itemIds: [],
      outputCount: 0,
    },
  });

  assert.deepEqual(request.scope, { kind: 'item', itemId: 'item-excluded' });
  assert.deepEqual(request.omitted.heldItemIds, []);
  assert.deepEqual(request.omitted.unavailableItemIds, []);
  assert.deepEqual(request.omitted.excludedItemIds, ['item-excluded']);
  assert.deepEqual(Object.keys(request.omitted.reasonsByItemId), ['item-excluded']);
  assert.match(request.omitted.reasonsByItemId['item-excluded'] ?? '', /excluded/u);
});

test('transport identity hashes the exact final bytes with an explicit newline policy', async () => {
  const identity = await buildResultTransferTransportIdentity(
    new TextEncoder().encode('abc'),
    'preserve',
  );

  assert.deepEqual(identity, {
    payloadHashAlgorithm: 'sha256',
    payloadHash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    payloadByteLength: 3,
    textEncoding: 'utf-8',
    newlinePolicy: 'preserve',
  });
  assert.equal(Object.isFrozen(identity), true);
});

test('saved runner performs the artifact before writing one persistent receipt', async () => {
  const request = buildSavedRequest();
  const runner = createResultTransferRunner();
  const order: string[] = [];
  const outcome = await runner.run(request, {
    performArtifact(current) {
      order.push('artifact');
      return buildObservedArtifactSuccess(current, '2026-08-04T01:01:00.000Z');
    },
    persistReceipt(receipt) {
      order.push('receipt');
      assert.equal(isResultTransferPersistentReceipt(receipt), true);
      return { status: 'stored' };
    },
  });

  assert.deepEqual(order, ['artifact', 'receipt']);
  assert.equal(outcome.state, 'succeeded');
  if (outcome.state !== 'succeeded') return;
  assert.equal(outcome.receipt?.receiptId, request.requestId);
  assert.equal(outcome.receipt?.snapshot.hash, request.snapshot.hash);
  assert.equal(outcome.receipt?.savedPlanId, request.savedPlanId);
  assert.deepEqual(outcome.receipt?.itemIds, request.itemIds);
  assert.equal(outcome.receipt?.itemCount, request.itemCount);
  assert.equal(outcome.receipt?.projectionOutputCount, request.projectionOutputCount);
  assert.equal(outcome.receipt?.outputCount, request.outputCount);
  assert.deepEqual(outcome.receipt?.countUnits, request.countUnits);
  assert.match(outcome.receipt?.artifact.payloadHash ?? '', /^[0-9a-f]{64}$/u);
  assert.notEqual(outcome.receipt?.artifact.payloadHash, request.artifact.payloadHash);
  assert.equal(outcome.receipt?.artifact.payloadHashAlgorithm, 'sha256');
  assert.equal(outcome.receipt?.artifact.payloadByteLength, request.artifact.payloadByteLength);
  assert.equal(outcome.receipt?.artifact.textEncoding, 'utf-8');
  assert.equal(outcome.receipt?.artifact.newlinePolicy, 'preserve');
  assert.equal(outcome.receipt?.artifact.canonicalPayloadHash, request.artifact.payloadHash);
  assert.equal(
    outcome.receipt?.artifact.canonicalPayloadByteLength,
    request.artifact.payloadByteLength,
  );
  assert.deepEqual(outcome.receipt?.artifact.itemIds, request.artifact.itemIds);
  assert.equal(outcome.receipt?.artifact.itemCount, request.artifact.itemCount);
  assert.equal(outcome.receipt?.artifact.outputCount, request.artifact.outputCount);
  assert.equal(outcome.receiptWriteStatus, 'stored');
});

test('calendar receipt keeps Item, projection, and VEVENT artifact counts distinct', async () => {
  const request = buildSavedRequest({
    requestId: 'calendar-count-lineage',
    destination: 'calendar',
    target: 'local_file',
    projectionOutputCount: 1,
    artifactOutputCount: 4,
  });
  let persisted: unknown;
  const outcome = await createResultTransferRunner().run(request, {
    performArtifact: (current) => buildObservedArtifactSuccess(
      current,
      '2026-08-04T01:01:00.000Z',
    ),
    persistReceipt(receipt) {
      persisted = receipt;
      return { status: 'stored' };
    },
  });

  assert.equal(outcome.state, 'succeeded');
  if (outcome.state !== 'succeeded' || !outcome.receipt) return;
  assert.equal(outcome.receipt.itemCount, 2);
  assert.equal(outcome.receipt.projectionOutputCount, 1);
  assert.equal(outcome.receipt.outputCount, 4);
  assert.equal(outcome.receipt.artifact.outputCount, 4);
  assert.deepEqual(outcome.receipt.countUnits, {
    itemCount: 'item',
    projectionOutputCount: 'projection_output',
    outputCount: 'artifact_output',
  });
  assert.equal(persisted, outcome.receipt);
  assert.equal(isResultTransferPersistentReceipt(persisted), true);
});

test('legacy v1 receipts remain readable while partial transport lineage is rejected', async () => {
  const request = buildSavedRequest({ requestId: 'legacy-v1-receipt' });
  const outcome = await createResultTransferRunner().run(request, {
    performArtifact: (current) => buildObservedArtifactSuccess(
      current,
      '2026-08-04T01:01:00.000Z',
    ),
    persistReceipt: () => ({ status: 'stored' }),
  });
  assert.equal(outcome.state, 'succeeded');
  if (outcome.state !== 'succeeded' || !outcome.receipt) return;

  const {
    payloadHashAlgorithm: _payloadHashAlgorithm,
    textEncoding: _textEncoding,
    newlinePolicy: _newlinePolicy,
    canonicalPayloadHash: _canonicalPayloadHash,
    canonicalPayloadByteLength: _canonicalPayloadByteLength,
    ...legacyArtifact
  } = outcome.receipt.artifact;
  const legacyReceipt = {
    ...outcome.receipt,
    artifact: {
      ...legacyArtifact,
      payloadHash: request.artifact.payloadHash,
      payloadByteLength: request.artifact.payloadByteLength,
    },
  };
  assert.equal(isResultTransferPersistentReceipt(legacyReceipt), true);

  const incompleteTransportReceipt = {
    ...outcome.receipt,
    artifact: {
      ...outcome.receipt.artifact,
      canonicalPayloadHash: undefined,
    },
  };
  assert.equal(isResultTransferPersistentReceipt(incompleteTransportReceipt), false);
});

test('public quick requires handler revalidation and never invokes persistent receipt storage', async () => {
  const request = buildPublicRequest();
  const runner = createResultTransferRunner();
  let artifactCalls = 0;
  let receiptCalls = 0;
  const performArtifact = (current: ResultTransferRequest) => {
    artifactCalls += 1;
    return buildObservedArtifactSuccess(current, '2026-08-04T01:01:00.000Z');
  };

  const missingGuard = await runner.run(request, { performArtifact });
  assert.equal(missingGuard.state, 'failed');
  assert.equal(missingGuard.state === 'failed' && missingGuard.failure.code, 'guard_missing');
  assert.equal(artifactCalls, 0);

  const rejected = await runner.run(request, {
    performArtifact,
    revalidate: () => ({ allowed: false, reason: 'draft dirty' }),
  });
  assert.equal(rejected.state, 'failed');
  assert.equal(rejected.state === 'failed' && rejected.failure.code, 'guard_rejected');
  assert.equal(artifactCalls, 0);

  const changed = await runner.run(request, {
    performArtifact,
    revalidate: () => ({ allowed: true, currentSnapshotHash: 'changed' }),
  });
  assert.equal(changed.state, 'failed');
  assert.equal(changed.state === 'failed' && changed.failure.code, 'snapshot_changed');
  assert.equal(artifactCalls, 0);

  const succeeded = await runner.run(request, {
    performArtifact,
    revalidate: () => ({
      allowed: true,
      currentSnapshotHash: request.snapshot.hash,
      currentArtifactPayloadHash: request.artifact.payloadHash,
    }),
    persistReceipt: () => {
      receiptCalls += 1;
      return { status: 'stored' };
    },
  });
  assert.equal(succeeded.state, 'succeeded');
  assert.equal(succeeded.state === 'succeeded' && succeeded.confirmation.kind, 'session_only');
  if (succeeded.state !== 'succeeded' || succeeded.confirmation.kind !== 'session_only') return;
  assert.deepEqual(succeeded.confirmation.snapshot, {
    kind: request.snapshot.kind,
    version: request.snapshot.version,
    hash: request.snapshot.hash,
  });
  assert.equal(succeeded.confirmation.snapshotHash, request.snapshot.hash);
  assert.deepEqual(succeeded.confirmation.countUnits, request.countUnits);
  assert.deepEqual(succeeded.confirmation.artifact, {
    target: request.artifact.target,
    mediaType: request.artifact.mediaType,
    payloadHash: succeeded.artifact.transport.payloadHash,
    payloadByteLength: request.artifact.payloadByteLength,
    payloadHashAlgorithm: 'sha256',
    textEncoding: 'utf-8',
    newlinePolicy: 'preserve',
    canonicalPayloadHash: request.artifact.payloadHash,
    canonicalPayloadByteLength: request.artifact.payloadByteLength,
    itemIds: request.artifact.itemIds,
    itemCount: request.artifact.itemCount,
    outputCount: request.artifact.outputCount,
  });
  assert.equal(artifactCalls, 1);
  assert.equal(receiptCalls, 0);
});

test('revalidation rejects rebuilt payload drift before any artifact or receipt write', async () => {
  const request = buildPublicRequest();
  const runner = createResultTransferRunner();
  let artifactCalls = 0;
  let receiptCalls = 0;

  const outcome = await runner.run(request, {
    revalidate: () => ({
      allowed: true,
      currentSnapshotHash: request.snapshot.hash,
      currentArtifactPayloadHash: fingerprintResultTransferPayload(
        `${request.artifact.payload}\nchanged after confirmation`,
      ),
    }),
    performArtifact(current) {
      artifactCalls += 1;
      return buildObservedArtifactSuccess(current, '2026-08-04T01:01:00.000Z');
    },
    persistReceipt() {
      receiptCalls += 1;
      return { status: 'stored' };
    },
  });

  assert.equal(outcome.state, 'failed');
  assert.equal(
    outcome.state === 'failed' && outcome.failure.code,
    'artifact_payload_changed',
  );
  assert.equal(artifactCalls, 0);
  assert.equal(receiptCalls, 0);
  assert.equal(runner.isPending(request.requestId), false);
});

test('typed artifact denial records no success receipt', async () => {
  const request = buildSavedRequest();
  const runner = createResultTransferRunner();
  let receiptCalls = 0;
  const outcome = await runner.run(request, {
    performArtifact() {
      throw new ResultTransferEffectError('clipboard_denied', 'Clipboard permission was denied.');
    },
    persistReceipt: () => {
      receiptCalls += 1;
      return { status: 'stored' };
    },
  });

  assert.equal(outcome.state, 'failed');
  assert.equal(outcome.state === 'failed' && outcome.failure.code, 'clipboard_denied');
  assert.equal(receiptCalls, 0);
});

test('receipt failure becomes partial_local and receipt-only retry never regenerates artifact', async () => {
  const request = buildSavedRequest();
  const runner = createResultTransferRunner();
  let artifactCalls = 0;
  let receiptCalls = 0;
  const partial = await runner.run(request, {
    performArtifact(current) {
      artifactCalls += 1;
      return buildObservedArtifactSuccess(current, '2026-08-04T01:01:00.000Z');
    },
    persistReceipt() {
      receiptCalls += 1;
      return { status: 'failed', message: 'quota' };
    },
  });

  assert.equal(partial.state, 'partial_local');
  if (partial.state !== 'partial_local') return;
  assert.equal(partial.failure.code, 'receipt_storage_failed');
  assert.equal(partial.receiptRetryAvailable, true);
  assert.ok(partial.pendingReceipt);
  assert.equal(artifactCalls, 1);
  assert.equal(receiptCalls, 1);

  const succeeded = await runner.retryReceipt(partial, {
    persistReceipt() {
      receiptCalls += 1;
      return { status: 'stored' };
    },
  });
  assert.equal(succeeded.state, 'succeeded');
  assert.equal(artifactCalls, 1);
  assert.equal(receiptCalls, 2);
});

test('blocked receipt storage stays partial_local without offering an impossible retry', async () => {
  const request = buildSavedRequest();
  const runner = createResultTransferRunner();
  const outcome = await runner.run(request, {
    performArtifact(current) {
      return buildObservedArtifactSuccess(current, '2026-08-04T01:01:00.000Z');
    },
    persistReceipt() {
      return { status: 'blocked', message: 'unsupported registry' };
    },
  });

  assert.equal(outcome.state, 'partial_local');
  assert.equal(outcome.state === 'partial_local' && outcome.failure.code, 'receipt_storage_blocked');
  assert.equal(outcome.receiptRetryAvailable, false);
  assert.ok(outcome.state === 'partial_local' && outcome.pendingReceipt);
});

test('indeterminate receipt rollback stays partial_local without an unsafe retry', async () => {
  const request = buildSavedRequest({ requestId: 'indeterminate-receipt-rollback' });
  const outcome = await createResultTransferRunner().run(request, {
    performArtifact(current) {
      return buildObservedArtifactSuccess(current, '2026-08-04T01:01:00.000Z');
    },
    persistReceipt() {
      return {
        status: 'failed',
        message: 'receipt rollback could not be verified',
        rollbackComplete: false,
      };
    },
  });

  assert.equal(outcome.state, 'partial_local');
  assert.equal(outcome.state === 'partial_local' && outcome.failure.code, 'receipt_storage_failed');
  assert.equal(outcome.receiptRetryAvailable, false);
  assert.ok(outcome.state === 'partial_local' && outcome.pendingReceipt);
});

test('artifact parity mismatch is partial_local but cannot be papered over by a receipt retry', async () => {
  const request = buildSavedRequest();
  const runner = createResultTransferRunner();
  let receiptCalls = 0;
  const outcome = await runner.run(request, {
    async performArtifact(current) {
      return {
        ...await buildObservedArtifactSuccess(current, '2026-08-04T01:01:00.000Z'),
        outputCount: current.outputCount + 1,
      };
    },
    persistReceipt: () => {
      receiptCalls += 1;
      return { status: 'stored' };
    },
  });

  assert.equal(outcome.state, 'partial_local');
  assert.equal(outcome.state === 'partial_local' && outcome.failure.code, 'artifact_result_mismatch');
  assert.equal(outcome.receiptRetryAvailable, false);
  assert.equal(outcome.state === 'partial_local' && outcome.pendingReceipt, undefined);
  assert.equal(receiptCalls, 0);
});

test('runner rejects a fabricated transport hash or byte length before writing a receipt', async () => {
  const request = buildSavedRequest({ requestId: 'fabricated-transport-identity' });
  const actualTransport = await buildResultTransferTransportIdentity(
    new TextEncoder().encode(request.artifact.payload),
    'preserve',
  );
  const fabricatedTransports = [
    { ...actualTransport, payloadHash: '0'.repeat(64) },
    { ...actualTransport, payloadByteLength: actualTransport.payloadByteLength + 1 },
  ];

  for (const transport of fabricatedTransports) {
    let receiptCalls = 0;
    const outcome = await createResultTransferRunner().run(request, {
      performArtifact(current) {
        return buildResultTransferArtifactSuccess(
          current,
          '2026-08-04T01:01:00.000Z',
          transport,
        );
      },
      persistReceipt: () => {
        receiptCalls += 1;
        return { status: 'stored' };
      },
    });

    assert.equal(outcome.state, 'partial_local');
    assert.equal(outcome.state === 'partial_local' && outcome.failure.code, 'artifact_result_mismatch');
    assert.equal(outcome.receiptRetryAvailable, false);
    assert.equal(outcome.state === 'partial_local' && outcome.pendingReceipt, undefined);
    assert.equal(receiptCalls, 0);
  }
});

test('runner rejects a concurrent duplicate request while the first local effect is pending', async () => {
  const request = buildSavedRequest();
  const runner = createResultTransferRunner();
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = runner.run(request, {
    async performArtifact(current) {
      await gate;
      return buildObservedArtifactSuccess(current, '2026-08-04T01:01:00.000Z');
    },
    persistReceipt: () => ({ status: 'stored' }),
  });
  await Promise.resolve();
  assert.equal(runner.isPending(request.requestId), true);

  const duplicate = await runner.run(request, {
    performArtifact(current) {
      return buildObservedArtifactSuccess(current, '2026-08-04T01:01:00.000Z');
    },
    persistReceipt: () => ({ status: 'stored' }),
  });
  assert.equal(duplicate.state, 'failed');
  assert.equal(duplicate.state === 'failed' && duplicate.failure.code, 'already_pending');

  release?.();
  assert.equal((await first).state, 'succeeded');
  assert.equal(runner.isPending(request.requestId), false);
});

test('pre-effect cancellation creates neither artifact nor receipt', async () => {
  const request = buildSavedRequest();
  const runner = createResultTransferRunner();
  const controller = new AbortController();
  controller.abort();
  let artifactCalls = 0;
  let receiptCalls = 0;
  const outcome = await runner.run(request, {
    signal: controller.signal,
    performArtifact(current) {
      artifactCalls += 1;
      return buildObservedArtifactSuccess(current, '2026-08-04T01:01:00.000Z');
    },
    persistReceipt: () => {
      receiptCalls += 1;
      return { status: 'stored' };
    },
  });
  assert.equal(outcome.state, 'cancelled');
  assert.equal(artifactCalls, 0);
  assert.equal(receiptCalls, 0);
});
