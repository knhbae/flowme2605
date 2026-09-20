import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_P1_CONTRACT,
  PERSONAL_WORKSPACE_POC_P1_DECISION_IDS,
  PERSONAL_WORKSPACE_POC_P1_EXPANSION_IDS,
  PERSONAL_WORKSPACE_POC_P1_REQUIRED_FEATURE_IDS,
} from './personal-workspace-poc-p1-contract';

test('P1 contract accounts for every approved feature, decision, and expansion id once', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_P1_REQUIRED_FEATURE_IDS.length, 8);
  assert.equal(PERSONAL_WORKSPACE_POC_P1_DECISION_IDS.length, 8);
  assert.equal(PERSONAL_WORKSPACE_POC_P1_EXPANSION_IDS.length, 4);
  const all = [
    ...PERSONAL_WORKSPACE_POC_P1_REQUIRED_FEATURE_IDS,
    ...PERSONAL_WORKSPACE_POC_P1_DECISION_IDS,
    ...PERSONAL_WORKSPACE_POC_P1_EXPANSION_IDS,
  ];
  assert.equal(new Set(all).size, 20);
});
test('P1 defaults keep Production and operating writers outside the PoC', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_P1_CONTRACT.scope, 'isolated-functional-poc');
  assert.equal(
    PERSONAL_WORKSPACE_POC_P1_CONTRACT.shell.productionNavigation,
    'preserve-existing-platform-nav',
  );
  assert.equal(
    PERSONAL_WORKSPACE_POC_P1_CONTRACT.ownership.successfulAuthoringDestination,
    'personal-flow',
  );
  assert.equal(PERSONAL_WORKSPACE_POC_P1_CONTRACT.ownership.creatorDraft, 'not-opened');
  assert.equal(PERSONAL_WORKSPACE_POC_P1_CONTRACT.safety.operatingWriterCalls, 0);
  assert.equal(PERSONAL_WORKSPACE_POC_P1_CONTRACT.safety.localStorageClearCalls, 0);
  assert.match(
    PERSONAL_WORKSPACE_POC_P1_CONTRACT.safety.durableWriteNamespace,
    /^flow:poc:personal-workspace:v1:/u,
  );
});

test('near-miss correction stays explicit and ordinary text remains the default', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_P1_CONTRACT.authoring.ordinaryTextDefault, true);
  assert.equal(PERSONAL_WORKSPACE_POC_P1_CONTRACT.authoring.automaticNearMissCorrection, false);
  assert.equal(
    PERSONAL_WORKSPACE_POC_P1_CONTRACT.authoring.recursiveStructureDraft,
    'not-adopted-as-canonical',
  );
});
