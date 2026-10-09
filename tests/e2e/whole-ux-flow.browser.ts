import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { login } from './alpha-auth.fixture';
import { mockFolderContentEntry, publicIds, publicTitle } from './folder-content-entry.fixture';
import { RELEASE_ORIGIN } from './cloudflare-release.fixture';
import { loadUxExactBuild, assertUxObservedAssets, type UxExactBuild } from './ux-exact-build';
import { programLocation } from '../../lib/flow/integrated-poc/navigation';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';

// Authoring this file does not run it. The main-owned runner supplies the exact
// candidate manifest and serves only its self-owned fixed local QA3107 bundle.
if ((process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local') !== 'local'
  || process.env.FLOWME_CLOUDFLARE_QA_LOCAL_PORT !== '3107') throw Error('whole-ux-flow-local-3107-only');
let exactBuild: UxExactBuild;
test.beforeAll(() => {
  exactBuild = loadUxExactBuild(process.env);
  expect(exactBuild.qaInputs.some(file => file.path === 'tests/e2e/whole-ux-flow.browser.ts'),
    'The frozen QA manifest includes this authored test').toBe(true);
});

type Mock = Awaited<ReturnType<typeof mockFolderContentEntry>>;
const globalNav = (page: Page) => page.getByRole('navigation', { name: '주요 메뉴', exact: true });
const discovery = (page: Page) => page.getByTestId('program-discovery');
const intro = (page: Page) => page.getByTestId('program-flow-intro');
const detail = (page: Page) => page.getByTestId('program-flow-detail');
const area = (page: Page) => page.locator('[data-program-document]:not([hidden]) [data-native-editor="v11-core"] textarea');

async function action(target: Locator, input: 'pointer' | 'keyboard' = 'pointer') {
  await expect(target).toBeVisible(); await expect(target).toBeEnabled();
  await target.scrollIntoViewIfNeeded();
  await target.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await expect.poll(() => target.evaluate(node => {
    const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return box.width > 0 && box.height > 0 && box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight
      && !!hit && (hit === node || node.contains(hit));
  }), { message: 'The real action is within the viewport and not covered' }).toBe(true);
  if (input === 'keyboard') { await target.focus(); await expect(target).toBeFocused(); await target.press('Enter'); }
  else await target.click();
}
async function boot(page: Page) {
  const mock = await mockFolderContentEntry(page, { catalog: true, community: true });
  // This shared fixture has exactly ONE synthetic public Item. It is not the
  // six-item meeting content, a real account, real-device QA or a user trial.
  expect(mock.context.public.versions).toHaveLength(1);
  expect(mock.context.public.versions[0].items).toHaveLength(1);
  await page.goto('/alpha'); expect(await page.content()).toContain(exactBuild.buildId);
  await login(page);
  const management = page.locator('details[aria-label="계정 및 자료 관리"]');
  if (await management.getAttribute('open') !== null) await action(management.locator(':scope > summary'), 'keyboard');
  await expect(globalNav(page)).toBeVisible(); await expect(area(page)).toBeVisible();
  return mock;
}
async function readingState(mock: Mock) {
  return { account: await mock.current(), commands: structuredClone(mock.commands), diagnostics: mock.diagnostics() };
}
async function noWrite(mock: Mock, before: Awaited<ReturnType<typeof readingState>>) {
  expect(await readingState(mock), 'Reading/navigation preserves all source, personal and execution bytes').toEqual(before);
}
async function openFlow(page: Page) {
  await action(globalNav(page).getByRole('button', { name: 'Flow', exact: true }), 'keyboard');
  await expect(page).toHaveURL(/#flowme\/discover$/);
  await action(discovery(page).getByRole('button', { name: publicTitle, exact: true }));
  await expect(intro(page).getByRole('heading', { name: publicTitle, exact: true })).toBeVisible();
}
async function confirmStart(page: Page) {
  await action(intro(page).getByRole('button', { name: '내 계획으로 시작', exact: true }), 'keyboard');
  await expect(detail(page).getByRole('region', { name: '시작 확인', exact: true })).toBeVisible();
  return detail(page).getByRole('button', { name: '전체 항목으로 시작', exact: true });
}
async function screenshot(page: Page, info: TestInfo, name: 'flow-intro' | 'resume') {
  const file = info.outputPath(`${name}.png`); await page.screenshot({ path: file, fullPage: true });
  await info.attach(`${name}.png`, { path: file, contentType: 'image/png' });
}
async function boundary(page: Page, mock: Mock, info: TestInfo) {
  // Finish intercepted GET responses before Playwright disposes the isolated
  // context. This is harness drain, not product readiness or save proof.
  await page.waitForLoadState('networkidle');
  await mock.assertBoundary(info);
  const attachment = info.attachments.find(item => item.name === 'release-boundary');
  expect(attachment?.body, 'The existing fixed-origin guard produced its receipt').toBeTruthy();
  const guard = JSON.parse(attachment!.body!.toString('utf8')) as {
    mode: string; assets: { path: string; sha256: string }[]; realApiRequests: number; forwardedSupabaseRequests: number;
  };
  expect(guard.mode).toBe('local'); expect(guard.realApiRequests).toBe(0); expect(guard.forwardedSupabaseRequests).toBe(0);
  assertUxObservedAssets(exactBuild, guard.assets);
  await info.attach('whole-ux-local-synthetic-guard', { contentType: 'application/json', body: JSON.stringify({
    evidence: 'Actual manifest-bound candidate assets; intercepted synthetic Auth/social/CAS. Not six-item meeting content, live Alpha, physical device, OS IME or observed-user validation.',
    mode: 'local', localPort: 3107, head: exactBuild.head, buildId: exactBuild.buildId,
    publicFixtureItems: 1, publicFixtureTitle: publicTitle, realApiRequests: 0, forwardedSupabaseRequests: 0,
    commands: mock.commands.length, ...mock.diagnostics(), observedAssetsMatchManifest: true,
  }) });
  // Product assertions are finished. Deny NEW requests at the page layer,
  // then drain the context's already-running static proxy before it closes.
  // Never unroute into live networking and never swallow route errors.
  await page.route('**/*', route => route.abort('blockedbyclient'));
  await page.context().unrouteAll({ behavior: 'wait' });
}

test('Flow global entry: exact introduction, zero-copy reading, explicit whole start and same-copy resume; supplementary paths stay separate', async ({ page }, info) => {
  const mock = await boot(page), before = await readingState(mock), version = mock.context.public.versions[0];
  await action(globalNav(page).getByRole('button', { name: 'Flow', exact: true }), 'keyboard');
  await expect(discovery(page).getByLabel('공개 Flow 검색', { exact: true })).toBeVisible();
  await discovery(page).getByLabel('공개 Flow 검색', { exact: true }).fill('합성 공개');
  const row = discovery(page).locator('article').filter({ has: page.getByRole('button', { name: publicTitle, exact: true }) });
  await expect(row).toContainText(`${version.items.length}개 항목 · 판본 ${version.number}`);
  await expect(row).toContainText(`출처: ${version.source.label}`);
  await action(row.getByRole('button', { name: publicTitle, exact: true }));
  await expect(intro(page).getByRole('heading', { name: '첫 행동', exact: true })).toBeVisible();
  await expect(intro(page).getByText(version.items[0].title, { exact: true })).toBeVisible();
  await expect(intro(page).getByText('첫 행동 완료 기준', { exact: true }).locator('..')).toContainText(version.items[0].completionCriteria);
  await expect(intro(page)).toContainText(`출처: ${version.source.label}`);
  const full = intro(page).locator('details').filter({ has: page.locator('summary').filter({ hasText: /^소개 전체 읽기$/ }) });
  await expect(full).not.toHaveAttribute('open', '');
  await action(full.locator(':scope > summary'), 'keyboard'); await expect(full).toHaveAttribute('open', '');
  expect(await full.locator(':scope > p').first().textContent()).toBe(version.summary);
  await screenshot(page, info, 'flow-intro'); await noWrite(mock, before);
  await action(intro(page).getByRole('button', { name: '내용 살펴보기', exact: true }), 'keyboard');
  await expect(detail(page).getByRole('heading', { name: /^전체 내용/ })).toBeVisible();
  await expect(detail(page).getByRole('checkbox')).toHaveCount(0);
  await expect(detail(page).getByRole('button', { name: '전체 항목으로 시작', exact: true })).toHaveCount(0);
  await action(detail(page).locator('summary').filter({ hasText: /^방법과 완료 기준$/ }), 'keyboard');
  await expect(detail(page).getByText(version.items[0].description, { exact: true })).toBeVisible();
  await noWrite(mock, before); expect((await mock.current()).space.copies).toHaveLength(0);
  await action(detail(page).getByRole('button', { name: '내 계획으로 시작', exact: true }));
  await noWrite(mock, before);
  await action(detail(page).getByRole('button', { name: '취소', exact: true }), 'keyboard'); await noWrite(mock, before);
  await action(await confirmStart(page), 'keyboard');
  await expect.poll(async () => (await mock.current()).space.copies.length).toBe(1);
  const imported = await mock.current(), copy = imported.space.copies[0], document = M.getDocument(imported.space.text, copy.documentId)!;
  expect(copy.flowId).toBe(publicIds.flow); expect(copy.baseVersionId).toBe(publicIds.version);
  expect(copy.includedItemIds).toEqual([publicIds.item]); expect(copy.itemLines[publicIds.item]).toBeTruthy();
  expect(mock.commands).toHaveLength(1); expect(mock.commands[0].kind).toBe('social');
  await expect(page).toHaveURL(new RegExp(`#flowme/space/${copy.documentId}$`)); await expect(area(page)).toHaveValue(M.raw(document));
  const saved = await readingState(mock); await openFlow(page);
  await expect(intro(page).getByRole('button', { name: '내 계획으로 시작', exact: true })).toHaveCount(0);
  await action(intro(page).getByTestId('program-existing-copy-return'), 'keyboard');
  await expect(page).toHaveURL(new RegExp(`#flowme/space/${copy.documentId}$`)); await expect(area(page)).toHaveValue(M.raw(document));
  await noWrite(mock, saved); await screenshot(page, info, 'resume');
  await action(globalNav(page).getByRole('button', { name: '이야기', exact: true }), 'keyboard');
  const story = page.getByRole('region', { name: '이야기', exact: true });
  await expect(story.getByLabel('이야기 검색', { exact: true })).toBeVisible();
  await expect(story.getByRole('combobox', { name: '종류', exact: true })).toContainText('질문');
  await expect(story.getByRole('combobox', { name: '종류', exact: true })).toContainText('경험');
  await expect(story.getByRole('combobox', { name: '종류', exact: true })).toContainText('지식');
  await action(globalNav(page).getByRole('button', { name: 'Flow', exact: true }));
  await expect(discovery(page).getByLabel('공개 Flow 검색', { exact: true })).toHaveValue('합성 공개');
  await action(discovery(page).getByRole('navigation', { name: 'Flow 보조 메뉴', exact: true }).getByRole('button', { name: '내 활동', exact: true }), 'keyboard');
  await expect(page.getByRole('region', { name: '내 활동', exact: true })).toBeVisible(); await noWrite(mock, saved);
  await action(globalNav(page).getByRole('button', { name: 'Flow', exact: true }));
  await action(discovery(page).getByRole('button', { name: 'Flow 만들기', exact: true }), 'keyboard');
  const choice = page.getByRole('region', { name: 'Flow 만들기 선택', exact: true });
  await expect(choice.getByRole('button', { name: '새 Flow 만들기', exact: true })).toBeVisible();
  await expect(choice.getByRole('button', { name: '다른 초안 찾기', exact: true })).toBeVisible();
  await noWrite(mock, saved); await action(choice.getByRole('button', { name: '취소', exact: true }), 'keyboard');
  await expect(discovery(page)).toBeVisible(); await noWrite(mock, saved); await boundary(page, mock, info);
});

test('copy rejection preserves exact public/context input, never auto-retries; safe recovery precedes an explicit new confirmation', async ({ page }, info) => {
  const mock = await boot(page), original = await mock.current();
  await action(globalNav(page).getByRole('button', { name: 'Flow', exact: true }));
  const search = discovery(page).getByLabel('공개 Flow 검색', { exact: true }); await search.fill('합성 공개');
  await action(discovery(page).getByRole('button', { name: publicTitle, exact: true }));
  const final = await confirmStart(page); mock.state.rejectNextExecute = 'limit'; await action(final);
  await expect(detail(page).getByRole('alert')).toContainText('입력과 선택은 유지됩니다. 다시 시도해 주세요.');
  expect(await mock.current()).toEqual(original); expect(mock.commands).toHaveLength(1);
  expect(mock.diagnostics()).toEqual({ mutations: 0, operations: 0 }); await expect(page).toHaveURL(/#flowme\/flow\/entry-public-flow$/);
  // copy-import has no generic immediate-retry exception. The existing
  // controller must still reject an unresolved draft, not silently queue it.
  await action(detail(page).getByRole('button', { name: '전체 항목으로 시작', exact: true }), 'keyboard');
  await expect(detail(page).getByRole('alert')).toContainText('입력과 선택은 유지됩니다.');
  expect(mock.commands).toHaveLength(1); expect(await mock.current()).toEqual(original);
  const recovery = page.getByRole('region', { name: '다른 기기 변경과 입력 보호', exact: true });
  await action(recovery.getByRole('button', { name: '입력 보관 후 최신 내용 열기', exact: true }), 'keyboard');
  await expect(intro(page)).toBeVisible(); expect(mock.commands).toHaveLength(1); expect(await mock.current()).toEqual(original);
  await action(globalNav(page).getByRole('button', { name: 'Flow', exact: true }));
  await expect(search).toHaveValue('합성 공개'); await action(discovery(page).getByRole('button', { name: publicTitle, exact: true }));
  await action(await confirmStart(page), 'keyboard');
  await expect.poll(async () => (await mock.current()).space.copies.length).toBe(1);
  expect(mock.commands).toHaveLength(2); expect(mock.diagnostics()).toEqual({ mutations: 1, operations: 1 });
  const attempts = mock.commands.filter(command => command.kind === 'social'); expect(attempts).toHaveLength(2);
  if (attempts[0].kind !== 'social' || attempts[1].kind !== 'social') throw Error('copy-attempt-contract');
  expect(attempts[1].intent).toEqual(attempts[0].intent); expect(attempts[1].requestId).not.toBe(attempts[0].requestId);
  await boundary(page, mock, info);
});

test('archived same-copy resume is read-only; missing Flow/version links remain fail-closed without substitution or import', async ({ page }, info) => {
  const mock = await boot(page); await openFlow(page); await action(await confirmStart(page));
  await expect.poll(async () => (await mock.current()).space.copies.length).toBe(1);
  const copy = (await mock.current()).space.copies[0]; await expect(area(page)).toBeVisible();
  await action(page.locator('summary[aria-label="현재 글 작업"]'), 'keyboard');
  await action(page.getByRole('button', { name: '문서 보관', exact: true }));
  await expect.poll(async () => (await mock.current()).space.archivedDocumentIds.includes(copy.documentId)).toBe(true);
  const archived = await readingState(mock); await openFlow(page);
  await expect(intro(page)).toContainText('보관한 내 문서를 읽기 전용으로 엽니다.');
  await expect(intro(page).getByRole('button', { name: '내 계획으로 시작', exact: true })).toHaveCount(0);
  await action(intro(page).getByTestId('program-existing-copy-return'), 'keyboard');
  await expect(page).toHaveURL(new RegExp(`#flowme/space/${copy.documentId}$`)); await expect(area(page)).not.toBeEditable();
  await noWrite(mock, archived);
  for (const destination of [{ view: 'flow' as const, id: publicIds.flow, versionId: 'missing-public-version' },
    { view: 'flow' as const, id: 'missing-public-flow' }]) {
    await page.goto(`${RELEASE_ORIGIN}/alpha${programLocation(destination)}`);
    await expect(page.getByRole('heading', { name: '이 Flow를 찾을 수 없습니다', exact: true })).toBeVisible();
    await expect(intro(page)).toHaveCount(0); await expect(detail(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: '전체 항목으로 시작', exact: true })).toHaveCount(0);
    await noWrite(mock, archived);
  }
  await boundary(page, mock, info);
});
