import { test, expect, type Locator } from '@playwright/test';
import { login } from './alpha-auth.fixture';
import { mockFolderContentEntry } from './folder-content-entry.fixture';
import { buildCatalogLibrarySnapshot } from '../../lib/flow/integrated-poc/catalog-library-source';
import { buildCatalogContent } from '../../lib/flow/integrated-poc/catalog-content-source';
import { canonicalJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { isAlphaCreatorCommand } from '../../lib/flow/integrated-poc/alpha-creator/contract';
import { loadUxExactBuild, assertUxObservedAssets } from './ux-exact-build';

if (process.env.FLOWME_CLOUDFLARE_QA_MODE !== 'local' || process.env.FLOWME_CLOUDFLARE_QA_LOCAL_PORT !== '3107')
  throw Error('single-source-fixed-local-only');
async function keyboard(button: Locator) {
  await expect(button).toBeVisible(); await expect(button).toBeEnabled();
  await button.focus(); await expect(button).toBeFocused(); await button.press('Enter');
}

for (const reject of [false, true]) test(`unstored single-source intake preserves cancel, same draft or rejected state: reject=${reject}`, async ({ page }, info) => {
  const exact = loadUxExactBuild(process.env);
  const source = buildCatalogLibrarySnapshot('2026-10-11T00:00:00.000Z');
  const frozen = source.bundles.find(row => row.flow.slug === 'morning-routine-30day')!;
  const expected = buildCatalogContent(frozen.flow.slug, source); expect(expected.ok).toBe(true);
  if (!expected.ok) throw Error('reviewed-source-required');
  const mock = await mockFolderContentEntry(page, { singleCatalogSource: source });
  const before = await mock.current();
  const open = async () => {
    const panel = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: /^기존 Flow 콘텐츠$/ }) });
    if (!(await panel.evaluate(node => (node as HTMLDetailsElement).open))) await keyboard(panel.locator(':scope > summary'));
    await keyboard(panel.getByRole('button', { name: '전체 콘텐츠 내용 확인', exact: true }));
    await expect(panel.getByRole('button', { name: '전체 자료실 보관 (선택)', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await expect(panel.getByRole('button', { name: '전체 콘텐츠 비공개로 가져오기', exact: true })).toHaveCount(0);
    await panel.getByLabel('콘텐츠 검색', { exact: true }).fill(frozen.flow.title);
    await keyboard(panel.getByRole('button', { name: frozen.flow.title, exact: true }));
    return page.getByRole('region', { name: 'Flow 콘텐츠 상세', exact: true });
  };
  await page.goto('/alpha#flowme/creator'); expect(await page.content()).toContain(exact.buildId); await login(page);
  let detail = await open();
  await expect(detail).toContainText('출처 대조를 마친 수정판');
  await keyboard(detail.getByRole('button', { name: '제작 사본 내용 확인', exact: true }));
  let confirm = detail.getByRole('region', { name: '제작 사본 가져오기 확인', exact: true });
  await keyboard(confirm.getByRole('button', { name: '취소', exact: true }));
  expect(canonicalJson(await mock.current())).toBe(canonicalJson(before)); expect(mock.commands).toHaveLength(0);
  await keyboard(detail.getByRole('button', { name: '제작 사본 내용 확인', exact: true }));
  confirm = detail.getByRole('region', { name: '제작 사본 가져오기 확인', exact: true });
  if (reject) {
    mock.state.rejectNextExecute = 'limit';
    await keyboard(confirm.getByRole('button', { name: '비공개 제작 사본으로 가져오기', exact: true }));
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole('button', { name: '비공개 제작 사본으로 가져오기', exact: true })).toBeDisabled();
    expect(canonicalJson(await mock.current())).toBe(canonicalJson(before)); expect(mock.commands).toHaveLength(1);
    await page.screenshot({ path: info.outputPath('single-source-rejected-preserved.png'), fullPage: true });
    await page.waitForLoadState('networkidle'); await mock.assertBoundary(info);
    const boundary = JSON.parse(info.attachments.find(row => row.name === 'release-boundary')!.body!.toString('utf8'));
    assertUxObservedAssets(exact, boundary.assets);
    await info.attach('single-source-result', { contentType: 'application/json', body: JSON.stringify({
      head: exact.head, build: exact.buildId, importedDrafts: 0, rejectedAttempt: 1,
      inputAndSourcePreserved: true, originalRecoveryGuardPreserved: true, automaticRetry: false, realBackendWrites: 0 }) });
    return;
  }
  await keyboard(confirm.getByRole('button', { name: '비공개 제작 사본으로 가져오기', exact: true }));
  await expect(detail.getByRole('button', { name: '제작 사본 열기', exact: true })).toBeVisible();
  const saved = await mock.current(), records = Object.values(saved.space.creatorWorkspace!.library.records);
  expect(records).toHaveLength(1); expect(saved.space.catalogLibrary).toBeUndefined();
  expect(canonicalJson(saved.space.text)).toBe(canonicalJson(before.space.text));
  expect(canonicalJson(saved.space.copies)).toBe(canonicalJson(before.space.copies));
  expect(saved.space.creatorWorkspace!.working).toBeNull();
  await page.screenshot({ path: info.outputPath('single-source-saved.png'), fullPage: true });
  await keyboard(detail.getByRole('button', { name: '제작 사본 열기', exact: true }));
  await expect(page.getByLabel('제작 원문', { exact: true })).toHaveValue(expected.document.rawText);
  await page.reload();
  await expect(page.getByLabel('제작 원문', { exact: true })).toHaveValue(expected.document.rawText);
  detail = await open();
  await expect(detail.getByRole('button', { name: '제작 사본 내용 확인', exact: true })).toHaveCount(0);
  await keyboard(detail.getByRole('button', { name: '제작 사본 열기', exact: true }));
  await expect(page.getByLabel('제작 원문', { exact: true })).toHaveValue(expected.document.rawText);
  const final = await mock.current();
  expect(Object.keys(final.space.creatorWorkspace!.library.records)).toEqual([records[0].draftId]);
  expect(final.space.creatorWorkspace!.working!.draftId).toBe(records[0].draftId);
  expect(final.space.catalogLibrary).toBeUndefined();
  expect(final.space.creatorWorkspace!.library.records).toEqual(saved.space.creatorWorkspace!.library.records);
  const imports = mock.commands.filter(command => isAlphaCreatorCommand(command) && command.intent.type === 'catalog-content-import');
  expect(imports).toHaveLength(1); // no revisit import
  expect(mock.commands.every(command => isAlphaCreatorCommand(command) && ['catalog-content-import', 'working'].includes(command.intent.type))).toBe(true);
  await page.screenshot({ path: info.outputPath('single-source-same-draft.png'), fullPage: true });
  await page.waitForLoadState('networkidle'); await mock.assertBoundary(info);
  const boundary = JSON.parse(info.attachments.find(row => row.name === 'release-boundary')!.body!.toString('utf8'));
  assertUxObservedAssets(exact, boundary.assets);
  await info.attach('single-source-result', { contentType: 'application/json', body: JSON.stringify({
    head: exact.head, build: exact.buildId, readOnlyBrowse: true, cancelWrites: 0, rejectedAttempt: 0,
    importedDrafts: 1, bulkLibraryStored: false, sameDraftAfterReload: true, duplicateDrafts: 0,
    personalPlansUnchanged: true, realBackendWrites: 0, syntheticAuthAndStorage: true, physicalDevice: false }) });
});
