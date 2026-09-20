const assert = require('node:assert/strict');
const test = require('node:test');

const model = require('./model.js');

const ORIGIN = 'http://192.168.45.231:4173';
const HOST_CREATED_AT = '2026-09-04T07:55:00.000Z';

function observationFor(id) {
  switch (id) {
    case 'A1': return {
      captureMethod: 'android-pointer-location-video', holdDurationMs: 240, movementCssPx: 12,
      movePanelOpened: false, successfulMutationDelta: 0,
    };
    case 'A2': return {
      nativeMenuOpened: false, flowMeMovePanelOpened: true, destinationSelected: true,
      successfulMutationDelta: 1,
    };
    case 'A3': return {
      interruptionMethod: 'pointercancel', cancellationFeedbackShown: true, panelClosed: true,
      ghostClickCount: 0, successfulMutationDelta: 0,
    };
    case 'A4': return {
      overflowFolderMoveCompleted: true, inScreenNonDragOrderMoveCompleted: true,
      commonTransitionConfirmed: true, folderMoveMutationDelta: 1, orderMoveMutationDelta: 1,
      desktopKeyboardRegressionId: 'p3g-keyboard-same-sha-001',
    };
    case 'A5': return {
      openerLine: 2, trayOwnerLine: 2, ownerLinesEqual: true, ownerLabelsEqual: true,
      keyboardType: 'android-software', lastPropertyRowReachable: true, closeMutationDelta: 0,
      openerFocusRestored: true, applyMutationDelta: 1,
    };
    case 'A6': return {
      keyboardType: 'android-software', caretWithinVisualViewport: true,
      lastFieldWithinVisualViewport: true, saveCtaWithinVisualViewport: true,
      reloadCompleted: true, restoredLastSuccessfulStateOnly: true, unexpectedState: false,
    };
    default: throw new Error(`unknown scenario ${id}`);
  }
}

