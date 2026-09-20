/**
 * Pure validator for P3-H1 Android Chrome actual-device evidence contract v2.
 *
 * The pure validator cannot inspect files. Consequently an EXECUTED JSON record
 * is never promotable on its own: the CLI must supply a filesystem context made
 * from bytes it has read beneath the explicitly selected artifact root.
 */

export const PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION =
  'flowme-personal-workspace-p3h1-android-evidence-v2' as const;

export const PERSONAL_WORKSPACE_POC_P3H1_ANDROID_LEGACY_EVIDENCE_VERSION =
  'flowme-personal-workspace-p3h1-android-evidence-v1' as const;

export const PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT = Object.freeze({
  bytes: 1_925_497,
  sha256: '55C57D51ECE599CACA060D5A7A825A600E2D98D8E428DC51EC76E81855D8E8AD',
} as const);

export const PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS =
  Object.freeze(['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] as const);

export const PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT_ROLES = Object.freeze([
  'device-identity',
  'browser-version',
  'address-bar',
  'storage-parity',
  ...PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS,
] as const);

export type PersonalWorkspacePocP3H1AndroidScenarioId =
  typeof PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS[number];
export type PersonalWorkspacePocP3H1AndroidArtifactRole =
  typeof PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT_ROLES[number];

export type PersonalWorkspacePocP3H1ScenarioStatus = 'PASS' | 'FAIL' | 'NOT_RUN';
export type PersonalWorkspacePocP3H1EvidenceStatus = 'NOT_RUN' | 'INCOMPLETE' | 'FAIL' | 'PASS';

export type PersonalWorkspacePocP3H1NotRunEvidence = Readonly<{
  schemaVersion: 2;
  contractVersion: typeof PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION;
  runStatus: 'NOT_RUN';
  reason: string;
}>;

export type PersonalWorkspacePocP3H1RunBinding = Readonly<{
  hostRunId: string;
  origin: string;
  candidateSha256: string;
  candidateBytes: number;
  createdAt: string;
  bindingFingerprint: string;
}>;

export type PersonalWorkspacePocP3H1A1Observation = Readonly<{
  captureMethod: 'android-pointer-location-video';
  holdDurationMs: number;
  movementCssPx: number;
  movePanelOpened: boolean;
  successfulMutationDelta: number;
}>;
export type PersonalWorkspacePocP3H1A2Observation = Readonly<{
  nativeMenuOpened: boolean;
  flowMeMovePanelOpened: boolean;
  destinationSelected: boolean;
  successfulMutationDelta: number;
}>;
export type PersonalWorkspacePocP3H1A3Observation = Readonly<{
  interruptionMethod: string;
  cancellationFeedbackShown: boolean;
  panelClosed: boolean;
  ghostClickCount: number;
  successfulMutationDelta: number;
}>;
export type PersonalWorkspacePocP3H1A4Observation = Readonly<{
  overflowFolderMoveCompleted: boolean;
  inScreenNonDragOrderMoveCompleted: boolean;
  commonTransitionConfirmed: boolean;
  folderMoveMutationDelta: number;
  orderMoveMutationDelta: number;
  desktopKeyboardRegressionId: string;
}>;
export type PersonalWorkspacePocP3H1A5Observation = Readonly<{
  openerLine: number;
  trayOwnerLine: number;
  ownerLinesEqual: boolean;
  ownerLabelsEqual: boolean;
  keyboardType: 'android-software' | 'hardware' | 'none';
  lastPropertyRowReachable: boolean;
  closeMutationDelta: number;
  openerFocusRestored: boolean;
  applyMutationDelta: number;
}>;
export type PersonalWorkspacePocP3H1A6Observation = Readonly<{
  keyboardType: 'android-software' | 'hardware' | 'none';
  caretWithinVisualViewport: boolean;
  lastFieldWithinVisualViewport: boolean;
  saveCtaWithinVisualViewport: boolean;
  reloadCompleted: boolean;
  restoredLastSuccessfulStateOnly: boolean;
  unexpectedState: boolean;
}>;

export type PersonalWorkspacePocP3H1ScenarioObservation =
  | PersonalWorkspacePocP3H1A1Observation
  | PersonalWorkspacePocP3H1A2Observation
  | PersonalWorkspacePocP3H1A3Observation
  | PersonalWorkspacePocP3H1A4Observation
  | PersonalWorkspacePocP3H1A5Observation
  | PersonalWorkspacePocP3H1A6Observation;

export type PersonalWorkspacePocP3H1AndroidScenarioEvidence = Readonly<{
  id: PersonalWorkspacePocP3H1AndroidScenarioId;
  status: PersonalWorkspacePocP3H1ScenarioStatus;
  startedAt: string;
  endedAt: string;
  notes: string;
  artifactRefs: readonly string[];
  bindingFingerprint: string;
  observation: PersonalWorkspacePocP3H1ScenarioObservation;
}>;

export type PersonalWorkspacePocP3H1A5ControlMappingEvidence = Readonly<{
  evidenceId: string;
  protocolControl: 'authoring-owner-plus';
  candidateControl: 'authoring-property-editor';
  candidateSelector: string;
  ownerIdentityAttribute: 'data-line';
  decision: 'EQUIVALENT' | 'NOT_EQUIVALENT';
  decidedBy: string;
  artifactRef: string;
}>;

export type PersonalWorkspacePocP3H1ArtifactEvidence = Readonly<{
  id: string;
  path: string;
  sha256: string;
  bytes: number;
  mediaType: string;
  capturedAt: string;
  roles: readonly PersonalWorkspacePocP3H1AndroidArtifactRole[];
  verification: Readonly<{
    method: 'filesystem-sha256';
    verifiedAt: string;
    verifiedBy: string;
  }> | null;
}>;

export type PersonalWorkspacePocP3H1StorageEntry = Readonly<{
  key: string;
  valueUtf8Bytes: number;
  valueSha256: string;
}>;
export type PersonalWorkspacePocP3H1StorageSnapshot = Readonly<{
  keyCount: number;
  keys: readonly PersonalWorkspacePocP3H1StorageEntry[];
}>;

export type PersonalWorkspacePocP3H1ExecutedAndroidEvidence = Readonly<{
  schemaVersion: 2;
  contractVersion: typeof PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION;
  runStatus: 'EXECUTED';
  runId: string;
  tester: string;
  startedAt: string;
  endedAt: string;
  runBinding: PersonalWorkspacePocP3H1RunBinding;
  environment: Readonly<{
    kind: 'actual-device'; physicalDevice: boolean; platform: 'android'; browser: 'chrome';
    deviceModel: string; osVersion: string; browserVersion: string; buildFingerprint: string;
    userAgent: string;
    browserSurface: 'standalone-chrome-tab' | 'messenger-preview' | 'embedded-webview';
    openedFromAddressBar: boolean; sameLanConfirmed: boolean;
    capabilities: Readonly<{ isSecureContext: boolean; visualViewport: boolean; virtualKeyboard: boolean }>;
    signals: Readonly<{
      webdriver: boolean; maxTouchPoints: number; pointerCoarse: boolean;
      userAgentData: Readonly<{ available: boolean; mobile: boolean | null; platform: string | null }>;
    }>;
  }>;
  candidate: Readonly<{
    url: string; httpStatus: number; contentType: string; responseSha256: string;
    responseBytes: number; responseShaHeader: string; verifiedAt: string;
    verificationMethod: 'on-device-byte-hash';
  }>;
  scenarios: readonly PersonalWorkspacePocP3H1AndroidScenarioEvidence[];
  a5ControlMapping: PersonalWorkspacePocP3H1A5ControlMappingEvidence;
  artifacts: readonly PersonalWorkspacePocP3H1ArtifactEvidence[];
  storageBoundary: Readonly<{
    bindingFingerprint: string; scope: 'flow-keys-outside-poc-prefix'; baselineCapturedAt: string;
    beforeReadable: boolean; afterReadable: boolean; byteParity: boolean;
    before: PersonalWorkspacePocP3H1StorageSnapshot; after: PersonalWorkspacePocP3H1StorageSnapshot;
    observer: Readonly<{
      bindingFingerprint: string; scope: 'a1-a6-post-load'; setItemOutsidePrefix: number;
      removeItemOutsidePrefix: number; clear: number; startedAt: string; endedAt: string;
    }>;
    automatedWriterRegression: Readonly<{
      candidateSha256: string; testId: string; result: 'PASS'; forbiddenWriteCount: number;
    }>;
  }>;
  artifactReview: Readonly<{
    status: 'UNREVIEWED' | 'REVIEWED'; reviewedBy: string; reviewedAt: string;
    scenarioIds: readonly PersonalWorkspacePocP3H1AndroidScenarioId[]; artifactIds: readonly string[];
  }>;
}>;

export type PersonalWorkspacePocP3H1AndroidEvidence =
  | PersonalWorkspacePocP3H1NotRunEvidence
  | PersonalWorkspacePocP3H1ExecutedAndroidEvidence;

export type PersonalWorkspacePocP3H1FilesystemArtifact = Readonly<{
  id: string; path: string; sha256: string; bytes: number; mediaType: string;
}>;
export type PersonalWorkspacePocP3H1EvidenceEvaluationContext = Readonly<{
  filesystemArtifacts: readonly PersonalWorkspacePocP3H1FilesystemArtifact[];
}>;
export type PersonalWorkspacePocP3H1EvidenceError = Readonly<{ code: string; path: string; message: string }>;
export type PersonalWorkspacePocP3H1EvidenceEvaluation = Readonly<{
  status: PersonalWorkspacePocP3H1EvidenceStatus; evidenceLevel: 'NONE' | 'E5-D'; promotable: boolean;
  passedScenarioIds: readonly PersonalWorkspacePocP3H1AndroidScenarioId[];
  failedScenarioIds: readonly PersonalWorkspacePocP3H1AndroidScenarioId[];
  missingScenarioIds: readonly PersonalWorkspacePocP3H1AndroidScenarioId[];
  errors: readonly PersonalWorkspacePocP3H1EvidenceError[];
}>;

const NON_EMPTY = /\S/u;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const SHA256 = /^[0-9A-F]{64}$/u;
const MEDIA_TYPE = /^[a-z][a-z0-9!#$&^_.+-]*\/[a-z0-9!#$&^_.+-]+$/u;
const SUPPORTED_ARTIFACT_MEDIA_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'application/pdf', 'application/json',
  'text/html', 'text/plain',
]);
const ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;
const ANDROID_CHROME_UA = /Android[^\r\n]*Chrome\/\d+/u;
const HEADLESS_UA = /HeadlessChrome/iu;
const WEBVIEW_OR_WRAPPED_BROWSER_UA = /(?:;\s*wv\)|\bwv\b|FBAN|FBAV|Instagram|KAKAOTALK|NAVER|Line\/|SamsungBrowser\/|EdgA\/|OPR\/)/iu;
const POC_STORAGE_PREFIX = 'flow:poc:personal-workspace:v1:';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && NON_EMPTY.test(value);
}
function isNamedPerson(value: unknown): value is string {
  if (!isNonEmptyString(value) || value.trim().length < 2) return false;
  return !/^(?:unknown|unnamed|tester|reviewer|user|n\/a|none|미정|검토자|테스터)$/iu.test(value.trim());
}
function isIsoInstant(value: unknown): value is string {
  return typeof value === 'string' && ISO_INSTANT.test(value) && Number.isFinite(Date.parse(value));
}
function isValidRunWindow(startedAt: unknown, endedAt: unknown): boolean {
  return isIsoInstant(startedAt) && isIsoInstant(endedAt) && Date.parse(endedAt) >= Date.parse(startedAt);
}
function isWithinWindow(value: unknown, startedAt: unknown, endedAt: unknown): boolean {
  return isIsoInstant(value) && isValidRunWindow(startedAt, endedAt)
    && Date.parse(value) >= Date.parse(startedAt as string)
    && Date.parse(value) <= Date.parse(endedAt as string);
}
function isExactSha256(value: unknown): value is string { return typeof value === 'string' && SHA256.test(value); }
function parsedPrivateLanUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;
  let parsed: URL;
  try { parsed = new URL(value); } catch { return null; }
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) return null;
  const octets = parsed.hostname.toLowerCase().split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  const privateIpv4 = octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
  return privateIpv4 ? parsed : null;
}
function isPrivateLanOrigin(value: unknown): value is string {
  const parsed = parsedPrivateLanUrl(value);
  return parsed !== null && parsed.pathname === '/' && parsed.search === '' && parsed.hash === '' && value === parsed.origin;
}
function isSafeRelativeArtifactPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || CONTROL_CHARACTER.test(value) || value.includes(':')) return false;
  if (/^(?:[A-Za-z]:[\\/]|[\\/]{2}|\/)/u.test(value)) return false;
  return value.replace(/\\/gu, '/').split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}
