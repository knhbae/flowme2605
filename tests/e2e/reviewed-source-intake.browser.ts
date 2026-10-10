import { test, expect, type Locator } from '@playwright/test';
import { login } from './alpha-auth.fixture';
import { mockFolderContentEntry } from './folder-content-entry.fixture';
import { loadUxExactBuild, assertUxObservedAssets, type UxExactBuild } from './ux-exact-build';
import { buildCatalogLibrarySnapshot } from '../../lib/flow/integrated-poc/catalog-library-source';
import { getCurrentPublicSourceEdition } from '../../lib/flow/public-source-editions';
import { canonicalJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import type { AlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { buildCatalogContent } from '../../lib/flow/integrated-poc/catalog-content-source';
import { createNativeCreatorDocumentOwner } from '../../lib/flow/integrated-poc/native-creator-document';
import { createProgramCreatorWorkspace, creatorWorkingFromRecord } from '../../lib/flow/integrated-poc/creator-workspace';
import { captureProgramCreatorSavedRevision } from '../../lib/flow/integrated-poc/creator-history-snapshot';
import { transitionPersonalWorkspacePocCreatorDraftLibrary } from '../../lib/flow/personal-workspace-poc-creator-drafts';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '../../lib/flow/personal-workspace-poc-authoring';
import type { NativeCreatorCatalogContentSource } from '../../lib/flow/integrated-poc/native-creator-document-contract';
import { isAlphaCreatorCommand } from '../../lib/flow/integrated-poc/alpha-creator/contract';
if (process.env.FLOWME_CLOUDFLARE_QA_MODE !== 'local' || process.env.FLOWME_CLOUDFLARE_QA_LOCAL_PORT !== '3107')
  throw Error('reviewed-source-fixed-local-only');
let exact: UxExactBuild;
test.beforeAll(() => {
  exact = loadUxExactBuild(process.env);
  expect(exact.qaInputs.some(row => row.path === 'tests/e2e/reviewed-source-intake.browser.ts')).toBe(true);
});

function retainedCopy(account: AlphaAccount, library: ReturnType<typeof buildCatalogLibrarySnapshot>) {
  const built = buildCatalogContent('moving-d30-basic', library); if (!built.ok) throw Error('held-source-fixture-required');
  const draftId = 'held-original-draft', now = '2026-09-23T05:00:00.000Z';
  const source: NativeCreatorCatalogContentSource = { kind: 'catalog-content', version: 1, storageKey: 'flow:catalog-content:v1',
    draftId: 'catalog-content:moving-d30-basic', sourceSlug: 'moving-d30-basic', versionId: built.content.versionId,
    revisionId: built.document.revision.revisionId, contentJson: canonicalJson(built.content), documentJson: canonicalJson(built.document) };
  const native = createNativeCreatorDocumentOwner({ id: draftId, source }, now); if (!native.ok) throw Error('held-native-fixture-required');
  const w = createProgramCreatorWorkspace(now), saved = transitionPersonalWorkspacePocCreatorDraftLibrary(w.library, {
    type: 'save', draftId, expectedLibraryRevision: w.library.revision, title: built.document.title, rawText: built.document.rawText,
    sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(built.document.rawText), now });
  if (!saved.changed) throw Error('held-record-fixture-required');
  w.library = saved.library; w.structureDrafts = { [draftId]: { version: 1, recordRevision: 1, contextRevision: 1,
    savedAt: now, nativeDocument: native.owner, nativeSelection: source } };
  captureProgramCreatorSavedRevision(w, w.library.records[draftId]);
  return { ...account, space: { ...account.space, catalogLibrary: library, creatorWorkspace: w } };
}

for (const retained of [false, true]) test(`held source blocks NEW intake while retained copy read stays available: ${retained}`, async ({ page }, info) => {
  const library = buildCatalogLibrarySnapshot('2026-10-10T00:00:00.000Z');
  const frozen = library.bundles.find(row => row.flow.slug === 'moving-d30-basic')!;
  const mock = await mockFolderContentEntry(page, { prepareAccount: account => retained ? retainedCopy(account, library)
    : { ...account, space: { ...account.space, catalogLibrary: library } } });
  const before = await mock.current();
  await page.goto('/alpha#flowme/creator'); expect(await page.content()).toContain(exact.buildId); await login(page);
  const search = page.getByLabel('콘텐츠 검색', { exact: true }); await search.fill(frozen.flow.title);
  await keyboard(page.getByRole('button', { name: frozen.flow.title, exact: true }));
  const detail = page.getByRole('region', { name: 'Flow 콘텐츠 상세', exact: true });
  await expect(detail.getByRole('button', { name: '제작 사본 내용 확인', exact: true })).toHaveCount(0);
  await expect(detail.getByRole('button', { name: '비공개 제작 사본으로 가져오기', exact: true })).toHaveCount(0);
  if (retained) {
    await keyboard(detail.getByRole('button', { name: '제작 사본 열기', exact: true }));
    const built = buildCatalogContent('moving-d30-basic', library);
    if (!built.ok) throw Error('held-source-fixture-required');
    await expect(page.getByLabel('제작 원문', { exact: true })).toHaveValue(built.document.rawText);
  } else {
    await expect(detail).toContainText('출처');
    await keyboard(page.getByRole('button', { name: '목록으로', exact: true }));
  }
  await page.screenshot({ path: info.outputPath(retained ? 'held-existing-copy.png' : 'held-new-start.png'), fullPage: true });
  const after = await mock.current();
  if (retained) {
    // Opening an existing draft uses the existing working-selection CAS. It
    // must not import, save/edit a record or change a personal plan.
    expect(mock.commands).toHaveLength(1);
    const command = mock.commands[0];
    if (!isAlphaCreatorCommand(command) || command.intent.type !== 'working' || !command.intent.working)
      throw Error('existing-copy-only-working-selection-required');
    expect(command.intent.working.draftId).toBe('held-original-draft');
    const expectedWorking = creatorWorkingFromRecord(before.space.creatorWorkspace!, 'held-original-draft');
    expect(canonicalJson(command.intent.working)).toBe(canonicalJson(expectedWorking));
    expect(canonicalJson(after.space.creatorWorkspace!.working)).toBe(canonicalJson(expectedWorking));
    expect(after.revision).toBe(before.revision + 1);
    expect(after.space.creatorWorkspace!.working!.draftId).toBe('held-original-draft');
    expect(after.space.creatorWorkspace!.working!.rawText).toBe(before.space.creatorWorkspace!.library.records['held-original-draft'].rawText);
    expect(canonicalJson({ ...after, revision: before.revision, space: { ...after.space,
      creatorWorkspace: { ...after.space.creatorWorkspace!, working: before.space.creatorWorkspace!.working } } })).toBe(canonicalJson(before));
  } else {
    expect(canonicalJson(after)).toBe(canonicalJson(before)); expect(mock.commands).toHaveLength(0);
  }
  await page.waitForLoadState('networkidle'); await mock.assertBoundary(info);
  const boundary = JSON.parse(info.attachments.find(row => row.name === 'release-boundary')!.body!.toString('utf8'));
  expect(boundary.realApiRequests).toBe(0); expect(boundary.forwardedSupabaseRequests).toBe(0);
  assertUxObservedAssets(exact, boundary.assets);
  await info.attach('held-source-result', { contentType: 'application/json', body: JSON.stringify({
    head: exact.head, buildId: exact.buildId, heldNewIntakeBlocked: true, retainedCopyRead: retained,
    savedRecordsAndPersonalPlansPreserved: true, syntheticWorkingSelectionWrites: retained ? 1 : 0,
    personalCopiesAdded: 0, realBackendWrites: 0, syntheticAuthAndCAS: true }) });
  await page.route('**/*', route => route.abort('blockedbyclient')); await page.context().unrouteAll({ behavior: 'wait' });
});
async function keyboard(button: Locator) {
  await expect(button).toBeVisible(); await expect(button).toBeEnabled();
  await button.scrollIntoViewIfNeeded(); await button.focus(); await expect(button).toBeFocused(); await button.press('Enter');
}
test('qualified edition and frozen comparison stay distinct; preview/cancel never imports a personal copy', async ({page},info) => {
  // Existing source pack is supplied explicitly by the owner. It is not a new
  // public publication, a private account, or a browser storage-state copy.
  const library = buildCatalogLibrarySnapshot('2026-10-10T00:00:00.000Z');
  const frozen = library.bundles.find(row => row.flow.slug === 'kitchen-reset-organize')!;
  const edition = getCurrentPublicSourceEdition(frozen); expect(edition).toBeTruthy();
  const mock = await mockFolderContentEntry(page,{prepareAccount: account => ({...account,space:{...account.space,catalogLibrary:library}})});
  const before = canonicalJson(await mock.current());
  await page.goto('/alpha#flowme/creator'); expect(await page.content()).toContain(exact.buildId); await login(page);
  const search = page.getByLabel('콘텐츠 검색',{exact:true}); await expect(search).toBeVisible(); await search.fill(frozen.flow.title);
  await keyboard(page.getByRole('button',{name:frozen.flow.title,exact:true}));
  const detail = page.getByRole('region',{name:'Flow 콘텐츠 상세',exact:true});
  await expect(detail).toContainText('출처 대조를 마친 수정판 · 기존 개인 계획은 바꾸지 않습니다.');
  await expect(detail).toContainText('출처 확인 기록: 2026-10-10');
  await page.screenshot({path:info.outputPath('reviewed.png'),fullPage:true});
  await keyboard(detail.getByRole('button',{name:'제작 사본 내용 확인',exact:true}));
  const confirm = detail.getByRole('region',{name:'제작 사본 가져오기 확인',exact:true}); await expect(confirm).toBeVisible();
  await expect(confirm.getByRole('button',{name:'비공개 제작 사본으로 가져오기',exact:true})).toBeEnabled();
  await keyboard(confirm.getByRole('button',{name:'취소',exact:true})); await expect(confirm).toHaveCount(0);
  await keyboard(detail.getByRole('button',{name:'구판 원본 비교',exact:true}));
  await expect(detail).toContainText('이전 PoC 원본 판본');
  await expect(detail).toContainText(`출처 확인 기록: ${frozen.flow.source_checked_at}`);
  await expect(detail.getByRole('button',{name:'제작 사본 내용 확인',exact:true})).toHaveCount(0);
  await page.screenshot({path:info.outputPath('frozen.png'),fullPage:true});
  await keyboard(detail.getByRole('button',{name:'출처 대조 수정판 보기',exact:true}));
  await expect(detail).toContainText('출처 확인 기록: 2026-10-10');
  await keyboard(page.getByRole('button',{name:'목록으로',exact:true})); await expect(search).toHaveValue(frozen.flow.title);
  await expect(page.getByRole('button',{name:frozen.flow.title,exact:true})).toBeFocused();
  expect(canonicalJson(await mock.current())).toBe(before); expect(mock.commands).toHaveLength(0);
  expect(mock.diagnostics()).toEqual({mutations:0,operations:0});
  await page.waitForLoadState('networkidle'); await mock.assertBoundary(info);
  const boundary = JSON.parse(info.attachments.find(row=>row.name==='release-boundary')!.body!.toString('utf8'));
  expect(boundary.realApiRequests).toBe(0); expect(boundary.forwardedSupabaseRequests).toBe(0);
  assertUxObservedAssets(exact,boundary.assets);
  await info.attach('reviewed-source-readonly-result',{contentType:'application/json',body:JSON.stringify({
    head:exact.head,buildId:exact.buildId,sourceVersion:edition!.version,sourceSha256:edition!.bundleSha256,
    frozenComparisonPreserved:true,explicitPreviewCancel:true,keyboardReturn:true,personalCopiesAdded:0,
    syntheticAuthAndCAS:true,realBackendWrites:0,physicalDevice:false,actualUserValidation:false})});
  await page.route('**/*',route=>route.abort('blockedbyclient')); await page.context().unrouteAll({behavior:'wait'});
});
