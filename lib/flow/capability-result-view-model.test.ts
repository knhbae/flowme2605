import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FLOW_RESULT_ACTION_HIERARCHY,
  buildFlowCapabilityResultViewModel,
  evaluatePublicQuickResultEligibility,
} from './capability-result-view-model';
import {
  P0_CONTRACT_FLOW_BUNDLE,
  P0_CONTRACT_FLOW_ITEM_IDS,
  P0_ROLE_RICH_FLOW_BUNDLE,
  P0_ROLE_RICH_ITEM_IDS,
} from './effective-flow-contract.fixtures';
import { buildEffectiveFlowSnapshot } from './effective-flow-snapshot';
import { resolvePublicDateIntent } from './public-date-intent';

function buildContractSnapshot(options: {
  mode: 'custom' | 'undated';
  itemDates?: Record<string, string>;
} = { mode: 'custom' }) {
  return buildEffectiveFlowSnapshot({
    bundle: P0_CONTRACT_FLOW_BUNDLE,
    effectiveTitle: P0_CONTRACT_FLOW_BUNDLE.flow.title,
    dateIntent: resolvePublicDateIntent({
      anchorType: P0_CONTRACT_FLOW_BUNDLE.flow.anchor_type,
      mode: options.mode,
      customAnchor: options.mode === 'custom' ? '2030-09-01' : '',
      exampleAnchor: '',
    }),
    publicItemPersonalizations: Object.fromEntries(
      Object.entries(options.itemDates ?? {}).map(([itemId, date]) => [itemId, { date }]),
    ),
  });
}

test('dated result exposes one manifest-backed primary and at most two immediate available results', () => {
  const snapshot = buildContractSnapshot();
  const model = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'public_preview',
  });

  assert.equal(model.primary?.destination, 'calendar');
  assert.equal(model.primary?.role, 'primary');
  assert.equal(model.primary?.availability, 'available');
  assert.deepEqual(model.primary?.manifest.eligibleItemIds, [...P0_CONTRACT_FLOW_ITEM_IDS]);
  assert.deepEqual(model.primary?.rows.map((row) => row.id), [...P0_CONTRACT_FLOW_ITEM_IDS]);
  assert.equal(model.primary?.outputCount, 3);
  assert.ok(model.available.length <= 2);
  assert.equal(model.all.length, 4);
  assert.equal(model.snapshotKind, 'effective_authoring');
  assert.equal(model.primary?.manifest.snapshotKind, model.snapshotKind);
  assert.ok(model.primary?.manifest.snapshotHash);
});

test('undated Calendar is conditional instead of a zero-output primary or fake result', () => {
  const snapshot = buildContractSnapshot({ mode: 'undated' });
  const model = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'public_preview',
  });
  const calendar = model.conditional.find((candidate) => candidate.destination === 'calendar');

  assert.notEqual(model.primary?.destination, 'calendar');
  assert.ok(model.primary && model.primary.outputCount > 0);
  assert.equal(calendar?.outputCount, 0);
  assert.equal(calendar?.expectedOutputCount, 3);
  assert.equal(calendar?.conditionAction, 'edit_schedule');
  assert.match(calendar?.conditionLabel ?? '', /날짜를 정하면 최대 3개/u);
  assert.deepEqual(calendar?.manifest.heldItemIds, [...P0_CONTRACT_FLOW_ITEM_IDS]);
  assert.ok(snapshot.committed.rows.every((row) => row.schedule.date === undefined));
});

test('mixed Calendar remains an honest partial primary with eligible and held identities', () => {
  const snapshot = buildContractSnapshot({
    mode: 'undated',
    itemDates: { 'p0-contract-item-a': '2030-09-05' },
  });
  const model = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'public_preview',
    preferredDestination: 'calendar',
  });

  assert.equal(model.primary?.destination, 'calendar');
  assert.equal(model.primary?.availability, 'conditional');
  assert.equal(model.primary?.outputCount, 1);
  assert.equal(model.primary?.expectedOutputCount, 3);
  assert.deepEqual(model.primary?.manifest.eligibleItemIds, ['p0-contract-item-a']);
  assert.deepEqual(model.primary?.manifest.heldItemIds, [
    'p0-contract-item-b',
    'p0-contract-item-c',
  ]);
  assert.deepEqual(model.primary?.rows.map((row) => row.id), ['p0-contract-item-a']);
});

test('completion criterion and memo remain on the same preview row and manifest identity', () => {
  const snapshot = buildEffectiveFlowSnapshot({
    bundle: P0_CONTRACT_FLOW_BUNDLE,
    effectiveTitle: P0_CONTRACT_FLOW_BUNDLE.flow.title,
    dateIntent: resolvePublicDateIntent({
      anchorType: P0_CONTRACT_FLOW_BUNDLE.flow.anchor_type,
      mode: 'custom',
      customAnchor: '2030-09-01',
      exampleAnchor: '',
    }),
    publicItemPersonalizations: {
      'p0-contract-item-a': { detail: '개인 메모는 완료 기준과 별도입니다.' },
    },
  });
  const model = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'public_preview',
  });
  const first = model.primary?.rows.find((row) => row.id === 'p0-contract-item-a');

  assert.equal(first?.memo, '개인 메모는 완료 기준과 별도입니다.');
  assert.equal(first?.completionCriterion, '확인 결과를 저장하고 담당자에게 공유했습니다.');
  assert.ok(model.primary?.manifest.canonicalItemIds.includes(first?.id ?? ''));
});