function pushError(errors: PersonalWorkspacePocP3H1EvidenceError[], code: string, path: string, message: string): void {
  errors.push({ code, path, message });
}
function uniqueNonEmptyStrings(value: unknown, allowEmpty = false): value is readonly string[] {
  return Array.isArray(value) && (allowEmpty || value.length > 0) && value.every(isNonEmptyString) && new Set(value).size === value.length;
}
function exactStringSet(value: unknown, expected: readonly string[]): boolean {
  return uniqueNonEmptyStrings(value, expected.length === 0) && value.length === expected.length && expected.every((entry) => value.includes(entry));
}
function nonNegativeInteger(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) >= 0; }
function positiveInteger(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) > 0; }
function finiteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function emptyEvaluation(status: 'NOT_RUN' | 'INCOMPLETE', errors: readonly PersonalWorkspacePocP3H1EvidenceError[] = []): PersonalWorkspacePocP3H1EvidenceEvaluation {
  return { status, evidenceLevel: 'NONE', promotable: false, passedScenarioIds: [], failedScenarioIds: [], missingScenarioIds: [...PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS], errors };
}
function expectedBindingFingerprint(binding: Record<string, unknown>): string | null {
  if (!isNonEmptyString(binding.hostRunId) || !isPrivateLanOrigin(binding.origin)
    || !isExactSha256(binding.candidateSha256) || !positiveInteger(binding.candidateBytes) || !isIsoInstant(binding.createdAt)) return null;
  return [binding.hostRunId, binding.origin, binding.candidateSha256, String(binding.candidateBytes), binding.createdAt].join('|');
}
function validateBoolean(source: Record<string, unknown>, key: string, path: string, errors: PersonalWorkspacePocP3H1EvidenceError[]): boolean {
  if (typeof source[key] !== 'boolean') {
    pushError(errors, 'observation-field-missing', `${path}.${key}`, `${key} must be a boolean.`);
    return false;
  }
  return true;
}
function validateNumber(source: Record<string, unknown>, key: string, path: string, errors: PersonalWorkspacePocP3H1EvidenceError[], integer = false): boolean {
  if (!(integer ? nonNegativeInteger(source[key]) : finiteNumber(source[key]))) {
    pushError(errors, 'observation-field-missing', `${path}.${key}`, `${key} must be ${integer ? 'a non-negative integer' : 'a finite number'}.`);
    return false;
  }
  return true;
}

