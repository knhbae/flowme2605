import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORT_PATH = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html',
);
const REPORT_URL = pathToFileURL(REPORT_PATH).href;
const DATA_DIR = path.join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-poc-requirements-traceability-assets',
);
const VERDICT_OVERRIDE_PATHS = [
  '2026-09-03-flowme-integrated-poc-lossless-result-closure-v1',
  '2026-09-03-flowme-integrated-poc-occurrence-txt-closure-v1',
  '2026-09-03-flowme-integrated-poc-personal-editing-closure-v1',
].map((specDirectory) => path.join(
  process.cwd(),
  'docs',
  'specs',
  specDirectory,
  'current-verdict-overrides.json',
));
const REQUIRED_VIEWPORTS = [
  { label: '390x844', width: 390, height: 844 },
  { label: '375x812', width: 375, height: 812 },
  { label: '844x390', width: 844, height: 390 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '1440x900', width: 1440, height: 900 },
];
const EXPECTED_SOURCE_COUNTS = { V41: 78, D1: 26, D2: 64, BP: 86 } as const;

type VerificationManifest = {
  version: number;
  coverage: {
    primaryVerdictStage: string;
    currentPrimaryGaps: number;
    currentPrimaryVerdicts: Record<string, number>;
    currentSubcheckVerdicts: Record<string, number>;
  };
  runs: Array<{
    id: string;
    tests?: number;
    passed: number;
    failed: number;
    status?: string;
    stoppedEarly?: boolean;
    groups?: number | Record<string, unknown>;
    failure?: Record<string, string>;
  }>;
};

function embeddedReportData(): {
  verificationManifest: VerificationManifest;
  provenance: { requirementHash: string };
} {
  const html = fs.readFileSync(REPORT_PATH, 'utf8');
  const match = /<script id="trace-data" type="application\/json">([\s\S]*?)<\/script>/u.exec(html);
  if (!match) throw new Error('requirements report is missing embedded trace data');
  return JSON.parse(match[1]) as {
    verificationManifest: VerificationManifest;
    provenance: { requirementHash: string };
  };
}

type Requirement = Readonly<{
  id: string;
  product: 'V41' | 'D1' | 'D2' | 'BP';
  verdict: string;
  decision: string;
  journey: string;
  priority: string;
}>;

function requirements(): Requirement[] {
  const rows = ['requirements-v41.json', 'requirements-d1.json', 'requirements-d2.json', 'requirements-bp.json']
    .flatMap((file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) as Requirement[]);
  const overrides = VERDICT_OVERRIDE_PATHS.flatMap((file) => (
    JSON.parse(fs.readFileSync(file, 'utf8')) as {
      overrides: Array<{ id: string; from: string; to: string }>;
    }
  ).overrides);
  return rows.map((row) => overrides
    .filter((override) => override.id === row.id)
    .reduce((current, override) => {
      expect(current.verdict).toBe(override.from);
      return { ...current, verdict: override.to };
    }, row));
}

function verificationManifest(): VerificationManifest {
  return embeddedReportData().verificationManifest;
}

function requirementHash(): string {
  return embeddedReportData().provenance.requirementHash;
}

