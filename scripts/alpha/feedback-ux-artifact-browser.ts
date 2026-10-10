import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { chromium, type BrowserContext, type Locator, type Page } from 'playwright';
import { expect } from '@playwright/test';

export const feedbackViewports = [[390, 844], [375, 812], [844, 390], [1024, 768], [1440, 900]] as const;
export const feedbackLabKey = 'flow:poc:personal-workspace:v1:feedback-ux-lab:v1';
const artifactOrigin = 'http://127.0.0.1:3114';
const artifactRequestAllowed = (url: string) => url === `${artifactOrigin}/lab` || url === `${artifactOrigin}/report`
  || url.startsWith('data:') || url.startsWith('blob:');
const sentinelKey = 'flow:saved-plans';
const sentinelBytes = ' original feedback QA sentinel\r\n';
const otherKey = 'other-app:feedback-qa';
const otherBytes = ' exact  other bytes ';

type StorageWrite = { method: string; key: string; storage: string; allowed: boolean };
export type FeedbackSurfaceAudit = {
  errors: string[]; requests: string[]; writes: StorageWrite[]; checks: string[];
};
export type FeedbackArtifactSurface = {
  page: Page; context: BrowserContext; audit: FeedbackSurfaceAudit;
  check: (name: string, work: () => Promise<void>) => Promise<void>;
};
type ArtifactStep = (surface: FeedbackArtifactSurface) => Promise<void>;
type ArtifactRun = {
  labPath?: string; reportPath?: string; labSteps: ArtifactStep; reportSteps?: ArtifactStep;
  mode?: 'lab' | 'report' | 'all'; label?: string;
};

function sha(path: string) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function artifactPath(path: string) {
  const target = resolve(path), inside = relative(resolve('docs/content-audit'), target);
  assert(inside && !inside.startsWith('..') && !inside.includes(':') && target.endsWith('.html'), 'artifact-path-outside-current-content-audit');
  assert(existsSync(target), `artifact-missing: ${path}`);
  return target;
}

async function instrument(context: BrowserContext): Promise<FeedbackSurfaceAudit> {
  const audit: FeedbackSurfaceAudit = { errors: [], requests: [], writes: [], checks: [] };
  await context.exposeBinding('__feedbackAudit', (_source, entry: StorageWrite) => { audit.writes.push(entry); });
  // Plain script text avoids tsx helper names in browser callbacks. The two
  // sentinels are test setup in a fresh context, before the exact-key guard.
  await context.addInitScript({ content: `
    const exactKey = ${JSON.stringify(feedbackLabKey)};
    const nativeSet = Storage.prototype.setItem;
    nativeSet.call(localStorage, ${JSON.stringify(sentinelKey)}, ${JSON.stringify(sentinelBytes)});
    nativeSet.call(localStorage, ${JSON.stringify(otherKey)}, ${JSON.stringify(otherBytes)});
    nativeSet.call(sessionStorage, ${JSON.stringify(otherKey)}, ${JSON.stringify(otherBytes)});
    globalThis.__feedbackStorageAudit = [];
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function(...args) {
        const key = method === 'clear' ? '' : String(args[0]);
        const entry = { method, key, storage: this === localStorage ? 'local' : this === sessionStorage ? 'session' : 'unknown',
          allowed: method !== 'clear' && key === exactKey };
        globalThis.__feedbackStorageAudit.push(entry);
        void globalThis.__feedbackAudit(entry);
        if (!entry.allowed) throw Error('feedback-lab-storage-outside-exact-key');
        return Reflect.apply(original, this, args);
      }});
    }
  ` });
  await context.route('**/*', async route => {
    if (artifactRequestAllowed(route.request().url())) await route.continue();
    else await route.abort('blockedbyclient');
  });
  return audit;
}

/** Scroll and verify the actual hit target; never force a hidden click. */
export async function feedbackClick(target: Locator): Promise<void> {
  await expect(target).toBeVisible();
  await target.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await expect.poll(() => target.evaluate(element => {
    const rect = element.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight
      && !!hit && (hit === element || element.contains(hit));
  })).toBe(true);
  await target.click();
}

/** Keyboard activation is checked independently from pointer hit testing. */
export async function feedbackKeyboard(target: Locator, key = 'Enter'): Promise<void> {
  await expect(target).toBeVisible();
  await target.focus(); await expect(target).toBeFocused(); await target.press(key);
}