function validateScenarioObservation(
  id: PersonalWorkspacePocP3H1AndroidScenarioId, value: unknown, path: string,
  evaluateCriteria: boolean, errors: PersonalWorkspacePocP3H1EvidenceError[],
): boolean {
  if (!isRecord(value)) {
    pushError(errors, 'scenario-observation-missing', path, `${id} needs a structured observation.`);
    return false;
  }
  let complete = true;
  const bool = (key: string): void => { complete = validateBoolean(value, key, path, errors) && complete; };
  const num = (key: string, integer = false): void => { complete = validateNumber(value, key, path, errors, integer) && complete; };
  const failures: string[] = [];
  const expect = (condition: boolean, description: string, eligible = true): void => {
    if (evaluateCriteria && eligible && !condition) failures.push(description);
  };

  if (id === 'A1') {
    if (value.captureMethod !== 'android-pointer-location-video') {
      pushError(errors, 'observation-field-missing', `${path}.captureMethod`, 'A1 captureMethod must be android-pointer-location-video.'); complete = false;
    }
    num('holdDurationMs'); num('movementCssPx'); bool('movePanelOpened'); num('successfulMutationDelta', true);
    expect((value.holdDurationMs as number) >= 0 && (value.holdDurationMs as number) < 350, 'holdDurationMs must be from 0 through 349ms', finiteNumber(value.holdDurationMs));
    expect((value.movementCssPx as number) >= 8, 'movementCssPx must be at least 8 CSS px', finiteNumber(value.movementCssPx));
    expect(value.movePanelOpened === false, 'movePanelOpened must be false', typeof value.movePanelOpened === 'boolean');
    expect(value.successfulMutationDelta === 0, 'successfulMutationDelta must be 0', nonNegativeInteger(value.successfulMutationDelta));
  } else if (id === 'A2') {
    bool('nativeMenuOpened'); bool('flowMeMovePanelOpened'); bool('destinationSelected'); num('successfulMutationDelta', true);
    expect(value.nativeMenuOpened === false, 'nativeMenuOpened must be false', typeof value.nativeMenuOpened === 'boolean');
    expect(value.flowMeMovePanelOpened === true, 'flowMeMovePanelOpened must be true', typeof value.flowMeMovePanelOpened === 'boolean');
    expect(value.destinationSelected === true, 'destinationSelected must be true', typeof value.destinationSelected === 'boolean');
    expect(value.successfulMutationDelta === 1, 'successfulMutationDelta must be 1', nonNegativeInteger(value.successfulMutationDelta));
  } else if (id === 'A3') {
    if (!isNonEmptyString(value.interruptionMethod)) {
      pushError(errors, 'observation-field-missing', `${path}.interruptionMethod`, 'A3 interruptionMethod must not be empty.'); complete = false;
    }
    bool('cancellationFeedbackShown'); bool('panelClosed'); num('ghostClickCount', true); num('successfulMutationDelta', true);
    expect(value.cancellationFeedbackShown === true, 'cancellationFeedbackShown must be true', typeof value.cancellationFeedbackShown === 'boolean');
    expect(value.panelClosed === true, 'panelClosed must be true', typeof value.panelClosed === 'boolean');
    expect(value.ghostClickCount === 0, 'ghostClickCount must be 0', nonNegativeInteger(value.ghostClickCount));
    expect(value.successfulMutationDelta === 0, 'successfulMutationDelta must be 0', nonNegativeInteger(value.successfulMutationDelta));
  } else if (id === 'A4') {
    bool('overflowFolderMoveCompleted'); bool('inScreenNonDragOrderMoveCompleted'); bool('commonTransitionConfirmed');
    num('folderMoveMutationDelta', true); num('orderMoveMutationDelta', true);
    if (!isNonEmptyString(value.desktopKeyboardRegressionId)) {
      pushError(errors, 'observation-field-missing', `${path}.desktopKeyboardRegressionId`, 'A4 needs a same-SHA desktop keyboard regression ID.'); complete = false;
    }
    expect(value.overflowFolderMoveCompleted === true, 'overflowFolderMoveCompleted must be true', typeof value.overflowFolderMoveCompleted === 'boolean');
    expect(value.inScreenNonDragOrderMoveCompleted === true, 'inScreenNonDragOrderMoveCompleted must be true', typeof value.inScreenNonDragOrderMoveCompleted === 'boolean');
    expect(value.commonTransitionConfirmed === true, 'commonTransitionConfirmed must be true', typeof value.commonTransitionConfirmed === 'boolean');
    expect(value.folderMoveMutationDelta === 1, 'folderMoveMutationDelta must be 1', nonNegativeInteger(value.folderMoveMutationDelta));
    expect(value.orderMoveMutationDelta === 1, 'orderMoveMutationDelta must be 1', nonNegativeInteger(value.orderMoveMutationDelta));
  } else if (id === 'A5') {
    if (!positiveInteger(value.openerLine)) { pushError(errors, 'observation-field-missing', `${path}.openerLine`, 'A5 openerLine must be a positive integer.'); complete = false; }
    if (!positiveInteger(value.trayOwnerLine)) { pushError(errors, 'observation-field-missing', `${path}.trayOwnerLine`, 'A5 trayOwnerLine must be a positive integer.'); complete = false; }
    bool('ownerLinesEqual'); bool('ownerLabelsEqual'); bool('lastPropertyRowReachable');
    num('closeMutationDelta', true); bool('openerFocusRestored'); num('applyMutationDelta', true);
    if (!['android-software', 'hardware', 'none'].includes(value.keyboardType as string)) {
      pushError(errors, 'observation-field-missing', `${path}.keyboardType`, 'A5 keyboardType must be android-software, hardware, or none.'); complete = false;
    }
    expect(value.openerLine === value.trayOwnerLine, 'openerLine and trayOwnerLine must match', positiveInteger(value.openerLine) && positiveInteger(value.trayOwnerLine));
    expect(value.ownerLinesEqual === true, 'ownerLinesEqual must be true', typeof value.ownerLinesEqual === 'boolean');
    expect(value.ownerLabelsEqual === true, 'ownerLabelsEqual must be true', typeof value.ownerLabelsEqual === 'boolean');
    expect(value.keyboardType === 'android-software', 'keyboardType must record the Android software keyboard', ['android-software', 'hardware', 'none'].includes(value.keyboardType as string));
    expect(value.lastPropertyRowReachable === true, 'lastPropertyRowReachable must be true', typeof value.lastPropertyRowReachable === 'boolean');
    expect(value.closeMutationDelta === 0, 'closeMutationDelta must be 0', nonNegativeInteger(value.closeMutationDelta));
    expect(value.openerFocusRestored === true, 'openerFocusRestored must be true', typeof value.openerFocusRestored === 'boolean');
    expect(value.applyMutationDelta === 1, 'applyMutationDelta must be 1', nonNegativeInteger(value.applyMutationDelta));
  } else {
    if (!['android-software', 'hardware', 'none'].includes(value.keyboardType as string)) {
      pushError(errors, 'observation-field-missing', `${path}.keyboardType`, 'A6 keyboardType must be android-software, hardware, or none.'); complete = false;
    }
    bool('caretWithinVisualViewport'); bool('lastFieldWithinVisualViewport'); bool('saveCtaWithinVisualViewport');
    bool('reloadCompleted'); bool('restoredLastSuccessfulStateOnly'); bool('unexpectedState');
    expect(value.keyboardType === 'android-software', 'keyboardType must record the Android software keyboard', ['android-software', 'hardware', 'none'].includes(value.keyboardType as string));
    expect(value.caretWithinVisualViewport === true, 'caretWithinVisualViewport must be true', typeof value.caretWithinVisualViewport === 'boolean');
    expect(value.lastFieldWithinVisualViewport === true, 'lastFieldWithinVisualViewport must be true', typeof value.lastFieldWithinVisualViewport === 'boolean');
    expect(value.saveCtaWithinVisualViewport === true, 'saveCtaWithinVisualViewport must be true', typeof value.saveCtaWithinVisualViewport === 'boolean');
    expect(value.reloadCompleted === true, 'reloadCompleted must be true', typeof value.reloadCompleted === 'boolean');
    expect(value.restoredLastSuccessfulStateOnly === true, 'restoredLastSuccessfulStateOnly must be true', typeof value.restoredLastSuccessfulStateOnly === 'boolean');
    expect(value.unexpectedState === false, 'unexpectedState must be false', typeof value.unexpectedState === 'boolean');
  }
  if (failures.length > 0) {
    pushError(errors, 'scenario-observation-criteria-failed', path, `${id}: ${failures.join('; ')}.`);
    return true;
  }
  return false;
}

