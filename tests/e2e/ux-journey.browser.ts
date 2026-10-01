import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { login } from './alpha-auth.fixture';
import { mockCloudflareRelease } from './cloudflare-release.fixture';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';

const phase = process.env.FLOWME_UX_COMPARE ?? 'after';
const region = (page: import('@playwright/test').Page) => page.getByRole('region', { name: '개인 문서 편집', exact: true });

test('same Item: writing, date assignment, period and original row return', async ({ page }, info) => {
  const mock = await mockCloudflareRelease(page, { document: { title: '합성 여정 문서', raw: '준비 메모\n- [ ] 금요일 준비\n참고 링크는 나중에 정리' } });
  await page.goto('/alpha'); await login(page);
  await expect(region(page).locator('textarea')).toHaveValue('준비 메모\n- [ ] 금요일 준비\n참고 링크는 나중에 정리');
  await page.evaluate(() => window.scrollTo(0, 0));
  const geometry = await region(page).evaluate(element => {
    const host = element.querySelector('[data-native-editor]')!, r = host.getBoundingClientRect();
    const toolbar = element.firstElementChild!, controls = [...toolbar.querySelectorAll('button,summary')]
      .filter(button => { const r = button.getBoundingClientRect(); return button.checkVisibility() && r.width > 0 && r.height > 0; });
    return { width: innerWidth, height: innerHeight, bodyTop: r.top,
      visibleBody: Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(0, r.top)),
      toolbarRows: controls.map(button => button.getBoundingClientRect().top).sort((a,b) => a-b)
        .filter((top,index,rows) => index === 0 || top-rows[index-1] > 4).length,
      overflow: document.documentElement.scrollWidth > innerWidth,
      targets: controls.map(button => ({ name: button.getAttribute('aria-label') || button.textContent?.trim(), height: button.getBoundingClientRect().height })) };
  });
  expect(geometry.overflow).toBe(false);
  expect(geometry.targets.every(target => target.height >= 48)).toBe(true);
  if (phase === 'after' && geometry.width === 844 && geometry.height === 390) {
    // The baseline hid the writing surface below the initial landscape fold.
    // Leave space for its top padding and a whole first memo line, not one pixel.
    expect(geometry.visibleBody).toBeGreaterThanOrEqual(48);
  }
  writeFileSync(info.outputPath('geometry.json'), JSON.stringify(geometry, null, 2));
  await page.screenshot({ path: info.outputPath('first-viewport.png') });
  const original = await mock.current(), task = M.tasks(original.space.text)[0];
  expect(M.tasks(original.space.text)).toHaveLength(1);
  const views = page.getByRole('navigation', { name: '개인공간 보기' });
  await views.getByRole('button', { name: '전체 할 일', exact: true }).click();
  await page.getByRole('button', { name: '금요일 준비 작업', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const day = new Date().toLocaleDateString('en-CA');
  await dialog.getByLabel('실행 날짜', { exact: true }).fill(day);
  const beforeCancel = await mock.current(), callsBeforeCancel = mock.diagnostics();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(await mock.current()).toEqual(beforeCancel); expect(mock.diagnostics()).toEqual(callsBeforeCancel);
  await page.getByRole('button', { name: '금요일 준비 작업', exact: true }).click();
  await dialog.getByLabel('실행 날짜', { exact: true }).fill(day);
  await dialog.getByRole('button', { name: '날짜·시간 적용', exact: true }).click();
  await expect.poll(async () => M.tasks((await mock.current()).space.text)[0].date).toBe(day);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  for (const name of ['오늘', '주간', '월간']) {
    await views.getByRole('button', { name, exact: true }).click();
    await expect(page.locator(`[data-task-id="${task.id}"]`)).toHaveCount(1);
  }
  await page.getByRole('button', { name: '금요일 준비 완료', exact: true }).click();
  await expect.poll(async () => M.tasks((await mock.current()).space.text)[0].done).toBe(true);
  await views.getByRole('button', { name: '오늘', exact: true }).click();
  await expect(page.getByRole('button', { name: '금요일 준비 다시 열기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '금요일 준비 다시 열기', exact: true }).click();
  await expect.poll(async () => M.tasks((await mock.current()).space.text)[0].done).toBe(false);
  const history = M.progressHistory((await mock.current()).space.text, task.id);
  expect(history).toHaveLength(1); expect(history[0].percent).toBe(0);
  const beforeReturn = mock.diagnostics();
  await page.locator(`[data-task-id="${task.id}"]`).getByRole('button', { name: new RegExp(`^금요일 준비 ${day}`) }).click();
  await expect(region(page).locator('textarea')).toBeVisible();
  const sourceIndex = () => region(page).locator('textarea').evaluate((area: HTMLTextAreaElement) =>
    area.value.slice(0, area.selectionStart).split('\n').length - 1);
  // Characterize the reproduced baseline defect, never call it a successful origin return.
  await expect.poll(sourceIndex).toBe(phase === 'before' ? 0 : 1);
  writeFileSync(info.outputPath('origin-return.json'), JSON.stringify({ expectedIndex: 1,
    observedIndex: await sourceIndex(), conforms: phase !== 'before' }, null, 2));
  expect(mock.diagnostics()).toEqual(beforeReturn);
  const final = await mock.current(), finalTask = M.tasks(final.space.text)[0];
  expect(finalTask.id).toBe(task.id); expect(finalTask.docId).toBe(task.docId);
  expect(finalTask.folder).toBe(task.folder);
  expect(M.progressHistory(final.space.text, task.id)).toEqual(history);
  expect(M.raw(final.space.text.documents[0])).toContain('준비 메모');
  const changedRaw = M.raw(final.space.text.documents[0]) + '\n여정 확인 메모';
  await region(page).locator('textarea').fill(changedRaw);
  await expect.poll(async () => M.raw((await mock.current()).space.text.documents[0])).toBe(changedRaw);
  const edited = await mock.current();
  expect(M.tasks(edited.space.text)).toHaveLength(1);
  expect(M.tasks(edited.space.text)[0].id).toBe(task.id);
  const savedRaw = M.raw(edited.space.text.documents[0]);
  await page.reload();
  await expect(region(page).locator('textarea')).toHaveValue(savedRaw);
  expect(await mock.current()).toEqual(edited);
  await mock.assertBoundary(info);
});

if (phase === 'after') test('auxiliary tools are keyboard reachable, Escape closes with no mutation', async ({ page }, info) => {
  const mock = await mockCloudflareRelease(page, { document: { title: '합성 도구 문서', raw: '메모\n- [ ] 합성 할 일' } });
  await page.goto('/alpha'); await login(page);
  await expect(region(page).locator('textarea')).toBeVisible();
  const tools = region(page).locator('summary[aria-label="편집 도구"]');
  const before = mock.diagnostics(), saved = await mock.current();
  await tools.focus(); await page.keyboard.press('Enter');
  await expect(region(page).getByRole('button', { name: '날짜순 정렬', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tools).toBeFocused();
  await expect(region(page).getByRole('button', { name: '날짜순 정렬', exact: true })).not.toBeVisible();
  expect(mock.diagnostics()).toEqual(before); expect(await mock.current()).toEqual(saved);
  await mock.assertBoundary(info);
});

if (phase === 'after') test('long folded document unfolds and reveals the exact source row without saving', async ({ page }, info) => {
  const raw = Array.from({ length: 36 }, (_,index) => `앞의 합성 메모 ${index+1}`).join('\n')
    + '\n- \n  - [ ] 접힌 할 일\n마지막 메모';
  const mock = await mockCloudflareRelease(page, { document: { title: '합성 접힘 문서', raw, scopeAt: 36 } });
  await page.goto('/alpha'); await login(page);
  const area = region(page).locator('textarea');
  await expect(area).toHaveValue(M.raw((await mock.current()).space.text.documents[0]));
  const before = await mock.current(), diagnostics = mock.diagnostics();
  const task = M.tasks(before.space.text).find(task => task.title === '접힌 할 일')!;
  expect(task).toBeTruthy();
  await area.press('Control+End');
  await region(page).getByRole('button', { name: '합성 접힘 폴더 접기', exact: true }).click();
  await expect(area).toHaveAttribute('inert', '');
  await page.getByRole('navigation', { name: '개인공간 보기' }).getByRole('button', { name: '전체 할 일', exact: true }).click();
  await page.locator(`[data-task-id="${task.id}"]`).getByRole('button', { name: /^접힌 할 일 날짜 미정/ }).click();
  await expect(area).toBeFocused(); await expect(area).not.toHaveAttribute('inert', '');
  await expect.poll(() => area.evaluate((area: HTMLTextAreaElement) =>
    area.value.slice(0, area.selectionStart).split('\n').length-1)).toBe(37);
  await expect.poll(() => area.evaluate((area: HTMLTextAreaElement) => {
    const line = area.closest('.tle-root')!.querySelectorAll<HTMLElement>('.tle-line')[37];
    return !line.hidden && area.scrollTop > 0 && line.offsetTop >= area.scrollTop
      && line.offsetTop+line.offsetHeight <= area.scrollTop+area.clientHeight;
  })).toBe(true);
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await page.screenshot({ path: info.outputPath('folded-source-return.png') });
  await mock.assertBoundary(info);
});
