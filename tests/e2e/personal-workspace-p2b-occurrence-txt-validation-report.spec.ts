import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const reportPath = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-p2b-occurrence-txt-validation-ko.html',
);
const reportUrl = pathToFileURL(reportPath).href;
const assetDir = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-p2b-occurrence-txt-validation-ko-assets',
);
const dataPath = path.join(assetDir, 'report-data.json');
const stylePath = path.join(assetDir, 'style.css');
const builderPath = path.join(assetDir, 'build-report.cjs');
const verdictPath = path.join(
  root,
  'docs',
  'specs',
  '2026-09-03-flowme-integrated-poc-occurrence-txt-closure-v1',
  'current-verdict-overrides.json',
);
const manifestPath = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-poc-requirements-traceability-assets',
  'verification-manifest.json',
);
const standalonePath = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-flow-poc-standalone-ko.html',
);
const tracePath = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html',
);

type Run = {
  id: string;
  status?: string;
  passed?: number;
  failed?: number;
  p2bFailures?: number;
  knownBaselineFailures?: number;
  tests?: number;
  staticPages?: number;
  localLinks?: number;
};

type Gate = {
  id: string;
  label: string;
  runIds: string[];
  match?: 'all';
};

type ReportDataSource = {
  stage: string;
  requirementIds: string[];
  verificationGates: Gate[];
  supplementalRunIds: string[];
  scenarios: Array<{ id: string }>;
  manifestOutputs: Array<{ name: string }>;
  viewports: Array<{ label: string; width: number; height: number }>;
  txtContract: {
    version: number;
    propertyOrder: string[];
  };
};

type Manifest = {
  version: number;
  runs: Run[];
};

type ReportWindow = Window & typeof globalThis & {
  __p2bReportStorageCalls: string[];
};

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as ReportDataSource;
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
const verdicts = JSON.parse(fs.readFileSync(verdictPath, 'utf8')) as {
  beforeP2B: { total: { total: number; satisfied: number } };
  afterP2B: { total: { total: number; satisfied: number } };
};

type VerificationState = 'passed' | 'conditional' | 'pending' | 'failed';

function runState(run: Run | undefined): VerificationState {
  if (!run) return 'pending';
  if ((run.status === 'FAIL' || run.status === 'KNOWN_BASELINE_FAILURE'
    || run.status === 'PASS_WITH_KNOWN_BASELINE_FAILURE')
    && Number(run.p2bFailures) === 0 && Number(run.knownBaselineFailures) > 0) {
    return 'conditional';
  }
  if (run.status === 'FAIL' || Number(run.failed) > 0) return 'failed';
  if (run.status === 'PASS' || (Number.isInteger(run.passed) && Number(run.failed) === 0)) {
    return 'passed';
  }
  return 'pending';
}

const runsById = new Map(manifest.runs.map((run) => [run.id, run]));
const expectedGateStates = data.verificationGates.map((gate) => {
  const matching = gate.runIds.map((id) => runsById.get(id)).filter(Boolean) as Run[];
  const selected = gate.match === 'all' ? matching : matching.slice(0, 1);
  const missing = gate.match === 'all'
    ? gate.runIds.filter((id) => !runsById.has(id))
    : selected.length === 0 ? gate.runIds : [];
  const states = selected.map(runState);
  const state: VerificationState = states.includes('failed')
    ? 'failed'
    : missing.length > 0 || states.includes('pending') || selected.length === 0
      ? 'pending'
      : states.includes('conditional') ? 'conditional' : 'passed';
  return { id: gate.id, state };
});
const anyFailed = expectedGateStates.some((gate) => gate.state === 'failed');
const allResolved = expectedGateStates.every(
  (gate) => gate.state === 'passed' || gate.state === 'conditional',
);
const anyConditional = expectedGateStates.some((gate) => gate.state === 'conditional');
const expectedOverall = anyFailed
  ? 'failed'
  : !allResolved ? 'pending' : anyConditional ? 'conditional' : 'passed';
