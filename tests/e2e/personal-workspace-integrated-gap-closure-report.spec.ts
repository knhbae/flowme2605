import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { expect, test } from '@playwright/test';

const root = process.cwd();
const reportPath = path.join(
  root,
  'docs',
  'content-audit',
  '2026-09-02-flowme-integrated-poc-gap-closure-report-ko.html',
);
const reportUrl = pathToFileURL(reportPath).href;
const requiredLinks = [
  '2026-09-02-flowme-integrated-flow-poc-standalone-ko.html',
  '2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html',
  '2026-09-02-flowme-integrated-poc-gap-closure-plan-ko.html',
];

test.describe('통합 PoC 단계별 구현·검증 보고서', () => {
  test('세 결과물, 단계, 시나리오, 증거, 경계를 한 로컬 문서에서 탐색한다', async ({ page }) => {
    expect(existsSync(reportPath)).toBe(true);
    requiredLinks.forEach((name) => {
      expect(existsSync(path.join(root, 'docs', 'content-audit', name)), name).toBe(true);
    });
    const source = readFileSync(reportPath, 'utf8');
    const scripts = Array.from(source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gu))
      .map((match) => match[1])
      .join('\n');
    expect(scripts).not.toMatch(/localStorage\.(?:setItem|removeItem|clear)/u);

    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(reportUrl);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('세 결과물을 하나의 격리된');
    const skipLink = page.getByRole('link', { name: '단계별 결과로 이동' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#stages')).toBeFocused();
    await expect(page.locator('.stage')).toHaveCount(7);
    await expect(page.locator('.source-card')).toHaveCount(3);
    await expect(page.locator('.scenario')).toHaveCount(8);
    await expect(page.getByText('commit', { exact: true })).toBeVisible();
    await expect(page.getByText('관찰 사용자', { exact: true }).last()).toBeVisible();

    await page.getByRole('button', { name: '개발 1' }).click();
    const visibleRows = page.locator('.matrix tbody tr[data-product]:visible');
    expect(await visibleRows.count()).toBeGreaterThan(0);
    await expect(visibleRows.first()).toHaveAttribute('data-product', /D1/u);
    await expect(page.locator('#filter-result')).toContainText(`개발 1 요구 묶음 ${await visibleRows.count()}개`);
    await page.getByRole('button', { name: '전체' }).click();
    await expect(page.locator('.matrix tbody tr[data-product]:visible')).toHaveCount(8);
    expect(errors).toEqual([]);
  });

  test('필수 다섯 viewport에서 가로 넘침과 가려진 첫 행동이 없다', async ({ page }) => {
    const viewports = [
      { width: 390, height: 844 },
      { width: 375, height: 812 },
      { width: 844, height: 390 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ];
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(reportUrl);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${viewport.width}x${viewport.height}`).toBe(true);
      if (viewport.width <= 900) {
        expect(await page.getByRole('columnheader').count(), `${viewport.width}x${viewport.height}: table headers remain in the accessibility tree`).toBeGreaterThanOrEqual(4);
      }
      const action = page.getByRole('link', { name: '직접 조작하는 HTML' });
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
    expect(errors).toEqual([]);
  });
});
