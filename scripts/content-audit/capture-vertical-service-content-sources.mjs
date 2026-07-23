import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { services } from './vertical-service-content-atlas-data.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs', 'content-audit');
const assetDir = path.join(docsDir, 'assets', '2026-07-22-flowme-vertical-service-content-coverage-atlas');
const logFile = path.join(assetDir, 'capture-log.json');
const concurrency = Math.max(1, Math.min(4, Number(process.env.ATLAS_CAPTURE_CONCURRENCY || 3)));

fs.mkdirSync(assetDir, { recursive: true });

const allJobs = services.flatMap((service) => service.samples.map((sample, index) => ({
  serviceId: service.id,
  serviceName: service.name,
  contentId: sample.id,
  title: sample.title,
  url: sample.url,
  file: path.join(docsDir, ...service.screenshotFiles[index].split('/')),
  relativeFile: service.screenshotFiles[index],
})));
const filterIds = new Set(String(process.env.ATLAS_CAPTURE_IDS || '').split(',').map((value) => value.trim()).filter(Boolean));
const jobs = filterIds.size > 0 ? allJobs.filter((job) => filterIds.has(job.contentId)) : allJobs;

if (filterIds.size > 0 && jobs.length !== filterIds.size) {
  const found = new Set(jobs.map((job) => job.contentId));
  throw new Error(`Unknown capture ids: ${[...filterIds].filter((id) => !found.has(id)).join(', ')}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
  colorScheme: 'light',
  reducedMotion: 'reduce',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
});

const results = new Array(jobs.length);
let cursor = 0;

async function dismissCommonOverlays(page) {
  const labels = [
    /accept all/i,
    /accept cookies/i,
    /allow all/i,
    /동의하고 계속/i,
    /모두 동의/i,
    /쿠키 허용/i,
    /닫기/i,
  ];
  for (const label of labels) {
    const button = page.getByRole('button', { name: label }).first();
    try {
      if (await button.isVisible({ timeout: 350 })) {
        await button.click({ timeout: 800 });
        await page.waitForTimeout(200);
        return;
      }
    } catch {
      // Cross-origin and delayed consent layers are recorded in the screenshot.
    }
  }
}

async function capture(job, index, workerId) {
  const page = await context.newPage();
  page.setDefaultTimeout(2500);
  let responseStatus = null;
  let navigationError = null;
  let title = '';
  let finalUrl = job.url;
  let bodyTextLength = 0;
  const startedAt = new Date().toISOString();

  try {
    const response = await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    responseStatus = response?.status() ?? null;
  } catch (error) {
    navigationError = String(error?.message || error).slice(0, 500);
  }

  try {
    await dismissCommonOverlays(page);
    await page.waitForTimeout(1600);
    title = await page.title();
    finalUrl = page.url();
    bodyTextLength = await page.locator('body').innerText({ timeout: 2000 }).then((text) => text.length).catch(() => 0);
    await page.screenshot({ path: job.file, type: 'png', fullPage: false, animations: 'disabled' });
  } catch (error) {
    navigationError = navigationError || String(error?.message || error).slice(0, 500);
    try {
      await page.screenshot({ path: job.file, type: 'png', fullPage: false, animations: 'disabled' });
    } catch {
      // The missing file is surfaced by the build and render checks.
    }
  } finally {
    await page.close();
  }

  const exists = fs.existsSync(job.file);
  const bytes = exists ? fs.statSync(job.file).size : 0;
  const likelyContent = exists && bytes > 12_000 && bodyTextLength > 120 && (responseStatus === null || responseStatus < 400);
  const result = {
    index: index + 1,
    workerId,
    serviceId: job.serviceId,
    serviceName: job.serviceName,
    contentId: job.contentId,
    requestedTitle: job.title,
    requestedUrl: job.url,
    finalUrl,
    pageTitle: title,
    responseStatus,
    bodyTextLength,
    screenshot: job.relativeFile,
    screenshotBytes: bytes,
    likelyContent,
    limitation: navigationError,
    startedAt,
    capturedAt: new Date().toISOString(),
  };

  console.log(`[${String(index + 1).padStart(2, '0')}/${jobs.length}] ${job.serviceName} · ${responseStatus ?? 'no-status'} · ${likelyContent ? 'content' : 'review'} · ${bytes} bytes`);
  return result;
}

async function worker(workerId) {
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= jobs.length) return;
    results[index] = await capture(jobs[index], index, workerId);
  }
}

try {
  await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index + 1)));
} finally {
  await browser.close();
}

let mergedResults = results;
if (filterIds.size > 0 && fs.existsSync(logFile)) {
  const previous = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  const replacements = new Map(results.map((result) => [result.contentId, result]));
  mergedResults = previous.results.map((result) => replacements.get(result.contentId) ?? result);
}

const output = {
  schemaVersion: 'flowme-atlas-source-capture-log-v1',
  generatedAt: new Date().toISOString(),
  viewport: { width: 1280, height: 800 },
  note: '자동 브라우저 캡처이며 실제 사용자 검증이 아니다. likelyContent=false는 보고서에서 접근 한계로 표시해야 한다.',
  counts: {
    total: mergedResults.length,
    filesPresent: mergedResults.filter((result) => result.screenshotBytes > 0).length,
    likelyContent: mergedResults.filter((result) => result.likelyContent).length,
    needsReview: mergedResults.filter((result) => !result.likelyContent).length,
  },
  results: mergedResults,
};

fs.writeFileSync(logFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ logFile, ...output.counts }, null, 2));
