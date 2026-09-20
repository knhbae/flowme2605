import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT,
  PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT_ROLES,
  PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION,
  PERSONAL_WORKSPACE_POC_P3H1_ANDROID_LEGACY_EVIDENCE_VERSION,
  PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS,
  evaluatePersonalWorkspacePocP3H1AndroidEvidence,
  type PersonalWorkspacePocP3H1EvidenceEvaluationContext,
  type PersonalWorkspacePocP3H1ExecutedAndroidEvidence,
  type PersonalWorkspacePocP3H1ScenarioObservation,
} from './personal-workspace-poc-p3h1-android-evidence';

const require = createRequire(import.meta.url);
const browserEvidenceModel = require('../../docs/content-audit/2026-09-04-flowme-integrated-poc-p3h1-android-device-runner-ko-assets/model.js');

const ARTIFACT_HASH = 'A'.repeat(64);
const VALUE_HASH = 'B'.repeat(64);
const ORIGIN = 'http://192.168.0.20:4173';
const HOST_CREATED_AT = '2026-09-04T07:55:00.000Z';
const FINGERPRINT = [
  'host-20260904-001',
  ORIGIN,
  PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.sha256,
  String(PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.bytes),
  HOST_CREATED_AT,
].join('|');

function observation(id: string): PersonalWorkspacePocP3H1ScenarioObservation {
  switch (id) {
    case 'A1': return { captureMethod: 'android-pointer-location-video', holdDurationMs: 240, movementCssPx: 12, movePanelOpened: false, successfulMutationDelta: 0 };
    case 'A2': return { nativeMenuOpened: false, flowMeMovePanelOpened: true, destinationSelected: true, successfulMutationDelta: 1 };
    case 'A3': return { interruptionMethod: 'pointercancel', cancellationFeedbackShown: true, panelClosed: true, ghostClickCount: 0, successfulMutationDelta: 0 };
    case 'A4': return { overflowFolderMoveCompleted: true, inScreenNonDragOrderMoveCompleted: true, commonTransitionConfirmed: true, folderMoveMutationDelta: 1, orderMoveMutationDelta: 1, desktopKeyboardRegressionId: 'p3g-desktop-keyboard-same-sha' };
    case 'A5': return { openerLine: 2, trayOwnerLine: 2, ownerLinesEqual: true, ownerLabelsEqual: true, keyboardType: 'android-software', lastPropertyRowReachable: true, closeMutationDelta: 0, openerFocusRestored: true, applyMutationDelta: 1 };
    default: return { keyboardType: 'android-software', caretWithinVisualViewport: true, lastFieldWithinVisualViewport: true, saveCtaWithinVisualViewport: true, reloadCompleted: true, restoredLastSuccessfulStateOnly: true, unexpectedState: false };
  }
}

