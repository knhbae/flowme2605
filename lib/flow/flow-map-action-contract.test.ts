import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFlowMapActionContract,
  buildFlowMapRecoveryContract,
  type BuildFlowMapActionContractInput,
} from './flow-map-action-contract';

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
});
