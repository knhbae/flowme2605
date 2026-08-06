import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { chromium } from 'playwright';

const REPO_ROOT = process.cwd();
const BASE_URL = (process.env.FLOWME_EVIDENCE_BASE_URL || 'http://127.0.0.1:3114').replace(/\/$/u, '');
const OUTPUT_ROOT = path.resolve(
  process.env.FLOWME_P35_R2_REVIEW_EVIDENCE_DIR
    || path.join(REPO_ROOT, 'output', 'playwright', 'p35-round2-review-rehearsal'),
);
const SCENARIOS = Array.from({ length: 8 }, (_, index) => `S${String(index + 9).padStart(2, '0')}`);
const BUILD_ID_PATH = path.join(REPO_ROOT, '.next', 'BUILD_ID');
const BUILD_ID = fs.existsSync(BUILD_ID_PATH) ? fs.readFileSync(BUILD_ID_PATH, 'utf8').trim() : 'UNKNOWN';
const HEAD = git(['rev-parse', 'HEAD']).trim();
const GIT_STATUS = git(['status', '--short', '--branch']);
const DIRTY = GIT_STATUS.split(/\r?\n/u).some((line) => line.length > 0 && !line.startsWith('##'));
const EVIDENCE_CLASS = DIRTY ? 'LOCAL_REHEARSAL_NOT_FINAL' : 'CANDIDATE_BOUND_LOCAL_CAPTURE';
const BUNDLES_STORAGE_KEY = 'flow_builder_mvp_bundles_v11';
const RECEIPT_STORAGE_KEY = 'flow:export-receipts:v1';
const DEFAULT_VIEWPORT = { width: 390, height: 844 };
const CHROME_EXECUTABLE = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);

function git(args) {
  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  return result.stdout.trimEnd();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function kstNow() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date());
  return `${parts.replace(' ', 'T')}+09:00`;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return filePath;
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
  return filePath;
}

function scenarioDir(id) {
  if (!SCENARIOS.includes(id)) throw new Error(`Unowned scenario directory: ${id}`);
  const target = path.resolve(OUTPUT_ROOT, id);
  const relative = path.relative(OUTPUT_ROOT, target);
  if (relative !== id || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Unsafe scenario output path: ${target}`);
  }
  return target;
}

function prepareOutput() {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  for (const id of SCENARIOS) {
    const target = scenarioDir(id);
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
  }
}

function url(route) {
  return new URL(route, `${BASE_URL}/`).toString();
}

async function waitForApp(page) {
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 20_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function goto(page, route) {
  const response = await page.goto(url(route), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await waitForApp(page);
  return response;
}

async function visible(locator, label, timeout = 20_000) {
  await locator.waitFor({ state: 'visible', timeout }).catch((error) => {
    throw new Error(`${label} was not visible: ${error.message}`);
  });
  return locator;
}

async function storageSnapshot(page) {
  return page.evaluate(() => {
    const read = (storage) => Object.fromEntries(
      Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter(Boolean)
        .sort()
        .map((key) => [key, storage.getItem(key) ?? '']),
    );
    return { local: read(window.localStorage), session: read(window.sessionStorage) };
  });
}

async function pageQuality(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll(
      'button,a[href],input,select,textarea,summary,[role="button"],[tabindex]:not([tabindex="-1"])',
    )].filter(isVisible);
    const unnamed = controls.filter((element) => ![
      element.getAttribute('aria-label'),
      element.getAttribute('aria-labelledby'),
      element.getAttribute('title'),
      element.textContent,
      element.value,
      element.placeholder,
    ].some((value) => typeof value === 'string' && value.trim().length > 0));
    const clipped = controls.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > window.innerWidth + 1;
    });
    const relationErrors = [...document.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]')]
      .filter(isVisible)
      .flatMap((element) => ['aria-labelledby', 'aria-describedby', 'aria-controls'].flatMap((attribute) => {
        if (attribute === 'aria-controls' && element.getAttribute('aria-expanded') === 'false') return [];
        return (element.getAttribute(attribute) || '').split(/\s+/u).filter(Boolean)
          .filter((id) => !document.getElementById(id)).map((id) => `${attribute}:${id}`);
      }));
    return {
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      scroll: {
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        horizontalOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
          document.body.scrollWidth - document.body.clientWidth,
        ),
      },
      unnamedInteractiveCount: unnamed.length,
      horizontallyClippedInteractiveCount: clipped.length,
      brokenRelations: [...new Set(relationErrors)].sort(),
      replacementCharacterCount: (document.body.innerText.match(/�/gu) || []).length,
      visibleInteractiveCount: controls.length,
    };
  });
}

function createEvidenceLog(id) {
  return {
    scenarioId: id,
    evidenceClass: EVIDENCE_CLASS,
    orderedStateIds: [],
    fullScreenFiles: [],
    actionSequence: [],
    gaps: [],
  };
}

async function capture(page, id, evidence, stateId, filename) {
  const target = path.join(scenarioDir(id), filename);
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: target, fullPage: true, animations: 'disabled' });
  evidence.orderedStateIds.push(stateId);
  evidence.fullScreenFiles.push({
    stateId,
    relativePath: path.relative(OUTPUT_ROOT, target).replaceAll('\\', '/'),
    bytes: fs.statSync(target).size,
    sha256: sha256File(target),
    mime: 'image/png',
    route: page.url(),
  });
  return target;
}

async function startScenario(browser, id, options = {}) {
  const consoleMessages = [];
  const network = [];
  const context = await browser.newContext({
    viewport: options.viewport || DEFAULT_VIEWPORT,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    colorScheme: 'light',
    reducedMotion: options.reducedMotion || 'no-preference',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on('console', (message) => consoleMessages.push({
    type: message.type(), text: message.text(), location: message.location(), at: kstNow(),
  }));
  page.on('pageerror', (error) => consoleMessages.push({ type: 'pageerror', text: error.message, at: kstNow() }));
  page.on('requestfailed', (request) => network.push({
    kind: 'failed', method: request.method(), resourceType: request.resourceType(),
    url: request.url(), failure: request.failure()?.errorText || 'unknown', at: kstNow(),
  }));
  page.on('response', (response) => {
    const request = response.request();
    if (response.status() >= 400 || ['document', 'fetch', 'xhr'].includes(request.resourceType())) {
      network.push({
        kind: 'response', method: request.method(), resourceType: request.resourceType(),
        url: response.url(), status: response.status(), at: kstNow(),
      });
    }
  });
  return { context, page, consoleMessages, network, evidence: createEvidenceLog(id) };
}

async function finishScenario(run, details) {
  const { context, page, consoleMessages, network, evidence } = run;
  const finalStorage = await storageSnapshot(page).catch(() => ({ unavailable: true }));
  writeJson(path.join(scenarioDir(evidence.scenarioId), 'console.json'), consoleMessages);
  writeJson(path.join(scenarioDir(evidence.scenarioId), 'network.json'), network);
  writeJson(path.join(scenarioDir(evidence.scenarioId), 'storage-after.json'), finalStorage);
  writeJson(path.join(scenarioDir(evidence.scenarioId), 'state.json'), {
    ...evidence,
    routeState: page.url(),
    capturedAtKst: kstNow(),
    consoleNetworkStatus: {
      consoleErrors: consoleMessages.filter((entry) => entry.type === 'error' || entry.type === 'pageerror').length,
      failedRequests: network.filter((entry) => entry.kind === 'failed').length,
      expectedNavigationOrPrefetchAborts: network.filter(
        (entry) => entry.kind === 'failed' && entry.failure === 'net::ERR_ABORTED',
      ).length,
      unexpectedFailedRequests: network.filter(
        (entry) => entry.kind === 'failed' && entry.failure !== 'net::ERR_ABORTED',
      ).length,
      httpErrors: network.filter((entry) => entry.kind === 'response' && entry.status >= 400).length,
    },
    pageQuality: await pageQuality(page).catch(() => ({ unavailable: true })),
    ...details,
  });
  await context.close();
}

async function seedSavedFlow(page, slug, { anchor = '2031-09-01', dated = true } = {}) {
  await goto(page, '/flows');
  await page.evaluate(({ flowSlug, anchorDate, hasDate }) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    const record = {
      slug: flowSlug,
      savedAt: '2031-08-01T00:00:00.000Z',
      selectedArtifactMode: hasDate ? 'calendar' : 'checklist',
      dateIntent: hasDate ? 'custom' : 'undated',
    };
    if (hasDate) record.anchor = anchorDate;
    window.localStorage.setItem(`flow:saved:${flowSlug}`, JSON.stringify(record));
    if (hasDate) {
      window.localStorage.setItem(
        `flow:${flowSlug}:anchorDate`,
        JSON.stringify({ mode: 'custom', anchor: anchorDate }),
      );
    }
  }, { flowSlug: slug, anchorDate: anchor, hasDate: dated });
}

async function openSavedFlow(page, slug, mobileSection = 'record') {
  await goto(page, `/my?flow=${encodeURIComponent(slug)}`);
  const flowView = page.getByTestId('my-flow-todo-experiment-view-flows');
  if (await flowView.isVisible().catch(() => false)) {
    if ((await flowView.getAttribute('aria-selected')) !== 'true') await flowView.click();
  }
  const wide = (page.viewportSize()?.width || 0) >= 900;
  const library = page.getByTestId('my-flow-library-workspace');
  if (wide || await library.isVisible().catch(() => false)) {
    await visible(library, 'saved plan library');
    const row = library.locator(`[data-testid="my-flow-library-row"][data-flow-slug="${slug}"]`);
    await visible(row, `saved plan row ${slug}`);
    await row.click();
    const card = library.getByTestId('my-flow-library-detail')
      .locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${slug}"]`);
    return visible(card, `saved plan detail ${slug}`);
  }
  const directCard = page.locator(`[data-testid="my-flow-overview-card"][data-flow-slug="${slug}"]:visible`);
  if (await directCard.isVisible().catch(() => false)) return directCard;
  let workspace = page.locator(`[data-testid="my-flow-mobile-workspace"][data-flow-slug="${slug}"]:visible`);
  if (!(await workspace.isVisible().catch(() => false))) {
    const compactRow = page.locator(`[data-testid="my-flow-mobile-structure-row"][data-flow-slug="${slug}"]`);
    await visible(compactRow, `mobile saved plan row ${slug}`);
    await compactRow.getByTestId('my-flow-mobile-structure-open').click();
    workspace = page.locator(`[data-testid="my-flow-mobile-workspace"][data-flow-slug="${slug}"]:visible`);
    await visible(workspace, `mobile saved plan workspace ${slug}`);
  }
  const tab = workspace.getByTestId(`my-flow-workspace-tab-${mobileSection}`);
  if (await tab.isVisible().catch(() => false)) await tab.click();
  if (mobileSection === 'plan') {
    const planToggle = workspace.getByTestId('my-flow-workspace-plan-toggle');
    if (
      await planToggle.isVisible().catch(() => false)
      && (await planToggle.getAttribute('aria-expanded')) === 'false'
    ) {
      await planToggle.click();
    }
  }
  return workspace;
}

