import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const KEY = 'flow:poc:personal-workspace:v1:folder-writing-lab';
const SENTINEL = 'flow:production:synthetic-sentinel';
const SENTINEL_BYTES = '{"owner":"synthetic-fixture","bytes":"운영 대체 표식 001"}';
const source = (page: Page, id: string) => page.locator(`[data-source-id="${id}"]`);
const view = (page: Page, mode: string) => page.locator(`button[data-view="${mode}"]`);
const stored = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);
const toolPanel = async (page: Page) => { if (!await page.locator('.lab-tools').evaluate(el => (el as HTMLDetailsElement).open)) await page.locator('.lab-tools summary').click(); };

async function fixture(page: Page, malformed = false) {
  const events: { method: string; key: string | null }[] = [], remote: string[] = [], errors: string[] = [];
  await page.exposeFunction('__folderLabWrite', (event: { method: string; key: string | null }) => events.push(event));
  await page.addInitScript(({ key, sentinel, bytes, malformed }) => {
    if (localStorage.getItem(sentinel) === null) localStorage.setItem(sentinel, bytes);
    if (malformed && localStorage.getItem(key) === null) localStorage.setItem(key, '{broken synthetic payload');
    const nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, value) {
      (window as any).__folderLabWrite({ method: 'set', key: k });
      if (this !== localStorage || k !== key) throw Error('out-of-scope storage write');
      return nativeSet.call(this, k, value);
    };
    Storage.prototype.removeItem = function (k) {
      (window as any).__folderLabWrite({ method: 'remove', key: k });
      if (this !== localStorage || k !== key) throw Error('out-of-scope storage removal');
      return nativeRemove.call(this, k);
    };
    Storage.prototype.clear = function () { (window as any).__folderLabWrite({ method: 'clear', key: null }); throw Error('storage clear forbidden'); };
  }, { key: KEY, sentinel: SENTINEL, bytes: SENTINEL_BYTES, malformed });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:3110' && url.pathname === '/' && route.request().method() === 'GET') return route.continue();
    remote.push(route.request().url()); return route.abort('blockedbyclient');
  });
  page.on('pageerror', error => errors.push('page: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  await page.goto('/');
  return { events, async assertBoundary(info: TestInfo, name = 'boundary') {
    expect(await page.evaluate(key => localStorage.getItem(key), SENTINEL)).toBe(SENTINEL_BYTES);
    expect(events.every(e => e.key === KEY && ['set', 'remove'].includes(e.method))).toBe(true);
    expect(remote).toEqual([]); expect(errors).toEqual([]);
    const report = { events, remote, errors, sentinelBytesPreserved: true, seedWritesExcluded: true };
    writeFileSync(info.outputPath(name + '.json'), JSON.stringify(report, null, 2));
  } };
}

test('first viewport and keyboard controls remain visible without overflow', async ({ page }, info) => {
  const f = await fixture(page);
  await page.evaluate(() => scrollTo(0, 0));
  const geometry = await page.evaluate(() => {
    const first = document.querySelector('[data-source-id="w1"]')!.getBoundingClientRect();
    const primary = [...document.querySelectorAll('.toolbar button, .views button')].map(el => {
      const r = el.getBoundingClientRect(); return { label: el.textContent, top: r.top, bottom: r.bottom, height: r.height, width: r.width };
    });
    return { width: innerWidth, height: innerHeight, horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      firstEditTop: first.top, firstEditBottom: first.bottom, firstEditVisibleHeight: Math.max(0, Math.min(innerHeight, first.bottom) - Math.max(0, first.top)), primary };
  });
  expect(geometry.horizontalOverflow).toBeLessThanOrEqual(0);
  expect(geometry.firstEditVisibleHeight).toBeGreaterThan(0);
  expect(geometry.primary.filter(c => c.height).every(c => c.height >= 48 && c.width >= 48)).toBe(true);
  expect(await page.locator('.row-main textarea').evaluateAll(rows => rows.every(el => el.scrollHeight <= el.clientHeight + 2))).toBe(true);
  await page.screenshot({ path: info.outputPath('first-viewport.png') });
  writeFileSync(info.outputPath('geometry.json'), JSON.stringify(geometry, null, 2));
  await view(page, 'region').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#app')).toHaveAttribute('data-view', 'region');
  await page.locator('[data-origin-id="w4"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-line-id="w4"]')).toBeFocused();
  expect(await stored(page)).toBeNull();
  await f.assertBoundary(info);
});

