import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { deepDiveServices } from './vertical-execution-service-data.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs', 'content-audit');
const assetDir = path.join(docsDir, '2026-07-28-vertical-execution-service-assets');
const logFile = path.join(assetDir, 'capture-log.json');
const concurrency = Math.max(1, Math.min(3, Number(process.env.VERTICAL_CAPTURE_CONCURRENCY || 2)));
const idsArg = process.argv.find((value) => value.startsWith('--ids='));
const filterIds = new Set(
  String(idsArg?.slice('--ids='.length) || process.env.VERTICAL_CAPTURE_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

fs.mkdirSync(assetDir, { recursive: true });

const allJobs = deepDiveServices.flatMap((service) => service.screenshots.map((shot) => ({
  serviceId: service.id,
  serviceName: service.name,
  screenshotId: shot.id,
  title: shot.title,
  url: shot.url,
  evidenceType: shot.evidenceType,
  relativeFile: shot.file,
  file: path.join(docsDir, ...shot.file.split('/')),
})));

const jobs = filterIds.size > 0
  ? allJobs.filter((job) => filterIds.has(job.screenshotId))
  : allJobs;

if (filterIds.size > 0 && jobs.length !== filterIds.size) {
  const found = new Set(jobs.map((job) => job.screenshotId));
  throw new Error(`Unknown capture ids: ${[...filterIds].filter((id) => !found.has(id)).join(', ')}`);
}

async function dismissCommonOverlays(page) {
  const buttonLabels = [
    /accept all/i,
    /accept cookies/i,
    /allow all/i,
    /agree/i,
    /continue without/i,
    /모두 동의/i,
    /동의하고 계속/i,
    /쿠키 허용/i,
    /닫기/i,
  ];

  for (const label of buttonLabels) {
    const button = page.getByRole('button', { name: label }).first();
    try {
      if (await button.isVisible({ timeout: 300 })) {
        await button.click({ timeout: 900 });
        await page.waitForTimeout(200);
      }
    } catch {
      // The capture log preserves any remaining overlay as part of the public-page evidence.
    }
  }
}

function accessStatus({ responseStatus, bodyTextLength, bytes, navigationError, finalUrl }) {
  if (navigationError || (responseStatus !== null && responseStatus >= 400)) return 'access_limited';
  if (/login|sign-in|signin/i.test(finalUrl) && bodyTextLength < 500) return 'access_limited';
  if (bytes < 12_000 || bodyTextLength < 120) return 'access_limited';
  return 'captured_public_surface';
}

const chromeExecutable = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
const browser = await chromium.launch({
  headless: true,
  ...(chromeExecutable && fs.existsSync(chromeExecutable) ? { executablePath: chromeExecutable } : {}),
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
  colorScheme: 'light',
  reducedMotion: 'reduce',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
});

const results = new Array(jobs.length);
let cursor = 0;

async function capture(job, index, workerId) {
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  let responseStatus = null;
  let navigationError = null;
  let pageTitle = '';
  let finalUrl = job.url;
  let bodyTextLength = 0;
  const startedAt = new Date().toISOString();

  try {
    const response = await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35_000 });
    responseStatus = response?.status() ?? null;
  } catch (error) {
    navigationError = String(error?.message || error).slice(0, 600);
  }

  try {
    await dismissCommonOverlays(page);
    await page.waitForTimeout(1800);
    pageTitle = await page.title();
    finalUrl = page.url();
    bodyTextLength = await page.locator('body').innerText({ timeout: 2500 })
      .then((text) => text.length)
      .catch(() => 0);
    await page.screenshot({
      path: job.file,
      type: 'png',
      fullPage: false,
      animations: 'disabled',
    });
  } catch (error) {
    navigationError = navigationError || String(error?.message || error).slice(0, 600);
    try {
      await page.screenshot({
        path: job.file,
        type: 'png',
        fullPage: false,
        animations: 'disabled',
      });
    } catch {
      // Missing files are surfaced by the artifact verifier.
    }
  } finally {
    await page.close();
  }

  const exists = fs.existsSync(job.file);
  const screenshotBytes = exists ? fs.statSync(job.file).size : 0;
  const status = accessStatus({
    responseStatus,
    bodyTextLength,
    bytes: screenshotBytes,
    navigationError,
    finalUrl,
  });

  const result = {
    index: index + 1,
    workerId,
    serviceId: job.serviceId,
    serviceName: job.serviceName,
    screenshotId: job.screenshotId,
    requestedTitle: job.title,
    requestedUrl: job.url,
    finalUrl,
    pageTitle,
    evidenceType: job.evidenceType,
    responseStatus,
    bodyTextLength,
    screenshot: job.relativeFile,
    screenshotBytes,
    status,
    limitation: navigationError,
    startedAt,
    capturedAt: new Date().toISOString(),
    verificationBoundary: '자동 캡처한 공개 화면이다. 로그인 안쪽 기능·개인화 결과·실제 사용자 행동을 검증하지 않는다.',
  };

  console.log(
    `[${String(index + 1).padStart(2, '0')}/${jobs.length}] `
    + `${job.serviceName} | ${responseStatus ?? 'no-status'} | ${status} | ${screenshotBytes} bytes`,
  );
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
  const replacements = new Map(results.map((result) => [result.screenshotId, result]));
  mergedResults = previous.results.map((result) => replacements.get(result.screenshotId) ?? result);
}

const output = {
  schemaVersion: 'flowme-vertical-execution-public-capture-log-v1',
  generatedAt: new Date().toISOString(),
  viewport: { width: 1280, height: 900 },
  note: '자동 캡처는 공개 화면의 존재와 배치 근거다. 실제 사용자 검증이나 in_app_verified 증거가 아니다.',
  counts: {
    total: mergedResults.length,
    filesPresent: mergedResults.filter((result) => result.screenshotBytes > 0).length,
    capturedPublicSurface: mergedResults.filter((result) => result.status === 'captured_public_surface').length,
    accessLimited: mergedResults.filter((result) => result.status === 'access_limited').length,
  },
  results: mergedResults,
};

fs.writeFileSync(logFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ logFile, ...output.counts }, null, 2));
