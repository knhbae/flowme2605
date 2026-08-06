import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { chromium } from '@playwright/test';

const REPO_ROOT = process.cwd();
const BASE_URL = (process.env.FLOWME_EVIDENCE_BASE_URL || 'http://127.0.0.1:3114')
  .replace(/\/$/u, '');
const OUTPUT_ROOT = path.resolve(
  process.env.FLOWME_P35_R2_REVIEW_EVIDENCE_DIR
    || path.join(REPO_ROOT, 'output', 'playwright', 'p35-round2-review-rehearsal'),
);
const CHROME_EXECUTABLE = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || (process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : undefined);
const DEFAULT_MOBILE_VIEWPORT = { width: 390, height: 844 };
const PUBLIC_FLOW_SLUG = 'moving-d30-basic';
const PUBLIC_FLOW_ROUTE = `/f/${PUBLIC_FLOW_SLUG}`;
const RECEIPT_STORAGE_KEY = 'flow:export-receipts:v1';
const BUNDLES_STORAGE_KEY = 'flow_builder_mvp_bundles_v11';

const writtenFiles = new Set();
const scenarioRuns = new Map();
const scenarioCounters = new Map();

function asPosix(value) {
  return value.split(path.sep).join('/');
}

function relativeToOutput(filePath) {
  return asPosix(path.relative(OUTPUT_ROOT, filePath));
}

function ensureInsideOutput(filePath) {
  const resolved = path.resolve(filePath);
  const relative = path.relative(OUTPUT_ROOT, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Evidence path escaped the owned output root: ${resolved}`);
  }
  return resolved;
}

function ensureScenarioDir(scenario) {
  const directory = ensureInsideOutput(path.join(OUTPUT_ROOT, scenario));
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function writeText(filePath, value) {
  const target = ensureInsideOutput(filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value, 'utf8');
  writtenFiles.add(target);
  return target;
}

function writeJson(filePath, value) {
  return writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function safeSlug(value) {
  return value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase();
}

function nextCaptureName(scenario, label) {
  const next = (scenarioCounters.get(scenario) || 0) + 1;
  scenarioCounters.set(scenario, next);
  return `${String(next).padStart(2, '0')}-${safeSlug(label)}`;
}

function git(args, fallback = 'UNKNOWN') {
  try {
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return fallback;
  }
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function mimeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.json') return 'application/json; charset=utf-8';
  if (extension === '.md') return 'text/markdown; charset=utf-8';
  if (extension === '.txt' || extension === '.tsv' || extension === '.ics') {
    return 'text/plain; charset=utf-8';
  }
  return 'application/octet-stream';
}

async function waitForFontsAndPaint(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }).catch(() => {});
  await page.waitForTimeout(200);
}

async function waitForVisible(locator, timeout = 15_000) {
  await locator.waitFor({ state: 'visible', timeout });
  return locator;
}

async function gotoRoute(page, route, readySelector = 'main') {
  const response = await page.goto(`${BASE_URL}${route}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  if (!response) throw new Error(`Navigation returned no response: ${route}`);
  if (response.status() >= 400) {
    throw new Error(`Navigation failed with HTTP ${response.status()}: ${route}`);
  }
  await waitForVisible(page.locator(readySelector).first());
  return response;
}

async function storageSnapshot(page) {
  return page.evaluate(() => {
    const read = (storage) => {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter(Boolean)
        .sort();
      return Object.fromEntries(keys.map((key) => [key, storage.getItem(key)]));
    };
    return {
      local: read(window.localStorage),
      session: read(window.sessionStorage),
    };
  });
}

async function visibleState(page, eventLog, extra = {}) {
  const dom = await page.evaluate(() => {
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number.parseFloat(style.opacity || '1') > 0
        && rect.width > 0
        && rect.height > 0;
    };
    const textOf = (element) => (element.textContent || '').replace(/\s+/gu, ' ').trim();
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'))
      .filter(isVisible)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        level: element.getAttribute('aria-level'),
        text: textOf(element),
        testId: element.getAttribute('data-testid'),
      }));
    const actions = Array.from(document.querySelectorAll(
      'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"]',
    ))
      .filter(isVisible)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type'),
        role: element.getAttribute('role'),
        text: textOf(element),
        accessibleName: element.getAttribute('aria-label')
          || element.getAttribute('title')
          || textOf(element),
        testId: element.getAttribute('data-testid'),
        href: element.getAttribute('href'),
        value: 'value' in element ? element.value : null,
        checked: 'checked' in element ? element.checked : null,
        disabled: 'disabled' in element ? element.disabled : null,
        expanded: element.getAttribute('aria-expanded'),
        pressed: element.getAttribute('aria-pressed'),
      }));
    const validation = Array.from(document.querySelectorAll('input, select, textarea'))
      .filter((element) => element.validationMessage)
      .map((element) => ({
        testId: element.getAttribute('data-testid'),
        name: element.getAttribute('name'),
        validationMessage: element.validationMessage,
      }));
    const geometry = {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      horizontalOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
    };
    const importantNodes = Array.from(document.querySelectorAll('[data-testid]'))
      .filter(isVisible)
      .map((element) => ({
        testId: element.getAttribute('data-testid'),
        data: Object.fromEntries(
          Array.from(element.attributes)
            .filter((attribute) => attribute.name.startsWith('data-'))
            .map((attribute) => [attribute.name, attribute.value]),
        ),
      }));
    return { headings, actions, validation, geometry, importantNodes };
  });

  return {
    capturedAt: new Date().toISOString(),
    route: page.url(),
    viewport: page.viewportSize(),
    ...dom,
    browserEvents: {
      consoleErrors: [...eventLog.consoleErrors],
      pageErrors: [...eventLog.pageErrors],
      requestFailures: [...eventLog.requestFailures],
    },
    ...extra,
  };
}

async function captureState(page, scenario, label, eventLog, extra = {}) {
  const stem = nextCaptureName(scenario, label);
  const directory = ensureScenarioDir(scenario);
  const screenshotPath = path.join(directory, `${stem}.png`);
  const statePath = path.join(directory, `${stem}.state.json`);
  await waitForFontsAndPaint(page);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: 'disabled',
  });
  writtenFiles.add(screenshotPath);
  writeJson(statePath, await visibleState(page, eventLog, extra));
  return { screenshotPath, statePath, stem };
}

function installEventLog(page) {
  const eventLog = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
  };
  page.on('console', (message) => {
    if (message.type() === 'error') eventLog.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => eventLog.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText || 'unknown';
    if (/ERR_ABORTED|NS_BINDING_ABORTED/iu.test(errorText)) return;
    eventLog.requestFailures.push({ url: request.url(), method: request.method(), errorText });
  });
  return eventLog;
}

