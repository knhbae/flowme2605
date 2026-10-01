import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { login } from './alpha-auth.fixture';
import { folderIds, mockFolderContentEntry, publicIds, publicTitle } from './folder-content-entry.fixture';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';

const editor = (page: Page) => page.getByRole('region', { name: '개인 문서 편집', exact: true });
const area = (page: Page) => editor(page).locator('[data-native-editor="v11-core"] textarea');
const suggestion = (page: Page) => editor(page).getByRole('region', { name: '폴더 연결 제안', exact: true });
const scope = (page: Page) => page.getByRole('combobox', { name: '폴더', exact: true });
const mainNav = (page: Page) => page.getByRole('navigation', { name: '작업 공간', exact: true });
const discovery = (page: Page) => page.getByTestId('program-discovery');
const detail = (page: Page) => page.getByTestId('program-flow-detail');
const creator = (page: Page) => page.getByRole('region', { name: '제작 작업 공간', exact: true });
type Mock = Awaited<ReturnType<typeof mockFolderContentEntry>>;

async function click(target: Locator) {
  await expect(target).toBeVisible();
  await target.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await expect.poll(() => target.evaluate(element => {
    const box = element.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return box.width > 0 && box.height > 0 && box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight
      && !!hit && (hit === element || element.contains(hit));
  }), { message: 'The explicit action is fully in the viewport and not covered' }).toBe(true);
  await target.click();
}
async function boot(page: Page, options: Parameters<typeof mockFolderContentEntry>[1] = {}) {
  const mock = await mockFolderContentEntry(page, options);
  await page.goto('/alpha'); await login(page);
  const management = page.locator('details[aria-label="계정 및 자료 관리"]');
  if (await management.getAttribute('open') !== null) await click(management.locator('summary'));
  await expect(area(page)).toHaveValue(M.raw((await mock.current()).space.text.documents[0]));
  return mock;
}
async function openLibrary(page: Page) {
  await expect(page.locator('#program-library')).toBeAttached();
  if (!await scope(page).isVisible()) await click(page.getByRole('button', { name: /^문서·폴더 열기/ }));
  await expect(scope(page)).toBeVisible();
}
async function storageCalls(page: Page) {
  return page.evaluate(() => (window as unknown as { __folderContentStorage: { calls: number } }).__folderContentStorage.calls);
}
async function noChange(page: Page, mock: Mock) {
  return { account: await mock.current(), diagnostics: mock.diagnostics(), commands: mock.commands.length, storage: await storageCalls(page) };
}
async function assertNoChange(page: Page, mock: Mock, before: Awaited<ReturnType<typeof noChange>>) {
  expect(await noChange(page, mock), 'Presentation-only action adds no command, mutation or storage call').toEqual(before);
}
async function evidence(page: Page, mock: Mock, info: TestInfo, name: string) {
  const geometry = await page.evaluate(() => ({ viewport: { width: innerWidth, height: innerHeight },
    overflow: { document: document.documentElement.scrollWidth - innerWidth, body: document.body.scrollWidth - innerWidth },
    elements: [...document.querySelectorAll('h1,h2,button,input,textarea,select,summary')].filter(element => {
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    }).map(element => { const style = getComputedStyle(element), box = element.getBoundingClientRect(); return {
      tag: element.tagName, name: element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 90),
      rectangle: { x: box.x, y: box.y, width: box.width, height: box.height },
      typography: { fontSize: style.fontSize, lineHeight: style.lineHeight, fontWeight: style.fontWeight, fontFamily: style.fontFamily },
    }; }) }));
  expect(geometry.overflow.document).toBeLessThanOrEqual(1); expect(geometry.overflow.body).toBeLessThanOrEqual(1);
  const screenshot = info.outputPath(`${name}.png`); await page.screenshot({ path: screenshot, fullPage: true });
  await info.attach(name, { path: screenshot, contentType: 'image/png' });
  await info.attach(`${name}-geometry-counts`, { contentType: 'application/json', body: JSON.stringify({
    evidence: 'Desktop Chrome at synthetic viewport; not a physical device, OS Korean IME, assistive technology or observed user.',
    ...geometry, storageCalls: await storageCalls(page), commands: mock.commands.length, ...mock.diagnostics() }) });
}
async function settleRaw(page: Page, mock: Mock, raw: string) {
  await expect.poll(async () => M.raw((await mock.current()).space.text.documents[0])).toBe(raw);
  await expect(editor(page).locator(':scope > div').filter({ has: page.locator('[aria-label="문서 표시 방식"]') }).getByRole('status')).toHaveText('저장됨');
}
async function paste(page: Page, target: Locator, text: string) {
  // Only a synthetic string is written. No user's clipboard is read or copied
  // into evidence. Ctrl+V exercises the browser's native paste/input path.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://alpha.wikiplans.com' });
  await page.evaluate(value => navigator.clipboard.writeText(value), text);
  await target.focus(); await target.press('Control+v');
}
async function returnToLastLine(page: Page) { await area(page).press('Control+Home'); await area(page).press('Control+End'); }

