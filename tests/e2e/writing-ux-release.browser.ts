import { test, expect, type Page } from '@playwright/test';
import { login } from './alpha-auth.fixture';
import { mockCloudflareRelease } from './cloudflare-release.fixture';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../lib/flow/integrated-poc/text-workspace';

const title = '합성 모바일 작성 전환';
const ids = { work: 'release-writing-work', empty: 'release-writing-empty' };
const library = (page: Page) => page.locator('#program-library');
const toggle = (page: Page) => page.getByRole('button', { name: /^문서·폴더 (열기|접기)/ });
const scope = (page: Page) => page.getByRole('combobox', { name: '폴더', exact: true });
const editor = (page: Page) => page.getByRole('region', { name: '개인 문서 편집', exact: true });
const fullArea = (page: Page) => editor(page).locator('[data-native-editor="v11-core"] textarea');
const regionArea = (page: Page) => editor(page).getByRole('textbox', { name: '폴더 영역 1 원문', exact: true });

function fixture(): TextWorkspaceState {
  let text = M.addDocument(createEmptyTextWorkspace(), { title });
  text = { ...text, folders: [...text.folders,
    { id: ids.work, title: '합성 업무', parentId: null }, { id: ids.empty, title: '합성 빈 폴더', parentId: null }] };
  const id = text.documents[0].id;
  text = M.editText(text, id, '숨은 앞 원문  \t\n[2026-10-01]\n- ');
  text = M.attachScope(text, id, 2, ids.work);
  if (M.rowMeta(text, id)[2]?.scopeId !== ids.work) throw Error('writing-ux-release-synthetic-scope-rejected');
  text = M.editText(text, id, `${M.raw(M.getDocument(text, id))}\n  - 작성할 합성 메모\n  - [ ] 합성 할 일\n    - 메모: 기존 설명\n    - 시간: 09:00\n숨은 끝 원문  `);
  const task = M.tasks(text).find(row => row.title === '합성 할 일')!;
  text = M.recordProgress(text, task.id, '2026-09-30', 20);
  text = M.addDocument(text, { title: '합성 다른 문서', folderId: ids.empty });
  text = M.editText(text, text.documents.at(-1)!.id, '변경하지 않을 다른 원문\n- [ ] 다른 할 일');
  if (!M.validate(text)) throw Error('writing-ux-release-synthetic-text-invalid');
  return text;
}

async function openLibrary(page: Page) {
  await expect(library(page)).toBeAttached();
  if (!await library(page).isVisible()) await toggle(page).click();
  await expect(scope(page)).toBeVisible();
}

