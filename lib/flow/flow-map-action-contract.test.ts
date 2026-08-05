import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FLOW_ACTION_OWNERSHIP_MATRIX,
  assertSingleFlowActionOwner,
} from './effective-flow-contract';
import { P0_FLOW_MAP_CONTRACT_FIXTURES } from './effective-flow-contract.fixtures';
import {
  buildEffectiveFlowMapPersistenceSelection,
  buildEffectiveFlowMapSnapshot,
  buildFlowMapActionContractFromSnapshot,
  buildFlowMapCanonicalItemId,
  reviseEffectiveFlowMapSnapshot,
} from './effective-flow-map-snapshot';
import {
  buildFlowMapActionContract,
  buildFlowMapRecoveryContract,
  type BuildFlowMapActionContractInput,
} from './flow-map-action-contract';
import { buildSourceBackedFlowMapPublishPackage } from './source-backed-my-flow';

const baseInput: BuildFlowMapActionContractInput = {
  mapId: 'middle-school-math-1',
  title: '중1 수학 진도',
  sourceUrl: 'https://example.com/math-source',
  surface: 'public_preview',
  saveMode: 'save_all',
  executionState: 'executable',
  editable: true,
  exportable: false,
  selection: { selectedCount: 3, totalCount: 3 },
  riskLevels: ['low'],
};

test('save-all map keeps controller selection while exposing one save intent and an editable branch', () => {
  const contract = buildFlowMapActionContract(baseInput);

  assert.deepEqual(contract.controller, {
    kind: 'preserve_source_backed_map_controller',
    surface: 'public_preview',
    saveMode: 'save_all',
    executionState: 'executable',
    selection: { selectedCount: 3, totalCount: 3 },
  });
  assert.equal(contract.actions.primary?.intent, 'save_all');
  assert.equal(contract.actions.primary?.label, '전체 저장하고 시작');
  assert.equal(contract.actions.edit?.intent, 'open_editor');
  assert.equal(contract.actions.export, undefined);
  assert.equal(contract.capabilities.save, true);
  assert.equal(contract.capabilities.edit, true);
});

test('partial and empty selections preserve save-all semantics without creating a different controller', () => {
  const partial = buildFlowMapActionContract({
    ...baseInput,
    selection: { selectedCount: 2, totalCount: 3 },
  });
  const empty = buildFlowMapActionContract({
    ...baseInput,
    selection: { selectedCount: 0, totalCount: 3 },
  });

  assert.equal(partial.actions.primary?.label, '선택한 2개로 시작');
  assert.equal(partial.actions.primary?.disabled, false);
  assert.equal(empty.actions.primary?.intent, 'save_all');
  assert.equal(empty.actions.primary?.disabled, true);
  assert.equal(empty.capabilities.save, false);
});

test('public choose-child maps keep child selection as the only adjustment instead of exposing a map editor', () => {
  const contract = buildFlowMapActionContract({
    ...baseInput,
    saveMode: 'choose_child',
    editable: true,
    selection: undefined,
  });

  assert.equal(contract.controller.saveMode, 'choose_child');
  assert.equal(contract.actions.primary?.intent, 'choose_child');
  assert.equal(contract.capabilities.chooseChild, true);
  assert.equal(contract.actions.edit, undefined);
  assert.equal(contract.capabilities.edit, false);
});

test('review holds expose the direct identity source but no save, edit, export, or continuation action', () => {
  const contract = buildFlowMapActionContract({
    ...baseInput,
    executionState: 'review_hold',
    editable: true,
    exportable: true,
  });

  assert.deepEqual(contract.identity.source, {
    id: 'open-source',
    intent: 'open_source',
    label: '원문 보기',
    role: 'source',
    disabled: false,
    href: 'https://example.com/math-source',
  });
  assert.equal(contract.actions.primary, undefined);
  assert.equal(contract.actions.edit, undefined);
  assert.equal(contract.actions.export, undefined);
  assert.equal(contract.capabilities.openSource, true);
  assert.equal(contract.capabilities.save, false);
});

test('only sensitive risk levels produce an action-adjacent caution', () => {
  const standard = buildFlowMapActionContract({
    ...baseInput,
    riskLevels: ['low', 'medium'],
    highRiskCaution: '표시되면 안 되는 문구',
  });
  const medical = buildFlowMapActionContract({
    ...baseInput,
    riskLevels: ['medical_sensitive'],
    highRiskCaution: '실행 전 공식 일정과 의료기관 안내를 확인하세요.',
  });
  const held = buildFlowMapActionContract({
    ...baseInput,
    executionState: 'review_hold',
    riskLevels: ['financial_sensitive'],
  });

  assert.equal(standard.risk.level, 'standard');
  assert.equal(standard.risk.caution, undefined);
  assert.deepEqual(medical.risk.caution, {
    text: '실행 전 공식 일정과 의료기관 안내를 확인하세요.',
    placement: 'action_adjacent',
    adjacentToActionId: 'save-map',
  });
  assert.equal(held.risk.caution?.adjacentToActionId, 'open-source');
});

