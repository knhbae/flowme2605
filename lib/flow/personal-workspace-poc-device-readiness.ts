export const PERSONAL_WORKSPACE_POC_P3G_REQUIREMENT_IDS = [
  'V41-062',
  'V41-063',
  'V41-064',
  'V41-066',
  'D2-038',
  'D2-042',
  'D2-061',
] as const;

export type PersonalWorkspacePocP3GRequirementId =
  typeof PERSONAL_WORKSPACE_POC_P3G_REQUIREMENT_IDS[number];

export const PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES = [
  'react-visual-viewport',
  'standalone-visual-viewport',
  'react-pointer-cancel',
  'standalone-pointer-cancel',
  'keyboard-focus-motion',
  'responsive-reflow',
  'storage-boundary',
] as const;

export type PersonalWorkspacePocP3GAutomationGate =
  typeof PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES[number];

export type PersonalWorkspacePocP3GCheckStatus = 'PASS' | 'FAIL' | 'BLOCKED';

export interface PersonalWorkspacePocP3GManualEvidence {
  schemaVersion: 1;
  environment: 'actual-device' | 'desktop-manual' | 'simulator' | 'browser-automation';
  physicalDevice: boolean;
  platform: 'android' | 'ios' | 'desktop';
  browser: 'chrome' | 'safari';
  deviceModel: string;
  osVersion: string;
  browserVersion: string;
  buildFingerprint: string;
  executedAt: string;
  assistiveTechnology: 'none' | 'talkback' | 'voiceover';
  textScale: 'default' | 'maximum';
  browserZoomPercent: number;
  results: Partial<Record<string, PersonalWorkspacePocP3GCheckStatus>>;
  artifacts: string[];
}

export interface PersonalWorkspacePocP3GRequirementEvaluation {
  id: PersonalWorkspacePocP3GRequirementId;
  automation: 'PASS' | 'FAIL';
  actualDevice: 'PASS' | 'FAIL' | 'NOT_RUN';
  promotable: boolean;
  reason: string;
}

const NON_EMPTY = /\S/u;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;

function hasIdentity(evidence: PersonalWorkspacePocP3GManualEvidence): boolean {
  return [
    evidence.deviceModel,
    evidence.osVersion,
    evidence.browserVersion,
    evidence.buildFingerprint,
  ].every((value) => NON_EMPTY.test(value)) && ISO_INSTANT.test(evidence.executedAt);
}

function isActualAndroid(evidence: PersonalWorkspacePocP3GManualEvidence): boolean {
  return evidence.environment === 'actual-device'
    && evidence.physicalDevice
    && evidence.platform === 'android'
    && evidence.browser === 'chrome'
    && hasIdentity(evidence);
}

function isActualIos(evidence: PersonalWorkspacePocP3GManualEvidence): boolean {
  return evidence.environment === 'actual-device'
    && evidence.physicalDevice
    && evidence.platform === 'ios'
    && evidence.browser === 'safari'
    && hasIdentity(evidence);
}

function isManualDesktop(evidence: PersonalWorkspacePocP3GManualEvidence): boolean {
  return evidence.environment === 'desktop-manual'
    && !evidence.physicalDevice
    && evidence.platform === 'desktop'
    && hasIdentity(evidence);
}

function passes(evidence: PersonalWorkspacePocP3GManualEvidence, ids: string[]): boolean {
  return ids.every((id) => evidence.results[id] === 'PASS');
}

function anyPass(
  evidence: PersonalWorkspacePocP3GManualEvidence[],
  predicate: (entry: PersonalWorkspacePocP3GManualEvidence) => boolean,
  ids: string[],
): boolean {
  return evidence.some((entry) => predicate(entry) && passes(entry, ids));
}

const MANUAL_SCENARIOS_BY_REQUIREMENT: Record<PersonalWorkspacePocP3GRequirementId, string[]> = {
  'V41-062': ['A1', 'A2', 'A3', 'A4'],
  'V41-063': ['I1', 'I2', 'I3', 'I4'],
  'V41-064': ['X1', 'X2', 'X3', 'X5', 'X6', 'X7'],
  'V41-066': ['A2', 'A3', 'I2', 'I3'],
  'D2-038': ['A5', 'I5'],
  'D2-042': ['A6', 'I6', 'X5'],
  'D2-061': ['X1', 'X2', 'X3', 'X4', 'X6'],
};

