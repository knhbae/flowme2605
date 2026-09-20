(function attachP3H1EvidenceModel(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.P3H1EvidenceModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createP3H1EvidenceModel() {
  'use strict';

  const SCHEMA_VERSION = 2;
  const CONTRACT_VERSION = 'flowme-personal-workspace-p3h1-android-evidence-v2';
  const LEGACY_CONTRACT_VERSION = 'flowme-personal-workspace-p3h1-android-evidence-v1';
  const SCENARIO_IDS = Object.freeze(['A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
  const REQUIRED_ARTIFACT_ROLES = Object.freeze([
    'device-identity', 'browser-version', 'address-bar', 'storage-parity', ...SCENARIO_IDS,
  ]);
  const EXPECTED_SHA256 = '55C57D51ECE599CACA060D5A7A825A600E2D98D8E428DC51EC76E81855D8E8AD';
  const EXPECTED_BYTES = 1925497;
  const POC_PREFIX = 'flow:poc:personal-workspace:v1:';
  const BLOCKED_UA = /(?:HeadlessChrome|;\s*wv\)|\bwv\b|FBAN|FBAV|Instagram|KAKAOTALK|NAVER|Line\/|SamsungBrowser\/|EdgA\/|OPR\/)/iu;
  const ANDROID_CHROME_UA = /Android[^\r\n]*Chrome\/\d+/u;
  const SHA256 = /^[0-9A-F]{64}$/u;
  const ANDROID_PLATFORM_VERSION = /^(?:0|[1-9]\d{0,2})(?:\.(?:0|\d{1,3})){0,3}$/u;
  const FULL_CHROME_VERSION = /^(?:0|[1-9]\d{0,2})(?:\.(?:0|\d{1,6})){3}$/u;
  const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
  const ALLOWED_MEDIA_TYPES = Object.freeze([
    'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'application/pdf', 'application/json', 'text/html', 'text/plain',
  ]);
  const ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
  const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;
  const EMPTY_HINT_VALUE = /^(?:unknown|undefined|null|n\/a|not available)$/iu;
  const PASS = 'PASS';
  const MISSING = 'MISSING';
  const FAIL = 'FAIL';

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function hasOwn(value, key) {
    return isRecord(value) && Object.prototype.hasOwnProperty.call(value, key);
  }

  function nonEmpty(value) {
    return typeof value === 'string' && /\S/u.test(value);
  }

  function isNamedPerson(value) {
    if (!nonEmpty(value) || value.trim().length < 2) return false;
    return !/^(?:unknown|unnamed|tester|reviewer|user|n\/a|none|미정|검토자|테스터)$/iu.test(value.trim());
  }

  function isIsoInstant(value) {
    return nonEmpty(value) && ISO_INSTANT.test(value) && Number.isFinite(Date.parse(value));
  }

  function isExactSha256(value) {
    return typeof value === 'string' && SHA256.test(value);
  }

  function isSafeNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function normalizedHintText(value, maximumLength) {
    if (typeof value !== 'string') return '';
    const normalized = value.trim().replace(/[ \t]+/gu, ' ');
    if (!normalized || normalized.length > maximumLength || CONTROL_CHARACTER.test(normalized) || EMPTY_HINT_VALUE.test(normalized)) return '';
    return normalized;
  }

  function normalizeAndroidClientHints(value) {
    const empty = { deviceModel: '', osVersion: '', browserVersion: '' };
    if (!isRecord(value)) return empty;
    try {
      const platform = normalizedHintText(value.platform, 32);
      if (platform.toLowerCase() !== 'android') return empty;
      const rawModel = normalizedHintText(value.model, 120);
      const deviceModel = rawModel.length >= 2 ? rawModel : '';
      const platformVersion = normalizedHintText(value.platformVersion, 32);
      const osVersion = ANDROID_PLATFORM_VERSION.test(platformVersion) && Number(platformVersion.split('.')[0]) > 0
        ? `Android ${platformVersion}` : '';
      const chromeVersions = Array.isArray(value.fullVersionList)
        ? value.fullVersionList.flatMap((entry) => {
          if (!isRecord(entry)) return [];
          const brand = normalizedHintText(entry.brand, 64);
          const version = normalizedHintText(entry.version, 64);
          return brand.toLowerCase() === 'google chrome' && FULL_CHROME_VERSION.test(version) ? [version] : [];
        }) : [];
      const uniqueChromeVersions = [...new Set(chromeVersions)];
      return {
        deviceModel,
        osVersion,
        browserVersion: uniqueChromeVersions.length === 1 ? uniqueChromeVersions[0] : '',
      };
    } catch {
      return empty;
    }
  }

  function autofillAndroidIdentity(current, clientHints) {
    const existing = isRecord(current) ? current : {};
    const detected = normalizeAndroidClientHints(clientHints);
    return {
      deviceModel: nonEmpty(existing.deviceModel) ? existing.deviceModel : detected.deviceModel,
      osVersion: nonEmpty(existing.osVersion) ? existing.osVersion : detected.osVersion,
      browserVersion: nonEmpty(existing.browserVersion) ? existing.browserVersion : detected.browserVersion,
    };
  }

  function isActualAndroidChromeUa(userAgent) {
    return nonEmpty(userAgent) && ANDROID_CHROME_UA.test(userAgent) && !BLOCKED_UA.test(userAgent);
  }

  function parsePrivateLanUrl(value) {
    if (!nonEmpty(value)) return null;
    let url;
    try { url = new URL(value); } catch { return null; }
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) return null;
    const parts = url.hostname.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
    const privateAddress = parts[0] === 10
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168);
    return privateAddress ? url : null;
  }

  function isLanHttpAddress(value) {
    return parsePrivateLanUrl(value) !== null;
  }

  function isPrivateLanOrigin(value) {
    const url = parsePrivateLanUrl(value);
    return Boolean(url) && value === url.origin && url.pathname === '/' && !url.search && !url.hash;
  }

  function bindingFingerprint(runBinding) {
    if (!isRecord(runBinding)) return '';
    return [runBinding.hostRunId, runBinding.origin, runBinding.candidateSha256, runBinding.candidateBytes, runBinding.createdAt].join('|');
  }

  function uniqueNonEmpty(values) {
    return Array.isArray(values) && values.length > 0 && values.every(nonEmpty) && new Set(values).size === values.length;
  }

  function combineStates(states) {
    return states.includes(FAIL) ? FAIL : states.includes(MISSING) ? MISSING : PASS;
  }

  function exactFieldState(record, key, expected) {
    if (!hasOwn(record, key)) return MISSING;
    return record[key] === expected ? PASS : FAIL;
  }

  function nonEmptyFieldState(record, key) {
    if (!hasOwn(record, key) || record[key] === '') return MISSING;
    return nonEmpty(record[key]) ? PASS : FAIL;
  }

  function numberFieldState(record, key, predicate) {
    if (!hasOwn(record, key) || record[key] === '') return MISSING;
    return Number.isFinite(record[key]) && predicate(record[key]) ? PASS : FAIL;
  }

  function isoFieldState(record, key) {
    if (!hasOwn(record, key) || record[key] === '') return MISSING;
    return isIsoInstant(record[key]) ? PASS : FAIL;
  }

  function validateObservation(id, observation) {
    if (!isRecord(observation)) return MISSING;
    switch (id) {
      case 'A1':
        return combineStates([
          exactFieldState(observation, 'captureMethod', 'android-pointer-location-video'),
          numberFieldState(observation, 'holdDurationMs', (value) => value >= 0 && value < 350),
          numberFieldState(observation, 'movementCssPx', (value) => value >= 8),
          exactFieldState(observation, 'movePanelOpened', false),
          exactFieldState(observation, 'successfulMutationDelta', 0),
        ]);
      case 'A2':
        return combineStates([
          exactFieldState(observation, 'nativeMenuOpened', false),
          exactFieldState(observation, 'flowMeMovePanelOpened', true),
          exactFieldState(observation, 'destinationSelected', true),
          exactFieldState(observation, 'successfulMutationDelta', 1),
        ]);
      case 'A3':
        return combineStates([
          nonEmptyFieldState(observation, 'interruptionMethod'),
          exactFieldState(observation, 'cancellationFeedbackShown', true),
          exactFieldState(observation, 'panelClosed', true),
          exactFieldState(observation, 'ghostClickCount', 0),
          exactFieldState(observation, 'successfulMutationDelta', 0),
        ]);
      case 'A4':
        return combineStates([
          exactFieldState(observation, 'overflowFolderMoveCompleted', true),
          exactFieldState(observation, 'inScreenNonDragOrderMoveCompleted', true),
          exactFieldState(observation, 'commonTransitionConfirmed', true),
          exactFieldState(observation, 'folderMoveMutationDelta', 1),
          exactFieldState(observation, 'orderMoveMutationDelta', 1),
          nonEmptyFieldState(observation, 'desktopKeyboardRegressionId'),
        ]);
      case 'A5':
        return combineStates([
          numberFieldState(observation, 'openerLine', (value) => Number.isSafeInteger(value) && value > 0),
          numberFieldState(observation, 'trayOwnerLine', (value) => Number.isSafeInteger(value) && value > 0),
          hasOwn(observation, 'openerLine') && hasOwn(observation, 'trayOwnerLine')
            ? observation.openerLine === observation.trayOwnerLine ? PASS : FAIL
            : MISSING,
          exactFieldState(observation, 'ownerLinesEqual', true),
          exactFieldState(observation, 'ownerLabelsEqual', true),
          exactFieldState(observation, 'keyboardType', 'android-software'),
          exactFieldState(observation, 'lastPropertyRowReachable', true),
          exactFieldState(observation, 'closeMutationDelta', 0),
          exactFieldState(observation, 'openerFocusRestored', true),
          exactFieldState(observation, 'applyMutationDelta', 1),
        ]);
      case 'A6':
        return combineStates([
          exactFieldState(observation, 'keyboardType', 'android-software'),
          exactFieldState(observation, 'caretWithinVisualViewport', true),
          exactFieldState(observation, 'lastFieldWithinVisualViewport', true),
          exactFieldState(observation, 'saveCtaWithinVisualViewport', true),
          exactFieldState(observation, 'reloadCompleted', true),
          exactFieldState(observation, 'restoredLastSuccessfulStateOnly', true),
          exactFieldState(observation, 'unexpectedState', false),
        ]);
      default:
        return FAIL;
    }
  }

  function isRelativeArtifactPath(value) {
    if (!nonEmpty(value) || CONTROL_CHARACTER.test(value)) return false;
    if (/^(?:[A-Za-z]:[\\/]|[\\/]{2}|\/|[a-z][a-z0-9+.-]*:)/iu.test(value)) return false;
    const segments = value.replace(/\\/gu, '/').split('/');
    return segments.every((segment) => segment && segment !== '.' && segment !== '..');
  }

  function validateSnapshot(snapshot) {
    if (!isRecord(snapshot)) return { state: MISSING, canonical: null };
    const states = [];
    if (!hasOwn(snapshot, 'keyCount')) states.push(MISSING);
    else states.push(isSafeNonNegativeInteger(snapshot.keyCount) ? PASS : FAIL);
    if (!hasOwn(snapshot, 'keys')) states.push(MISSING);
    else if (!Array.isArray(snapshot.keys)) states.push(FAIL);
    else {
      const keys = [];
      for (const item of snapshot.keys) {
        if (!isRecord(item)) {
          states.push(FAIL);
          continue;
        }
        const itemStates = [
          nonEmptyFieldState(item, 'key'),
          numberFieldState(item, 'valueUtf8Bytes', isSafeNonNegativeInteger),
          !hasOwn(item, 'valueSha256') || item.valueSha256 === '' ? MISSING : isExactSha256(item.valueSha256) ? PASS : FAIL,
        ];
        if (nonEmpty(item.key)) {
          itemStates.push(item.key.startsWith('flow:') && !item.key.startsWith(POC_PREFIX) ? PASS : FAIL);
          keys.push(item.key);
        }
        states.push(combineStates(itemStates));
      }
      if (isSafeNonNegativeInteger(snapshot.keyCount)) states.push(snapshot.keyCount === snapshot.keys.length ? PASS : FAIL);
      if (keys.length === snapshot.keys.length) {
        states.push(new Set(keys).size === keys.length ? PASS : FAIL);
        const sorted = [...keys].sort();
        states.push(keys.every((key, index) => key === sorted[index]) ? PASS : FAIL);
      }
    }
    const canonical = Array.isArray(snapshot.keys)
      ? JSON.stringify(snapshot.keys.map((item) => isRecord(item) ? {
        key: item.key,
        valueUtf8Bytes: item.valueUtf8Bytes,
        valueSha256: item.valueSha256,
      } : item))
      : null;
    return { state: combineStates(states), canonical };
  }

  function evaluate(record, context) {
    if (!isRecord(record)) {
      return {
        status: record === null || record === undefined ? 'NOT_RUN' : 'INCOMPLETE', e5d: 'NOT_RUN', evidenceLevel: 'NONE', promotable: false,
        gates: {}, missing: [], failures: [], passedScenarioIds: [], failedScenarioIds: [], missingScenarioIds: [...SCENARIO_IDS],
      };
    }

    if (record.runStatus === 'NOT_RUN') {
      const current = record.schemaVersion === SCHEMA_VERSION && record.contractVersion === CONTRACT_VERSION;
      const preservedLegacy = record.schemaVersion === 1 && record.contractVersion === LEGACY_CONTRACT_VERSION;
      const valid = (current || preservedLegacy) && nonEmpty(record.reason);
      return {
        status: valid ? 'NOT_RUN' : 'INCOMPLETE', e5d: 'NOT_RUN', evidenceLevel: 'NONE', promotable: false,
        gates: { notRunRecordValid: valid }, missing: valid ? [] : ['notRunRecordValid'], failures: [],
        passedScenarioIds: [], failedScenarioIds: [], missingScenarioIds: [...SCENARIO_IDS],
      };
    }

    const gates = {};
    const incompleteGates = new Set();
    const failedGates = new Set();
    function setGate(name, state) {
      gates[name] = state === PASS;
      if (state === MISSING) incompleteGates.add(name);
      if (state === FAIL) failedGates.add(name);
    }

    setGate('contractValid', record.schemaVersion === SCHEMA_VERSION && record.contractVersion === CONTRACT_VERSION && record.runStatus === 'EXECUTED' ? PASS : MISSING);
    const runStates = [nonEmptyFieldState(record, 'runId'), nonEmptyFieldState(record, 'tester'), isoFieldState(record, 'startedAt'), isoFieldState(record, 'endedAt')];
    if (isIsoInstant(record.startedAt) && isIsoInstant(record.endedAt)) runStates.push(Date.parse(record.endedAt) >= Date.parse(record.startedAt) ? PASS : FAIL);
    setGate('runValid', combineStates(runStates));

    const runBinding = isRecord(record.runBinding) ? record.runBinding : {};
    const fingerprint = bindingFingerprint(runBinding);
    const bindingStates = [
      nonEmptyFieldState(runBinding, 'hostRunId'), nonEmptyFieldState(runBinding, 'origin'),
      !hasOwn(runBinding, 'candidateSha256') || runBinding.candidateSha256 === '' ? MISSING : runBinding.candidateSha256 === EXPECTED_SHA256 ? PASS : FAIL,
      !hasOwn(runBinding, 'candidateBytes') ? MISSING : runBinding.candidateBytes === EXPECTED_BYTES ? PASS : FAIL,
      isoFieldState(runBinding, 'createdAt'), nonEmptyFieldState(runBinding, 'bindingFingerprint'),
    ];
    if (nonEmpty(runBinding.origin)) bindingStates.push(isPrivateLanOrigin(runBinding.origin) ? PASS : FAIL);
    if (nonEmpty(runBinding.bindingFingerprint)) bindingStates.push(runBinding.bindingFingerprint === fingerprint ? PASS : FAIL);
    if (isIsoInstant(runBinding.createdAt) && isIsoInstant(record.startedAt)) {
      bindingStates.push(Date.parse(runBinding.createdAt) <= Date.parse(record.startedAt) ? PASS : FAIL);
    }
    setGate('bindingValid', combineStates(bindingStates));

    const environment = isRecord(record.environment) ? record.environment : {};
    setGate('identityValid', combineStates([
      exactFieldState(environment, 'kind', 'actual-device'), exactFieldState(environment, 'physicalDevice', true),
      exactFieldState(environment, 'platform', 'android'), exactFieldState(environment, 'browser', 'chrome'),
      nonEmptyFieldState(environment, 'deviceModel'), nonEmptyFieldState(environment, 'osVersion'),
      nonEmptyFieldState(environment, 'browserVersion'), nonEmptyFieldState(environment, 'buildFingerprint'),
    ]));
    if (nonEmpty(environment.browserVersion) && !/^\d+\.\d+\.\d+\.\d+$/u.test(environment.browserVersion)) {
      setGate('identityValid', FAIL);
    }
    const capabilities = isRecord(environment.capabilities) ? environment.capabilities : {};
    setGate('capabilitiesValid', combineStates(['isSecureContext', 'visualViewport', 'virtualKeyboard'].map((key) => {
      if (!hasOwn(capabilities, key)) return MISSING;
      return typeof capabilities[key] === 'boolean' ? PASS : FAIL;
    })));
    const signals = isRecord(environment.signals) ? environment.signals : {};
    const signalStates = [exactFieldState(signals, 'webdriver', false), numberFieldState(signals, 'maxTouchPoints', (value) => Number.isSafeInteger(value) && value > 0), exactFieldState(signals, 'pointerCoarse', true)];
    const uaData = isRecord(signals.userAgentData) ? signals.userAgentData : {};
    if (!hasOwn(uaData, 'available')) signalStates.push(MISSING);
    else if (uaData.available === true) {
      signalStates.push(exactFieldState(uaData, 'mobile', true));
      signalStates.push(!hasOwn(uaData, 'platform') || uaData.platform === ''
        ? MISSING
        : typeof uaData.platform === 'string' && uaData.platform.toLowerCase() === 'android' ? PASS : FAIL);
    } else if (uaData.available === false) {
      signalStates.push(exactFieldState(uaData, 'mobile', null), exactFieldState(uaData, 'platform', null));
    } else signalStates.push(FAIL);
    setGate('antiAutomationValid', combineStates(signalStates));
    setGate('uaValid', !hasOwn(environment, 'userAgent') || environment.userAgent === '' ? MISSING : isActualAndroidChromeUa(environment.userAgent) ? PASS : FAIL);
    setGate('browserSurfaceValid', combineStates([
      exactFieldState(environment, 'browserSurface', 'standalone-chrome-tab'), exactFieldState(environment, 'openedFromAddressBar', true), exactFieldState(environment, 'sameLanConfirmed', true),
    ]));

    const candidate = isRecord(record.candidate) ? record.candidate : {};
    const expectedCandidateUrl = isPrivateLanOrigin(runBinding.origin) ? `${runBinding.origin}/candidate` : '';
    let candidateUrlState = MISSING;
    if (hasOwn(candidate, 'url') && candidate.url !== '') {
      const parsed = parsePrivateLanUrl(candidate.url);
      candidateUrlState = parsed && candidate.url === expectedCandidateUrl && parsed.pathname === '/candidate' && !parsed.search && !parsed.hash && !parsed.username && !parsed.password ? PASS : FAIL;
    }
    setGate('addressValid', candidateUrlState);
    const candidateStates = [
      exactFieldState(candidate, 'httpStatus', 200),
      !hasOwn(candidate, 'contentType') || candidate.contentType === '' ? MISSING : /^text\/html\s*;\s*charset=utf-8$/iu.test(String(candidate.contentType).trim()) ? PASS : FAIL,
      !hasOwn(candidate, 'responseSha256') || candidate.responseSha256 === '' ? MISSING : candidate.responseSha256 === EXPECTED_SHA256 && candidate.responseSha256 === runBinding.candidateSha256 ? PASS : FAIL,
      !hasOwn(candidate, 'responseBytes') ? MISSING : candidate.responseBytes === EXPECTED_BYTES && candidate.responseBytes === runBinding.candidateBytes ? PASS : FAIL,
      !hasOwn(candidate, 'responseShaHeader') || candidate.responseShaHeader === '' ? MISSING : candidate.responseShaHeader === EXPECTED_SHA256 ? PASS : FAIL,
      isoFieldState(candidate, 'verifiedAt'), exactFieldState(candidate, 'verificationMethod', 'on-device-byte-hash'),
    ];
    if (isIsoInstant(candidate.verifiedAt) && isIsoInstant(record.startedAt) && isIsoInstant(record.endedAt)) {
      const verified = Date.parse(candidate.verifiedAt);
      candidateStates.push(verified >= Date.parse(record.startedAt) && verified <= Date.parse(record.endedAt) ? PASS : FAIL);
    }
    setGate('candidateBodyValid', combineStates(candidateStates));

    const artifacts = Array.isArray(record.artifacts) ? record.artifacts : [];
    const artifactStates = [];
    const artifactMap = new Map();
    const artifactRoles = new Set();
    if (!Array.isArray(record.artifacts) || artifacts.length === 0) artifactStates.push(MISSING);
    for (const artifact of artifacts) {
      if (!isRecord(artifact)) { artifactStates.push(FAIL); continue; }
      const states = [
        !hasOwn(artifact, 'id') || artifact.id === '' ? MISSING : ARTIFACT_ID.test(artifact.id) ? PASS : FAIL,
        !hasOwn(artifact, 'path') || artifact.path === '' ? MISSING : isRelativeArtifactPath(artifact.path) ? PASS : FAIL,
        !hasOwn(artifact, 'sha256') || artifact.sha256 === '' ? MISSING : isExactSha256(artifact.sha256) ? PASS : FAIL,
        !hasOwn(artifact, 'bytes') ? MISSING : Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0 ? PASS : FAIL,
        !hasOwn(artifact, 'mediaType') || artifact.mediaType === '' ? MISSING : ALLOWED_MEDIA_TYPES.includes(artifact.mediaType) ? PASS : FAIL,
        isoFieldState(artifact, 'capturedAt'),
      ];
      if (isIsoInstant(artifact.capturedAt) && isIsoInstant(record.startedAt) && isIsoInstant(record.endedAt)) {
        const captured = Date.parse(artifact.capturedAt);
        states.push(captured >= Date.parse(record.startedAt) && captured <= Date.parse(record.endedAt) ? PASS : FAIL);
      }
      if (!Array.isArray(artifact.roles) || artifact.roles.length === 0) states.push(MISSING);
      else {
        states.push(artifact.roles.every(nonEmpty) && new Set(artifact.roles).size === artifact.roles.length ? PASS : FAIL);
        states.push(artifact.roles.every((role) => REQUIRED_ARTIFACT_ROLES.includes(role)) ? PASS : FAIL);
        artifact.roles.forEach((role) => artifactRoles.add(role));
      }
      if (!hasOwn(artifact, 'verification') || artifact.verification === null) states.push(MISSING);
      else if (!isRecord(artifact.verification)) states.push(FAIL);
      else {
        states.push(exactFieldState(artifact.verification, 'method', 'filesystem-sha256'), isoFieldState(artifact.verification, 'verifiedAt'));
        if (!hasOwn(artifact.verification, 'verifiedBy') || artifact.verification.verifiedBy === '') states.push(MISSING);
        else states.push(isNamedPerson(artifact.verification.verifiedBy) ? PASS : FAIL);
        if (isIsoInstant(artifact.capturedAt) && isIsoInstant(artifact.verification.verifiedAt)) {
          states.push(Date.parse(artifact.verification.verifiedAt) >= Date.parse(artifact.capturedAt) ? PASS : FAIL);
        }
      }
      if (nonEmpty(artifact.id)) {
        if (artifactMap.has(artifact.id)) states.push(FAIL);
        else artifactMap.set(artifact.id, artifact);
      }
      artifactStates.push(combineStates(states));
    }
    setGate('artifactsValid', combineStates(artifactStates));
    setGate('artifactRolesValid', REQUIRED_ARTIFACT_ROLES.every((role) => artifactRoles.has(role)) ? PASS : MISSING);
    let filesystemMismatch = false;
    if (!isRecord(context) || !Array.isArray(context.filesystemArtifacts)) {
      setGate('artifactsFilesystemValid', MISSING);
    } else {
      const filesystemStates = [];
      const filesystemMap = new Map();
      for (const entry of context.filesystemArtifacts) {
        if (!isRecord(entry) || !nonEmpty(entry.id)) {
          filesystemStates.push(FAIL);
          filesystemMismatch = true;
          continue;
        }
        if (filesystemMap.has(entry.id)) {
          filesystemStates.push(FAIL);
          filesystemMismatch = true;
        } else filesystemMap.set(entry.id, entry);
      }
      if (filesystemMap.size !== artifactMap.size) {
        filesystemStates.push(FAIL);
        filesystemMismatch = true;
      }
      for (const [id, artifact] of artifactMap) {
        const actual = filesystemMap.get(id);
        const matches = Boolean(actual)
          && actual.path === artifact.path
          && actual.sha256 === artifact.sha256
          && actual.bytes === artifact.bytes
          && actual.mediaType === artifact.mediaType;
        filesystemStates.push(matches ? PASS : FAIL);
        if (!matches) filesystemMismatch = true;
      }
      setGate('artifactsFilesystemValid', combineStates(filesystemStates));
    }

    const scenarios = Array.isArray(record.scenarios) ? record.scenarios : [];
    const scenarioStates = [];
    const seenScenarioIds = new Set();
    const passedScenarioIds = [];
    const failedScenarioIds = [];
    if (!Array.isArray(record.scenarios) || scenarios.length !== SCENARIO_IDS.length) scenarioStates.push(MISSING);
    for (const scenario of scenarios) {
      if (!isRecord(scenario) || !SCENARIO_IDS.includes(scenario.id)) { scenarioStates.push(FAIL); continue; }
      const id = scenario.id;
      const states = [];
      if (seenScenarioIds.has(id)) states.push(FAIL);
      seenScenarioIds.add(id);
      if (!hasOwn(scenario, 'status')) states.push(MISSING);
      else if (!['PASS', 'FAIL', 'NOT_RUN'].includes(scenario.status)) states.push(FAIL);
      else if (scenario.status === 'PASS') passedScenarioIds.push(id);
      else if (scenario.status === 'FAIL') failedScenarioIds.push(id);
      else states.push(MISSING);
      states.push(!hasOwn(scenario, 'bindingFingerprint') || scenario.bindingFingerprint === '' ? MISSING : scenario.bindingFingerprint === runBinding.bindingFingerprint ? PASS : FAIL);
      if (scenario.status === 'PASS' || scenario.status === 'FAIL') {
        states.push(isoFieldState(scenario, 'startedAt'), isoFieldState(scenario, 'endedAt'));
        if (isIsoInstant(scenario.startedAt) && isIsoInstant(scenario.endedAt)) {
          const scenarioStart = Date.parse(scenario.startedAt);
          const scenarioEnd = Date.parse(scenario.endedAt);
          states.push(scenarioEnd >= scenarioStart ? PASS : FAIL);
          if (isIsoInstant(record.startedAt) && isIsoInstant(record.endedAt)) {
            states.push(scenarioStart >= Date.parse(record.startedAt) && scenarioEnd <= Date.parse(record.endedAt) ? PASS : FAIL);
          }
        }
        states.push(nonEmptyFieldState(scenario, 'notes'));
        if (!uniqueNonEmpty(scenario.artifactRefs)) states.push(MISSING);
        else for (const ref of scenario.artifactRefs) {
          const artifact = artifactMap.get(ref);
          states.push(artifact && Array.isArray(artifact.roles) && artifact.roles.includes(id) ? PASS : FAIL);
          if (id === 'A1' && artifact) {
            states.push(['video/mp4', 'video/webm'].includes(artifact.mediaType) ? PASS : FAIL);
          }
        }
        const observationState = validateObservation(id, scenario.observation);
        states.push(observationState);
        if (scenario.status === 'PASS' && observationState === FAIL) failedScenarioIds.push(id);
      }
      scenarioStates.push(combineStates(states));
    }
    for (const id of SCENARIO_IDS) if (!seenScenarioIds.has(id)) scenarioStates.push(MISSING);
    setGate('allScenariosRun', combineStates(scenarioStates));

    const mapping = isRecord(record.a5ControlMapping) ? record.a5ControlMapping : {};
    const mappingStates = [
      nonEmptyFieldState(mapping, 'evidenceId'), exactFieldState(mapping, 'protocolControl', 'authoring-owner-plus'),
      exactFieldState(mapping, 'candidateControl', 'authoring-property-editor'), exactFieldState(mapping, 'candidateSelector', '[data-action="open-authoring-properties"][data-line]'),
      exactFieldState(mapping, 'ownerIdentityAttribute', 'data-line'), nonEmptyFieldState(mapping, 'decidedBy'), nonEmptyFieldState(mapping, 'artifactRef'),
    ];
    if (!hasOwn(mapping, 'decision') || mapping.decision === '' || mapping.decision === 'NOT_RUN') mappingStates.push(MISSING);
    else mappingStates.push(mapping.decision === 'EQUIVALENT' ? PASS : FAIL);
    if (nonEmpty(mapping.artifactRef)) {
      const artifact = artifactMap.get(mapping.artifactRef);
      mappingStates.push(artifact && Array.isArray(artifact.roles) && artifact.roles.includes('A5') ? PASS : FAIL);
    }
    setGate('a5MappingValid', combineStates(mappingStates));

    const storage = isRecord(record.storageBoundary) ? record.storageBoundary : {};
    setGate('storageReadableValid', combineStates([exactFieldState(storage, 'beforeReadable', true), exactFieldState(storage, 'afterReadable', true)]));
    const beforeSnapshot = validateSnapshot(storage.before);
    const afterSnapshot = validateSnapshot(storage.after);
    const parityStates = [
      exactFieldState(storage, 'scope', 'flow-keys-outside-poc-prefix'),
      !hasOwn(storage, 'bindingFingerprint') || storage.bindingFingerprint === '' ? MISSING : storage.bindingFingerprint === runBinding.bindingFingerprint ? PASS : FAIL,
      isoFieldState(storage, 'baselineCapturedAt'), exactFieldState(storage, 'byteParity', true), beforeSnapshot.state, afterSnapshot.state,
    ];
    if (beforeSnapshot.canonical !== null && afterSnapshot.canonical !== null) parityStates.push(beforeSnapshot.canonical === afterSnapshot.canonical ? PASS : FAIL);
    if (isIsoInstant(storage.baselineCapturedAt) && isIsoInstant(candidate.verifiedAt)) parityStates.push(Date.parse(storage.baselineCapturedAt) >= Date.parse(candidate.verifiedAt) ? PASS : FAIL);
    const scenarioStarts = scenarios.filter((scenario) => isRecord(scenario) && isIsoInstant(scenario.startedAt)).map((scenario) => Date.parse(scenario.startedAt));
    if (isIsoInstant(storage.baselineCapturedAt) && scenarioStarts.length > 0) parityStates.push(Date.parse(storage.baselineCapturedAt) <= Math.min(...scenarioStarts) ? PASS : FAIL);
    setGate('storageParityValid', combineStates(parityStates));

    const observer = isRecord(storage.observer) ? storage.observer : {};
    const observerStates = [
      !hasOwn(observer, 'bindingFingerprint') || observer.bindingFingerprint === '' ? MISSING : observer.bindingFingerprint === runBinding.bindingFingerprint ? PASS : FAIL,
      exactFieldState(observer, 'scope', 'a1-a6-post-load'), exactFieldState(observer, 'setItemOutsidePrefix', 0),
      exactFieldState(observer, 'removeItemOutsidePrefix', 0), exactFieldState(observer, 'clear', 0), isoFieldState(observer, 'startedAt'), isoFieldState(observer, 'endedAt'),
    ];
    if (isIsoInstant(observer.startedAt) && isIsoInstant(observer.endedAt)) {
      observerStates.push(Date.parse(observer.endedAt) >= Date.parse(observer.startedAt) ? PASS : FAIL);
      if (isIsoInstant(record.startedAt) && isIsoInstant(record.endedAt)) {
        observerStates.push(
          Date.parse(observer.startedAt) >= Date.parse(record.startedAt)
            && Date.parse(observer.endedAt) <= Date.parse(record.endedAt)
            ? PASS : FAIL,
        );
      }
      if (isIsoInstant(storage.baselineCapturedAt)) {
        observerStates.push(Date.parse(observer.startedAt) >= Date.parse(storage.baselineCapturedAt) ? PASS : FAIL);
      }
      const scenarioEnds = scenarios.filter((scenario) => isRecord(scenario) && isIsoInstant(scenario.endedAt)).map((scenario) => Date.parse(scenario.endedAt));
      if (scenarioStarts.length > 0) observerStates.push(Date.parse(observer.startedAt) <= Math.min(...scenarioStarts) ? PASS : FAIL);
      if (scenarioEnds.length > 0) observerStates.push(Date.parse(observer.endedAt) >= Math.max(...scenarioEnds) ? PASS : FAIL);
    }
    setGate('storageObserverValid', combineStates(observerStates));

    const regression = isRecord(storage.automatedWriterRegression) ? storage.automatedWriterRegression : {};
    setGate('automatedBoundaryValid', combineStates([
      !hasOwn(regression, 'candidateSha256') || regression.candidateSha256 === '' ? MISSING : regression.candidateSha256 === EXPECTED_SHA256 && regression.candidateSha256 === runBinding.candidateSha256 ? PASS : FAIL,
      nonEmptyFieldState(regression, 'testId'), exactFieldState(regression, 'result', 'PASS'), exactFieldState(regression, 'forbiddenWriteCount', 0),
    ]));

    const review = isRecord(record.artifactReview) ? record.artifactReview : {};
    const reviewStates = [];
    if (!hasOwn(review, 'status') || review.status === '' || review.status === 'UNREVIEWED') reviewStates.push(MISSING);
    else reviewStates.push(review.status === 'REVIEWED' ? PASS : FAIL);
    if (!hasOwn(review, 'reviewedBy') || review.reviewedBy === '') reviewStates.push(MISSING);
    else reviewStates.push(isNamedPerson(review.reviewedBy) ? PASS : FAIL);
    reviewStates.push(isoFieldState(review, 'reviewedAt'));
    if (isIsoInstant(review.reviewedAt) && isIsoInstant(record.endedAt)) {
      reviewStates.push(Date.parse(review.reviewedAt) >= Date.parse(record.endedAt) ? PASS : FAIL);
    }
    if (!uniqueNonEmpty(review.scenarioIds)) reviewStates.push(MISSING);
    else reviewStates.push(review.scenarioIds.length === SCENARIO_IDS.length && SCENARIO_IDS.every((id) => review.scenarioIds.includes(id)) ? PASS : FAIL);
    if (!uniqueNonEmpty(review.artifactIds)) reviewStates.push(MISSING);
    else {
      reviewStates.push(
        review.artifactIds.length === artifactMap.size
          && review.artifactIds.every((id) => artifactMap.has(id))
          && [...artifactMap.keys()].every((id) => review.artifactIds.includes(id))
          ? PASS : FAIL,
      );
    }
    setGate('artifactReviewValid', combineStates(reviewStates));

    const uniquePassed = [...new Set(passedScenarioIds)];
    const uniqueFailed = [...new Set(failedScenarioIds)];
    const missingScenarioIds = SCENARIO_IDS.filter((id) => !uniquePassed.includes(id) && !uniqueFailed.includes(id));
    const storageExplicitFailure = storage.beforeReadable === false
      || storage.afterReadable === false
      || storage.byteParity === false
      || (beforeSnapshot.canonical !== null && afterSnapshot.canonical !== null && beforeSnapshot.canonical !== afterSnapshot.canonical);
    const observerForbiddenWrite = ['setItemOutsidePrefix', 'removeItemOutsidePrefix', 'clear']
      .some((key) => Number.isSafeInteger(observer[key]) && observer[key] > 0);
    const mappingRejected = mapping.decision === 'NOT_EQUIVALENT';
    const explicitFailure = uniqueFailed.length > 0
      || mappingRejected
      || storageExplicitFailure
      || observerForbiddenWrite
      || filesystemMismatch;
    const allPassed = !explicitFailure && incompleteGates.size === 0 && Object.values(gates).every(Boolean) && uniquePassed.length === SCENARIO_IDS.length;
    const status = explicitFailure ? 'FAIL' : allPassed ? 'PASS' : 'INCOMPLETE';
    return {
      status, e5d: status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'NOT_RUN', evidenceLevel: status === 'PASS' ? 'E5-D' : 'NONE', promotable: status === 'PASS', gates,
      missing: [...new Set([...incompleteGates, ...failedGates])], failures: [...failedGates], passedScenarioIds: uniquePassed,
      failedScenarioIds: uniqueFailed, missingScenarioIds,
    };
  }

  return Object.freeze({
    SCHEMA_VERSION, CONTRACT_VERSION, LEGACY_CONTRACT_VERSION, SCENARIO_IDS, REQUIRED_ARTIFACT_ROLES, ALLOWED_MEDIA_TYPES, EXPECTED_SHA256, EXPECTED_BYTES,
    evaluate, autofillAndroidIdentity, bindingFingerprint, isActualAndroidChromeUa, isLanHttpAddress, normalizeAndroidClientHints,
  });
});