async function openTransferPanel(page, slug) {
  const workspace = await openSavedFlow(page, slug, 'record');
  const entry = workspace.getByTestId('my-flow-export-entry');
  await visible(entry, 'saved transfer entry');
  await entry.click();
  const panel = workspace.getByTestId('my-flow-export-panel');
  await visible(panel, 'saved transfer panel');
  return { workspace, panel, entry };
}

async function makeDestinationVisible(panel, destination) {
  const button = panel.getByTestId(`my-flow-export-${destination}`);
  if (await button.isVisible().catch(() => false)) return button;
  const more = panel.getByTestId('my-flow-export-more-formats');
  await visible(more, 'more formats');
  if ((await more.getAttribute('open')) === null) await more.locator(':scope > summary').click();
  return visible(button, `${destination} destination`);
}

async function openConfirmation(panel, destination) {
  await (await makeDestinationVisible(panel, destination)).click();
  return visible(panel.getByTestId('my-flow-transfer-confirmation'), `${destination} confirmation`);
}

async function installClipboardCapture(page, { denyFirst = false, delayed = false } = {}) {
  await page.evaluate(({ failFirst, gate }) => {
    const target = window;
    target.__evidenceClipboardText = '';
    target.__evidenceClipboardWrites = 0;
    target.__evidenceClipboardSuccesses = 0;
    let failuresRemaining = failFirst ? 1 : 0;
    let release;
    const wait = gate ? new Promise((resolve) => { release = resolve; }) : Promise.resolve();
    target.__evidenceReleaseClipboard = release;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          target.__evidenceClipboardWrites += 1;
          if (failuresRemaining > 0) {
            failuresRemaining -= 1;
            throw new DOMException('evidence clipboard permission denied', 'NotAllowedError');
          }
          await wait;
          target.__evidenceClipboardSuccesses += 1;
          target.__evidenceClipboardText = value;
        },
        readText: async () => target.__evidenceClipboardText,
      },
    });
  }, { failFirst: denyFirst, gate: delayed });
}

async function clipboardState(page) {
  return page.evaluate(() => ({
    text: window.__evidenceClipboardText || '',
    writes: window.__evidenceClipboardWrites || 0,
    successes: window.__evidenceClipboardSuccesses || 0,
  }));
}

async function closeSuccessfulReceipt(panel) {
  const close = panel.getByTestId('my-flow-transfer-receipt').getByTestId('flow-transfer-success-close');
  if (await close.isVisible().catch(() => false)) await close.click();
}

async function allDataAttributes(locator) {
  return locator.evaluate((element) => Object.fromEntries(
    [...element.attributes].filter((attribute) => attribute.name.startsWith('data-'))
      .map((attribute) => [attribute.name, attribute.value]),
  ));
}

