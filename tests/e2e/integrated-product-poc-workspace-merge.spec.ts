import { expect, test, type Locator, type Page } from '@playwright/test';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import type { ProgramEnvelope } from '../../lib/flow/integrated-poc/contract';

// The full owner suite must use the same bounded journey budget as the focused
// merge config; this does not extend any individual assertion's deadline.
test.describe.configure({ timeout: 90_000 });

const KEY = 'flow:poc:personal-workspace:v1:program:state';
const PREFIX = 'flow:poc:personal-workspace:v1:';
const DATE = '2026-09-20';
const raw = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);
const successfulWrites = (page: Page) => page.evaluate(() => (window as unknown as {
  __workspaceCalls: { outcome: string }[];
}).__workspaceCalls.filter(call => call.outcome === 'success').length);
const state = async (page: Page) => JSON.parse((await raw(page))!) as ProgramEnvelope;
const space = async (page: Page) => (await state(page)).data.spaces['local-user'];
const row = (page: Page, title: string) => page.locator('li[data-task-id]').filter({ has: page.getByRole('button', { name: `${title} 작업`, exact: true }) });
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: '개인공간 보기' }).getByRole('button', { name, exact: true }).click();

async function reachable(action: Locator) {
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  await expect(action).toBeEnabled();
  const geometry = await action.evaluate(element => {
    const r = element.getBoundingClientRect();
    const points = [[r.left + 5, r.top + 5], [r.right - 5, r.bottom - 5], [r.left + r.width / 2, r.top + r.height / 2]];
    return {
      width: r.width, height: r.height,
      inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      hits: points.every(([x, y]) => { const hit = document.elementFromPoint(x, y); return hit === element || element.contains(hit); }),
    };
  });
  expect(geometry.width).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.inside).toBe(true);
  expect(geometry.hits).toBe(true);
}