export function validV2Evidence(): PersonalWorkspacePocP3H1ExecutedAndroidEvidence {
  const artifactId = 'android-run-video';
  return {
    schemaVersion: 2,
    contractVersion: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION,
    runStatus: 'EXECUTED',
    runId: 'android-2026-09-04-001',
    tester: '홍길동',
    startedAt: '2026-09-04T08:00:00.000Z',
    endedAt: '2026-09-04T09:00:00.000Z',
    runBinding: {
      hostRunId: 'host-20260904-001',
      origin: ORIGIN,
      candidateSha256: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.sha256,
      candidateBytes: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.bytes,
      createdAt: HOST_CREATED_AT,
      bindingFingerprint: FINGERPRINT,
    },
    environment: {
      kind: 'actual-device', physicalDevice: true, platform: 'android', browser: 'chrome',
      deviceModel: 'Pixel 8', osVersion: 'Android 16', browserVersion: '140.0.7339.51',
      buildFingerprint: 'google/shiba/shiba:16/BP2A.250805.005/13500000:user/release-keys',
      userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.7339.51 Mobile Safari/537.36',
      browserSurface: 'standalone-chrome-tab', openedFromAddressBar: true, sameLanConfirmed: true,
      capabilities: { isSecureContext: false, visualViewport: true, virtualKeyboard: false },
      signals: { webdriver: false, maxTouchPoints: 5, pointerCoarse: true, userAgentData: { available: true, mobile: true, platform: 'Android' } },
    },
    candidate: {
      url: `${ORIGIN}/candidate`, httpStatus: 200, contentType: 'text/html; charset=utf-8',
      responseSha256: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.sha256,
      responseBytes: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.bytes,
      responseShaHeader: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.sha256,
      verifiedAt: '2026-09-04T08:01:00.000Z', verificationMethod: 'on-device-byte-hash',
    },
    scenarios: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS.map((id, index) => ({
      id, status: 'PASS',
      startedAt: `2026-09-04T08:${String(5 + index * 5).padStart(2, '0')}:00.000Z`,
      endedAt: `2026-09-04T08:${String(6 + index * 5).padStart(2, '0')}:00.000Z`,
      notes: `${id} 실제 관찰`, artifactRefs: [artifactId], bindingFingerprint: FINGERPRINT,
      observation: observation(id),
    })),
    a5ControlMapping: {
      evidenceId: 'a5-owner-control-v2', protocolControl: 'authoring-owner-plus',
      candidateControl: 'authoring-property-editor',
      candidateSelector: '[data-action="open-authoring-properties"][data-line]',
      ownerIdentityAttribute: 'data-line', decision: 'EQUIVALENT', decidedBy: 'FlowMe UX review', artifactRef: artifactId,
    },
    artifacts: [{
      id: artifactId, path: 'android/android-run.mp4', sha256: ARTIFACT_HASH, bytes: 256,
      mediaType: 'video/mp4', capturedAt: '2026-09-04T08:40:00.000Z',
      roles: [...PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT_ROLES],
      verification: { method: 'filesystem-sha256', verifiedAt: '2026-09-04T09:01:00.000Z', verifiedBy: '김검증' },
    }],
    storageBoundary: {
      bindingFingerprint: FINGERPRINT, scope: 'flow-keys-outside-poc-prefix',
      baselineCapturedAt: '2026-09-04T08:02:00.000Z', beforeReadable: true, afterReadable: true, byteParity: true,
      before: { keyCount: 1, keys: [{ key: 'flow:operating:sentinel', valueUtf8Bytes: 7, valueSha256: VALUE_HASH }] },
      after: { keyCount: 1, keys: [{ key: 'flow:operating:sentinel', valueUtf8Bytes: 7, valueSha256: VALUE_HASH }] },
      observer: {
        bindingFingerprint: FINGERPRINT, scope: 'a1-a6-post-load', setItemOutsidePrefix: 0,
        removeItemOutsidePrefix: 0, clear: 0, startedAt: '2026-09-04T08:03:00.000Z', endedAt: '2026-09-04T08:35:00.000Z',
      },
      automatedWriterRegression: {
        candidateSha256: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.sha256,
        testId: 'p3h1-http-candidate-storage-boundary', result: 'PASS', forbiddenWriteCount: 0,
      },
    },
    artifactReview: {
      status: 'REVIEWED', reviewedBy: '박검토', reviewedAt: '2026-09-04T09:05:00.000Z',
      scenarioIds: [...PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS], artifactIds: [artifactId],
    },
  };
}

function filesystemContext(evidence = validV2Evidence()): PersonalWorkspacePocP3H1EvidenceEvaluationContext {
  return {
    filesystemArtifacts: evidence.artifacts.map(({ id, path, sha256, bytes, mediaType }) => ({ id, path, sha256, bytes, mediaType })),
  };
}
function codes(input: unknown, context?: PersonalWorkspacePocP3H1EvidenceEvaluationContext): string[] {
  return evaluatePersonalWorkspacePocP3H1AndroidEvidence(input, context).errors.map((error) => error.code);
}