function actualRequirementPasses(
  id: PersonalWorkspacePocP3GRequirementId,
  evidence: PersonalWorkspacePocP3GManualEvidence[],
): boolean {
  switch (id) {
    case 'V41-062':
      return anyPass(evidence, isActualAndroid, ['A1', 'A2', 'A3', 'A4']);
    case 'V41-063':
      return anyPass(evidence, isActualIos, ['I1', 'I2', 'I3', 'I4']);
    case 'V41-064':
      return anyPass(
        evidence,
        (entry) => isActualAndroid(entry) && entry.assistiveTechnology === 'talkback',
        ['X1', 'X2', 'X3', 'X6', 'X7'],
      ) && anyPass(
        evidence,
        (entry) => isActualIos(entry) && entry.assistiveTechnology === 'voiceover',
        ['X1', 'X2', 'X3', 'X6', 'X7'],
      ) && anyPass(
        evidence,
        (entry) => (isActualAndroid(entry) || isActualIos(entry)) && entry.textScale === 'maximum',
        ['X5'],
      ) && anyPass(
        evidence,
        (entry) => isManualDesktop(entry) && entry.browserZoomPercent >= 200,
        ['X5'],
      );
    case 'V41-066':
      return anyPass(evidence, isActualAndroid, ['A2', 'A3'])
        && anyPass(evidence, isActualIos, ['I2', 'I3']);
    case 'D2-038':
      return anyPass(evidence, isActualAndroid, ['A5'])
        && anyPass(evidence, isActualIos, ['I5']);
    case 'D2-042':
      return anyPass(evidence, isActualAndroid, ['A6'])
        && anyPass(evidence, isActualIos, ['I6'])
        && anyPass(
          evidence,
          (entry) => isManualDesktop(entry) && entry.browserZoomPercent >= 200,
          ['X5'],
        );
    case 'D2-061':
      return anyPass(
        evidence,
        (entry) => isActualAndroid(entry) && entry.assistiveTechnology === 'talkback',
        ['X1', 'X2', 'X3', 'X4', 'X6'],
      ) && anyPass(
        evidence,
        (entry) => isActualIos(entry) && entry.assistiveTechnology === 'voiceover',
        ['X1', 'X2', 'X3', 'X4', 'X6'],
      );
  }
}

export function evaluatePersonalWorkspacePocP3GReadiness(input: {
  passedAutomationGates: readonly PersonalWorkspacePocP3GAutomationGate[];
  manualEvidence: PersonalWorkspacePocP3GManualEvidence[];
}): PersonalWorkspacePocP3GRequirementEvaluation[] {
  const passedGates = new Set(input.passedAutomationGates);
  const automationPasses = PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES
    .every((gate) => passedGates.has(gate));

  return PERSONAL_WORKSPACE_POC_P3G_REQUIREMENT_IDS.map((id) => {
    const actualPasses = actualRequirementPasses(id, input.manualEvidence);
    const attempted = input.manualEvidence.some((entry) => (
      MANUAL_SCENARIOS_BY_REQUIREMENT[id].some((scenarioId) => entry.results[scenarioId] !== undefined)
    ));
    const actualDevice = actualPasses ? 'PASS' : attempted ? 'FAIL' : 'NOT_RUN';
    return {
      id,
      automation: automationPasses ? 'PASS' : 'FAIL',
      actualDevice,
      promotable: automationPasses && actualPasses,
      reason: !automationPasses
        ? '자동화 준비도 gate가 모두 통과하지 않았습니다.'
        : !actualPasses
          ? '필수 실제 기기·보조기술 근거가 완전하지 않습니다.'
          : 'E4 준비도와 요구된 수동 실제 환경 근거가 모두 통과했습니다.',
    };
  });
}
