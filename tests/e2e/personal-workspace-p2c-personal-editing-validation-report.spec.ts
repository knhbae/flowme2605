import { expect, test, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const reportPath = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-p2c-personal-editing-validation-ko.html',
);
const reportUrl = pathToFileURL(reportPath).href;
const assetDir = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-p2c-personal-editing-validation-ko-assets',
);
const dataPath = path.join(assetDir, 'report-data.json');
const stylePath = path.join(assetDir, 'style.css');
const builderPath = path.join(assetDir, 'build-report.cjs');
const specDir = path.join(
  root,
  'docs',
  'specs',
  '2026-09-03-flowme-integrated-poc-personal-editing-closure-v1',
);
const verdictPath = path.join(specDir, 'current-verdict-overrides.json');
const traceAssetDir = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-poc-requirements-traceability-assets',
);
const thisRunPath = path.join(traceAssetDir, 'requirements-this-run-p2c.json');
const manifestPath = path.join(traceAssetDir, 'verification-manifest.json');
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

type VerificationState = 'passed' | 'conditional' | 'pending' | 'failed';

type Run = {
  id: string;
  command?: string;
  status?: string;
  tests?: number;
  staticPages?: number;
  localLinks?: number;
  passed?: number;
  failed?: number;
  knownBaselineFailures?: number;
  p2cFailures?: number;
  stageFailures?: number;
  viewports?: string[];
  horizontalOverflowFailures?: number;
  consoleErrors?: number;
  pageErrors?: number;
  writesOutsideAllowedPrefix?: number;
  removesOutsideAllowedPrefix?: number;
  clearCalls?: number;
  operatingSnapshotByteIdentical?: boolean;
  nonPocSnapshotByteIdentical?: boolean;
};

type Gate = {
  id: string;
  label: string;
  runIds: string[];
  requiresStorageBoundary?: boolean;
  requiresViewports?: boolean;
};

type ReportData = {
  stage: string;
  requirementIds: string[];
  verificationGates: Gate[];
  supplementalRunIds: string[];
  overallEvidenceRunIds: string[];
  scenarios: Array<{ id: string }>;
  viewports: Array<{ label: string; width: number; height: number }>;
  authoringCatalog: {
    groups: Array<{ name: string; properties: string[] }>;
    inline: string[];
    dependent: string[];
    reentry: string[];
  };
};

type ReportWindow = Window & typeof globalThis & {
  __p2cReportStorageCalls: string[];
};

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as ReportData;
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
  version: number;
  runs: Run[];
};
const verdicts = JSON.parse(fs.readFileSync(verdictPath, 'utf8')) as {
  beforeP2C: { total: Record<string, number> };
  afterP2C: { total: Record<string, number> };
  overrides: Array<{ id: string; to: string; verificationRunIds: string[] }>;
};
const thisRun = JSON.parse(fs.readFileSync(thisRunPath, 'utf8')) as Array<{
  id: string;
  status: string;
}>;
const runsById = new Map(manifest.runs.map((run) => [run.id, run]));
const requiredViewports = data.viewports.map(({ label }) => label.replace('×', 'x'));
const stateRank: Record<VerificationState, number> = {
  passed: 0,
  conditional: 1,
  pending: 2,
  failed: 3,
};

function baseRunState(run: Run | undefined): VerificationState {
  if (!run) return 'pending';
  const knownBaseline = Number(run.knownBaselineFailures ?? 0);
  const p2cFailures = Number(run.p2cFailures ?? run.stageFailures ?? 0);
  if (
    ['KNOWN_BASELINE_FAILURE', 'PASS_WITH_KNOWN_BASELINE_FAILURE'].includes(run.status ?? '')
    && knownBaseline > 0
    && p2cFailures === 0
  ) return 'conditional';
  if (run.status === 'FAIL' && knownBaseline > 0 && p2cFailures === 0) return 'conditional';
  if (run.status === 'FAIL' || Number(run.failed) > 0) return 'failed';
  if (run.status === 'PASS' || (Number.isInteger(run.passed) && Number(run.failed) === 0)) {
    return 'passed';
  }
  return 'pending';
}

function mergeStates(states: VerificationState[]): VerificationState {
  return states.reduce(
    (worst, state) => (stateRank[state] > stateRank[worst] ? state : worst),
    'passed',
  );
}