function validateStorageSnapshot(value: unknown, path: string, errors: PersonalWorkspacePocP3H1EvidenceError[]): readonly PersonalWorkspacePocP3H1StorageEntry[] | null {
  if (!isRecord(value) || !nonNegativeInteger(value.keyCount) || !Array.isArray(value.keys)) {
    pushError(errors, 'storage-snapshot-invalid', path, 'Storage snapshot needs keyCount and a keys array.'); return null;
  }
  const result: PersonalWorkspacePocP3H1StorageEntry[] = [];
  const seen = new Set<string>();
  for (const [index, entryValue] of value.keys.entries()) {
    const entryPath = `${path}.keys[${index}]`;
    if (!isRecord(entryValue) || !isNonEmptyString(entryValue.key)
      || !nonNegativeInteger(entryValue.valueUtf8Bytes) || !isExactSha256(entryValue.valueSha256)) {
      pushError(errors, 'storage-entry-invalid', entryPath, 'Each storage entry needs key, UTF-8 bytes, and uppercase SHA-256.'); continue;
    }
    if (!entryValue.key.startsWith('flow:') || entryValue.key.startsWith(POC_STORAGE_PREFIX)) {
      pushError(errors, 'storage-entry-out-of-scope', `${entryPath}.key`, 'Snapshot entries must be flow:* keys outside the PoC prefix.');
    }
    if (seen.has(entryValue.key)) pushError(errors, 'storage-entry-duplicate', `${entryPath}.key`, 'Storage keys must be unique.');
    seen.add(entryValue.key);
    result.push({ key: entryValue.key, valueUtf8Bytes: entryValue.valueUtf8Bytes, valueSha256: entryValue.valueSha256 });
  }
  if (value.keyCount !== value.keys.length) pushError(errors, 'storage-key-count-mismatch', `${path}.keyCount`, 'keyCount must equal the number of entries.');
  const keys = result.map((entry) => entry.key);
  if (keys.some((key, index) => index > 0 && keys[index - 1] > key)) pushError(errors, 'storage-keys-unsorted', `${path}.keys`, 'Storage keys must use ascending code-unit order.');
  return result.length === value.keys.length ? result : null;
}
function sameStorageEntries(before: readonly PersonalWorkspacePocP3H1StorageEntry[] | null, after: readonly PersonalWorkspacePocP3H1StorageEntry[] | null): boolean | null {
  if (before === null || after === null) return null;
  return JSON.stringify(before) === JSON.stringify(after);
}