const expectedOverallLabel = expectedOverall === 'passed'
  ? '검증 완료'
  : expectedOverall === 'conditional'
    ? '검증 완료 · 기존 회귀 1건'
    : expectedOverall === 'failed' ? '검증 실패' : '검증 대기';
const closureStates = expectedGateStates
  .filter((gate) => ['model', 'standalone', 'browser', 'full', 'build'].includes(gate.id))
  .map((gate) => gate.state);
const closureAccepted = closureStates.every(
  (state) => state === 'passed' || state === 'conditional',
);
const expectedRequirementLabel = closureStates.includes('failed')
  ? '판정 보류'
  : closureAccepted
    ? closureStates.includes('conditional') ? '충족 확인 · 기존 결함 별도' : '충족 확인'
    : '승격 후보 · 검증 대기';

function totalForRun(run: Run) {
  return run.tests ?? run.staticPages ?? run.localLinks ?? ((run.passed ?? 0) + (run.failed ?? 0));
}

async function installReadOnlyStorageLedger(page: Page) {
  await page.addInitScript(() => {
    const reportWindow = window as ReportWindow;
    reportWindow.__p2bReportStorageCalls = [];
    Storage.prototype.setItem = function setItem() {
      reportWindow.__p2bReportStorageCalls.push('setItem');
    };
    Storage.prototype.removeItem = function removeItem() {
      reportWindow.__p2bReportStorageCalls.push('removeItem');
    };
    Storage.prototype.clear = function clear() {
      reportWindow.__p2bReportStorageCalls.push('clear');
    };
  });
}