async function runVariant(browser, scenario, variant, handler, viewport = DEFAULT_MOBILE_VIEWPORT) {
  const directory = ensureScenarioDir(scenario);
  const variantSlug = safeSlug(variant);
  const context = await browser.newContext({
    viewport,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const eventLog = installEventLog(page);
  const record = {
    scenario,
    variant,
    viewport,
    startedAt: new Date().toISOString(),
    status: 'RUNNING',
    error: null,
    result: null,
  };
  if (!scenarioRuns.has(scenario)) scenarioRuns.set(scenario, []);
  scenarioRuns.get(scenario).push(record);

  try {
    await gotoRoute(page, '/flows');
    writeJson(
      path.join(directory, `${variantSlug}.storage-before.json`),
      await storageSnapshot(page),
    );
    record.result = await handler({ page, context, eventLog, scenario, variant });
    record.status = 'PASS';
  } catch (error) {
    record.status = 'ERROR';
    record.error = {
      name: error?.name || 'Error',
      message: error?.message || String(error),
      stack: error?.stack || null,
    };
    try {
      await captureState(page, scenario, `${variantSlug}-unexpected-failure`, eventLog, {
        evidenceClass: 'UNEXPECTED_SCRIPT_FAILURE',
        variant,
        error: record.error,
      });
    } catch (captureError) {
      record.error.captureError = captureError?.message || String(captureError);
    }
  } finally {
    try {
      writeJson(
        path.join(directory, `${variantSlug}.storage-after.json`),
        await storageSnapshot(page),
      );
    } catch (error) {
      record.storageAfterError = error?.message || String(error);
    }
    record.finishedAt = new Date().toISOString();
    await context.close();
  }
  return record;
}

async function resetAndOpenPublic(page, slug = PUBLIC_FLOW_SLUG) {
  await gotoRoute(page, `/f/${slug}`);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForVisible(page.locator('main').first());
}

async function lookup(page, input) {
  const form = await waitForVisible(page.getByTestId('flow-url-lookup-entry'));
  await form.getByLabel('URL 또는 메모').fill(input);
  await form.getByRole('button', { name: /계획 찾기|Flow 찾기/u }).click();
  return waitForVisible(page.getByTestId('flow-url-lookup-result'));
}

async function capabilityManifest(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="public-flow-capability-result"]');
    if (!root) return null;
    const selected = root.querySelector('[data-testid="flow-capability-selected-preview"]');
    const rows = selected
      ? Array.from(selected.querySelectorAll('[data-testid="flow-capability-artifact-preview-row"]'))
      : [];
    const candidates = Array.from(root.querySelectorAll(
      '[data-testid="flow-capability-result-choice"], [data-testid="flow-capability-conditional-result"]',
    ));
    return {
      lifecycle: root.getAttribute('data-capability-lifecycle'),
      snapshotKind: root.getAttribute('data-capability-snapshot-kind'),
      primaryDestination: root.getAttribute('data-capability-primary-destination'),
      selectedDestination: root.getAttribute('data-capability-selected-destination'),
      selected: selected ? {
        destination: selected.getAttribute('data-capability-destination'),
        outputCount: selected.getAttribute('data-capability-output-count'),
        manifestItemIds: (selected.getAttribute('data-capability-manifest-item-ids') || '')
          .split(',')
          .filter(Boolean),
        orderedRenderedRows: rows.map((row, index) => ({
          index,
          itemId: row.getAttribute('data-item-id')
            || row.getAttribute('data-row-id')
            || row.getAttribute('data-effective-item-id'),
          text: (row.textContent || '').replace(/\s+/gu, ' ').trim(),
        })),
      } : null,
      candidates: candidates.map((candidate) => ({
        destination: candidate.getAttribute('data-capability-destination'),
        state: candidate.getAttribute('data-capability-candidate-state'),
        role: candidate.getAttribute('data-capability-candidate-role'),
        outputCount: candidate.getAttribute('data-capability-output-count'),
        expectedOutputCount: candidate.getAttribute('data-capability-expected-output-count'),
        manifestItemIds: (candidate.getAttribute('data-capability-manifest-item-ids') || '')
          .split(',')
          .filter(Boolean),
        text: (candidate.textContent || '').replace(/\s+/gu, ' ').trim(),
      })),
    };
  });
}

async function savePublicFlow(page, { slug = PUBLIC_FLOW_SLUG, anchor = null } = {}) {
  await resetAndOpenPublic(page, slug);
  const anchorInput = page.getByTestId('public-flow-anchor-input');
  if (anchor && await anchorInput.isVisible().catch(() => false)) {
    await anchorInput.fill(anchor);
  }
  const button = page.getByTestId('public-flow-save-primary-mobile');
  await waitForVisible(button);
  await button.click();
  await page.waitForFunction(() => {
    const url = new URL(window.location.href);
    return url.pathname === '/my'
      && url.searchParams.get('view') === 'flows'
      && /^personal-copy:/u.test(url.searchParams.get('flow') || '');
  }, null, { timeout: 20_000 });
  const personalCopyKey = new URL(page.url()).searchParams.get('flow') || '';
  await waitForVisible(page.getByTestId('my-flow-save-banner'));
  return personalCopyKey;
}

async function openMobileWorkspace(page, personalCopyKey, section = 'plan') {
  const encoded = encodeURIComponent(personalCopyKey);
  if (new URL(page.url()).pathname !== '/my') {
    await gotoRoute(page, `/my?view=flows&flow=${encoded}`);
  }
  let workspace = page.locator(
    `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopyKey}"]:visible`,
  );
  if (!await workspace.isVisible().catch(() => false)) {
    await gotoRoute(page, `/my?view=flows&flow=${encoded}`);
    workspace = page.locator(
      `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${personalCopyKey}"]:visible`,
    );
  }
  if (!await workspace.isVisible().catch(() => false)) {
    const compact = page.locator(
      `[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${personalCopyKey}"]`,
    );
    if (await compact.isVisible().catch(() => false)) {
      await compact.getByTestId('my-flow-mobile-structure-open').click();
    }
  }
  await waitForVisible(workspace);
  const tab = workspace.getByTestId(`my-flow-workspace-tab-${section}`);
  if (await tab.isVisible().catch(() => false)) await tab.click();
  if (section === 'plan') {
    const planToggle = workspace.getByTestId('my-flow-workspace-plan-toggle');
    if (
      await planToggle.isVisible().catch(() => false)
      && await planToggle.getAttribute('aria-expanded') === 'false'
    ) {
      await planToggle.click();
      await page.waitForFunction((key) => {
        const root = document.querySelector(
          `[data-testid="my-flow-mobile-workspace"][data-flow-slug="${CSS.escape(key)}"]`,
        );
        return root?.querySelector('[data-testid="my-flow-workspace-plan"]')
          ?.getAttribute('data-plan-open') === 'true';
      }, personalCopyKey);
    }
  }
  return workspace;
}

