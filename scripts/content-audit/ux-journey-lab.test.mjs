import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../../docs/content-audit/2026-10-01-flowme-ux-journey-lab-ko.html', import.meta.url), 'utf8');
const source = html.match(/<script data-model>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source, 'standalone HTML exposes its actual pure model');
const context = vm.createContext({});
vm.runInContext(source, context);
const M = context.JourneyModel;
const plain = value => JSON.parse(JSON.stringify(value));

test('memo text, including task-looking syntax, stays a memo until explicitly converted', () => {
  const data = M.change(M.seed(), { type: 'add', kind: 'memo', text: '- [ ] 메모 그대로\n2026-10-01' });
  assert.equal(data.rows.filter(row => row.kind === 'task').length, 2);
  const converted = M.change(data, { type: 'convert', id: 'line-4' });
  assert.equal(converted.rows[3].id, 'line-4');
  assert.equal(converted.rows[3].kind, 'task');
  assert.equal(converted.rows[3].text, '- [ ] 메모 그대로');
});
test('date assignment and removal retain stable identity, original text, folder and completion history', () => {
  const seed = M.seed();
  const completed = M.change(seed, { type: 'complete', id: 'line-3' });
  const scheduled = M.change(completed, { type: 'date', id: 'line-3', date: M.TODAY });
  const cleared = M.change(scheduled, { type: 'date', id: 'line-3', date: null });
  assert.deepEqual(plain(cleared), plain(completed));
  assert.equal(seed.rows[2].done, false, 'input state remains unchanged');
  assert.equal(scheduled.rows[2].history.length, 1);
});
test('today, week and month project the exact same task without writes or clones', () => {
  const seed = M.seed();
  const before = JSON.stringify(seed);
  for (const view of ['today', 'week', 'month']) assert.equal(M.visible(seed, view)[0], seed.rows[1]);
  assert.equal(M.visible(seed, 'undated')[0], seed.rows[2]);
  assert.equal(JSON.stringify(seed), before);
  assert.equal(M.visible(seed, 'week', '2026-10-12').length, 0);
});
test('complete then reopen keeps one identity and preserves both history entries', () => {
  const completed = M.change(M.seed(), { type: 'complete', id: 'line-2' });
  const reopened = M.change(completed, { type: 'complete', id: 'line-2' });
  assert.equal(reopened.rows[1].id, 'line-2');
  assert.deepEqual(plain(reopened.rows[1].history.map(row => row.percent)), [100, 0]);
  assert.equal(reopened.raw.includes('- [ ] 도서관'), true);
});
test('saved data and Undo snapshots restore original source and identity together', () => {
  const before = M.seed();
  const after = M.change(before, { type: 'edit', id: 'line-2', text: '예약 도서 받기' });
  const loaded = M.decode(M.encode(after, [before]));
  assert.deepEqual(plain(loaded.data), plain(after));
  assert.deepEqual(plain(loaded.undo[0]), plain(before));
  assert.equal(loaded.data.rows[1].id, before.rows[1].id);
});
test('ambiguous identities, mismatched raw text and future versions fail closed', () => {
  for (const tamper of [data => { data.rows[1].id = data.rows[0].id; }, data => { data.raw += '\nextra'; }, data => { data.nextId = 2; }]) {
    const data = M.seed(); tamper(data);
    assert.equal(M.valid(data), false);
    assert.throws(() => M.decode(JSON.stringify({ version: 1, data, undo: [] })));
  }
  assert.throws(() => M.decode(JSON.stringify({ version: 2, data: M.seed(), undo: [] })));
  assert.throws(() => M.decode('{broken'));
});
test('invalid dates, multiline row edits and stale row targets are rejected without changing input', () => {
  const seed = M.seed(), before = JSON.stringify(seed);
  for (const action of [{ type: 'date', id: 'line-2', date: '2026-02-30' }, { type: 'edit', id: 'line-2', text: 'a\nb' }, { type: 'date', id: 'missing', date: null }]) assert.throws(() => M.change(seed, action));
  assert.equal(JSON.stringify(seed), before);
});
test('standalone artifact has no external resource, network call or broad storage clear', () => {
  assert.equal(/<(?:script|link|img)[^>]+(?:src|href)=/i.test(html), false);
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|localStorage\.clear\s*\(/.test(html), false);
  assert.deepEqual([...html.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(([^,)]+)/g)].map(match => match[1]).filter(key => key !== 'M.KEY'), []);
  assert.equal(M.KEY, 'flow:poc:personal-workspace:v1:ux-journey');
});

