import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildV2AcceptanceMatrixResults,
  runV2AutomatedAcceptanceScenario,
  V2_AUTOMATED_ACCEPTANCE_IDS,
  V2_BROWSER_QA_IDS,
} from '../../../scripts/content-audit/build-text-authoring-v2-acceptance-results';
import { exportTextAuthoringMarkdown } from './markdown-roundtrip';
import { createTextAuthoringDocument } from './parser';

type V2Contract = {
  compatibility: {
    read: string[];
    plainBulletReadCompatibility: string;
    numberedListReadCompatibility: string;
  };
  titleOwnership: {
    sourceOfTruthWhenH1Present: string;
    fallbackWhenH1Missing: string;
  };
  roundTripAcceptance: {
    gate: string;
    requiredEqual: string[];
    transformedMarkdownByteIdentityRequired: boolean;
  };
};

function readV2Contract(): V2Contract {
  return JSON.parse(readFileSync(new URL(
    '../../../docs/specs/2026-07-28-flowme-text-authoring-ux-v1/text-authoring-contract-v2.json',
    import.meta.url,
  ), 'utf8')) as V2Contract;
}

test('v2 contract reads plain and numbered lists only as compatibility input and writes canonical Items', () => {
  const contract = readV2Contract();
  assert.ok(contract.compatibility.read.includes('일반 - 항목 bullet 목록 가져오기'));
  assert.ok(contract.compatibility.read.includes('1. 또는 2) 번호 목록 가져오기'));
  assert.match(contract.compatibility.plainBulletReadCompatibility, /writer는 - \[ \]/u);
  assert.match(contract.compatibility.numberedListReadCompatibility, /writer는 번호를 보존 문법으로 쓰지 않고 - \[ \]/u);

  const plain = createTextAuthoringDocument([
    '# 일반 bullet 호환',
    '## 준비',
    '- 일반 항목',
    '  설명: 기존 설명',
  ].join('\n'), { now: '2026-08-04T00:00:00.000Z' });
  const numbered = createTextAuthoringDocument([
    '# 번호 목록 호환',
    '## 준비',
    '1. 번호 항목',
  ].join('\n'), { now: '2026-08-04T00:00:00.000Z' });

  assert.deepEqual(
    plain.parseResult.canonical.items.map((item) => item.title),
    ['일반 항목'],
  );
  assert.deepEqual(
    numbered.parseResult.canonical.items.map((item) => item.title),
    ['번호 항목'],
  );
  const plainMarkdown = exportTextAuthoringMarkdown(plain);
  const numberedMarkdown = exportTextAuthoringMarkdown(numbered);
  assert.match(plainMarkdown, /^- \[ \] 일반 항목$/mu);
  assert.match(plainMarkdown, /^  - 설명: 기존 설명$/mu);
  assert.doesNotMatch(plainMarkdown, /^- 일반 항목$/mu);
  assert.match(numberedMarkdown, /^- \[ \] 번호 항목$/mu);
  assert.doesNotMatch(numberedMarkdown, /^1\. 번호 항목$/mu);
});

test('v2 contract makes source H1 authoritative and defines the golden round-trip semantically', () => {
  const contract = readV2Contract();
  assert.equal(contract.titleOwnership.sourceOfTruthWhenH1Present, 'source_text_h1');
  assert.equal(contract.titleOwnership.fallbackWhenH1Missing, 'document_title_field');
  assert.equal(contract.roundTripAcceptance.gate, 'semantic_equivalence');
  assert.equal(
    contract.roundTripAcceptance.transformedMarkdownByteIdentityRequired,
    false,
  );
  assert.ok(contract.roundTripAcceptance.requiredEqual.includes('flow.title'));
  assert.ok(contract.roundTripAcceptance.requiredEqual.includes('item.schedule'));
  assert.ok(contract.roundTripAcceptance.requiredEqual.includes('item.resources'));

  const document = createTextAuthoringDocument([
    '# 원문 제목',
    '- 기준일: 2026-08-10',
    '',
    '## 준비',
    '- [ ] 예약 확인',
    '  - 설명: 예약 정보를 확인합니다.',
    '  - 날짜: 2026-08-03',
    '  - 자료: [예약 안내](https://example.com/booking)',
  ].join('\n'), {
    title: '별도 제목 필드',
    now: '2026-08-04T00:00:00.000Z',
  });
  const reparsed = createTextAuthoringDocument(
    exportTextAuthoringMarkdown(document),
    { now: '2026-08-04T00:01:00.000Z' },
  );
  const semantics = (value: typeof document) => ({
    title: value.parseResult.canonical.flow.title,
    steps: value.parseResult.canonical.steps.map((step) => step.title),
    items: value.parseResult.canonical.items.map((item) => ({
      title: item.title,
      detail: item.detail,
      schedule: item.schedule,
      resources: item.resources.map(({ label, url }) => ({ label, url })),
    })),
  });

  assert.equal(document.title, '원문 제목');
  assert.deepEqual(semantics(reparsed), semantics(document));
});