function completeRecord(overrides = {}) {
  const runBinding = {
    hostRunId: 'host-20260904-001', origin: ORIGIN, candidateSha256: model.EXPECTED_SHA256,
    candidateBytes: model.EXPECTED_BYTES, createdAt: HOST_CREATED_AT,
  };
  runBinding.bindingFingerprint = model.bindingFingerprint(runBinding);
  const artifactId = 'android-full-run';
  const snapshot = {
    keyCount: 2,
    keys: [
      { key: 'flow:operating:a', valueUtf8Bytes: 2, valueSha256: 'A'.repeat(64) },
      { key: 'flow:operating:b', valueUtf8Bytes: 3, valueSha256: 'B'.repeat(64) },
    ],
  };
  const base = {
    schemaVersion: 2,
    contractVersion: model.CONTRACT_VERSION,
    runStatus: 'EXECUTED',
    runId: 'android-20260904-001',
    tester: 'tester-01',
    startedAt: '2026-09-04T08:00:00.000Z',
    endedAt: '2026-09-04T08:20:00.000Z',
    runBinding,
    environment: {
      kind: 'actual-device', physicalDevice: true, platform: 'android', browser: 'chrome',
      deviceModel: 'Galaxy S24', osVersion: 'Android 16', browserVersion: '140.0.7339.51',
      buildFingerprint: 'samsung/e3qks/e3q:16/BP2A/example:user/release-keys',
      userAgent: 'Mozilla/5.0 (Linux; Android 16; SM-S921N) AppleWebKit/537.36 Chrome/140.0.7339.51 Mobile Safari/537.36',
      browserSurface: 'standalone-chrome-tab', openedFromAddressBar: true, sameLanConfirmed: true,
      capabilities: { isSecureContext: false, visualViewport: true, virtualKeyboard: false },
      signals: {
        webdriver: false, maxTouchPoints: 5, pointerCoarse: true,
        userAgentData: { available: true, mobile: true, platform: 'Android' },
      },
    },
    candidate: {
      url: `${ORIGIN}/candidate`, httpStatus: 200, contentType: 'text/html; charset=utf-8',
      responseSha256: model.EXPECTED_SHA256, responseBytes: model.EXPECTED_BYTES,
      responseShaHeader: model.EXPECTED_SHA256, verifiedAt: '2026-09-04T08:01:00.000Z',
      verificationMethod: 'on-device-byte-hash',
    },
    scenarios: model.SCENARIO_IDS.map((id, index) => ({
      id, status: 'PASS', bindingFingerprint: runBinding.bindingFingerprint,
      startedAt: `2026-09-04T08:0${index + 4}:00.000Z`,
      endedAt: `2026-09-04T08:${String(index + 5).padStart(2, '0')}:00.000Z`,
      notes: `${id} structured observation`, artifactRefs: [artifactId], observation: observationFor(id),
    })),
    a5ControlMapping: {
      evidenceId: 'A5-control', protocolControl: 'authoring-owner-plus',
      candidateControl: 'authoring-property-editor',
      candidateSelector: '[data-action="open-authoring-properties"][data-line]',
      ownerIdentityAttribute: 'data-line', decision: 'EQUIVALENT', decidedBy: 'tester-01', artifactRef: artifactId,
    },
    artifacts: [{
      id: artifactId, path: 'artifacts/android-full-run.mp4', sha256: 'C'.repeat(64), bytes: 800123,
      mediaType: 'video/mp4', capturedAt: '2026-09-04T08:10:00.000Z', roles: [...model.REQUIRED_ARTIFACT_ROLES],
      verification: { method: 'filesystem-sha256', verifiedAt: '2026-09-04T08:21:00.000Z', verifiedBy: 'evidence-cli' },
    }],
    storageBoundary: {
      bindingFingerprint: runBinding.bindingFingerprint,
      scope: 'flow-keys-outside-poc-prefix', baselineCapturedAt: '2026-09-04T08:02:00.000Z',
      beforeReadable: true, afterReadable: true, byteParity: true,
      before: structuredClone(snapshot), after: structuredClone(snapshot),
      observer: {
        bindingFingerprint: runBinding.bindingFingerprint, scope: 'a1-a6-post-load',
        setItemOutsidePrefix: 0, removeItemOutsidePrefix: 0, clear: 0,
        startedAt: '2026-09-04T08:03:00.000Z', endedAt: '2026-09-04T08:15:00.000Z',
      },
      automatedWriterRegression: {
        candidateSha256: model.EXPECTED_SHA256, testId: 'p3h1-http-writer-boundary-same-sha',
        result: 'PASS', forbiddenWriteCount: 0,
      },
    },
    artifactReview: {
      status: 'REVIEWED', reviewedBy: 'reviewer-01', reviewedAt: '2026-09-04T08:22:00.000Z',
      scenarioIds: [...model.SCENARIO_IDS], artifactIds: [artifactId],
    },
  };
  return { ...base, ...overrides };
}

function replaceScenario(record, id, transform) {
  return { ...record, scenarios: record.scenarios.map((scenario) => scenario.id === id ? transform(structuredClone(scenario)) : scenario) };
}

function filesystemContext(record = completeRecord()) {
  return {
    filesystemArtifacts: record.artifacts.map(({ id, path, sha256, bytes, mediaType }) => ({ id, path, sha256, bytes, mediaType })),
  };
}

test('golden reviewed v2 evidence is the only promotable E5-D shape', () => {
  assert.equal(model.SCHEMA_VERSION, 2);
  assert.equal(model.CONTRACT_VERSION, 'flowme-personal-workspace-p3h1-android-evidence-v2');
  const record = completeRecord();
  const result = model.evaluate(record, filesystemContext(record));
  assert.deepEqual(
    { status: result.status, e5d: result.e5d, evidenceLevel: result.evidenceLevel, promotable: result.promotable },
    { status: 'PASS', e5d: 'PASS', evidenceLevel: 'E5-D', promotable: true },
  );
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.failures, []);
});