async function openSavedPlanEditor(page, personalCopyKey) {
  const workspace = await openMobileWorkspace(page, personalCopyKey, 'plan');
  const toggle = workspace.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first();
  await waitForVisible(toggle);
  await toggle.click();
  const editor = page.getByTestId('saved-flow-editor-plan');
  await waitForVisible(editor);
  return { workspace, editor };
}

async function installClipboardCapture(page) {
  await page.evaluate(() => {
    window.__flowmeEvidenceClipboardText = '';
    window.__flowmeEvidenceClipboardWrites = 0;
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__flowmeEvidenceClipboardWrites += 1;
          window.__flowmeEvidenceClipboardText = value;
        },
        readText: async () => window.__flowmeEvidenceClipboardText || '',
      },
    });
  });
}

async function openSavedTransferPanel(page, personalCopyKey) {
  const workspace = await openMobileWorkspace(page, personalCopyKey, 'record');
  const entry = workspace.getByTestId('my-flow-export-entry');
  await waitForVisible(entry);
  await entry.click();
  const panel = workspace.getByTestId('my-flow-export-panel');
  await waitForVisible(panel);
  return { workspace, panel };
}

async function openTransferDestination(panel, destination) {
  const button = panel.getByTestId(`my-flow-export-${destination}`);
  if (!await button.isVisible().catch(() => false)) {
    const more = panel.getByTestId('my-flow-export-more-formats');
    await waitForVisible(more);
    if (await more.getAttribute('open') === null) await more.locator(':scope > summary').click();
  }
  await waitForVisible(button);
  await button.click();
  const confirmation = panel.getByTestId('my-flow-transfer-confirmation');
  await waitForVisible(confirmation);
  return confirmation;
}

async function firstVisibleButton(locator, namePattern = /열기/u) {
  const button = locator.getByRole('button', { name: namePattern }).first();
  await waitForVisible(button);
  return button;
}

function scenarioDirectory(scenario) {
  return ensureScenarioDir(scenario);
}

async function captureS01(browser) {
  await runVariant(browser, 'S01', 'lookup-hit', async ({ page, eventLog }) => {
    await gotoRoute(page, '/flows');
    const result = await lookup(page, 'https://mathbang.net/13?utm_source=evidence');
    await captureState(page, 'S01', 'hit-result', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      lookupState: 'hit',
      resultText: (await result.innerText()).trim(),
    });
    return { lookupState: 'hit' };
  });

  await runVariant(browser, 'S01', 'lookup-review-hold', async ({ page, eventLog }) => {
    await gotoRoute(page, '/flows');
    const input = 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7706&mi=6646';
    const result = await lookup(page, input);
    await captureState(page, 'S01', 'review-hold-result', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      lookupState: 'review',
      resultText: (await result.innerText()).trim(),
    });
    return { lookupState: 'review' };
  });

  await runVariant(browser, 'S01', 'lookup-miss', async ({ page, eventLog }) => {
    await gotoRoute(page, '/flows');
    const result = await lookup(page, 'https://example.com/s01-source-not-yet-converted');
    await captureState(page, 'S01', 'miss-result', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      lookupState: 'miss',
      resultText: (await result.innerText()).trim(),
    });
    return { lookupState: 'miss' };
  });

  await runVariant(browser, 'S01', 'lookup-empty', async ({ page, eventLog }) => {
    await gotoRoute(page, '/flows');
    const form = await waitForVisible(page.getByTestId('flow-url-lookup-entry'));
    const input = form.getByLabel('URL 또는 메모');
    await input.fill('');
    await form.getByRole('button', { name: /계획 찾기|Flow 찾기/u }).click();
    await captureState(page, 'S01', 'empty-native-validation', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      lookupState: 'empty',
      inputValidationMessage: await input.evaluate((element) => element.validationMessage),
      resultCount: await page.getByTestId('flow-url-lookup-result').count(),
    });
    return { lookupState: 'empty' };
  });

  await runVariant(browser, 'S01', 'lookup-error-failure-injection', async ({ page, eventLog }) => {
    await gotoRoute(page, '/flows');
    const result = await lookup(page, 'https://example.com/s01-injected-storage-failure');
    await result.getByLabel(/계획 이름|Flow 이름/u).fill('저장 실패를 확인할 계획');
    await result.getByLabel('원하는 결과').fill('입력 보존과 다시 시도를 확인');
    await result.getByRole('button', { name: '초안 준비하기' }).click();
    const list = await waitForVisible(page.getByTestId('flow-url-supply-candidate-list'));
    const card = list.locator('article').filter({ hasText: '저장 실패를 확인할 계획' });
    await waitForVisible(card);
    await card.getByTestId('flow-url-miss-draft-open').click();
    const editor = card.getByTestId('flow-url-miss-draft-editor');
    await waitForVisible(editor);
    await editor.getByTestId('flow-url-miss-draft-flow-title').fill('실패 뒤에도 남아야 할 제목');
    await editor.getByTestId('flow-url-miss-draft-anchor-date').fill('2031-09-07');
    await page.evaluate((bundlesKey) => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function injectedSetItem(key, value) {
        if (this === window.localStorage && key === bundlesKey) {
          Storage.prototype.setItem = original;
          throw new DOMException('S01 evidence-only quota failure', 'QuotaExceededError');
        }
        return original.call(this, key, value);
      };
    }, BUNDLES_STORAGE_KEY);
    await editor.getByTestId('flow-url-miss-draft-save').click();
    const feedback = card.getByTestId('flow-url-miss-draft-feedback');
    await waitForVisible(feedback);
    await captureState(page, 'S01', 'failure-injection-ui-error', eventLog, {
      evidenceClass: 'EVIDENCE_ONLY_FAILURE_INJECTION',
      injection: 'localStorage.setItem throws once for flow_builder_mvp_bundles_v11',
      lookupState: 'error',
      feedbackText: (await feedback.innerText()).trim(),
      preservedTitle: await editor.getByTestId('flow-url-miss-draft-flow-title').inputValue(),
      preservedAnchor: await editor.getByTestId('flow-url-miss-draft-anchor-date').inputValue(),
    });
    return { lookupState: 'error', evidenceClass: 'EVIDENCE_ONLY_FAILURE_INJECTION' };
  });
}

