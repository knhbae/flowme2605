import { test, expect, type Page, type TestInfo } from '@playwright/test';
const KEY = 'flow:poc:personal-workspace:v1:folder-content-entry-demo';
async function setup(page: Page, corrupt = false) {
  const errors: string[] = [], denied: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:3114' && route.request().method() === 'GET'
      && ['/prototype', '/report', '/favicon.ico'].includes(url.pathname)) return route.continue();
    denied.push(route.request().url()); return route.abort();
  });
  await page.addInitScript(({ key, corrupt }) => {
    const original = Storage.prototype.setItem;
    if (localStorage.getItem('flow:artifact-sentinel') === null) {
      original.call(localStorage, 'flow:artifact-sentinel', 'UNCHANGED_BYTES');
      if (corrupt) original.call(localStorage, key, '{broken');
    }
    const audit = { calls: [] as { method: string; key?: string }[], rejected: [] as string[] };
    Object.defineProperty(window, '__artifactAudit', { value: audit });
    for (const method of ['setItem', 'removeItem', 'clear'] as const) {
      const apply = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { value: function(this: Storage, ...args: string[]) {
        if (method === 'clear' || args[0] !== key) { audit.rejected.push(method + ':' + args[0]); throw Error('artifact-storage-boundary'); }
        audit.calls.push({ method, key: args[0] }); return Reflect.apply(apply, this, args);
      }, configurable: true });
    }
  }, { key: KEY, corrupt });
  return { errors, denied };
}
const calls = (page: Page) => page.evaluate(() => (window as any).__artifactAudit.calls.length);
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY);
async function assess(page: Page, info: TestInfo, name: string, boundary: Awaited<ReturnType<typeof setup>>) {
  const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight,
    documentOverflow: document.documentElement.scrollWidth - innerWidth,
    bodyOverflow: document.body.scrollWidth - innerWidth,
    brokenImages: [...document.images].filter(image => !image.complete || !image.naturalWidth).length,
    typography: [...document.querySelectorAll('h1,h2,button,input,textarea')].map(element => ({
      text: element.textContent?.slice(0, 70), font: getComputedStyle(element).fontSize,
      rect: { width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height },
    })), audit: (window as any).__artifactAudit,
    sentinel: localStorage.getItem('flow:artifact-sentinel'),
  }));
  expect(geometry.documentOverflow).toBeLessThanOrEqual(1); expect(geometry.bodyOverflow).toBeLessThanOrEqual(1);
  expect(geometry.brokenImages).toBe(0); expect(geometry.audit.rejected).toEqual([]);
  expect(geometry.sentinel).toBe('UNCHANGED_BYTES'); expect(boundary.errors).toEqual([]); expect(boundary.denied).toEqual([]);
  const file = info.outputPath(`${name}.png`); await page.screenshot({ path: file, fullPage: true });
  await info.attach(name, { path: file, contentType: 'image/png' });
  await info.attach(`${name}-measurements`, { body: JSON.stringify(geometry), contentType: 'application/json' });
}
test('HTML1 folder proposal, keyboard cancel, explicit create, Undo/reload and precise reset', async ({ page }, info) => {
  const boundary = await setup(page); await page.goto('/prototype');
  await page.getByRole('textbox', { name: '원문', exact: true }).fill('- 새 폴더');
  const before = await calls(page);
  await page.getByRole('button', { name: '새 폴더로 연결…' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '취소', exact: true }).click(); expect(await calls(page)).toBe(before);
  await page.getByRole('button', { name: '새 폴더로 연결…' }).click();
  await page.getByRole('button', { name: '만들어 연결' }).press('Escape'); expect(await calls(page)).toBe(before);
  await page.getByRole('button', { name: '새 폴더로 연결…' }).click();
  await page.getByRole('button', { name: '만들어 연결' }).press('Enter');
  expect((await saved(page)).binding.lineId).toBe('demo-line-1');
  await assess(page, info, 'html-folder-connected', boundary);
  await page.getByRole('button', { name: '되돌리기', exact: true }).click(); expect((await saved(page)).binding).toBeNull();
  await page.reload(); await expect(page.getByRole('textbox', { name: '원문', exact: true })).toHaveValue('- 새 폴더');
  await page.getByRole('button', { name: '조작본 자료만 초기화' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBeNull();
  await assess(page, info, 'html-reset', boundary);
});
test('HTML2 Flow search/read/download/private copy and retained private authoring draft', async ({ page }, info) => {
  const boundary = await setup(page); await page.goto('/prototype');
  await page.getByRole('navigation', { name: '주요 목적' }).getByRole('button', { name: '둘러보기' }).click();
  await page.getByRole('searchbox').fill('산책');
  await page.getByRole('button', { name: 'Flow 읽기' }).click();
  const before = await calls(page), download = page.waitForEvent('download');
  await page.getByRole('button', { name: '텍스트 받기' }).click(); expect((await download).suggestedFilename()).toBe('sample-walk.txt');
  expect(await calls(page)).toBe(before);
  await page.getByRole('button', { name: '개인 공간에 가져오기' }).click(); expect((await saved(page)).copies).toHaveLength(1);
  await page.getByRole('button', { name: '← Flow 목록' }).click(); await expect(page.getByRole('searchbox')).toHaveValue('산책');
  await assess(page, info, 'html-flow-find', boundary);
  await page.getByRole('navigation', { name: '주요 목적' }).getByRole('button', { name: '내 활동' }).click();
  await page.getByRole('textbox', { name: 'Flow 제목' }).fill('합성 비공개 초안');
  await page.getByRole('textbox', { name: '제작 원문' }).fill('- [ ] 직접 쓰기');
  await page.getByRole('navigation', { name: '주요 목적' }).getByRole('button', { name: '내 공간' }).click();
  await page.getByRole('navigation', { name: '주요 목적' }).getByRole('button', { name: '내 활동' }).click();
  await expect(page.getByRole('textbox', { name: '제작 원문' })).toHaveValue('- [ ] 직접 쓰기');
  await page.getByRole('button', { name: '비공개 초안 저장' }).click(); expect((await saved(page)).drafts).toHaveLength(1);
  await page.reload();
  await page.getByRole('navigation', { name: '주요 목적' }).getByRole('button', { name: '내 활동' }).click();
  await expect(page.getByText('합성 비공개 초안', { exact: true })).toBeVisible();
  await assess(page, info, 'html-private-creator', boundary);
});
test('HTML3 damaged payload is read-only/fail-closed until precise demo reset', async ({ page }, info) => {
  const boundary = await setup(page, true); await page.goto('/prototype');
  await expect(page.getByRole('status')).toContainText('초기화 전에는 변경하지 않습니다');
  const before = await calls(page); await page.getByRole('button', { name: '업무에 연결', exact: true }).click();
  expect(await calls(page)).toBe(before); expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{broken');
  await page.getByRole('button', { name: '조작본 자료만 초기화' }).click();
  await expect(page.getByRole('textbox', { name: '원문', exact: true })).not.toHaveAttribute('readonly');
  await assess(page, info, 'html-fail-closed', boundary);
});
test('HTML4 report hierarchy and five-width render QA, not observed user validation', async ({ page }, info) => {
  const boundary = await setup(page); await page.goto('/report');
  await expect(page.getByRole('heading', { name: '폴더 입력·Flow 진입 개선', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '직접 조작하는 HTML 열기' })).toBeVisible();
  await assess(page, info, 'html-report', boundary);
});
test('HTML5 failed raw survives navigation, hides stale proposals, then retries explicitly', async ({ page }, info) => {
  const boundary = await setup(page); await page.goto('/prototype');
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    (window as any).__failRaw = true;
    Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: function(this: Storage, name: string, value: string) {
      if ((window as any).__failRaw && name === key) throw Error('synthetic-quota');
      return original.call(this, name, value);
    } });
  }, KEY);
  await page.getByRole('textbox', { name: '원문', exact: true }).fill('- 실패 후 보존');
  await expect(page.getByRole('alert')).toContainText('저장하지 못한 원문');
  await expect(page.getByRole('complementary', { name: '폴더 연결 제안' })).toHaveCount(0);
  const before = await calls(page);
  await page.getByRole('navigation', { name: '주요 목적' }).getByRole('button', { name: '내 활동' }).click();
  await page.getByRole('navigation', { name: '주요 목적' }).getByRole('button', { name: '내 공간' }).click();
  await expect(page.getByRole('textbox', { name: '원문', exact: true })).toHaveValue('- 실패 후 보존');
  expect(await calls(page)).toBe(before);
  await page.evaluate(() => { (window as any).__failRaw = false; });
  await page.getByRole('button', { name: '다시 저장', exact: true }).click();
  expect((await saved(page)).raw).toBe('- 실패 후 보존');
  await page.getByRole('button', { name: '새 폴더로 연결…' }).click();
  await page.getByRole('button', { name: '만들어 연결' }).click();
  expect((await saved(page)).binding.lineId).toBe('demo-line-1');
  await assess(page, info, 'html-failure-recovered', boundary);
});