test('a complete JSON draft cannot promote without filesystem evidence context', () => {
  const result = model.evaluate(completeRecord());
  assert.equal(result.status, 'INCOMPLETE');
  assert.equal(result.e5d, 'NOT_RUN');
  assert.equal(result.promotable, false);
  assert.equal(result.gates.artifactsFilesystemValid, false);
});

test('v2 NOT_RUN remains honest while v1 evidence is rejected without promotion', () => {
  assert.equal(model.evaluate({ schemaVersion: 2, contractVersion: model.CONTRACT_VERSION, runStatus: 'NOT_RUN', reason: 'No physical Android operation yet.' }).status, 'NOT_RUN');
  assert.equal(model.evaluate({ schemaVersion: 1, contractVersion: model.LEGACY_CONTRACT_VERSION, runStatus: 'NOT_RUN', reason: 'Preserved legacy NOT_RUN.' }).status, 'NOT_RUN');
  const result = model.evaluate(completeRecord({ schemaVersion: 1, contractVersion: 'flowme-personal-workspace-p3h1-android-evidence-v1' }));
  assert.equal(result.status, 'INCOMPLETE');
  assert.equal(result.promotable, false);
  assert.equal(result.gates.contractValid, false);
});

test('requires one exact run binding on the run, all scenarios, and the storage observer', () => {
  const record = completeRecord();
  const stale = `${record.runBinding.bindingFingerprint}-stale`;
  assert.equal(model.evaluate({ ...record, runBinding: { ...record.runBinding, bindingFingerprint: stale } }, filesystemContext(record)).status, 'INCOMPLETE');
  assert.equal(model.evaluate(replaceScenario(record, 'A2', (scenario) => ({ ...scenario, bindingFingerprint: stale })), filesystemContext(record)).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...record, storageBoundary: { ...record.storageBoundary, observer: { ...record.storageBoundary.observer, bindingFingerprint: stale } } }, filesystemContext(record)).status, 'INCOMPLETE');
  const lateBinding = structuredClone(record);
  lateBinding.runBinding.createdAt = '2026-09-04T08:00:01.000Z';
  lateBinding.runBinding.bindingFingerprint = model.bindingFingerprint(lateBinding.runBinding);
  lateBinding.scenarios.forEach((scenario) => { scenario.bindingFingerprint = lateBinding.runBinding.bindingFingerprint; });
  lateBinding.storageBoundary.bindingFingerprint = lateBinding.runBinding.bindingFingerprint;
  lateBinding.storageBoundary.observer.bindingFingerprint = lateBinding.runBinding.bindingFingerprint;
  assert.equal(model.evaluate(lateBinding, filesystemContext(lateBinding)).status, 'INCOMPLETE');
});

test('rejects automation, missing touch/coarse-pointer signals, webviews, and HeadlessChrome', () => {
  const base = completeRecord();
  assert.equal(model.evaluate({ ...base, environment: { ...base.environment, physicalDevice: false } }, filesystemContext(base)).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...base, environment: { ...base.environment, signals: { ...base.environment.signals, webdriver: true } } }, filesystemContext(base)).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...base, environment: { ...base.environment, signals: { ...base.environment.signals, maxTouchPoints: 0 } } }, filesystemContext(base)).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...base, environment: { ...base.environment, signals: { ...base.environment.signals, pointerCoarse: false } } }, filesystemContext(base)).status, 'INCOMPLETE');
  const headless = `${base.environment.userAgent} HeadlessChrome/140.0.7339.51`;
  const headlessResult = model.evaluate({ ...base, environment: { ...base.environment, userAgent: headless } }, filesystemContext(base));
  assert.equal(headlessResult.status, 'INCOMPLETE');
  assert.equal(headlessResult.gates.uaValid, false);
  const webview = 'Mozilla/5.0 (Linux; Android 16; wv) Chrome/140.0.7339.51 Mobile Safari/537.36';
  assert.equal(model.evaluate({ ...base, environment: { ...base.environment, userAgent: webview } }, filesystemContext(base)).status, 'INCOMPLETE');
});

