import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('./AppClient.tsx', import.meta.url), 'utf8');
const sourceFile = ts.createSourceFile(
  'AppClient.tsx',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function getInitializerText(name: string): string {
  let match: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name && node.body) {
      match = node.body;
      return;
    }
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === name
      && node.initializer
    ) {
      match = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  assert.ok(match, `Expected ${name} in AppClient.tsx`);
  return match.getText(sourceFile);
}

test('My Flow composite and execution mutations use the shared user-data write lock', () => {
  const handlers = [
    'undoMyFlowSave',
    'applyMyFlowRoutineRuleEditorDraft',
    'updateMyFlowArchiveState',
    'chooseCanonicalSavedCopy',
    'saveMyFlowEditingDraft',
    'toggleMyFlowStepItemCheck',
    'setPersonalDraftOccurrenceExecutionState',
    'toggleSavedFlowItem',
    'undoMyFlowCompletion',
    'completeSavedFlow',
    'saveMyFlowCompletionReflection',
    'saveMyFlowSourceCorrectionDraft',
    'startMyFlowReuse',
    'removeSavedFlow',
    'retryMyFlowReceiptCleanup',
    'mutateMyFlowStructuralOverlay',
    'applyMyFlowBatchDateAdjustment',
    'persistMyFlowSourceBackedIncludedSteps',
    'persistMyFlowCanonicalIncludedItemStates',
    'undoMyFlowBatchAdjustment',
    'saveCurrentMyFlowExecutionNote',
    'saveMyFlowDraftSettings',
    'saveMyFlowPersonalCopySettings',
    'saveMyFlowDirectAnchorSettings',
  ];

  handlers.forEach((name) => {
    assert.match(
      getInitializerText(name),
      /withFlowUserDataWriteLock/u,
      `${name} must acquire the shared write lock`,
    );
  });
});

test('reuse fails closed when the rendered Map or dependent execution state is stale', () => {
  const body = getInitializerText('startMyFlowReuse');

  assert.doesNotMatch(body, /\?\?\s*flow\.savedMap/u);
  assert.match(body, /!storedMap/u);
  assert.match(body, /JSON\.stringify\(storedMap\)\s*!==\s*JSON\.stringify\(flow\.savedMap\)/u);
  assert.match(body, /getStoredMyFlowDateOverrides\(\)/u);
  assert.match(body, /getStoredMyFlowItemDrafts\(\)/u);
  assert.match(body, /mergeSourceBackedMyFlowBundles\(storedBundles\)/u);
  assert.match(body, /getActiveFlowProgress\(resolvedBundles\)/u);
  assert.match(body, /normalizeMyFlowMutationProjectionValues/u);
  assert.match(body, /getFlowOccurrenceExecutionRecords/u);
  assert.match(body, /getMyFlowStructuralOverlayMutationIdentity/u);
  assert.match(body, /refreshSavedFlowState\(\)/u);
  const mapOnlyGuard = body.indexOf('if (flow.savedMap) {');
  assert.ok(mapOnlyGuard > 0);
  assert.ok(body.indexOf('JSON.stringify(currentEffectiveBundle)') < mapOnlyGuard);
  assert.ok(body.indexOf('JSON.stringify(getChecks(flow.progress.slug))') < mapOnlyGuard);
  assert.ok(body.indexOf('JSON.stringify(getItemStates(flow.progress.slug))') < mapOnlyGuard);
});