test('name proposal is zero-write until explicit link and preserves identity', async ({ page }, info) => {
  const f = await fixture(page);
  await source(page, 'w2').fill('미일치');
  await expect(page.locator('[data-connect-folder]')).toHaveCount(0);
  await source(page, 'w2').fill('여행');
  await expect(page.locator('[data-connect-folder]')).toHaveCount(2);
  await expect(page.locator('[data-connect-folder="travel"]')).toHaveText('개인 / 여행 연결');
  await expect(page.locator('[data-connect-folder="work-travel"]')).toHaveText('회사 / 여행 연결');
  await page.locator('[data-connect-folder="travel"]').click(); await page.locator('#confirm-no').click();
  expect(await stored(page)).toBeNull(); expect(f.events).toEqual([]);
  await page.getByRole('button', { name: '제안 닫기', exact: true }).click();
  await expect(page.locator('[data-connect-folder]')).toHaveCount(0);
  await source(page, 'w2').fill('여행 '); await source(page, 'w2').fill('여행');
  await page.locator('[data-connect-folder="travel"]').click(); await page.locator('#confirm-yes').click();
  await expect.poll(() => f.events.length).toBe(1);
  const payload = JSON.parse((await stored(page))!);
  expect(payload.version).toBe(1); expect(payload.data.documents[0].rows).toHaveLength(20);
  expect(payload.data.documents[0].rows[1]).toMatchObject({ id: 'w2', kind: 'folder', folderId: 'travel' });
  await expect(source(page, 'w2')).toHaveCount(0);
  await page.reload(); await expect(page.locator('[data-line-id="w2"]')).toHaveAttribute('data-folder-id', 'travel');
  await page.locator('#undo').click(); await expect(source(page, 'w2')).toHaveValue('여행');
  const undone = JSON.parse((await stored(page))!); expect(undone.data.documents[0].rows[1].kind).toBe('list');
  await f.assertBoundary(info);
});

test('three scopes preserve memo, hidden source, dates, history, undo and reload', async ({ page }, info) => {
  const f = await fixture(page);
  const lineIds = () => page.locator('[data-line-id]').evaluateAll(rows => rows.map(r => r.getAttribute('data-line-id')));
  await view(page, 'region').click();
  expect(await lineIds()).toEqual(['w4', 'w5', 'w6', 'w7', 'w8', 'w16', 'w17', 'w18']);
  await expect(page.locator('[data-region-boundary]')).toHaveCount(2);
  await expect(page.locator('[data-line-id="w6"]')).toHaveAttribute('data-inherited-date', '2026-10-01');
  await expect(page.locator('[data-line-id="w17"]')).toHaveAttribute('data-inherited-date', '2026-10-03');
  await page.screenshot({ path: info.outputPath('discontinuous-region.png'), fullPage: true });
  await page.locator('#folder').selectOption('packing'); expect(await lineIds()).toEqual(['w7', 'w8']);
  await page.locator('#folder').selectOption('work-packing'); expect(await lineIds()).toEqual(['w13', 'w14']);
  await page.locator('#folder').selectOption('home'); await expect(page.locator('[data-line-id]')).toHaveCount(0);
  await page.getByRole('button', { name: '다른 문서의 할 일 보기', exact: true }).click(); expect(await lineIds()).toEqual(['n3']);
  await page.locator('[data-origin-id="n3"]').click(); await expect(page.locator('#document')).toHaveValue('doc-next');
  await expect(source(page, 'n3')).toBeFocused();
  await page.locator('#document').selectOption('doc-weekend'); await page.locator('#folder').selectOption('travel');
  await view(page, 'tasks').click(); expect(await lineIds()).toEqual(['w6', 'w8', 'w17', 'n5']);
  expect(f.events).toEqual([]);
  await view(page, 'region').click();
  const originalMemo = await source(page, 'w5').inputValue();
  await source(page, 'w5').fill(originalMemo + ' 합성 수정');
  await view(page, 'document').click(); await expect(page.locator('#app')).toHaveAttribute('data-view', 'region');
  await page.locator('#save').click(); await view(page, 'document').click();
  await expect(source(page, 'w5')).toHaveValue(originalMemo + ' 합성 수정');
  await expect(source(page, 'w9')).toHaveValue('도서관 책 반납');
  const saved = JSON.parse((await stored(page))!);
  expect(saved.data.documents[0].rows[4].kind).toBe('memo');
  expect(saved.data.documents[0].rows[16].history).toEqual([{ date: '2026-10-01', done: true }]);
  expect(saved.data.documents[1].rows).toHaveLength(6);
  await page.reload(); await expect(source(page, 'w5')).toHaveValue(originalMemo + ' 합성 수정');
  await page.locator('#undo').click(); await expect(source(page, 'w5')).toHaveValue(originalMemo);
  await page.reload(); await expect(source(page, 'w5')).toHaveValue(originalMemo);
  await f.assertBoundary(info);
});