test('keeps absent, v2 NOT_RUN, and exact preserved v1 NOT_RUN records out of E5-D', () => {
  assert.equal(evaluatePersonalWorkspacePocP3H1AndroidEvidence(null).status, 'NOT_RUN');
  for (const record of [
    { schemaVersion: 2, contractVersion: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION, runStatus: 'NOT_RUN', reason: '실기 미실행' },
    { schemaVersion: 1, contractVersion: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_LEGACY_EVIDENCE_VERSION, runStatus: 'NOT_RUN', reason: 'legacy 보관' },
  ]) {
    const result = evaluatePersonalWorkspacePocP3H1AndroidEvidence(record);
    assert.equal(result.status, 'NOT_RUN'); assert.equal(result.promotable, false);
  }
});

test('rejects v1 EXECUTED instead of auto-promoting or migrating it', () => {
  const legacy = { ...validV2Evidence(), schemaVersion: 1, contractVersion: PERSONAL_WORKSPACE_POC_P3H1_ANDROID_LEGACY_EVIDENCE_VERSION };
  const result = evaluatePersonalWorkspacePocP3H1AndroidEvidence(legacy, filesystemContext());
  assert.equal(result.status, 'INCOMPLETE'); assert.ok(result.errors.some((error) => error.code === 'legacy-executed-evidence-rejected'));
});

test('never promotes an otherwise complete JSON record without filesystem evidence', () => {
  const result = evaluatePersonalWorkspacePocP3H1AndroidEvidence(validV2Evidence());
  assert.equal(result.status, 'INCOMPLETE'); assert.equal(result.evidenceLevel, 'NONE');
  assert.ok(result.errors.some((error) => error.code === 'artifact-filesystem-context-missing'));
});

test('promotes only complete reviewed v2 evidence with exact filesystem context', () => {
  const evidence = validV2Evidence();
  const result = evaluatePersonalWorkspacePocP3H1AndroidEvidence(evidence, filesystemContext(evidence));
  assert.deepEqual(result, {
    status: 'PASS', evidenceLevel: 'E5-D', promotable: true,
    passedScenarioIds: [...PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS],
    failedScenarioIds: [], missingScenarioIds: [], errors: [],
  });
});

test('TypeScript and browser validators agree on the canonical golden v2 record', () => {
  const evidence = validV2Evidence();
  const context = filesystemContext(evidence);
  const serverResult = evaluatePersonalWorkspacePocP3H1AndroidEvidence(evidence, context);
  const browserResult = browserEvidenceModel.evaluate(structuredClone(evidence), structuredClone(context));
  assert.equal(serverResult.status, 'PASS');
  assert.equal(browserResult.status, 'PASS');
  assert.equal(browserResult.evidenceLevel, 'E5-D');
});

test('TypeScript and browser validators agree on representative incomplete and fail boundaries', () => {
  const cases: Array<{ expected: 'INCOMPLETE' | 'FAIL'; mutate: (value: any) => void }> = [
    { expected: 'INCOMPLETE', mutate: (value) => { value.runBinding.bindingFingerprint = 'stale'; } },
    { expected: 'INCOMPLETE', mutate: (value) => { value.environment.userAgent = value.environment.userAgent.replace('Chrome/', 'HeadlessChrome/'); } },
    { expected: 'INCOMPLETE', mutate: (value) => { value.candidate.url += '?wrong=1'; } },
    { expected: 'INCOMPLETE', mutate: (value) => { value.artifactReview.status = 'UNREVIEWED'; } },
    { expected: 'FAIL', mutate: (value) => { value.scenarios[0].observation.holdDurationMs = 350; } },
    { expected: 'FAIL', mutate: (value) => { value.storageBoundary.beforeReadable = false; } },
  ];
  for (const entry of cases) {
    const evidence = structuredClone(validV2Evidence()) as any;
    entry.mutate(evidence);
    const context = filesystemContext(evidence);
    assert.equal(evaluatePersonalWorkspacePocP3H1AndroidEvidence(evidence, context).status, entry.expected);
    assert.equal(browserEvidenceModel.evaluate(structuredClone(evidence), structuredClone(context)).status, entry.expected);
  }
});

