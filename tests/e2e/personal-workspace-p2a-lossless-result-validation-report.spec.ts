import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const reportPath = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-p2a-lossless-result-validation-ko.html',
);
const reportUrl = pathToFileURL(reportPath).href;
const assetDir = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-03-flowme-integrated-poc-p2a-lossless-result-validation-assets',
);
const manifestPath = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-poc-requirements-traceability-assets',
  'verification-manifest.json',
);
const overridePath = path.join(
  root,
  'docs',
  'specs',
  '2026-09-03-flowme-integrated-poc-lossless-result-closure-v1',
  'current-verdict-overrides.json',
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

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
  version: number;
  generatedAt?: string;
  runs: Array<{ id: string }>;
  browser?: { viewports?: string[] };
};
const verdictConfig = JSON.parse(fs.readFileSync(overridePath, 'utf8')) as {
  beforeP2A: Record<string, unknown>;
  afterP2A: {
    total: {
      total: number;
      satisfied: number;
      partial: number;
      missing: number;
      intentionalChange: number;
      excluded: number;
    };
  };
};
const viewports = (manifest.browser?.viewports ?? []).map((label) => {
  const match = /^(\d+)x(\d+)$/u.exec(label);
  if (!match) throw new Error(`invalid manifest viewport: ${label}`);
  return { label, width: Number(match[1]), height: Number(match[2]) };
});

type ReportWindow = Window & typeof globalThis & {
  __p2aReportStorageCalls: string[];
};

async function installReadOnlyStorageLedger(page: Page) {
  await page.addInitScript(() => {
    const reportWindow = window as ReportWindow;
    reportWindow.__p2aReportStorageCalls = [];
    Storage.prototype.setItem = function setItem() {
      reportWindow.__p2aReportStorageCalls.push('setItem');
    };
    Storage.prototype.removeItem = function removeItem() {
      reportWindow.__p2aReportStorageCalls.push('removeItem');
    };
    Storage.prototype.clear = function clear() {
      reportWindow.__p2aReportStorageCalls.push('clear');
    };
  });
}

test.describe('P2-A 무손실 결과 검증 보고서', () => {
  test('판정 JSON과 manifest를 그대로 반영하고 저장을 호출하지 않는다', async ({ page }) => {
    expect(fs.existsSync(reportPath)).toBe(true);
    expect(fs.existsSync(standalonePath)).toBe(true);
    expect(fs.existsSync(tracePath)).toBe(true);

    const source = fs.readFileSync(reportPath, 'utf8');
    const scripts = Array.from(source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gu))
      .map((match) => match[1])
      .join('\n');
    expect(scripts).not.toMatch(/localStorage\.(?:setItem|removeItem|clear)/u);

    await installReadOnlyStorageLedger(page);
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(reportUrl);
    await expect(page.getByRole('heading', { name: 'P2-A 무손실 결과 검증' })).toBeVisible();
    await expect(page.getByText('수동 검토 동반물입니다', { exact: false })).toBeVisible();

    const reportData = JSON.parse(await page.locator('#report-data').textContent() ?? '{}');
    expect(reportData.beforeP2A).toEqual(verdictConfig.beforeP2A);
    expect(reportData.afterP2A).toEqual(verdictConfig.afterP2A);
    expect(reportData.manifestVersion).toBe(manifest.version);
    expect(reportData.manifestRunCount).toBe(manifest.runs.length);
    expect(reportData.viewports).toEqual(manifest.browser?.viewports ?? []);

    const after = verdictConfig.afterP2A.total;
    await expect(page.locator('#hero-satisfied')).toHaveText(`${after.satisfied} / ${after.total}`);
    await expect(page.locator('#metric-satisfied')).toHaveText(String(after.satisfied));
    await expect(page.locator('#metric-partial')).toHaveText(String(after.partial));
    await expect(page.locator('#metric-missing')).toHaveText(String(after.missing));
    await expect(page.locator('#metric-intentionalChange')).toHaveText(String(after.intentionalChange));
    await expect(page.locator('#metric-excluded')).toHaveText(String(after.excluded));

    await expect(page.locator('.requirement-card[data-kind="promoted"]')).toHaveCount(3);
    await expect(page.locator('.requirement-card[data-kind="partial"]')).toHaveCount(3);
    await expect(page.locator('.requirement-card[data-kind="promoted"] .req-id')).toHaveText([
      'D1-020',
      'D2-024',
      'D2-025',
    ]);
    await expect(page.locator('.requirement-card[data-kind="partial"] .req-id')).toHaveText([
      'D2-017',
      'D2-020',
      'D2-023',
    ]);

    await page.getByRole('button', { name: '부분 유지 3', exact: true }).click();
    await expect(page.locator('.requirement-card:visible')).toHaveCount(3);
    await expect(page.locator('#requirement-count')).toHaveText('3건 표시');
    await page.getByRole('button', { name: '전체 6', exact: true }).click();
    await expect(page.locator('.requirement-card:visible')).toHaveCount(6);

    await expect(page.locator('#lossless')).toContainText('31개 canonical corpus');
    await expect(page.locator('#lossless')).toContainText('generated Item 0');
    await expect(page.locator('#downloads')).toContainText('text/plain;charset=utf-8');
    await expect(page.locator('#downloads')).toContainText('text/csv;charset=utf-8');
    await expect(page.locator('#boundary')).toContainText('localStorage.clear()');

    await expect(page.locator('#open-standalone')).toHaveAttribute(
      'href',
      './2026-09-02-flowme-integrated-flow-poc-standalone-ko.html',
    );
    await expect(page.locator('#open-trace')).toHaveAttribute(
      'href',
      './2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html',
    );
    await expect(page.locator('#manifest-version')).toHaveText(`v${manifest.version}`);
    await expect(page.locator('#manifest-run-count')).toHaveText(`${manifest.runs.length}개`);
    await expect(page.locator('#tests > .run-table-wrap .run-row')).toHaveCount(
      reportData.focusRunIds.length,
    );

    expect(await page.evaluate(() => (
      window as ReportWindow
    ).__p2aReportStorageCalls)).toEqual([]);
    expect(browserErrors).toEqual([]);
  });

  test('manifest viewport 전부에서 넘침·가려진 핵심 링크·브라우저 오류가 없다', async ({ page }) => {
    test.setTimeout(120_000);
    expect(viewports.length).toBeGreaterThan(0);
    fs.mkdirSync(assetDir, { recursive: true });
    await installReadOnlyStorageLedger(page);
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(reportUrl);
      await expect(page.getByRole('heading', { name: 'P2-A 무손실 결과 검증' })).toBeVisible();

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
          && Boolean(hit && (hit === element || element.contains(hit)));
      }), `${viewport.label} primary action visible and clickable`).toBe(true);

      if (viewport.label === '390x844' || viewport.label === '1440x900') {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: path.join(assetDir, `report-${viewport.label}.png`),
          fullPage: false,
        });
      }
    }

    expect(await page.evaluate(() => (
      window as ReportWindow
    ).__p2aReportStorageCalls)).toEqual([]);
    expect(browserErrors).toEqual([]);
  });
});