export function evaluatePersonalWorkspacePocP3H1AndroidEvidence(
  input: unknown, context?: PersonalWorkspacePocP3H1EvidenceEvaluationContext,
): PersonalWorkspacePocP3H1EvidenceEvaluation {
  if (input === null || input === undefined) return emptyEvaluation('NOT_RUN');
  if (!isRecord(input)) return emptyEvaluation('INCOMPLETE', [{ code: 'evidence-invalid', path: '$', message: 'Evidence must be an object.' }]);

  if (input.runStatus === 'NOT_RUN') {
    const errors: PersonalWorkspacePocP3H1EvidenceError[] = [];
    const isV2 = input.schemaVersion === 2 && input.contractVersion === PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION;
    const isPreservedV1 = input.schemaVersion === 1 && input.contractVersion === PERSONAL_WORKSPACE_POC_P3H1_ANDROID_LEGACY_EVIDENCE_VERSION;
    if (!isV2 && !isPreservedV1) pushError(errors, 'not-run-contract-invalid', 'schemaVersion/contractVersion', 'NOT_RUN must use v2 or an exact preserved v1 NOT_RUN contract.');
    if (!isNonEmptyString(input.reason)) pushError(errors, 'not-run-reason-missing', 'reason', 'NOT_RUN evidence needs a reason.');
    return emptyEvaluation(errors.length === 0 ? 'NOT_RUN' : 'INCOMPLETE', errors);
  }

  const errors: PersonalWorkspacePocP3H1EvidenceError[] = [];
  if (input.runStatus !== 'EXECUTED') {
    pushError(errors, 'run-status-invalid', 'runStatus', 'runStatus must be NOT_RUN or EXECUTED.'); return emptyEvaluation('INCOMPLETE', errors);
  }
  if (input.schemaVersion === 1 || input.contractVersion === PERSONAL_WORKSPACE_POC_P3H1_ANDROID_LEGACY_EVIDENCE_VERSION) {
    pushError(errors, 'legacy-executed-evidence-rejected', 'schemaVersion/contractVersion', 'v1 EXECUTED evidence cannot be migrated; run A1-A6 again under v2.');
    return emptyEvaluation('INCOMPLETE', errors);
  }
  if (input.schemaVersion !== 2) pushError(errors, 'schema-version-invalid', 'schemaVersion', 'schemaVersion must be 2.');
  if (input.contractVersion !== PERSONAL_WORKSPACE_POC_P3H1_ANDROID_EVIDENCE_VERSION) pushError(errors, 'contract-version-invalid', 'contractVersion', 'The Android evidence contract must match v2.');
  for (const [fieldPath, value] of [['runId', input.runId], ['tester', input.tester]] as const) if (!isNonEmptyString(value)) pushError(errors, 'identity-missing', fieldPath, `${fieldPath} must not be empty.`);
  if (!isValidRunWindow(input.startedAt, input.endedAt)) pushError(errors, 'run-time-invalid', 'startedAt/endedAt', 'The run needs an ordered UTC ISO time window.');

  const binding = isRecord(input.runBinding) ? input.runBinding : {};
  const canonicalFingerprint = expectedBindingFingerprint(binding);
  if (canonicalFingerprint === null) pushError(errors, 'run-binding-invalid', 'runBinding', 'Run binding needs hostRunId, exact private-LAN origin, pinned SHA/bytes, and createdAt.');
  if (binding.candidateSha256 !== PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.sha256 || binding.candidateBytes !== PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.bytes) pushError(errors, 'run-binding-candidate-mismatch', 'runBinding', 'Run binding must use pinned candidate SHA-256 and bytes.');
  if (!isNonEmptyString(binding.bindingFingerprint) || binding.bindingFingerprint !== canonicalFingerprint) pushError(errors, 'binding-fingerprint-invalid', 'runBinding.bindingFingerprint', 'bindingFingerprint must be the canonical five-field join.');
  if (isIsoInstant(binding.createdAt) && isIsoInstant(input.startedAt) && Date.parse(binding.createdAt) > Date.parse(input.startedAt)) pushError(errors, 'run-binding-time-invalid', 'runBinding.createdAt', 'Host binding must exist before the device run starts.');

  const environment = isRecord(input.environment) ? input.environment : {};
  if (environment.kind !== 'actual-device' || environment.physicalDevice !== true || environment.platform !== 'android' || environment.browser !== 'chrome') pushError(errors, 'actual-android-chrome-required', 'environment', 'Only a physical Android device running Chrome can be E5-D.');
  for (const key of ['deviceModel', 'osVersion', 'browserVersion', 'buildFingerprint'] as const) if (!isNonEmptyString(environment[key])) pushError(errors, 'device-identity-missing', `environment.${key}`, `${key} must not be empty.`);
  if (!isNonEmptyString(environment.userAgent) || !ANDROID_CHROME_UA.test(environment.userAgent)) pushError(errors, 'android-chrome-ua-invalid', 'environment.userAgent', 'UA must identify Android Chrome.');
  else {
    if (HEADLESS_UA.test(environment.userAgent)) pushError(errors, 'headless-browser-rejected', 'environment.userAgent', 'HeadlessChrome cannot be actual-device evidence.');
    if (WEBVIEW_OR_WRAPPED_BROWSER_UA.test(environment.userAgent)) pushError(errors, 'wrapped-browser-ua-rejected', 'environment.userAgent', 'Messenger, webview, and alternate-browser UAs are rejected.');
  }
  if (!isNonEmptyString(environment.browserVersion) || !/^\d+\.\d+\.\d+\.\d+$/u.test(environment.browserVersion)) pushError(errors, 'browser-version-incomplete', 'environment.browserVersion', 'Record the full four-part Chrome version.');
  if (environment.browserSurface !== 'standalone-chrome-tab' || environment.openedFromAddressBar !== true) pushError(errors, 'standalone-chrome-tab-required', 'environment.browserSurface', 'Use a standalone Chrome tab opened from the address bar.');
  if (environment.sameLanConfirmed !== true) pushError(errors, 'same-lan-unconfirmed', 'environment.sameLanConfirmed', 'Host and Android device must be on the same LAN.');
  const capabilities = isRecord(environment.capabilities) ? environment.capabilities : {};
  if (typeof capabilities.isSecureContext !== 'boolean' || typeof capabilities.visualViewport !== 'boolean' || typeof capabilities.virtualKeyboard !== 'boolean') pushError(errors, 'capability-metadata-missing', 'environment.capabilities', 'Record capability booleans.');
  const signals = isRecord(environment.signals) ? environment.signals : {};
  if (signals.webdriver !== false) pushError(errors, 'webdriver-signal-rejected', 'environment.signals.webdriver', 'navigator.webdriver must be false.');
  if (!positiveInteger(signals.maxTouchPoints)) pushError(errors, 'touch-signal-missing', 'environment.signals.maxTouchPoints', 'maxTouchPoints must be positive.');
  if (signals.pointerCoarse !== true) pushError(errors, 'coarse-pointer-signal-missing', 'environment.signals.pointerCoarse', '(pointer: coarse) must match.');
  const uaData = isRecord(signals.userAgentData) ? signals.userAgentData : {};
  if (typeof uaData.available !== 'boolean') pushError(errors, 'ua-client-hints-availability-missing', 'environment.signals.userAgentData.available', 'Record UA Client Hints availability.');
  else if (uaData.available) {
    if (uaData.mobile !== true || typeof uaData.platform !== 'string' || uaData.platform.toLowerCase() !== 'android') pushError(errors, 'ua-client-hints-invalid', 'environment.signals.userAgentData', 'Available UA Client Hints must report mobile Android.');
  } else if (uaData.mobile !== null || uaData.platform !== null) pushError(errors, 'ua-client-hints-unavailable-values-invalid', 'environment.signals.userAgentData', 'Unavailable UA Client Hints must use null values.');

  const candidate = isRecord(input.candidate) ? input.candidate : {};
  const expectedCandidateUrl = isPrivateLanOrigin(binding.origin) ? `${binding.origin}/candidate` : null;
  const parsedCandidateUrl = parsedPrivateLanUrl(candidate.url);
  if (parsedCandidateUrl === null || parsedCandidateUrl.search !== '' || parsedCandidateUrl.hash !== '' || candidate.url !== expectedCandidateUrl) pushError(errors, 'candidate-url-invalid', 'candidate.url', 'Fetch exact bound-origin /candidate without query, hash, or credentials.');
  if (candidate.httpStatus !== 200) pushError(errors, 'candidate-http-status-invalid', 'candidate.httpStatus', 'Candidate must return HTTP 200.');
  if (typeof candidate.contentType !== 'string' || !/^text\/html\s*;\s*charset=utf-8$/iu.test(candidate.contentType.trim())) pushError(errors, 'candidate-content-type-invalid', 'candidate.contentType', 'Candidate must be UTF-8 HTML.');
  if (!isExactSha256(candidate.responseSha256) || candidate.responseSha256 !== PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.sha256 || candidate.responseSha256 !== binding.candidateSha256) pushError(errors, 'candidate-body-sha256-mismatch', 'candidate.responseSha256', 'On-device response body must match bound SHA-256.');
  if (candidate.responseBytes !== PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.bytes || candidate.responseBytes !== binding.candidateBytes) pushError(errors, 'candidate-body-bytes-mismatch', 'candidate.responseBytes', 'On-device response body length must match.');
  if (candidate.responseShaHeader !== PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.sha256) pushError(errors, 'candidate-sha-header-mismatch', 'candidate.responseShaHeader', 'Response SHA header must match.');
  if (candidate.verificationMethod !== 'on-device-byte-hash') pushError(errors, 'candidate-verification-method-invalid', 'candidate.verificationMethod', 'Use on-device-byte-hash.');
  if (!isWithinWindow(candidate.verifiedAt, input.startedAt, input.endedAt)) pushError(errors, 'candidate-verification-time-invalid', 'candidate.verifiedAt', 'Candidate verification must occur inside run window.');

  const artifacts = Array.isArray(input.artifacts) ? input.artifacts : [];
  if (artifacts.length === 0) pushError(errors, 'artifacts-missing', 'artifacts', 'Structured artifacts are required.');
  const artifactIds = new Set<string>(); const artifactPaths = new Set<string>();
  const artifactById = new Map<string, Record<string, unknown>>(); const coveredRoles = new Set<string>();
  for (const [index, value] of artifacts.entries()) {
    const artifactPath = `artifacts[${index}]`;
    if (!isRecord(value)) { pushError(errors, 'artifact-invalid', artifactPath, 'Each artifact must be an object.'); continue; }
    if (!isNonEmptyString(value.id)) pushError(errors, 'artifact-id-missing', `${artifactPath}.id`, 'Artifact ID is required.');
    else if (!ARTIFACT_ID.test(value.id)) pushError(errors, 'artifact-id-invalid', `${artifactPath}.id`, 'Artifact ID must use 1-128 ASCII letters, digits, dot, underscore, or hyphen.');
    else if (artifactIds.has(value.id)) pushError(errors, 'artifact-id-duplicate', `${artifactPath}.id`, 'Artifact IDs must be unique.');
    else { artifactIds.add(value.id); artifactById.set(value.id, value); }
    if (!isSafeRelativeArtifactPath(value.path)) pushError(errors, 'artifact-path-unsafe', `${artifactPath}.path`, 'Artifact path must be safe and relative.');
    else {
      const comparablePath = value.path.replace(/\\/gu, '/').toLowerCase();
      if (artifactPaths.has(comparablePath)) pushError(errors, 'artifact-path-duplicate', `${artifactPath}.path`, 'Each artifact path must be unique.');
      artifactPaths.add(comparablePath);
    }
    if (!isExactSha256(value.sha256)) pushError(errors, 'artifact-sha256-invalid', `${artifactPath}.sha256`, 'Artifact SHA-256 must be uppercase.');
    if (!positiveInteger(value.bytes)) pushError(errors, 'artifact-bytes-invalid', `${artifactPath}.bytes`, 'Artifact bytes must be positive.');
    if (typeof value.mediaType !== 'string' || !MEDIA_TYPE.test(value.mediaType)
      || !SUPPORTED_ARTIFACT_MEDIA_TYPES.has(value.mediaType)) pushError(errors, 'artifact-media-type-invalid', `${artifactPath}.mediaType`, 'Artifact mediaType must be a supported concrete type that the CLI can verify from bytes.');
    if (!isWithinWindow(value.capturedAt, input.startedAt, input.endedAt)) pushError(errors, 'artifact-capture-time-invalid', `${artifactPath}.capturedAt`, 'Capture time must be inside run window.');
    if (!uniqueNonEmptyStrings(value.roles)) pushError(errors, 'artifact-roles-missing', `${artifactPath}.roles`, 'Artifact roles must be unique and non-empty.');
    else for (const role of value.roles) {
      if (!PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT_ROLES.includes(role as PersonalWorkspacePocP3H1AndroidArtifactRole)) pushError(errors, 'artifact-role-invalid', `${artifactPath}.roles`, `${role} is not recognized.`);
      else coveredRoles.add(role);
    }
    if (!isRecord(value.verification)) pushError(errors, 'artifact-filesystem-verification-missing', `${artifactPath}.verification`, 'Run CLI finalize to attach verification.');
    else {
      if (value.verification.method !== 'filesystem-sha256') pushError(errors, 'artifact-verification-method-invalid', `${artifactPath}.verification.method`, 'Use filesystem-sha256.');
      if (!isIsoInstant(value.verification.verifiedAt)) pushError(errors, 'artifact-verification-time-invalid', `${artifactPath}.verification.verifiedAt`, 'Verification needs a UTC time.');
      else if (isIsoInstant(value.capturedAt)
        && Date.parse(value.verification.verifiedAt) < Date.parse(value.capturedAt)) {
        pushError(errors, 'artifact-verification-time-invalid', `${artifactPath}.verification.verifiedAt`, 'Filesystem verification cannot precede artifact capture.');
      }
      if (!isNamedPerson(value.verification.verifiedBy)) pushError(errors, 'artifact-verifier-missing', `${artifactPath}.verification.verifiedBy`, 'Verification needs a named verifier.');
    }
  }
  for (const role of PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT_ROLES) if (!coveredRoles.has(role)) pushError(errors, 'artifact-role-uncovered', 'artifacts.roles', `Required role ${role} is not covered.`);

  let filesystemMismatch = false;
  if (!context) pushError(errors, 'artifact-filesystem-context-missing', 'artifacts', 'Only filesystem-verifying CLI can promote this record.');
  else {
    const filesystemById = new Map(context.filesystemArtifacts.map((entry) => [entry.id, entry]));
    if (filesystemById.size !== context.filesystemArtifacts.length || filesystemById.size !== artifactIds.size) { pushError(errors, 'artifact-filesystem-set-mismatch', 'artifacts', 'Filesystem artifact set must match manifest IDs.'); filesystemMismatch = true; }
    for (const [id, manifest] of artifactById) {
      const actual = filesystemById.get(id);
      if (!actual || actual.path !== manifest.path || actual.sha256 !== manifest.sha256 || actual.bytes !== manifest.bytes || actual.mediaType !== manifest.mediaType) {
        pushError(errors, 'artifact-filesystem-mismatch', `artifacts.${id}`, 'Actual path, bytes, SHA-256, or media type differs.'); filesystemMismatch = true;
      }
    }
  }

  const seen = new Set<string>(); const passedScenarioIds: PersonalWorkspacePocP3H1AndroidScenarioId[] = [];
  const failedScenarioIds: PersonalWorkspacePocP3H1AndroidScenarioId[] = []; const criteriaFailedScenarioIds = new Set<PersonalWorkspacePocP3H1AndroidScenarioId>();
  const scenarios = Array.isArray(input.scenarios) ? input.scenarios : [];
  for (const [index, scenarioValue] of scenarios.entries()) {
    const scenarioPath = `scenarios[${index}]`;
    if (!isRecord(scenarioValue)) { pushError(errors, 'scenario-invalid', scenarioPath, 'Scenario must be an object.'); continue; }
    const id = scenarioValue.id;
    if (!PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS.includes(id as PersonalWorkspacePocP3H1AndroidScenarioId)) { pushError(errors, 'scenario-id-invalid', `${scenarioPath}.id`, 'Only A1-A6 allowed.'); continue; }
    if (seen.has(id as string)) { pushError(errors, 'scenario-duplicate', `${scenarioPath}.id`, `${String(id)} is duplicated.`); continue; }
    seen.add(id as string); const typedId = id as PersonalWorkspacePocP3H1AndroidScenarioId;
    if (scenarioValue.status === 'PASS') passedScenarioIds.push(typedId); else if (scenarioValue.status === 'FAIL') failedScenarioIds.push(typedId); else if (scenarioValue.status !== 'NOT_RUN') pushError(errors, 'scenario-status-invalid', `${scenarioPath}.status`, 'Use PASS, FAIL, or NOT_RUN.');
    if (!isValidRunWindow(scenarioValue.startedAt, scenarioValue.endedAt) || !isWithinWindow(scenarioValue.startedAt, input.startedAt, input.endedAt) || !isWithinWindow(scenarioValue.endedAt, input.startedAt, input.endedAt)) pushError(errors, 'scenario-time-invalid', `${scenarioPath}.startedAt/endedAt`, 'Scenario time must be inside run.');
    if (!isNonEmptyString(scenarioValue.notes)) pushError(errors, 'scenario-notes-missing', `${scenarioPath}.notes`, 'Scenario note required.');
    if (scenarioValue.bindingFingerprint !== canonicalFingerprint) pushError(errors, 'scenario-binding-mismatch', `${scenarioPath}.bindingFingerprint`, 'Scenario binding mismatch.');
    if (!uniqueNonEmptyStrings(scenarioValue.artifactRefs)) pushError(errors, 'scenario-artifacts-missing', `${scenarioPath}.artifactRefs`, 'Scenario artifact ID required.');
    else for (const ref of scenarioValue.artifactRefs) {
      const artifact = artifactById.get(ref);
      if (!artifact) pushError(errors, 'scenario-artifact-unregistered', `${scenarioPath}.artifactRefs`, `${ref} is unregistered.`);
      else if (!Array.isArray(artifact.roles) || !artifact.roles.includes(typedId)) pushError(errors, 'scenario-artifact-role-missing', `${scenarioPath}.artifactRefs`, `${ref} lacks role ${typedId}.`);
    }
    if (typedId === 'A1' && uniqueNonEmptyStrings(scenarioValue.artifactRefs)) {
      const hasPointerVideo = scenarioValue.artifactRefs.some((ref) => {
        const artifact = artifactById.get(ref);
        return artifact?.mediaType === 'video/mp4' || artifact?.mediaType === 'video/webm';
      });
      if (!hasPointerVideo) pushError(errors, 'a1-pointer-video-artifact-missing', `${scenarioPath}.artifactRefs`, 'A1 needs an MP4 or WebM Android pointer-location video artifact.');
    }
    if (validateScenarioObservation(typedId, scenarioValue.observation, `${scenarioPath}.observation`, scenarioValue.status !== 'NOT_RUN', errors)) criteriaFailedScenarioIds.add(typedId);
  }
  const missingScenarioIds = PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS.filter((id) => {
    const entry = scenarios.find((candidateValue) => isRecord(candidateValue) && candidateValue.id === id);
    return !seen.has(id) || (isRecord(entry) && entry.status === 'NOT_RUN');
  });

  const mapping = isRecord(input.a5ControlMapping) ? input.a5ControlMapping : {};
  for (const key of ['evidenceId', 'candidateSelector', 'decidedBy', 'artifactRef'] as const) if (!isNonEmptyString(mapping[key])) pushError(errors, 'a5-control-mapping-incomplete', `a5ControlMapping.${key}`, `${key} required.`);
  if (mapping.protocolControl !== 'authoring-owner-plus'
    || mapping.candidateControl !== 'authoring-property-editor'
    || mapping.candidateSelector !== '[data-action="open-authoring-properties"][data-line]'
    || mapping.ownerIdentityAttribute !== 'data-line') pushError(errors, 'a5-control-mapping-invalid', 'a5ControlMapping', 'A5 control mapping invalid.');
  if (mapping.decision !== 'EQUIVALENT' && mapping.decision !== 'NOT_EQUIVALENT') pushError(errors, 'a5-control-mapping-decision-missing', 'a5ControlMapping.decision', 'A5 decision required.');
  if (isNonEmptyString(mapping.artifactRef)) {
    const artifact = artifactById.get(mapping.artifactRef);
    if (!artifact) pushError(errors, 'a5-control-mapping-artifact-unregistered', 'a5ControlMapping.artifactRef', 'A5 artifact unregistered.');
    else if (!Array.isArray(artifact.roles) || !artifact.roles.includes('A5')) pushError(errors, 'a5-control-mapping-artifact-role-missing', 'a5ControlMapping.artifactRef', 'A5 artifact role missing.');
  }

  const storage = isRecord(input.storageBoundary) ? input.storageBoundary : {};
  if (storage.bindingFingerprint !== canonicalFingerprint) pushError(errors, 'storage-binding-mismatch', 'storageBoundary.bindingFingerprint', 'Storage binding mismatch.');
  if (storage.scope !== 'flow-keys-outside-poc-prefix') pushError(errors, 'storage-scope-invalid', 'storageBoundary.scope', 'Storage scope invalid.');
  if (typeof storage.beforeReadable !== 'boolean' || typeof storage.afterReadable !== 'boolean' || typeof storage.byteParity !== 'boolean') pushError(errors, 'storage-readability-missing', 'storageBoundary', 'Readability/parity booleans required.');
  const beforeEntries = validateStorageSnapshot(storage.before, 'storageBoundary.before', errors);
  const afterEntries = validateStorageSnapshot(storage.after, 'storageBoundary.after', errors);
  const calculatedParity = sameStorageEntries(beforeEntries, afterEntries);
  const storageExplicitFailure = storage.beforeReadable === false || storage.afterReadable === false || storage.byteParity === false || calculatedParity === false;
  if (storageExplicitFailure) pushError(errors, 'operating-storage-changed-or-unreadable', 'storageBoundary', 'Operating storage must be readable and byte-identical.');
  if (storage.byteParity === true && calculatedParity === false) pushError(errors, 'storage-parity-claim-mismatch', 'storageBoundary.byteParity', 'byteParity contradicts snapshots.');
  const a1 = scenarios.find((value) => isRecord(value) && value.id === 'A1');
  if (!isIsoInstant(storage.baselineCapturedAt) || !isIsoInstant(candidate.verifiedAt)
    || (isRecord(a1) && isIsoInstant(a1.startedAt) && !(Date.parse(storage.baselineCapturedAt as string) >= Date.parse(candidate.verifiedAt) && Date.parse(storage.baselineCapturedAt as string) <= Date.parse(a1.startedAt)))) pushError(errors, 'storage-baseline-time-invalid', 'storageBoundary.baselineCapturedAt', 'Baseline must follow candidate verification and precede A1.');
  const observer = isRecord(storage.observer) ? storage.observer : {};
  if (observer.bindingFingerprint !== canonicalFingerprint || observer.scope !== 'a1-a6-post-load') pushError(errors, 'storage-observer-binding-invalid', 'storageBoundary.observer', 'Observer binding/scope invalid.');
  let observerForbiddenWrite = false;
  for (const key of ['setItemOutsidePrefix', 'removeItemOutsidePrefix', 'clear'] as const) {
    if (!nonNegativeInteger(observer[key])) pushError(errors, 'storage-observer-count-invalid', `storageBoundary.observer.${key}`, `${key} must be non-negative.`); else if (observer[key] !== 0) observerForbiddenWrite = true;
  }
  if (observerForbiddenWrite) pushError(errors, 'forbidden-storage-write', 'storageBoundary.observer', 'Forbidden storage write observed.');
  if (!isValidRunWindow(observer.startedAt, observer.endedAt)
    || !isWithinWindow(observer.startedAt, input.startedAt, input.endedAt)
    || !isWithinWindow(observer.endedAt, input.startedAt, input.endedAt)) pushError(errors, 'storage-observer-time-invalid', 'storageBoundary.observer', 'Observer time must be inside the run window.');
  else {
    const timed = scenarios.filter((value) => isRecord(value) && isIsoInstant(value.startedAt) && isIsoInstant(value.endedAt));
    if (timed.length > 0) {
      const firstStart = Math.min(...timed.map((value) => Date.parse(value.startedAt as string)));
      const lastEnd = Math.max(...timed.map((value) => Date.parse(value.endedAt as string)));
      if (Date.parse(observer.startedAt as string) > firstStart || Date.parse(observer.endedAt as string) < lastEnd) pushError(errors, 'storage-observer-window-incomplete', 'storageBoundary.observer', 'Observer must cover all scenarios.');
    }
    if (isIsoInstant(storage.baselineCapturedAt)
      && Date.parse(observer.startedAt as string) < Date.parse(storage.baselineCapturedAt)) {
      pushError(errors, 'storage-observer-window-incomplete', 'storageBoundary.observer', 'Observer must start after the storage baseline is captured.');
    }
  }
  const writer = isRecord(storage.automatedWriterRegression) ? storage.automatedWriterRegression : {};
  if (writer.candidateSha256 !== PERSONAL_WORKSPACE_POC_P3H1_ANDROID_ARTIFACT.sha256 || writer.candidateSha256 !== binding.candidateSha256 || !isNonEmptyString(writer.testId) || writer.result !== 'PASS' || writer.forbiddenWriteCount !== 0) pushError(errors, 'automated-writer-regression-invalid', 'storageBoundary.automatedWriterRegression', 'Same-SHA PASS writer regression with zero forbidden writes required.');

  const review = isRecord(input.artifactReview) ? input.artifactReview : {};
  if (review.status !== 'REVIEWED') pushError(errors, 'artifact-review-required', 'artifactReview.status', 'Named reviewer must inspect A1-A6 artifacts.');
  else {
    if (!isNamedPerson(review.reviewedBy)) pushError(errors, 'artifact-reviewer-missing', 'artifactReview.reviewedBy', 'Named reviewer required.');
    if (!isIsoInstant(review.reviewedAt) || (isIsoInstant(input.endedAt) && Date.parse(review.reviewedAt as string) < Date.parse(input.endedAt))) pushError(errors, 'artifact-review-time-invalid', 'artifactReview.reviewedAt', 'Review must follow run end.');
    if (!exactStringSet(review.scenarioIds, PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS)) pushError(errors, 'artifact-review-scenarios-incomplete', 'artifactReview.scenarioIds', 'Review must cover A1-A6.');
    if (!exactStringSet(review.artifactIds, [...artifactIds])) pushError(errors, 'artifact-review-artifacts-incomplete', 'artifactReview.artifactIds', 'Review must cover every artifact.');
  }

  const explicitFailure = failedScenarioIds.length > 0 || criteriaFailedScenarioIds.size > 0 || mapping.decision === 'NOT_EQUIVALENT'
    || storageExplicitFailure || observerForbiddenWrite || filesystemMismatch;
  if (explicitFailure) return { status: 'FAIL', evidenceLevel: 'NONE', promotable: false, passedScenarioIds, failedScenarioIds: [...new Set([...failedScenarioIds, ...criteriaFailedScenarioIds])], missingScenarioIds, errors };
  const allScenariosPassed = passedScenarioIds.length === PERSONAL_WORKSPACE_POC_P3H1_ANDROID_SCENARIO_IDS.length && missingScenarioIds.length === 0;
  if (errors.length > 0 || !allScenariosPassed || mapping.decision !== 'EQUIVALENT') return { status: 'INCOMPLETE', evidenceLevel: 'NONE', promotable: false, passedScenarioIds, failedScenarioIds, missingScenarioIds, errors };
  return { status: 'PASS', evidenceLevel: 'E5-D', promotable: true, passedScenarioIds, failedScenarioIds: [], missingScenarioIds: [], errors: [] };
}