test('requires exact canonical host binding on every scenario and storage observer', () => {
  const evidence = validV2Evidence() as any;
  evidence.runBinding.bindingFingerprint = 'wrong';
  evidence.scenarios[0].bindingFingerprint = 'wrong';
  evidence.storageBoundary.observer.bindingFingerprint = 'wrong';
  const resultCodes = codes(evidence, filesystemContext());
  assert.ok(resultCodes.includes('binding-fingerprint-invalid'));
  assert.ok(resultCodes.includes('scenario-binding-mismatch'));
  assert.ok(resultCodes.includes('storage-observer-binding-invalid'));
});

test('rejects automation, non-touch, non-coarse, HeadlessChrome, and contradictory UA Client Hints', () => {
  const evidence = validV2Evidence() as any;
  evidence.environment.signals = { webdriver: true, maxTouchPoints: 0, pointerCoarse: false, userAgentData: { available: true, mobile: false, platform: 'Windows' } };
  evidence.environment.userAgent = evidence.environment.userAgent.replace('Chrome/', 'HeadlessChrome/');
  const resultCodes = codes(evidence, filesystemContext());
  for (const code of ['webdriver-signal-rejected', 'touch-signal-missing', 'coarse-pointer-signal-missing', 'headless-browser-rejected', 'ua-client-hints-invalid']) assert.ok(resultCodes.includes(code), code);
});

test('allows unavailable UA Client Hints only when mobile and platform are explicitly null', () => {
  const valid = validV2Evidence() as any;
  valid.environment.signals.userAgentData = { available: false, mobile: null, platform: null };
  assert.equal(evaluatePersonalWorkspacePocP3H1AndroidEvidence(valid, filesystemContext()).status, 'PASS');
  valid.environment.signals.userAgentData.mobile = false;
  assert.ok(codes(valid, filesystemContext()).includes('ua-client-hints-unavailable-values-invalid'));
});

test('requires exact bound /candidate body verification performed on device', () => {
  const evidence = validV2Evidence() as any;
  evidence.candidate.url = `${ORIGIN}/candidate?copied=1`;
  evidence.candidate.responseSha256 = 'C'.repeat(64);
  evidence.candidate.responseBytes = 1;
  evidence.candidate.responseShaHeader = 'D'.repeat(64);
  evidence.candidate.verificationMethod = 'manifest-copy';
  const resultCodes = codes(evidence, filesystemContext());
  for (const code of ['candidate-url-invalid', 'candidate-body-sha256-mismatch', 'candidate-body-bytes-mismatch', 'candidate-sha-header-mismatch', 'candidate-verification-method-invalid']) assert.ok(resultCodes.includes(code), code);
});

test('missing structured observation fields are INCOMPLETE; explicit criterion violations are FAIL', () => {
  const missing = validV2Evidence() as any;
  delete missing.scenarios[1].observation.destinationSelected;
  const missingResult = evaluatePersonalWorkspacePocP3H1AndroidEvidence(missing, filesystemContext());
  assert.equal(missingResult.status, 'INCOMPLETE'); assert.ok(codes(missing, filesystemContext()).includes('observation-field-missing'));

  const violated = validV2Evidence() as any;
  violated.scenarios[0].observation.holdDurationMs = 350;
  const violatedResult = evaluatePersonalWorkspacePocP3H1AndroidEvidence(violated, filesystemContext());
  assert.equal(violatedResult.status, 'FAIL'); assert.deepEqual(violatedResult.failedScenarioIds, ['A1']);

  const mixed = validV2Evidence() as any;
  delete mixed.scenarios[1].observation.destinationSelected;
  mixed.scenarios[1].observation.nativeMenuOpened = true;
  const mixedResult = evaluatePersonalWorkspacePocP3H1AndroidEvidence(mixed, filesystemContext());
  assert.equal(mixedResult.status, 'FAIL');
  assert.deepEqual(mixedResult.failedScenarioIds, ['A2']);
});