test('release bundle: mobile library hands off only successful document writing scope and retains filters with zero writes', async ({ page }, info) => {
  // This second observer proves the presentation handoff adds no browser storage
  // calls at all. The shared fixture separately guards operating sentinel bytes.
  await page.addInitScript(() => {
    const audit: { method: string; key: string | null }[] = [];
    (window as unknown as { __writingUxReleaseStorage: typeof audit }).__writingUxReleaseStorage = audit;
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function(this: Storage, ...args: string[]) {
        audit.push({ method, key: args[0] ?? null }); return Reflect.apply(original, this, args);
      } });
    }
  });
  const seed = fixture(), mock = await mockCloudflareRelease(page, { prepareText: () => structuredClone(seed) });
  await page.goto('/alpha'); await login(page);
  const management = page.locator('details[aria-label="계정 및 자료 관리"]');
  if (await management.getAttribute('open') !== null) await management.locator('summary').click();
  await expect(library(page)).toBeVisible();
  await library(page).getByRole('button', { name: new RegExp(`^${title}`) }).click();
  await expect(fullArea(page)).toHaveValue(M.raw(seed.documents[0]));
  await fullArea(page).focus(); await fullArea(page).press('Control+Home');
  for (let i = 0; i < 5; i++) await fullArea(page).press('ArrowRight');
  const nativeBefore = await fullArea(page).evaluate((area: HTMLTextAreaElement) => ({
    raw: area.value, start: area.selectionStart, end: area.selectionEnd, scrollTop: area.scrollTop,
  }));
  await openLibrary(page);
  await page.locator('#program-private-search').fill('합성');
  await scope(page).scrollIntoViewIfNeeded(); await scope(page).focus();
  const before = await mock.current(), diagnostics = mock.diagnostics();
  const storageBefore = await page.evaluate(() => ({
    calls: (window as unknown as { __writingUxReleaseStorage: unknown[] }).__writingUxReleaseStorage.length,
    bytes: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])),
  }));
  const mobile = (page.viewportSize()?.width ?? 1440) <= 760;

  await scope(page).selectOption(ids.work);
  await expect(regionArea(page)).toHaveValue('  - 작성할 합성 메모\n  - [ ] 합성 할 일\n    - 메모: 기존 설명\n    - 시간: 09:00');
  if (mobile) {
    await expect(library(page)).not.toBeVisible(); await expect(toggle(page)).toBeFocused();
    await expect.poll(() => regionArea(page).evaluate((area: HTMLTextAreaElement) => {
      const rect = area.getBoundingClientRect();
      return rect.width > 0 && rect.bottom > 0 && rect.top + 44 <= innerHeight;
    }), { message: 'At least the first 44px of the writing area is in the mobile viewport after the library choice' }).toBe(true);
    await expect(regionArea(page)).not.toBeFocused();
  } else {
    await expect(library(page)).toBeVisible(); await expect(scope(page)).toBeFocused();
  }
  const screenshot = info.outputPath('library-writing-handoff.png');
  await page.screenshot({ path: screenshot });
  await info.attach('library-writing-handoff', { contentType: 'image/png', path: screenshot });

  await openLibrary(page);
  await expect(scope(page)).toHaveValue(ids.work); await expect(page.locator('#program-private-search')).toHaveValue('합성');
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await scope(page).focus(); await scope(page).selectOption(ids.empty);
  await expect(editor(page)).toContainText('현재 문서에는 이 폴더의 연결 영역이나 할 일이 없습니다.');
  await expect(library(page)).toBeVisible(); await expect(scope(page)).toBeFocused();
  await expect(library(page).getByRole('button', { name: /^합성 다른 문서/ })).toBeVisible();

  await scope(page).selectOption(''); await expect(fullArea(page)).toBeVisible();
  if (mobile) { await expect(library(page)).not.toBeVisible(); await expect(toggle(page)).toBeFocused(); }
  else await expect(library(page)).toBeVisible();
  expect(await fullArea(page).evaluate((area: HTMLTextAreaElement) => ({ raw: area.value, start: area.selectionStart, end: area.selectionEnd, scrollTop: area.scrollTop })))
    .toEqual(nativeBefore);
  await expect(fullArea(page)).not.toBeFocused();

  await openLibrary(page);
  await page.getByRole('navigation', { name: '개인공간 보기' }).getByRole('button', { name: '오늘', exact: true }).click();
  await scope(page).focus(); await scope(page).selectOption(ids.work);
  await expect(library(page)).toBeVisible(); await expect(scope(page)).toBeFocused();
  await expect(scope(page)).toHaveValue(ids.work); await expect(page.locator('#program-private-search')).toHaveValue('합성');
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  const storageAfter = await page.evaluate(() => ({
    calls: (window as unknown as { __writingUxReleaseStorage: unknown[] }).__writingUxReleaseStorage.length,
    bytes: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])),
  }));
  expect(storageAfter).toEqual(storageBefore);
  await info.attach('writing-presentation-boundary', { contentType: 'application/json', body: JSON.stringify({
    viewport: page.viewportSize(), mobile, extraMutations: 0, extraStorageCalls: 0,
    workspaceUnchanged: true, sourceItemIdentityUnchanged: true, folderAndQueryRetained: true,
    nativeSelectionAndScrollUnchanged: true, textareaAutofocus: false,
  }) });

  // The fixed fixture evaluates both initial and reloaded document/static GETs
  // in local and remote-readonly mode, with every Auth/API request synthetic.
  await page.reload();
  await openLibrary(page);
  await library(page).getByRole('button', { name: new RegExp(`^${title}`) }).click();
  await expect(fullArea(page)).toHaveValue(M.raw(seed.documents[0]));
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(diagnostics);
  await mock.assertBoundary(info);
});