test('F1 native typing: exact homonyms, dismiss and Escape are zero-write; explicit choice links the same ID', async ({ page }, info) => {
  const mock = await boot(page), original = await mock.current(), doc = original.space.text.documents[0];
  const lineId = doc.lines.at(-1)!.id;
  await area(page).press('Control+End'); await area(page).pressSequentially('업무');
  const raw = `${M.raw(doc)}업무`; await settleRaw(page, mock, raw);
  await expect(suggestion(page)).toBeVisible();
  await expect(suggestion(page).getByRole('button', { name: '회사 / 업무 연결', exact: true })).toBeVisible();
  await expect(suggestion(page).getByRole('button', { name: '개인 / 업무 연결', exact: true })).toBeVisible();
  const typed = await noChange(page, mock);
  expect(typed.diagnostics).toEqual({ mutations: 1, operations: 1 });
  expect(typed.account.space.text.bindings.some(binding => binding.lineId === lineId)).toBe(false);
  await evidence(page, mock, info, 'typed-homonym-suggestions');
  await click(suggestion(page).getByRole('button', { name: '제안 닫기', exact: true }));
  await expect(suggestion(page)).not.toBeVisible(); await assertNoChange(page, mock, typed);
  await returnToLastLine(page); await expect(suggestion(page)).toBeVisible();
  await area(page).press('Escape'); await expect(suggestion(page)).not.toBeVisible(); await assertNoChange(page, mock, typed);
  await returnToLastLine(page); await click(suggestion(page).getByRole('button', { name: '개인 / 업무 연결', exact: true }));
  await expect.poll(async () => (await mock.current()).space.text.bindings.find(binding => binding.lineId === lineId))
    .toEqual({ kind: 'scope', docId: doc.id, lineId, scopeId: folderIds.homonym });
  const linked = await mock.current();
  expect(linked.space.text.documents[0].lines).toEqual(typed.account.space.text.documents[0].lines);
  expect(linked.space.text.folders).toEqual(original.space.text.folders);
  expect(linked.space.text.taskScopes).toEqual(original.space.text.taskScopes);
  expect(linked.space.text.itemScopes).toEqual(original.space.text.itemScopes);
  expect(linked.space.text.progressRecords).toEqual(original.space.text.progressRecords);
  expect(mock.commands).toHaveLength(typed.commands + 1);
  expect(mock.diagnostics()).toEqual({ mutations: 2, operations: 2 });
  await evidence(page, mock, info, 'explicit-existing-link'); await mock.assertBoundary(info);
});