async function writeCapabilityEvidence(page, scenario, label) {
  const manifest = await capabilityManifest(page);
  writeJson(
    path.join(scenarioDirectory(scenario), `${safeSlug(label)}.capability-manifest.json`),
    manifest,
  );
  return manifest;
}

async function captureS02(browser) {
  await runVariant(browser, 'S02', 'all-dated', async ({ page, eventLog }) => {
    await resetAndOpenPublic(page, PUBLIC_FLOW_SLUG);
    await page.getByTestId('public-flow-anchor-input').fill('2031-09-01');
    await page.waitForTimeout(250);
    const manifest = await writeCapabilityEvidence(page, 'S02', 'all-dated');
    await captureState(page, 'S02', 'all-dated-public-result', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      dateShape: 'all-dated',
      capabilityManifest: manifest,
    });
    return { dateShape: 'all-dated', outputCount: manifest?.selected?.outputCount };
  });

  await runVariant(browser, 'S02', 'all-undated', async ({ page, eventLog }) => {
    await resetAndOpenPublic(page, 'vehicle-inspection-prep');
    const manifest = await writeCapabilityEvidence(page, 'S02', 'all-undated');
    await captureState(page, 'S02', 'all-undated-public-result', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      dateShape: 'all-undated',
      capabilityManifest: manifest,
    });
    return { dateShape: 'all-undated', outputCount: manifest?.selected?.outputCount };
  });

  await runVariant(browser, 'S02', 'dated-undated-mixed', async ({ page, eventLog }) => {
    await resetAndOpenPublic(page, PUBLIC_FLOW_SLUG);
    await page.getByTestId('public-flow-anchor-input').fill('2031-09-01');
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const planEditor = await waitForVisible(page.getByTestId('public-flow-personal-adjustment'));
    await planEditor.getByTestId('public-flow-adjustment-kind-items').click();
    const itemOpener = planEditor.getByTestId('public-flow-adjustment-item-edit').nth(5);
    await waitForVisible(itemOpener);
    const itemId = await itemOpener.getAttribute('data-item-id');
    await itemOpener.click();
    const itemEditor = await waitForVisible(page.getByTestId('public-flow-item-editor'));
    const dateInput = itemEditor.getByTestId('public-flow-item-editor-date-input');
    const derivedDateBefore = await dateInput.inputValue();
    await dateInput.fill('');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await planEditor.getByTestId('public-flow-adjustment-apply').click();
    await planEditor.waitFor({ state: 'detached' });
    const manifest = await writeCapabilityEvidence(page, 'S02', 'dated-undated-mixed');
    await captureState(page, 'S02', 'dated-undated-mixed-public-result', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      dateShape: 'mixed',
      explicitlyUndatedItemId: itemId,
      derivedDateBefore,
      capabilityManifest: manifest,
    });
    return {
      dateShape: 'mixed',
      explicitlyUndatedItemId: itemId,
      outputCount: manifest?.selected?.outputCount,
    };
  });
}

async function captureS03(browser) {
  await runVariant(browser, 'S03', 'editor-cancel', async ({ page, eventLog }) => {
    await resetAndOpenPublic(page);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const editor = await waitForVisible(page.getByTestId('public-flow-personal-adjustment'));
    await editor.getByTestId('public-flow-adjustment-kind-name').click();
    await editor.getByTestId('public-flow-adjustment-name-input').fill('취소되어야 할 임시 제목');
    await captureState(page, 'S03', 'plan-editor-dirty-before-cancel', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      editorAction: 'cancel',
    });
    await editor.getByTestId('public-flow-adjustment-cancel').click();
    const discard = page.locator('[data-testid="flow-editor-discard-prompt"]:visible');
    if (await discard.isVisible().catch(() => false)) {
      await captureState(page, 'S03', 'cancel-discard-confirmation', eventLog, {
        evidenceClass: 'ACTUAL_UI',
        editorAction: 'cancel-discard-confirmation',
      });
      await discard.locator('[data-editor-discard-action="discard-changes"]').click();
    }
    await editor.waitFor({ state: 'detached' });
    await captureState(page, 'S03', 'after-cancel', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      editorAction: 'cancel-complete',
    });
    return { editorAction: 'cancel' };
  });

  await runVariant(browser, 'S03', 'editor-apply', async ({ page, eventLog }) => {
    await resetAndOpenPublic(page);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const editor = await waitForVisible(page.getByTestId('public-flow-personal-adjustment'));
    await editor.getByTestId('public-flow-adjustment-kind-name').click();
    const appliedTitle = '실제 반영한 우리 가족 이사 계획';
    await editor.getByTestId('public-flow-adjustment-name-input').fill(appliedTitle);
    await editor.getByTestId('public-flow-adjustment-apply').click();
    await editor.waitFor({ state: 'detached' });
    await captureState(page, 'S03', 'after-plan-apply', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      editorAction: 'apply',
      appliedTitle,
    });
    return { editorAction: 'apply', appliedTitle };
  });

  await runVariant(browser, 'S03', 'editor-browser-back', async ({ page, eventLog }) => {
    await resetAndOpenPublic(page);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const editor = await waitForVisible(page.getByTestId('public-flow-personal-adjustment'));
    await editor.getByTestId('public-flow-adjustment-kind-name').click();
    await editor.getByTestId('public-flow-adjustment-name-input').fill('뒤로가기로 버리기 전 제목');
    await page.goBack();
    const discard = await waitForVisible(editor.getByTestId('flow-editor-discard-prompt'));
    await captureState(page, 'S03', 'browser-back-discard-confirmation', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      editorAction: 'browser-back',
    });
    await discard.locator('[data-editor-discard-action="continue-editing"]').click();
    await captureState(page, 'S03', 'browser-back-continue-editing', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      editorAction: 'continue-editing',
    });
    return { editorAction: 'browser-back-continue' };
  });

  await runVariant(browser, 'S03', 'editor-validation-error', async ({ page, eventLog }) => {
    await resetAndOpenPublic(page);
    await page.getByTestId('public-flow-adjust-entry-mobile').click();
    const planEditor = await waitForVisible(page.getByTestId('public-flow-personal-adjustment'));
    await planEditor.getByTestId('public-flow-adjustment-kind-items').click();
    await planEditor.getByTestId('public-flow-adjustment-item-edit').first().click();
    const itemEditor = await waitForVisible(page.getByTestId('public-flow-item-editor'));
    const title = itemEditor.getByTestId('public-flow-item-editor-title-input');
    await title.fill('');
    await itemEditor.getByTestId('public-flow-item-editor-save').click();
    await waitForVisible(itemEditor.getByTestId('public-flow-item-editor-error-summary'));
    await captureState(page, 'S03', 'item-validation-error', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      editorAction: 'validation-error',
      focusedTestId: await page.evaluate(() => document.activeElement?.getAttribute('data-testid')),
    });
    return { editorAction: 'validation-error' };
  });
}