function parseIcs(raw) {
  const unfolded = raw.replace(/\r?\n[ \t]/gu, '');
  return {
    newline: raw.includes('\r\n') ? 'CRLF' : 'LF',
    veventCount: (unfolded.match(/^BEGIN:VEVENT$/gmu) || []).length,
    uids: [...unfolded.matchAll(/^UID:(.+)$/gmu)].map((match) => match[1].trim()),
    dtstarts: [...unfolded.matchAll(/^DTSTART[^:]*:(.+)$/gmu)].map((match) => match[1].trim()),
    validCalendarEnvelope: unfolded.includes('BEGIN:VCALENDAR') && unfolded.includes('END:VCALENDAR'),
  };
}

function parseTsv(raw) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (char === '"') {
      if (quoted && next === '"') { field += '"'; index += 1; } else quoted = !quoted;
    } else if (char === '\t' && !quoted) {
      row.push(field); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return {
    newline: raw.includes('\r\n') ? 'CRLF' : 'LF',
    rowCount: Math.max(0, rows.length - 1),
    columnCount: rows[0]?.length || 0,
    consistentColumnCount: rows.every((entry) => entry.length === (rows[0]?.length || 0)),
    headers: rows[0] || [],
  };
}

function countRequestIdRecords(value, requestId) {
  if (Array.isArray(value)) {
    return value.reduce((count, entry) => count + countRequestIdRecords(entry, requestId), 0);
  }
  if (!value || typeof value !== 'object') return 0;
  return (value.requestId === requestId ? 1 : 0)
    + Object.values(value).reduce(
      (count, entry) => count + countRequestIdRecords(entry, requestId),
      0,
    );
}

async function runS09(browser) {
  const id = 'S09';
  const run = await startScenario(browser, id, { viewport: { width: 1024, height: 768 } });
  const { page, evidence } = run;
  const formats = {};
  await seedSavedFlow(page, 'moving-d30-basic', { anchor: '2031-09-01', dated: true });
  const storageBefore = await storageSnapshot(page);
  writeJson(path.join(scenarioDir(id), 'storage-before.json'), storageBefore);
  let { panel } = await openTransferPanel(page, 'moving-d30-basic');
  await installClipboardCapture(page);

  const orderedFormats = ['calendar', 'checklist', 'sheet', 'memo'];
  let ordinal = 1;
  for (const format of orderedFormats) {
    const confirmation = await openConfirmation(panel, format);
    const confirmationAttributes = await allDataAttributes(confirmation);
    const itemIds = (confirmationAttributes['data-item-ids'] || '').split(',').filter(Boolean);
    await capture(page, id, evidence, `${format}_confirmation`, `${String(ordinal).padStart(2, '0')}-${format}-confirmation-full.png`);
    ordinal += 1;
    let raw = '';
    let transport = '';
    let originalFilename = null;
    if (format === 'calendar') {
      const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
      await confirmation.getByTestId('my-flow-transfer-confirm').click();
      const download = await downloadPromise;
      const rawPath = path.join(scenarioDir(id), 'raw', 'moving-d30-basic-calendar.ics');
      await download.saveAs(rawPath);
      raw = fs.readFileSync(rawPath, 'utf8');
      transport = 'download';
      originalFilename = download.suggestedFilename();
    } else {
      await confirmation.getByTestId('my-flow-transfer-confirm').click();
      const clip = await clipboardState(page);
      raw = clip.text;
      transport = 'clipboard';
      const extension = format === 'sheet' ? 'tsv' : format === 'memo' ? 'md' : 'txt';
      writeText(path.join(scenarioDir(id), 'raw', `moving-d30-basic-${format}.${extension}`), raw);
    }
    const receipt = panel.getByTestId('my-flow-transfer-receipt');
    await visible(receipt, `${format} receipt`);
    const receiptAttributes = await allDataAttributes(receipt);
    await capture(page, id, evidence, `${format}_receipt`, `${String(ordinal).padStart(2, '0')}-${format}-receipt-full.png`);
    ordinal += 1;
    formats[format] = {
      confirmationAttributes,
      receiptAttributes,
      itemIds,
      effectiveItemCount: itemIds.length,
      raw: {
        transport,
        originalFilename,
        bytes: Buffer.byteLength(raw, 'utf8'),
        sha256: sha256(raw),
        mime: confirmationAttributes['data-media-type'] || receiptAttributes['data-media-type'] || null,
        newline: raw.includes('\r\n') ? 'CRLF' : 'LF',
      },
      parser: format === 'calendar' ? parseIcs(raw)
        : format === 'sheet' ? parseTsv(raw)
          : format === 'checklist' ? { checklistLineCount: (raw.match(/^- \[[ x]\]/gmu) || []).length }
            : { numberedItemCount: (raw.match(/^\d+\. /gmu) || []).length, containsTab: raw.includes('\t') },
    };
    await closeSuccessfulReceipt(panel);
  }

  await seedSavedFlow(page, 'vehicle-inspection-prep', { dated: false });
  ({ panel } = await openTransferPanel(page, 'vehicle-inspection-prep'));
  const recovery = panel.getByTestId('my-flow-export-calendar-recovery');
  const unavailableReason = await recovery.isVisible().catch(() => false) ? (await recovery.innerText()).trim() : null;
  await capture(page, id, evidence, 'undated_unavailable', '09-undated-calendar-recovery-full.png');
  evidence.actionSequence.push(
    'seed dated moving plan',
    'open saved result panel',
    'preview and execute Calendar/Checklist/Sheet/Memo in order',
    'capture actual download/clipboard bytes and receipts',
    'open undated plan and record Calendar recovery reason',
  );
  await finishScenario(run, {
    seedId: 'moving-d30-basic@2031-09-01 + vehicle-inspection-prep@undated',
    seedSha256: sha256(JSON.stringify({ moving: '2031-09-01', undated: true })),
    viewportInput: { width: 1024, height: 768, zoom: 1, dpr: 1, motion: 'no-preference' },
    persistentWriteCount: orderedFormats.length,
    formats,
    unavailableOrHeld: { calendarUndatedReason: unavailableReason },
    receiptRegistry: JSON.parse((await storageSnapshot(page)).local[RECEIPT_STORAGE_KEY] || 'null'),
    reviewerStatus: 'LOCAL_REHEARSAL',
  });
}