test('F2 native paste: unknown name opens prefilled existing panel; close/Escape cancel without command; confirmation creates same-row folder', async ({ page }, info) => {
  const mock = await boot(page), original = await mock.current(), doc = original.space.text.documents[0], lineId = doc.lines.at(-1)!.id;
  await area(page).press('Control+End'); await paste(page, area(page), '새 프로젝트');
  const raw = `${M.raw(doc)}새 프로젝트`; await settleRaw(page, mock, raw);
  await expect(suggestion(page).getByRole('button', { name: '새 폴더로 연결…', exact: true })).toBeVisible();
  const typed = await noChange(page, mock), dialog = page.getByRole('dialog', { name: '폴더 연결', exact: true });
  for (const mode of ['close', 'Escape'] as const) {
    await returnToLastLine(page); await click(suggestion(page).getByRole('button', { name: '새 폴더로 연결…', exact: true }));
    await expect(dialog).toBeVisible(); await expect(dialog.getByLabel('새 폴더 이름', { exact: true })).toHaveValue('새 프로젝트');
    await expect(dialog).toContainText('생성 위치: 최상위');
    await evidence(page, mock, info, `new-folder-panel-${mode}`); await assertNoChange(page, mock, typed);
    if (mode === 'close') await click(dialog.getByRole('button', { name: '닫기', exact: true })); else await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible(); await expect(area(page)).toHaveValue(raw); await assertNoChange(page, mock, typed);
  }
  await returnToLastLine(page); await click(suggestion(page).getByRole('button', { name: '새 폴더로 연결…', exact: true }));
  await dialog.getByLabel('새 폴더 이름', { exact: true }).fill('원문과 다른 이름');
  await click(dialog.getByRole('button', { name: '만들어 연결', exact: true }));
  await expect(dialog.getByRole('alert')).toHaveText('원문을 바꾸는 연결은 적용하지 않았습니다. 현재 입력을 유지했습니다.');
  await expect(area(page)).toHaveValue(raw); await assertNoChange(page, mock, typed);
  await evidence(page, mock, info, 'source-changing-proposal-rejected');
  await dialog.getByLabel('새 폴더 이름', { exact: true }).fill('새 프로젝트');
  await click(dialog.getByRole('button', { name: '만들어 연결', exact: true }));
  await expect(dialog).not.toBeVisible();
  await expect.poll(async () => (await mock.current()).space.text.folders.filter(folder => folder.title === '새 프로젝트').length).toBe(1);
  const saved = await mock.current(), folder = saved.space.text.folders.find(row => row.title === '새 프로젝트')!;
  expect(saved.space.text.bindings.find(binding => binding.lineId === lineId)).toEqual({ kind: 'scope', docId: doc.id, lineId, scopeId: folder.id });
  expect(saved.space.text.documents[0].lines).toEqual(typed.account.space.text.documents[0].lines);
  expect(saved.space.text.taskScopes).toEqual(original.space.text.taskScopes); expect(saved.space.text.progressRecords).toEqual(original.space.text.progressRecords);
  expect(mock.commands).toHaveLength(typed.commands + 1); expect(mock.diagnostics()).toEqual({ mutations: 2, operations: 2 });
  await page.reload(); await expect(area(page)).toHaveValue(raw); expect((await mock.current()).space.text).toEqual(saved.space.text);
  await evidence(page, mock, info, 'new-folder-reload'); await mock.assertBoundary(info);
});

test('F6 noncanonical whitespace remains exact plain input without a folder proposal through save and reload', async ({ page }, info) => {
  const mock = await boot(page), original = await mock.current(), doc = original.space.text.documents[0];
  await area(page).press('Control+End'); await paste(page, area(page), ' 새 프로젝트  ');
  const raw = `${M.raw(doc)} 새 프로젝트  `; await settleRaw(page, mock, raw);
  await expect(suggestion(page)).not.toBeVisible();
  const saved = await noChange(page, mock);
  expect(saved.account.space.text.folders).toEqual(original.space.text.folders);
  expect(saved.account.space.text.bindings).toEqual(original.space.text.bindings);
  await returnToLastLine(page); await expect(suggestion(page)).not.toBeVisible(); await assertNoChange(page, mock, saved);
  await page.reload(); await expect(area(page)).toHaveValue(raw);
  expect((await mock.current()).space.text).toEqual(saved.account.space.text);
  await evidence(page, mock, info, 'noncanonical-input-preserved'); await mock.assertBoundary(info);
});