function storageState(run: Run | undefined): VerificationState {
  const fields: Array<keyof Run> = [
    'writesOutsideAllowedPrefix',
    'removesOutsideAllowedPrefix',
    'clearCalls',
  ];
  if (fields.some((field) => !Number.isInteger(run?.[field]))) return 'pending';
  if (fields.some((field) => run?.[field] !== 0)) return 'failed';
  if (run?.operatingSnapshotByteIdentical === false || run?.nonPocSnapshotByteIdentical === false) {
    return 'failed';
  }
  if (run?.operatingSnapshotByteIdentical !== true && run?.nonPocSnapshotByteIdentical !== true) {
    return 'pending';
  }
  return 'passed';
}

function viewportState(run: Run | undefined): VerificationState {
  if (!Array.isArray(run?.viewports)) return 'pending';
  if (!requiredViewports.every((label) => run.viewports?.includes(label))) return 'pending';
  const fields: Array<keyof Run> = [
    'horizontalOverflowFailures',
    'consoleErrors',
    'pageErrors',
  ];
  if (fields.some((field) => !Number.isInteger(run[field]))) return 'pending';
  if (fields.some((field) => run[field] !== 0)) return 'failed';
  return 'passed';
}

function runSetState(runIds: string[], options: Partial<Gate> = {}): VerificationState {
  const runs = runIds.map((id) => runsById.get(id));
  const states = runs.map(baseRunState);
  if (options.requiresStorageBoundary) states.push(...runs.map(storageState));
  if (options.requiresViewports) states.push(...runs.map(viewportState));
  return mergeStates(states);
}

function runCount(run: Run | undefined) {
  const total = run?.tests ?? run?.staticPages ?? run?.localLinks;
  return Number.isInteger(total) ? `${run?.passed ?? 0} / ${total}` : '0 / —';
}

const expectedGates = data.verificationGates.map((gate) => ({
  id: gate.id,
  state: runSetState(gate.runIds, gate),
  runIds: gate.runIds,
}));
const expectedOverallEvidence = runSetState(data.overallEvidenceRunIds);
const expectedOverall = mergeStates([
  ...expectedGates.map(({ state }) => state),
  expectedOverallEvidence,
]);
const expectedOverallLabel = expectedOverall === 'passed'
  ? '검증 완료'
  : expectedOverall === 'conditional'
    ? '검증 완료 · 기존 결함 별도'
    : expectedOverall === 'failed' ? '검증 실패' : '검증 대기';

function requirementState(runIds: string[]): VerificationState {
  const states = runIds.map((id) => baseRunState(runsById.get(id)));
  states.push(...runIds
    .filter((id) => /(?:react|standalone)-browser-focused/u.test(id))
    .map((id) => storageState(runsById.get(id))));
  states.push(...runIds
    .filter((id) => /five-viewport-browser/u.test(id))
    .map((id) => viewportState(runsById.get(id))));
  return mergeStates(states);
}

async function installReadOnlyStorageLedger(page: Page) {
  await page.addInitScript(() => {
    const reportWindow = window as ReportWindow;
    reportWindow.__p2cReportStorageCalls = [];
    Storage.prototype.setItem = function setItem() {
      reportWindow.__p2cReportStorageCalls.push('setItem');
    };
    Storage.prototype.removeItem = function removeItem() {
      reportWindow.__p2cReportStorageCalls.push('removeItem');
    };
    Storage.prototype.clear = function clear() {
      reportWindow.__p2cReportStorageCalls.push('clear');
    };
  });
}

async function expectClickable(locator: Locator, label: string) {
  await locator.scrollIntoViewIfNeeded();
  expect(await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
    const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
    const hit = document.elementFromPoint(x, y);
    return rect.width > 0
      && rect.height >= 38
      && rect.left >= -1
      && rect.right <= window.innerWidth + 1
      && Boolean(hit && (hit === element || element.contains(hit)));
  }), label).toBe(true);
}