test('role-rich partial support keeps reasons and does not relabel unavailable rows as success', () => {
  const snapshot = buildEffectiveFlowSnapshot({
    bundle: P0_ROLE_RICH_FLOW_BUNDLE,
    effectiveTitle: P0_ROLE_RICH_FLOW_BUNDLE.flow.title,
    dateIntent: resolvePublicDateIntent({
      anchorType: P0_ROLE_RICH_FLOW_BUNDLE.flow.anchor_type,
      mode: 'custom',
      customAnchor: '2030-09-01',
      exampleAnchor: '',
    }),
  });
  const model = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'public_preview',
  });
  const checklist = model.primary;
  const memo = model.selectable.find((candidate) => candidate.destination === 'memo');

  assert.equal(checklist?.destination, 'checklist');
  assert.equal(checklist?.availability, 'conditional');
  assert.deepEqual(checklist?.manifest.unavailableItemIds, [
    'p0-rich-warning',
    'p0-rich-resource',
  ]);
  assert.deepEqual(checklist?.rows.map((row) => row.id), ['p0-rich-action']);
  assert.deepEqual(memo?.manifest.eligibleItemIds, [...P0_ROLE_RICH_ITEM_IDS]);
  assert.equal(memo?.outputCount, 3);
});

test('review hold maps to non-actionable unavailable disclosures with no primary result', () => {
  const snapshot = buildContractSnapshot();
  const model = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'public_preview',
    executionState: 'review_hold',
  });

  assert.equal(model.primary, undefined);
  assert.equal(model.selectable.length, 0);
  assert.equal(model.unavailable.length, 4);
  assert.ok(model.unavailable.every((candidate) => candidate.availability === 'held'));
  assert.ok(model.unavailable.every((candidate) => candidate.outputCount === 0));
});

test('saved result exposes execution ownership separately from edit and persistent transfer', () => {
  const snapshot = buildContractSnapshot();
  const model = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'saved_detail',
  });
  const actions = FLOW_RESULT_ACTION_HIERARCHY.saved_detail;

  assert.equal(model.snapshotKind, 'effective_execution');
  assert.equal(actions.filter((action) => action.priority === 'primary').length, 1);
  assert.equal(actions.find((action) => action.priority === 'primary')?.role, 'execute-saved-result');
  assert.deepEqual(
    actions.filter((action) => action.priority === 'secondary').map((action) => action.role),
    ['edit-saved-plan', 'transfer-to-own-tool'],
  );
  assert.equal(model.stateLabel, '옮기기 전 미리보기');
  assert.match(model.scopeLabel, /^저장한 계획 ·/u);
  assert.equal(model.receiptLabel, '');

  const legacyModel = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'saved_detail',
    q3CopyEnabled: false,
  });
  assert.equal(legacyModel.stateLabel, '저장한 Flow 결과');
  assert.match(legacyModel.scopeLabel, /^저장한 전체 Flow ·/u);
  assert.match(legacyModel.receiptLabel, /생성 후 별도로/u);
});

test('Q1 quick-local guard returns deterministic reason codes and remains independently gated', () => {
  const snapshot = buildContractSnapshot();
  const viewModel = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'public_preview',
  });
  const base = {
    featureEnabled: true,
    publicDraftDirty: false,
    viewModel,
    localOnly: true,
    requiresRemoteOrProvider: false,
    requiresPersistentReceipt: false,
    requiresHistory: false,
    payloadParity: true,
    disclosureVisible: true,
    savePathVisible: true,
  };

  const eligible = evaluatePublicQuickResultEligibility(base);
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.reasonCode, undefined);
  assert.equal(eligible.destination, viewModel.primary?.destination);
  assert.equal(eligible.manifest?.snapshotHash, viewModel.primary?.manifest.snapshotHash);

  assert.equal(evaluatePublicQuickResultEligibility({
    ...base,
    featureEnabled: false,
  }).reasonCode, 'feature_disabled');
  assert.equal(evaluatePublicQuickResultEligibility({
    ...base,
    publicDraftDirty: true,
  }).reasonCode, 'public_draft_modified');
  assert.equal(evaluatePublicQuickResultEligibility({
    ...base,
    requiresRemoteOrProvider: true,
  }).reasonCode, 'remote_or_provider_required');
  assert.equal(evaluatePublicQuickResultEligibility({
    ...base,
    requiresPersistentReceipt: true,
  }).reasonCode, 'persistent_receipt_required');
  assert.equal(evaluatePublicQuickResultEligibility({
    ...base,
    requiresHistory: true,
  }).reasonCode, 'history_required');
  assert.equal(evaluatePublicQuickResultEligibility({
    ...base,
    payloadParity: false,
  }).reasonCode, 'payload_mismatch');
  assert.equal(evaluatePublicQuickResultEligibility({
    ...base,
    disclosureVisible: false,
  }).reasonCode, 'disclosure_missing');
  assert.equal(evaluatePublicQuickResultEligibility({
    ...base,
    savePathVisible: false,
  }).reasonCode, 'save_path_missing');
});