test('F3 pasted exact name: rejected save retains input, explicit retry then link and Undo preserve source IDs through reload', async ({ page }, info) => {
  const mock = await boot(page), before = await mock.current(), doc = before.space.text.documents[0], lineId = doc.lines.at(-1)!.id;
  mock.state.rejectNextExecute = 'limit';
  await area(page).press('Control+End'); await paste(page, area(page), '업무');
  const raw = `${M.raw(doc)}업무`;
  await expect(editor(page).getByRole('button', { name: '다시 저장', exact: true })).toBeVisible();
  await expect(area(page)).toHaveValue(raw); expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual({ mutations: 0, operations: 0 });
  await evidence(page, mock, info, 'rejected-input-preserved');
  await click(editor(page).getByRole('button', { name: '다시 저장', exact: true })); await settleRaw(page, mock, raw);
  const savedInput = await mock.current(); await returnToLastLine(page);
  await click(suggestion(page).getByRole('button', { name: '회사 / 업무 연결', exact: true }));
  await expect.poll(async () => (await mock.current()).space.text.bindings.some(binding => binding.lineId === lineId)).toBe(true);
  await click(page.getByRole('region', { name: '서버 저장 상태', exact: true }).getByRole('button', { name: '되돌리기', exact: true }));
  await expect.poll(async () => (await mock.current()).space.text).toEqual(savedInput.space.text);
  expect((await mock.current()).space.text.documents[0].lines.map(line => line.id)).toEqual(doc.lines.map(line => line.id));
  expect(mock.commands.map(command => command.expectedRevision)).toEqual([0, 0, 1, 2]);
  expect(mock.commands.at(-1)?.kind).toBe('undo-private'); expect(mock.diagnostics()).toEqual({ mutations: 3, operations: 3 });
  await page.reload(); await expect(area(page)).toHaveValue(raw);
  expect((await mock.current()).space.text).toEqual(savedInput.space.text);
  await evidence(page, mock, info, 'undo-reload-same-source'); await mock.assertBoundary(info);
});

test('F4 explicit new-folder link rejection preserves same-row raw; retry and Undo remain one confirmed transaction each', async ({ page }, info) => {
  const mock = await boot(page), initial = await mock.current(), doc = initial.space.text.documents[0], lineId = doc.lines.at(-1)!.id;
  await area(page).press('Control+End'); await area(page).pressSequentially('실패 복구 폴더');
  const raw = `${M.raw(doc)}실패 복구 폴더`; await settleRaw(page, mock, raw);
  const typed = await mock.current(), before = mock.diagnostics();
  await click(suggestion(page).getByRole('button', { name: '새 폴더로 연결…', exact: true }));
  const dialog = page.getByRole('dialog', { name: '폴더 연결', exact: true });
  mock.state.rejectNextExecute = 'limit'; await click(dialog.getByRole('button', { name: '만들어 연결', exact: true }));
  await expect(dialog).not.toBeVisible(); await expect(editor(page).getByRole('button', { name: '다시 저장', exact: true })).toBeVisible();
  await expect(area(page)).toHaveValue(raw); expect(await mock.current()).toEqual(typed); expect(mock.diagnostics()).toEqual(before);
  await expect(suggestion(page)).toHaveCount(0); await evidence(page, mock, info, 'explicit-new-link-rejected');
  await click(editor(page).getByRole('button', { name: '다시 저장', exact: true }));
  await expect.poll(async () => (await mock.current()).space.text.folders.some(folder => folder.title === '실패 복구 폴더')).toBe(true);
  const linked = await mock.current(), folder = linked.space.text.folders.find(row => row.title === '실패 복구 폴더')!;
  expect(linked.space.text.bindings.find(binding => binding.lineId === lineId)).toEqual({ kind: 'scope', docId: doc.id, lineId, scopeId: folder.id });
  expect(linked.space.text.documents[0].lines).toEqual(typed.space.text.documents[0].lines);
  expect(mock.diagnostics()).toEqual({ mutations: before.mutations + 1, operations: before.operations + 1 });
  await click(page.getByRole('region', { name: '서버 저장 상태', exact: true }).getByRole('button', { name: '되돌리기', exact: true }));
  await expect.poll(async () => (await mock.current()).space.text).toEqual(typed.space.text);
  expect(mock.commands.map(command => command.expectedRevision)).toEqual([0, 1, 1, 2]);
  expect(mock.diagnostics()).toEqual({ mutations: before.mutations + 2, operations: before.operations + 2 });
  await page.reload(); await expect(area(page)).toHaveValue(raw); expect((await mock.current()).space.text).toEqual(typed.space.text);
  await evidence(page, mock, info, 'explicit-new-link-undo-reload'); await mock.assertBoundary(info);
});