async function captureS04(browser) {
  await runVariant(browser, 'S04', 'save-and-duplicate', async ({ page, eventLog }) => {
    const firstKey = await savePublicFlow(page, { anchor: '2031-10-01' });
    await captureState(page, 'S04', 'first-save-destination', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      transition: 'first-save-to-my-plan',
      personalCopyKey: firstKey,
    });
    const firstRaw = await page.evaluate((key) => window.localStorage.getItem(`flow:saved:${key}`), firstKey);
    writeText(path.join(scenarioDirectory('S04'), 'first-save.saved-record.raw.json'), `${firstRaw}\n`);

    await gotoRoute(page, PUBLIC_FLOW_ROUTE);
    await page.getByTestId('public-flow-anchor-input').fill('2031-11-01');
    await page.getByTestId('public-flow-save-primary-mobile').click();
    const dialog = await waitForVisible(page.getByTestId('public-flow-existing-copy-dialog'));
    await captureState(page, 'S04', 'existing-copy-duplicate-choice', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      transition: 'duplicate-detected',
      existingPersonalCopyKey: firstKey,
    });
    await dialog.getByTestId('public-flow-existing-copy-choice-copy').check();
    await dialog.getByTestId('public-flow-existing-copy-confirm').click();
    await page.waitForFunction((previousKey) => {
      const url = new URL(window.location.href);
      const nextKey = url.searchParams.get('flow') || '';
      return url.pathname === '/my' && /^personal-copy:/u.test(nextKey) && nextKey !== previousKey;
    }, firstKey, { timeout: 20_000 });
    const secondKey = new URL(page.url()).searchParams.get('flow') || '';
    await captureState(page, 'S04', 'new-copy-destination', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      transition: 'duplicate-new-copy-to-my-plan',
      firstKey,
      secondKey,
    });
    const records = await page.evaluate(() => Object.fromEntries(
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('flow:saved:'))
        .sort()
        .map((key) => [key, window.localStorage.getItem(key)]),
    ));
    writeJson(path.join(scenarioDirectory('S04'), 'duplicate.saved-records.json'), records);
    return { firstKey, secondKey, savedRecordCount: Object.keys(records).length };
  });

  await runVariant(browser, 'S04', 'save-retry-failure-injection', async ({ page, eventLog }) => {
    await resetAndOpenPublic(page);
    await page.getByTestId('public-flow-anchor-input').fill('2031-12-01');
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      let failed = false;
      Storage.prototype.setItem = function injectedSetItem(key, value) {
        if (!failed && this === window.localStorage && key.startsWith('flow:saved:')) {
          failed = true;
          Storage.prototype.setItem = original;
          throw new DOMException('S04 evidence-only save failure', 'QuotaExceededError');
        }
        return original.call(this, key, value);
      };
    });
    await page.getByTestId('public-flow-save-primary-mobile').click();
    const error = await waitForVisible(page.getByTestId('public-flow-save-error-mobile'));
    await captureState(page, 'S04', 'failure-injection-save-error', eventLog, {
      evidenceClass: 'EVIDENCE_ONLY_FAILURE_INJECTION',
      injection: 'localStorage.setItem throws once for flow:saved:*',
      errorText: (await error.innerText()).trim(),
    });
    const retry = page.getByTestId('public-flow-save-retry-mobile');
    await waitForVisible(retry);
    await retry.click();
    await page.waitForFunction(() => new URL(window.location.href).pathname === '/my', null, {
      timeout: 20_000,
    });
    const personalCopyKey = new URL(page.url()).searchParams.get('flow') || '';
    await captureState(page, 'S04', 'retry-success-destination', eventLog, {
      evidenceClass: 'ACTUAL_UI_AFTER_FAILURE_INJECTION',
      transition: 'retry-to-my-plan',
      personalCopyKey,
    });
    return { retry: 'success', personalCopyKey };
  });
}

async function captureS05(browser) {
  await runVariant(browser, 'S05', 'saved-checklist-transfer', async ({ page, eventLog }) => {
    const personalCopyKey = await savePublicFlow(page, { anchor: '2032-01-10' });
    await installClipboardCapture(page);
    let { panel } = await openSavedTransferPanel(page, personalCopyKey);
    const confirmation = await openTransferDestination(panel, 'checklist');
    await captureState(page, 'S05', 'saved-transfer-confirmation', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      destination: 'checklist',
      scope: await confirmation.getAttribute('data-scope'),
      persistence: await confirmation.getAttribute('data-transfer-persistence'),
    });
    await confirmation.getByTestId('my-flow-transfer-confirm').click();
    const receipt = panel.getByTestId('my-flow-transfer-receipt');
    await waitForVisible(receipt);
    await captureState(page, 'S05', 'saved-transfer-receipt', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      destination: 'checklist',
      outcome: await receipt.getAttribute('data-outcome'),
      requestId: await receipt.getAttribute('data-transfer-request-id'),
    });
    const raw = await page.evaluate((receiptKey) => ({
      clipboardText: window.__flowmeEvidenceClipboardText || '',
      clipboardWrites: window.__flowmeEvidenceClipboardWrites || 0,
      receiptStorageRaw: window.localStorage.getItem(receiptKey),
    }), RECEIPT_STORAGE_KEY);
    writeText(
      path.join(scenarioDirectory('S05'), 'checklist-transfer.raw.txt'),
      raw.clipboardText,
    );
    writeText(
      path.join(scenarioDirectory('S05'), 'receipt-storage.raw.json'),
      `${raw.receiptStorageRaw || 'null'}\n`,
    );
    writeJson(path.join(scenarioDirectory('S05'), 'transfer-transport.json'), {
      destination: 'checklist',
      transport: 'clipboard.writeText',
      writes: raw.clipboardWrites,
      rawBytes: Buffer.byteLength(raw.clipboardText, 'utf8'),
      rawSha256: sha256Buffer(Buffer.from(raw.clipboardText, 'utf8')),
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    ({ panel } = await openSavedTransferPanel(page, personalCopyKey));
    const reopened = panel.getByTestId('my-flow-transfer-receipt');
    await waitForVisible(reopened);
    await captureState(page, 'S05', 'reopened-persisted-receipt', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      destination: 'checklist',
      outcome: await reopened.getAttribute('data-outcome'),
      requestId: await reopened.getAttribute('data-transfer-request-id'),
    });
    return {
      personalCopyKey,
      rawBytes: Buffer.byteLength(raw.clipboardText, 'utf8'),
      rawSha256: sha256Buffer(Buffer.from(raw.clipboardText, 'utf8')),
      receiptPersisted: true,
    };
  });
}

