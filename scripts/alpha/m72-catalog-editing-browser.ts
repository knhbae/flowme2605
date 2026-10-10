/** Isolated browser simulation. All remote Auth/REST and local Alpha API calls are
 * intercepted. Uses the real creator dispatcher, NOT Supabase/RLS/live accounts.
 * No credentials, mail, fixture cleanup, deployment or remote writes. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium, type Page } from 'playwright';
import { emptyAccount, mockAlpha, session, sessionKey } from '../../tests/e2e/alpha-auth.fixture';
import { buildCatalogLibrarySnapshot } from '../../lib/flow/integrated-poc/catalog-library-source';
import { dispatchAlphaCreatorCommand } from '../../lib/flow/integrated-poc/alpha-creator/dispatch';
import { isAlphaCreatorCommand } from '../../lib/flow/integrated-poc/alpha-creator/contract';
import { canonicalJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { isAccountForOwner } from '../../lib/flow/integrated-poc/alpha-auth/account-access';
import type { AlphaAccount, AlphaReceipt } from '../../lib/flow/integrated-poc/alpha-persistence/contract';

const APP = process.env.FLOWME_ISOLATED_APP_URL ?? 'http://localhost:3104';
assert(/^http:\/\/localhost:31\d\d$/.test(APP), 'isolated local app only');
const WAVE2_SOURCES = ['samsung-aircon-seasonal-check', 'samsung-washer-filter-cleaning', 'computer-skills-d30-study', 'home-cafe-daily'] as const;
const WAVE3_SOURCES = ['curated-opic-single-mock-review', 'curated-opic-course-row-import'] as const;
const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
async function main() {
  const [mode, sourceFlag, ...extra] = process.argv.slice(2);
  assert(mode === '--isolated-fixture' && extra.length === 0 && (sourceFlag === undefined || /^--source=[a-z0-9-]+$/.test(sourceFlag)));
  const sourceSlug = sourceFlag?.slice('--source='.length) ?? 'portfolio-4week';
  assert(sourceSlug === 'portfolio-4week' || ([...WAVE2_SOURCES, ...WAVE3_SOURCES] as readonly string[]).includes(sourceSlug), 'unsupported isolated fixture source');
  const wave3 = (WAVE3_SOURCES as readonly string[]).includes(sourceSlug);
  const anchored = sourceSlug === 'portfolio-4week' || wave3;
  const wave2 = sourceSlug !== 'portfolio-4week';
  const renamedItem = wave2 ? `격리 검증용 ${sourceSlug} 항목` : '격리 검증용 포트폴리오 항목';
  const output = `output/playwright/alpha-m72-catalog-editing/${new Date().toISOString().replace(/[:.]/g, '-')}${wave2 ? `-${sourceSlug}` : ''}`;
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  // tsx preserves function names with this helper inside the imported fixture's
  // serialized init script. Playwright's test transformer normally supplies it;
  // this standalone runner must supply the naming-only helper in browser scope.
  await context.addInitScript('globalThis.__name = (target, value) => Object.defineProperty(target, "name", {value, configurable: true});');
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const mocked = await mockAlpha(page);
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    (window as unknown as { __catalogStorageFailures: unknown[] }).__catalogStorageFailures = [];
    Storage.prototype.setItem = function(key, value) {
      try { return set.call(this, key, value); } catch (error) {
        (window as unknown as { __catalogStorageFailures: unknown[] }).__catalogStorageFailures.push({
          key, chars: value.length, storedChars: Object.keys(this).reduce((sum, name) => sum + name.length + (this.getItem(name)?.length ?? 0), 0),
          name: error instanceof Error ? error.name : 'unknown',
        });
        throw error;
      }
    };
  });
  let account = emptyAccount('a') as AlphaAccount;
  account.space.catalogLibrary = buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z');
  mocked.accounts.set('a', account);
  const source = account.space.catalogLibrary!.bundles.find(row => row.flow.slug === sourceSlug); assert(source);
  const originalCatalogHash = hash(account.space.catalogLibrary);
  const ledger = new Map<string, { fingerprint: string; receipt: AlphaReceipt }>();
  const commands: string[] = [], checks: string[] = [], screenshots: string[] = [], unexpectedApi: string[] = [], unexpectedExternal: string[] = [];
  const storageAudits: { forbidden: string[]; equal: boolean }[] = [];
  const interactionTimings: { action: string; milliseconds: number }[] = [];
  const timedClick = async (name: string) => {
    const start = Date.now();
    // Separate functional completion from latency. A successful >20s action is
    // recorded as a performance gap, not silently labelled responsive.
    await page.getByRole('button', { name, exact: true }).click({ timeout: 60_000 });
    interactionTimings.push({ action: name, milliseconds: Date.now() - start });
  };
  page.on('request', request => { const url = new URL(request.url());
    if (![APP, 'https://wkmzcxpnojobxrgebapw.supabase.co'].includes(url.origin)) unexpectedExternal.push(`${url.origin}${url.pathname}`); });
  let failNextImport = false, mutationCount = 0, injectedFailures = 0, stage = 'setup';
  const check = (label: string, result: unknown) => { assert(result, label); checks.push(label); };
  // Registered after mockAlpha: local Alpha commands never reach the live BFF.
  await page.route('**/api/alpha/**', async route => {
    const req = route.request();
    const reply = (value: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
    if (new URL(req.url()).origin !== APP || req.method() !== 'POST') { unexpectedApi.push(req.url()); return route.abort(); }
    let body: { kind?: string; requestId?: string; command?: unknown };
    try { body = req.postDataJSON(); } catch { unexpectedApi.push('non-json'); return route.abort(); }
    if (body.kind === 'lookup') return reply({ ok: true, value: ledger.get(body.requestId ?? '')?.receipt ?? null });
    if (body.kind !== 'execute' || !isAlphaCreatorCommand(body.command)) { unexpectedApi.push(`${body.kind}:unsupported-command`); return reply({ ok: false, reason: 'invalid' }); }
    const command = body.command, fingerprint = canonicalJson(command), previous = ledger.get(command.requestId);
    commands.push(command.intent.type);
    if (previous) return reply(previous.fingerprint === fingerprint ? { ok: true, value: previous.receipt } : { ok: false, reason: 'idempotency-conflict' });
    const transition = dispatchAlphaCreatorCommand(account, command);
    if (!transition.ok) return reply({ ok: false, reason: transition.reason === 'revision-conflict' ? 'revision-conflict' : 'invalid' });
    if (!transition.changed) return reply({ ok: false, reason: 'no-change' });
    if (failNextImport && command.intent.type === 'catalog-content-import') { failNextImport = false; injectedFailures++; return reply({ ok: false, reason: 'unavailable' }); }
    const next = structuredClone(account);
    for (const change of transition.changes) {
      if (change.present) (next.space as unknown as Record<string, unknown>)[change.field] = structuredClone(change.value);
      else delete next.space[change.field];
    }
    next.revision++;
    assert(isAccountForOwner(next, next.ownerId), 'dispatcher output must remain a valid account');
    assert.equal(hash(next.space.catalogLibrary), originalCatalogHash, 'original catalog immutable');
    account = next; mocked.accounts.set('a', account); mutationCount++;
    const receipt: AlphaReceipt = { requestId: command.requestId, kind: 'creator', revision: account.revision, changed: true, resultId: transition.result };
    ledger.set(command.requestId, { fingerprint, receipt });
    return reply({ ok: true, value: receipt });
  });
  await page.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value)); }, { key: sessionKey, value: session('a') });
  async function waitFor(predicate: () => boolean, label: string) {
    const until = Date.now() + 30_000;
    while (!predicate() && Date.now() < until) await page.waitForTimeout(100);
    check(label, predicate());
  }
  async function screenshot(name: string) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true }); screenshots.push(`${name}.png`); }
  async function auditStorage() { storageAudits.push(await page.evaluate(() => ({ forbidden: [...window.__alphaStorageAudit.forbidden],
    equal: Object.entries(window.__alphaStorageAudit.operational).every(([key,value]) => localStorage.getItem(key) === value) }))); }
  async function layout(p: Page, name: string) {
    const metrics = await p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    check(`${name}-horizontal-overflow-zero`, metrics.scroll <= metrics.width + 1);
    const actions = p.getByRole('button', { name: '제작 사본 내용 확인', exact: true });
    await actions.scrollIntoViewIfNeeded();
    check(`${name}-action-visible`, await actions.isVisible() && await actions.isEnabled());
    await actions.focus(); check(`${name}-keyboard-focus`, await actions.evaluate(node => node === document.activeElement));
    await screenshot(name);
    await p.screenshot({ path: `${output}/${name}-viewport.png`, fullPage: false }); screenshots.push(`${name}-viewport.png`);
  }
  try {
    stage = 'open-library'; await page.goto(`${APP}/alpha`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '내 활동', exact: true }).click();
    await page.getByRole('button', { name: 'Flow 만들기', exact: true }).click();
    await page.getByLabel('콘텐츠 검색', { exact: true }).fill(source.flow.title);
    await page.getByRole('button', { name: source.flow.title, exact: true }).click();
    check('read-only-original-zero-mutation', mutationCount === 0);
    if (wave2) {
      const detail = page.getByRole('region', { name: 'Flow 콘텐츠 상세', exact: true });
      const sourceLabel = wave3 ? '제작자 경험' : sourceSlug.startsWith('samsung-') ? '공식 자료' : '참고 자료';
      check('original-source-classification-visible', await detail.getByText(sourceLabel, { exact: true }).count() === source.items.length);
      if (wave3) {
        for (const item of source.items) check(`original-row-${item.id}`, await detail.getByText(item.title, { exact: true }).isVisible());
        check('opic-original-single-day-rows', source.items.every(item => item.duration_days === 1));
        if (sourceSlug === 'curated-opic-single-mock-review') check('opic-two-rest-rows-retained', source.items.filter(item => item.title.includes('휴식')).length === 2);
        else check('opic-weekly-bundles-not-expanded', source.items.length === 5 && source.items.every(item => item.title.includes('3번씩')));
      }
      if (sourceSlug === 'samsung-washer-filter-cleaning') {
        check('original-filter-no-water-warning-visible', await detail.getByText(source.flow.conversion_note!, { exact: true }).isVisible()
          && source.flow.conversion_note!.includes('물세척 금지'));
      }
      if (sourceSlug === 'computer-skills-d30-study') {
        check('original-2027-recheck-warning-visible', await detail.getByText(source.flow.warning!, { exact: true }).isVisible()
          && source.flow.warning!.includes('2027년 이후'));
      }
    }
    for (const [width, height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]) {
      await page.setViewportSize({ width, height }); await layout(page, `detail-${width}x${height}`);
    }
    stage = 'cancel-preview';
    await page.getByRole('button', { name: '제작 사본 내용 확인', exact: true }).click();
    const preview = page.getByRole('region', { name: '제작 사본 가져오기 확인', exact: true });
    await preview.getByRole('button', { name: '취소', exact: true }).click();
    check('cancel-zero-mutation', mutationCount === 0);
    await page.getByRole('button', { name: '제작 사본 내용 확인', exact: true }).click();
    await preview.getByRole('button', { name: '취소', exact: true }).focus(); await page.keyboard.press('Escape');
    check('escape-preview-zero-mutation', mutationCount === 0 && await preview.count() === 0);
    check('escape-keeps-original-detail', await page.getByRole('region', { name: 'Flow 콘텐츠 상세', exact: true }).isVisible());
    stage = 'failed-import'; const beforeFailure = hash(account); failNextImport = true;
    await page.getByRole('button', { name: '제작 사본 내용 확인', exact: true }).click();
    await preview.getByRole('button', { name: '비공개 제작 사본으로 가져오기', exact: true }).click();
    await waitFor(() => injectedFailures === 1, 'isolated-failure-injected');
    check('failed-import-zero-mutation', mutationCount === 0 && hash(account) === beforeFailure);
    // Retry the same request through the real recovery UI; never clear pending state.
    stage = 'import-retry';
    await page.getByRole('button', { name: '저장 결과 확인 · 같은 요청 재시도', exact: true }).first().click();
    await waitFor(() => !!account.space.creatorWorkspace?.library.records && Object.keys(account.space.creatorWorkspace.library.records).length === 1, 'one-copy-created');
    const draftId = Object.keys(account.space.creatorWorkspace!.library.records)[0];
    const importedRevision = account.revision;
    await page.getByRole('button', { name: '제작 사본 열기', exact: true }).waitFor({ state: 'visible' });
    check('retry-success-clears-stale-failure', await page.getByText('저장 상태 확인이 필요합니다. 입력을 보관한 뒤 새로고침해 주세요.', { exact: true }).count() === 0);
    check('import-no-personal-execution', account.space.text.documents.length === 0);
    check('no-duplicate-import-button', await page.getByRole('button', { name: '비공개 제작 사본으로 가져오기', exact: true }).count() === 0);
    const priorCommand = [...ledger.values()].find(row => JSON.parse(row.fingerprint).intent.type === 'catalog-content-import'); assert(priorCommand);
    const repeated = dispatchAlphaCreatorCommand(account, { ...JSON.parse(priorCommand.fingerprint), requestId: 'isolated-duplicate', expectedRevision: account.revision });
    check('duplicate-dispatch-no-change', repeated.ok && !repeated.changed && account.revision === importedRevision);
    stage = 'edit-copy'; await page.getByRole('button', { name: '제작 사본 열기', exact: true }).click();
    await page.getByRole('navigation', { name: '저장된 구조 항목', exact: true }).getByRole('button').first().click();
    await page.getByLabel('작업 항목 제목', { exact: true }).fill(renamedItem);
    await page.getByRole('button', { name: '제목 변경 비교', exact: true }).click();
    const beforeEdit = mutationCount;
    await timedClick('비교한 구조 적용');
    await waitFor(() => mutationCount > beforeEdit, 'native-item-edit-saved');
    await timedClick('제작 초안 저장');
    await waitFor(() => [...ledger.values()].some(row => JSON.parse(row.fingerprint).intent.type === 'library-action')
      && !!account.space.creatorWorkspace!.structureDrafts?.[draftId]?.nativeDocument?.document.parseResult.canonical.items.some(item => item.title === renamedItem), 'explicit-copy-save');
    check('editing-no-execution-until-confirm', account.space.text.documents.length === 0);
    stage = 'handoff'; await page.getByRole('navigation', { name: '제작 단계' }).getByRole('button', { name: '결과', exact: true }).click();
    const beforeAnchor=hash(account),beforeAnchorMutations=mutationCount;
    const resultView=page.getByRole('region',{name:'복구한 제작 결과',exact:true});
    if(anchored){
      await page.getByLabel('개인 계획 기준일',{exact:true}).fill('2028-02-28');
      await resultView.getByRole('button',{name:`캘린더 · ${source.items.length}`,exact:true}).click();
      for(const item of source.items){const expected=new Date('2028-02-28T00:00:00Z');expected.setUTCDate(expected.getUTCDate()+item.day_offset!);check(`calendar-date-${item.id}`,await resultView.getByText(new RegExp(expected.toISOString().slice(0,10))).count()>0);}
      for(const [width,height]of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]){
        await page.setViewportSize({width,height});const input=page.getByLabel('개인 계획 기준일',{exact:true});await input.focus();await input.scrollIntoViewIfNeeded();
        check(`anchor-${width}-keyboard-focus`,await input.evaluate(node=>node===document.activeElement));
        const box=await input.boundingBox();check(`anchor-${width}-not-clipped`,box&&box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=height+1);
        check(`anchor-${width}-no-overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await screenshot(`anchor-${width}x${height}`);
        await page.screenshot({path:`${output}/anchor-${width}x${height}-viewport.png`,fullPage:false});screenshots.push(`anchor-${width}x${height}-viewport.png`);
      }
      await page.getByRole('button',{name:'원문 기준으로 보기',exact:true}).focus();await page.keyboard.press('Enter');
      await resultView.getByRole('button',{name:'캘린더 · 0',exact:true}).waitFor();
      check('clear-returns-keyboard-focus',await page.getByLabel('개인 계획 기준일',{exact:true}).evaluate(node=>node===document.activeElement));
      check('clear-personal-anchor-zero-write',hash(account)===beforeAnchor&&mutationCount===beforeAnchorMutations);
      await page.getByLabel('개인 계획 기준일',{exact:true}).fill('2028-02-29');
      await resultView.getByRole('button',{name:`캘린더 · ${source.items.length}`,exact:true}).waitFor();
      check('anchor-change-zero-write',hash(account)===beforeAnchor&&mutationCount===beforeAnchorMutations);
    }
    await page.getByLabel('개인 계획 기준일', { exact: true }).fill('2026-10-01');
    await page.getByRole('button', { name: '제작 설정을 개인 실행과 비교', exact: true }).click();
    const review = page.getByRole('region', { name: '제작 설정과 개인 실행 비교', exact: true });
    check('handoff-preview-zero-document', account.space.text.documents.length === 0);
    if(anchored)for(const item of source.items){const expected=new Date('2026-10-01T00:00:00Z');expected.setUTCDate(expected.getUTCDate()+item.day_offset!);check(`handoff-date-${item.id}`,await review.getByText(new RegExp(expected.toISOString().slice(0,10))).count()>0);}
    check('anchor-disabled-during-comparison',await page.getByLabel('개인 계획 기준일',{exact:true}).isDisabled());
    for(const cancel of ['escape','button']){
      const closing=review.getByRole('button',{name:'모두 유지하고 닫기',exact:true});
      if(cancel==='escape'){await closing.focus();await page.keyboard.press('Escape');}else await closing.click();
      await review.waitFor({state:'hidden'});
      check(`anchor-${cancel}-zero-write`,hash(account)===beforeAnchor&&mutationCount===beforeAnchorMutations);
      check(`anchor-${cancel}-input-unlocked`,await page.getByLabel('개인 계획 기준일',{exact:true}).isEnabled());
      await page.getByRole('button',{name:'제작 설정을 개인 실행과 비교',exact:true}).click();
      await review.waitFor();
    }
    await screenshot('handoff-review');
    const selections = review.getByRole('combobox', { name: /내용 반영/ });
    check('handoff-rows-match-source', await selections.count() === source.items.length);
    await selections.first().selectOption('keep'); await selections.first().selectOption('incoming');
    await review.getByRole('button', { name: '선택한 내용으로 개인 실행 연결', exact: true }).click();
    await waitFor(() => account.space.text.documents.length === 1, 'explicit-handoff-one-personal-document');
    check('renamed-item-in-personal-document', canonicalJson(account.space.text).includes(renamedItem));
    const provenance = page.getByRole('region', { name: '실행에 연결된 Flow 원본 안내', exact: true });
    await provenance.waitFor({ state: 'visible' });
    await provenance.getByText('가져온 Flow의 원문·출처', { exact: true }).click();
    await provenance.getByText('가져올 때의 전체 원본 구조·안내', { exact: true }).click();
    check('execution-provenance-original-item-visible', await provenance.getByText(source.items[0].title, { exact: true }).isVisible());
    check('execution-provenance-not-renamed', await provenance.getByText(renamedItem, { exact: true }).count() === 0);
    if (wave2) {
      const sourceLabel = wave3 ? '제작자 경험' : sourceSlug.startsWith('samsung-') ? '공식 자료' : '참고 자료';
      check('execution-original-source-classification-visible', await provenance.getByText(sourceLabel, { exact: true }).count() === source.items.length);
      if (sourceSlug === 'samsung-washer-filter-cleaning') check('execution-original-no-water-warning-visible', await provenance.getByText(source.flow.conversion_note!, { exact: true }).isVisible());
      if (sourceSlug === 'computer-skills-d30-study') check('execution-original-2027-recheck-warning-visible', await provenance.getByText(source.flow.warning!, { exact: true }).isVisible());
    }
    await screenshot('execution-original-provenance');
    if(anchored){
      const beforeReentry=hash(account),beforeReentryMutations=mutationCount;
      await page.getByRole('button',{name:'내 활동',exact:true}).click();
      await page.getByRole('button',{name:'Flow 만들기',exact:true}).click();
      await page.getByRole('navigation',{name:'제작 단계'}).getByRole('button',{name:'결과',exact:true}).click();
      await page.getByRole('button',{name:'마지막 인계 기준으로 보기',exact:true}).click();
      await page.getByText(/마지막 인계 기준일 2026-10-01로/).waitFor();
      await resultView.getByRole('button',{name:`캘린더 · ${source.items.length}`,exact:true}).click();
      for(const item of source.items){const expected=new Date('2026-10-01T00:00:00Z');expected.setUTCDate(expected.getUTCDate()+item.day_offset!);check(`reentry-calendar-${item.id}`,await resultView.getByText(new RegExp(expected.toISOString().slice(0,10))).count()>0);}
      await page.getByRole('button',{name:'제작 설정을 개인 실행과 비교',exact:true}).click();
      await review.waitFor();
      await review.getByRole('button',{name:'모두 유지하고 닫기',exact:true}).click();
      check('existing-handoff-clear-preview-cancel-zero-write',hash(account)===beforeReentry&&mutationCount===beforeReentryMutations);
      await screenshot('existing-handoff-anchor');
    }
    const saved = hash(account); await auditStorage(); stage = 'reload'; await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('alpha-a@example.invalid', { exact: true }).waitFor();
    check('reload-preserves-success-state', hash(account) === saved);
    check('original-catalog-byte-equal', hash(account.space.catalogLibrary) === originalCatalogHash);
    await screenshot('reload-success');
    check('external-unexpected-zero', mocked.requests.length > 0 && mocked.state.updatedOwners.length === 0);
    check('all-unrecognized-network-blocked-zero', mocked.requests.length > 0 && mocked.workspaceRequests.length === 0 && unexpectedApi.length === 0 && unexpectedExternal.length === 0);
    check('page-errors-zero', mocked.pageErrors.length === 0); check('console-errors-zero', mocked.consoleErrors.length === 0);
    await auditStorage();
    check('outside-prefix-writes-zero', storageAudits.every(audit => audit.forbidden.length === 0)); check('operating-storage-byte-equal', storageAudits.every(audit => audit.equal));
    stage = 'complete';
  } finally {
    if (stage !== 'complete') { await screenshot('failure'); console.log((await page.locator('body').innerText()).slice(0, 5000)); }
    await writeFile(`${output}/result.json`, JSON.stringify({ evidence: '격리 mock API · Chromium synthetic Auth/REST + real creator dispatcher. Not live Supabase/RLS, not real device or observed user validation.',
      stage, sourceSlug, sourceItemCount: source.items.length, checks, checkCount: checks.length, commands, mutations: mutationCount, injectedFailures, screenshots,
      sourceCatalogUnchanged: hash(account.space.catalogLibrary) === originalCatalogHash,
      remoteRequestsForwarded: 0, actualUserAccountsUsed: 0, credentialsRead: false,
      pageErrors: mocked.pageErrors, consoleErrors: mocked.consoleErrors, unexpectedApi, unexpectedExternal, storageAudits, interactionTimings }, null, 2));
    await writeFile(`${output}/storage-diagnostics.json`, JSON.stringify(await page.evaluate(() => ({
      failures: (window as unknown as { __catalogStorageFailures: unknown[] }).__catalogStorageFailures,
      sessionValues: Object.keys(sessionStorage).map(key => ({ key, chars: sessionStorage.getItem(key)?.length ?? 0 })),
    })), null, 2));
    await browser.close(); console.log(JSON.stringify({ output, stage, checks: checks.length }));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'isolated-browser-failed'); process.exitCode = 1; });
