/** Real local app + intercepted synthetic Auth/API. No credentials or remote writes. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, type Route } from 'playwright';
import { accountWithDocument, mockAlpha, session, sessionKey } from '../../tests/e2e/alpha-auth.fixture';
import { createAlphaFakeServer } from '../../lib/flow/integrated-poc/alpha-persistence/fake-server';
import { emptyAlphaReferences } from '../../lib/flow/integrated-poc/alpha-social/projection';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import type { AlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/contract';

const APP = 'http://localhost:3104';
const ORIGINAL = '검증용 메모\n- [ ] 부모 @2026-09-24\n  - [ ] 자식';
const RENAMED = ORIGINAL.replace(' @2026-09-24', '');
const COMBINED = RENAMED.replace('  - [ ] 자식', '- [ ] 자식');
async function main() {
  const output = `output/playwright/alpha-m72-edit-feedback/${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await context.addInitScript('globalThis.__name = (value) => value;');
  const page = await context.newPage(); page.setDefaultTimeout(15_000);
  const mock = await mockAlpha(page), account = accountWithDocument('a', '편집 안내 격리 시험', ORIGINAL) as AlphaAccount;
  const docId = account.space.text.documents[0].id, lineIds = account.space.text.documents[0].lines.map(line => line.id);
  const server = createAlphaFakeServer([{ account, references: emptyAlphaReferences(account.ownerId) }]);
  const repository = server.connect(server.issueSession(account.ownerId));
  mock.accounts.set('a', account);
  const calls: { kind: string; commandKind?: string }[] = [], checks: string[] = [], screenshots: string[] = [], unexpected: string[] = [];
  let hold = false, pending: (() => Promise<void>) | null = null;
  const check = (name: string, ok: unknown) => { assert(ok, name); checks.push(name); };
  async function settle() { assert(pending, 'missing held API'); const finish = pending; pending = null; hold = false; await finish(); }
  await page.route('**/api/**', async (route: Route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== APP || url.pathname !== '/api/alpha/account' || request.method() !== 'POST') {
      unexpected.push(request.url()); return route.abort();
    }
    const body = request.postDataJSON();
    if (!['execute', 'lookup'].includes(body.kind)) { unexpected.push(body.kind); return route.abort(); }
    calls.push({ kind: body.kind, commandKind: body.command?.kind });
    const respond = async () => {
      const result = body.kind === 'execute' ? await repository.execute(body.command) : await repository.lookup(body.requestId);
      const fresh = await repository.read(); assert(fresh.ok); mock.accounts.set('a', fresh.value);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    };
    if (hold && body.kind === 'execute') { assert.equal(pending, null); pending = respond; } else await respond();
  });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: sessionKey, value: session('a') });
  const writes = () => calls.filter(call => call.kind === 'execute').length;
  const readStorage = () => page.evaluate(() => ({ forbidden: window.__alphaStorageAudit.forbidden,
    equal: Object.entries(window.__alphaStorageAudit.operational).every(([key,value]) => localStorage.getItem(key) === value) }));
  const saved = async () => { await page.getByRole('region', { name: '서버 저장 상태' }).getByText('서버 저장 확인', { exact: false }).waitFor(); };
  let stage = 'open';
  try {
    await page.goto(`${APP}/alpha`, { waitUntil: 'networkidle' });
    await writeFile(`${output}/initial-dom.txt`, await page.locator('body').innerText());
    await page.getByRole('navigation', { name: '개인공간 보기' }).getByRole('button', { name: '문서', exact: true }).click();
    const input = page.getByRole('textbox', { name: '문서 내용', exact: true }).filter({ visible: true });
    await input.waitFor(); check('initial-raw', await input.inputValue() === ORIGINAL);
    stage = 'ambiguous'; await input.fill(COMBINED);
    const warning = page.getByRole('alert').filter({ hasText: '여러 줄의 변경을 기존 항목과 연결하지 못해' }); await warning.waitFor();
    check('ambiguous-input-retained', await input.inputValue() === COMBINED); check('ambiguous-writes-zero', writes() === 0);
    check('ambiguous-no-format-blame', !(await warning.innerText()).includes('날짜·진행률'));
    for (const [width, height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]) {
      await page.setViewportSize({ width, height }); await warning.scrollIntoViewIfNeeded();
      const box = await warning.boundingBox();
      check(`${width}-warning-in-viewport`, box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1);
      check(`${width}-overflow-zero`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const path = `${output}/identity-${width}x${height}.png`; await page.screenshot({ path }); screenshots.push(path);
    }
    stage = 'split-edits'; await input.fill(RENAMED); await saved(); check('rename-one-write', writes() === 1);
    await input.fill(COMBINED); await page.getByRole('region', { name: '서버 저장 상태' }).getByText('마지막 확인 판본 2', { exact: true }).waitFor();
    check('outdent-one-write', writes() === 2); check('warning-cleared', await warning.count() === 0);
    const edited = await repository.read(); assert(edited.ok);
    check('line-identities-preserved', JSON.stringify(edited.value.space.text.documents[0].lines.map(line => line.id)) === JSON.stringify(lineIds));
    check('split-edits-raw', M.raw(M.getDocument(edited.value.space.text, docId)) === COMBINED);
    stage = 'busy-click'; await page.getByRole('button', { name: '날짜 미정', exact: true }).click();
    const task = page.getByRole('button', { name: '부모 완료', exact: true });
    hold = true; await task.click();
    await page.getByRole('region', { name: '서버 저장 상태' }).getByText('서버에 저장 중…', { exact: false }).waitFor();
    await task.press('Enter');
    const busy = page.getByText('저장하거나 서버 상태를 확인하고 있습니다. 끝나면 다시 시도해 주세요.', { exact: true }); await busy.waitFor();
    check('blocked-click-no-second-write', writes() === 3); check('busy-not-conflict', !(await page.locator('body').innerText()).includes('해결하지 않은 변경'));
    const busyPath = `${output}/busy-1440x900.png`; await page.screenshot({ path: busyPath }); screenshots.push(busyPath);
    await settle(); await saved(); await busy.waitFor({ state: 'hidden' });
    check('busy-notice-cleared', await busy.count() === 0);
    await page.getByRole('button', { name: '부모 다시 열기', exact: true }).press('Enter');
    await page.getByRole('region', { name: '서버 저장 상태' }).getByText('마지막 확인 판본 4', { exact: true }).waitFor();
    check('reopen-after-save', writes() === 4);
    const beforeReloadStorage = await readStorage();
    stage = 'reload'; await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('navigation', { name: '개인공간 보기' }).getByRole('button', { name: '문서', exact: true }).click();
    check('reload-raw-exact', await input.inputValue() === COMBINED);
    const storage = { beforeReload: beforeReloadStorage, afterReload: await readStorage() };
    check('outside-prefix-writes-zero', Object.values(storage).every(audit => audit.forbidden.length === 0));
    check('operational-sentinels-identical', Object.values(storage).every(audit => audit.equal));
    check('unexpected-network-zero', !unexpected.length && !mock.requests.some(x => !/^(?:GET \/auth\/v1\/(?:user|settings)(?:\?|$)|GET \/rest\/v1\/flowme_alpha_accounts\?|POST \/rest\/v1\/rpc\/flowme_alpha_social_(?:open|read)_v1$)/.test(x)));
    check('real-api-forwarding-zero', mock.workspaceRequests.length === 0); check('page-errors-zero', mock.pageErrors.length === 0); check('console-errors-zero', mock.consoleErrors.length === 0);
    await writeFile(`${output}/result.json`, JSON.stringify({ pass: true, kind: 'production local UI with mocked Auth and fake-server API', checks, calls,
      diagnostics: server.diagnostics(), screenshots, storage, interceptedRequests: mock.requests, pageErrors: mock.pageErrors, consoleErrors: mock.consoleErrors, actualDevices: 0, realAccounts: 0, remoteWrites: 0 }, null, 2));
    console.log(JSON.stringify({ pass: true, checks: checks.length, output, writes: writes() }));
  } catch (error) {
    await page.screenshot({ path: `${output}/failure.png` }); await writeFile(`${output}/failure-dom.txt`, await page.locator('body').innerText());
    await writeFile(`${output}/result.json`, JSON.stringify({ pass: false, stage, error: String(error), checks, calls, unexpected, interceptedRequests: mock.requests, pageErrors: mock.pageErrors, consoleErrors: mock.consoleErrors }, null, 2));
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; });
