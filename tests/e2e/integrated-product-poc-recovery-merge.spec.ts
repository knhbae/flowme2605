import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ProgramEnvelope } from '../../lib/flow/integrated-poc/contract';

// Two real tabs, injected quota failure, export, discard and reload form one
// journey. Keep its focused-config budget when running under the full suite.
test.describe.configure({ timeout: 90_000 });

const KEY = 'flow:poc:personal-workspace:v1:program:state';
const PREFIX = 'flow:poc:personal-workspace:v1:';
const SENTINEL = 'flow:recovery-merge:sentinel';
const BYTES = '  synthetic recovery sentinel\r\n unchanged  ';
const ROUTE = '/my?personalWorkspacePoc=v1#flowme/creator';
const wire = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);
const data = async (page: Page) => JSON.parse((await wire(page))!) as ProgramEnvelope;
const raw = async (page: Page) => (await data(page)).data.spaces['local-user'].creatorWorkspace!.working!.rawText;
const editor = (page: Page) => page.getByRole('region', { name: '제작 작업 공간', exact: true }).getByRole('textbox', { name: '제작 원문', exact: true });

async function audit(page: Page, seed: boolean) {
  const errors: string[] = [], calls: { method: string; key: string | null; fault: boolean }[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.exposeBinding('__recoveryAudit', (_source, call) => calls.push(call));
  await page.addInitScript(({ key, value, stateKey, seed }) => {
    if (seed && !sessionStorage.getItem('recovery-seeded')) {
      localStorage.setItem(key, value); sessionStorage.setItem('recovery-seeded', '1');
    }
    const win = window as unknown as { __recoveryQuota: boolean; __recoveryFaults: number; __recoveryAudit: (value: unknown) => Promise<void> };
    win.__recoveryQuota = false; win.__recoveryFaults = 0;
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function(this: Storage, ...args: string[]) {
        const fault = this === localStorage && method === 'setItem' && args[0] === stateKey && win.__recoveryQuota;
        if (this === localStorage) void win.__recoveryAudit({ method, key: args[0] ?? null, fault });
        if (fault) { win.__recoveryFaults++; throw new DOMException('Synthetic quota fault', 'QuotaExceededError'); }
        return Reflect.apply(original, this, args);
      } });
    }
  }, { key: SENTINEL, value: BYTES, stateKey: KEY, seed });
  return async () => {
    expect(await page.evaluate(key => localStorage.getItem(key), SENTINEL)).toBe(BYTES);
    expect(calls.filter(call => call.method === 'clear' || !call.key?.startsWith(PREFIX))).toEqual([]);
    expect(errors).toEqual([]);
  };
}

async function createSaved(page: Page) {
  await page.goto(ROUTE);
  const surface = page.getByRole('region', { name: '제작 작업 공간', exact: true });
  await surface.getByRole('button', { name: '빈 제작 원문 만들기', exact: true }).filter({ visible: true }).click();
  await surface.getByLabel('제작 초안 제목', { exact: true }).fill('Recovery merge draft');
  await editor(page).fill('# Recovery merge draft\n- [ ] baseline saved source');
  await editor(page).press('Tab');
  await surface.getByRole('button', { name: '제작 초안 저장', exact: true }).click();
  await expect.poll(async () => (await data(page)).data.spaces['local-user'].creatorWorkspace!.working!.baseRecordRevision).not.toBeNull();
}
const quota = (page: Page, enabled: boolean) => page.evaluate(enabled => { (window as unknown as { __recoveryQuota: boolean }).__recoveryQuota = enabled; }, enabled);
const faults = (page: Page) => page.evaluate(() => (window as unknown as { __recoveryFaults: number }).__recoveryFaults);

test('current creator quota: failed persistence retains raw and committed bytes, explicit retry then reload restores input', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const verify = await audit(page, true);
  await createSaved(page);
  const committed = await wire(page);
  await quota(page, true);
  const wanted = '# Recovery merge draft\n- [ ] quota must not discard my new source';
  await editor(page).fill(wanted); await editor(page).press('Tab');
  await expect.poll(() => faults(page)).toBeGreaterThan(0);
  expect(await wire(page)).toBe(committed);
  await expect(editor(page)).toHaveValue(wanted);
  await editor(page).focus(); await expect(editor(page)).toBeFocused();
  await quota(page, false);
  await page.getByText('저장 전 입력 보관', { exact: true }).click();
  await page.getByRole('button', { name: '입력 보관 다시 시도', exact: true }).click();
  await expect.poll(() => raw(page)).toBe(wanted);
  await page.reload(); await expect(editor(page)).toHaveValue(wanted);
  await verify();
});

test('current creator two tabs: real remote UI save cannot overwrite failed local input; keep, export and explicit discard preserve remote bytes', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const verifyA = await audit(page, true);
  await createSaved(page);
  const other = await context.newPage();
  const verifyB = await audit(other, false);
  await other.goto(ROUTE);
  await expect(editor(other)).toHaveValue('# Recovery merge draft\n- [ ] baseline saved source');
  await quota(page, true);
  const local = '# Local unfinished input\n- [ ] preserve this private text';
  await editor(page).fill(local); await editor(page).press('Tab');
  await expect.poll(() => faults(page)).toBeGreaterThan(0);
  const remote = '# Remote saved source\n- [ ] real second-tab UI commit';
  await editor(other).fill(remote); await editor(other).press('Tab');
  await other.getByRole('button', { name: '제작 초안 저장', exact: true }).click();
  await expect.poll(() => raw(other)).toBe(remote);
  const remoteWire = await wire(other);
  const recovery = page.getByRole('region', { name: '다른 탭 변경과 입력 보호', exact: true });
  await expect(recovery).toBeVisible();
  await expect(editor(page)).toHaveValue(local);
  expect(await wire(page)).toBe(remoteWire);
  await recovery.getByRole('button', { name: '입력 버리고 최신 상태 보기', exact: true }).click();
  await recovery.getByRole('button', { name: '입력 유지', exact: true }).click();
  await expect(editor(page)).toHaveValue(local);
  await editor(page).focus(); await expect(editor(page)).toBeFocused();
  expect(await wire(page)).toBe(remoteWire);
  const downloadEvent = page.waitForEvent('download');
  await recovery.getByRole('button', { name: '작성 중 입력 TXT 받기', exact: true }).click();
  const download = await downloadEvent, path = await download.path();
  expect(path).not.toBeNull(); expect(readFileSync(path!, 'utf8')).toContain(local);
  await recovery.getByRole('button', { name: '입력 버리고 최신 상태 보기', exact: true }).click();
  await recovery.getByRole('button', { name: '버리고 불러오기', exact: true }).click();
  await expect(recovery).toHaveCount(0);
  await expect(editor(page)).toHaveValue(remote);
  expect(await wire(page)).toBe(remoteWire);
  await page.reload(); await expect(editor(page)).toHaveValue(remote);
  expect(await wire(page)).toBe(remoteWire);
  await verifyA(); await verifyB(); await other.close();
});