test('F5 partial view and synthetic IME do not offer a folder link; composition retains raw until end', async ({ page }, info) => {
  const mock = await boot(page), before = await mock.current();
  await openLibrary(page); const viewOnly = await noChange(page, mock);
  await scope(page).selectOption(folderIds.work);
  const regional = editor(page).getByRole('textbox', { name: /^폴더 영역 \d+ 원문$/ }).first();
  await expect(regional).toBeVisible(); await regional.press('Control+End'); await expect(suggestion(page)).toHaveCount(0);
  await assertNoChange(page, mock, viewOnly); await evidence(page, mock, info, 'partial-folder-suggestion-blocked');
  await click(editor(page).getByRole('button', { name: '전체 문서 보기', exact: true }));
  await expect(area(page)).toHaveValue(M.raw(before.space.text.documents[0]));
  await area(page).press('Control+End'); await area(page).dispatchEvent('compositionstart', { data: '' });
  await area(page).pressSequentially('업무'); const raw = `${M.raw(before.space.text.documents[0])}업무`;
  await expect(area(page)).toHaveValue(raw); await expect(suggestion(page)).toHaveCount(0);
  await expect.poll(() => mock.commands.length).toBe(0); expect(await mock.current()).toEqual(before);
  await evidence(page, mock, info, 'synthetic-composition-blocked');
  await area(page).dispatchEvent('compositionend', { data: '업무' }); await settleRaw(page, mock, raw);
  await returnToLastLine(page); await expect(suggestion(page)).toBeVisible();
  await area(page).press('Shift+Home'); await expect(suggestion(page)).toHaveCount(0);
  expect((await mock.current()).space.text.bindings).toEqual(before.space.text.bindings);
  await mock.assertBoundary(info);
});