test('requirements report preserves three outputs separately from bridge contracts, filters atomic rows, and writes no storage', async ({ page }) => {
  test.setTimeout(90_000);
  const rows = requirements();
  const manifest = verificationManifest();
  const errors: string[] = [];

  await page.addInitScript(() => {
    type TraceWindow = Window & typeof globalThis & {
      __traceReportStorageCalls: Array<{ method: string; key?: string }>;
    };
    const traceWindow = window as TraceWindow;
    traceWindow.__traceReportStorageCalls = [];
    Storage.prototype.setItem = function setItem(key: string) {
      traceWindow.__traceReportStorageCalls.push({ method: 'setItem', key });
    };
    Storage.prototype.removeItem = function removeItem(key: string) {
      traceWindow.__traceReportStorageCalls.push({ method: 'removeItem', key });
    };
    Storage.prototype.clear = function clear() {
      traceWindow.__traceReportStorageCalls.push({ method: 'clear' });
    };
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REPORT_URL);
  await expect(page.getByRole('heading', { name: /세 결과물을 한 행씩/u })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '요구사항 목록으로 이동' })).toBeFocused();
  await expect(page.getByLabel('결과물')).toBeVisible();
  await expect(page.getByLabel('판정', { exact: true })).toBeVisible();
  await expect(page.getByLabel('결정 상태', { exact: true })).toBeVisible();
  expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  for (const [product, count] of Object.entries(EXPECTED_SOURCE_COUNTS)) {
    expect(rows.filter((row) => row.product === product).length, `${product} atomic requirement count`).toBe(count);
  }
  await expect(page.locator('#primary-count')).toHaveText(String(rows.filter((row) => row.product !== 'BP').length));
  await expect(page.locator('#primary-count')).toHaveText('168');
  await expect(page.locator('#bridge-count')).toHaveText(String(rows.filter((row) => row.product === 'BP').length));
  await expect(page.locator('#pass-count')).toHaveText('128');
  await expect(page.locator('#gap-count')).toHaveText('17');
  await expect(page.locator('#boundary-count')).toHaveText('23');
  await expect(page.locator('#requirement-hash')).toHaveText(`${requirementHash().slice(0, 16)}…`);
  expect(manifest.version).toBe(4);
  expect(manifest.coverage.primaryVerdictStage).toBe('P2-C');
  expect(manifest.coverage.currentPrimaryGaps).toBe(17);
  expect(manifest.coverage.currentPrimaryVerdicts).toEqual({
    fulfilled: 128,
    partial: 13,
    missing: 4,
    intentionalChange: 11,
    decisionRequired: 0,
    excluded: 12,
  });
  expect(manifest.coverage.currentSubcheckVerdicts).toEqual({
    fulfilled: 260,
    partial: 58,
    missing: 51,
    intentionalChange: 5,
    decisionRequired: 0,
    excluded: 12,
  });
  await expect(page.locator('#automation-summary')).toContainText('PoC 355/355');
  await expect(page.locator('#automation-summary')).toContainText('P2-A parity 48/48');
  await expect(page.locator('#automation-summary')).toContainText('P2-A browser 30/30');
  await expect(page.locator('#automation-summary')).toContainText('Stage 1 결합 197/197');
  await expect(page.locator('#automation-summary')).toContainText('Stage 1 browser 4/4');
  await expect(page.locator('#automation-summary')).toContainText('Stage 2 browser 11/11 + 통합 3/3');
  await expect(page.locator('#automation-summary')).toContainText('작성 최종 browser 37/37');
  await expect(page.locator('#automation-summary')).toContainText('v4.1 core 13/13');
  await expect(page.locator('#automation-summary')).toContainText('Stage 3 browser 13/13');
  await expect(page.locator('#automation-summary')).toContainText('Stage 4 browser 5/5');
  await expect(page.locator('#automation-summary')).toContainText('standalone model/runtime 54/54 + 24/24');
  await expect(page.locator('#automation-summary')).toContainText('P2-C PoC 388/388');
  await expect(page.locator('#automation-summary')).toContainText('cross 9/9');
  await expect(page.locator('#automation-summary')).toContainText('React browser 3/3 + 5 viewport 1/1');
  await expect(page.locator('#automation-summary')).toContainText('standalone browser 2/2 + 5 viewport 1/1');
  await expect(page.locator('#automation-summary')).toContainText('npm 1652/1653 (FAIL 1 · 중단)');
  await expect(page.locator('#automation-summary')).toContainText('tail 220/220');
  await expect(page.locator('#automation-summary')).toContainText('build 18/18');
  await expect(page.locator('#full-regression-summary')).toHaveText('1652/1653 통과 · 1 실패 · 중단');
  await expect(page.locator('#full-regression-summary')).toHaveAttribute('data-status', 'fail');
  await expect(page.locator('#full-regression-detail')).toContainText('dog-adoption-first-week');
  await expect(page.locator('#full-regression-detail')).toContainText('review_due 2026-06-04');
  await expect(page.locator('#full-regression-detail')).toContainText('전체 npm 성공으로 합산하지 않습니다');
  const fullRegression = manifest.runs.find((run) => run.id === 'p2c-full-regression');
  const regressionTail = manifest.runs.find((run) => run.id === 'p2c-full-regression-tail');
  expect(fullRegression).toMatchObject({ tests: 1653, passed: 1652, failed: 1, status: 'FAIL', stoppedEarly: true });
  expect(fullRegression?.failure).toMatchObject({
    suite: 'seed-flows',
    fixtureId: 'dog-adoption-first-week',
    field: 'review_due',
    value: '2026-06-04',
    classification: 'time-dependent-content-freshness',
  });
  expect(regressionTail).toMatchObject({ tests: 220, passed: 220, failed: 0, status: 'PASS' });
  await expect(page.locator('#security-audit-summary')).toHaveText('FAIL · 2건 (high 1, low 1)');
  await expect(page.locator('#storage-boundary-summary')).toContainText('write/remove 0/0');
  await expect(page.locator('#decision-history')).toContainText('D2-005');
  const d2Comparison = page.locator('#compare article').filter({ hasText: 'D2 · 작성 화면' });
  await expect(d2Comparison).toContainText('React와 standalone은 한 편집기');
  await expect(d2Comparison).toContainText('6개 작성 틀과 picker 예시, 전체 빈칸 ghost/toggle');
  await expect(d2Comparison).toContainText('browser-native Undo, stable 개인 Flow handoff');
  await expect(d2Comparison).toContainText('문맥형 line helper는 React 전용 P1 경계');
  await expect(page.locator('#visible-count')).toHaveText('168');
  await expect(page.locator('.req:visible')).toHaveCount(168);

  await page.locator('#product-filter').selectOption('all');
  await expect(page.locator('#visible-count')).toHaveText(String(rows.length));

  for (const product of ['V41', 'D1', 'D2', 'BP'] as const) {
    await page.locator('#product-filter').selectOption(product);
    const expected = rows.filter((row) => row.product === product).length;
    await expect(page.locator('#visible-count')).toHaveText(String(expected));
    await expect(page.locator('.req:visible')).toHaveCount(expected);
  }

  await page.getByRole('button', { name: '필터 초기화' }).click();
  await page.locator('#query').fill('D1-003');
  await expect(page.locator('.req:visible')).toHaveCount(1);
  await expect(page.locator('.req:visible summary')).toContainText('D1-003');
  await page.locator('.req:visible summary').click();
  await expect(page.locator('.req:visible .req-body')).toBeVisible();

  await page.getByRole('button', { name: '필터 초기화' }).click();
  await page.locator('#query').fill('D2-058');
  await page.locator('.req:visible summary').click();
  await expect(page.locator('.req:visible .req-subchecks li')).toHaveCount(8);
  await expect(page.locator('.req:visible .req-subchecks')).toContainText('storage failure write 0·rollback');
  await expect(page.locator('.req:visible .req-body')).toContainText('이번 작업: 작성 handoff 부분 개선');

  await page.getByRole('button', { name: '필터 초기화' }).click();
  const partial = rows.filter((row) => row.product !== 'BP' && row.verdict === '부분').length;
  await page.locator('#verdict-filter').selectOption('부분');
  await expect(page.locator('#visible-count')).toHaveText(String(partial));
  await page.getByRole('button', { name: '필터 초기화' }).click();
  const decisionNeeded = rows.filter((row) => row.product !== 'BP' && row.decision.includes('결정')).length;
  await page.locator('#decision-filter').selectOption('충돌');
  await expect(page.locator('#visible-count')).toHaveText(String(decisionNeeded));
  const journeyShortcuts = [
    ['일반 텍스트 입력', '입력'], ['구조 확인·수정', '구조'], ['실제 결과 확인', '결과'],
    ['명시적 저장', '저장'], ['개인공간 찾기', '탐색'], ['Flow·Item 상세', '상세'],
    ['날짜·폴더·순서', '이동'], ['완료·Undo·reload', '복구'],
  ] as const;
  for (const [buttonName, journey] of journeyShortcuts) {
    await page.getByRole('button', { name: '필터 초기화' }).click();
    await page.getByRole('button', { name: new RegExp(buttonName, 'u') }).click();
    const expected = rows.filter((row) => row.product !== 'BP' && row.journey === journey).length;
    await expect(page.locator('#visible-count')).toHaveText(String(expected));
  }

  await page.getByRole('button', { name: '필터 초기화' }).click();
  await page.locator('#priority-filter').selectOption('P2');
  await expect(page.locator('#visible-count')).toHaveText(String(rows.filter((row) => row.product !== 'BP' && row.priority === 'P2').length));
  await page.getByRole('button', { name: '필터 초기화' }).click();
  await page.locator('#query').fill('절대-존재하지-않는-요구');
  await expect(page.locator('.empty-results')).toContainText('맞는 요구가 없습니다');

  const brokenImages = await page.locator('img').evaluateAll((images) => images
    .filter((image) => !image.complete || image.naturalWidth === 0)
    .map((image) => image.getAttribute('src')));
  expect(brokenImages).toEqual([]);
  const storageCalls = await page.evaluate(() => (
    window as Window & typeof globalThis & { __traceReportStorageCalls: Array<{ method: string; key?: string }> }
  ).__traceReportStorageCalls);
  expect(storageCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test('requirements report has no overflow, browser errors, or covered primary action in five viewports', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  const screenshotDir = path.join(
    process.cwd(),
    'docs',
    'content-audit',
    '2026-09-02-flowme-integrated-poc-requirements-traceability-assets',
    'screenshots',
  );
  fs.mkdirSync(screenshotDir, { recursive: true });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const viewport of REQUIRED_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(REPORT_URL);
    await expect(page.getByRole('heading', { name: /세 결과물을 한 행씩/u })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);

    const primaryAction = page.getByRole('link', { name: '요구사항 바로 보기' });
    await primaryAction.scrollIntoViewIfNeeded();
    const clickable = await primaryAction.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      return rect.width > 0 && rect.height > 0 && Boolean(hit && (hit === element || element.contains(hit)));
    });
    expect(clickable, `${viewport.label} primary action is clickable`).toBe(true);

    await primaryAction.click();
    await expect(page.locator('.filter-panel')).toBeVisible();
    const firstRequirement = page.locator('.req').first();
    await firstRequirement.locator('summary').click();
    await expect(firstRequirement.locator('.req-body')).toBeVisible();
    const requirementClickable = await firstRequirement.locator('summary').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      return rect.width > 0 && rect.height > 0 && Boolean(hit && (hit === element || element.contains(hit)));
    });
    expect(requirementClickable, `${viewport.label} requirement row is not covered`).toBe(true);

    await page.screenshot({
      path: path.join(screenshotDir, `trace-${viewport.label}.png`),
      fullPage: false,
    });
  }

  expect(errors).toEqual([]);
});