async function librarySnapshot(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="my-flow-saved-library-shell"]');
    const visible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const rows = shell
      ? Array.from(shell.querySelectorAll('[data-testid="my-flow-library-row"]'))
      : [];
    return {
      count: shell?.getAttribute('data-library-count') || '0',
      sizeState: shell?.getAttribute('data-library-size-state') || null,
      rowCount: rows.length,
      rowSlugs: rows.map((row) => row.getAttribute('data-flow-slug')),
      todayVisible: visible(shell?.querySelector('[data-testid="my-flow-today-summary"]')),
      todayItemCount: shell?.querySelectorAll('[data-testid="my-flow-today-item"]').length || 0,
      todoExperimentVisible: visible(document.querySelector('[data-testid="my-flow-cross-flow-todo-experiment"]')),
      selectedView: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() || null,
    };
  });
}

async function seedOnePlan(page, { dated }) {
  await gotoRoute(page, '/flows');
  await page.evaluate(({ slug, isDated }) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(`flow:saved:${slug}`, JSON.stringify({
      slug,
      savedAt: '2031-08-05T00:00:00.000Z',
      selectedArtifactMode: isDated ? 'calendar' : 'checklist',
      dateIntent: isDated ? 'custom' : 'undated',
      ...(isDated ? { anchor: '2031-08-05' } : {}),
    }));
    if (isDated) {
      window.localStorage.setItem(
        `flow:${slug}:anchorDate`,
        JSON.stringify({ mode: 'custom', anchor: '2031-08-05' }),
      );
    }
  }, { slug: PUBLIC_FLOW_SLUG, isDated: dated });
  await gotoRoute(page, '/my');
  await waitForVisible(page.getByTestId('my-flow-saved-library-shell'));
}

async function captureLibraryVariant(browser, variant, route, viewport, seed = null) {
  await runVariant(browser, 'S06', variant, async ({ page, eventLog }) => {
    if (seed) await seed(page);
    else await gotoRoute(page, route);
    const library = await librarySnapshot(page);
    writeJson(path.join(scenarioDirectory('S06'), `${safeSlug(variant)}.library-state.json`), library);
    await captureState(page, 'S06', `${variant}-library`, eventLog, {
      evidenceClass: 'ACTUAL_UI',
      library,
    });
    return library;
  }, viewport);
}

async function captureS06(browser) {
  await captureLibraryVariant(
    browser,
    'zero-plans',
    '/my',
    DEFAULT_MOBILE_VIEWPORT,
    async (page) => {
      await gotoRoute(page, '/flows');
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      await gotoRoute(page, '/my');
    },
  );
  await captureLibraryVariant(
    browser,
    'one-dated-plan',
    '/my',
    DEFAULT_MOBILE_VIEWPORT,
    (page) => seedOnePlan(page, { dated: true }),
  );
  await captureLibraryVariant(
    browser,
    'one-undated-plan',
    '/my',
    DEFAULT_MOBILE_VIEWPORT,
    (page) => seedOnePlan(page, { dated: false }),
  );
  await captureLibraryVariant(
    browser,
    'five-plans',
    '/my?demo=ux5',
    { width: 1024, height: 768 },
  );
  await captureLibraryVariant(
    browser,
    'twenty-plans',
    '/my?demo=ux20',
    { width: 1440, height: 1000 },
  );
}

async function openFirstExecutionItem(page, workspace) {
  const execution = workspace.getByTestId('my-flow-shape-aware-execution');
  await waitForVisible(execution);
  const shell = execution.getByTestId('my-flow-execution-row-shell').first();
  await waitForVisible(shell);
  const row = shell.locator('article[data-row-key]');
  const rowKey = await row.getAttribute('data-row-key');
  const itemId = await row.getAttribute('data-item-id');
  await (await firstVisibleButton(shell)).click();
  const detail = page.locator(
    '[data-testid="my-flow-item-detail-sheet"] [data-testid="my-flow-item-detail"]:visible, '
      + '[data-testid="my-flow-workspace-detail-pane"] [data-testid="my-flow-item-detail"]:visible',
  ).last();
  await waitForVisible(detail);
  return { detail, rowKey, itemId };
}

async function enterItemEditor(page, detail) {
  const quick = detail.getByTestId('my-flow-quick-item-edit');
  if (await quick.isVisible().catch(() => false)) {
    await quick.click();
  } else {
    const summary = detail.getByTestId('my-flow-detail-read-summary');
    if (await summary.getAttribute('open') === null) await summary.locator('summary').click();
    await summary.getByTestId('my-flow-detail-edit-toggle').click();
  }
  const editor = page.locator(
    '[data-testid="saved-flow-editor-item"]:visible, '
      + '[data-testid="my-flow-item-detail"][data-detail-mode="edit"]:visible',
  ).last();
  await waitForVisible(editor);
  return editor;
}