test('recovery appears only for a saved-copy choice or an actual personal update conflict', () => {
  const ordinaryUpdate = buildFlowMapActionContract({
    ...baseInput,
    surface: 'saved_workspace',
    savedMapId: baseInput.mapId,
    canonicalCopyStatus: 'resolved',
    personalConflictCount: 0,
  });
  const needsChoice = buildFlowMapActionContract({
    ...baseInput,
    surface: 'saved_workspace',
    savedMapId: baseInput.mapId,
    canonicalCopyStatus: 'needs_choice',
    personalConflictCount: 0,
  });
  const conflict = buildFlowMapActionContract({
    ...baseInput,
    surface: 'saved_workspace',
    savedMapId: baseInput.mapId,
    canonicalCopyStatus: 'single',
    personalConflictCount: 2,
  });

  assert.deepEqual(ordinaryUpdate.recovery, { required: false, reasons: [], actions: [] });
  assert.equal(needsChoice.recovery.actions[0]?.intent, 'resolve_saved_copy');
  assert.deepEqual(needsChoice.recovery.reasons, ['canonical_copy_needs_choice']);
  assert.equal(conflict.recovery.actions[0]?.intent, 'review_personal_conflict');
  assert.deepEqual(conflict.recovery.reasons, ['personal_update_conflict']);
});

test('public surfaces never leak saved-workspace recovery actions', () => {
  const contract = buildFlowMapActionContract({
    ...baseInput,
    canonicalCopyStatus: 'needs_choice',
    personalConflictCount: 1,
  });

  assert.equal(contract.recovery.required, false);
  assert.equal(contract.capabilities.recover, false);
});

test('saved workspace consumers can reuse the recovery adapter without inventing a map controller', () => {
  const ordinary = buildFlowMapRecoveryContract({
    surface: 'saved_workspace',
    canonicalCopyStatus: 'resolved',
    personalConflictCount: 0,
  });
  const needsBoth = buildFlowMapRecoveryContract({
    surface: 'saved_workspace',
    canonicalCopyStatus: 'needs_choice',
    personalConflictCount: 2,
  });

  assert.equal(ordinary.required, false);
  assert.deepEqual(needsBoth.reasons, [
    'canonical_copy_needs_choice',
    'personal_update_conflict',
  ]);
  assert.deepEqual(
    needsBoth.actions.map((action) => action.intent),
    ['resolve_saved_copy', 'review_personal_conflict'],
  );
});

test('identity, selection, and conflict invariants fail before a controller can target the wrong map', () => {
  assert.throws(
    () => buildFlowMapActionContract({ ...baseInput, sourceUrl: '  ' }),
    /sourceUrl must be non-empty/,
  );
  assert.throws(
    () => buildFlowMapActionContract({ ...baseInput, savedMapId: 'different-map' }),
    /savedMapId must match mapId/,
  );
  assert.throws(
    () => buildFlowMapActionContract({ ...baseInput, selection: { selectedCount: 4, totalCount: 3 } }),
    /selectedCount <= totalCount/,
  );
  assert.throws(
    () => buildFlowMapActionContract({ ...baseInput, personalConflictCount: -1 }),
    /non-negative integer/,
  );
  assert.throws(
    () => buildFlowMapActionContract({
      ...baseInput,
      selection: { selectedCount: 2, totalCount: 3, itemIds: ['flow::one'] },
    }),
    /itemIds length must match selectedCount/,
  );
  assert.throws(
    () => buildFlowMapActionContract({
      ...baseInput,
      selection: { selectedCount: 2, totalCount: 3, itemIds: ['flow::one', 'flow::one'] },
    }),
    /itemIds must be unique/,
  );
});

