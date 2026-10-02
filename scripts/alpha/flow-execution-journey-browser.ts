import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page, type Locator } from 'playwright';
import { expect } from '@playwright/test';
import { mockFolderContentEntry, publicIds } from '../../tests/e2e/folder-content-entry.fixture';
import { seedJourneyNative, journeyDraftId, journeyRaw } from '../../tests/e2e/flow-execution-journey.fixture';
import { login } from '../../tests/e2e/alpha-auth.fixture';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import { selectJourneyScenarios, assertJourneyMatrixComplete, journeyCopySourceIdentity } from './flow-execution-journey-contract';

const label = process.env.FLOWME_JOURNEY_QA_LABEL ?? 'baseline';
if (!/^[a-z0-9-]+$/.test(label)) throw Error('QA label rejected');
const directory = resolve(`output/playwright/flow-execution-journey-${label}`); mkdirSync(directory, { recursive: true });
const selection = selectJourneyScenarios({ single: process.env.FLOWME_JOURNEY_QA_SINGLE, selected: process.env.FLOWME_JOURNEY_QA_CASE });
const widths = selection.viewports;
async function main() {
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const results: { name: string; width: number; height: number; ok: boolean; error?: string; evidence: unknown[] }[] = [];
const creator = (page: Page) => page.getByRole('region', { name: '제작 작업 공간', exact: true });
const editor = (page: Page) => page.getByRole('region', { name: '개인 문서 편집', exact: true });
async function assertEditorDocument(page: Page, documentId: string) {
  await expect(editor(page)).toBeVisible();
  await expect(editor(page).locator('xpath=ancestor::*[@data-program-document][1]'))
    .toHaveAttribute('data-program-document', documentId);
}
async function click(target: Locator) {
  await expect(target).toBeVisible(); await target.scrollIntoViewIfNeeded();
  await target.evaluate(element => element.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await expect.poll(() => target.evaluate(element => { const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&!!hit&&(hit===element||element.contains(hit)); })).toBe(true);
  await target.click();
}
async function openCreator(page: Page) {
  await click(page.getByRole('navigation',{name:'작업 공간',exact:true}).getByRole('button',{name:'둘러보기',exact:true}));
  await click(page.getByTestId('program-discovery').getByRole('button',{name:'Flow 만들기',exact:true}));
  await expect(creator(page)).toBeVisible();
}
async function closeManagement(page: Page) { const section=page.locator('details[aria-label="계정 및 자료 관리"]'); if(await section.getAttribute('open')!==null) await click(section.locator('summary')); }
type JourneyMock = Awaited<ReturnType<typeof mockFolderContentEntry>>;
async function documentScheduleLoop(page: Page, mock: JourneyMock, documentId: string, evidence: unknown[]) {
  await assertEditorDocument(page, documentId);
  const initial = await mock.current(), copy = initial.space.copies.find(value => value.documentId === documentId)!;
  const taskId = copy.itemLines[publicIds.item], source = journeyCopySourceIdentity(initial.space.copies);
  const task = async () => M.tasks((await mock.current()).space.text).find(value => value.id === taskId)!;
  assert.equal((await task()).time, null, 'First time insertion must exercise a missing property line');
  async function openDate() {
    const account = await mock.current(), doc = M.getDocument(account.space.text, documentId); assert(doc);
    const index = doc.lines.findIndex(line => line.id === taskId); assert(index >= 0);
    const offset = doc.lines.slice(0, index).reduce((length, line) => length + line.text.length + 1, 0);
    const textarea = editor(page).locator('textarea');
    await expect(textarea).toHaveValue(M.raw(doc));
    // DOM caret placement only; no model, controller or storage mutation.
    await textarea.evaluate((element, start) => { const field = element as HTMLTextAreaElement;
      field.focus(); field.setSelectionRange(start, start); field.dispatchEvent(new Event('select', { bubbles: true })); }, offset);
    const add = editor(page).getByRole('button', { name: '＋ 추가', exact: true });
    await add.focus(); await page.keyboard.press('Enter');
    await click(page.getByRole('dialog').getByRole('button', { name: '날짜 바꾸기', exact: true }));
    const dateForm = page.getByRole('dialog', { name: '항목 날짜', exact: true }); await expect(dateForm).toBeVisible();
    return dateForm;
  }
  const beforeCancel = await mock.current(), cancelCounts = mock.diagnostics();
  const cancelled = await openDate(); await cancelled.getByLabel('항목 날짜', { exact: true }).fill('2026-10-13');
  await page.keyboard.press('Escape'); assert.deepEqual(await mock.current(), beforeCancel); assert.deepEqual(mock.diagnostics(), cancelCounts);
  for (const [index, [date, time]] of [['2026-10-11', '11:00'], ['2026-10-12', '11:30'], ['2026-10-12', ''], ['2026-10-12', '12:00']].entries()) {
    const form = await openDate(); await form.getByLabel('항목 날짜', { exact: true }).fill(date);
    await form.getByLabel('시간', { exact: true }).fill(time); await click(form.getByRole('button', { name: '날짜·시간 적용', exact: true }));
    await expect(form).not.toBeVisible();
    if (index === 0) {
      await expect.poll(() => mock.isPrivateScheduleReceiptHeld()).toBe(true);
      const textarea = editor(page).locator('textarea');
      await textarea.fill(`${await textarea.inputValue()}\n일정 저장 중 이어 쓴 합성 메모`);
      mock.releaseHeldPrivateScheduleReceipt();
      await expect.poll(async () => M.raw(M.getDocument((await mock.current()).space.text, documentId)))
        .toContain('일정 저장 중 이어 쓴 합성 메모');
    }
    await expect.poll(async () => ({ date: (await task()).date, time: (await task()).time })).toEqual({ date, time: time || null });
    await expect(editor(page).locator('textarea')).toHaveValue(M.raw(M.getDocument((await mock.current()).space.text, documentId)));
  }
  const same = await mock.current(), sameCounts = mock.diagnostics(), sameForm = await openDate();
  await click(sameForm.getByRole('button', { name: '날짜·시간 적용', exact: true }));
  await expect(sameForm).not.toBeVisible(); assert.deepEqual(await mock.current(), same); assert.deepEqual(mock.diagnostics(), sameCounts);
  await click(page.getByRole('button', { name: '되돌리기', exact: true }));
  await expect.poll(async () => ({ date: (await task()).date, time: (await task()).time })).toEqual({ date: '2026-10-12', time: null });
  const reset = await openDate(); await reset.getByLabel('항목 날짜', { exact: true }).fill('2026-10-10');
  await reset.getByLabel('시간', { exact: true }).fill(''); await click(reset.getByRole('button', { name: '날짜·시간 적용', exact: true }));
  await expect.poll(async () => ({ date: (await task()).date, time: (await task()).time })).toEqual({ date: '2026-10-10', time: null });
  assert.deepEqual(journeyCopySourceIdentity((await mock.current()).space.copies), source);
  assert.equal((await task()).docId, documentId);
  evidence.push({ type: 'document-schedule-loop', data: { taskId, documentId, firstTimeInsertion: true,
    consecutiveEdits: true, timeRemovalAndReaddition: true, inputDuringScheduleAcknowledgmentSaved: true, authoritativeEditorSynchronized: true,
    sameValueAndEscapeMutations: 0, explicitScheduleUndo: true, keyboardMenuEntry: true, copySourceIdentityUnchanged: true } });
}
async function executionLoop(page:Page,mock:JourneyMock,documentId:string,evidence:unknown[]) {
  await assertEditorDocument(page, documentId);
  const start=await mock.current(), owner=structuredClone(start.space.creatorWorkspace), copies=journeyCopySourceIdentity(start.space.copies);
  const tasks=M.tasks(start.space.text).filter(task=>task.docId===documentId&&task.isCanonical&&!task.parentTaskId);
  assert(tasks.length>0); const target=tasks[0], id=target.id;
  const task=async()=>M.tasks((await mock.current()).space.text).find(value=>value.id===id)!;
  const views=page.getByRole('navigation',{name:'개인공간 보기',exact:true});
  await click(views.getByRole('button',{name:'전체 할 일',exact:true}));
  const row=page.locator(`li[data-task-id="${id}"]`), action=row.getByRole('button',{name:`${target.title} 작업`,exact:true});
  await expect(row).toBeVisible(); await action.focus(); await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog'); await expect(dialog).toBeVisible();
  const beforeCancel=await mock.current(), cancelCounts=mock.diagnostics();
  await dialog.getByLabel('실행 날짜',{exact:true}).fill('2026-10-07'); await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible(); await expect(action).toBeFocused();
  assert.deepEqual(await mock.current(),beforeCancel); assert.deepEqual(mock.diagnostics(),cancelCounts);
  await click(action); await dialog.getByLabel('실행 날짜',{exact:true}).fill('2026-10-01');
  await dialog.getByLabel(/^시간/).fill('10:00'); await click(dialog.getByRole('button',{name:'날짜·시간 적용',exact:true}));
  await expect.poll(async()=>({date:(await task()).date,time:(await task()).time})).toEqual({date:'2026-10-01',time:'10:00'});
  const same=await mock.current(), sameCounts=mock.diagnostics();
  await click(dialog.getByRole('button',{name:'날짜·시간 적용',exact:true}));
  assert.deepEqual(await mock.current(),same); assert.deepEqual(mock.diagnostics(),sameCounts);
  await page.keyboard.press('Escape');
  for(const view of ['오늘','주간','월간']) {
    await click(views.getByRole('button',{name:view,exact:true}));
    await page.getByLabel('조회 날짜',{exact:true}).fill('2026-10-01'); await expect(row).toBeVisible();
  }
  await click(action); await dialog.getByLabel(/^시간/).fill('');
  await click(dialog.getByRole('button',{name:'날짜·시간 적용',exact:true}));
  await expect.poll(async()=>({date:(await task()).date,time:(await task()).time})).toEqual({date:'2026-10-01',time:null});
  await page.keyboard.press('Escape'); await click(page.getByRole('button',{name:'되돌리기',exact:true}));
  await expect.poll(async()=>({date:(await task()).date,time:(await task()).time})).toEqual({date:'2026-10-01',time:'10:00'});
  await click(views.getByRole('button',{name:'오늘',exact:true}));
  await click(row.getByRole('button',{name:`${target.title} 완료`,exact:true}));
  await expect.poll(async()=>M.latestProgress((await mock.current()).space.text,id)?.percent).toBe(100);
  await click(views.getByRole('button',{name:'월간',exact:true}));
  await expect(row.getByRole('button',{name:`${target.title} 다시 열기`,exact:true})).toHaveAttribute('aria-pressed','true');
  await click(row.getByRole('button',{name:new RegExp(`^${target.title}`)}).filter({has:page.locator('small')}));
  await assertEditorDocument(page, documentId); await expect(editor(page).locator('textarea')).toHaveValue(M.raw(M.getDocument((await mock.current()).space.text,documentId)));
  await click(views.getByRole('button',{name:'전체 할 일',exact:true}));
  await click(row.getByRole('button',{name:`${target.title} 다시 열기`,exact:true}));
  await expect.poll(async()=>M.latestProgress((await mock.current()).space.text,id)?.percent).toBe(0);
  await click(action); await dialog.getByLabel('실행 날짜',{exact:true}).fill('2026-10-02');
  await click(dialog.getByRole('button',{name:'날짜·시간 적용',exact:true})); await expect.poll(async()=>(await task()).date).toBe('2026-10-02');
  await page.keyboard.press('Escape'); await click(page.getByRole('button',{name:'되돌리기',exact:true}));
  await expect.poll(async()=>(await task()).date).toBe('2026-10-01');
  await click(action); await click(dialog.getByRole('button',{name:'날짜 미정으로 이동',exact:true}));
  await expect.poll(async()=>(await task()).date).toBe(null); await page.keyboard.press('Escape');
  await click(views.getByRole('button',{name:'날짜 미정',exact:true})); await expect(row).toBeVisible();
  assert.equal((await task()).docId,documentId); assert.equal((await task()).folderId,target.folderId);
  const finalAccount=await mock.current();
  assert.deepEqual(finalAccount.space.creatorWorkspace,owner); assert.deepEqual(journeyCopySourceIdentity(finalAccount.space.copies),copies);
  const privateCopy=finalAccount.space.copies.find(copy=>Object.values(copy.itemLines).includes(id));
  if(privateCopy) {
    const itemId=Object.keys(privateCopy.itemLines).find(itemId=>privateCopy.itemLines[itemId]===id)!;
    assert.equal(privateCopy.itemOverrides[itemId]?.date,null);
  }
  const saved=await mock.current(), counts=mock.diagnostics(); await page.reload();
  await expect(views).toBeVisible(); await click(views.getByRole('button',{name:'날짜 미정',exact:true})); await expect(row).toBeVisible();
  assert.deepEqual(await mock.current(),saved); assert.deepEqual(mock.diagnostics(),counts);
  evidence.push({type:'execution-loop',data:{documentId,taskId:id,sameCanonicalId:true,creatorOwnerUnchanged:true,copySourceIdentityUnchanged:true,
    personalDateOverridePreserved:!!privateCopy,sourceFolderUnchanged:true,
    cancellationMutations:0,sameLocationMutations:0,timeRemovalAndUndo:true,keyboardActionAndEscape:true,views:['문서','오늘','주간','월간','전체 할 일','날짜 미정'],reloadNoWrite:true}});
}
try {
  for(const [width,height] of widths) for(const name of selection.cases) {
    const evidence: unknown[]=[]; const context=await browser.newContext({viewport:{width,height},baseURL:'https://alpha.wikiplans.com',serviceWorkers:'block',timezoneId:'Asia/Seoul'});
    const page=await context.newPage(); await page.clock.setFixedTime(new Date('2026-10-01T12:00:00Z'));
    const info={outputPath:(file:string)=>resolve(directory,`${name}-${width}-${file}`),attach:async(type:string,attachment:{body?:string|Buffer})=>{
      if(attachment.body) evidence.push({type,data:JSON.parse(attachment.body.toString())});}} as any;
    const mock=await mockFolderContentEntry(page,{creatorExecution:true,...(name.startsWith('native-')?{prepareAccount:seedJourneyNative}:{}),
      catalog:name==='public-copy',holdFirstPrivateScheduleReceipt:name==='public-copy'});
    try {
      await page.goto('/alpha'); await login(page); await closeManagement(page);
      const initial=await mock.current();
      if(name==='public-copy') {
        await click(page.getByRole('navigation',{name:'작업 공간',exact:true}).getByRole('button',{name:'둘러보기',exact:true}));
        await click(page.getByTestId('program-discovery').getByRole('button',{name:'합성 공개 준비 Flow',exact:true}));
        const detail=page.getByTestId('program-flow-detail');
        await click(detail.getByRole('button',{name:'내 문서에 가져오기',exact:true}));
        await expect.poll(async()=>(await mock.current()).space.copies.length).toBe(1);
        const current=await mock.current(), copy=current.space.copies[0]; assert.equal(copy.baseVersionId,publicIds.version);
        assert.equal(copy.flowId,publicIds.flow); assert.deepEqual(copy.includedItemIds,[publicIds.item]);
        assert.equal(Object.keys(copy.itemLines).length,1);
        assert(M.tasks(current.space.text).some(task=>task.id===copy.itemLines[publicIds.item]&&task.docId===copy.documentId&&task.isCanonical));
        evidence.push({type:'public-copy-identity',data:{flowId:copy.flowId,baseVersionId:copy.baseVersionId,itemId:publicIds.item,
          taskId:copy.itemLines[publicIds.item],documentId:copy.documentId}});
        assert.deepEqual(current.space.creatorWorkspace,initial.space.creatorWorkspace);
        await documentScheduleLoop(page, mock, copy.documentId, evidence);
        await executionLoop(page,mock,current.space.copies[0].documentId,evidence);
      } else {
        await openCreator(page);
        if(name==='raw-first') {
          await click(creator(page).getByRole('button',{name:'빈 제작 원문 만들기',exact:true}).filter({visible:true}));
          await creator(page).getByLabel('제작 초안 제목',{exact:true}).fill('합성 raw 실행 여행');
          await creator(page).getByRole('textbox',{name:'제작 원문',exact:true}).fill(journeyRaw);
          await click(creator(page).getByRole('button',{name:'제작 초안 저장',exact:true}));
          await expect(creator(page)).toHaveAttribute('aria-busy','false');
          await expect.poll(async()=>Object.keys((await mock.current()).space.creatorWorkspace!.library.records).length).toBe(1);
        }
        await click(creator(page).getByRole('button',{name:'결과',exact:true}));
        const saved=await mock.current(), origin=structuredClone(saved.space.creatorWorkspace!.library);
        const handoffCounts=mock.diagnostics(), handoffCommandCount=mock.commands.length;
        if(name.startsWith('native-')) {
          const before=mock.diagnostics(), beforeCommands=mock.commands.length;
          await click(creator(page).getByRole('button',{name:'제작 설정을 개인 실행과 비교',exact:true}));
          const review=page.getByRole('region',{name:'제작 설정과 개인 실행 비교',exact:true}); await expect(review).toBeVisible();
          await review.press('Escape'); await expect(review).not.toBeVisible(); assert.deepEqual(mock.diagnostics(),before);
          assert.equal(mock.commands.length,beforeCommands);
          await click(creator(page).getByRole('button',{name:'제작 설정을 개인 실행과 비교',exact:true}));
          if(name==='native-save-rejection') {
            const rejected=await mock.current(), counts=mock.diagnostics();
            const choices=await review.locator('select').evaluateAll(elements=>elements.map(element=>(element as HTMLSelectElement).value));
            mock.state.rejectNextExecute='limit';
            await click(review.getByRole('button',{name:'선택한 내용으로 개인 실행 연결',exact:true}));
            await expect(review.getByRole('button',{name:'선택한 내용으로 개인 실행 연결',exact:true})).toBeEnabled();
            await expect(review.getByRole('alert')).toBeVisible();
            assert.deepEqual(await mock.current(),rejected); assert.deepEqual(mock.diagnostics(),counts);
            assert.deepEqual(await review.locator('select').evaluateAll(elements=>elements.map(element=>(element as HTMLSelectElement).value)),choices);
            evidence.push({type:'rejected-handoff',data:{successfulMutations:0,inputAndChoicesPreserved:true}});
            // Real retries happen later: the mounted comparison must retain its
            // original semantic timestamp rather than rely on a frozen clock.
            await page.clock.setFixedTime(new Date('2026-10-01T12:00:10Z'));
          }
          await click(review.getByRole('button',{name:'선택한 내용으로 개인 실행 연결',exact:true}));
        } else await click(creator(page).getByRole('button',{name:'확인한 제작물을 개인 문서로 인계',exact:true}));
        await expect(editor(page)).toBeVisible();
        const handed=await mock.current(), working=handed.space.creatorWorkspace!.working!, draftId=working.draftId;
        const documentId=name.startsWith('native-')?handed.space.creatorWorkspace!.nativeExecutionSources![journeyDraftId].documentId:handed.space.creatorWorkspace!.handoffs[draftId].documentId;
        assert(M.getDocument(handed.space.text,documentId)); assert.deepEqual(handed.space.creatorWorkspace!.library,origin);
        assert.deepEqual(mock.diagnostics(),{mutations:handoffCounts.mutations+1,operations:handoffCounts.operations+1});
        const handoffAttempts=mock.commands.slice(handoffCommandCount).filter(command=>command.kind==='creator'
          && command.intent.type===(name.startsWith('native-')?'native-handoff':'raw-handoff'));
        assert.equal(handoffAttempts.length,name==='native-save-rejection'?2:1);
        if(name==='native-save-rejection') {
          assert.notEqual(handoffAttempts[0].requestId,handoffAttempts[1].requestId);
          assert.deepEqual({...handoffAttempts[1],requestId:handoffAttempts[0].requestId},handoffAttempts[0]);
        }
        assert.equal(handed.space.text.documents.length,saved.space.text.documents.length+1);
        evidence.push({type:'explicit-handoff',data:{successfulMutations:1,successfulOperations:1,attempts:handoffAttempts.length,
          newDocuments:1,documentId}});
        assert.equal(handed.space.text.progressRecords.length,0);
        await executionLoop(page,mock,documentId,evidence);
        await openCreator(page); await click(creator(page).getByRole('button',{name:'결과',exact:true}));
        if(name.startsWith('native-')) {
          const before=await mock.current(), counts=mock.diagnostics(), beforeCommands=mock.commands.length;
          await click(creator(page).getByRole('button',{name:'개인 문서 열기',exact:true}));
          await assertEditorDocument(page, documentId); assert.deepEqual(await mock.current(),before); assert.deepEqual(mock.diagnostics(),counts);
          assert.equal(mock.commands.length,beforeCommands);
          assert.equal((await mock.current()).space.creatorWorkspace!.nativeExecutionSources![journeyDraftId].documentId,documentId);
          await openCreator(page); await click(creator(page).getByRole('button',{name:'결과',exact:true}));
          const kept=await mock.current(), keptCounts=mock.diagnostics(), keptCommands=mock.commands.length;
          await click(creator(page).getByRole('button',{name:'제작 설정을 개인 실행과 비교',exact:true}));
          const review=page.getByRole('region',{name:'제작 설정과 개인 실행 비교',exact:true});
          await expect(review.getByRole('button',{name:'선택한 내용으로 개인 실행 연결',exact:true})).toBeDisabled();
          await click(review.getByRole('button',{name:'모두 유지하고 닫기',exact:true}));
          assert.deepEqual(await mock.current(),kept); assert.deepEqual(mock.diagnostics(),keptCounts);
          assert.equal(mock.commands.length,keptCommands);
        }
        await page.reload(); await expect(page.getByRole('navigation',{name:'작업 공간',exact:true})).toBeVisible();
        const reopened=await mock.current(); assert.deepEqual(reopened.space.creatorWorkspace!.library,origin);
        assert.equal(reopened.space.text.documents.filter(doc=>doc.id===documentId).length,1);
      }
      await mock.assertBoundary(info); await page.screenshot({path:info.outputPath('final.png'),fullPage:true});
      results.push({name,width,height,ok:true,evidence});
    } catch(error) {
      mock.releaseHeldPrivateScheduleReceipt();
      evidence.push({type:'failed-synthetic-commands',data:mock.commands});
      try { await mock.assertBoundary(info); } catch(boundaryError) { evidence.push({type:'boundary-failure',error:String(boundaryError)}); }
      await page.screenshot({path:info.outputPath('failure.png'),fullPage:true}).catch(()=>{}); results.push({name,width,height,ok:false,error:String(error),evidence});
    }
    finally {await context.close();}
    writeFileSync(resolve(directory,'results.json'),JSON.stringify({scope:'Real production assets + synthetic Auth/API/CAS, not actual DB/device/user evidence',results},null,2));
  }
} finally {await browser.close();}
assertJourneyMatrixComplete(selection, results);
console.log(JSON.stringify({directory,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,failures:results.filter(x=>!x.ok).map(({name,width,error})=>({name,width,error}))},null,2));
if(results.some(x=>!x.ok)) process.exitCode=1;
}
void main().catch(error=>{ console.error(String(error)); process.exitCode=1; });