async function runS10(browser) {
  const id = 'S10';
  const run = await startScenario(browser, id);
  const { page, evidence } = run;
  await goto(page, '/flows');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  writeJson(path.join(scenarioDir(id), 'storage-before.json'), await storageSnapshot(page));

  await goto(page, '/flow-maps/curated-allblanc-workout-park');
  const choose = await visible(page.getByTestId('flow-map-choose-child'), 'choose-child map');
  const chooseLinks = await choose.getByRole('link').evaluateAll((links) => links.map((link) => ({
    text: link.textContent?.trim() || '', href: link.getAttribute('href'),
  })));
  await capture(page, id, evidence, 'choose_child', '01-choose-child-full.png');

  await goto(page, '/flow-maps/baby-food-map');
  const hold = await visible(page.getByTestId('flow-map-review-hold'), 'review hold map');
  const holdAttributes = await allDataAttributes(hold);
  await capture(page, id, evidence, 'review_hold', '02-review-hold-full.png');

  await goto(page, '/flow-maps/middle-school-math-1');
  const map = await visible(page.getByTestId('flow-map-public'), 'save-all map');
  const originalIds = JSON.parse(
    await map.getByTestId('flow-map-effective-snapshot').getAttribute('data-flow-map-item-ids') || '[]',
  );
  await page.getByTestId('flow-map-adjust-save-mobile').click();
  const editor = await visible(page.getByTestId('flow-map-adjust-panel'), 'map editor');
  await capture(page, id, evidence, 'save_all_editor_open', '03-save-all-editor-full.png');
  const checks = editor.locator('input[type="checkbox"]');
  const checkCount = await checks.count();
  if (checkCount > 1) await checks.last().uncheck();
  await editor.getByTestId('flow-map-adjust-apply').click();
  await editor.waitFor({ state: 'detached' });
  const effective = map.getByTestId('flow-map-effective-snapshot');
  const affectedIds = JSON.parse(await effective.getAttribute('data-flow-map-item-ids') || '[]');
  await capture(page, id, evidence, 'save_all_adjusted', '04-save-all-adjusted-full.png');
  const beforeFailure = await storageSnapshot(page);

  await page.evaluate((failureKey) => {
    const original = Storage.prototype.setItem;
    let failed = false;
    Storage.prototype.setItem = function evidenceSetItem(key, value) {
      if (!failed && this === window.localStorage && key === failureKey) {
        failed = true;
        throw new DOMException('evidence map persistence failure', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
    window.__restoreEvidenceStorageSetItem = () => { Storage.prototype.setItem = original; };
  }, 'flow:map:persistence:middle-school-math-1');
  await page.getByTestId('flow-map-save-all-mobile').click();
  const saveError = await visible(page.getByTestId('flow-map-save-error'), 'map save error');
  const failureText = (await saveError.innerText()).trim();
  const afterFailure = await storageSnapshot(page);
  await capture(page, id, evidence, 'save_all_failure', '05-save-all-failure-full.png');
  await page.evaluate(() => window.__restoreEvidenceStorageSetItem());
  await page.getByTestId('flow-map-save-all-mobile').click();
  await page.waitForURL(/\/my\?savedMap=middle-school-math-1/u, { timeout: 20_000 });
  await waitForApp(page);
  await capture(page, id, evidence, 'save_all_retried', '06-save-all-success-full.png');
  const savedStorage = await storageSnapshot(page);
  writeJson(path.join(scenarioDir(id), 'raw', 'storage-journal.json'), {
    beforeFailure, afterFailure, afterRetry: savedStorage,
  });
  evidence.actionSequence.push(
    'inspect choose-child map',
    'inspect review-hold map',
    'open save-all editor and exclude one child item',
    'inject one atomic persistence failure',
    'verify unchanged storage and retry to My Plans',
  );
  evidence.gaps.push('No distinct product conflict state is exposed; atomic failure/retry is captured instead.');
  await finishScenario(run, {
    seedId: 'built-in-flow-map-fixtures',
    seedSha256: sha256(JSON.stringify({ choose: chooseLinks, originalIds })),
    viewportInput: { ...DEFAULT_VIEWPORT, zoom: 1, motion: 'no-preference' },
    mapStates: {
      chooseChild: { links: chooseLinks },
      reviewHold: holdAttributes,
      saveAll: { originalIds, affectedIds, failureText },
      conflict: 'NOT_EXPOSED',
    },
    storageAtomicOnFailure: JSON.stringify(beforeFailure) === JSON.stringify(afterFailure),
    persistentWriteCount: Object.keys(savedStorage.local).filter((key) => key.startsWith('flow:map:')).length,
    reviewerStatus: 'LOCAL_REHEARSAL_WITH_GAP',
  });
}

async function runS11(browser) {
  const id = 'S11';
  const run = await startScenario(browser, id);
  const { page, evidence } = run;
  const focusSequence = [];
  await goto(page, '/flow-maps/curated-wedding-checklist-family');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  writeJson(path.join(scenarioDir(id), 'storage-before.json'), await storageSnapshot(page));
  const help = await visible(page.getByTestId('flow-map-choice-help-trigger'), 'choice help trigger');
  const helpClosed = await allDataAttributes(help);
  await capture(page, id, evidence, 'help_closed', '01-help-closed-full.png');
  await help.focus();
  focusSequence.push({ action: 'focus help', active: await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) });
  await page.keyboard.press('Enter');
  const helpSheet = await visible(page.getByTestId('flow-map-choice-help-sheet'), 'choice help sheet');
  focusSequence.push({ action: 'Enter', active: await page.evaluate(() => document.activeElement?.textContent?.trim()) });
  await capture(page, id, evidence, 'help_open_enter', '02-help-open-enter-full.png');
  const helpAria = await helpSheet.ariaSnapshot();
  await page.keyboard.press('Escape');
  await helpSheet.waitFor({ state: 'detached' });
  focusSequence.push({ action: 'Escape', returnedToTrigger: await help.evaluate((element) => element === document.activeElement) });
  await page.keyboard.press('Space');
  await visible(page.getByTestId('flow-map-choice-help-sheet'), 'choice help sheet reopened');
  focusSequence.push({ action: 'Space', expanded: await help.getAttribute('aria-expanded') });
  await page.keyboard.press('Escape');

  await goto(page, '/f/curated-allblanc-morning-workout');
  const conditional = await visible(
    page.locator('[data-testid="flow-capability-conditional-result"][data-capability-destination="calendar"]'),
    'conditional Calendar result',
  );
  const conditionalAttrs = await allDataAttributes(conditional);
  await capture(page, id, evidence, 'condition_closed', '03-condition-result-full.png');
  await conditional.getByTestId('flow-capability-conditional-edit').click();
  const conditionEditor = await visible(page.getByTestId('public-flow-personal-adjustment'), 'condition editor');
  const conditionEditorAttrs = await allDataAttributes(conditionEditor);
  await capture(page, id, evidence, 'condition_open', '04-condition-editor-open-full.png');
  await page.keyboard.press('Escape');

  await seedSavedFlow(page, 'moving-d30-basic', { anchor: '2031-09-01', dated: true });
  const { panel } = await openTransferPanel(page, 'moving-d30-basic');
  const confirmation = await openConfirmation(panel, 'checklist');
  const warning = await visible(confirmation.getByTestId('flow-transfer-one-way-warning'), 'one-way warning');
  const warningText = (await warning.innerText()).trim();
  await capture(page, id, evidence, 'warning_closed', '05-warning-closed-full.png');
  const warningTrigger = await visible(confirmation.getByTestId('flow-transfer-one-way-help-trigger'), 'warning help trigger');
  await warningTrigger.focus();
  await page.keyboard.press('Enter');
  const warningSheet = await visible(page.getByTestId('flow-transfer-one-way-help-sheet'), 'warning help sheet');
  await capture(page, id, evidence, 'warning_open', '06-warning-open-full.png');
  const warningAria = await warningSheet.ariaSnapshot();
  await page.keyboard.press('Escape');
  const warningFocusReturned = await warningTrigger.evaluate((element) => element === document.activeElement);
  evidence.actionSequence.push(
    'help closed -> Enter open -> Escape focus return -> Space open',
    'conditional Calendar result -> shared date editor',
    'one-way warning closed -> Enter open -> Escape focus return',
  );
  await finishScenario(run, {
    seedId: 'help-condition-warning-built-in-fixtures',
    seedSha256: sha256(JSON.stringify({ help: helpClosed, condition: conditionalAttrs, warningText })),
    viewportInput: { ...DEFAULT_VIEWPORT, zoom: 1, motion: 'no-preference' },
    accessibilityTrace: {
      focusSequence,
      helpClosed,
      helpAria,
      conditionalAttrs,
      conditionEditorAttrs,
      warningText,
      warningAria,
      warningFocusReturned,
    },
    persistentWriteCount: 0,
    reviewerStatus: 'LOCAL_REHEARSAL',
  });
}

async function installReceiptStorageFailure(page, targetKey) {
  await page.evaluate((storageKey) => {
    const original = Storage.prototype.setItem;
    let remaining = 1;
    window.__evidenceReceiptFailures = 0;
    Storage.prototype.setItem = function evidenceReceiptSetItem(key, value) {
      if (this === window.localStorage && key === storageKey && remaining > 0) {
        remaining -= 1;
        window.__evidenceReceiptFailures += 1;
        throw new DOMException('evidence receipt storage failure', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  }, targetKey);
}

async function runS12(browser) {
  const id = 'S12';
  const run = await startScenario(browser, id);
  const { page, evidence } = run;
  const result = {};

  await seedSavedFlow(page, 'moving-d30-basic', { anchor: '2031-09-01', dated: true });
  let opened = await openTransferPanel(page, 'moving-d30-basic');
  await installClipboardCapture(page, { delayed: true });
  let confirmation = await openConfirmation(opened.panel, 'checklist');
  const duplicateRequestId = await confirmation.getAttribute('data-transfer-request-id');
  const duplicateReceiptKey = await confirmation.getAttribute('data-receipt-storage-key');
  const beforeDuplicate = await storageSnapshot(page);
  const confirmButton = confirmation.getByTestId('my-flow-transfer-confirm');
  await confirmButton.evaluate((element) => { element.click(); element.click(); });
  await page.waitForFunction(() => window.__evidenceClipboardWrites === 1);
  await capture(page, id, evidence, 'duplicate_pending_lock', '01-duplicate-pending-lock-full.png');
  await page.evaluate(() => window.__evidenceReleaseClipboard());
  let receipt = await visible(opened.panel.getByTestId('my-flow-transfer-receipt'), 'duplicate receipt');
  await capture(page, id, evidence, 'duplicate_succeeded', '02-duplicate-one-receipt-full.png');
  const duplicateClip = await clipboardState(page);
  const afterDuplicate = await storageSnapshot(page);
  const duplicateRawReceipt = afterDuplicate.local[duplicateReceiptKey] || '';
  result.duplicate = {
    requestId: duplicateRequestId,
    clipboard: duplicateClip,
    requestIdRecordCount: countRequestIdRecords(JSON.parse(duplicateRawReceipt), duplicateRequestId),
    onlyReceiptKeyAdded: Object.keys(afterDuplicate.local).filter((key) => !(key in beforeDuplicate.local)),
  };
  await receipt.getByTestId('flow-transfer-success-close').click();
  await page.reload();
  await waitForApp(page);
  opened = await openTransferPanel(page, 'moving-d30-basic');
  receipt = await visible(opened.panel.getByTestId('my-flow-transfer-receipt'), 'reloaded receipt');
  result.reload = {
    requestId: await receipt.getAttribute('data-transfer-request-id'),
    sameRequestId: (await receipt.getAttribute('data-transfer-request-id')) === duplicateRequestId,
  };
  await capture(page, id, evidence, 'receipt_reloaded', '03-receipt-reloaded-full.png');

  await seedSavedFlow(page, 'moving-d30-basic', { anchor: '2031-09-01', dated: true });
  opened = await openTransferPanel(page, 'moving-d30-basic');
  await installClipboardCapture(page);
  confirmation = await openConfirmation(opened.panel, 'checklist');
  const failureRequestId = await confirmation.getAttribute('data-transfer-request-id');
  const failureReceiptKey = await confirmation.getAttribute('data-receipt-storage-key');
  const beforeFailure = await storageSnapshot(page);
  await installReceiptStorageFailure(page, failureReceiptKey);
  await confirmation.getByTestId('my-flow-transfer-confirm').click();
  receipt = await visible(opened.panel.getByTestId('my-flow-transfer-receipt'), 'partial local receipt');
  const partialAttrs = await allDataAttributes(receipt);
  await capture(page, id, evidence, 'receipt_storage_failure', '04-receipt-storage-failure-full.png');
  const afterFailure = await storageSnapshot(page);
  await receipt.getByTestId('my-flow-transfer-retry-receipt').click();
  receipt = await visible(opened.panel.getByTestId('my-flow-transfer-receipt'), 'receipt-only retry');
  const retryAttrs = await allDataAttributes(receipt);
  await capture(page, id, evidence, 'receipt_only_retry', '05-receipt-only-retry-full.png');
  const afterRetry = await storageSnapshot(page);
  result.failureRetry = {
    requestId: failureRequestId,
    partialAttrs,
    retryAttrs,
    clipboard: await clipboardState(page),
    storageUnchangedOnFailure: JSON.stringify(beforeFailure.local) === JSON.stringify(afterFailure.local),
    receiptPersistedOnRetry: Boolean(afterRetry.local[failureReceiptKey]),
    injectedFailures: await page.evaluate(() => window.__evidenceReceiptFailures),
  };

  await goto(page, '/flows');
  await goto(page, '/f/moving-d30-basic');
  const editorTrigger = page.locator('[data-testid="public-flow-adjust-entry-mobile"]:visible');
  await visible(editorTrigger, 'public editor trigger');
  await editorTrigger.click();
  await visible(page.getByTestId('public-flow-personal-adjustment'), 'public editor');
  await page.goBack();
  await page.waitForURL(/\/f\/moving-d30-basic/u);
  await page.getByTestId('public-flow-personal-adjustment').waitFor({ state: 'detached' });
  result.back = {
    route: page.url(),
    editorClosed: (await page.getByTestId('public-flow-personal-adjustment').count()) === 0,
    focusReturned: await editorTrigger.evaluate((element) => element === document.activeElement),
  };
  await capture(page, id, evidence, 'back_closes_editor', '06-back-closes-editor-full.png');
  writeJson(path.join(scenarioDir(id), 'raw', 'journals.json'), {
    beforeDuplicate, afterDuplicate, beforeFailure, afterFailure, afterRetry,
  });
  writeJson(path.join(scenarioDir(id), 'storage-before.json'), beforeDuplicate);
  evidence.actionSequence.push(
    'synchronous double click while clipboard pending',
    'release one artifact and verify one receipt',
    'reload and recover same receipt',
    'inject one receipt persistence failure',
    'retry receipt only without recreating artifact',
    'Back closes public editor and returns focus',
  );
  await finishScenario(run, {
    seedId: 'moving-d30-basic@2031-09-01',
    seedSha256: sha256(JSON.stringify({ slug: 'moving-d30-basic', anchor: '2031-09-01' })),
    viewportInput: { ...DEFAULT_VIEWPORT, zoom: 1, motion: 'no-preference' },
    recoveryTrace: result,
    persistentWriteCount: 1,
    reviewerStatus: 'LOCAL_REHEARSAL',
  });
}

async function runS13(browser) {
  const id = 'S13';
  const run = await startScenario(browser, id);
  const { page, evidence } = run;
  await goto(page, '/my');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await waitForApp(page);
  const fixtures = {
    sourceBacked: {
      key: 'flow:saved:source-backed-moving-d30',
      raw: '{"slug":"source-backed-moving-d30","savedAt":"2031-08-05T00:00:00.000Z","selectedArtifactMode":"calendar","dateIntent":"undated"}',
    },
    missingBase: {
      key: 'flow:saved:p1-04-missing-base',
      raw: '{"slug":"p1-04-missing-base","savedAt":"2031-08-05T00:00:00.000Z","selectedArtifactMode":"checklist","dateIntent":"undated"}',
    },
    malformed: { key: 'flow:saved:p1-04-malformed', raw: '{not-json' },
    sentinel: { key: 'flow:p1-04:legacy-matrix-sentinel', raw: '  local exact bytes  ' },
  };
  await page.evaluate((records) => {
    Object.values(records).forEach((fixture) => localStorage.setItem(fixture.key, fixture.raw));
    sessionStorage.setItem('flow:p1-04:legacy-matrix-session', '  session exact bytes  ');
  }, fixtures);
  const before = await storageSnapshot(page);
  writeJson(path.join(scenarioDir(id), 'storage-before.json'), before);
  for (const [name, fixture] of Object.entries(fixtures)) {
    writeText(path.join(scenarioDir(id), 'raw', `${name}.txt`), fixture.raw);
  }
  await goto(page, '/my?flow=source-backed-moving-d30');
  await capture(page, id, evidence, 'source_backed_read', '01-source-backed-read-full.png');
  await goto(page, '/my?flow=p1-04-missing-base');
  await capture(page, id, evidence, 'missing_base_fail_safe', '02-missing-base-full.png');
  await goto(page, '/my?flow=p1-04-malformed');
  await capture(page, id, evidence, 'malformed_fail_safe', '03-malformed-full.png');
  await page.reload();
  await waitForApp(page);
  const after = await storageSnapshot(page);
  const byteChecks = Object.fromEntries(Object.entries(fixtures).map(([name, fixture]) => [name, {
    key: fixture.key,
    beforeSha256: sha256(before.local[fixture.key] || ''),
    afterSha256: sha256(after.local[fixture.key] || ''),
    unchanged: before.local[fixture.key] === after.local[fixture.key],
    bytes: Buffer.byteLength(fixture.raw, 'utf8'),
  }]));
  writeJson(path.join(scenarioDir(id), 'raw', 'before-after-hashes.json'), byteChecks);
  evidence.actionSequence.push(
    'seed source-backed, missing-base, malformed, and exact-byte sentinels',
    'open each saved route',
    'reload malformed route',
    'compare every raw storage byte',
  );
  await finishScenario(run, {
    seedId: 'legacy-malformed-missing-base-matrix',
    seedSha256: sha256(JSON.stringify(fixtures)),
    viewportInput: { ...DEFAULT_VIEWPORT, zoom: 1, motion: 'no-preference' },
    rawBeforeAfter: byteChecks,
    wholeStorageByteEqual: JSON.stringify(before) === JSON.stringify(after),
    silentRewriteCount: Object.values(byteChecks).filter((entry) => !entry.unchanged).length,
    persistentWriteCount: 0,
    reviewerStatus: 'LOCAL_REHEARSAL',
  });
}

async function seedCountBundle(page, count) {
  await goto(page, '/my');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await waitForApp(page);
  const slug = `personal-copy:evidence-count-${count}`;
  const longTitle = '계약서·사진·열쇠🔑 가족과 함께 마지막으로 아주 길게 확인하기 — "특수"\t탭 \\ 역슬래시';
  const longDetail = '첫째 줄: 계약서의 "특약"과 사진 #1 확인 ✅\n둘째 줄:\t탭 값, 쉼표, 세미콜론; 역슬래시 \\ 보존\n셋째 줄: <완료>와 개인 기록 분리 🚚';
  const payload = await page.evaluate(({ key, itemCount, flowSlug, title, detail }) => {
    const bundles = JSON.parse(localStorage.getItem(key) || '[]');
    const flowId = `flow-evidence-count-${itemCount}`;
    const sectionId = `section-evidence-count-${itemCount}`;
    const items = Array.from({ length: itemCount }, (_, index) => {
      return {
        id: `${flowSlug}-item-${String(index + 1).padStart(2, '0')}`,
        flow_id: flowId,
        section_id: sectionId,
        title: index === 0 ? title : `${String(index + 1).padStart(2, '0')}번째 실제 저장 항목`,
        description: index === 0 ? detail : `${index + 1}번째 항목 설명`,
        type: 'todo',
        role: 'action',
        order: index,
      };
    });
    const itemDetails = items.map((item, index) => ({
      item_id: item.id,
      why: index === 0 ? detail : `${index + 1}번째 이유`,
      how: index === 0 ? detail : `${index + 1}번째 방법`,
      completion_criteria: index === 0
        ? `${title}\n필수 #1 & #2, 따옴표 "완료", emoji 🧾`
        : `${index + 1}번째 항목을 확인했습니다.`,
    }));
    const custom = {
      flow: {
        id: flowId,
        slug: flowSlug,
        title: `실제 저장 항목 ${itemCount}개 계획`,
        description: `저장 데이터 ${itemCount}개 밀도 검증`,
        category: 'evidence',
        structure_type: 'checklist',
        anchor_type: 'none',
        status: 'draft',
        primary_destination: 'internal_check',
        source_status: 'real',
        source_precision: 'exact',
        created_at: '2031-08-05T00:00:00.000Z',
        updated_at: '2031-08-05T00:00:00.000Z',
      },
      sections: [{ id: sectionId, flow_id: flowId, title: `항목 ${itemCount}개`, order: 0 }],
      items,
      itemDetails,
      repeatRules: [],
    };
    localStorage.setItem(key, JSON.stringify([...bundles.filter((entry) => entry.flow?.slug !== flowSlug), custom]));
    localStorage.setItem(`flow:saved:${flowSlug}`, JSON.stringify({
      schemaVersion: 2,
      slug: flowSlug,
      personalCopyKey: flowSlug,
      sourceFlowKey: flowSlug,
      sourceFlowSlug: 'moving-d30-basic',
      sourceVersion: `evidence-count-${itemCount}-v1`,
      lastSaveRequestId: `evidence-count-${itemCount}-request`,
      savedAt: '2031-08-05T00:00:00.000Z',
      savedItemCount: itemCount,
      selectedArtifactMode: 'checklist',
      dateIntent: 'undated',
    }));
    return {
      slug: flowSlug,
      itemIds: items.map((item) => item.id),
      custom,
      savedRaw: localStorage.getItem(`flow:saved:${flowSlug}`),
    };
  }, { key: BUNDLES_STORAGE_KEY, itemCount: count, flowSlug: slug, title: longTitle, detail: longDetail });
  return payload;
}

async function runS14(browser) {
  const id = 'S14';
  const run = await startScenario(browser, id);
  const { page, evidence } = run;
  const density = {};
  let firstStorage = null;
  for (const [index, count] of [1, 8, 24, 50].entries()) {
    const payload = await seedCountBundle(page, count);
    if (!firstStorage) firstStorage = await storageSnapshot(page);
    const workspace = await openSavedFlow(page, payload.slug, 'plan');
    const planOpen = workspace.locator('[data-testid="my-flow-batch-mode-toggle"]:visible').first();
    await visible(planOpen, `${count}-item plan editor trigger`);
    await planOpen.click();
    const editor = await visible(page.getByTestId('saved-flow-editor-plan'), `${count}-item plan editor`);
    const rows = editor.getByTestId('saved-flow-editor-item-row');
    await rows.first().waitFor({ state: 'visible' });
    const actualIds = await rows.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-item-id')));
    const quality = await pageQuality(page);
    await capture(
      page, id, evidence, `count_${count}_editor`,
      `${String(index + 1).padStart(2, '0')}-${String(count).padStart(2, '0')}-items-editor-full.png`,
    );
    writeJson(path.join(scenarioDir(id), 'raw', `${String(count).padStart(2, '0')}-item-bundle.json`), payload.custom);
    writeText(path.join(scenarioDir(id), 'raw', `${String(count).padStart(2, '0')}-saved-record.json`), payload.savedRaw);
    density[count] = {
      expectedCount: count,
      DOMRowCount: await rows.count(),
      itemIds: actualIds,
      idsPreserved: JSON.stringify(actualIds) === JSON.stringify(payload.itemIds),
      uniqueIdCount: new Set(actualIds).size,
      quality,
      payloadSha256: sha256(JSON.stringify(payload.custom)),
    };
    await page.keyboard.press('Escape');
    await editor.waitFor({ state: 'detached' });

    if (count === 50) {
      const recordWorkspace = await openSavedFlow(page, payload.slug, 'record');
      await installClipboardCapture(page);
      await recordWorkspace.getByTestId('my-flow-export-entry').click();
      const panel = await visible(recordWorkspace.getByTestId('my-flow-export-panel'), '50-item export panel');
      const confirmation = await openConfirmation(panel, 'checklist');
      const confirmationAttrs = await allDataAttributes(confirmation);
      await confirmation.getByTestId('my-flow-transfer-confirm').click();
      const artifact = await clipboardState(page);
      writeText(path.join(scenarioDir(id), 'raw', '50-item-checklist.md'), artifact.text);
      density[count].artifact = {
        bytes: Buffer.byteLength(artifact.text, 'utf8'),
        sha256: sha256(artifact.text),
        checklistLineCount: (artifact.text.match(/^- \[[ x]\]/gmu) || []).length,
        confirmationAttrs,
        containsLongTitle: artifact.text.includes('계약서·사진·열쇠🔑'),
        containsTab: artifact.text.includes('\t'),
        containsBackslash: artifact.text.includes('\\'),
      };
      await visible(panel.getByTestId('my-flow-transfer-receipt'), '50-item receipt');
      await capture(page, id, evidence, 'count_50_artifact_receipt', '05-50-items-artifact-receipt-full.png');
    }
  }
  writeJson(path.join(scenarioDir(id), 'storage-before.json'), firstStorage);
  evidence.actionSequence.push(
    'build real saved bundle with 1 item',
    'repeat with 8, 24, and 50 items',
    'open shared plan editor and collect ordered data-item-id values',
    'generate actual 50-item checklist clipboard artifact',
  );
  await finishScenario(run, {
    seedId: 'synthetic-real-storage-density-1-8-24-50',
    seedSha256: sha256(JSON.stringify(Object.values(density).map((entry) => entry.payloadSha256))),
    viewportInput: { ...DEFAULT_VIEWPORT, zoom: 1, motion: 'no-preference' },
    countsWithUnits: Object.fromEntries(Object.entries(density).map(([count, entry]) => [count, {
      Items: entry.DOMRowCount,
      uniqueItemIds: entry.uniqueIdCount,
      artifactLines: entry.artifact?.checklistLineCount ?? null,
    }])),
    density,
    persistentWriteCount: 1,
    reviewerStatus: 'LOCAL_REHEARSAL',
  });
}

async function runS15(browser) {
  const id = 'S15';
  const run = await startScenario(browser, id, { viewport: DEFAULT_VIEWPORT });
  const { context, page, evidence } = run;
  const viewports = [
    { state: 'mobile_390x844', width: 390, height: 844, file: '01-my-390x844-full.png' },
    { state: 'tablet_1024x768', width: 1024, height: 768, file: '02-my-1024x768-full.png' },
    { state: 'desktop_1440x1000', width: 1440, height: 1000, file: '03-my-1440x1000-full.png' },
    { state: 'reflow_proxy_720x500', width: 720, height: 500, file: '04-my-720x500-reflow-proxy-full.png' },
  ];
  const results = {};
  await goto(page, '/flows');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  writeJson(path.join(scenarioDir(id), 'storage-before.json'), await storageSnapshot(page));
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await goto(page, '/my?demo=ux20');
    const shell = await visible(page.getByTestId('my-flow-saved-library-shell'), 'saved library shell');
    const quality = await pageQuality(page);
    const geometry = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const fixedOrSticky = [...document.querySelectorAll('*')].filter((element) => {
        if (!visible(element)) return false;
        return ['fixed', 'sticky'].includes(getComputedStyle(element).position);
      }).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          testId: element.getAttribute('data-testid'),
          position: getComputedStyle(element).position,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        };
      });
      return { fixedOrSticky };
    });
    results[viewport.state] = {
      route: page.url(),
      q3Copy: await shell.getAttribute('data-p35-q3-copy'),
      quality,
      geometry,
      visiblePlanRows: await page.locator('[data-saved-identity]:visible').count(),
    };
    await capture(page, id, evidence, viewport.state, viewport.file);
  }
  evidence.actionSequence.push('capture same 20-plan route at 390, 1024, 1440, and 720x500 reflow proxy');
  evidence.gaps.push('Actual browser 200% zoom was not exercised; 720x500 is a reflow proxy only.');
  await finishScenario(run, {
    seedId: 'my-demo-ux20',
    seedSha256: sha256('my?demo=ux20'),
    viewportInput: viewports.map(({ width, height, state }) => ({ state, width, height, zoom: 1 })),
    viewportParity: results,
    actualBrowserZoom200: 'NOT_ASSESSED',
    reflowProxy: { width: 720, height: 500, claimBoundary: 'proxy_not_browser_zoom' },
    persistentWriteCount: 0,
    reviewerStatus: 'LOCAL_REHEARSAL_WITH_NOT_ASSESSED',
  });
  void context;
}