test('P0 lifecycle, capability, and scope matrix has exactly one primary action owner', () => {
  assert.doesNotThrow(() => assertSingleFlowActionOwner());
  assert.throws(
    () => assertSingleFlowActionOwner([
      ...FLOW_ACTION_OWNERSHIP_MATRIX,
      {
        lifecycle: 'execution',
        capability: 'complete_item',
        scope: 'item',
        owner: 'saved_plan_detail',
        persistence: 'saved_plan',
      },
    ]),
    /Duplicate primary action owner/,
  );

  const itemCompletionOwners = FLOW_ACTION_OWNERSHIP_MATRIX.filter(
    (rule) => rule.capability === 'complete_item' && rule.scope === 'item',
  );
  assert.deepEqual(itemCompletionOwners.map((rule) => rule.owner), ['item_detail']);
  const quickOwners = FLOW_ACTION_OWNERSHIP_MATRIX.filter(
    (rule) => rule.lifecycle === 'public_quick_result',
  );
  assert.ok(quickOwners.every((rule) => rule.persistence === 'session'));
  const savedTransferOwners = FLOW_ACTION_OWNERSHIP_MATRIX.filter(
    (rule) => rule.lifecycle === 'saved_transfer',
  );
  assert.deepEqual(
    savedTransferOwners.map((rule) => rule.scope),
    ['flow', 'selected', 'item'],
  );
  assert.ok(savedTransferOwners.every(
    (rule) => rule.owner === 'saved_transfer_confirmation'
      && rule.persistence === 'persistent_receipt',
  ));
});

test('P0 Map fixtures keep save-all, choose-child, review-hold, and 7-of-8 semantics explicit', () => {
  const saveAll = P0_FLOW_MAP_CONTRACT_FIXTURES.saveAll;
  const chooseChild = P0_FLOW_MAP_CONTRACT_FIXTURES.chooseChild;
  const reviewHold = P0_FLOW_MAP_CONTRACT_FIXTURES.reviewHold;
  const sevenOfEight = P0_FLOW_MAP_CONTRACT_FIXTURES.sevenOfEight;

  assert.equal(saveAll.mode, 'save_all');
  assert.deepEqual(saveAll.previewItemIds, saveAll.savedItemIds);
  assert.equal(chooseChild.mode, 'choose_child');
  assert.deepEqual(chooseChild.previewItemIds, chooseChild.selectedItemIds);
  assert.equal(reviewHold.executionState, 'review_hold');
  assert.equal(reviewHold.savedItemIds.length, 0);
  assert.deepEqual(reviewHold.heldItemIds, reviewHold.selectedItemIds);
  assert.equal(sevenOfEight.canonicalItemIds.length, 8);
  assert.equal(sevenOfEight.expectedPreviewItemIds.length, 7);
  assert.deepEqual(sevenOfEight.expectedPreviewItemIds, sevenOfEight.savedItemIds);
  assert.notDeepEqual(sevenOfEight.legacyPreviewItemIds, sevenOfEight.savedItemIds);
});

test('P0-02 Map effective snapshot makes applied, preview, action, and persistence IDs one contract', () => {
  const publishPackage = buildSourceBackedFlowMapPublishPackage('middle-school-math-1');
  assert.ok(publishPackage);
  const sourceBefore = JSON.stringify(publishPackage);
  const initial = buildEffectiveFlowMapSnapshot({
    publishPackage,
    effectiveTitle: '중1 수학 목차 진도표',
    executionState: 'executable',
    sourceLabel: '원문 보기',
    recovery: { canonicalCopyStatus: 'needs_choice', personalConflictCount: 2 },
  });
  const expectedIds = [...P0_FLOW_MAP_CONTRACT_FIXTURES.sevenOfEight.expectedPreviewItemIds];
  const applied = reviseEffectiveFlowMapSnapshot(initial, {
    effectiveTitle: '시험 전 핵심 단원',
    selectedItemIds: [...expectedIds].reverse(),
  });
  const action = buildFlowMapActionContractFromSnapshot(applied, {
    surface: 'saved_workspace',
    editable: true,
    exportable: true,
    savedMapId: 'middle-school-math-1',
  });
  const persistence = buildEffectiveFlowMapPersistenceSelection(applied);

  assert.deepEqual(applied.itemIds.effective, expectedIds);
  assert.deepEqual(applied.rows.map((row) => row.itemId), expectedIds);
  assert.equal(applied.effectiveTitle, '시험 전 핵심 단원');
  assert.equal(applied.counts.canonical, 8);
  assert.equal(applied.counts.effective, 7);
  assert.deepEqual(action.controller.selection?.itemIds, expectedIds);
  assert.equal(action.controller.selection?.selectedCount, 7);
  assert.deepEqual(action.recovery.reasons, [
    'canonical_copy_needs_choice',
    'personal_update_conflict',
  ]);
  assert.equal(action.identity.source.href, publishPackage.public.sourceUrl);
  assert.equal(persistence.title, applied.effectiveTitle);
  assert.deepEqual(persistence.selectedItemIds, expectedIds);
  assert.deepEqual(
    persistence.includedStepIdsByFlow['source-backed-middle-school-math-1'],
    publishPackage.public.childFlows[0]?.steps.slice(0, 7).map((step) => step.id),
  );
  assert.deepEqual(
    persistence.excludedStepIdsByFlow['source-backed-middle-school-math-1'],
    publishPackage.public.childFlows[0]?.steps.slice(7).map((step) => step.id),
  );
  assert.equal(JSON.stringify(publishPackage), sourceBefore);
});

