import { test, expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import { login, users } from './alpha-auth.fixture';
import { mockParticipationDraft, mockVersionedPublicEntry, versionedPublicIds, versionedPublicTitle } from './ux-comparison-gaps.fixture';
import { mockFolderContentEntry, folderIds } from './folder-content-entry.fixture';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import { releaseResourceTarget, releaseQaLocalPort, RELEASE_ORIGIN, type ReleaseQaMode } from './cloudflare-release.fixture';
import { loadUxExactBuild, assertUxObservedAssets, type UxExactBuild } from './ux-exact-build';

let exactBuild: UxExactBuild;

test.beforeAll(async () => {
  const mode = (process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local') as ReleaseQaMode;
  const target = releaseResourceTarget(`${RELEASE_ORIGIN}/alpha`, 'GET', mode,
    releaseQaLocalPort(process.env.FLOWME_CLOUDFLARE_QA_LOCAL_PORT));
  if (!target) throw Error('comparison-preflight-target-rejected');
  exactBuild = loadUxExactBuild(process.env);
  const buildId = exactBuild.buildId;
  const response = await fetch(target, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' } });
  expect(response.status, 'Read-only document preflight').toBe(200);
  const html = await response.text();
  expect(html.includes(buildId), 'Document must match the exact local or frozen build').toBe(true);
  if (mode === 'local') {
    expect(html.includes('sb_publishable_synthetic_release'), 'Synthetic QA auth config must be enabled before browser interaction').toBe(true);
    expect(html.includes('개발계 연결이 꺼져 있습니다'), 'The QA login gate must not be disabled').toBe(false);
  }
});

async function hit(target: Locator, input: 'pointer' | 'keyboard' = 'pointer') {
  await expect(target).toBeVisible(); await target.scrollIntoViewIfNeeded();
  await target.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await expect.poll(() => target.evaluate(node => { const r = node.getBoundingClientRect(), h = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return r.width>0 && r.height>0 && r.left>=0 && r.top>=0 && r.right<=innerWidth && r.bottom<=innerHeight && !!h && (h===node || node.contains(h)); })).toBe(true);
  if (input === 'keyboard') { await target.focus(); await expect(target).toBeFocused(); await target.press('Enter'); }
  else await target.click();
}
async function boot(page: Page) {
  await page.goto('/alpha'); await login(page);
  await expect(page.getByRole('navigation',{ name:'작업 공간',exact:true })).toBeVisible();
}
const composer = (page: Page) => page.getByRole('region',{name:'글 작성',exact:true});
const bodyField = (page: Page) => composer(page).getByRole('textbox',{name:'내용',exact:true});
async function writeQuestion(page: Page, mock: Awaited<ReturnType<typeof mockParticipationDraft>>) {
  await boot(page);
  await hit(page.getByRole('navigation',{name:'작업 공간',exact:true}).getByRole('button',{name:'둘러보기',exact:true}));
  await hit(page.getByRole('navigation',{name:'둘러보기 종류',exact:true}).getByRole('button',{name:'경험·질문·지식',exact:true}));
  await hit(page.getByRole('region',{name:'이야기',exact:true}).getByRole('button',{name:'글 쓰기',exact:true}));
  await expect(composer(page)).toBeVisible();
  await expect.poll(async () => (await mock.current()).space.participationDrafts.length).toBe(1);
  await composer(page).getByLabel('제목',{exact:true}).fill('합성 질문: 일정 작성 순서');
  await expect.poll(async () => (await mock.current()).space.participationDrafts[0]?.title).toBe('합성 질문: 일정 작성 순서');
  await expect(composer(page).getByText('계정에 초안 저장됨',{exact:true})).toBeVisible();
}
async function record(page: Page, info: TestInfo) {
  const geometry = await page.evaluate(() => ({ width:innerWidth,height:innerHeight,
    overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth }));
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  await info.attach('viewport', {contentType:'application/json',body:JSON.stringify(geometry)});
  await page.screenshot({path:info.outputPath('final.png'),fullPage:true});
}
async function captureDraftRefusal(page: Page, info: TestInfo, name: string) {
  const retry = composer(page).getByRole('button',{name:'초안 저장 다시 시도',exact:true});
  const alert = composer(page).getByRole('alert',{name:'초안 저장 복구',exact:true});
  await expect(alert).toHaveText('초안을 저장하지 못했습니다. 입력은 남아 있습니다.초안 저장 다시 시도');
  await expect(alert).not.toContainText('새로고침');
  await expect(alert).toHaveAttribute('data-draft-save-state','rejected');
  await expect(composer(page).getByText('저장하지 못했어요',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('region',{name:'거절된 저장과 입력 보호',exact:true})).toHaveCount(0);
  await expect(retry).toBeEnabled();
  await retry.scrollIntoViewIfNeeded();
  await retry.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  for (const control of [alert,retry]) await expect.poll(()=>control.evaluate(node=>{
    const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    const points=[[x,y],[x,r.top+1],[x,r.bottom-1],[r.left+1,y],[r.right-1,y]];
    return r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&points.every(([px,py])=>{
      const hit=document.elementFromPoint(px,py);return !!hit&&(hit===node||node.contains(hit));});
  })).toBe(true);
  await page.screenshot({path:info.outputPath(`${name}.png`),fullPage:false});
  await info.attach(name,{contentType:'application/json',body:JSON.stringify({viewport:page.viewportSize(),
    state:'rejected',errorNotice:await alert.innerText(),retainedInput:await bodyField(page).inputValue(),retryEnabled:true,
    duplicateFailedSaveStatus:0,duplicateGlobalRecoveryPanel:0,noticeAndRetryWithinViewport:true,sampledOcclusionPoints:5,viewportScreenshot:true,
    noticeBounds:await alert.boundingBox(),retryBounds:await retry.boundingBox(),activationDuringCapture:false})});
}
async function captureDraftRecovery(page: Page, info: TestInfo, state: 'unknown' | 'confirmed-unsaved', name: string) {
  const notice = composer(page).locator(`[data-draft-save-state="${state}"]`);
  const action = notice.getByRole('button');
  await expect(notice).toHaveCount(1); await expect(action).toHaveCount(1); await expect(action).toBeEnabled();
  await expect(composer(page).getByRole('button',{name:'초안 저장 다시 시도',exact:true})).toHaveCount(0);
  await expect(composer(page).getByText('저장하지 못했어요',{exact:true})).toHaveCount(0);
  for (const label of ['저장 결과 복구','거절된 저장과 입력 보호','다른 기기 변경과 입력 보호'])
    await expect(page.getByRole('region',{name:label,exact:true})).toHaveCount(0);
  await notice.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  for (const control of [notice,action]) await expect.poll(()=>control.evaluate(node=>{
    const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    const points=[[x,y],[x,r.top+1],[x,r.bottom-1],[r.left+1,y],[r.right-1,y]];
    return r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight
      &&points.every(([px,py])=>{const top=document.elementFromPoint(px,py);return !!top&&(top===node||node.contains(top));});
  })).toBe(true);
  await page.screenshot({path:info.outputPath(`${name}.png`),fullPage:false});
  await info.attach(name,{contentType:'application/json',body:JSON.stringify({viewport:page.viewportSize(),state,
    notice:await notice.innerText(),action:await action.innerText(),retainedInput:await bodyField(page).inputValue(),
    selection:await bodyField(page).evaluate((node:HTMLTextAreaElement)=>({start:node.selectionStart,end:node.selectionEnd})),
    noticeAndActionWithinViewport:true,sampledOcclusionPoints:5,duplicateGlobalRecoveryPanel:0,genericCurrentInputRetry:0,activationDuringCapture:false})});
}
async function verifyAssets(info: TestInfo) {
  const boundary = info.attachments.find(value => value.name === 'release-boundary');
  expect(boundary?.body).toBeDefined(); const parsed = JSON.parse(boundary!.body!.toString());
  assertUxObservedAssets(exactBuild, parsed.assets);
  await info.attach('exact-asset-check',{contentType:'application/json',body:JSON.stringify({root:exactBuild.providedRoot,
    head:exactBuild.head,qaRoot:exactBuild.qaRoot,qaHead:exactBuild.qaHead,buildId:exactBuild.buildId,
    scenarioSourceSha256:exactBuild.qaInputs.find(file=>file.path==='tests/e2e/ux-comparison-gaps.browser.ts')!.sha256,
    compileInputs:exactBuild.compileInputs.length,qaInputs:exactBuild.qaInputs.length,staticAssets:exactBuild.staticAssets.length,
    assets:parsed.assets.length,drift:0})});
}

test('UC1 ordinary memo and same Item survive document→period→reload', async ({page},info) => {
  const mock = await mockFolderContentEntry(page,{creatorExecution:true,prepareAccount:account=>{
    const docId=account.space.text.documents[0].id;
    const raw=`${M.raw(account.space.text.documents[0])}\n[2026-10-16]\n- [ ] 합성 등록 확인 부모\n  - [ ] 합성 등록 확인 하위\n- [ ] 합성 신규 하위 부모\n  - [ ] 합성 신규 하위\n[미정]`;
    let text=M.editText(account.space.text,docId,raw);
    text=M.editText(text,docId,raw.replace('  - [ ] 합성 등록 확인 하위','합성 루트 메모\n\n  - [ ] 합성 등록 확인 하위'));
    text=M.editText(text,docId,raw);
    const child=M.tasks(text).find(task=>task.title==='합성 등록 확인 하위')!;
    text=M.recordProgress(text,child.id,'2026-10-02',40);
    expect(M.validate(text)).toBe(true);
    return {...account,space:{...account.space,text}};
  }}); await boot(page);
  const editor = page.getByRole('region',{name:'개인 문서 편집',exact:true});
  const area = editor.locator('textarea'); const before = await mock.current(), doc = before.space.text.documents[0];
  const old = M.tasks(before.space.text).find(value => value.docId === doc.id)!;
  const registrationNote='이 하위 항목은 별도 할 일로 등록돼 있습니다. 들여쓰기를 바꿔도 등록과 진행 기록은 유지됩니다.';
  const menuBefore=await mock.current(), menuCounts=mock.diagnostics(), menuCommands=mock.commands.length;
  await expect(editor.getByText(registrationNote,{exact:true})).not.toBeVisible();
  for (const [title,registered] of [['합성 등록 확인 하위',true],['합성 신규 하위',false]] as const) {
    const meta=M.rowMeta(before.space.text,doc.id).find(row=>row.title===title)!;
    expect(meta.kind).toBe('subcheck'); expect(meta.isCanonical).toBe(registered);
    const offset=M.raw(doc).split('\n').slice(0,meta.index).join('\n').length+1;
    await area.focus(); await area.evaluate((value:HTMLTextAreaElement,at)=>value.setSelectionRange(at+3,at+3),offset);
    await area.press('ArrowLeft');
    const menuSelection=await area.evaluate((value:HTMLTextAreaElement)=>({start:value.selectionStart,end:value.selectionEnd,direction:value.selectionDirection}));
    await hit(editor.getByRole('button',{name:`${meta.index+1}행 메뉴`,exact:true}),'keyboard');
    const rowMenu=page.getByRole('dialog'); await expect(rowMenu).toBeVisible();
    await expect(rowMenu.locator('p').filter({hasText:title})).toHaveText(title);
    await expect(rowMenu.getByRole('heading',{name:'추가·연결',exact:true})).toBeVisible();
    await expect(rowMenu.getByRole('heading',{name:'문서 구조',exact:true})).toBeVisible();
    if (registered) {
      await expect(rowMenu.getByRole('heading',{name:'진행·날짜',exact:true})).toBeVisible();
      const headings=await rowMenu.getByRole('heading',{level:4}).allTextContents();
      expect(headings).toEqual(['진행·날짜','추가·연결','문서 구조']);
      await expect(rowMenu.getByText(registrationNote,{exact:true})).toBeVisible();
      const geometry=await rowMenu.evaluate(node=>({width:node.scrollWidth,height:node.scrollHeight,clientWidth:node.clientWidth,clientHeight:node.clientHeight}));
      expect(geometry.width-geometry.clientWidth).toBeLessThanOrEqual(1);
      await page.screenshot({path:info.outputPath('uc1-registered-subcheck-menu.png'),fullPage:false});
      const enabledButtons: Locator[] = [];
      for (const button of await rowMenu.getByRole('button').all()) if (!await button.isDisabled()) enabledButtons.push(button);
      expect(enabledButtons.length).toBeGreaterThan(2);
      await expect(enabledButtons[0]).toBeFocused();
      const buttonNames: string[] = [];
      const focusCues: {name:string;focusVisible:boolean;outlineStyle:string;outlineWidth:string;outlineColor:string}[] = [];
      for (const button of [...enabledButtons.slice(1),enabledButtons[0]]) {
        await page.keyboard.press('Tab'); await expect(button).toBeFocused();
        await expect.poll(()=>button.evaluate(node=>{const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
          const points=[[x,y],[x,r.top+1],[x,r.bottom-1],[r.left+1,y],[r.right-1,y]];
          return r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&points.every(([px,py])=>{
            const hit=document.elementFromPoint(px,py);return !!hit&&(hit===node||node.contains(hit));});})).toBe(true);
        const name=await button.getAttribute('aria-label') ?? (await button.innerText()).trim();
        const cue=await button.evaluate(node=>{const style=getComputedStyle(node);return {focusVisible:node.matches(':focus-visible'),
          outlineStyle:style.outlineStyle,outlineWidth:style.outlineWidth,outlineColor:style.outlineColor};});
        expect(cue.focusVisible).toBe(true);expect(cue.outlineStyle).not.toBe('none');expect(parseFloat(cue.outlineWidth)).toBeGreaterThan(0);
        buttonNames.push(name);focusCues.push({name,...cue});
        if (button === enabledButtons.at(-1)) await page.screenshot({path:info.outputPath('uc1-menu-final-action-focused.png'),fullPage:false});
      }
      await page.keyboard.press('Shift+Tab'); await expect(enabledButtons.at(-1)!).toBeFocused();
      const reverseFocusCue = await enabledButtons.at(-1)!.evaluate(node=>{
        const r=node.getBoundingClientRect(),style=getComputedStyle(node),x=r.x+r.width/2,y=r.y+r.height/2;
        const points=[[x,y],[x,r.top+1],[x,r.bottom-1],[r.left+1,y],[r.right-1,y]];
        return {withinViewport:r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,
          unobscured:points.every(([px,py])=>{const hit=document.elementFromPoint(px,py);return !!hit&&(hit===node||node.contains(hit));}),
          focusVisible:node.matches(':focus-visible'),outlineStyle:style.outlineStyle,outlineWidth:style.outlineWidth};
      });
      expect(reverseFocusCue.withinViewport).toBe(true); expect(reverseFocusCue.unobscured).toBe(true);
      expect(reverseFocusCue.focusVisible).toBe(true); expect(reverseFocusCue.outlineStyle).not.toBe('none');
      expect(parseFloat(reverseFocusCue.outlineWidth)).toBeGreaterThan(0);
      await page.screenshot({path:info.outputPath('uc1-menu-reverse-wrap-focused.png'),fullPage:false});
      await page.keyboard.press('Tab'); await expect(enabledButtons[0]).toBeFocused();
      await info.attach('uc1-registration-menu-viewport',{contentType:'application/json',body:JSON.stringify({
        viewport:page.viewportSize(),horizontalOverflow:geometry.width-geometry.clientWidth,keyboardTabCycle:true,reverseEndpointWrap:true,
        enabledButtons:enabledButtons.length,buttonNames,focusCues,reverseFocusCue,viewportScreenshot:true,sampledOcclusionPoints:5,activationDuringTabCycle:false})});
    } else await expect(rowMenu.getByText(registrationNote,{exact:true})).not.toBeVisible();
    await page.keyboard.press('Escape'); await expect(rowMenu).not.toBeVisible();
    await expect(area).toBeFocused();
    await expect.poll(()=>area.evaluate((value:HTMLTextAreaElement)=>({start:value.selectionStart,end:value.selectionEnd,direction:value.selectionDirection}))).toEqual(menuSelection);
    expect(await mock.current()).toEqual(menuBefore); expect(mock.diagnostics()).toEqual(menuCounts); expect(mock.commands).toHaveLength(menuCommands);
    await expect(area).toHaveValue(M.raw(doc));
  }
  await info.attach('uc1-registration-note',{contentType:'application/json',body:JSON.stringify({contextualOnly:true,
    freshSubcheckExcluded:true,zeroWriteMenuAndEscape:true,historyPreserved:true,keyboardMenu:true,escapeFocusAndSelectionRestored:true})});
  await area.fill(`${M.raw(doc)}\n일반 메모를 할 일로 바꾸지 않습니다.`);
  await expect.poll(async () => M.raw((await mock.current()).space.text.documents[0])).toContain('일반 메모를 할 일로 바꾸지 않습니다.');
  await expect(editor.getByRole('status').filter({hasText:/^저장됨$/})).toBeVisible();
  const saved = await mock.current(); expect(M.tasks(saved.space.text).map(value=>value.id)).toEqual(M.tasks(before.space.text).map(value=>value.id));
  await hit(page.getByRole('navigation',{name:'개인공간 보기',exact:true}).getByRole('button',{name:'전체 할 일',exact:true}));
  await expect(page.locator(`li[data-task-id="${old.id}"]`)).toBeVisible();
  const views = page.getByRole('navigation',{name:'개인공간 보기',exact:true}), title = '합성 신규 작성 할 일';
  await hit(views.getByRole('button',{name:'문서',exact:true}));
  const oldIds = M.tasks(saved.space.text).map(value=>value.id), authoredRaw = `${M.raw(saved.space.text.documents[0])}\n- [ ] ${title}`;
  await area.fill(authoredRaw);
  await expect.poll(async()=>M.raw((await mock.current()).space.text.documents[0])).toBe(authoredRaw);
  await expect(editor.getByRole('status').filter({hasText:/^저장됨$/})).toBeVisible();
  const authored = await mock.current(), task = M.tasks(authored.space.text).find(value=>value.title===title)!;
  expect(task.docId).toBe(doc.id); expect(oldIds).not.toContain(task.id);
  expect(M.tasks(authored.space.text).map(value=>value.id).filter(id=>id!==task.id)).toEqual(oldIds);
  expect(task.date).toBeNull(); expect(task.time).toBeNull();
  await hit(views.getByRole('button',{name:'전체 할 일',exact:true}));
  const row = page.locator(`li[data-task-id="${task.id}"]`), dialog = page.getByRole('dialog');
  await hit(row.getByRole('button',{name:`${title} 작업`,exact:true}));
  const beforeCancel = await mock.current(), cancelCounts = mock.diagnostics(), cancelCommands = mock.commands.length;
  await dialog.getByLabel('실행 날짜',{exact:true}).fill('2026-10-02'); await dialog.getByLabel(/^시간/).fill('14:20');
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  expect(await mock.current()).toEqual(beforeCancel); expect(mock.diagnostics()).toEqual(cancelCounts); expect(mock.commands).toHaveLength(cancelCommands);
  await hit(row.getByRole('button',{name:`${title} 작업`,exact:true}));
  await expect(dialog.getByLabel('실행 날짜',{exact:true})).toHaveValue(''); await expect(dialog.getByLabel(/^시간/)).toHaveValue('');
  await dialog.getByLabel('실행 날짜',{exact:true}).fill('2026-10-02'); await dialog.getByLabel(/^시간/).fill('14:20');
  await hit(dialog.getByRole('button',{name:'날짜·시간 적용',exact:true}));
  await expect.poll(async()=>M.tasks((await mock.current()).space.text).find(value=>value.id===task.id)?.date).toBe('2026-10-02');
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await hit(views.getByRole('button',{name:'주간',exact:true})); await page.getByLabel('조회 날짜',{exact:true}).fill('2026-10-02');
  await expect(row).toBeVisible(); await expect(row).toContainText('2026-10-02 · 14:20');
  await hit(row.getByRole('button',{name:`${title} 완료`,exact:true}));
  await expect.poll(async()=>M.tasks((await mock.current()).space.text).find(value=>value.id===task.id)?.done).toBe(true);
  await expect(row.getByRole('button',{name:`${title} 다시 열기`,exact:true})).toHaveAttribute('aria-pressed','true');
  const completed = await mock.current(), finalTask = M.tasks(completed.space.text).find(value=>value.id===task.id)!;
  const history = M.progressHistory(completed.space.text,task.id); expect(history).toHaveLength(1); expect(history[0].percent).toBe(100);
  const returnCounts = mock.diagnostics();
  await hit(row.getByRole('button',{name:new RegExp(`^${title} 2026-10-02`)}));
  await expect(area).toBeFocused();
  await expect.poll(()=>area.evaluate((value:HTMLTextAreaElement)=>value.value.slice(0,value.selectionStart).split('\n').length-1)).toBe(finalTask.sourceIndex);
  expect(await mock.current()).toEqual(completed); expect(mock.diagnostics()).toEqual(returnCounts);
  expect(finalTask.docId).toBe(task.docId); expect(finalTask.folderId).toBe(task.folderId); expect(finalTask.scopeId).toBe(task.scopeId);
  expect(M.raw(completed.space.text.documents[0])).toContain('일반 메모를 할 일로 바꾸지 않습니다.');
  expect(M.tasks(completed.space.text).map(value=>value.id).filter(id=>id!==task.id)).toEqual(oldIds);
  await page.screenshot({path:info.outputPath('uc1-authored-item-source-return.png'),fullPage:true});
  await page.reload(); await expect(editor).toBeVisible();
  await expect(area).toHaveValue(M.raw(completed.space.text.documents[0]));
  await hit(views.getByRole('button',{name:'전체 할 일',exact:true})); await expect(row).toBeVisible();
  expect(M.progressHistory((await mock.current()).space.text,task.id)).toEqual(history); expect(await mock.current()).toEqual(completed);
  await info.attach('uc1-authored-item',{contentType:'application/json',body:JSON.stringify({taskId:task.id,docId:task.docId,
    sourceIndex:finalTask.sourceIndex,preservedOldIds:oldIds,history,diagnostics:mock.diagnostics()})});
  await record(page,info); await mock.assertBoundary(info); await verifyAssets(info);
});

test('UC2 public selected version is found and reused without changing its source', async ({page},info) => {
  const mock = await mockVersionedPublicEntry(page); await boot(page);
  const before = await mock.current(), startCounts = mock.diagnostics(), publicBefore = JSON.stringify(mock.context.public);
  expect(mock.context.public.flows[0].currentVersionId).toBe(versionedPublicIds.current);
  expect(mock.context.public.versions.map(value=>({id:value.id,parentVersionId:value.parentVersionId}))).toEqual([
    {id:versionedPublicIds.old,parentVersionId:null},{id:versionedPublicIds.current,parentVersionId:versionedPublicIds.old}]);
  await hit(page.getByRole('navigation',{name:'작업 공간',exact:true}).getByRole('button',{name:'둘러보기',exact:true}));
  const discovery = page.getByTestId('program-discovery');
  await expect(discovery.getByRole('heading',{name:'Flow 찾기',exact:true})).toBeVisible();
  await expect(discovery).not.toContainText(before.space.text.documents[0].title);
  await hit(discovery.getByRole('button',{name:'내 문서 보기',exact:true}),'keyboard');
  await expect(page.getByRole('region',{name:'개인 문서 편집',exact:true}).locator('textarea')).toHaveValue(M.raw(before.space.text.documents[0]));
  expect(await mock.current()).toEqual(before); expect(mock.commands).toHaveLength(0); expect(mock.diagnostics()).toEqual(startCounts);
  await hit(page.getByRole('navigation',{name:'작업 공간',exact:true}).getByRole('button',{name:'둘러보기',exact:true}));
  await discovery.getByRole('searchbox',{name:'공개 Flow 검색',exact:true}).fill('결과 없는 합성 공개 검색어');
  await expect(discovery.getByRole('heading',{name:'맞는 자료가 없습니다',exact:true})).toBeVisible();
  await expect(discovery.getByRole('heading',{name:'아직 공개된 Flow가 없어요',exact:true})).toHaveCount(0);
  await expect(discovery).not.toContainText(before.space.text.documents[0].title);
  await page.screenshot({path:info.outputPath('uc2-public-search-empty.png'),fullPage:true});
  await hit(discovery.getByRole('button',{name:'검색 조건 지우기',exact:true}),'keyboard');
  await expect(discovery.getByRole('searchbox',{name:'공개 Flow 검색',exact:true})).toHaveValue('');
  expect(await mock.current()).toEqual(before); expect(mock.commands).toHaveLength(0); expect(mock.diagnostics()).toEqual(startCounts);
  await hit(discovery.getByRole('button',{name:versionedPublicTitle,exact:true}));
  const detail = page.getByTestId('program-flow-detail'); await expect(detail).toBeVisible();
  const version = detail.getByRole('combobox',{name:'읽는 판본',exact:true});
  await expect(version).toHaveValue(versionedPublicIds.current); await expect(detail).toContainText('합성 최신 판본 변경 항목');
  await version.selectOption(versionedPublicIds.old); await expect(version).toHaveValue(versionedPublicIds.old);
  await expect(detail).toContainText('합성 이전 판본 준비 항목'); await expect(detail).not.toContainText('합성 최신 판본 변경 항목');
  expect(await mock.current()).toEqual(before); expect(mock.commands).toHaveLength(0); expect(mock.diagnostics()).toEqual(startCounts);
  const downloadEvent = page.waitForEvent('download'); await hit(detail.getByRole('button',{name:'TXT 파일 받기',exact:true}));
  const download = await downloadEvent, stream = await download.createReadStream(); expect(stream).not.toBeNull();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const payload = Buffer.concat(chunks).toString('utf8'), returnUrl = payload.match(/https:\/\/alpha\.wikiplans\.com\/alpha#flowme\/[^\s]+/)?.[0];
  expect(payload).toContain('합성 이전 판본 준비 항목'); expect(payload).not.toContain('합성 최신 판본 변경 항목'); expect(returnUrl).toBeTruthy();
  expect(decodeURIComponent(returnUrl!)).toContain(versionedPublicIds.old);
  expect(await mock.current()).toEqual(before); expect(mock.commands).toHaveLength(0); expect(mock.diagnostics()).toEqual(startCounts);
  await page.goto(returnUrl!); await expect(detail).toContainText('출력한 공개 판본의 같은 항목으로 돌아왔습니다.');
  await expect(version).toHaveValue(versionedPublicIds.old);
  await expect(page.locator(`[id="program-public-item-${versionedPublicIds.old}-${versionedPublicIds.item}"]`)).toHaveAttribute('aria-current','location');
  await hit(detail.getByRole('button',{name:'← Flow 목록',exact:true})); await expect(discovery).toBeVisible();
  expect(await mock.current()).toEqual(before); expect(mock.commands).toHaveLength(0); expect(mock.diagnostics()).toEqual(startCounts);
  await hit(discovery.getByRole('button',{name:versionedPublicTitle,exact:true}));
  await version.selectOption(versionedPublicIds.old); await expect(version).toHaveValue(versionedPublicIds.old);
  await page.screenshot({path:info.outputPath('uc2-selected-retained-version.png'),fullPage:true});
  await hit(detail.getByRole('button',{name:'내 문서에 가져오기',exact:true}));
  await expect.poll(async () => (await mock.current()).space.copies.length).toBe(1);
  const copy = (await mock.current()).space.copies[0]; expect(copy.flowId).toBe(versionedPublicIds.flow);
  expect(copy.baseVersionId).toBe(versionedPublicIds.old); expect(copy.includedItemIds).toEqual([versionedPublicIds.item]);
  const copySource = JSON.stringify({id:copy.id,flowId:copy.flowId,baseVersionId:copy.baseVersionId,itemLines:copy.itemLines});
  await hit(page.getByRole('navigation',{name:'작업 공간',exact:true}).getByRole('button',{name:'내 공간',exact:true}));
  await hit(page.getByRole('navigation',{name:'개인공간 보기',exact:true}).getByRole('button',{name:'전체 할 일',exact:true}));
  const taskId = copy.itemLines[versionedPublicIds.item], row = page.locator(`li[data-task-id="${taskId}"]`);
  await expect(row).toContainText('합성 이전 판본 준비 항목'); await expect(row).not.toContainText('합성 최신 판본 변경 항목');
  await hit(row.getByRole('button',{name:'합성 이전 판본 준비 항목 완료',exact:true}));
  await expect.poll(async()=>M.tasks((await mock.current()).space.text).find(task=>task.id===taskId)?.done).toBe(true);
  await expect(row.getByRole('button',{name:'합성 이전 판본 준비 항목 다시 열기',exact:true})).toHaveAttribute('aria-pressed','true');
  const savedCopy = (await mock.current()).space.copies[0];
  expect(JSON.stringify({id:savedCopy.id,flowId:savedCopy.flowId,baseVersionId:savedCopy.baseVersionId,itemLines:savedCopy.itemLines})).toBe(copySource);
  expect(JSON.stringify(mock.context.public)).toBe(publicBefore);
  expect(mock.diagnostics()).toEqual({mutations:2,operations:2}); expect(mock.commands).toHaveLength(2);
  expect(mock.commands[0].kind).toBe('social');
  await info.attach('uc2-exact-selected-version',{contentType:'application/json',body:JSON.stringify({selectedVersionId:copy.baseVersionId,
    currentVersionId:versionedPublicIds.current,taskId,copySource,downloadedSelectedVersion:true,returnUrl,zeroWriteReadOutputAndAbandonment:true})});
  await record(page,info); await mock.assertBoundary(info); await verifyAssets(info);
});

test('UC3 definitive draft rejection→modify→second refusal→direct resave preserves input and source', async ({page},info) => {
  const mock = await mockParticipationDraft(page); await writeQuestion(page,mock);
  const before = await mock.current(), counts = mock.diagnostics();
  mock.rejectNextBody('거절될 합성 초안');
  await bodyField(page).fill('거절될 합성 초안');
  await expect.poll(()=>mock.rejected()).not.toBeNull();
  await expect(composer(page).locator('[data-draft-save-state="rejected"]')).toBeVisible();
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(counts);
  await expect(bodyField(page)).toHaveValue('거절될 합성 초안');
  await expect(page.getByRole('region',{name:'다른 기기 변경과 입력 보호',exact:true})).not.toBeVisible();
  await captureDraftRefusal(page,info,'uc3-refused-input-and-retry');
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(counts);
  const firstRefusal = mock.rejected()!;
  mock.rejectNextBody('수정해 다시 보관한 합성 초안');
  await bodyField(page).fill('수정해 다시 보관한 합성 초안');
  await expect.poll(()=>mock.rejected()?.requestId).not.toBe(firstRefusal.requestId);
  await expect(composer(page).locator('[data-draft-save-state="rejected"]')).toBeVisible();
  await expect(bodyField(page)).toHaveValue('수정해 다시 보관한 합성 초안');
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(counts);
  await captureDraftRefusal(page,info,'uc3-corrected-refused-input-and-retry');
  const secondRefusal = mock.rejected()!, commandsBeforeDirect = mock.commands.length;
  await hit(page.getByRole('button',{name:'초안 저장 다시 시도',exact:true}));
  await expect.poll(async () => (await mock.current()).space.participationDrafts[0]?.body).toBe('수정해 다시 보관한 합성 초안');
  await expect(composer(page).getByText('계정에 초안 저장됨',{exact:true})).toBeVisible();
  expect(mock.commands).toHaveLength(commandsBeforeDirect + 1);
  expect(mock.commands.at(-1)!.requestId).not.toBe(secondRefusal.requestId);
  expect(secondRefusal.requestId).not.toBe(firstRefusal.requestId);
  await info.attach('uc3-corrected-direct-save',{contentType:'application/json',body:JSON.stringify({
    firstRefusalRequestId:firstRefusal.requestId,correctedRefusalRequestId:secondRefusal.requestId,
    directSaveRequestId:mock.commands.at(-1)!.requestId,successfulDirectExecutions:1,
    correctedInput:'수정해 다시 보관한 합성 초안',draftId:before.space.participationDrafts[0].id,
    automaticCorrectionWasRejected:true,explicitPointerRetry:true})});
  const after = await mock.current(); expect(after.space.text).toEqual(before.space.text);
  await expect(page.getByRole('region',{name:'이야기',exact:true}).getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'초안 저장 다시 시도',exact:true})).toHaveCount(0);
  expect(after.space.participationDrafts[0].id).toBe(before.space.participationDrafts[0].id);
  expect(after.space.participationDrafts[0].flowId).toBeNull();
  await page.reload(); await expect(page.getByRole('region',{name:'다른 기기 변경과 입력 보호',exact:true})).not.toBeVisible();
  expect((await mock.current()).space.participationDrafts[0].body).toBe('수정해 다시 보관한 합성 초안');
  await record(page,info); await mock.assertBoundary(info); await verifyAssets(info);
});

test('UC4 unknown receipt keeps modified input and settles only the original request', async ({page},info) => {
  const mock = await mockParticipationDraft(page); await writeQuestion(page,mock);
  mock.loseNextBody('응답이 유실될 합성 초안');
  await bodyField(page).fill('응답이 유실될 합성 초안');
  await expect.poll(()=>mock.lost()).not.toBeNull();
  const recovery = composer(page).locator('[data-draft-save-state="unknown"]'); await expect(recovery).toBeVisible();
  const before = mock.commands.length, counts = mock.diagnostics();
  await bodyField(page).fill('확인 전 추가한 입력');
  await expect(recovery).toContainText('이전 요청이 저장됐는지 확인해야 합니다. 지금 입력은 그대로 둡니다.');
  expect(mock.commands).toHaveLength(before); expect(mock.diagnostics()).toEqual(counts);
  await expect(page.getByRole('region',{name:'이야기',exact:true}).getByRole('alert')).not.toContainText('초안을 저장하지 못했습니다. 입력은 남아 있습니다.');
  await expect(bodyField(page)).toHaveValue('확인 전 추가한 입력');
  await captureDraftRecovery(page,info,'unknown','uc4-unknown-original-request');
  mock.revealReceipt(); await hit(recovery.getByRole('button',{name:'이전 요청 저장 결과 확인',exact:true}),'keyboard');
  await expect(recovery).not.toBeVisible(); expect(mock.commands).toHaveLength(before);
  expect(mock.lookups.length, 'The original request receipt was actually queried').toBeGreaterThan(0);
  expect(mock.lookups.every(id=>id===mock.lost()!.requestId)).toBe(true);
  await expect(bodyField(page)).toHaveValue('확인 전 추가한 입력');
  const confirmed = composer(page).locator('[data-draft-save-state="confirmed-unsaved"]');
  await expect(confirmed).toContainText('이전 요청은 저장됐습니다. 그 뒤에 쓴 입력은 아직 저장되지 않았습니다.');
  await expect(confirmed.getByRole('button',{name:'추가 입력 보관 후 저장본 열기',exact:true})).toBeVisible();
  await expect(composer(page).getByText('계정에 초안 저장됨',{exact:true})).toHaveCount(0);
  await captureDraftRecovery(page,info,'confirmed-unsaved','uc4-confirmed-original-new-input-unsaved');
  expect(mock.commands).toHaveLength(before); expect(mock.diagnostics()).toEqual(counts);
  expect((await mock.current()).space.participationDrafts[0].body).toBe('응답이 유실될 합성 초안');
  await record(page,info); await mock.assertBoundary(info); await verifyAssets(info);
});

test('UC5 direct retry of a definitively refused draft saves once without publishing', async ({page},info) => {
  const mock = await mockParticipationDraft(page); await writeQuestion(page,mock);
  const before = await mock.current(), counts = mock.diagnostics();
  mock.rejectNextBody('직접 다시 보관할 합성 초안');
  await bodyField(page).fill('직접 다시 보관할 합성 초안');
  await expect.poll(()=>mock.rejected()).not.toBeNull();
  await expect(composer(page).locator('[data-draft-save-state="rejected"]')).toBeVisible();
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(counts);
  const requests = mock.commands.length;
  await captureDraftRefusal(page,info,'uc5-refused-input-and-retry');
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(counts); expect(mock.commands).toHaveLength(requests);
  await hit(page.getByRole('button',{name:'초안 저장 다시 시도',exact:true}),'keyboard');
  await expect(composer(page).getByText('계정에 초안 저장됨',{exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'이야기',exact:true}).getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'초안 저장 다시 시도',exact:true})).toHaveCount(0);
  const after = await mock.current();
  expect(after.space.participationDrafts[0].body).toBe('직접 다시 보관할 합성 초안');
  expect(after.space.participationDrafts[0].id).toBe(before.space.participationDrafts[0].id);
  expect(after.space.text).toEqual(before.space.text);
  expect(mock.commands).toHaveLength(requests + 1);
  expect(mock.commands.at(-1)!.requestId).not.toBe(mock.rejected()!.requestId);
  await expect(page.getByRole('region',{name:'다른 기기 변경과 입력 보호',exact:true})).not.toBeVisible();
  await record(page,info); await mock.assertBoundary(info); await verifyAssets(info);
});

test('UC6 Dots R05 intersects folder period and search, escapes empty results, and preserves schedule identity', async ({page},info) => {
  const title = '합성 대표 문서', targetTitle = '합성 R05 대상', exceptionTitle = '합성 R05 개별 예외';
  const memo = '일반 메모는 날짜 구획 아래에서도 할 일이 아닙니다.';
  const mock = await mockFolderContentEntry(page,{creatorExecution:true,prepareAccount(account) {
    let text = M.addDocument(account.space.text,{title,folderId:folderIds.work});
    const documentId = text.documents.at(-1)!.id;
    text = M.editText(text,documentId,`[2026-10-02]\n- [ ] ${targetTitle}\n  - 시간: 09:10\n  - 메모: 같은 Item의 설명 보존\n- [ ] ${exceptionTitle}\n  - 날짜: 2026-10-09\n  - 시간: 11:20\n- [ ] 검색어 없는 할 일\n${memo}\n[2026-11-02]\n- [ ] 합성 R05 다른 기간`);
    text = M.addDocument(text,{title:'합성 다른 경로 문서',folderId:folderIds.homonym});
    text = M.editText(text,text.documents.at(-1)!.id,'[2026-10-02]\n- [ ] 합성 R05 다른 폴더');
    return {...account,space:{...account.space,text,position:{...account.space.position,documentId}}};
  }});
  await boot(page);
  const views = page.getByRole('navigation',{name:'개인공간 보기',exact:true});
  const folder = page.getByRole('combobox',{name:'폴더',exact:true});
  const search = page.getByRole('searchbox',{name:'내 문서·할 일 찾기',exact:true});
  const rows = page.locator('li[data-task-id]:visible');
  const row = (id: string) => page.locator(`li[data-task-id="${id}"]`);
  const before = await mock.current(), originalDoc = before.space.text.documents[0];
  const source = before.space.text.documents.find(doc=>doc.title===title)!;
  const originalTasks = M.tasks(before.space.text);
  const target = originalTasks.find(task=>task.title===targetTitle)!;
  const exception = originalTasks.find(task=>task.title===exceptionTitle)!;
  const otherQuery = originalTasks.find(task=>task.title==='검색어 없는 할 일')!;
  const otherPeriod = originalTasks.find(task=>task.title==='합성 R05 다른 기간')!;
  const otherFolder = originalTasks.find(task=>task.title==='합성 R05 다른 폴더')!;
  const startCounts = mock.diagnostics();
  const ids = (values: string[]) => expect.poll(async()=>rows.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-task-id')).sort())).toEqual([...values].sort());
  const chooseFolder = async (id: string) => {
    if (!await folder.isVisible()) await hit(page.getByRole('button',{name:/^문서·폴더 열기/}));
    await folder.selectOption(id); await expect(folder).toHaveValue(id);
  };
  const task = async (id: string) => M.tasks((await mock.current()).space.text).find(value=>value.id===id)!;
  const identity = (value: typeof target) => ({id:value.id,docId:value.docId,folderId:value.folderId,
    scopeId:value.scopeId,title:value.title,note:value.note,done:value.done,subchecks:value.subchecks});
  const dialog = page.getByRole('dialog');
  try {
    await test.step('folder, week and search intersect without a write; empty results expose filter escape',async()=>{
      expect(target.date).toBe('2026-10-02'); expect(target.explicitDate).toBe(false);
      expect(exception.date).toBe('2026-10-09'); expect(exception.explicitDate).toBe(true);
      await hit(views.getByRole('button',{name:'주간',exact:true}));
      await page.getByLabel('조회 날짜',{exact:true}).fill('2026-10-02');
      await chooseFolder(folderIds.work); await search.fill('합성 R05');
      await ids([target.id]);
      await expect(page.locator('[aria-label="할 일 조회 범위"]')).toContainText('회사 / 업무 · 하위 포함');
      await expect(page.locator('[aria-label="할 일 조회 범위"]')).toContainText('검색: 합성 R05');
      await search.fill(''); await ids([target.id,otherQuery.id]);
      await search.fill('합성 R05'); await chooseFolder(folderIds.homonym); await ids([otherFolder.id]);
      await chooseFolder(folderIds.work); await hit(views.getByRole('button',{name:'전체 할 일',exact:true}));
      await ids([target.id,exception.id,otherPeriod.id]);
      await hit(views.getByRole('button',{name:'주간',exact:true})); await ids([target.id]);
      await search.fill('결과 없는 합성 검색어'); await ids([]);
      await expect(page.getByText('현재 조회 조건에 맞는 할 일이 없습니다.',{exact:true})).toBeVisible();
      await hit(page.getByRole('button',{name:'전체 할 일에서 찾기',exact:true}),'keyboard');
      await expect(views.getByRole('button',{name:'전체 할 일',exact:true})).toHaveAttribute('aria-current','page');
      await expect(views.getByRole('button',{name:'전체 할 일',exact:true})).toBeFocused();
      await expect(folder).toHaveValue(folderIds.work); await expect(search).toHaveValue('결과 없는 합성 검색어');
      await ids([]);
      await expect(page.getByRole('button',{name:'전체 할 일에서 찾기',exact:true})).toHaveCount(0);
      expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(startCounts); expect(mock.commands).toHaveLength(0);
      await hit(views.getByRole('button',{name:'주간',exact:true}));
      await expect(page.getByLabel('조회 날짜',{exact:true})).toHaveValue('2026-10-02');
      await search.fill('합성 R05 다른 기간'); await ids([]);
      await hit(page.getByRole('button',{name:'전체 할 일에서 찾기',exact:true}),'keyboard'); await ids([otherPeriod.id]);
      await expect(folder).toHaveValue(folderIds.work); await expect(search).toHaveValue('합성 R05 다른 기간');
      await expect(views.getByRole('button',{name:'전체 할 일',exact:true})).toBeFocused();
      expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(startCounts); expect(mock.commands).toHaveLength(0);
      await hit(views.getByRole('button',{name:'주간',exact:true})); await search.fill('결과 없는 합성 검색어'); await ids([]);
      await hit(page.getByRole('button',{name:'필터 해제',exact:true}),'keyboard');
      await expect(folder).toHaveValue(''); await expect(search).toHaveValue('');
      await expect(views.getByRole('button',{name:'주간',exact:true})).toHaveAttribute('aria-current','page');
      await expect(page.getByLabel('조회 날짜',{exact:true})).toHaveValue('2026-10-02');
      await ids([target.id,otherQuery.id,otherFolder.id]);
      expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(startCounts);
      await page.screenshot({path:info.outputPath('r05-filter-escape.png'),fullPage:true});
    });
    await test.step('editing the date section updates inherited Items while the individual exception keeps its date',async()=>{
      await hit(views.getByRole('button',{name:'문서',exact:true}));
      const editor = page.getByRole('region',{name:'개인 문서 편집',exact:true});
      const area = editor.locator('[data-native-editor] textarea');
      await expect(area).toHaveValue(M.raw(source));
      await area.fill(M.raw(source).replace('[2026-10-02]','[2026-10-03]'));
      await expect.poll(async()=>(await task(target.id)).date).toBe('2026-10-03');
      await expect(editor.getByRole('status').filter({hasText:/^저장됨$/})).toBeVisible();
      expect((await task(exception.id)).date).toBe('2026-10-09');
      expect((await task(otherQuery.id)).date).toBe('2026-10-03');
      expect(M.tasks((await mock.current()).space.text).map(value=>value.id)).toEqual(originalTasks.map(value=>value.id));
      await hit(views.getByRole('button',{name:'전체 할 일',exact:true}));
      await hit(row(target.id).getByRole('button',{name:`${targetTitle} 작업`,exact:true}));
      await expect(dialog.locator('[aria-label="날짜 출처"]')).toContainText('구획 날짜 · 2026-10-03');
      await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
      await hit(row(exception.id).getByRole('button',{name:`${exceptionTitle} 작업`,exact:true}));
      await expect(dialog.locator('[aria-label="날짜 출처"]')).toContainText('개별 날짜 · 2026-10-09');
      await expect(dialog.locator('[aria-label="날짜 출처"]')).toContainText('구획 날짜 · 2026-10-03');
      await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
    });
    await test.step('date-only undated move preserves time; explicit empty date and time clears both on the same Item',async()=>{
      await hit(row(target.id).getByRole('button',{name:`${targetTitle} 작업`,exact:true}));
      await expect(dialog.getByLabel(/^시간/)).toHaveValue('09:10');
      await expect(dialog.getByText('날짜만 미정으로 옮기면 시간은 유지됩니다.',{exact:true})).toBeVisible();
      await hit(dialog.getByRole('button',{name:'날짜 미정으로 이동',exact:true}));
      await expect.poll(async()=>(await task(target.id)).date).toBeNull();
      expect((await task(target.id)).time).toBe('09:10');
      await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
      await hit(views.getByRole('button',{name:'날짜 미정',exact:true}));
      await expect(row(target.id)).toContainText('날짜 미정 · 09:10');
      await page.screenshot({path:info.outputPath('r05-undated-time-preserved.png'),fullPage:true});
      await hit(row(target.id).getByRole('button',{name:`${targetTitle} 작업`,exact:true}));
      await dialog.getByLabel('실행 날짜',{exact:true}).fill('');
      await dialog.getByLabel(/^시간/).fill('');
      await hit(dialog.getByRole('button',{name:'날짜·시간 적용',exact:true}),'keyboard');
      await expect.poll(async()=>(await task(target.id)).time).toBeNull();
      expect((await task(target.id)).date).toBeNull();
      await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
      await expect(row(target.id)).toContainText('날짜 미정'); await expect(row(target.id)).not.toContainText('09:10');
      const after = await mock.current();
      expect(identity(await task(target.id))).toEqual(identity(target));
      expect(identity(await task(exception.id))).toEqual(identity(exception));
      expect((await task(exception.id)).date).toBe('2026-10-09');
      expect((await task(exception.id)).time).toBe('11:20');
      expect((await task(otherQuery.id)).date).toBe('2026-10-03');
      expect(after.space.text.documents[0]).toEqual(originalDoc);
      expect(after.space.text.progressRecords).toEqual(before.space.text.progressRecords);
      expect(after.space.text.bindings).toEqual(before.space.text.bindings);
      expect(M.tasks(after.space.text).map(value=>value.id)).toEqual(originalTasks.map(value=>value.id));
      expect(M.raw(M.getDocument(after.space.text,source.id))).toContain(memo);
      expect(mock.diagnostics()).toEqual({mutations:startCounts.mutations+3,operations:startCounts.operations+3});
      await page.reload(); await expect(page.getByRole('region',{name:'개인 문서 편집',exact:true})).toBeVisible();
      await hit(views.getByRole('button',{name:'날짜 미정',exact:true}));
      await expect(row(target.id)).toBeVisible(); await expect(row(target.id)).not.toContainText('09:10');
      expect(await mock.current()).toEqual(after);
      await record(page,info);
    });
  } finally {
    await info.attach('r05-synthetic-state',{contentType:'application/json',body:JSON.stringify({
      taskId:target.id,docId:target.docId,before:{date:target.date,time:target.time},
      after:await task(target.id),diagnostics:mock.diagnostics(),
      clock:await page.evaluate(()=>({timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,localNow:new Date().toString()}))})});
    await mock.assertBoundary(info); await verifyAssets(info);
  }
});

test('UC7 restoration entry reopens after invalid-file cancellation and empty public list returns to private documents without a write', async ({page},info) => {
  const mock = await mockFolderContentEntry(page,{creatorExecution:true}); await boot(page);
  const before = await mock.current(), counts = mock.diagnostics(), commands = mock.commands.length;
  const management = page.locator('details[aria-label="계정 및 자료 관리"]');
  const managementSummary = management.locator(':scope > summary');
  // login() can already open this menu while verifying the exact account.
  // Establish a closed starting state before testing keyboard entry, rather
  // than blindly toggling a possibly open menu shut.
  if (await management.getAttribute('open') !== null) await hit(managementSummary,'keyboard');
  await expect(management).not.toHaveAttribute('open','');
  await hit(managementSummary,'keyboard');
  await expect(management).toHaveAttribute('open','');
  const entry = page.getByRole('button',{name:'백업 · 복원 · 가져오기',exact:true});
  await hit(entry,'keyboard');
  const dialog = page.getByRole('dialog',{name:'백업 · 복원 · 가져오기',exact:true});
  await expect(dialog).toBeVisible(); await expect(dialog).toContainText(`적용할 계정: ${users.a.email}`);
  await expect(dialog.getByRole('heading',{name:'복원·가져올 자료 선택',exact:true})).toBeVisible();
  await expect(dialog.getByRole('status')).toContainText('보관한 적용 요청을 확인했습니다.');
  await dialog.getByLabel('JSON 파일 선택',{exact:true}).setInputFiles({name:'synthetic-corrupt-backup.json',mimeType:'application/json',buffer:Buffer.from('{')});
  await expect(dialog.getByRole('status')).toContainText('지원하지 않거나 손상된 자료입니다. 원본은 변경하지 않았습니다.');
  await expect(dialog.getByRole('button',{name:'적용 전 미리보기',exact:true})).toBeDisabled();
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(counts); expect(mock.commands).toHaveLength(commands);
  await page.screenshot({path:info.outputPath('uc7-invalid-restoration-file.png'),fullPage:true});
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(entry).toBeFocused();
  await hit(entry,'keyboard'); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('status')).toContainText('보관한 적용 요청을 확인했습니다.');
  await expect(dialog.getByLabel('JSON 파일 선택',{exact:true})).toHaveValue('');
  await hit(dialog.getByRole('button',{name:'닫기',exact:true}),'keyboard');
  await expect(dialog).not.toBeVisible(); await expect(entry).toBeFocused();
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(counts); expect(mock.commands).toHaveLength(commands);
  await hit(page.getByRole('navigation',{name:'작업 공간',exact:true}).getByRole('button',{name:'둘러보기',exact:true}));
  const discovery = page.getByTestId('program-discovery');
  await expect(discovery.getByRole('heading',{name:'아직 공개된 Flow가 없어요',exact:true})).toBeVisible();
  await expect(discovery.getByRole('heading',{name:'맞는 자료가 없습니다',exact:true})).toHaveCount(0);
  await expect(discovery.getByRole('button',{name:'검색 조건 지우기',exact:true})).toHaveCount(0);
  await expect(discovery).not.toContainText(before.space.text.documents[0].title);
  await hit(discovery.getByRole('button',{name:'내 문서 보기',exact:true}),'keyboard');
  await expect(page.getByRole('region',{name:'개인 문서 편집',exact:true}).locator('textarea')).toHaveValue(M.raw(before.space.text.documents[0]));
  expect(await mock.current()).toEqual(before); expect(mock.diagnostics()).toEqual(counts); expect(mock.commands).toHaveLength(commands);
  await info.attach('uc7-bounded-restoration-public-empty',{contentType:'application/json',body:JSON.stringify({
    restorationEntryNamed:true,selectedOwner:users.a.id,invalidFileNotSent:true,escapeAndCloseZeroWrite:true,
    reentryFileSelectionReset:true,focusReturnedToEntry:true,publicEmptyDistinguished:true,privateTitleNotExposed:true,
    privateDocumentNavigationZeroWrite:true,largeOrPendingBackupNotRun:true})});
  await record(page,info); await mock.assertBoundary(info); await verifyAssets(info);
});
