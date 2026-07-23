import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const assetDir = path.join(root, 'docs', 'content-audit', '2026-07-22-flow-content-demand-business-assets');
fs.mkdirSync(assetDir, { recursive: true });

const targets = [
  {
    id: 'new-ohouse-storage',
    url: 'https://ohou.se/advices/9345',
    anchors: [
      ['metrics', ['684,233', '53,119', '12,986', '398']],
      ['rows', ['쓰레기 봉투', '책상 정리함', '자석 수납']],
    ],
  },
  {
    id: 'new-ohouse-lunchbox',
    url: 'https://ohou.se/advices/9098',
    anchors: [
      ['metrics', ['10,943', '451', '226', '27']],
      ['rows', ['도시락 일주일 식단표', '스팸 볶음밥', '만두 마요 덮밥']],
    ],
  },
  {
    id: 'new-ohouse-remodel',
    url: 'https://ohou.se/advices/1972',
    anchors: [
      ['metrics', ['253,495', '8,029', '2,427', '124']],
      ['rows', ['체크리스트 10', '시공업체 정보를 확인', '표준 계약서 양식']],
    ],
  },
  {
    id: 'support-ohouse-moving',
    url: 'https://ohou.se/advices/8442',
    anchors: [
      ['metrics', ['138,823', '26']],
      ['rows', ['이사 준비 체크리스트', '이사 2주 전', '이사 당일']],
    ],
  },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: 'ko-KR',
  colorScheme: 'light',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
});

async function fetchPublicHtml(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.7',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.text();
}

async function renderSnapshot(target) {
  const html = await fetchPublicHtml(target.url);
  const page = await context.newPage();
  const record = {
    id: target.id,
    sourceUrl: target.url,
    openedAt: new Date().toISOString(),
    captureMethod: 'public_html_snapshot_render',
    screenshots: [],
  };

  try {
    const base = '<base href="https://ohou.se/">';
    const safeHtml = html
      .replace(/<head([^>]*)>/i, `<head$1>${base}`)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    await page.setContent(safeHtml, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(4_000);
    record.title = await page.title();
    record.textLength = (await page.locator('body').innerText()).length;

    const topFile = `${target.id}-snapshot-top.png`;
    await page.screenshot({ path: path.join(assetDir, topFile), animations: 'disabled' });
    record.screenshots.push({ kind: 'top', file: topFile });

    for (const [kind, anchors] of target.anchors) {
      let matchedText = null;
      for (const anchor of anchors) {
        const locator = page.getByText(anchor, { exact: false }).first();
        if (await locator.count().catch(() => 0)) {
          await locator.scrollIntoViewIfNeeded({ timeout: 3_000 }).catch(() => {});
          await page.evaluate(() => window.scrollBy(0, -170)).catch(() => {});
          await page.waitForTimeout(800);
          matchedText = anchor;
          break;
        }
      }
      if (!matchedText) {
        record.screenshots.push({ kind, file: null, limitation: 'anchor_not_found', tried: anchors });
        continue;
      }
      const file = `${target.id}-snapshot-${kind}.png`;
      await page.screenshot({ path: path.join(assetDir, file), animations: 'disabled' });
      record.screenshots.push({ kind, matchedText, file });
    }
  } finally {
    await page.close();
  }

  return record;
}

const results = [];
for (const target of targets) {
  try {
    results.push(await renderSnapshot(target));
  } catch (error) {
    results.push({
      id: target.id,
      sourceUrl: target.url,
      openedAt: new Date().toISOString(),
      captureMethod: 'public_html_snapshot_render',
      error: String(error?.message || error),
      screenshots: [],
    });
  }
}

await browser.close();

const outputPath = path.join(assetDir, 'ohouse-screenshot-evidence-v1.json');
fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, results }, null, 2));