async function captureS07(browser) {
  await runVariant(browser, 'S07', 'detail-edit-memo-complete-reopen', async ({ page, eventLog }) => {
    const personalCopyKey = await savePublicFlow(page, { slug: 'vehicle-inspection-prep' });
    const workspace = await openMobileWorkspace(page, personalCopyKey, 'execute');
    const opened = await openFirstExecutionItem(page, workspace);
    const effectiveItemId = await opened.detail.getAttribute('data-effective-item-id')
      || await opened.detail.getAttribute('data-item-id')
      || opened.itemId;
    await captureState(page, 'S07', 'item-detail-open', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      personalCopyKey,
      itemId: effectiveItemId,
      rowKey: opened.rowKey,
    });

    const editor = await enterItemEditor(page, opened.detail);
    await captureState(page, 'S07', 'item-editor-open', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      itemId: effectiveItemId,
    });
    const memo = '등록증 원본과 계기판 사진을 함께 확인하고 담당자 이름을 기록';
    const memoInput = editor.locator(
      '[data-testid="saved-flow-editor-item-detail-input"], [data-testid="my-flow-detail-memo"]',
    ).first();
    await waitForVisible(memoInput);
    await memoInput.fill(memo);
    await editor.getByTestId('my-flow-detail-save-changes').click();
    const parentPlan = page.getByTestId('saved-flow-editor-plan');
    if (await parentPlan.isVisible().catch(() => false)) {
      await parentPlan.getByTestId('saved-flow-editor-save').click();
      await parentPlan.waitFor({ state: 'detached' });
    }
    await captureState(page, 'S07', 'memo-saved', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      itemId: effectiveItemId,
      memo,
    });

    const close = page.getByTestId('my-flow-item-detail-sheet-close');
    if (await close.isVisible().catch(() => false)) await close.click();
    const reopened = await openFirstExecutionItem(page, workspace);
    const reopenedEditor = await enterItemEditor(page, reopened.detail);
    const reopenedMemoInput = reopenedEditor.locator(
      '[data-testid="saved-flow-editor-item-detail-input"], [data-testid="my-flow-detail-memo"]',
    ).first();
    const persistedMemo = await reopenedMemoInput.inputValue();
    const cancel = reopenedEditor.locator(
      '[data-testid="saved-flow-editor-item-cancel"], [data-testid="my-flow-editor-cancel"]',
    ).first();
    await cancel.click();
    const reopenedParent = page.getByTestId('saved-flow-editor-plan');
    if (await reopenedParent.isVisible().catch(() => false)) {
      await reopenedParent.getByTestId('saved-flow-editor-cancel').click();
      const discard = reopenedParent.getByTestId('flow-editor-discard-prompt');
      if (await discard.isVisible().catch(() => false)) {
        await discard.locator('[data-editor-discard-action="discard-changes"]').click();
      }
    }
    await captureState(page, 'S07', 'memo-reopened', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      itemId: effectiveItemId,
      persistedMemo,
    });

    const completion = reopened.detail.getByTestId('my-flow-task-complete-control');
    await waitForVisible(completion);
    await completion.click();
    await captureState(page, 'S07', 'item-completed', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      itemId: effectiveItemId,
      checked: await completion.isChecked(),
    });
    await completion.click();
    await captureState(page, 'S07', 'item-reopened', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      itemId: effectiveItemId,
      checked: await completion.isChecked(),
    });

    const rawState = await page.evaluate(({ key, itemId }) => ({
      savedRecord: window.localStorage.getItem(`flow:saved:${key}`),
      itemDrafts: window.localStorage.getItem('flow:my-flow:item-drafts'),
      checks: window.localStorage.getItem(`flow_builder_mvp_checks_${key}`),
      itemState: window.localStorage.getItem(`flow_builder_mvp_item_state_${key}`),
      itemId,
    }), { key: personalCopyKey, itemId: effectiveItemId });
    writeJson(path.join(scenarioDirectory('S07'), 'item-state.raw.json'), rawState);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await openMobileWorkspace(page, personalCopyKey, 'execute');
    await captureState(page, 'S07', 'after-reload', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      personalCopyKey,
      itemId: effectiveItemId,
    });
    return {
      personalCopyKey,
      itemId: effectiveItemId,
      memoPersisted: persistedMemo === memo,
      completedThenReopened: true,
    };
  });
}

async function captureS08(browser) {
  await runVariant(browser, 'S08', 'saved-editor-cancel-error-reload', async ({ page, eventLog }) => {
    const personalCopyKey = await savePublicFlow(page, { anchor: '2032-02-01' });
    const storageBeforeCancel = await storageSnapshot(page);
    let { editor } = await openSavedPlanEditor(page, personalCopyKey);
    await editor.getByTestId('saved-flow-editor-title-input').fill('취소할 저장 계획 제목');
    await captureState(page, 'S08', 'saved-editor-dirty-before-cancel', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      personalCopyKey,
      editorAction: 'cancel',
    });
    await editor.getByTestId('saved-flow-editor-cancel').click();
    const discard = editor.getByTestId('flow-editor-discard-prompt');
    if (await discard.isVisible().catch(() => false)) {
      await captureState(page, 'S08', 'saved-editor-cancel-confirmation', eventLog, {
        evidenceClass: 'ACTUAL_UI',
        editorAction: 'cancel-discard-confirmation',
      });
      await discard.locator('[data-editor-discard-action="discard-changes"]').click();
    }
    await editor.waitFor({ state: 'detached' });
    const storageAfterCancel = await storageSnapshot(page);
    writeJson(path.join(scenarioDirectory('S08'), 'cancel-byte-comparison.json'), {
      equal: JSON.stringify(storageBeforeCancel) === JSON.stringify(storageAfterCancel),
      before: storageBeforeCancel,
      after: storageAfterCancel,
    });

    ({ editor } = await openSavedPlanEditor(page, personalCopyKey));
    const retryTitle = '저장 실패 뒤 다시 저장한 계획 제목';
    await editor.getByTestId('saved-flow-editor-title-input').fill(retryTitle);
    const beforeFailure = await storageSnapshot(page);
    await page.evaluate((targetKey) => {
      const original = Storage.prototype.setItem;
      let shouldFail = true;
      Storage.prototype.setItem = function injectedSetItem(key, value) {
        if (shouldFail && this === window.localStorage && key === targetKey) {
          shouldFail = false;
          Storage.prototype.setItem = original;
          throw new Error('S08 evidence-only saved editor storage failure');
        }
        return original.call(this, key, value);
      };
    }, `flow:saved:${personalCopyKey}`);
    await editor.getByTestId('saved-flow-editor-save').click();
    const error = await waitForVisible(editor.getByTestId('flow-editor-error'));
    const afterFailure = await storageSnapshot(page);
    await captureState(page, 'S08', 'failure-injection-recoverable-error', eventLog, {
      evidenceClass: 'EVIDENCE_ONLY_FAILURE_INJECTION',
      injection: `localStorage.setItem throws once for flow:saved:${personalCopyKey}`,
      errorText: (await error.innerText()).trim(),
      draftTitle: await editor.getByTestId('saved-flow-editor-title-input').inputValue(),
      storageByteEqual: JSON.stringify(beforeFailure) === JSON.stringify(afterFailure),
    });
    await editor.getByTestId('flow-editor-retry').click();
    await editor.waitFor({ state: 'detached' });
    await captureState(page, 'S08', 'retry-saved-plan', eventLog, {
      evidenceClass: 'ACTUAL_UI_AFTER_FAILURE_INJECTION',
      personalCopyKey,
      retryTitle,
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    const workspace = await openMobileWorkspace(page, personalCopyKey, 'plan');
    await captureState(page, 'S08', 'saved-editor-reload-persisted', eventLog, {
      evidenceClass: 'ACTUAL_UI',
      personalCopyKey,
      retryTitle,
      visibleWorkspaceText: (await workspace.innerText()).replace(/\s+/gu, ' ').trim(),
    });
    const rawRecord = await page.evaluate((key) => window.localStorage.getItem(`flow:saved:${key}`), personalCopyKey);
    writeText(path.join(scenarioDirectory('S08'), 'reloaded-saved-record.raw.json'), `${rawRecord}\n`);
    return {
      personalCopyKey,
      cancelStorageByteEqual: JSON.stringify(storageBeforeCancel) === JSON.stringify(storageAfterCancel),
      failureStorageByteEqual: JSON.stringify(beforeFailure) === JSON.stringify(afterFailure),
      retryTitle,
      reloadedTitlePresent: (await workspace.innerText()).includes(retryTitle),
    };
  });
}

function buildFileManifest() {
  return [...writtenFiles]
    .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile())
    .sort((left, right) => relativeToOutput(left).localeCompare(relativeToOutput(right)))
    .map((filePath) => ({
      path: relativeToOutput(filePath),
      bytes: fs.statSync(filePath).size,
      sha256: sha256File(filePath),
      mime: mimeFor(filePath),
    }));
}