test('enforces UA Client Hints only when available and records unavailability explicitly', () => {
  const base = completeRecord();
  const unavailable = { ...base.environment, signals: { ...base.environment.signals, userAgentData: { available: false, mobile: null, platform: null } } };
  assert.equal(model.evaluate({ ...base, environment: unavailable }, filesystemContext(base)).status, 'PASS');
  const desktopHints = { ...base.environment, signals: { ...base.environment.signals, userAgentData: { available: true, mobile: false, platform: 'Windows' } } };
  assert.equal(model.evaluate({ ...base, environment: desktopHints }, filesystemContext(base)).status, 'INCOMPLETE');
  const missingHints = structuredClone(base.environment);
  delete missingHints.signals.userAgentData;
  assert.equal(model.evaluate({ ...base, environment: missingHints }, filesystemContext(base)).status, 'INCOMPLETE');
});

test('requires the exact origin /candidate body hash, byte count, header, and verification method', () => {
  const base = completeRecord();
  for (const url of [
    `${ORIGIN}/candidate?copy=1`, `${ORIGIN}/candidate#fragment`, `${ORIGIN}/candidate/`,
    'http://127.0.0.1:4173/candidate', 'file:///candidate.html', 'https://example.com/candidate',
  ]) assert.equal(model.evaluate({ ...base, candidate: { ...base.candidate, url } }, filesystemContext(base)).status, 'INCOMPLETE', url);
  assert.equal(model.evaluate({ ...base, candidate: { ...base.candidate, responseSha256: '0'.repeat(64) } }, filesystemContext(base)).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...base, candidate: { ...base.candidate, responseBytes: model.EXPECTED_BYTES - 1 } }, filesystemContext(base)).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...base, candidate: { ...base.candidate, responseShaHeader: '0'.repeat(64) } }, filesystemContext(base)).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...base, candidate: { ...base.candidate, verificationMethod: 'manifest-copy' } }, filesystemContext(base)).status, 'INCOMPLETE');
});

test('every structured A1-A6 criterion is required and an explicit violation fails', () => {
  const wrongByScenario = {
    A1: { captureMethod: 'note', holdDurationMs: 350, movementCssPx: 7, movePanelOpened: true, successfulMutationDelta: 1 },
    A2: { nativeMenuOpened: true, flowMeMovePanelOpened: false, destinationSelected: false, successfulMutationDelta: 0 },
    A3: { interruptionMethod: 42, cancellationFeedbackShown: false, panelClosed: false, ghostClickCount: 1, successfulMutationDelta: 1 },
    A4: { overflowFolderMoveCompleted: false, inScreenNonDragOrderMoveCompleted: false, commonTransitionConfirmed: false, folderMoveMutationDelta: 0, orderMoveMutationDelta: 0, desktopKeyboardRegressionId: 42 },
    A5: { openerLine: 0, trayOwnerLine: -1, ownerLinesEqual: false, ownerLabelsEqual: false, keyboardType: 'hardware', lastPropertyRowReachable: false, closeMutationDelta: 1, openerFocusRestored: false, applyMutationDelta: 0 },
    A6: { keyboardType: 'hardware', caretWithinVisualViewport: false, lastFieldWithinVisualViewport: false, saveCtaWithinVisualViewport: false, reloadCompleted: false, restoredLastSuccessfulStateOnly: false, unexpectedState: true },
  };
  for (const id of model.SCENARIO_IDS) for (const [field, wrongValue] of Object.entries(wrongByScenario[id])) {
    const record = replaceScenario(completeRecord(), id, (scenario) => ({ ...scenario, observation: { ...scenario.observation, [field]: wrongValue } }));
    const result = model.evaluate(record);
    assert.equal(result.status, 'FAIL', `${id}.${field}`);
    assert.equal(result.gates.allScenariosRun, false, `${id}.${field}`);
    const missing = replaceScenario(completeRecord(), id, (scenario) => { delete scenario.observation[field]; return scenario; });
    assert.equal(model.evaluate(missing).status, 'INCOMPLETE', `${id}.${field} missing`);
  }
});

