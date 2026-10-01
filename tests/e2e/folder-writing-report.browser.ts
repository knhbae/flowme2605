import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const REPORT = path.join(ROOT, 'docs/content-audit/2026-10-01-flowme-folder-writing-review-ko.html');
const ORIGIN = 'http://127.0.0.1:3192';
const REPORT_PATH = '/docs/content-audit/2026-10-01-flowme-folder-writing-review-ko.html';
const EXPECTED_GROUPS = { all: 21, new: 4, regression: 8, followup: 9 };
const EXPECTED_VIEWPORTS = ['390×844', '375×812', '844×390', '1024×768', '1440×900'];
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function localFile(urlPath: string) {
  const resolved = path.resolve(ROOT, '.' + decodeURIComponent(urlPath));
  const relative = path.relative(ROOT, resolved);
  return relative.startsWith('..') || path.isAbsolute(relative) ? null : resolved;
}

test('final report DOM, filters, local references, layout and synthetic network boundary', async ({ page, context }, info) => {
  const originalBytes = readFileSync(REPORT);
  const requests: { url: string; method: string; action: string }[] = [];
  const blockedRequests: string[] = [];
  const apiRequests: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const storageWrites: { method: string; key: string | null }[] = [];
  const filterCounts: Record<string, number> = {};
  let geometry: unknown = null;
  let links: { href: string; file: string | null; exists: boolean }[] = [];
  let dom: unknown = null;
  let outcome = 'incomplete';
  let failure: string | null = null;

  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.exposeFunction('__folderReportStorageWrite', (event: { method: string; key: string | null }) => storageWrites.push(event));
  await page.addInitScript(() => {
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      Storage.prototype[method] = function (key?: string) {
        (window as any).__folderReportStorageWrite({ method, key: key ?? null });
        throw Error('report storage mutation forbidden');
      } as any;
    }
  });
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const entry = { url: url.href, method: request.method(), action: 'blocked' };
    requests.push(entry);
    if (/\/(?:api|auth)(?:\/|$)|supabase|cloudflareaccess/i.test(url.href)) apiRequests.push(url.href);
    if (url.origin !== ORIGIN || request.method() !== 'GET' || apiRequests.includes(url.href)) {
      blockedRequests.push(url.href);
      await route.abort('blockedbyclient');
      return;
    }
    if (url.pathname === REPORT_PATH) {
      entry.action = 'synthetic-report-fulfill';
      await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: originalBytes });
      return;
    }
    if (url.pathname === '/favicon.ico') {
      entry.action = 'synthetic-empty-favicon-fulfill';
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    const file = localFile(url.pathname);
    if (file && existsSync(file) && /\.(?:css|js|png|jpe?g|gif|webp|svg|woff2?|ttf)$/i.test(file)) {
      entry.action = 'synthetic-local-asset-fulfill';
      await route.fulfill({ status: 200, path: file });
      return;
    }
    blockedRequests.push(url.href);
    await route.abort('blockedbyclient');
  });

  try {
    await page.goto(ORIGIN + REPORT_PATH, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('main')).toHaveCount(1);
    for (const slot of ['completion', 'feedback', 'verification', 'geometry']) {
      await expect(page.locator(`[data-slot="${slot}"]`)).toHaveCount(1);
      expect((await page.locator(`[data-slot="${slot}"]`).textContent())?.trim()).toBeTruthy();
    }

    const hrefs = await page.locator('a[href]').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href')!));
    links = hrefs.filter(href => !/^(?:https?:|mailto:|tel:|data:)/i.test(href)).map(href => {
      const url = new URL(href, ORIGIN + REPORT_PATH);
      const file = url.origin === ORIGIN ? localFile(url.pathname) : null;
      return { href, file, exists: file !== null && existsSync(file) };
    });
    expect(links.length).toBeGreaterThan(0);
    expect(links.filter(link => !link.exists)).toEqual([]);
    expect(hrefs.filter(href => /^file:/i.test(href))).toEqual([]);

    dom = await page.evaluate(() => ({
      slots: [...document.querySelectorAll('[data-slot]')].map(el => el.getAttribute('data-slot')),
      feedbackNumbers: [...document.querySelectorAll('[data-slot="feedback"] tbody tr')].map(row => row.querySelector('td')?.textContent?.trim()),
      geometryViewports: [...document.querySelectorAll('[data-slot="geometry"] tbody tr')].map(row => row.querySelector('td')?.textContent?.trim()),
      placeholders: (document.body.textContent ?? '').match(/대기|\bTODO\b|\bTBD\b|\b[Pp]laceholder\b|\b[Pp]ending\b/g) ?? [],
      brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src),
    }));
    const currentDom = dom as { feedbackNumbers: string[]; geometryViewports: string[]; placeholders: string[]; brokenImages: string[] };
    expect(currentDom.feedbackNumbers).toEqual(Array.from({ length: 21 }, (_, index) => String(index + 1)));
    expect(currentDom.geometryViewports).toEqual(EXPECTED_VIEWPORTS);
    expect(currentDom.brokenImages).toEqual([]);

    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('first-viewport.png') });
    await page.screenshot({ path: info.outputPath('full-page.png'), fullPage: true });
    geometry = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      outsideViewport: [...document.querySelectorAll('main, h1, h2, h3, p, a, button, table, td, img')].filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
      }).map(el => ({ tag: el.tagName, text: el.textContent?.trim().slice(0, 100) })),
    }));
    expect((geometry as { horizontalOverflow: number }).horizontalOverflow).toBeLessThanOrEqual(0);
    expect((geometry as { outsideViewport: unknown[] }).outsideViewport).toEqual([]);

    for (const [group, count] of Object.entries(EXPECTED_GROUPS)) {
      await page.locator(`button[data-filter="${group}"]`).click();
      await expect(page.locator(`button[data-filter="${group}"]`)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#count')).toHaveText(`${count}개 표시`);
      filterCounts[group] = await page.locator('[data-slot="feedback"] tbody tr:visible').count();
      expect(filterCounts[group]).toBe(count);
      await expect(page.locator('button[data-filter][aria-pressed="true"]')).toHaveCount(1);
      if (group !== 'all') expect(await page.locator('[data-slot="feedback"] tbody tr:visible').evaluateAll((rows, selectedGroup) => rows.every(row => row.getAttribute('data-group') === selectedGroup), group)).toBe(true);
    }
    await page.locator('button[data-filter="all"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-slot="feedback"] tbody tr:visible')).toHaveCount(21);
    await expect(page.locator('#count')).toHaveText('21개 표시');
    expect(currentDom.placeholders, 'final report must contain no waiting placeholders').toEqual([]);
    expect(blockedRequests).toEqual([]);
    expect(apiRequests).toEqual([]);
    expect(storageWrites).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(hash(readFileSync(REPORT))).toBe(hash(originalBytes));
    outcome = 'passed';
  } catch (error) {
    outcome = 'failed';
    failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    writeFileSync(info.outputPath('report-dom-evidence.json'), JSON.stringify({
      report: REPORT,
      reportSha256: hash(originalBytes),
      reportBytesUnchanged: hash(readFileSync(REPORT)) === hash(originalBytes),
      project: info.project.name,
      syntheticOrigin: ORIGIN,
      networkPassThroughCount: 0,
      actualAuthApiPassThroughCount: 0,
      filterCounts,
      geometry,
      links,
      dom,
      requests,
      blockedRequests,
      apiRequests,
      storageWrites,
      consoleErrors,
      pageErrors,
      outcome,
      failure,
    }, null, 2));
  }
});