async function runS16(browser) {
  const id = 'S16';
  const run = await startScenario(browser, id, { reducedMotion: 'reduce' });
  const { page, evidence } = run;
  await goto(page, '/flow-maps/curated-wedding-checklist-family');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  writeJson(path.join(scenarioDir(id), 'storage-before.json'), await storageSnapshot(page));
  const trigger = await visible(page.getByTestId('flow-map-choice-help-trigger'), 'accessible disclosure trigger');
  const relationBefore = await allDataAttributes(trigger);
  const focus = [];
  await trigger.focus();
  focus.push({ step: 'trigger', active: await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) });
  await page.keyboard.press('Enter');
  const dialog = await visible(page.getByTestId('flow-map-choice-help-sheet'), 'accessible disclosure dialog');
  const ariaSnapshot = await dialog.ariaSnapshot();
  const reducedMotion = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press('Tab');
    focus.push(await page.evaluate((step) => ({
      step: `Tab ${step}`,
      tag: document.activeElement?.tagName,
      testId: document.activeElement?.getAttribute('data-testid'),
      name: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim(),
    }), index + 1));
  }
  await capture(page, id, evidence, 'reduced_motion_dialog', '01-reduced-motion-dialog-full.png');
  await page.keyboard.press('Escape');
  const focusReturned = await trigger.evaluate((element) => element === document.activeElement);

  await goto(page, '/flow-maps/middle-school-math-1');
  await page.evaluate((failureKey) => {
    const original = Storage.prototype.setItem;
    let failed = false;
    Storage.prototype.setItem = function evidenceA11yFailure(key, value) {
      if (!failed && this === localStorage && key === failureKey) {
        failed = true;
        throw new DOMException('evidence accessible error', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  }, 'flow:map:persistence:middle-school-math-1');
  await page.getByTestId('flow-map-save-all-mobile').click();
  const error = await visible(page.getByTestId('flow-map-save-error'), 'announced save error');
  const announcementTrace = await page.evaluate(() => [...document.querySelectorAll('[role="alert"],[aria-live]')]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map((element) => ({
      role: element.getAttribute('role'),
      live: element.getAttribute('aria-live'),
      atomic: element.getAttribute('aria-atomic'),
      text: element.textContent?.trim(),
      testId: element.getAttribute('data-testid'),
    })));
  const errorAttrs = await allDataAttributes(error);
  await capture(page, id, evidence, 'error_announcement', '02-error-announcement-full.png');
  const quality = await pageQuality(page);
  evidence.actionSequence.push(
    'enable prefers-reduced-motion',
    'focus disclosure trigger and open with Enter',
    'record ARIA snapshot and five Tab moves',
    'Escape and verify focus return',
    'inject map persistence failure and record alert/live regions',
  );
  evidence.gaps.push('No screen-reader speech output was captured; DOM name/role/relation and live-region evidence only.');
  await finishScenario(run, {
    seedId: 'wedding-help + middle-school-map-error',
    seedSha256: sha256(JSON.stringify({ route: 'wedding-help', error: 'map-persistence' })),
    viewportInput: { ...DEFAULT_VIEWPORT, zoom: 1, motion: 'reduce' },
    accessibilityTrace: {
      reducedMotion,
      relationBefore,
      ariaSnapshot,
      focus,
      focusReturned,
      announcementTrace,
      errorAttrs,
      pageQuality: quality,
      screenReaderSpeech: 'NOT_ASSESSED',
    },
    persistentWriteCount: 0,
    reviewerStatus: 'LOCAL_REHEARSAL_WITH_NOT_ASSESSED',
  });
}

function mimeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    '.png': 'image/png',
    '.json': 'application/json',
    '.ics': 'text/calendar;charset=utf-8',
    '.tsv': 'text/tab-separated-values;charset=utf-8',
    '.md': 'text/markdown;charset=utf-8',
    '.txt': 'text/plain;charset=utf-8',
  })[extension] || 'application/octet-stream';
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(resolved) : [resolved];
  });
}