for (const id of V2_AUTOMATED_ACCEPTANCE_IDS) {
  test(`${id} executes the v2 simulation-matrix contract through product APIs`, () => {
    const result = runV2AutomatedAcceptanceScenario(id);
    const failedEvidence = result.evidence.filter((entry) => !entry.pass);

    assert.equal(
      result.pass,
      true,
      JSON.stringify({ id, failedEvidence }, null, 2),
    );
    assert.equal(result.status, 'passed');
    assert.equal(result.mode, 'api_acceptance');
    assert.ok(Object.keys(result.actual).length > 0);
    assert.ok(result.apis.length > 0);
  });
}

test('the generated result matrix preserves all 35 source rows one-to-one', () => {
  const result = buildV2AcceptanceMatrixResults({ uiEvidencePath: null });
  const rows = result.rows as Array<{
    id: string;
    mode: string;
    actual: unknown;
    pass: boolean | null;
    status: string;
    evidence: unknown[];
  }>;
  const expectedIds = [
    ...V2_AUTOMATED_ACCEPTANCE_IDS,
    ...V2_BROWSER_QA_IDS,
  ];

  assert.equal(rows.length, 35);
  assert.deepEqual(rows.map((row) => row.id), expectedIds);
  assert.equal(new Set(rows.map((row) => row.id)).size, 35);
  rows.forEach((row) => {
    assert.ok(row.mode);
    assert.notEqual(row.actual, undefined);
    assert.ok(Array.isArray(row.evidence));
    assert.ok(row.evidence.length > 0);
  });

  const automatedRows = rows.slice(0, V2_AUTOMATED_ACCEPTANCE_IDS.length);
  automatedRows.forEach((row) => {
    assert.equal(row.mode, 'api_acceptance');
    assert.equal(row.pass, true);
    assert.equal(row.status, 'passed');
  });

  const browserRows = rows.slice(V2_AUTOMATED_ACCEPTANCE_IDS.length);
  assert.deepEqual(browserRows.map((row) => row.id), V2_BROWSER_QA_IDS);
  browserRows.forEach((row) => {
    assert.equal(row.mode, 'browser_qa');
    assert.equal(row.pass, null);
    assert.equal(row.status, 'pending_browser_qa');
  });
});

function uiChecks(
  failedId?: (typeof V2_BROWSER_QA_IDS)[number],
): Array<Record<string, unknown>> {
  return V2_BROWSER_QA_IDS.map((id, index) => ({
    id,
    target: index % 2 === 0 ? 'route' : 'both',
    viewport: id === 'U08' ? 'all' : '390x844',
    action: `${id} 동작 실행`,
    expected: `${id} 기대값`,
    observed: `${id} 관찰값`,
    passed: id !== failedId,
  }));
}

