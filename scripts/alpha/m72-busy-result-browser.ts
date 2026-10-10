/** Real app UI, synthetic Auth/read/participation-save only. Never forwards API writes. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { emptyAccount, mockAlpha, pairedSocialAccount, session, sessionKey } from '../../tests/e2e/alpha-auth.fixture';
import { materializeAccount, validateAlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { alphaSocialReferences, isAlphaSocialContext } from '../../lib/flow/integrated-poc/alpha-social/projection';
import type { AlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { executeAlphaSocialIntent } from '../../lib/flow/integrated-poc/alpha-social/dispatch';
import { isAlphaSocialCommand } from '../../lib/flow/integrated-poc/alpha-social/contract';
import { PROGRAM_BUSY_NOTICE, programErrorMessage } from '../../lib/flow/integrated-poc/ui-contract';

async function main() {
  const output = `output/playwright/alpha-m72-busy-result/${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await context.addInitScript('globalThis.__name = (value) => value;');
  const page = await context.newPage(); page.setDefaultTimeout(15_000);
  const mock = await mockAlpha(page), checks: string[] = [], unexpected: string[] = [], calls: string[] = [];
  let account = emptyAccount('a') as AlphaAccount, stage = 'open'; mock.accounts.set('a', account);
  const original = JSON.stringify(account);
  const check = (name: string, condition: unknown) => { assert(condition, name); checks.push(name); };
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), body = request.postDataJSON();
    if (url.origin !== 'http://localhost:3104' || url.pathname !== '/api/alpha/social' || request.method() !== 'POST'
      || body.kind !== 'execute' || !isAlphaSocialCommand(body.command) || body.command.kind !== 'social'
      || body.command.intent.type !== 'participation-save') {
      unexpected.push(`${request.method()} ${url.pathname}`); return route.abort();
    }
    calls.push(body.command.intent.type);
    const command = body.command; assert.equal(command.expectedRevision, account.revision); assert.equal(command.expectedPublicRevision, 0);
    const socialContext = pairedSocialAccount('a', account).value.context; assert(isAlphaSocialContext(socialContext));
    const refs = alphaSocialReferences(socialContext, account.ownerId);
    const data = materializeAccount(account, refs).data;
    const result = executeAlphaSocialIntent(data, account.ownerId, command.intent, command.requestId); assert(result.ok);
    assert.equal(JSON.stringify(result.data.public), JSON.stringify(data.public), 'private-draft-must-not-publish');
    account = { ...account, revision: account.revision + 1, space: result.data.spaces[account.ownerId] };
    assert(validateAlphaAccount(account, refs, account.ownerId)); mock.accounts.set('a', account);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, value: {
      requestId: command.requestId, revision: account.revision, changed: true, kind: 'social', publicRevision: 0, resultId: result.result,
    } }) });
  });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: sessionKey, value: session('a') });
  try {
    await page.goto('http://localhost:3104/alpha', { waitUntil: 'networkidle' });
    await page.getByRole('navigation', { name: '작업 공간' }).getByRole('button', { name: '둘러보기', exact: true }).click();
    await page.getByRole('button', { name: '경험·질문·지식', exact: true }).click();
    await page.getByRole('button', { name: '글 쓰기', exact: true }).waitFor();
    stage = 'busy'; mock.state.holdA = true;
    await page.getByRole('button', { name: '서버에서 다시 확인', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('button[disabled]') !== null);
    await page.getByRole('button', { name: '글 쓰기', exact: true }).click();
    const rejected = page.getByRole('alert').filter({ hasText: programErrorMessage('busy') }); await rejected.waitFor();
    const title = page.getByRole('textbox', { name: '제목', exact: true });
    const body = page.getByRole('textbox', { name: '내용', exact: true });
    await title.fill('겹친 요청 입력 보존'); await body.fill('저장 전 입력을 보관합니다.');
    check('busy-no-api-write', calls.length === 0); check('busy-account-unchanged', JSON.stringify(account) === original);
    check('busy-input-retained', await title.inputValue() === '겹친 요청 입력 보존' && await body.inputValue() === '저장 전 입력을 보관합니다.');
    stage = 'settled'; assert(mock.state.held, 'held-read-required'); mock.state.holdA = false;
    const held = mock.state.held; mock.state.held = null;
    await held.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pairedSocialAccount('a', account)) });
    await page.getByText(PROGRAM_BUSY_NOTICE, { exact: true }).waitFor({ state: 'hidden' });
    check('temporary-host-notice-cleared', await page.getByText(PROGRAM_BUSY_NOTICE, { exact: true }).count() === 0);
    check('rejected-result-remains-with-input', await rejected.isVisible() && await body.inputValue() === '저장 전 입력을 보관합니다.');
    check('no-automatic-retry', calls.length === 0);
    for (const [width, height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]) {
      await page.setViewportSize({ width, height }); await rejected.scrollIntoViewIfNeeded();
      check(`${width}-no-overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const retry = rejected.getByRole('button', { name: '초안 저장 다시 시도', exact: true }); await retry.scrollIntoViewIfNeeded();
      check(`${width}-retry-visible`, await retry.evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return !!hit && el.contains(hit); }));
      await page.screenshot({ path: `${output}/rejected-${width}x${height}.png` });
    }
    stage = 'retry'; await rejected.getByRole('button', { name: '초안 저장 다시 시도', exact: true }).click();
    await page.getByText('계정에 초안 저장됨', { exact: true }).waitFor();
    check('explicit-retry-one-commit', calls.length === 1 && account.revision === 1);
    check('rejection-cleared-after-save', await rejected.count() === 0);
    check('saved-private-text-exact', account.space.participationDrafts.length === 1
      && account.space.participationDrafts[0].title === '겹친 요청 입력 보존' && account.space.participationDrafts[0].body === '저장 전 입력을 보관합니다.');
    const beforeReload = await page.evaluate(() => ({ forbidden: window.__alphaStorageAudit.forbidden, equal: Object.entries(window.__alphaStorageAudit.operational).every(([key,value]) => localStorage.getItem(key) === value) }));
    stage = 'reload'; await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('navigation', { name: '작업 공간' }).getByRole('button', { name: '둘러보기', exact: true }).click();
    await page.getByRole('button', { name: '경험·질문·지식', exact: true }).click();
    await page.getByText('작성 중인 글 1', { exact: true }).waitFor();
    await page.getByText('작성 중인 글 1', { exact: true }).click();
    check('reload-private-draft-listed', await page.getByRole('button', { name: '겹친 요청 입력 보존 · 이어 쓰기', exact: true }).count() === 1);
    const afterReload = await page.evaluate(() => ({ forbidden: window.__alphaStorageAudit.forbidden, equal: Object.entries(window.__alphaStorageAudit.operational).every(([key,value]) => localStorage.getItem(key) === value) }));
    check('operating-storage-unchanged', beforeReload.equal && afterReload.equal && !beforeReload.forbidden.length && !afterReload.forbidden.length);
    check('unexpected-api-zero', !unexpected.length && !mock.workspaceRequests.length);
    check('console-page-errors-zero', !mock.consoleErrors.length && !mock.pageErrors.length);
    await writeFile(`${output}/result.json`, JSON.stringify({ pass: true, checks, calls, beforeReload, afterReload,
      remoteWrites: 0, realAccounts: 0, actualDevices: 0, observedUsers: 0, consoleErrors: mock.consoleErrors, pageErrors: mock.pageErrors,
      kind: 'real local UI with synthetic Auth/read and pure-transition private-draft save' }, null, 2));
    console.log(JSON.stringify({ pass: true, checks: checks.length, output }));
  } catch (error) {
    await page.screenshot({ path: `${output}/failure.png` }); await writeFile(`${output}/failure-dom.txt`, await page.locator('body').innerText());
    await writeFile(`${output}/result.json`, JSON.stringify({ pass: false, stage, error: String(error), checks, calls, unexpected, consoleErrors: mock.consoleErrors, pageErrors: mock.pageErrors }, null, 2));
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; });