test.describe('P2-C 개인 편집 검증 보고서', () => {
  test('정본·요구·manifest를 대조하고 필터·링크를 제공하며 storage를 쓰지 않는다', async ({ page }) => {
    for (const requiredPath of [
      reportPath,
      dataPath,
      stylePath,
      builderPath,
      path.join(specDir, 'spec.md'),
      verdictPath,
      thisRunPath,
      manifestPath,
      standalonePath,
      tracePath,
    ]) expect(fs.existsSync(requiredPath), requiredPath).toBe(true);

    expect(data.stage).toBe('P2-C');
    expect(data.requirementIds).toEqual(['D1-012', 'D2-021', 'D2-035', 'D2-036', 'D2-039']);
    expect(thisRun.map(({ id }) => id)).toEqual(data.requirementIds);
    expect(thisRun.filter(({ status }) => status === 'P2-C 충족')).toHaveLength(4);
    expect(thisRun.filter(({ status }) => status === 'P2-C 의도적 변경')).toHaveLength(1);
    expect(verdicts.beforeP2C.total).toEqual({
      total: 168, satisfied: 124, partial: 18, missing: 4, intentionalChange: 10, excluded: 12,
    });
    expect(verdicts.afterP2C.total).toEqual({
      total: 168, satisfied: 128, partial: 13, missing: 4, intentionalChange: 11, excluded: 12,
    });
    expect(data.authoringCatalog.groups.flatMap(({ properties }) => properties)).toHaveLength(16);

    const plannedRunIds = [...new Set(verdicts.overrides.flatMap(({ verificationRunIds }) => verificationRunIds))].sort();
    expect([...new Set(data.verificationGates.flatMap(({ runIds }) => runIds))].sort()).toEqual(plannedRunIds);

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
    await expect(page.getByRole('heading', { name: /개인 편집은/u })).toBeVisible();
    await expect(page.locator('#overall-status')).toHaveText(expectedOverallLabel);

    const embedded = JSON.parse(await page.locator('#report-data').textContent() ?? '{}') as {
      stage: string;
      manifestVersion: number;
      overallState: VerificationState;
      beforeP2C: Record<string, number>;
      afterP2C: Record<string, number>;
      requirementIds: string[];
      requirements: Array<{ id: string; state: VerificationState; targetKind: string; runIds: string[] }>;
      gates: Array<{ id: string; state: VerificationState; runIds: string[] }>;
      plannedRunIds: string[];
      overallEvidenceRunIds: string[];
      overallEvidenceState: VerificationState;
      viewports: unknown[];
    };
    expect(embedded.stage).toBe('P2-C');
    expect(embedded.manifestVersion).toBe(manifest.version);
    expect(embedded.overallState).toBe(expectedOverall);
    expect(embedded.beforeP2C).toEqual(verdicts.beforeP2C.total);
    expect(embedded.afterP2C).toEqual(verdicts.afterP2C.total);
    expect(embedded.requirementIds).toEqual(data.requirementIds);
    expect(embedded.gates).toEqual(expectedGates);
    expect(embedded.plannedRunIds).toEqual(plannedRunIds);
    expect(embedded.overallEvidenceRunIds).toEqual(data.overallEvidenceRunIds);
    expect(embedded.overallEvidenceState).toBe(expectedOverallEvidence);
    expect(embedded.viewports).toEqual(data.viewports);

    for (const override of verdicts.overrides) {
      expect(embedded.requirements.find(({ id }) => id === override.id)?.state).toBe(
        requirementState(override.verificationRunIds),
      );
    }

    await expect(page.locator('.requirement')).toHaveCount(5);
    await expect(page.locator('.req-id')).toHaveText(data.requirementIds);
    await expect(page.locator('.catalog-groups section')).toHaveCount(4);
    await expect(page.locator('.catalog-groups section > strong')).toHaveText([
      '일정',
      '실행',
      '내용',
      '더 보기',
    ]);
    await expect(page.locator('.catalog-groups section > p')).toHaveText([
      '날짜 · 기준일 기준 날짜 · 시간 · 시간대 · 장소 · 소요 시간 · 반복 · 반복 종료',
      '완료 기준 · 조건 메모 · 하위 체크',
      '설명 · 관련 링크 · 안내 · 주의',
      '원문 출처',
    ]);
    await expect(page.locator('.surface-compare')).toContainText('단순 inline');
    await expect(page.locator('.surface-compare')).toContainText('dependent');
    await expect(page.locator('.shadow-store')).toContainText('PersonalPlanOverlay.sectionTitles');
    await expect(page.locator('.ownership-contract')).toContainText('역수정하지 않는다');
    await expect(page.locator('.scenario-row')).toHaveCount(data.scenarios.length);
    await expect(page.locator('.viewport-grid article')).toHaveCount(5);
    await expect(page.locator('.supplemental-runs article')).toHaveCount(data.supplementalRunIds.length);
    await expect(page.locator('.supplemental-count')).toHaveText(
      data.supplementalRunIds.map((id) => runCount(runsById.get(id))),
    );
    await expect(page.locator('.requirement[data-state="pending"]')).toHaveCount(
      embedded.requirements.filter(({ state }) => state === 'pending').length,
    );
    await expect(page.locator('.gate-row[data-state="pending"]')).toHaveCount(
      expectedGates.filter(({ state }) => state === 'pending').length,
    );
    await expect(page.locator('.supplemental-runs article .state-pending')).toHaveCount(
      data.supplementalRunIds.filter((id) => baseRunState(runsById.get(id)) === 'pending').length,
    );
    await expect(page.locator('#boundary')).toContainText('byte-for-byte');
    await expect(page.locator('#boundary')).toContainText('실제 Android Chrome');
    await expect(page.locator('#boundary')).toContainText('실제 iOS Safari');
    await expect(page.locator('#boundary')).toContainText('관찰 사용자');
    await expect(page.locator('#boundary')).toContainText('Production');

    await expect(page.locator('#open-standalone')).toHaveAttribute(
      'href',
      './2026-09-02-flowme-integrated-flow-poc-standalone-ko.html',
    );
    await expect(page.locator('#open-trace')).toHaveAttribute(
      'href',
      './2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html',
    );
    await expect(page.locator('#open-spec')).toHaveAttribute(
      'href',
      '../specs/2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md',
    );
    await expect(page.locator('#open-evidence')).toHaveAttribute(
      'href',
      './2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-this-run-p2c.json',
    );

    await page.getByRole('button', { name: '충족 4', exact: true }).click();
    await expect(page.locator('.requirement:visible')).toHaveCount(4);
    await expect(page.locator('#visible-count')).toHaveText('4건 표시');
    await page.getByRole('button', { name: '의도적 변경 1', exact: true }).click();
    await expect(page.locator('.requirement:visible')).toHaveCount(1);
    await expect(page.locator('.requirement:visible .req-id')).toHaveText('D2-021');
    await page.getByRole('group', { name: '목표 판정' })
      .getByRole('button', { name: '전체 5', exact: true })
      .click();

    const pendingRequirements = embedded.requirements.filter(({ state }) => state === 'pending').length;
    await page.locator('#state-filter').selectOption('pending');
    await expect(page.locator('.requirement:visible')).toHaveCount(pendingRequirements);
    await page.locator('#state-filter').selectOption('all');

    const pendingGates = expectedGates.filter(({ state }) => state === 'pending').length;
    await page.getByRole('button', { name: `대기 ${pendingGates}`, exact: true }).click();
    await expect(page.locator('.gate-row:visible')).toHaveCount(pendingGates);
    await page.getByRole('group', { name: '검증 게이트 필터' })
      .getByRole('button', { name: `전체 ${data.verificationGates.length}`, exact: true })
      .click();

    expect(await page.evaluate(() => (
      window as ReportWindow
    ).__p2cReportStorageCalls)).toEqual([]);
    expect(browserErrors).toEqual([]);
  });

  test('필수 5개 화면에서 넘침·오류가 없고 핵심 링크·필터·요구 행을 가리지 않는다', async ({ page }) => {
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
      await expect(page.getByRole('heading', { name: /개인 편집은/u })).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);

      const brokenImages = await page.locator('img').evaluateAll((images) => images
        .map((image) => image as HTMLImageElement)
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute('src')));
      expect(brokenImages, `${viewport.label} broken images`).toEqual([]);

      await expectClickable(page.locator('#open-standalone'), `${viewport.label} standalone link`);
      await expectClickable(
        page.getByRole('button', { name: '충족 4', exact: true }),
        `${viewport.label} requirement filter`,
      );
      await expectClickable(page.locator('#open-spec'), `${viewport.label} spec link`);

      const firstRequirement = page.locator('.requirement').first();
      const summary = firstRequirement.locator('summary');
      await expectClickable(summary, `${viewport.label} requirement row`);
      await summary.click();
      await expect(firstRequirement.locator('.requirement-body')).toBeVisible();
    }

    expect(await page.evaluate(() => (
      window as ReportWindow
    ).__p2cReportStorageCalls)).toEqual([]);
    expect(browserErrors).toEqual([]);
  });
});
