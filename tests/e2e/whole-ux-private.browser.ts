import { test, expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import { login } from './alpha-auth.fixture';
import { mockCloudflareRelease } from './cloudflare-release.fixture';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import { loadUxExactBuild, assertUxObservedAssets, type UxExactBuild } from './ux-exact-build';
let exactBuild: UxExactBuild;
test.beforeAll(() => { exactBuild = loadUxExactBuild(process.env);
  expect(exactBuild.qaInputs.some(file => file.path === 'tests/e2e/whole-ux-private.browser.ts')).toBe(true); });
const raw = '업무 비교 메모와 필요한 자료\n[2026-10-09]\n- [ ] 회의 자료 확인\n  - 메모: 원래 메모 유지\n  - [ ] 질문 적기\n생활 할 일은 별도 글에 둡니다.';
const area = (page: Page) => page.locator('[data-program-document]:not([hidden]) [data-native-editor="v11-core"] textarea');
const find = (page: Page) => page.getByRole('button', { name: '글 찾기 · 내 문서와 할 일', exact: true });
const panel = (page: Page) => page.getByRole('dialog', { name: '글 찾기', exact: true });
const views = (page: Page) => page.getByRole('navigation', { name: '기본 이동', exact: true });
async function click(locator: Locator) { await expect(locator).toBeVisible(); await locator.click(); }
async function capture(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
  await info.attach(name, { path: info.outputPath(`${name}.png`), contentType: 'image/png' });
  const geometry = await page.evaluate(() => ({ at: new Date().toISOString(), viewport: { width: innerWidth, height: innerHeight },
    overflow: document.documentElement.scrollWidth - innerWidth,
    editor: (() => { const node = document.querySelector('[data-program-document]:not([hidden]) textarea'); if (!node) return null;
      const box = node.getBoundingClientRect(), css = getComputedStyle(node); return { x: box.x, y: box.y, width: box.width, height: box.height, lineHeight: css.lineHeight, fontSize: css.fontSize }; })() }));
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  await info.attach(`${name}-geometry`, { contentType: 'application/json', body: JSON.stringify({ ...geometry, evidence: 'Actual candidate bundle + synthetic Auth/CAS. Desktop Chromium viewport, not physical phone/OS IME/user trial.' }) });
}
async function boot(page: Page) {
  const mock = await mockCloudflareRelease(page, { document: { title: '업무 글', raw }, prepareText: text => {
    const next = M.addDocument(text, { title: '생활 글' }), doc = next.documents.at(-1)!;
    return M.editText(next, doc.id, '생활 비교 메모\n- [ ] 장보기');
  } });
  await page.goto('/alpha'); expect(await page.content()).toContain(exactBuild.buildId); await login(page);
  const management = page.locator('details[aria-label="계정 및 자료 관리"]');
  if (await management.getAttribute('open') !== null) await management.locator(':scope > summary').click();
  await expect(area(page)).toHaveValue(raw);
  return mock;
}
async function boundary(page: Page, mock: Awaited<ReturnType<typeof boot>>, info: TestInfo) {
  await page.waitForLoadState('networkidle'); await mock.assertBoundary(info);
  const body = info.attachments.find(row => row.name === 'release-boundary')?.body;
  expect(body).toBeTruthy();
  const guard = JSON.parse(body!.toString('utf8'));
  expect(guard.realApiRequests).toBe(0); expect(guard.forwardedSupabaseRequests).toBe(0);
  assertUxObservedAssets(exactBuild, guard.assets);
  await info.attach('private-exact-build', { contentType: 'application/json', body: JSON.stringify({
    head: exactBuild.head, buildId: exactBuild.buildId, observedAssetsMatchManifest: true,
    evidence: 'Actual candidate bundle with synthetic Auth/CAS; real account writes 0. Not physical phone or user trial.' }) });
  await page.route('**/*', route => route.abort('blockedbyclient'));
  await page.context().unrouteAll({ behavior: 'wait' });
}
test('private find: same editor/selection, current scope search and exact source row with zero copies', async ({ page }, info) => {
  await page.addInitScript(() => {
    const events: unknown[] = []; (window as unknown as { focusObservations: unknown[] }).focusObservations = events;
    document.addEventListener('focusin', event => { const target = event.target as HTMLElement;
      events.push({ time: performance.now(), tag: target.tagName, id: target.id, label: target.getAttribute('aria-label'),
        findOpen: (document.getElementById('program-library') as HTMLDialogElement | null)?.open }); }, true);
  });
  const mock = await boot(page), original = await mock.current(), doc = original.space.text.documents[0];
  await capture(page, info, 'writing');
  await area(page).press('Control+Home'); await area(page).press('Shift+End');
  const before = await area(page).evaluate(node => { const area = node as HTMLTextAreaElement;
    return { raw: area.value, start: area.selectionStart, end: area.selectionEnd, direction: area.selectionDirection, top: area.scrollTop }; });
  await click(find(page)); await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByRole('button', { name: /^업무 글/ })).toContainText('업무 비교 메모');
  await panel(page).getByLabel('내 문서·할 일 찾기', { exact: true }).fill('없는 단어');
  await expect(panel(page).getByText('검색 결과가 없습니다.', { exact: true })).toBeVisible();
  await click(panel(page).getByRole('button', { name: '검색 지우기', exact: true }));
  await capture(page, info, 'find'); await panel(page).press('Escape');
  await expect(panel(page)).not.toBeVisible(); await expect(area(page)).toBeFocused();
  expect(await area(page).evaluate(node => { const area = node as HTMLTextAreaElement;
    return { raw: area.value, start: area.selectionStart, end: area.selectionEnd, direction: area.selectionDirection, top: area.scrollTop }; })).toEqual(before);
  await click(views(page).getByRole('button', { name: '오늘', exact: true }));
  await expect(page.getByRole('combobox', { name: '기간 보기', exact: true })).toBeVisible();
  await click(find(page)); await panel(page).getByLabel('내 문서·할 일 찾기', { exact: true }).fill('회의 자료');
  await expect(views(page).getByRole('button', { name: '오늘', exact: true })).toHaveAttribute('aria-current', 'page');
  await click(panel(page).getByRole('region', { name: '현재 보기의 할 일 검색 결과', exact: true }).getByRole('button', { name: /^회의 자료 확인/ }));
  await expect(panel(page)).not.toBeVisible();
  try { await expect(area(page)).toBeFocused(); } finally {
    await info.attach('source-focus-observation', { contentType: 'application/json', body: JSON.stringify(await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const find = document.getElementById('program-library') as HTMLDialogElement | null;
      return { events: (window as unknown as { focusObservations: unknown[] }).focusObservations,
        active: active && { tag: active.tagName, id: active.id, text: active.textContent?.slice(0, 50) },
        find: { open: find?.open, connected: find?.isConnected, display: find && getComputedStyle(find).display },
        dialogs: [...document.querySelectorAll('dialog')].map(dialog => ({ id: dialog.id, open: dialog.open })),
        areas: [...document.querySelectorAll<HTMLTextAreaElement>('[data-program-document] textarea')].map(area => ({ id: area.id, visible: !!area.getClientRects().length, start: area.selectionStart, end: area.selectionEnd, readonly: area.readOnly })) };
    })) });
  }
  await expect(area(page)).toHaveValue(raw);
  const offset = raw.indexOf('- [ ] 회의 자료 확인');
  await expect.poll(() => area(page).evaluate(node => (node as HTMLTextAreaElement).selectionStart)).toBe(offset);
  await capture(page, info, 'source-return');
  await click(views(page).getByRole('button', { name: '분류', exact: true }));
  await click(find(page)); await expect(panel(page)).toBeVisible();
  // The existing explicit period change clears its search. Do not invent a
  // cross-period sticky query contract in this presentation-only candidate.
  await expect(panel(page).getByLabel('내 문서·할 일 찾기', { exact: true })).toHaveValue('');
  await panel(page).getByLabel('내 문서·할 일 찾기', { exact: true }).fill('장보기');
  await click(panel(page).getByRole('button', { name: '검색 지우기', exact: true }));
  await panel(page).press('Escape'); await expect(views(page).getByRole('button', { name: '분류', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(await mock.current()).toEqual(original); expect(mock.commands).toHaveLength(0); expect(mock.diagnostics()).toEqual({ mutations: 0, operations: 0 });
  expect((await mock.current()).space.text.documents[0].id).toBe(doc.id);
  await boundary(page, mock, info);
});
test('failed save keeps exact input and refuses global navigation until explicit retry; reload restores same document', async ({ page }, info) => {
  const mock = await boot(page), original = await mock.current(), doc = original.space.text.documents[0];
  mock.state.rejectNextExecute = 'limit';
  await area(page).press('Control+End'); await area(page).press('End'); await area(page).pressSequentially(' 새 작성');
  const draft = raw + ' 새 작성'; await expect(area(page)).toHaveValue(draft);
  const sync = page.getByRole('region', { name: '서버 저장 상태', exact: true }).getByRole('status');
  await expect(sync).toHaveText('저장 거절 · 입력 보존됨');
  expect(await mock.current()).toEqual(original);
  // Navigation uses the existing explicit editor flush. Keep that real retry
  // rejected too, rather than claiming navigation can never request a save.
  mock.state.rejectNextExecute = 'limit';
  await click(page.getByRole('navigation', { name: '주요 메뉴', exact: true }).getByRole('button', { name: 'Flow', exact: true }));
  await expect(area(page)).toHaveValue(draft); await expect(page.getByTestId('program-discovery')).toHaveCount(0);
  expect(await mock.current()).toEqual(original);
  const retry = page.getByRole('button', { name: '다시 저장', exact: true });
  await click(retry); await expect(sync).toHaveText('서버 저장 확인');
  await expect.poll(async () => M.raw((await mock.current()).space.text.documents.find(row => row.id === doc.id)!)).toBe(draft);
  await page.reload(); await expect(area(page)).toHaveValue(draft);
  expect((await mock.current()).space.text.documents).toHaveLength(2);
  expect((await mock.current()).space.copies).toHaveLength(0);
  await capture(page, info, 'save-retry-reload'); await boundary(page, mock, info);
});

test('long native writing preserves selection, native Undo/Redo and the last line across find and reload', async ({ page }, info) => {
  const longRaw = Array.from({ length: 55 }, (_, i) => `비교 메모 ${i + 1}: 글과 자료를 함께 읽고 계속 씁니다.`).join('\n')
    + '\n- [ ] 마지막 확인할 일\n계속 작성할 마지막 문장';
  const mock = await mockCloudflareRelease(page, { document: { title: '긴 가상 글', raw: longRaw } });
  await page.goto('/alpha'); expect(await page.content()).toContain(exactBuild.buildId); await login(page);
  const management = page.locator('details[aria-label="계정 및 자료 관리"]');
  if (await management.getAttribute('open') !== null) await management.locator(':scope > summary').click();
  const original = await mock.current(), doc = original.space.text.documents[0];
  await expect(area(page)).toHaveValue(longRaw);
  await area(page).press('Control+End'); await area(page).press('Shift+Home');
  const before = await area(page).evaluate(node => { const area = node as HTMLTextAreaElement;
    return { start: area.selectionStart, end: area.selectionEnd, direction: area.selectionDirection, top: area.scrollTop }; });
  await click(find(page)); await expect(panel(page)).toBeVisible(); await panel(page).press('Escape');
  await expect(area(page)).toBeFocused();
  expect(await area(page).evaluate(node => { const area = node as HTMLTextAreaElement;
    return { start: area.selectionStart, end: area.selectionEnd, direction: area.selectionDirection, top: area.scrollTop }; })).toEqual(before);
  await area(page).pressSequentially('X'); const changed = longRaw.slice(0, before.start) + 'X' + longRaw.slice(before.end);
  await expect(area(page)).toHaveValue(changed); await area(page).press('Control+z'); await expect(area(page)).toHaveValue(longRaw);
  await area(page).press('Control+Shift+z'); await expect(area(page)).toHaveValue(changed);
  await expect.poll(async () => M.raw((await mock.current()).space.text.documents[0])).toBe(changed);
  const saved = await mock.current(); expect(saved.space.text.documents).toHaveLength(1);
  expect(saved.space.text.documents[0].id).toBe(doc.id);
  const taskId = M.tasks(original.space.text)[0]?.id;
  expect(M.tasks(saved.space.text)[0]?.id).toBe(taskId);
  await capture(page, info, 'long-writing-last-line');
  if (info.project.name === '390x844') {
    await page.setViewportSize({ width: 390, height: 568 });
    await click(find(page)); await expect(panel(page).getByRole('button', { name: '닫기', exact: true })).toBeVisible();
    await capture(page, info, 'short-height-find'); await panel(page).press('Escape');
  }
  await page.reload(); await expect(area(page)).toHaveValue(changed);
  expect((await mock.current()).space.text.documents[0].id).toBe(doc.id);
  expect((await mock.current()).space.copies).toHaveLength(0);
  await boundary(page, mock, info);
});
