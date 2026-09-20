import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES,
  evaluatePersonalWorkspacePocP3GReadiness,
  type PersonalWorkspacePocP3GManualEvidence,
} from './personal-workspace-poc-device-readiness';

function evidence(
  overrides: Partial<PersonalWorkspacePocP3GManualEvidence>,
): PersonalWorkspacePocP3GManualEvidence {
  return {
    schemaVersion: 1,
    environment: 'actual-device',
    physicalDevice: true,
    platform: 'android',
    browser: 'chrome',
    deviceModel: 'Physical test device',
    osVersion: '1.0',
    browserVersion: '1.0',
    buildFingerprint: 'sha256:fixture',
    executedAt: '2026-09-04T00:00:00.000Z',
    assistiveTechnology: 'none',
    textScale: 'default',
    browserZoomPercent: 100,
    results: {},
    artifacts: [],
    ...overrides,
  };
}

test('automation readiness alone never promotes an actual-device requirement', () => {
  const results = evaluatePersonalWorkspacePocP3GReadiness({
    passedAutomationGates: PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES,
    manualEvidence: [],
  });

  assert.equal(results.length, 7);
  assert.ok(results.every((entry) => entry.automation === 'PASS'));
  assert.ok(results.every((entry) => entry.actualDevice === 'NOT_RUN'));
  assert.ok(results.every((entry) => !entry.promotable));
});

test('simulator and browser automation evidence cannot count as E5-D', () => {
  const results = evaluatePersonalWorkspacePocP3GReadiness({
    passedAutomationGates: PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES,
    manualEvidence: [evidence({
      environment: 'simulator',
      physicalDevice: false,
      results: { A1: 'PASS', A2: 'PASS', A3: 'PASS', A4: 'PASS' },
    }), evidence({
      environment: 'browser-automation',
      physicalDevice: false,
      results: { I1: 'PASS', I2: 'PASS', I3: 'PASS', I4: 'PASS' },
    })],
  });

  assert.equal(results.find((entry) => entry.id === 'V41-062')?.promotable, false);
  assert.equal(results.find((entry) => entry.id === 'V41-063')?.promotable, false);
});

test('missing device identity fails closed even when checks say PASS', () => {
  const results = evaluatePersonalWorkspacePocP3GReadiness({
    passedAutomationGates: PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES,
    manualEvidence: [evidence({
      deviceModel: ' ',
      results: { A1: 'PASS', A2: 'PASS', A3: 'PASS', A4: 'PASS' },
    })],
  });

  assert.equal(results.find((entry) => entry.id === 'V41-062')?.actualDevice, 'FAIL');
  assert.equal(results.find((entry) => entry.id === 'V41-062')?.promotable, false);
});

test('Android-only evidence can close Android requirement but not cross-platform touch', () => {
  const results = evaluatePersonalWorkspacePocP3GReadiness({
    passedAutomationGates: PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES,
    manualEvidence: [evidence({
      results: { A1: 'PASS', A2: 'PASS', A3: 'PASS', A4: 'PASS' },
    })],
  });

  assert.equal(results.find((entry) => entry.id === 'V41-062')?.promotable, true);
  assert.equal(results.find((entry) => entry.id === 'V41-066')?.promotable, false);
  assert.equal(results.find((entry) => entry.id === 'V41-063')?.actualDevice, 'NOT_RUN');
});

test('D2-038 and D2-042 use their canonical A5/I5 and A6/I6/X5 mappings', () => {
  const touchAnchorResults = evaluatePersonalWorkspacePocP3GReadiness({
    passedAutomationGates: PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES,
    manualEvidence: [
      evidence({ results: { A5: 'PASS' } }),
      evidence({ platform: 'ios', browser: 'safari', results: { I5: 'PASS' } }),
    ],
  });

  assert.equal(touchAnchorResults.find((entry) => entry.id === 'D2-038')?.promotable, true);
  assert.equal(touchAnchorResults.find((entry) => entry.id === 'D2-042')?.actualDevice, 'NOT_RUN');

  const visualViewportWithoutZoom = evaluatePersonalWorkspacePocP3GReadiness({
    passedAutomationGates: PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES,
    manualEvidence: [
      evidence({ results: { A6: 'PASS' } }),
      evidence({ platform: 'ios', browser: 'safari', results: { I6: 'PASS' } }),
    ],
  });

  assert.equal(visualViewportWithoutZoom.find((entry) => entry.id === 'D2-038')?.actualDevice, 'NOT_RUN');
  assert.equal(visualViewportWithoutZoom.find((entry) => entry.id === 'D2-042')?.actualDevice, 'FAIL');
  assert.equal(visualViewportWithoutZoom.find((entry) => entry.id === 'D2-042')?.promotable, false);

  const visualViewportWithZoom = evaluatePersonalWorkspacePocP3GReadiness({
    passedAutomationGates: PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES,
    manualEvidence: [
      evidence({ results: { A6: 'PASS' } }),
      evidence({ platform: 'ios', browser: 'safari', results: { I6: 'PASS' } }),
      evidence({
        environment: 'desktop-manual',
        physicalDevice: false,
        platform: 'desktop',
        browser: 'chrome',
        browserZoomPercent: 200,
        results: { X5: 'PASS' },
      }),
    ],
  });

  assert.equal(visualViewportWithZoom.find((entry) => entry.id === 'D2-038')?.actualDevice, 'NOT_RUN');
  assert.equal(visualViewportWithZoom.find((entry) => entry.id === 'D2-042')?.promotable, true);
});

test('all seven requirements need complete platform-specific evidence', () => {
  const android = evidence({
    assistiveTechnology: 'talkback',
    textScale: 'maximum',
    results: {
      A1: 'PASS', A2: 'PASS', A3: 'PASS', A4: 'PASS', A5: 'PASS', A6: 'PASS',
      X1: 'PASS', X2: 'PASS', X3: 'PASS', X4: 'PASS', X5: 'PASS', X6: 'PASS', X7: 'PASS',
    },
  });
  const ios = evidence({
    platform: 'ios',
    browser: 'safari',
    assistiveTechnology: 'voiceover',
    textScale: 'maximum',
    results: {
      I1: 'PASS', I2: 'PASS', I3: 'PASS', I4: 'PASS', I5: 'PASS', I6: 'PASS',
      X1: 'PASS', X2: 'PASS', X3: 'PASS', X4: 'PASS', X5: 'PASS', X6: 'PASS', X7: 'PASS',
    },
  });
  const desktopZoom = evidence({
    environment: 'desktop-manual',
    physicalDevice: false,
    platform: 'desktop',
    browser: 'chrome',
    browserZoomPercent: 200,
    results: { X5: 'PASS' },
  });
  const results = evaluatePersonalWorkspacePocP3GReadiness({
    passedAutomationGates: PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES,
    manualEvidence: [android, ios, desktopZoom],
  });

  assert.ok(results.every((entry) => entry.promotable), JSON.stringify(results));
});

test('one failed automation gate blocks promotion even with complete manual evidence', () => {
  const results = evaluatePersonalWorkspacePocP3GReadiness({
    passedAutomationGates: PERSONAL_WORKSPACE_POC_P3G_AUTOMATION_GATES.slice(1),
    manualEvidence: [evidence({
      results: { A1: 'PASS', A2: 'PASS', A3: 'PASS', A4: 'PASS' },
    })],
  });

  assert.ok(results.every((entry) => entry.automation === 'FAIL'));
  assert.ok(results.every((entry) => !entry.promotable));
});