test('file URL journey preserves identity, drafts and recovery across both alternatives', { skip: process.env.FLOW_UX_LAB_BROWSER !== '1' }, async t => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [], consoleErrors = [], network = [], storageAudits = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.route('**/*', route => {
      if (/^file:/.test(route.request().url())) return route.continue();
      network.push({ url: route.request().url(), method: route.request().method() });
      return route.abort();
    });
    const sentinels = { 'flow:synthetic-non-poc-sentinel': '{"owner":"existing","value":"그대로"}', 'other-app:synthetic-sentinel': 'untouched-byte-value' };
    await page.addInitScript(({ sentinels, key }) => {
      window.__uxStorageAudit = { seeds: 0, calls: [] };
      const originalSet = Storage.prototype.setItem, originalRemove = Storage.prototype.removeItem, originalClear = Storage.prototype.clear;
      if (window.name !== 'ux-journey-sentinels-seeded') {
        for (const [name, value] of Object.entries(sentinels)) { originalSet.call(localStorage, name, value); window.__uxStorageAudit.seeds++; }
        window.name = 'ux-journey-sentinels-seeded';
      }
      Storage.prototype.setItem = function (name, value) { window.__uxStorageAudit.calls.push({ method: 'setItem', key: String(name), exact: String(name) === key }); return originalSet.call(this, name, value); };
      Storage.prototype.removeItem = function (name) { window.__uxStorageAudit.calls.push({ method: 'removeItem', key: String(name), exact: String(name) === key }); return originalRemove.call(this, name); };
      Storage.prototype.clear = function () { window.__uxStorageAudit.calls.push({ method: 'clear', key: null, exact: false }); return originalClear.call(this); };
    }, { sentinels, key: M.KEY });
    await page.goto(new URL('../../docs/content-audit/2026-10-01-flowme-ux-journey-lab-ko.html', import.meta.url).href);
    const collectStorageAudit = async () => { storageAudits.push(await page.evaluate(() => window.__uxStorageAudit)); };
    const assertControls = async label => {
      const small = await page.evaluate(() => [...document.querySelectorAll('button,summary,input,textarea,select')].filter(el => el.getClientRects().length).map(el => {
        const target = el.matches('input[type=checkbox]') ? el.closest('label') || el : el;
        const rect = target.getBoundingClientRect();
        return { name: el.getAttribute('aria-label') || el.id || el.textContent, width: rect.width, height: rect.height };
      }).filter(rect => rect.width < 48 || rect.height < 48));
      assert.deepEqual(small, [], '48px targets: '+label);
    };
    const wire = () => page.evaluate(() => localStorage.getItem(JourneyModel.KEY));
    await page.locator('#new-text').fill('합성 새 할 일');
    await page.getByRole('button', { name: '할 일로 추가', exact: true }).click();
    assert.equal(JSON.parse(await wire()).data.rows.at(-1).id, 'line-4');
    const itemMenu = () => page.getByRole('button', { name: '항목 메뉴: 합성 새 할 일', exact: true });
    await itemMenu().click();
    await page.locator('#item-date').fill('2026-10-01');
    await page.getByRole('button', { name: '적용', exact: true }).click();
    const saved = await wire();
    await itemMenu().click();
    await page.locator('#item-date').fill('2026-10-03');
    await page.keyboard.press('Escape');
    assert.equal(await wire(), saved, 'cancel does not write');
    for (const view of ['today', 'week', 'month']) {
      await page.locator(`[data-view=${view}]`).click();
      assert.equal(await page.locator('.period-title').filter({ hasText: '합성 새 할 일' }).count(), 1);
      assert.equal(await wire(), saved, 'view switch does not write');
      await assertControls(view);
    }
    await page.getByRole('checkbox', { name: '완료: 합성 새 할 일', exact: true }).locator('..').click({ position: { x: 3, y: 3 } });
    assert.equal(JSON.parse(await wire()).data.rows[3].done, true);
    await page.getByRole('checkbox', { name: '다시 열기: 합성 새 할 일', exact: true }).click();
    assert.equal(JSON.parse(await wire()).data.rows[3].done, false);
    await page.locator('.period-row').filter({ hasText: '합성 새 할 일' }).getByRole('button', { name: '원문에서 이어 쓰기' }).click();
    assert.equal(await page.evaluate(() => document.activeElement.dataset.sourceId), 'line-4');
    await page.locator('#new-text').fill('아직 추가 전 메모');
    await page.locator('#variant-b').click();
    await page.locator('#focus-toggle').click();
    assert.equal(await page.locator('nav').isVisible(), false);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('nav').isVisible(), true);
    assert.equal(await page.locator('#new-text').inputValue(), '아직 추가 전 메모');
    await page.locator('#new-text').fill('');
    await page.getByText('실험 관리 · 저장과 오류 모의', { exact: true }).click();
    await page.locator('#simulate-error').check();
    const beforeFail = await wire();
    await page.locator('[data-source-id=line-4]').fill('실패 중 고친 원문');
    assert.equal(await wire(), beforeFail);
    assert.equal(await page.locator('#retry').isVisible(), true);
    await page.locator('#simulate-error').uncheck();
    await page.locator('#retry').click();
    await collectStorageAudit();
    await page.reload();
    assert.equal(await page.locator('[data-source-id=line-4]').inputValue(), '실패 중 고친 원문');
    await page.locator('#undo').click();
    assert.equal(await page.locator('[data-source-id=line-4]').inputValue(), '합성 새 할 일');
    await itemMenu().click();
    await page.locator('#clear-date').click();
    await page.getByRole('button', { name: '적용', exact: true }).click();
    await page.locator('[data-view=undated]').click();
    assert.equal(await page.locator('.period-title').filter({ hasText: '합성 새 할 일' }).count(), 1);
    await page.locator('[data-view=document]').click();
    await page.locator('#variant-a').click();
    const capture = process.env.FLOW_UX_LAB_CAPTURE === '1';
    if (capture) mkdirSync('output/playwright', { recursive: true });
    for (const variant of ['A', 'B']) {
      await page.locator('#variant-'+variant.toLowerCase()).click();
      if (variant === 'B') await page.locator('#focus-toggle').click();
      for (const [width, height] of [[375,812],[390,844],[844,390],[1024,768],[1440,900]]) {
        await page.setViewportSize({ width, height });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${variant} at ${width}x${height}`);
        await assertControls(`${variant} ${width}x${height}`);
        if (capture) {
          await page.screenshot({ path: `output/playwright/ux-journey-lab-${variant}-${width}x${height}.png`, fullPage: true });
          if (variant === 'A' && [390,1440].includes(width)) await page.screenshot({ path: `output/playwright/ux-journey-lab-${width === 390 ? 'mobile' : 'desktop'}.png`, fullPage: true });
        }
      }
    }
    assert.deepEqual((await page.evaluate(() => Object.keys(localStorage))).sort(), [...Object.keys(sentinels), M.KEY].sort());
    await page.evaluate(() => { const value = JSON.parse(localStorage.getItem(JourneyModel.KEY)); value.data.rows[1].id = value.data.rows[0].id; localStorage.setItem(JourneyModel.KEY, JSON.stringify(value)); });
    const corrupted = await wire();
    await collectStorageAudit();
    await page.reload();
    assert.equal(await page.locator('#lock').isVisible(), true);
    assert.equal(await page.locator('[data-source-id=line-1]').isDisabled(), true);
    assert.equal(await wire(), corrupted, 'ambiguous source IDs are not silently rewritten');
    await collectStorageAudit();
    assert.equal(storageAudits.reduce((sum, audit) => sum + audit.seeds, 0), 2, 'each sentinel is seeded exactly once before monitoring');
    const storageCalls = storageAudits.flatMap(audit => audit.calls);
    assert.ok(storageCalls.some(call => call.method === 'setItem'), 'observed real UI storage writes');
    assert.equal(storageCalls.filter(call => !call.exact).length, 0, 'no write/remove outside the exact prototype key');
    assert.equal(storageCalls.filter(call => call.method === 'clear').length, 0);
    for (const [key, value] of Object.entries(sentinels)) assert.equal(await page.evaluate(key => localStorage.getItem(key), key), value, key+' bytes unchanged');
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(network, [], 'no network requests; all non-file requests would be aborted');
    t.diagnostic(JSON.stringify({ storageSetCalls: storageCalls.filter(call => call.method === 'setItem').length, storageRemoveCalls: storageCalls.filter(call => call.method === 'removeItem').length, outsideExactKey: 0, clearCalls: 0, sentinelSeeds: 2, sentinelBytesUnchanged: 2, networkAttempts: network.length, pageErrors: errors.length, consoleErrors: consoleErrors.length, variants: 2, viewportsPerVariant: 5, targetMinimum: '48x48 CSS px including checkbox labels' }));
  } finally { await browser.close(); }
});
