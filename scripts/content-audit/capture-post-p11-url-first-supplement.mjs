import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const packageName = process.env.FLOWME_EVIDENCE_PACKAGE_NAME || '2026-07-07-claude-design-post-p11-cleanup-review-package';
const outputDir = path.join(repoRoot, 'docs', 'content-audit', packageName);
const screenshotsDir = path.join(outputDir, 'screenshots');
const port = Number(process.env.FLOWME_URL_FIRST_SUPPLEMENT_PORT || '3224');
const baseURL = `http://127.0.0.1:${port}`;
const viewport = { width: 390, height: 844 };
const records = [];

await main();

async function main() {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL, viewport, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });

  try {
    await captureUrlFirstHit(context);
    await captureUrlFirstCustomStart(context);
    await captureUrlFirstMiss(context);
    await captureUrlFirstCandidateHandoff(context);
    await captureUrlFirstLab(context);
    await captureManualRegistrationReport(browser);
  } finally {
    await context.close();
    await browser.close();
    server.kill();
  }

  const evidence = {
    generatedAt: new Date().toISOString(),
    packageName,
    viewport,
    baseURL,
    screenshotCount: records.length,
    scenarios: records,
  };
  fs.writeFileSync(path.join(outputDir, 'url-first-supplement-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${records.length} URL-first supplement screenshots to ${path.relative(repoRoot, outputDir)}`);
}

async function captureUrlFirstHit(context) {
  const page = await newAppPage(context);
  await lookupUrl(page, 'https://mathbang.net/13?utm_source=share');
  await page.getByTestId('flow-url-lookup-result').waitFor({ state: 'visible' });
  await capture(page, '27-url-first-hit-mobile', 'URL-first hit result on /flows', '/flows');
  await page.close();
}

async function captureUrlFirstCustomStart(context) {
  const page = await newAppPage(context);
  await lookupUrl(page, 'https://mathbang.net/13?utm_source=share');
  await page.getByTestId('flow-url-start-mode-custom').click();
  await page.getByTestId('flow-url-custom-start-panel').waitFor({ state: 'visible' });
  await capture(page, '28-url-first-custom-start-mobile', 'URL-first lightweight custom start panel', '/flows');
  await page.close();
}

async function captureUrlFirstMiss(context) {
  const page = await newAppPage(context);
  await lookupUrl(page, 'https://example.com/some-plan?utm_source=newsletter');
  await page.getByTestId('flow-url-supply-candidate-form').waitFor({ state: 'visible' });
  await capture(page, '29-url-first-miss-candidate-form-mobile', 'URL-first miss candidate form', '/flows');
  await page.close();
}

async function captureUrlFirstCandidateHandoff(context) {
  const page = await newAppPage(context);
  await page.evaluate(() => {
    window.localStorage.setItem(
      'flow:url-first:supply-candidates',
      JSON.stringify([
        {
          canonicalUrl: 'https://example.com/source-to-convert',
          originalUrl: 'https://example.com/source-to-convert?utm_source=review',
          title: '새로 보고 싶은 준비 체크리스트',
          memo: 'URL에서 따라 할 순서를 남겨둔 예시',
          status: 'miss_request',
          savedAt: '2026-07-07T00:00:00.000Z',
          lastLookup: {
            status: 'miss',
            canonicalUrl: 'https://example.com/source-to-convert',
            originalInput: 'https://example.com/source-to-convert?utm_source=review',
            savedAt: '2026-07-07T00:00:00.000Z',
          },
        },
        {
          canonicalUrl: 'https://mathbang.net/13',
          originalUrl: 'https://mathbang.net/13?utm_source=share',
          title: '이제 실행 가능한 수학 후보',
          memo: '후보가 기존 source-backed hit로 닫힌 상태',
          status: 'miss_request',
          savedAt: '2026-07-07T00:00:00.000Z',
          lastLookup: {
            status: 'hit',
            canonicalUrl: 'https://mathbang.net/13',
            originalInput: 'https://mathbang.net/13?utm_source=share',
            routeHref: '/flow-maps/middle-school-math-1',
            title: '중1 수학 목차',
          },
        },
      ]),
    );
  });
  await page.reload();
  const candidateList = page.getByTestId('flow-url-supply-candidate-list');
  await candidateList.waitFor({ state: 'visible' });
  await candidateList.locator('article').filter({ hasText: '새로 보고 싶은 준비 체크리스트' }).getByRole('button', { name: '요청 내용 보기' }).click();
  await capture(page, '30-url-first-candidate-handoff-mobile', 'URL-first candidate list and request detail', '/flows');
  await page.close();
}

async function captureUrlFirstLab(context) {
  const page = await context.newPage();
  await page.goto('/flow-lab/url-first-p0');
  await page.getByTestId('url-first-result-card').waitFor({ state: 'visible' });
  await capture(page, '31-url-first-p0-lab-mobile', 'Internal URL-first P0 lab overview', '/flow-lab/url-first-p0');
  await page.close();
}

async function captureManualRegistrationReport(browser) {
  const context = await browser.newContext({ viewport, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  const page = await context.newPage();
  const reportPath = path.join(repoRoot, 'docs', 'content-audit', '2026-07-06-source-backed-manual-registration-qa-ko.html');
  await page.goto(pathToFileURL(reportPath).href);
  await page.waitForLoadState('domcontentloaded');
  await capture(page, '32-source-backed-manual-registration-report-mobile', 'Source-backed manual registration QA report', 'docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html');
  await context.close();
}

async function newAppPage(context) {
  const page = await context.newPage();
  await page.goto('/flows');
  await page.getByTestId('flow-url-lookup-entry').waitFor({ state: 'visible' });
  return page;
}

async function lookupUrl(page, url) {
  const lookup = page.getByTestId('flow-url-lookup-entry');
  await lookup.locator('input[type="url"]').fill(url);
  await lookup.locator('button[type="submit"]').click();
  await page.getByTestId('flow-url-lookup-result').waitFor({ state: 'visible' });
}

async function capture(page, id, label, route) {
  const file = `${id}.png`;
  const screenshotPath = path.join(screenshotsDir, file);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const screenshotBuffer = fs.readFileSync(screenshotPath);
  const metrics = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim() || '',
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyTextLength: document.body.innerText.length,
  }));
  records.push({
    id,
    label,
    route,
    screenshot: `screenshots/${file}`,
    screenshotBytes: screenshotBuffer.length,
    screenshotHash: crypto.createHash('sha256').update(screenshotBuffer).digest('hex'),
    noHorizontalOverflow: metrics.scrollWidth <= metrics.clientWidth + 1,
    ...metrics,
  });
}

async function startServer() {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(command, ['run', 'start', '--', '-p', String(port)], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port) },
    shell: process.platform === 'win32',
  });
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  await waitForReady(`${baseURL}/flows`, 30_000);
  return child;
}

function waitForReady(url, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) {
            resolve();
            return;
          }
          retry();
        })
        .on('error', retry);
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}
