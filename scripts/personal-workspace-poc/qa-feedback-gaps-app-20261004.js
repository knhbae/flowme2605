async (page) => {
  const checks=[], keyboardDateSteps=[], viewports=[];
  const read=()=>page.evaluate(()=>window.__memoDateFixtureReport());
  const check=(id,pass,details={})=>{checks.push({id,pass:Boolean(pass),...details});if(!pass)throw Error(id);};
  const wait=async predicate=>{for(let n=0;n<150;n++){const s=await read();if(predicate(s))return s;await page.waitForTimeout(50);}throw Error('Synthetic UI state did not settle');};
  const nav=page.getByRole('navigation',{name:'개인공간 보기',exact:true});
  const editor=page.getByRole('region',{name:'개인 문서 편집',exact:true});
  const area=editor.getByRole('textbox',{name:'문서 내용',exact:true});
  const dialog=()=>page.getByRole('dialog');
  const initial=await read(), a=initial.items.find(x=>x.title==='개별 날짜 작업'), b=initial.items.find(x=>x.title==='다른 날짜 작업');
  const sameItem=s=>{const x=s.items.find(x=>x.id===a.id);return x&&x.time===a.time&&x.note===a.note&&x.docId===a.docId&&x.folderId===a.folderId&&x.scopeId===a.scopeId&&x.groupDate===a.groupDate;};
  const period=async name=>{await nav.getByRole('button',{name,exact:true}).click();};
  const openTask=async title=>{await page.getByRole('button',{name:`${title} 작업`,exact:true}).click();await dialog().waitFor();};
  const close=()=>dialog().getByRole('button',{name:'닫기',exact:true}).click();
  const apply=()=>dialog().getByRole('button',{name:'날짜·시간 적용',exact:true}).click();
  const docDate=async title=>{
    const raw=await area.inputValue(), index=raw.split('\n').findIndex(x=>x===`- [ ] ${title}`);
    const offset=raw.split('\n').slice(0,index).reduce((sum,line)=>sum+line.length+1,0)+5;
    await area.focus();await area.evaluate((node,pos)=>node.setSelectionRange(pos,pos),offset);await area.press('ArrowLeft');
    await editor.getByRole('button',{name:`${index+1}행 메뉴`,exact:true}).press('Enter');
    await dialog().getByRole('button',{name:'날짜 바꾸기',exact:true}).click();
  };
  const selectText=async text=>{const raw=await area.inputValue(), at=raw.indexOf(text);if(at<0)throw Error('Partial text missing');await area.focus();await area.evaluate((node,p)=>node.setSelectionRange(p.start,p.end),{start:at,end:at+text.length});return raw;};
  const paste=async text=>{await page.evaluate(text=>navigator.clipboard.writeText(text),text);
    if(await page.evaluate(()=>navigator.clipboard.readText())!==text)throw Error('Browser clipboard bytes not ready; paste stopped');
    await page.keyboard.press('Control+V');};
  const undo=()=>page.getByRole('region',{name:'서버 저장 상태',exact:true}).getByRole('button',{name:'되돌리기',exact:true}).click();
  const redo=async()=>{await editor.locator('summary[aria-label="편집 도구"]').click();await editor.getByRole('button',{name:'다시 실행',exact:true}).click();};
  try {
    await period('전체 할 일');await openTask(a.title);
    const count=initial.commandCount;
    await dialog().getByLabel('실행 날짜',{exact:true}).fill('2026-10-08');await apply();
    let s=await wait(s=>s.items.find(x=>x.id===a.id)?.date==='2026-10-08');
    check('FG01 period fill 10/05→10/08',s.commandCount===count+1&&sameItem(s)&&s.items.find(x=>x.id===b.id).date===b.date);
    await close();await openTask(a.title);
    check('FG02 period reopen retains last date',await dialog().getByLabel('실행 날짜',{exact:true}).inputValue()==='2026-10-08');
    const noOp=s.commandCount;await apply();check('FG03 equal date/time zero commands',(await read()).commandCount===noOp);
    await dialog().getByLabel('실행 날짜',{exact:true}).fill('2026-10-09');await page.keyboard.press('Escape');
    check('FG04 period Escape cancels draft',(await read()).commandCount===noOp&&(await read()).items.find(x=>x.id===a.id).date==='2026-10-08');
    await page.reload();await area.waitFor();
    s=await read();check('FG05 reload persists same Item and source',s.items.find(x=>x.id===a.id).date==='2026-10-08'&&sameItem(s));
    await docDate(a.title);await dialog().getByLabel('실행 날짜',{exact:true}).fill('2026-10-05');await apply();
    await wait(s=>s.items.find(x=>x.id===a.id)?.date==='2026-10-05');await docDate(a.title);
    const date=dialog().getByLabel('실행 날짜',{exact:true});await date.focus();for(let i=0;i<4;i++)await date.press('ArrowLeft');
    let day=false;
    for(let i=0;i<3;i++){await date.press('ArrowUp');const value=await date.inputValue();keyboardDateSteps.push({key:'ArrowUp',value});if(value==='2026-10-06'){day=true;break;}await date.press('ArrowDown');await date.press('ArrowRight');}
    check('FG06 real native date keyboard finds day',day);await date.press('ArrowUp');await date.press('ArrowUp');
    check('FG07 keyboard draft reaches 10/08',await date.inputValue()==='2026-10-08');
    await date.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Enter');
    s=await wait(s=>s.items.find(x=>x.id===a.id)?.date==='2026-10-08');check('FG08 document keyboard apply preserves same Item',sameItem(s));
    for(const name of ['월간','주간','오늘','날짜 미정','전체 할 일']){
      await period(name);const visible=await page.getByRole('button',{name:new RegExp(`^${a.title} 2026-10-08`)}).count();
      check(`FG09 ${name} same projection`,['월간','전체 할 일'].includes(name)?visible===1:visible===0);
    }
    await page.getByRole('button',{name:new RegExp(`^${a.title} 2026-10-08`)}).click();await area.waitFor();
    const raw=await area.inputValue(), selection=await area.evaluate(node=>({start:node.selectionStart,end:node.selectionEnd}));
    check('FG10 period title returns exact source line',raw.slice(0,selection.start).split('\n').length===raw.split('\n').findIndex(x=>x===`- [ ] ${a.title}`)+1);
    await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://alpha.wikiplans.com'});
    const beforePaste=await read();await selectText('개별 날짜 메모');await paste('부분 붙여넣기 검증');
    s=await wait(s=>s.items.find(x=>x.id===a.id)?.note==='부분 붙여넣기 검증');
    const pastedRaw=s.raw;check('FG11 actual clipboard selection paste changes only selected memo',s.raw===beforePaste.raw.replace('개별 날짜 메모','부분 붙여넣기 검증')&&s.items.length===beforePaste.items.length&&s.items.find(x=>x.id===a.id).date==='2026-10-08');
    await undo();s=await wait(s=>s.raw===beforePaste.raw);check('FG12 server Undo exact text and IDs',s.items.map(x=>x.id).join()===beforePaste.items.map(x=>x.id).join());
    await redo();s=await wait(s=>s.raw===pastedRaw);check('FG13 server Redo restores saved paste',s.items.find(x=>x.id===a.id).note==='부분 붙여넣기 검증');
    const beforeNative=s.commandCount;await selectText('일반 메모 문장');await paste('취소할 부분 입력');await page.keyboard.press('Control+Z');
    check('FG14 native dirty Undo restores text before debounce',await area.inputValue()===pastedRaw);
    await page.waitForTimeout(700);check('FG15 dirty Undo no committed write',(await read()).commandCount===beforeNative);
    await selectText('부분 붙여넣기 검증');await page.evaluate(()=>window.__memoDateFixtureRejectNext());await paste('거절 뒤에도 남을 메모');
    await wait(s=>s.rejectedCommands.length===1);await page.waitForTimeout(150);
    check('FG16 rejected paste keeps draft and prior successful server state',(await area.inputValue()).includes('거절 뒤에도 남을 메모')&&(await read()).raw===pastedRaw);
    await editor.getByRole('button',{name:'다시 저장',exact:true}).click();
    s=await wait(s=>s.items.find(x=>x.id===a.id)?.note==='거절 뒤에도 남을 메모');
    check('FG17 direct retry saves preserved selection paste',s.items.find(x=>x.id===a.id).date==='2026-10-08');
    await page.reload();await area.waitFor();check('FG18 reload preserves latest successful paste',(await read()).raw===s.raw);
    await period('전체 할 일');await openTask(a.title);const beforeUndated=(await read()).commandCount;
    await dialog().getByRole('button',{name:'날짜 미정으로 이동',exact:true}).click();
    s=await wait(s=>s.items.find(x=>x.id===a.id)?.date===null);check('FG19 undated shortcut keeps time/note/source',s.items.find(x=>x.id===a.id).time==='09:00'&&s.commandCount===beforeUndated+1&&s.items.find(x=>x.id===a.id).note==='거절 뒤에도 남을 메모');
    await close();await period('날짜 미정');check('FG20 undated same Item projected',await page.getByRole('button',{name:new RegExp(`^${a.title} 날짜 미정`)}).count()===1);
    await period('전체 할 일');await openTask(a.title);await dialog().getByLabel('실행 날짜',{exact:true}).fill('2026-10-08');await apply();await wait(s=>s.items.find(x=>x.id===a.id)?.date==='2026-10-08');await close();
    for(const [width,height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]){
      await page.setViewportSize({width,height});await openTask(a.title);
      const controls=[];for(const name of ['닫기','날짜·시간 적용','날짜 미정으로 이동']){const btn=dialog().getByRole('button',{name,exact:true});await btn.scrollIntoViewIfNeeded();controls.push(await btn.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {width:r.width,height:r.height,reachable:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&!!hit&&(hit===node||node.contains(hit))};}));}
      const overflow=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth),dialogOverflow=await dialog().evaluate(node=>node.scrollWidth-node.clientWidth);
      check(`FG21 viewport ${width}×${height}`,overflow===0&&dialogOverflow===0&&controls.every(c=>c.reachable&&c.width>=44&&c.height>=44));
      await page.screenshot({path:`output/playwright/feedback-gaps/period-${width}x${height}.png`,fullPage:false});viewports.push({width,height,overflow,dialogOverflow,controls});await close();
    }
    s=await read();check('FG22 prefix/sentinels/public/real forwarding/errors',s.sentinelsExact&&s.publicUnchanged&&!s.forbiddenStorageCalls.length&&!s.prohibitedRequests.length&&!s.pageErrors.length&&!s.consoleErrors.length&&s.forwardedAuth===0&&s.forwardedApi===0);
  } catch(error) { checks.push({id:'HARNESS_STOP',pass:false,error:String(error)}); }
  const final=await read();
  return {schema:'flowme-feedback-gaps-app-browser/1',buildId:final.expectedBuildId,checks,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,
    viewports,keyboardDateSteps,commandCount:final.commandCount,revision:final.account.revision,rejectedCommands:final.rejectedCommands.length,
    forwardedAuth:final.forwardedAuth,forwardedApi:final.forwardedApi,forbiddenStorageCalls:final.forbiddenStorageCalls,storageCalls:final.storageCalls.length,
    sentinelsExact:final.sentinelsExact,publicUnchanged:final.publicUnchanged,prohibitedRequests:final.prohibitedRequests,pageErrors:final.pageErrors,consoleErrors:final.consoleErrors,
    nativePickerPopup:false,physicalDevice:false,osIme:false,observedUsers:0};
}