test.describe('P2-B 반복 회차·완전 TXT 검증 보고서', () => {
  test('정본·manifest 상태를 반영하고 대기 검증을 PASS로 만들거나 storage를 쓰지 않는다', async ({ page }) => {
    for (const requiredPath of [
      reportPath,
      dataPath,
      stylePath,
      builderPath,
      verdictPath,
      manifestPath,
      standalonePath,
      tracePath,
    ]) expect(fs.existsSync(requiredPath), requiredPath).toBe(true);

    const source = fs.readFileSync(reportPath, 'utf8');
    const executableScripts = Array.from(
      source.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/gu),
    ).map((match) => match[1]).join('\n');
    expect(executableScripts).not.toMatch(/localStorage\.(?:setItem|removeItem|clear)/u);

    await installReadOnlyStorageLedger(page);
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(reportUrl);
    await expect(page.getByRole('heading', { name: /반복 회차와 완전 TXT/u })).toBeVisible();
    await expect(page.locator('#overall-status')).toHaveText(expectedOverallLabel);

    const embedded = JSON.parse(await page.locator('#report-data').textContent() ?? '{}') as {
      stage: string;
      overallState: string;
      allClosureAccepted: boolean;
      beforeP2B: unknown;
      afterP2B: unknown;
      requirementIds: string[];
      gates: Array<{ id: string; state: string }>;
      viewports: unknown[];
      manifestVersion: number;
    };
    expect(embedded.stage).toBe(data.stage);
    expect(embedded.overallState).toBe(expectedOverall);
    expect(embedded.beforeP2B).toEqual(verdicts.beforeP2B);
    expect(embedded.afterP2B).toEqual(verdicts.afterP2B);
    expect(embedded.requirementIds).toEqual(['D2-017', 'D2-020']);
    expect(embedded.gates.map(({ id, state }) => ({ id, state }))).toEqual(expectedGateStates);
    expect(embedded.viewports).toEqual(data.viewports);
    expect(embedded.manifestVersion).toBe(manifest.version);

    if (expectedOverall === 'pending') {
      await expect(page.locator('.hero-status')).toContainText('필수 실행 기록이 모두 모일 때까지');
    }
    await expect(page.locator('.requirement .status')).toHaveText([
      expectedRequirementLabel,
      expectedRequirementLabel,
    ]);

    await expect(page.locator('.requirement')).toHaveCount(2);
    await expect(page.locator('.req-id')).toHaveText(['D2-017', 'D2-020']);
    await expect(page.locator('.decision')).toHaveCount(3);
    await expect(page.locator('.output-stack article')).toHaveCount(4);
    await expect(page.locator('.output-stack article strong')).toHaveText(
      data.manifestOutputs.map((output) => output.name),
    );
    await expect(page.locator('#manifest')).toContainText('sourceItemRef');
    await expect(page.locator('#manifest')).toContainText('occurrenceId');
    await expect(page.locator('#txt')).toContainText('UTF-8');
    await expect(page.locator('#txt')).toContainText('BOM');
    await expect(page.locator('#txt')).toContainText('마지막 개행');
    await expect(page.locator('.property-order li')).toHaveCount(data.txtContract.propertyOrder.length);
    await expect(page.locator('.scenario-row')).toHaveCount(data.scenarios.length);
    await expect(page.locator('.supplemental-runs article')).toHaveCount(data.supplementalRunIds.length);
    await expect(page.locator('.supplemental-count')).toHaveText(
      data.supplementalRunIds.map((id) => {
        const run = runsById.get(id);
        return run ? `${run.passed} / ${totalForRun(run)}` : '0 / —';
      }),
    );
    await expect(page.locator('#boundary')).toContainText('byte-for-byte');
    await expect(page.locator('#limits')).toContainText('실제 Android Chrome');
    await expect(page.locator('#limits')).toContainText('실제 iOS Safari');
    await expect(page.locator('#limits')).toContainText('관찰 사용자');
    await expect(page.locator('#limits')).toContainText('commit');
    await expect(page.locator('#limits')).toContainText('Production');

    await expect(page.locator('#open-standalone')).toHaveAttribute(
      'href',
      './2026-09-02-flowme-integrated-flow-poc-standalone-ko.html',
    );
    await expect(page.locator('#open-trace')).toHaveAttribute(
      'href',
      './2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html',
    );

    const pendingCount = expectedGateStates.filter((gate) => gate.state === 'pending').length;
    if (pendingCount > 0) {
      await page.getByRole('button', { name: `대기 ${pendingCount}`, exact: true }).click();
      await expect(page.locator('.gate-row:visible')).toHaveCount(pendingCount);
      await expect(page.locator('#gate-count')).toHaveText(`${pendingCount}건 표시`);
      await page.getByRole('button', { name: `전체 ${data.verificationGates.length}`, exact: true }).click();
      await expect(page.locator('.gate-row:visible')).toHaveCount(data.verificationGates.length);
    }

    expect(await page.evaluate(() => (
      window as ReportWindow
    ).__p2bReportStorageCalls)).toEqual([]);
    expect(browserErrors).toEqual([]);
  });

  test('6개 화면에서 가로 넘침·깨진 이미지·가려진 핵심 링크·브라우저 오류가 없다', async ({ page }) => {
    test.setTimeout(120_000);
    await installReadOnlyStorageLedger(page);
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    for (const viewport of data.viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(reportUrl);
      await expect(page.getByRole('heading', { name: /반복 회차와 완전 TXT/u })).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);

      const brokenImages = await page.locator('img').evaluateAll((images) => images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute('src')));
      expect(brokenImages, `${viewport.label} broken images`).toEqual([]);

      const primaryAction = page.locator('#open-standalone');
      await primaryAction.scrollIntoViewIfNeeded();
      expect(await primaryAction.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
        const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
        const hit = document.elementFromPoint(x, y);
        return rect.width > 0
          && rect.height >= 44
          && rect.left >= -1
          && rect.right <= window.innerWidth + 1
          && Boolean(hit && (hit === element || element.contains(hit)));
      }), `${viewport.label} primary action visible and clickable`).toBe(true);

      const txtSample = page.locator('.txt-sample');
      await txtSample.scrollIntoViewIfNeeded();
      expect(await txtSample.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.left >= -1 && rect.right <= window.innerWidth + 1;
      }), `${viewport.label} TXT sample stays inside viewport`).toBe(true);
    }

    expect(await page.evaluate(() => (
      window as ReportWindow
    ).__p2bReportStorageCalls)).toEqual([]);
    expect(browserErrors).toEqual([]);
  });
});