test('an explicit scenario FAIL, A5 non-equivalence, or invalid scenario artifact role fails', () => {
  const base = completeRecord();
  assert.equal(model.evaluate(replaceScenario(base, 'A3', (scenario) => ({ ...scenario, status: 'FAIL' }))).status, 'FAIL');
  assert.equal(model.evaluate(replaceScenario(base, 'A5', (scenario) => ({
    ...scenario,
    observation: { ...scenario.observation, trayOwnerLine: scenario.observation.openerLine + 1 },
  }))).status, 'FAIL');
  assert.equal(model.evaluate({ ...base, a5ControlMapping: { ...base.a5ControlMapping, decision: 'NOT_EQUIVALENT' } }).status, 'FAIL');
  const wrongRoleArtifacts = base.artifacts.map((artifact) => ({ ...artifact, roles: artifact.roles.filter((role) => role !== 'A2') }));
  assert.notEqual(model.evaluate({ ...base, artifacts: wrongRoleArtifacts }).status, 'PASS');
  const wrongA1Media = base.artifacts.map((artifact) => ({ ...artifact, mediaType: 'image/png' }));
  const wrongA1Record = { ...base, artifacts: wrongA1Media };
  assert.equal(model.evaluate(wrongA1Record, filesystemContext(wrongA1Record)).status, 'INCOMPLETE');
});

test('read failures cannot false-pass even with equal empty snapshots and byteParity=true', () => {
  const base = completeRecord();
  const empty = { keyCount: 0, keys: [] };
  const storageBoundary = { ...base.storageBoundary, beforeReadable: false, afterReadable: false, byteParity: true, before: empty, after: empty };
  const result = model.evaluate({ ...base, storageBoundary });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.gates.storageReadableValid, false);
  assert.equal(result.promotable, false);
});

test('storage parity, sorted per-value digests, observer, and same-SHA automated writer evidence are fail-closed', () => {
  const base = completeRecord();
  assert.equal(model.evaluate({ ...base, storageBoundary: { ...base.storageBoundary, byteParity: false } }).status, 'FAIL');
  const after = structuredClone(base.storageBoundary.after);
  after.keys.reverse();
  assert.equal(model.evaluate({ ...base, storageBoundary: { ...base.storageBoundary, after } }).status, 'FAIL');
  const observer = { ...base.storageBoundary.observer, setItemOutsidePrefix: 1 };
  assert.equal(model.evaluate({ ...base, storageBoundary: { ...base.storageBoundary, observer } }).status, 'FAIL');
  const earlyObserver = { ...base.storageBoundary.observer, startedAt: '2026-09-04T08:01:30.000Z' };
  assert.equal(model.evaluate({ ...base, storageBoundary: { ...base.storageBoundary, observer: earlyObserver } }, filesystemContext(base)).status, 'INCOMPLETE');
  const regression = { ...base.storageBoundary.automatedWriterRegression, candidateSha256: 'D'.repeat(64) };
  assert.equal(model.evaluate({ ...base, storageBoundary: { ...base.storageBoundary, automatedWriterRegression: regression } }).status, 'INCOMPLETE');
});