test('reuse completes, reviews, and starts inside one raw-byte rollback transaction', () => {
  const body = getInitializerText('startMyFlowReuse');

  assert.match(body, /buildFlowRunReuseStorageKeyPlan/u);
  assert.match(body, /runFlowRunReuseStorageTransaction/u);
  assert.match(body, /completeActiveFlowRun[\s\S]*transactionStorage/u);
  assert.match(body, /transactionStorage\.setItem\([\s\S]*getSourceBackedFlowMapSnapshotStorageKey/u);
  assert.match(body, /transactionStorage\.setItem\([\s\S]*getSourceBackedFlowMapPersistenceStorageKey/u);
  assert.match(body, /startFlowRunFromCompleted[\s\S]*transactionStorage/u);
  assert.match(body, /reuseTransaction\.rollbackComplete/u);
  assert.doesNotMatch(body, /window\.localStorage\.setItem/u);
});

test('delete cleanup stays in its outer lock and does not reacquire the receipt lock', () => {
  const deleteBody = getInitializerText('removeSavedFlow');
  const retryBody = getInitializerText('retryMyFlowReceiptCleanup');

  assert.match(deleteBody, /removeFlowExportReceiptsForSavedPlan\(/u);
  assert.match(retryBody, /removeFlowExportReceiptsForSavedPlan\(/u);
  assert.doesNotMatch(deleteBody, /removeFlowExportReceiptsForSavedPlanSerialized/u);
  assert.doesNotMatch(retryBody, /removeFlowExportReceiptsForSavedPlanSerialized/u);
});

test('permanent delete uses the dialog-open inventory and one owned raw deletion transaction', () => {
  const openBody = getInitializerText('openMyFlowPermanentDeleteDialog');
  const deleteBody = getInitializerText('removeSavedFlow');

  assert.match(openBody, /inspectPermanentSavedFlowDeletion/u);
  assert.match(openBody, /expectedDeletionInspection/u);
  assert.match(deleteBody, /runPermanentSavedFlowDeletionTransaction/u);
  assert.match(deleteBody, /deleteDialog\.expectedDeletionInspection/u);
  assert.match(deleteBody, /!deletion\.transaction\.rollbackComplete/u);
  assert.match(deleteBody, /preparePermanentSavedFlowDeletionRecoveryJournal/u);
  assert.match(deleteBody, /confirmPermanentSavedFlowDeletionRecoveryJournal/u);
  assert.match(deleteBody, /markFlowExportReceiptCleanupRequired/u);
  assert.match(deleteBody, /kind:\s*'recovery_required'/u);
  assert.doesNotMatch(deleteBody, /permanentlyDeleteSavedFlow\(/u);
  assert.doesNotMatch(deleteBody, /persist\(getBundles\(\)\)/u);
  assert.ok(
    deleteBody.indexOf('preparePermanentSavedFlowDeletionRecoveryJournal')
      < deleteBody.indexOf('runPermanentSavedFlowDeletionTransaction'),
    'the durable recovery journal must be prepared before raw deletion starts',
  );
  assert.ok(
    deleteBody.indexOf('confirmPermanentSavedFlowDeletionRecoveryJournal')
      < deleteBody.indexOf('markFlowExportReceiptCleanupRequired'),
    'raw deletion must be durably confirmed before receipt cleanup becomes eligible',
  );
  const incompleteRollbackStart = deleteBody.indexOf("deletion.reason === 'transaction_failed'");
  const completeRollbackCleanupStart = deleteBody.indexOf(
    'const cleared = clearFlowExportReceiptCleanupJournal',
    incompleteRollbackStart,
  );
  assert.ok(incompleteRollbackStart >= 0 && completeRollbackCleanupStart > incompleteRollbackStart);
  assert.doesNotMatch(
    deleteBody.slice(incompleteRollbackStart, completeRollbackCleanupStart),
    /markFlowExportReceiptCleanupRequired/u,
  );
});

test('reload and retry never promote receipt cleanup without a confirmed deletion recovery journal', () => {
  const recoveryEffectStart = source.indexOf(
    'let cleanupRead: ReturnType<typeof readFlowExportReceiptCleanupJournal>',
  );
  const recoveryEffectEnd = source.indexOf(
    '}, [myFlowBundles, myFlowSavedTransferEnabled]);',
    recoveryEffectStart,
  );
  assert.ok(recoveryEffectStart >= 0 && recoveryEffectEnd > recoveryEffectStart);
  const recoveryEffect = source.slice(recoveryEffectStart, recoveryEffectEnd);
  assert.match(recoveryEffect, /readPermanentSavedFlowDeletionRecoveryJournal/u);
  assert.match(recoveryEffect, /isPermanentSavedFlowDeletionConfirmedForPlan/u);
  assert.ok(
    recoveryEffect.indexOf('isPermanentSavedFlowDeletionConfirmedForPlan')
      < recoveryEffect.indexOf('markFlowExportReceiptCleanupRequired'),
  );
  assert.doesNotMatch(recoveryEffect, /readSavedPlanExists/u);

  const retryBody = getInitializerText('retryMyFlowReceiptCleanup');
  assert.match(retryBody, /readPermanentSavedFlowDeletionRecoveryJournal/u);
  assert.match(retryBody, /isPermanentSavedFlowDeletionConfirmedForPlan/u);
  assert.ok(
    retryBody.indexOf('isPermanentSavedFlowDeletionConfirmedForPlan')
      < retryBody.indexOf('markFlowExportReceiptCleanupRequired'),
  );
  assert.ok(
    retryBody.indexOf('isPermanentSavedFlowDeletionConfirmedForPlan')
      < retryBody.indexOf('removeFlowExportReceiptsForSavedPlan'),
  );
  assert.doesNotMatch(retryBody, /getActiveFlowProgress\(getBundles\(\)\)/u);
  assert.match(source, /data-testid="my-flow-permanent-delete-recovery-required"/u);
});

test('batch undo validates fresh state and restores all composite values in one raw transaction', () => {
  const body = getInitializerText('undoMyFlowBatchAdjustment');

  assert.match(body, /getLockedMyFlowExecutionContext/u);
  assert.match(body, /expectedDateOverrides/u);
  assert.match(body, /expectedItemStates/u);
  assert.match(body, /expectedStructuralOverlay/u);
  assert.match(body, /expectedSavedMapSnapshot/u);
  assert.match(body, /expectedPersistenceRecord/u);
  assert.match(body, /normalizeMyFlowMutationProjectionValues/u);
  assert.match(body, /getMyFlowStructuralOverlayMutationIdentity/u);
  assert.match(body, /captureFlowUserDataMutationExpectedRaw/u);
  assert.match(body, /runFlowUserDataMutationTransaction/u);
  assert.match(body, /MY_FLOW_DATE_OVERRIDES_STORAGE_KEY/u);
  assert.match(body, /itemStateKeysBySlug/u);
  assert.match(body, /savePersonalStructuralOverlay\(storage/u);
  assert.match(body, /mapSnapshotKeysById/u);
  assert.match(body, /mapPersistenceKeysById/u);
  assert.doesNotMatch(body, /saveStoredMyFlowDateOverrides\(/u);
  assert.doesNotMatch(body, /window\.localStorage\.setItem/u);
});

test('personal-copy step overlays use fresh persistence and one owned Map-pair transaction', () => {
  const body = getInitializerText('saveMyFlowPersonalCopyStepOverlayWithinWriteLock');

  assert.match(body, /currentFlow\.savedMap/u);
  assert.match(body, /baselineRecord:\s*currentFlow\.mapPersistence/u);
  assert.match(body, /runFlowUserDataMutationTransaction/u);
  assert.match(body, /mapSnapshotKeysById/u);
  assert.match(body, /mapPersistenceKeysById/u);
  assert.doesNotMatch(body, /savedFlowMapPersistenceById/u);
  assert.doesNotMatch(body, /window\.localStorage\.setItem/u);
});

test('settings, batch date, and direct anchor saves validate their open fingerprint before transactions', () => {
  const handlers = [
    'applyMyFlowBatchDateAdjustment',
    'persistMyFlowSourceBackedIncludedSteps',
    'persistMyFlowCanonicalIncludedItemStates',
    'saveMyFlowDraftSettings',
    'saveMyFlowPersonalCopySettings',
    'saveMyFlowDirectAnchorSettings',
  ];

  handlers.forEach((name) => {
    const body = getInitializerText(name);
    assert.match(body, /getLockedMyFlowExecutionContext/u, `${name} must re-read fresh flow identity`);
    assert.match(body, /runFlowUserDataMutationTransaction/u, `${name} must commit atomically`);
  });
});

test('repeated batch date writes preserve the validated rendered override identity', () => {
  const body = getInitializerText('applyMyFlowBatchDateAdjustment');

  assert.match(body, /const renderedDateOverrideKeyBySelectionKey = new Map/u);
  assert.match(body, /row\.effectiveDateOverrideKey \?\? row\.calendarKey/u);
  assert.match(body, /getLockedMyFlowExecutionContext\([\s\S]*batchAdjustment\.expectedFlowFingerprint/u);
  assert.match(body, /renderedDateOverrideKeyBySelectionKey\.get\(selectionKey\)/u);
  assert.match(body, /expectedFlowFingerprint:\s*nextFlowFingerprint/u);
});

test('fresh mutation row identity excludes display-only effective date metadata', () => {
  const body = getInitializerText('getMyFlowRowMutationIdentity');

  assert.match(body, /stableId/u);
  assert.match(body, /checkIds/u);
  assert.doesNotMatch(body, /effectiveDateOverrideKey/u);
  assert.doesNotMatch(body, /date:\s*row\.date/u);
});

test('fresh mutation overlay identity excludes the generated update timestamp', () => {
  const body = getInitializerText('getMyFlowStructuralOverlayMutationIdentity');

  assert.match(body, /updatedAt:\s*_displayOnlyUpdatedAt/u);
  assert.match(body, /return identity/u);
});

test('fresh mutation lookup resolves synthesized source-backed copies without persisting them', () => {
  const body = getInitializerText('getLockedMyFlowExecutionContext');

  assert.match(body, /const storedBundles = readBundles\(\)/u);
  assert.match(body, /const resolvedBundles = mergeSourceBackedMyFlowBundles\(storedBundles\)/u);
  assert.match(body, /getActiveFlowProgress\(resolvedBundles\)/u);
  assert.match(body, /resolvedBundles\.find/u);
  assert.match(body, /storedBundles,/u);
  assert.doesNotMatch(body, /const storedBundles = mergeSourceBackedMyFlowBundles/u);
});

test('URL start rejects an occupied deterministic target and commits through the raw transaction', () => {
  const body = getInitializerText('startFlowFromLookup');

  assert.match(body, /startStorageBaselineRef/u);
  assert.match(body, /collidesWithExistingCopy/u);
  assert.match(body, /runFlowUserDataMutationTransaction/u);
  assert.match(body, /mapSnapshotKeysById/u);
  assert.match(body, /mapPersistenceKeysById/u);
  assert.doesNotMatch(body, /window\.localStorage\.setItem/u);
});

test('every occurrence execution action supplies its rendered state for fail-closed CAS', () => {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'setPersonalDraftOccurrenceExecutionState'
    ) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  assert.equal(calls.length, 4);
  calls.forEach((call) => {
    assert.equal(
      call.arguments.length,
      4,
      'occurrence action must pass expected rendered state as the fourth argument',
    );
  });
});

test('URL and memo draft bundle saves merge their intent into a fresh stored bundle list', () => {
  const memoBody = getInitializerText('handleSaveMemoDraftFlow');
  const urlBody = getInitializerText('handleSaveDraftFlowFromCandidate');

  for (const body of [memoBody, urlBody]) {
    assert.match(body, /withFlowUserDataWriteLock/u);
    assert.match(body, /const storedBundles = getBundles\(\)/u);
    assert.doesNotMatch(body, /\.\.\.bundles\.filter/u);
  }
});

test('saved-editor recovery runs recovery and refresh in one shared lock acquisition', () => {
  const recoveryCall = source.indexOf('const recovery = recoverFlowEditorStorageCommit');
  assert.notEqual(recoveryCall, -1);
  const lockBeforeRecovery = source.lastIndexOf('withFlowUserDataWriteLock', recoveryCall);
  const refreshAfterRecovery = source.indexOf('refreshSavedFlowState()', recoveryCall);
  assert.ok(lockBeforeRecovery !== -1 && recoveryCall - lockBeforeRecovery < 600);
  assert.ok(refreshAfterRecovery !== -1 && refreshAfterRecovery - recoveryCall < 600);
});