test('failed save, draft cancellation, synthetic composition and source recovery', async ({ page }, info) => {
  const f = await fixture(page);
  await source(page, 'w1').fill('취소할 메모'); await page.locator('#discard').click();
  await expect(source(page, 'w1')).toHaveValue('이번 주에는 필요한 일만 적고, 떠오른 생각은 메모로 남기자.');
  expect(f.events).toEqual([]);
  await toolPanel(page); await page.locator('#simulate-error').check();
  await view(page, 'region').click(); await source(page, 'w5').fill('오류 중에도 보관할 메모'); await page.locator('#save').click();
  await expect(page.locator('#app')).toHaveAttribute('data-dirty', 'true');
  expect(await stored(page)).toBeNull(); expect(f.events).toEqual([]);
  await view(page, 'document').click(); await expect(page.locator('#app')).toHaveAttribute('data-view', 'region');
  await expect(source(page, 'w5')).toHaveValue('오류 중에도 보관할 메모');
  await page.locator('#reload').click(); await page.locator('#confirm-no').click();
  await expect(source(page, 'w5')).toHaveValue('오류 중에도 보관할 메모');
  const downloadPromise = page.waitForEvent('download'); await page.locator('#download').click(); const download = await downloadPromise;
  const stream = await download.createReadStream(); const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString('utf8')).toContain('오류 중에도 보관할 메모');
  await page.locator('#simulate-error').uncheck(); await page.locator('#save').click();
  const good = await stored(page); expect(good).not.toBeNull();
  await page.locator('#simulate-composition').check(); await view(page, 'document').click();
  await expect(page.locator('#app')).toHaveAttribute('data-view', 'region'); await expect(page.locator('#save')).toBeDisabled();
  await page.locator('#reload').click(); await expect(page.locator('#confirm')).not.toBeVisible();
  expect(await stored(page)).toBe(good);
  await page.locator('#simulate-composition').uncheck();
  await source(page, 'w5').dispatchEvent('compositionstart'); await source(page, 'w5').fill('합성 조합 후 메모');
  await view(page, 'document').click(); await expect(page.locator('#app')).toHaveAttribute('data-view', 'region');
  await source(page, 'w5').dispatchEvent('compositionend'); await page.locator('#save').click();
  await page.reload(); await expect(source(page, 'w5')).toHaveValue('합성 조합 후 메모');
  await f.assertBoundary(info);
});

test('malformed payload locks writes until explicit exact-key reset', async ({ page }, info) => {
  const f = await fixture(page, true);
  await expect(page.locator('#app')).toHaveAttribute('data-blocked', 'true');
  await expect(source(page, 'w1')).toBeDisabled(); await expect(page.locator('#save')).toBeDisabled();
  await view(page, 'region').click(); expect(await stored(page)).toBe('{broken synthetic payload'); expect(f.events).toEqual([]);
  await toolPanel(page); await page.locator('#reset').click(); await page.locator('#confirm-no').click();
  expect(await stored(page)).toBe('{broken synthetic payload'); expect(f.events).toEqual([]);
  await page.locator('#reset').click(); await page.locator('#confirm-yes').click();
  await expect(page.locator('#app')).toHaveAttribute('data-blocked', 'false');
  expect(await stored(page)).toBeNull(); await expect(source(page, 'w1')).toBeEnabled();
  await expect.poll(() => f.events.length).toBe(1); expect(f.events[0]).toEqual({ method: 'remove', key: KEY });
  await f.assertBoundary(info);
});