test('rejects arbitrary artifacts, unregistered refs, absolute/traversal paths, and unverified drafts', () => {
  const base = completeRecord();
  assert.equal(model.evaluate({ ...base, artifacts: ['A1.mp4'] }).status, 'INCOMPLETE');
  assert.equal(model.evaluate(replaceScenario(base, 'A1', (scenario) => ({ ...scenario, artifactRefs: ['made-up-id'] }))).status, 'INCOMPLETE');
  for (const path of ['C:/evidence.mp4', '../evidence.mp4', '/evidence.mp4', 'https://example.com/evidence.mp4', 'artifacts\\evidence.mp4']) {
    const artifacts = base.artifacts.map((artifact) => ({ ...artifact, path }));
    assert.equal(model.evaluate({ ...base, artifacts }).status, 'INCOMPLETE', path);
  }
  const draftArtifacts = base.artifacts.map((artifact) => ({ ...artifact, verification: null }));
  assert.equal(model.evaluate({ ...base, artifacts: draftArtifacts }).status, 'INCOMPLETE');
  const vagueArtifacts = base.artifacts.map((artifact) => ({ ...artifact, mediaType: 'application/octet-stream' }));
  const vagueRecord = { ...base, artifacts: vagueArtifacts };
  assert.equal(model.evaluate(vagueRecord, filesystemContext(vagueRecord)).status, 'INCOMPLETE');
  const earlyVerification = base.artifacts.map((artifact) => ({
    ...artifact,
    verification: { ...artifact.verification, verifiedAt: '2026-09-04T08:09:59.000Z' },
  }));
  const earlyVerificationRecord = { ...base, artifacts: earlyVerification };
  assert.equal(model.evaluate(earlyVerificationRecord, filesystemContext(earlyVerificationRecord)).status, 'INCOMPLETE');
});

test('filesystem evidence must match every structured artifact byte-for-byte', () => {
  const base = completeRecord();
  const mismatched = filesystemContext(base);
  mismatched.filesystemArtifacts[0].bytes += 1;
  const result = model.evaluate(base, mismatched);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.gates.artifactsFilesystemValid, false);
  assert.equal(result.promotable, false);
});

test('a recorder draft remains INCOMPLETE until named REVIEWED adjudication covers A1-A6 artifacts', () => {
  const base = completeRecord();
  assert.equal(model.evaluate({ ...base, artifactReview: { status: 'UNREVIEWED', reviewedBy: '', reviewedAt: '', scenarioIds: [], artifactIds: [] } }).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...base, artifactReview: { ...base.artifactReview, reviewedBy: '' } }).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...base, artifactReview: { ...base.artifactReview, reviewedBy: 'reviewer' } }).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...base, artifactReview: { ...base.artifactReview, scenarioIds: ['A1'] } }).status, 'INCOMPLETE');
  assert.equal(model.evaluate({ ...base, artifactReview: { ...base.artifactReview, artifactIds: ['made-up-id'] } }).status, 'INCOMPLETE');
});

test('normalizes Android high-entropy Client Hints without accepting GREASE or Chromium as Chrome', () => {
  assert.deepEqual(model.normalizeAndroidClientHints({
    platform: ' Android ', model: '  SM-S921N  ', platformVersion: '16.0.0',
    fullVersionList: [
      { brand: 'Not_A Brand', version: '99.0.0.0' }, { brand: 'Chromium', version: '140.0.7339.51' },
      { brand: ' Google Chrome ', version: '140.0.7339.51' },
    ],
  }), { deviceModel: 'SM-S921N', osVersion: 'Android 16.0.0', browserVersion: '140.0.7339.51' });
});

test('Client Hints autofill fails closed and preserves manually confirmed identity', () => {
  const empty = { deviceModel: '', osVersion: '', browserVersion: '' };
  assert.deepEqual(model.normalizeAndroidClientHints({
    platform: 'Windows', model: 'Galaxy S24', platformVersion: '16.0.0',
    fullVersionList: [{ brand: 'Google Chrome', version: '140.0.7339.51' }],
  }), empty);
  const current = { deviceModel: '직접 확인한 Galaxy S24', osVersion: '', browserVersion: '139.0.7258.159' };
  const hints = {
    platform: 'Android', model: 'SM-S921N', platformVersion: '16.0.0',
    fullVersionList: [{ brand: 'Google Chrome', version: '140.0.7339.51' }],
  };
  assert.deepEqual(model.autofillAndroidIdentity(current, hints), {
    deviceModel: '직접 확인한 Galaxy S24', osVersion: 'Android 16.0.0', browserVersion: '139.0.7258.159',
  });
});