export async function assertFeedbackClean(surface: FeedbackArtifactSurface): Promise<void> {
  const { page, audit } = surface;
  const guard = await page.evaluate(() => ({
    writes: (globalThis as typeof globalThis & { __feedbackStorageAudit?: StorageWrite[] }).__feedbackStorageAudit ?? [],
    sentinel: localStorage.getItem('flow:saved-plans'), localOther: localStorage.getItem('other-app:feedback-qa'),
    sessionOther: sessionStorage.getItem('other-app:feedback-qa'),
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
  }));
  assert.equal(guard.sentinel, sentinelBytes); assert.equal(guard.localOther, otherBytes); assert.equal(guard.sessionOther, otherBytes);
  assert.equal(guard.overflow, false, 'horizontal-overflow');
  assert.equal(guard.writes.filter(write => !write.allowed || write.key !== feedbackLabKey || write.method === 'clear').length, 0);
  assert.equal(audit.writes.filter(write => !write.allowed || write.key !== feedbackLabKey || write.method === 'clear').length, 0);
  assert.deepEqual(audit.errors, []); assert.deepEqual(audit.requests, []);
}

async function reportKeyboard(surface: FeedbackArtifactSurface, reportPath: string): Promise<void> {
  const { page } = surface;
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const anchor = page.locator('a[href^="#"]').first();
  if (await anchor.count()) {
    const href = await anchor.getAttribute('href'); assert(href && href.length > 1);
    await feedbackKeyboard(anchor); await expect.poll(() => page.evaluate(() => location.hash)).toBe(href);
    assert.equal(await page.locator(href).count(), 1, 'report-anchor-target');
  }
  const disclosure = page.locator('details > summary').first();
  if (await disclosure.count()) {
    const open = await disclosure.evaluate(element => (element.parentElement as HTMLDetailsElement).open);
    await feedbackKeyboard(disclosure);
    assert.equal(await disclosure.evaluate(element => (element.parentElement as HTMLDetailsElement).open), !open);
    await feedbackKeyboard(disclosure);
    assert.equal(await disclosure.evaluate(element => (element.parentElement as HTMLDetailsElement).open), open);
  }
  const links = await page.locator('a[href]').evaluateAll(elements => elements.map(element => element.getAttribute('href')!));
  for (const href of links) if (href && !href.startsWith('#') && !/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    const local = decodeURIComponent(href.split('#')[0].split('?')[0]);
    if (local && local !== '/lab' && local !== '/report') assert(existsSync(resolve(dirname(reportPath), local)), `report-local-link-missing: ${href}`);
  }
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every(element => (element as HTMLImageElement).complete
    && (element as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

/** The lab selector/snapshot contract supplies labSteps after the HTML exists.
 * Merely importing this helper does not launch a browser or create outputs. */
export async function runFeedbackArtifacts(options: ArtifactRun): Promise<void> {
  assert(typeof options.labSteps === 'function', 'lab-selector-contract-required');
  if (options.label !== undefined) assert(/^[a-z0-9-]+$/.test(options.label), 'artifact-run-label-rejected');
  const mode = options.mode ?? 'all'; assert(['lab', 'report', 'all'].includes(mode), 'artifact-mode-rejected');
  const kinds: ('lab' | 'report')[] = mode === 'all' ? ['lab', 'report'] : [mode];
  const paths: Partial<Record<'lab' | 'report', string>> = {};
  for (const kind of kinds) { const path = options[`${kind}Path`]; assert(path, `${kind}-artifact-path-required`); paths[kind] = artifactPath(path); }
  const before = Object.fromEntries(kinds.map(kind => [kind, sha(paths[kind]!)]));
  const outputBase = resolve('output/playwright/feedback-ux-artifact'); mkdirSync(outputBase, { recursive: true });
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}${options.label ? `-${options.label}` : ''}`;
  const output = resolve(outputBase, runId); mkdirSync(output);
  const results: { kind: string; width: number; height: number; ok: boolean; error?: string; audit: FeedbackSurfaceAudit }[] = [];
  const scope = 'Independent synthetic HTML lab and report only; no app/Auth/DB/OS IME/device/observed-user validation';
  let after: Partial<Record<'lab' | 'report', string>> | null = null;
  const record = () => writeFileSync(resolve(output, 'results.json'), JSON.stringify({ scope, runId, paths, sourceHash: before,
    origin: artifactOrigin, mode, finalSourceHash: after, matrixComplete: results.length === feedbackViewports.length * kinds.length,
    sourcesUnchanged: after === null ? null : kinds.every(kind => after![kind] === before[kind]), results }, null, 2));
  record();
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const [width, height] of feedbackViewports) for (const kind of kinds) {
      const context = await browser.newContext({ viewport: { width, height } });
      const audit = await instrument(context), page = await context.newPage();
      page.on('pageerror', error => audit.errors.push(String(error)));
      page.on('console', message => { if (message.type() === 'error') audit.errors.push(message.text()); });
      page.on('request', request => { if (!artifactRequestAllowed(request.url())) audit.requests.push(request.url()); });
      const surface: FeedbackArtifactSurface = { page, context, audit, check: async (name, work) => {
        await work(); await assertFeedbackClean(surface); audit.checks.push(name);
        assert(/^[a-z0-9-]+$/.test(name), 'artifact-check-name-rejected');
        await page.screenshot({ path: resolve(output, `${kind}-${width}x${height}-${name}.png`), fullPage: true });
      } };
      try {
        const response = await page.goto(`${artifactOrigin}/${kind}`); assert(response && response.status() === 200, 'artifact-response-not-200');
        assert.equal(createHash('sha256').update(await response.body()).digest('hex'), before[kind], 'served-artifact-hash-mismatch');
        await surface.check('initial-render', async () => { await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); });
        if (kind === 'lab') await options.labSteps(surface);
        else {
          await surface.check('report-keyboard-links-images', async () => { await reportKeyboard(surface, paths.report!); });
          await options.reportSteps?.(surface);
        }
        await assertFeedbackClean(surface);
        await page.screenshot({ path: resolve(output, `${kind}-${width}x${height}.png`), fullPage: true });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: resolve(output, `${kind}-${width}x${height}-top.png`) });
        results.push({ kind, width, height, ok: true, audit });
      } catch (error) {
        await page.screenshot({ path: resolve(output, `${kind}-${width}x${height}-failure.png`), fullPage: true }).catch(() => {});
        results.push({ kind, width, height, ok: false, error: String(error), audit });
      } finally { await context.close(); record(); }
    }
  } finally { await browser.close(); record(); }
  after = Object.fromEntries(kinds.map(kind => [kind, sha(paths[kind]!)])); record();
  for (const kind of kinds) assert.equal(after[kind], before[kind], `${kind}-changed-during-browser-run`);
  assert.equal(results.length, feedbackViewports.length * kinds.length, 'artifact-matrix-incomplete');
  console.log(JSON.stringify({ scope, output, passed: results.filter(result => result.ok).length,
    failed: results.filter(result => !result.ok).length, results: results.map(({ kind, width, height, ok, error, audit }) =>
      ({ kind, width, height, ok, error, checks: audit.checks.length, errors: audit.errors.length, requests: audit.requests.length,
        outsideWrites: audit.writes.filter(write => !write.allowed).length })) }, null, 2));
  if (results.some(result => !result.ok)) process.exitCode = 1;
}

type LabItem = { id: string; title: string; mode: string; date: string | null; due: string | null; note: string; done: boolean };
type LabData = { version: number; sequence: number; groupDate: string; folders: { id: string; title: string; path: string }[];
  links: { sourceIndex: number; folderId: string; destination: number }[]; items: LabItem[];
  seriesNote: string; occurrenceNotes: { first: string; second: string } };
type LabSnapshot = { wire: string | null; data: LabData | null; undo: LabData[]; writes: number;
  pending: boolean; locked: boolean; sourceUnchanged: boolean; decodeError: string | null };

/** Read committed wire + visible UI only. No model/global/UI state assignment. */
async function labSnapshot(page: Page): Promise<LabSnapshot> {
  return page.evaluate(key => {
    const model = (globalThis as typeof globalThis & { FeedbackUxLabModel: { KEY: string; seed: () => LabData;
      decode: (wire: string) => { data: LabData; undo: LabData[] }; source: string[]; sourceBytes: string } }).FeedbackUxLabModel;
    if (model.KEY !== key) throw Error('lab-exact-key-mismatch');
    const wire = localStorage.getItem(key);
    let data: LabData | null = null, undo: LabData[] = [], decodeError: string | null = null;
    try { const decoded = wire === null ? { data: model.seed(), undo: [] } : model.decode(wire); data = decoded.data; undo = decoded.undo; }
    catch (error) { decodeError = String(error); }
    return { wire, data, undo, decodeError,
      writes: Number(document.querySelector('#write-count')!.textContent!.match(/\d+/)![0]),
      pending: !(document.querySelector('#retry') as HTMLElement).hidden,
      locked: !(document.querySelector('#lock') as HTMLElement).hidden,
      sourceUnchanged: JSON.stringify(model.source) === model.sourceBytes };
  }, feedbackLabKey);
}
function unchanged(saved: LabSnapshot, current: LabSnapshot) {
  assert.equal(current.wire, saved.wire); assert.deepEqual(current.data, saved.data); assert.deepEqual(current.undo, saved.undo);
  assert.equal(current.writes, saved.writes); assert.equal(current.sourceUnchanged, true);
}
const item = (state: LabSnapshot, id: string) => { const value = state.data?.items.find(entry => entry.id === id); assert(value, `lab-item-missing: ${id}`); return value; };

async function labSteps(surface: FeedbackArtifactSurface): Promise<void> {
  const { page, check } = surface, read = () => labSnapshot(page);
  const folderDialog = page.locator('#folder-dialog'), preview = page.locator('#open-preview');
  await check('folder-keyboard-preview-cancel-stale-zero-writes', async () => {
    const before = await read(); assert.equal(before.wire, null); assert.equal(before.writes, 0);
    await expect(page.locator('#screen .note')).toContainText('실제 앱의 같은 줄 제목 변경·줄 삽입·이후 위치 재계산을 재현하지는 않습니다.');
    await feedbackKeyboard(preview);
    await expect(folderDialog).toBeVisible(); await expect(page.locator('#folder-preview')).toContainText('하위 묶음 뒤 3번째 줄');
    await expect(page.locator('#target-folder')).toBeFocused();
    await page.keyboard.press('Escape'); await expect(folderDialog).not.toBeVisible(); await expect(preview).toBeFocused();
    unchanged(before, await read());
    await feedbackClick(preview); await feedbackClick(page.locator('#cancel-link')); unchanged(before, await read());
    await feedbackClick(preview); await feedbackClick(page.locator('#stale-context')); await feedbackClick(page.locator('#apply-link'));
    await expect(folderDialog).toBeVisible(); await expect(page.locator('#folder-message')).toContainText('위치가 바뀌었습니다');
    unchanged(before, await read()); await feedbackKeyboard(page.locator('#cancel-link'));
  });
  await check('parent-and-leaf-exact-location-new-folder-noop-undo', async () => {
    await feedbackClick(preview); await page.locator('#target-folder').selectOption('folder-study'); await feedbackKeyboard(page.locator('#apply-link'));
    let saved = await read(); assert.deepEqual(saved.data!.links, [{ sourceIndex: 0, folderId: 'folder-study', destination: 2 }]);
    assert.equal(saved.writes, 1); assert.equal(saved.sourceUnchanged, true);
    await page.locator('#source-line').selectOption('2'); await feedbackClick(preview);
    await expect(page.locator('#folder-preview')).toContainText('3번째 현재 줄');
    await expect(page.locator('#target-folder option')).toHaveText(['업무', '학습 / 공부', '프로젝트 / 공부']);
    await page.locator('#target-folder').selectOption('folder-other-study'); await feedbackClick(page.locator('#apply-link'));
    saved = await read(); assert.equal(saved.writes, 2); assert.equal(saved.data!.links[1].destination, 2);
    const beforeNoop = saved;
    await feedbackClick(preview); await page.locator('#target-folder').selectOption('folder-other-study'); await feedbackClick(page.locator('#apply-link'));
    unchanged(beforeNoop, await read());
    await page.locator('#source-line').selectOption('1'); await feedbackClick(preview);
    await page.locator('#new-folder').fill('새 QA 폴더'); await feedbackClick(page.locator('#create-link'));
    saved = await read(); assert.equal(saved.data!.folders.length, beforeNoop.data!.folders.length + 1);
    assert.equal(saved.data!.links.at(-1)!.sourceIndex, 1); assert.equal(saved.data!.links.at(-1)!.destination, 1);
    await feedbackKeyboard(page.locator('#undo')); saved = await read();
    assert.deepEqual(saved.data, beforeNoop.data); assert.deepEqual(saved.undo, beforeNoop.undo);
    assert.equal(saved.writes, beforeNoop.writes + 2);
  });
  await check('past-unfinished-explicit-label-same-item-dates-complete-undo-due', async () => {
    await feedbackKeyboard(page.locator('[data-view="date"]'));
    await expect(page.locator('[data-item-id="task-past"]')).toContainText('지난 미완료');
    await expect(page.locator('[data-item-id="task-past"]')).toContainText('2026-10-01');
    await expect(page.locator('[data-item-id="task-today"]')).toContainText('오늘');
    await expect(page.locator('[data-item-id="task-undated"]')).toHaveCount(0);
    const beforeComplete = await read(); await feedbackClick(page.locator('[data-complete="task-past"]'));
    assert.equal(item(await read(), 'task-past').done, true); await expect(page.locator('[data-item-id="task-past"]')).toHaveCount(0);
    await feedbackClick(page.locator('#undo')); assert.deepEqual((await read()).data, beforeComplete.data);
    const beforeGroup = await read(); await page.locator('#group-date').fill('2026-10-04'); await feedbackClick(page.locator('#apply-group'));
    let saved = await read(); assert.equal(saved.data!.groupDate, '2026-10-04');
    assert.deepEqual(item(saved, 'task-past'), item(beforeGroup, 'task-past')); assert.deepEqual(item(saved, 'task-undated'), item(beforeGroup, 'task-undated'));
    await page.locator('#selected-item').selectOption('task-today'); await page.locator('#date-mode').selectOption('individual');
    await page.locator('#item-date').fill('2026-10-03'); await feedbackClick(page.locator('#apply-date'));
    saved = await read(); assert.equal(item(saved, 'task-today').date, '2026-10-03');
    assert.equal(item(saved, 'task-today').note, item(beforeGroup, 'task-today').note);
    await page.locator('#date-mode').selectOption('undated'); await feedbackClick(page.locator('#apply-date'));
    await feedbackClick(page.locator('[data-date-view="undated"]')); await expect(page.locator('[data-item-id="task-today"]')).toBeVisible();
    assert.equal(item(await read(), 'task-today').date, null);
    await page.locator('#date-mode').selectOption('group'); await feedbackClick(page.locator('#apply-date'));
    await expect(page.locator('#date-origin')).toContainText('구획 날짜 · 2026-10-04');
    const beforeDue = await read(); await page.locator('#due-date').fill('2026-10-06'); await feedbackClick(page.locator('#apply-due'));
    saved = await read(); assert.deepEqual(item(saved, 'task-today'), { ...item(beforeDue, 'task-today'), due: '2026-10-06' });
    await feedbackClick(page.locator('#undo')); assert.deepEqual((await read()).data, beforeDue.data);
    await feedbackClick(page.locator('[data-date-view="all"]'));
    await page.locator('#due-date').fill('2026-10-01'); await feedbackClick(page.locator('#apply-due'));
    saved = await read(); assert.deepEqual(item(saved, 'task-today'), { ...item(beforeDue, 'task-today'), due: '2026-10-01' });
    await expect(page.locator('[data-item-id="task-today"] .meta')).toContainText('기한 지남 · 제안 표시');
    await expect(page.locator('[data-item-id="task-today"] .meta')).toContainText('실행이 마감보다 늦음 · 제안 표시');
    await feedbackKeyboard(page.locator('#undo')); assert.deepEqual((await read()).data, beforeDue.data);
  });
  await check('move-keeps-id-note-duplicate-new-id-series-role-proposals', async () => {
    await feedbackClick(page.locator('[data-view="pattern"]')); await page.locator('#pattern-item').selectOption('task-today');
    const beforeMove = await read(); await page.locator('#pattern-date').fill('2026-10-05'); await feedbackKeyboard(page.locator('#move-item'));
    let saved = await read(); assert.equal(saved.data!.items.length, beforeMove.data!.items.length);
    assert.deepEqual(item(saved, 'task-today'), { ...item(beforeMove, 'task-today'), mode: 'individual', date: '2026-10-05' });
    assert.deepEqual(item(saved, 'task-past'), item(beforeMove, 'task-past'));
    await expect(page.locator('#pattern-date')).toHaveValue('2026-10-05');
    const beforeSwitch = saved; await feedbackKeyboard(page.locator('[data-view="date"]'));
    await feedbackKeyboard(page.locator('[data-view="pattern"]')); unchanged(beforeSwitch, await read());
    await expect(page.locator('#pattern-date')).toHaveValue('2026-10-05');
    const beforeCopy = saved; await feedbackClick(page.locator('#duplicate-item')); saved = await read();
    assert.equal(saved.data!.items.length, beforeCopy.data!.items.length + 1);
    const duplicate = saved.data!.items.at(-1)!; assert.notEqual(duplicate.id, 'task-today'); assert.equal(duplicate.note, '');
    assert.equal(duplicate.title, item(beforeCopy, 'task-today').title); assert.equal(duplicate.date, '2026-10-05');
    await expect(page.locator('#pattern-date')).toHaveValue('2026-10-05');
    assert.deepEqual(item(saved, 'task-today'), item(beforeCopy, 'task-today'));
    await page.locator('#series-common').fill('공통 QA 준비물'); await page.locator('#series-first').fill('첫 날짜 QA 메모');
    await page.locator('#series-second').fill('다음 날짜 QA 메모'); await feedbackKeyboard(page.locator('#apply-series'));
    saved = await read(); assert.equal(saved.data!.seriesNote, '공통 QA 준비물');
    assert.deepEqual(saved.data!.occurrenceNotes, { first: '첫 날짜 QA 메모', second: '다음 날짜 QA 메모' });
    assert.deepEqual(saved.data!.items, beforeCopy.data!.items.concat(duplicate));
    await expect(page.locator('#series-preview')).toContainText('첫 회차 · 2026-10-03');
    await expect(page.locator('#series-preview')).toContainText('다음 회차 · 2026-10-10');
    await expect(page.locator('#series-preview')).toContainText('회차: 첫 날짜 QA 메모');
    await expect(page.locator('#series-preview')).toContainText('회차: 다음 날짜 QA 메모');
    await expect(page.locator('#series-preview')).toContainText('고정된 두 예시 날짜이며 반복 생성 결과가 아닙니다.');
    assert.equal((await page.locator('#series-preview').textContent())!.split('공통: 공통 QA 준비물').length - 1, 2);
  });
  await check('storage-failure-zero-success-cancel-pending-retry-explicit', async () => {
    await feedbackKeyboard(page.locator('#management > summary')); await page.locator('#simulate-error').check();
    const before = await read(); await page.locator('#series-common').fill('실패 후 남은 공통 입력'); await feedbackClick(page.locator('#apply-series'));
    let saved = await read(); unchanged(before, saved); assert.equal(saved.pending, true);
    await expect(page.locator('#save-state')).toContainText('저장 실패'); await expect(page.locator('#apply-series')).toBeDisabled();
    await feedbackClick(page.locator('#reload')); unchanged(before, await read()); assert.equal((await read()).pending, true);
    await feedbackKeyboard(page.locator('#cancel-pending')); saved = await read(); unchanged(before, saved); assert.equal(saved.pending, false);
    await page.locator('#series-first').fill('실패 후 첫 회차 입력'); await feedbackClick(page.locator('#apply-series'));
    saved = await read(); unchanged(before, saved); assert.equal(saved.pending, true);
    await page.locator('#simulate-error').uncheck(); await feedbackKeyboard(page.locator('#retry')); saved = await read();
    assert.equal(saved.pending, false); assert.equal(saved.writes, before.writes + 1);
    assert.equal(saved.data!.occurrenceNotes.first, '실패 후 첫 회차 입력'); assert.equal(saved.data!.seriesNote, before.data!.seriesNote);
  });
  await check('reload-exact-history-corruption-fail-closed-reset-exact-key', async () => {
    const before = await read(); await feedbackClick(page.locator('#reload')); unchanged(before, await read());
    await page.reload(); let saved = await read(); assert.deepEqual(saved.data, before.data); assert.deepEqual(saved.undo, before.undo);
    assert.equal(saved.wire, before.wire); assert.equal(saved.writes, 0);
    await page.evaluate(key => localStorage.setItem(key, '{"schema":999}'), feedbackLabKey); await page.reload();
    saved = await read(); assert.equal(saved.wire, '{"schema":999}'); assert.equal(saved.locked, true); assert(saved.decodeError);
    assert.equal(saved.writes, 0); await expect(page.locator('#open-preview')).toBeDisabled(); await expect(page.locator('#undo')).toBeDisabled();
    await expect(page.locator('#lock')).toContainText('손상된 시안 자료');
    await feedbackKeyboard(page.locator('#management > summary')); await feedbackClick(page.locator('#reset'));
    saved = await read(); assert.equal(saved.wire, null); assert.equal(saved.locked, false); assert.equal(saved.pending, false); assert.equal(saved.writes, 0);
    assert.equal(surface.audit.writes.filter(write => write.method === 'removeItem').length, 1);
    await expect(page.locator('#open-preview')).toBeEnabled();
  });
}

async function reportSteps(surface: FeedbackArtifactSurface): Promise<void> {
  const { page, check } = surface;
  await check('report-requirements-test-scenario-viewport-evidence-boundaries', async () => {
    await expect(page.locator('#verification-status')).not.toBeEmpty();
    for (const [id, count] of [['requirement-results', 9], ['test-results', 9], ['scenario-results', 4], ['viewport-results', 5]] as const) {
      await expect(page.locator(`#${id} tbody tr`)).toHaveCount(count);
    }
    await expect(page.locator('#viewport-results tbody tr td:first-child')).toHaveText(
      feedbackViewports.map(([width, height]) => `${width}×${height}`));
    await expect(page.locator('nav.links a')).toHaveCount(4);
    await expect(page.locator('nav.links a[href^="#"]')).toHaveCount(3);
    assert.equal(await page.locator('nav.links a').first().getAttribute('href'), '2026-10-02-flowme-feedback-ux-bundle-lab-ko.html');
    await expect(page.locator('#requirement-results')).toContainText('제목 중간 분할은 identity-ambiguous');
    await expect(page.locator('#requirement-results')).toContainText('제안만 있음');
    await expect(page.locator('#viewport-results')).toContainText('관찰 사용자 수0');
    await expect(page.locator('#remaining')).toContainText('F5'); await expect(page.locator('#remaining')).toContainText('F10');
    assert.equal(await page.locator('script, img').count(), 0, 'report-unexpected-script-or-image');
  });
  await check('report-qa-disclosure-keyboard-and-zero-storage-writes', async () => {
    const guide = page.locator('#qa-start-guide'), summary = guide.locator(':scope > summary');
    assert.equal(await guide.evaluate(element => (element as HTMLDetailsElement).open), false);
    await feedbackKeyboard(summary); await expect(guide.locator('pre code')).toBeVisible();
    await expect(guide.locator('pre code')).toContainText('127.0.0.1 -p 3107');
    await feedbackKeyboard(summary); assert.equal(await guide.evaluate(element => (element as HTMLDetailsElement).open), false);
    assert.equal(surface.audit.writes.length, 0, 'report-storage-write');
    assert.equal(await page.evaluate(() => localStorage.getItem('flow:poc:personal-workspace:v1:feedback-ux-lab:v1')), null);
  });
}

async function main() {
  const args = process.argv.slice(2);
  let mode: 'lab' | 'report' | 'all' = 'lab', explicitMode = false, label: string | undefined, reportPath: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (['--lab-only', '--report-only', '--all'].includes(arg)) {
      assert(!explicitMode, 'artifact-duplicate-mode'); explicitMode = true;
      mode = arg === '--lab-only' ? 'lab' : arg === '--report-only' ? 'report' : 'all';
    } else if (arg === '--label' || arg === '--report-path') {
      const value = args[++index]; assert(value && !value.startsWith('--'), `artifact-option-value-required: ${arg}`);
      if (arg === '--label') { assert(label === undefined, 'artifact-duplicate-label'); label = value; }
      else { assert(reportPath === undefined, 'artifact-duplicate-report-path'); reportPath = value; }
    } else throw Error(`artifact-option-rejected: ${arg}`);
  }
  await runFeedbackArtifacts({ mode, label, labPath: 'docs/content-audit/2026-10-02-flowme-feedback-ux-bundle-lab-ko.html', reportPath, labSteps, reportSteps });
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/alpha/feedback-ux-artifact-browser.ts')) {
  void main().catch(error => { console.error(String(error)); process.exitCode = 1; });
}