async function main() {
  prepareOutput();
  const health = await fetch(BASE_URL, { redirect: 'manual' });
  if (health.status >= 400) throw new Error(`Evidence base URL unhealthy: ${BASE_URL} -> ${health.status}`);
  const startedAtKst = kstNow();
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_EXECUTABLE });
  const browserVersion = browser.version();
  const results = [];
  const runners = [runS09, runS10, runS11, runS12, runS13, runS14, runS15, runS16];
  for (const runner of runners) {
    const id = runner.name.slice(-3).toUpperCase();
    const started = Date.now();
    try {
      await runner(browser);
      results.push({ scenarioId: id, status: 'CAPTURED', elapsedMs: Date.now() - started });
    } catch (error) {
      writeJson(path.join(scenarioDir(id), 'failure.json'), {
        scenarioId: id,
        status: 'CAPTURE_FAILED',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
        capturedAtKst: kstNow(),
      });
      results.push({
        scenarioId: id,
        status: 'CAPTURE_FAILED',
        message: error instanceof Error ? error.message : String(error),
        elapsedMs: Date.now() - started,
      });
    }
  }
  await browser.close();
  const files = SCENARIOS.flatMap((id) => listFiles(scenarioDir(id))).sort().map((filePath) => ({
    relativePath: path.relative(OUTPUT_ROOT, filePath).replaceAll('\\', '/'),
    bytes: fs.statSync(filePath).size,
    sha256: sha256File(filePath),
    mime: mimeFor(filePath),
  }));
  const manifest = {
    schemaVersion: 1,
    group: 'S09-S16',
    status: EVIDENCE_CLASS,
    finalEvidenceEligible: !DIRTY,
    reason: DIRTY
      ? 'Working tree is dirty; this capture is a local evidence-only rehearsal and not final review evidence.'
      : 'Clean candidate-bound local capture; publication SHA and URLs are assigned only by the blind publication stage.',
    product: {
      head: HEAD,
      buildId: BUILD_ID,
      baseUrl: BASE_URL,
      gitDirty: DIRTY,
      gitStatus: GIT_STATUS,
    },
    runtime: {
      browser: `Chromium ${browserVersion}`,
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      node: process.version,
      locale: 'ko-KR',
      timezone: 'Asia/Seoul',
    },
    commandContract: {
      baseUrlEnv: 'FLOWME_EVIDENCE_BASE_URL',
      outputEnv: 'FLOWME_P35_R2_REVIEW_EVIDENCE_DIR',
      defaultOutput: 'output/playwright/p35-round2-review-rehearsal',
    },
    startedAtKst,
    completedAtKst: kstNow(),
    results,
    counts: {
      scenarios: results.length,
      captured: results.filter((entry) => entry.status === 'CAPTURED').length,
      failed: results.filter((entry) => entry.status !== 'CAPTURED').length,
      files: files.length,
      bytes: files.reduce((sum, entry) => sum + entry.bytes, 0),
    },
    files,
  };
  writeJson(path.join(OUTPUT_ROOT, 'group-manifest-s09-s16.json'), manifest);
  process.stdout.write(`${JSON.stringify(manifest.counts)}\n`);
  if (manifest.counts.failed > 0) process.exitCode = 1;
}

await main();