async function setup(page: Page) {
  await page.clock.setFixedTime(new Date('2026-09-20T03:00:00Z'));
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const origin = new URL(test.info().project.use.baseURL!).origin;
  await page.addInitScript(({ origin, key }) => {
    if (location.origin !== origin) return;
    const w = window as unknown as { __workspaceCalls: { method: string; key: string | null; outcome: string }[]; __workspaceFail: boolean };
    w.__workspaceCalls = []; w.__workspaceFail = false;
    if (!sessionStorage.getItem('workspace-merge-seeded')) {
      localStorage.setItem('flow:workspace-merge:sentinel', '  unchanged\r\n bytes  ');
      sessionStorage.setItem('workspace-merge-seeded', 'yes');
    }
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function(this: Storage, ...args: string[]) {
        if (this === localStorage) {
          if (method === 'setItem' && args[0] === key && w.__workspaceFail) {
            w.__workspaceCalls.push({ method, key: args[0], outcome: 'throw' });
            throw new DOMException('Synthetic quota fault', 'QuotaExceededError');
          }
          w.__workspaceCalls.push({ method, key: args[0] ?? null, outcome: 'success' });
        }
        return Reflect.apply(original, this, args);
      } });
    }
  }, { origin, key: KEY });
  await page.goto('/my?personalWorkspacePoc=v1');
  await expect(page.getByTestId('integrated-program-app')).toBeVisible();
  return async () => {
    const evidence = await page.evaluate(prefix => {
      const w = window as unknown as { __workspaceCalls: { method: string; key: string | null }[] };
      return {
        outside: w.__workspaceCalls.filter(c => c.method === 'clear' || !c.key?.startsWith(prefix)),
        operating: Object.fromEntries(Object.keys(localStorage).filter(k => !k.startsWith(prefix)).map(k => [k, localStorage.getItem(k)])),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    }, PREFIX);
    expect(evidence.operating).toEqual({ 'flow:workspace-merge:sentinel': '  unchanged\r\n bytes  ' });
    expect(evidence.outside).toEqual([]);
    expect(evidence.overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  };
}

async function quick(page: Page, title: string) {
  await reachable(page.getByRole('button', { name: '추가', exact: true }));
  await page.getByLabel('빠른 할 일', { exact: true }).fill(title);
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await expect(row(page, title)).toBeVisible();
}

const dimensions = [[375, 812], [390, 844], [844, 390], [1024, 768], [1440, 900]];
for (const [width, height] of dimensions) test(`current workspace ${width}x${height}: quick task, folder, periods, complete/reopen, undated, Undo and reload`, async ({ page }, info) => {
  await page.setViewportSize({ width, height });
  const verify = await setup(page);
  await page.getByText('폴더 정리', { exact: true }).click();
  await page.getByLabel('새 폴더 이름', { exact: true }).fill('Merge folder');
  await page.getByRole('button', { name: '폴더 만들기', exact: true }).click();
  await nav(page, '오늘'); await quick(page, 'Merge task');
  const task = M.tasks((await space(page)).text).find(t => t.title === 'Merge task')!;
  expect(task.date).toBe(DATE);
  for (const view of ['주간', '월간', '전체 할 일']) { await nav(page, view); await expect(row(page, 'Merge task')).toHaveCount(1); }
  await row(page, 'Merge task').getByRole('button').nth(1).click();
  await page.getByText('문서 작업', { exact: true }).click();
  await page.getByRole('combobox', { name: '문서 폴더', exact: true }).selectOption({ label: 'Merge folder' });
  await expect.poll(async () => (await space(page)).text.documents.find(d => d.id === task.docId)?.folderId).not.toBeNull();
  const assigned = await space(page), folder = assigned.text.folders.find(f => f.title === 'Merge folder')!;
  expect(assigned.text.documents.find(d => d.id === task.docId)?.folderId).toBe(folder.id);
  expect(M.tasks(assigned.text).find(t => t.id === task.id)?.date).toBe(DATE);
  await page.getByText('문서 작업', { exact: true }).click();
  await nav(page, '오늘');
  await row(page, 'Merge task').getByRole('button', { name: 'Merge task 완료', exact: true }).click();
  await expect(row(page, 'Merge task').getByRole('button', { name: 'Merge task 다시 열기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await nav(page, '월간');
  await expect(row(page, 'Merge task').getByRole('button', { name: 'Merge task 다시 열기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await row(page, 'Merge task').getByRole('button', { name: 'Merge task 다시 열기', exact: true }).click();
  await row(page, 'Merge task').getByRole('button', { name: 'Merge task 작업', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '날짜 미정으로 이동', exact: true }).click();
  await page.keyboard.press('Escape'); await nav(page, '날짜 미정');
  await expect(row(page, 'Merge task')).toHaveCount(1);
  expect(M.tasks((await space(page)).text).find(t => t.id === task.id)?.date).toBeNull();
  await page.getByRole('button', { name: '되돌리기', exact: true }).click();
  await nav(page, '오늘'); await expect(row(page, 'Merge task')).toHaveCount(1);
  await reachable(row(page, 'Merge task').getByRole('button', { name: 'Merge task 완료', exact: true }));
  await reachable(row(page, 'Merge task').getByRole('button', { name: 'Merge task 작업', exact: true }));
  const beforeReload = await raw(page);
  await verify();
  await page.screenshot({ path: info.outputPath(`workspace-${width}x${height}.png`), fullPage: true });
  await page.reload(); await expect(page.getByTestId('integrated-program-app')).toBeVisible();
  expect(await raw(page)).toBe(beforeReload);
  await nav(page, '오늘'); await expect(row(page, 'Merge task')).toHaveCount(1);
  await verify();
});

test('current ordering: menu, keyboard, drag and touch-hold share order; cancel/no-op/quota preserve state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const verify = await setup(page);
  await nav(page, '오늘'); await quick(page, 'Order A'); await quick(page, 'Order B'); await quick(page, 'Order C');
  const original = await space(page);
  const order = () => page.locator('li[data-task-id]').evaluateAll(rows => rows.map(r => r.getAttribute('data-task-id')));
  const originalOrder = await order();
  await row(page, 'Order C').getByRole('button', { name: 'Order C 작업', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '같은 날짜에서 위로', exact: true }).click();
  await page.keyboard.press('Escape');
  const expected = [originalOrder[0], originalOrder[2], originalOrder[1]];
  await expect.poll(order).toEqual(expected);
  const menuState = await space(page);
  await page.getByRole('button', { name: '되돌리기', exact: true }).click();
  await expect.poll(() => space(page)).toEqual(original);
  await expect.poll(order).toEqual(originalOrder);
  await row(page, 'Order C').getByRole('button', { name: 'Order C 작업', exact: true }).press('Alt+ArrowUp');
  await expect.poll(order).toEqual(expected);
  expect(await space(page)).toEqual(menuState);
  await page.getByRole('button', { name: '되돌리기', exact: true }).click();
  await expect.poll(order).toEqual(originalOrder);
  // Native drag must not insert a notice that displaces its source or target.
  const dragSource = (await row(page, 'Order C').boundingBox())!;
  const targetBeforeDrag = (await row(page, 'Order B').boundingBox())!;
  await page.mouse.move(dragSource.x + 5, dragSource.y + dragSource.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragSource.x + 20, dragSource.y + dragSource.height / 2, { steps: 5 });
  await expect(page.getByRole('status').filter({ hasText: '옮길 행의 앞' })).toHaveCount(0);
  const dragTarget = (await row(page, 'Order B').boundingBox())!;
  expect(dragTarget).toEqual(targetBeforeDrag);
  await page.mouse.move(dragTarget.x + 20, dragTarget.y + dragTarget.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(order).toEqual(expected);
  expect(await space(page)).toEqual(menuState);
  await page.getByRole('button', { name: '되돌리기', exact: true }).click();
  await expect.poll(order).toEqual(originalOrder);
  const touch = row(page, 'Order C').getByRole('button', { name: 'Order C 작업', exact: true });
  await touch.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 30, clientY: 30, pointerId: 1 });
  await expect(page.getByRole('status').filter({ hasText: '옮길 행의 앞' })).toBeVisible();
  await touch.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 1 });
  await row(page, 'Order B').getByRole('button').nth(1).click();
  await expect.poll(order).toEqual(expected);
  expect(await space(page)).toEqual(menuState);
  await page.getByRole('button', { name: '되돌리기', exact: true }).click();
  await expect.poll(order).toEqual(originalOrder);
  const before = await raw(page);
  const writesBeforeCancel = await successfulWrites(page);
  await touch.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 30, clientY: 30, pointerId: 1 });
  await expect(page.getByRole('status').filter({ hasText: '옮길 행의 앞' })).toBeVisible();
  await touch.dispatchEvent('pointercancel', { pointerType: 'touch', pointerId: 1 });
  await expect(page.getByRole('status').filter({ hasText: '옮길 행의 앞' })).toHaveCount(0);
  expect(await raw(page)).toBe(before);
  expect(await successfulWrites(page)).toBe(writesBeforeCancel);
  await touch.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 30, clientY: 30, pointerId: 1 });
  await expect(page.getByRole('status').filter({ hasText: '옮길 행의 앞' })).toBeVisible();
  await page.keyboard.press('Escape'); expect(await raw(page)).toBe(before);
  await expect(page.getByRole('status').filter({ hasText: '옮길 행의 앞' })).toHaveCount(0);
  expect(await successfulWrites(page)).toBe(writesBeforeCancel);
  await touch.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 30, clientY: 30, pointerId: 1 });
  const moveNotice = page.getByRole('status').filter({ hasText: '옮길 행의 앞' });
  await expect(moveNotice).toBeVisible();
  await moveNotice.getByRole('button', { name: '취소', exact: true }).click();
  await expect(moveNotice).toHaveCount(0);
  expect(await raw(page)).toBe(before);
  expect(await successfulWrites(page)).toBe(writesBeforeCancel);
  await touch.press('Enter');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '날짜 적용', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '이미 같은 상태입니다.' })).toBeVisible();
  expect(await raw(page)).toBe(before); // identical date is a no-op
  expect(await successfulWrites(page)).toBe(writesBeforeCancel);
  await dialog.getByLabel('실행 날짜', { exact: true }).fill('2026-10-10');
  await page.keyboard.press('Escape'); expect(await raw(page)).toBe(before);
  expect(await successfulWrites(page)).toBe(writesBeforeCancel);
  await touch.click();
  await dialog.getByLabel('실행 날짜', { exact: true }).fill('2026-10-10');
  await page.evaluate(() => { (window as unknown as { __workspaceFail: boolean }).__workspaceFail = true; });
  await dialog.getByRole('button', { name: '날짜 적용', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  expect(await raw(page)).toBe(before);
  expect(await successfulWrites(page)).toBe(writesBeforeCancel);
  await page.evaluate(() => { (window as unknown as { __workspaceFail: boolean }).__workspaceFail = false; });
  await dialog.getByRole('button', { name: '날짜 적용', exact: true }).click();
  await expect.poll(async () => M.tasks((await space(page)).text).find(t => t.title === 'Order C')?.date).toBe('2026-10-10');
  await page.keyboard.press('Escape');
  await verify();
});