test('P0-02 Map canonical IDs distinguish duplicate raw step IDs and reject unknown selections', () => {
  const source = buildSourceBackedFlowMapPublishPackage('middle-school-math-1');
  assert.ok(source);
  const duplicate = structuredClone(source);
  const sourceFlow = duplicate.public.childFlows[0];
  const sourceStep = sourceFlow?.steps[0];
  const sourceCreatorRow = duplicate.creator.sourceRows[0];
  assert.ok(sourceFlow && sourceStep && sourceCreatorRow);
  duplicate.map.id = 'duplicate-step-id-map';
  duplicate.public.childFlows = [
    { ...sourceFlow, slug: 'child-a', steps: [{ ...sourceStep, id: 'shared-step' }] },
    { ...sourceFlow, slug: 'child-b', steps: [{ ...sourceStep, id: 'shared-step' }] },
  ];
  duplicate.creator.sourceRows = [
    { ...sourceCreatorRow, flowSlug: 'child-a', stepId: 'shared-step' },
    { ...sourceCreatorRow, flowSlug: 'child-b', stepId: 'shared-step' },
  ];
  const childAId = buildFlowMapCanonicalItemId('child-a', 'shared-step');
  const childBId = buildFlowMapCanonicalItemId('child-b', 'shared-step');
  const snapshot = buildEffectiveFlowMapSnapshot({
    publishPackage: duplicate,
    executionState: 'executable',
    selectedItemIds: [childAId],
  });

  assert.deepEqual(snapshot.itemIds.canonical, [childAId, childBId]);
  assert.deepEqual(snapshot.itemIds.effective, [childAId]);
  assert.deepEqual(snapshot.itemIds.excluded, [childBId]);
  assert.throws(
    () => reviseEffectiveFlowMapSnapshot(snapshot, { selectedItemIds: ['unknown::step'] }),
    /Unknown Flow Map item ID/,
  );
});

test('P0-02 choose-child and review-hold keep routing, held IDs, source, and risk semantics', () => {
  const choosePackage = buildSourceBackedFlowMapPublishPackage('curated-allblanc-workout-park');
  const holdPackage = buildSourceBackedFlowMapPublishPackage('baby-food-map');
  assert.ok(choosePackage && holdPackage);
  const firstChoice = buildFlowMapCanonicalItemId(
    choosePackage.public.childFlows[0]!.slug,
    choosePackage.public.childFlows[0]!.steps[0]!.id,
  );
  const chooseSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage: choosePackage,
    executionState: 'executable',
    selectedItemIds: [firstChoice],
  });
  const chooseAction = buildFlowMapActionContractFromSnapshot(chooseSnapshot, {
    surface: 'public_preview',
    editable: true,
  });
  assert.equal(chooseSnapshot.controller.saveMode, 'choose_child');
  assert.equal(chooseAction.actions.primary?.intent, 'choose_child');
  assert.equal(chooseAction.actions.edit, undefined);
  assert.throws(
    () => buildEffectiveFlowMapPersistenceSelection(chooseSnapshot),
    /must save through its selected child Flow/,
  );

  const holdSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage: holdPackage,
    executionState: 'review_hold',
    sourceLabel: '참고 식단표 원문',
  });
  const holdAction = buildFlowMapActionContractFromSnapshot(holdSnapshot, {
    surface: 'public_preview',
    editable: false,
  });
  assert.equal(holdSnapshot.rows.length, 0);
  assert.deepEqual(holdSnapshot.itemIds.held, holdSnapshot.itemIds.requested);
  assert.equal(holdAction.actions.primary, undefined);
  assert.equal(holdAction.actions.edit, undefined);
  assert.equal(holdAction.identity.source.href, holdPackage.public.sourceUrl);
  assert.equal(holdAction.identity.source.label, '참고 식단표 원문');
  assert.ok(holdAction.risk.riskLevels.length > 0);
});