test('C1 empty catalog: Browse starts Flow discovery and existing empty URL submit reveals manual source input without saving', async ({ page }, info) => {
  const mock = await boot(page), before = await noChange(page, mock);
  await click(mainNav(page).getByRole('button', { name: '둘러보기', exact: true }));
  await expect(page).toHaveURL(/#flowme\/discover$/); await expect(discovery(page).getByRole('heading', { name: 'Flow 찾기', exact: true })).toBeVisible();
  await expect(discovery(page).getByRole('heading', { name: '아직 공개된 Flow가 없어요', exact: true })).toBeVisible();
  await expect(discovery(page).getByRole('button', { name: '검색 조건 지우기', exact: true })).toHaveCount(0);
  expect(await page.getByRole('navigation', { name: '둘러보기 종류', exact: true }).getByRole('button').allTextContents()).toEqual(['Flow 찾기', '경험·질문·지식']);
  await expect(discovery(page)).toContainText('공개된 Flow 목록입니다. 개인 사본·실행 기록·비공개 제작 초안은 포함되지 않습니다.');
  await evidence(page, mock, info, 'empty-public-discovery');
  await click(discovery(page).locator('summary').filter({ hasText: /^공개 URL에서 시작$/ }));
  await expect(discovery(page).getByLabel('확인할 원문', { exact: true })).toHaveCount(0);
  await click(discovery(page).getByRole('button', { name: '등록된 출처 확인', exact: true }));
  await expect(discovery(page).getByLabel('확인할 원문', { exact: true })).toBeVisible();
  await expect(discovery(page).getByRole('alert')).toContainText('공개 HTTP(S) 주소를 확인해 주세요.');
  await assertNoChange(page, mock, before); await evidence(page, mock, info, 'empty-url-manual-source-reveal'); await mock.assertBoundary(info);
});

for (const community of [false, true]) test(`C2 Browse with community=${community}: read/output exact-version return is zero mutation; private use preserves public source`, async ({ page }, info) => {
  const mock = await boot(page, { catalog: true, community }), before = await noChange(page, mock);
  await click(mainNav(page).getByRole('button', { name: '둘러보기', exact: true }));
  await expect(page).toHaveURL(/#flowme\/discover$/);
  await expect(page.getByRole('navigation', { name: '둘러보기 종류', exact: true }).getByRole('button', { name: 'Flow 찾기', exact: true })).toHaveAttribute('aria-current', 'page');
  await discovery(page).getByLabel('공개 Flow 검색', { exact: true }).fill('합성 공개');
  await click(discovery(page).getByRole('button', { name: publicTitle, exact: true }));
  await expect(detail(page).getByRole('heading', { name: publicTitle, exact: true })).toBeVisible();
  if (community) await expect(detail(page)).toContainText('공개 글'); else await expect(detail(page)).toContainText('경험을 쓰지 않아도 이 Flow를 사용할 수 있습니다.');
  const policy = detail(page).locator('summary').filter({ hasText: /^적용 범위와 주의사항$/ }); await click(policy);
  await expect(detail(page)).toContainText('개인 사본과 실행 기록은 따로 보관됩니다.');
  await evidence(page, mock, info, `public-read-community-${community}`);
  const download = page.waitForEvent('download'); await click(detail(page).getByRole('button', { name: 'TXT 파일 받기', exact: true }));
  const file = await download, stream = await file.createReadStream(); expect(stream).not.toBeNull();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const payload = Buffer.concat(chunks).toString('utf8'), returnUrl = payload.match(/https:\/\/alpha\.wikiplans\.com\/alpha#flowme\/[^\s]+/)?.[0];
  expect(payload).toContain('합성 공개 준비 항목'); expect(returnUrl).toBeTruthy();
  await assertNoChange(page, mock, before);
  await page.goto(returnUrl!); await expect(detail(page)).toContainText('출력한 공개 판본의 같은 항목으로 돌아왔습니다.');
  await expect(detail(page).getByRole('combobox', { name: '읽는 판본', exact: true })).toHaveValue(publicIds.version);
  await expect(page.locator(`[id="program-public-item-${publicIds.version}-${publicIds.item}"]`)).toHaveAttribute('aria-current', 'location');
  expect(await mock.current()).toEqual(before.account); expect(mock.commands).toHaveLength(0); expect(mock.diagnostics()).toEqual(before.diagnostics);
  await evidence(page, mock, info, `output-version-return-community-${community}`);
  await click(detail(page).getByRole('button', { name: '← Flow 목록', exact: true }));
  await expect(discovery(page).getByRole('heading', { name: 'Flow 찾기', exact: true })).toBeVisible();
  await click(discovery(page).getByRole('button', { name: publicTitle, exact: true }));
  await click(detail(page).getByRole('button', { name: '내 문서에 가져오기', exact: true }));
  await expect.poll(async () => (await mock.current()).space.copies.length).toBe(1);
  const imported = await mock.current(), copy = imported.space.copies[0];
  expect(copy.baseVersionId).toBe(publicIds.version); expect(copy.includedItemIds).toEqual([publicIds.item]);
  expect(copy.itemLines[publicIds.item]).toBeTruthy(); expect(mock.commands).toHaveLength(1);
  expect(mock.commands[0].kind).toBe('social'); expect(mock.diagnostics()).toEqual({ mutations: 1, operations: 1 });
  await expect(area(page)).toBeVisible();
  await expect.poll(() => area(page).inputValue()).toContain('합성 공개 준비 항목');
  await evidence(page, mock, info, `private-copy-community-${community}`); await mock.assertBoundary(info);
});

test('C3 discovery Flow creation entry is zero-write; Creator private create/edit/save/activity navigation stays separate', async ({ page }, info) => {
  const mock = await boot(page, { catalog: true, holdFirstCreatorSaveReceipt: true }), initial = await mock.current();
  const entry = await noChange(page, mock);
  await click(mainNav(page).getByRole('button', { name: '둘러보기', exact: true }));
  await click(discovery(page).getByRole('button', { name: 'Flow 만들기', exact: true }));
  await expect(page).toHaveURL(/#flowme\/creator$/); await expect(creator(page)).toBeVisible();
  await assertNoChange(page, mock, entry);
  await expect(page.getByRole('region', { name: '기존 Flow 콘텐츠', exact: true })).toContainText('콘텐츠를 확인하지 못했습니다.');
  await evidence(page, mock, info, 'creator-entry-empty');
  await click(creator(page).getByRole('button', { name: '빈 제작 원문 만들기', exact: true }).filter({ visible: true }));
  await expect(creator(page).getByLabel('제작 초안 제목', { exact: true })).toBeVisible();
  await creator(page).getByLabel('제작 초안 제목', { exact: true }).fill('합성 비공개 제작');
  const raw = '# 합성 비공개 제작\n## 준비\n- [ ] 첫 제작 작업';
  const source = creator(page).getByRole('textbox', { name: '제작 원문', exact: true });
  await source.fill(raw); await click(creator(page).getByRole('button', { name: '제작 초안 저장', exact: true }));
  try {
    await expect.poll(async () => Object.values((await mock.current()).space.creatorWorkspace?.library.records ?? {}).some(record => record.title === '합성 비공개 제작' && record.rawText === raw)).toBe(true);
    await expect(creator(page)).toHaveAttribute('aria-busy', 'true');
    await expect(source).not.toBeEditable();
    await expect(source).toHaveValue(raw);
  } finally { mock.releaseHeldCreatorSaveReceipt(); }
  await expect(creator(page)).toHaveAttribute('aria-busy', 'false');
  await expect(source).toBeEditable();
  await expect(source).toHaveValue(raw);
  const saved = await mock.current(), draftId = saved.space.creatorWorkspace!.working!.draftId;
  await source.press('Control+End'); await source.pressSequentially(' 수정');
  await expect(source).toHaveValue(`${raw} 수정`);
  await click(creator(page).getByRole('button', { name: '제작 초안 저장', exact: true }));
  await expect.poll(async () => (await mock.current()).space.creatorWorkspace?.library.records[draftId]?.rawText).toBe(`${raw} 수정`);
  const edited = await mock.current(), record = edited.space.creatorWorkspace!.library.records[draftId];
  expect(record.recordRevision).toBe(saved.space.creatorWorkspace!.library.records[draftId].recordRevision + 1);
  expect(edited.space.text).toEqual(initial.space.text); expect(edited.space.copies).toEqual(initial.space.copies);
  expect(mock.commands.every(command => command.kind === 'creator' && ['working', 'library-action'].includes(command.intent.type))).toBe(true);
  await evidence(page, mock, info, 'creator-private-edited'); const beforeBrowse = await noChange(page, mock);
  await click(mainNav(page).getByRole('button', { name: '둘러보기', exact: true }));
  await expect(discovery(page).getByRole('button', { name: publicTitle, exact: true })).toBeVisible();
  await expect(discovery(page).getByRole('button', { name: '합성 비공개 제작', exact: true })).toHaveCount(0);
  await assertNoChange(page, mock, beforeBrowse);
  await click(mainNav(page).getByRole('button', { name: '내 활동', exact: true }));
  await click(page.getByRole('navigation', { name: '내 활동 종류', exact: true }).getByRole('button', { name: 'Flow 만들기', exact: true }));
  await expect(source).toHaveValue(`${raw} 수정`); await assertNoChange(page, mock, beforeBrowse);
  await page.reload(); await expect(source).toHaveValue(`${raw} 수정`);
  expect((await mock.current()).space.creatorWorkspace).toEqual(edited.space.creatorWorkspace);
  await evidence(page, mock, info, 'creator-private-reload'); await mock.assertBoundary(info);
});