function scenarioStatus(scenario, dirty) {
  const variants = scenarioRuns.get(scenario) || [];
  const passCount = variants.filter((variant) => variant.status === 'PASS').length;
  const errorCount = variants.filter((variant) => variant.status === 'ERROR').length;
  const coverage = errorCount === 0 && passCount > 0
    ? 'CAPTURED'
    : passCount > 0
      ? 'PARTIAL'
      : 'FAILED';
  return {
    scenario,
    status: dirty
      ? `LOCAL_REHEARSAL_NOT_FINAL_${coverage}`
      : `LOCAL_CANDIDATE_${coverage}`,
    passCount,
    errorCount,
    knownGaps: {
      S01: [
        'Lookup resolution is local and deterministic in this build; the error state therefore uses a clearly labeled one-shot localStorage failure injection rather than a nonexistent remote lookup outage.',
      ],
      S02: [
        'For the mixed fixture the UI truthfully selects the lossless checklist (24 Items); the same manifest records Calendar as conditional with 23 current outputs and one undated Item.',
      ],
      S03: [],
      S04: [
        'Retry evidence uses a clearly labeled one-shot localStorage failure injection; no remote save provider is in scope.',
      ],
      S05: [
        'This S05 rehearsal retains one exact Checklist clipboard artifact and receipt. Cross-format fidelity belongs to S09/S18/S21.',
      ],
      S06: [
        'The 5/20-plan states use the product demo fixtures. They are internal QA fixtures, not observed-user evidence.',
      ],
      S07: [
        'The detailed mutation journey exercises one canonical Item in one 10-Item saved plan; breadth is covered by S14.',
      ],
      S08: [
        'Recoverable-error evidence uses a clearly labeled one-shot localStorage failure injection; concurrent-tab conflict breadth remains in the automated gate.',
      ],
    }[scenario] || [],
    variants,
  };
}

async function main() {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  for (const scenario of ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08']) {
    ensureScenarioDir(scenario);
  }

  const head = git(['rev-parse', 'HEAD']);
  const gitStatus = git(['status', '--porcelain'], 'UNKNOWN');
  const dirty = gitStatus === 'UNKNOWN' ? true : gitStatus.length > 0;
  const buildIdPath = path.join(REPO_ROOT, '.next', 'BUILD_ID');
  const buildId = fs.existsSync(buildIdPath)
    ? fs.readFileSync(buildIdPath, 'utf8').trim()
    : 'MISSING_BUILD_ID';
  const scriptPath = path.resolve(
    REPO_ROOT,
    'scripts',
    'content-audit',
    'p35-round2-independent-evidence',
    'capture-s01-s08.mjs',
  );

  const browser = await chromium.launch({
    headless: process.env.FLOWME_EVIDENCE_HEADED !== '1',
    executablePath: CHROME_EXECUTABLE,
  });
  const browserVersion = browser.version();
  try {
    await captureS01(browser);
    await captureS02(browser);
    await captureS03(browser);
    await captureS04(browser);
    await captureS05(browser);
    await captureS06(browser);
    await captureS07(browser);
    await captureS08(browser);
  } finally {
    await browser.close();
  }

  const scenarioStatuses = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08']
    .map((scenario) => scenarioStatus(scenario, dirty));
  for (const scenarioStatusEntry of scenarioStatuses) {
    writeJson(
      path.join(scenarioDirectory(scenarioStatusEntry.scenario), 'scenario-summary.json'),
      scenarioStatusEntry,
    );
  }
  const files = buildFileManifest();
  const manifest = {
    schemaVersion: 1,
    evidenceGroup: 'S01-S08',
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    buildId,
    git: {
      head,
      dirty,
      porcelain: gitStatus === 'UNKNOWN' ? null : gitStatus.split(/\r?\n/u).filter(Boolean),
    },
    publicationState: dirty ? 'LOCAL_REHEARSAL_NOT_FINAL' : 'CANDIDATE_BOUND_LOCAL_CAPTURE',
    globalKnownGaps: [
      ...(dirty ? [
        'The working tree is dirty, so this is rehearsal evidence and must not be represented as immutable final-candidate evidence.',
      ] : []),
      'No GitHub publication SHA or static evidence URL is assigned by this local-only capture script.',
      'No observed-user validation is claimed; all evidence is deterministic internal browser simulation.',
    ],
    browser: {
      engine: 'chromium',
      version: browserVersion,
      source: CHROME_EXECUTABLE ? 'explicit system Chrome' : 'Playwright-managed Chromium',
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    },
    captureScript: {
      path: asPosix(path.relative(REPO_ROOT, scriptPath)),
      bytes: fs.statSync(scriptPath).size,
      sha256: sha256File(scriptPath),
    },
    scenarioStatuses,
    files,
    manifestSelfExcludedFromFiles: true,
  };
  const manifestPath = path.join(OUTPUT_ROOT, 'group-manifest-s01-s08.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const totals = scenarioStatuses.reduce((summary, scenario) => ({
    pass: summary.pass + scenario.passCount,
    error: summary.error + scenario.errorCount,
  }), { pass: 0, error: 0 });
  process.stdout.write(`${JSON.stringify({
    manifest: manifestPath,
    publicationState: manifest.publicationState,
    buildId,
    head,
    dirty,
    variants: totals,
    evidenceFileCount: files.length,
    scenarios: scenarioStatuses.map(({ scenario, status, passCount, errorCount }) => ({
      scenario,
      status,
      passCount,
      errorCount,
    })),
  }, null, 2)}\n`);
  if (totals.error > 0) process.exitCode = 1;
}

await main();
