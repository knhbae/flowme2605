import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { login } from './alpha-auth.fixture';
import { mockCloudflareRelease } from './cloudflare-release.fixture';
import { mockFolderContentEntry, publicTitle } from './folder-content-entry.fixture';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import { loadUxExactBuild, assertUxObservedAssets, type UxExactBuild } from './ux-exact-build';
const phase = process.env.FLOWME_UX_POLISH_PHASE!;
let exact: UxExactBuild;
test.beforeAll(() => { exact = loadUxExactBuild(process.env); });
const raw = '업무 비교 메모와 필요한 자료\n[2026-10-09]\n- [ ] 회의 자료 확인\n  - 메모: 원래 메모 유지\n  - [ ] 질문 적기\n생활 할 일은 별도 글에 둡니다.';
const area = (page:Page) => page.locator('[data-program-document]:not([hidden]) [data-native-editor="v11-core"] textarea');
async function boot(page:Page) { await page.goto('/alpha'); expect(await page.content()).toContain(exact.buildId); await login(page);
  const menu=page.locator('details[aria-label="계정 및 자료 관리"]');
  if(await menu.getAttribute('open')!==null) await menu.locator(':scope > summary').click(); }
async function capture(page:Page,info:TestInfo,name:string) {
  const geometry=await page.evaluate(() => {
    const rect=(node:Element|null)=>{if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
    const editor=document.querySelector('[data-program-document]:not([hidden]) textarea') as HTMLTextAreaElement|null;
    const mirror=document.querySelector('[data-program-document]:not([hidden]) .tle-presentation');
    const dialog=document.getElementById('program-library') as HTMLDialogElement|null;
    return { observedAt:new Date().toISOString(), viewport:{width:innerWidth,height:innerHeight}, fullPageHeight:document.documentElement.scrollHeight,
      overflow:document.documentElement.scrollWidth-innerWidth, scrollY, editor:rect(editor), mirror:rect(mirror),
      textMetrics:editor?{font:getComputedStyle(editor).fontSize,line:getComputedStyle(editor).lineHeight,mirrorLine:mirror?getComputedStyle(mirror).lineHeight:null}:null,
      find:dialog?.open?{...rect(dialog),scrollTop:dialog.scrollTop,scrollHeight:dialog.scrollHeight,clientHeight:dialog.clientHeight,paddingBottom:getComputedStyle(dialog).paddingBottom}:null,
      badge:[...document.querySelectorAll('.tle-scheduled-date-open')].map(node=>({label:node.getAttribute('aria-label'),text:node.textContent,rect:rect(node),
        dateRect:rect(node.querySelector('.tle-row-date')),whiteSpace:getComputedStyle(node.querySelector('.tle-row-date')!).whiteSpace})) };
  });
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  await info.attach(`${name}-geometry`,{contentType:'application/json',body:JSON.stringify({phase,head:exact.head,build:exact.buildId,...geometry})});
  await page.screenshot({path:info.outputPath(`${name}-viewport.png`),fullPage:false});
  await page.screenshot({path:info.outputPath(`${name}-full.png`),fullPage:true});
}
async function boundary(page:Page,mock:{assertBoundary:(info:TestInfo)=>Promise<void>},info:TestInfo) {
  await page.waitForLoadState('networkidle'); await mock.assertBoundary(info);
  const attachment=info.attachments.find(a=>a.name==='release-boundary'); expect(attachment?.body).toBeTruthy();
  const guard=JSON.parse(attachment!.body!.toString()); expect(guard.realApiRequests).toBe(0); expect(guard.forwardedSupabaseRequests).toBe(0);
  assertUxObservedAssets(exact,guard.assets);
  await info.attach('polish-boundary',{contentType:'application/json',body:JSON.stringify({phase,build:exact.buildId,realWrites:0,synthetic:true,observedAssetSubsetMatches:true})});
  await page.route('**/*',route=>route.abort('blockedbyclient')); await page.context().unrouteAll({behavior:'wait'});
}
test('writing density and find bottom preserve native selection, date and save protection',async({page},info)=>{
  const mock=await mockCloudflareRelease(page,{document:{title:'업무 글',raw},prepareText:text=>{const next=M.addDocument(text,{title:'생활 글'}),doc=next.documents.at(-1)!;
    return M.editText(next,doc.id,'생활 비교 메모\n- [ ] 장보기');}});
  await boot(page); const editor=area(page); await expect(editor).toHaveValue(raw); const original=await mock.current();
  await capture(page,info,'writing');
  const identity=await editor.elementHandle(); expect(identity).not.toBeNull(); await editor.press('Control+Home'); await editor.press('Shift+End');
  const selection=await editor.evaluate((n:HTMLTextAreaElement)=>({start:n.selectionStart,end:n.selectionEnd,direction:n.selectionDirection,top:n.scrollTop}));
  await page.getByRole('button',{name:'글 찾기 · 내 문서와 할 일',exact:true}).click();
  const find=page.getByRole('dialog',{name:'글 찾기',exact:true}); await expect(find).toBeVisible(); await capture(page,info,'find');
  const trash=find.locator('summary').filter({hasText:/^휴지통/}); await trash.focus(); await expect(trash).toBeFocused();
  await expect.poll(()=>trash.evaluate(n=>{const a=n.getBoundingClientRect(),d=n.closest('dialog')!.getBoundingClientRect();return a.top>=d.top&&a.bottom<=d.bottom;})).toBe(true);
  await capture(page,info,'find-bottom'); await find.press('Escape'); await expect(editor).toBeFocused();
  expect(await editor.evaluate((n:HTMLTextAreaElement)=>({start:n.selectionStart,end:n.selectionEnd,direction:n.selectionDirection,top:n.scrollTop}))).toEqual(selection);
  expect(await editor.evaluate((n,old)=>n===old,identity)).toBe(true); expect(await mock.current()).toEqual(original); expect(mock.commands).toHaveLength(0);
  const nav=page.getByRole('navigation',{name:'기본 이동',exact:true}); await nav.getByRole('button',{name:'오늘',exact:true}).click(); await capture(page,info,'today');
  await nav.getByRole('button',{name:'분류',exact:true}).click(); await capture(page,info,'classification');
  await nav.getByRole('button',{name:'쓰기',exact:true}).click(); await expect(editor).toHaveValue(raw);
  await editor.press('Control+End'); await editor.pressSequentially('X'); await editor.press('Control+z'); await expect(editor).toHaveValue(raw);
  await editor.press('Control+Shift+z'); await expect(editor).toHaveValue(raw+'X'); await editor.press('Control+z'); await expect(editor).toHaveValue(raw);
  await expect.poll(async()=>M.raw((await mock.current()).space.text.documents[0])).toBe(raw);
  mock.state.rejectNextExecute='limit'; await editor.press('Control+End'); await editor.pressSequentially(' 저장시험');
  const sync=page.getByRole('region',{name:'서버 저장 상태',exact:true}).getByRole('status'); await expect(sync).toHaveText('저장 거절 · 입력 보존됨');
  await expect(editor).toHaveValue(raw+' 저장시험'); await expect(sync).toBeVisible(); await capture(page,info,'save-protection');
  await page.getByRole('button',{name:'다시 저장',exact:true}).click(); await expect(sync).toHaveText('서버 저장 확인');
  await page.getByRole('navigation',{name:'주요 메뉴',exact:true}).getByRole('button',{name:'이야기',exact:true}).click();
  await capture(page,info,'stories'); await boundary(page,mock,info);
});
test('same Flow resume schedule badge keeps its value, accessible meaning and date operation',async({page},info)=>{
  const mock=await mockFolderContentEntry(page,{catalog:true,community:true}); await boot(page);
  await page.getByRole('navigation',{name:'주요 메뉴',exact:true}).getByRole('button',{name:'Flow',exact:true}).click();
  await page.getByRole('button',{name:publicTitle,exact:true}).click();
  await page.getByRole('button',{name:'내 계획으로 시작',exact:true}).click(); await page.getByRole('button',{name:'전체 항목으로 시작',exact:true}).click();
  await expect.poll(async()=>(await mock.current()).space.copies.length).toBe(1);
  await expect(area(page)).toBeVisible(); const before=await mock.current(),text=await area(page).inputValue();
  const badge=page.locator('[data-program-document]:not([hidden]) .tle-scheduled-date-open'); await expect(badge).toHaveCount(1);
  await expect(badge).toHaveAttribute('aria-label',/예정일 10월 10일/); await capture(page,info,'resume-date');
  await badge.focus(); await badge.press('Enter');
  const dialog=page.getByRole('dialog',{name:'항목 날짜',exact:true}); await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[type=date]')).toHaveValue('2026-10-10'); await dialog.press('Escape');
  await expect(dialog).not.toBeVisible(); await expect(area(page)).toHaveValue(text); expect(await mock.current()).toEqual(before);
  expect((await mock.current()).space.copies).toHaveLength(1); await boundary(page,mock,info);
});