test('optional UI evidence merges U01-U08 and updates the combined summary', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'flowme-v2-ui-evidence-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const evidencePath = join(directory, 'ui-simulation-evidence.json');
  writeFileSync(evidencePath, JSON.stringify({
    schemaVersion: 'flowme-text-authoring-ui-simulation-v2',
    executedAt: '2026-08-04T01:00:00.000Z',
    browser: 'test-browser',
    checks: uiChecks('U04'),
    screenshots: ['u01.png'],
  }), 'utf8');

  const result = buildV2AcceptanceMatrixResults({
    uiEvidencePath: evidencePath,
  });
  const rows = result.rows as Array<{
    id: string;
    mode: string;
    actual: Record<string, unknown>;
    pass: boolean | null;
    status: string;
    evidence: Array<Record<string, unknown>>;
  }>;
  const browserRows = rows.filter((row) => row.mode === 'browser_qa');
  const summary = result.summary as Record<string, number>;
  const uiEvidence = result.uiEvidence as Record<string, unknown>;

  assert.deepEqual(browserRows.map((row) => row.id), V2_BROWSER_QA_IDS);
  assert.equal(browserRows.filter((row) => row.pass === true).length, 7);
  assert.deepEqual(
    browserRows.find((row) => row.id === 'U04'),
    {
      id: 'U04',
      group: 'responsive_ux',
      priority: 'blocker',
      title: '짧은 화면 스크롤',
      mode: 'browser_qa',
      actual: {
        target: 'both',
        viewport: '390x844',
        action: 'U04 동작 실행',
        expected: 'U04 기대값',
        observed: 'U04 관찰값',
      },
      pass: false,
      status: 'failed',
      evidence: [{
        source: evidencePath.replaceAll('\\', '/'),
        checkId: 'U04',
        passed: false,
        actual: {
          target: 'both',
          viewport: '390x844',
          action: 'U04 동작 실행',
          expected: 'U04 기대값',
          observed: 'U04 관찰값',
        },
        capture: {
          schemaVersion: 'flowme-text-authoring-ui-simulation-v2',
          executedAt: '2026-08-04T01:00:00.000Z',
          browser: 'test-browser',
          screenshots: ['u01.png'],
        },
      }],
      apis: [],
    },
  );
  assert.equal(summary.total, 35);
  assert.equal(summary.apiPassed, 27);
  assert.equal(summary.browserPassed, 7);
  assert.equal(summary.browserFailed, 1);
  assert.equal(summary.passed, 34);
  assert.equal(summary.failed, 1);
  assert.equal(summary.pendingBrowserQa, 0);
  assert.equal(uiEvidence.status, 'attached');
  assert.equal(uiEvidence.checkCount, 8);
});

test('a missing optional UI evidence file keeps all U rows pending', () => {
  const result = buildV2AcceptanceMatrixResults({
    uiEvidencePath: join(tmpdir(), 'flowme-v2-ui-evidence-does-not-exist.json'),
  });
  const rows = result.rows as Array<{
    id: string;
    mode: string;
    pass: boolean | null;
    status: string;
  }>;
  const browserRows = rows.filter((row) => row.mode === 'browser_qa');
  const summary = result.summary as Record<string, number>;

  assert.equal(browserRows.length, 8);
  browserRows.forEach((row) => {
    assert.equal(row.pass, null);
    assert.equal(row.status, 'pending_browser_qa');
  });
  assert.equal(summary.browserPassed, 0);
  assert.equal(summary.browserFailed, 0);
  assert.equal(summary.pendingBrowserQa, 8);
});

test('UI evidence rejects missing, duplicate, and unexpected U ids', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'flowme-v2-ui-invalid-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const evidencePath = join(directory, 'ui-simulation-evidence.json');
  const invalidCases = [
    {
      label: 'missing',
      checks: uiChecks().slice(0, -1),
      message: /missing UI evidence ids: U08/u,
    },
    {
      label: 'duplicate',
      checks: [...uiChecks(), uiChecks()[0]],
      message: /duplicate UI evidence id: U01/u,
    },
    {
      label: 'unexpected',
      checks: [...uiChecks().slice(0, -1), {
        id: 'U09',
        passed: true,
      }],
      message: /unexpected UI evidence id: U09/u,
    },
  ];

  for (const invalid of invalidCases) {
    writeFileSync(evidencePath, JSON.stringify({ checks: invalid.checks }), 'utf8');
    assert.throws(
      () => buildV2AcceptanceMatrixResults({ uiEvidencePath: evidencePath }),
      invalid.message,
      invalid.label,
    );
  }
});