test('enforces A4 desktop regression and A5/A6 software-keyboard semantics', () => {
  const evidence = validV2Evidence() as any;
  evidence.scenarios[3].observation.desktopKeyboardRegressionId = '';
  evidence.scenarios[4].observation.keyboardType = 'hardware';
  evidence.scenarios[5].observation.unexpectedState = true;
  const result = evaluatePersonalWorkspacePocP3H1AndroidEvidence(evidence, filesystemContext());
  assert.equal(result.status, 'FAIL');
  assert.ok(result.errors.some((error) => error.path.includes('desktopKeyboardRegressionId')));
  assert.deepEqual(result.failedScenarioIds, ['A5', 'A6']);
});

test('fails unreadable, drifted, forbidden-write, or unbound storage evidence', () => {
  const evidence = validV2Evidence() as any;
  evidence.storageBoundary.afterReadable = false;
  evidence.storageBoundary.after.keys[0].valueSha256 = 'C'.repeat(64);
  evidence.storageBoundary.observer.setItemOutsidePrefix = 1;
  evidence.storageBoundary.automatedWriterRegression.candidateSha256 = 'D'.repeat(64);
  const result = evaluatePersonalWorkspacePocP3H1AndroidEvidence(evidence, filesystemContext());
  assert.equal(result.status, 'FAIL');
  for (const code of ['operating-storage-changed-or-unreadable', 'storage-parity-claim-mismatch', 'forbidden-storage-write', 'automated-writer-regression-invalid']) assert.ok(result.errors.some((error) => error.code === code), code);
});

test('requires a baseline after candidate verification and before A1 plus a full observer window', () => {
  const evidence = validV2Evidence() as any;
  evidence.storageBoundary.baselineCapturedAt = '2026-09-04T08:10:00.000Z';
  evidence.storageBoundary.observer.startedAt = '2026-09-04T08:10:00.000Z';
  const resultCodes = codes(evidence, filesystemContext());
  assert.ok(resultCodes.includes('storage-baseline-time-invalid'));
  assert.ok(resultCodes.includes('storage-observer-window-incomplete'));
});

test('requires safe relative artifact paths, complete roles, matching refs, and actual bytes context', () => {
  const unsafe = validV2Evidence() as any;
  unsafe.artifacts[0].path = '../outside.mp4';
  assert.ok(codes(unsafe, filesystemContext()).includes('artifact-path-unsafe'));

  const wrongContext = filesystemContext();
  (wrongContext.filesystemArtifacts[0] as any).bytes += 1;
  const result = evaluatePersonalWorkspacePocP3H1AndroidEvidence(validV2Evidence(), wrongContext);
  assert.equal(result.status, 'FAIL'); assert.ok(result.errors.some((error) => error.code === 'artifact-filesystem-mismatch'));

  const uncovered = validV2Evidence() as any;
  uncovered.artifacts[0].roles = ['A1'];
  assert.ok(codes(uncovered, filesystemContext()).includes('artifact-role-uncovered'));
});

test('UNREVIEWED draft and incomplete named review cannot become E5-D', () => {
  const draft = validV2Evidence() as any;
  draft.artifactReview = { status: 'UNREVIEWED', reviewedBy: '', reviewedAt: '', scenarioIds: [], artifactIds: [] };
  assert.equal(evaluatePersonalWorkspacePocP3H1AndroidEvidence(draft, filesystemContext()).status, 'INCOMPLETE');
  assert.ok(codes(draft, filesystemContext()).includes('artifact-review-required'));

  const fake = validV2Evidence() as any;
  fake.artifactReview.reviewedBy = 'reviewer';
  assert.ok(codes(fake, filesystemContext()).includes('artifact-reviewer-missing'));
});

test('missing filesystem verification remains INCOMPLETE even with actual files in context', () => {
  const evidence = validV2Evidence() as any;
  evidence.artifacts[0].verification = null;
  const result = evaluatePersonalWorkspacePocP3H1AndroidEvidence(evidence, filesystemContext());
  assert.equal(result.status, 'INCOMPLETE');
  assert.ok(result.errors.some((error) => error.code === 'artifact-filesystem-verification-missing'));
});
