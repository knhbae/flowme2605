async (page) => {
  const checks=[], keyboardSteps=[];
  const read=()=>page.evaluate(()=>window.__memoDateFixtureReport());
  const check=(id,pass,details={})=>{checks.push({id,pass:Boolean(pass),...details});if(!pass)throw Error(id);};
  const wait=async predicate=>{for(let i=0;i<150;i++){const state=await read();if(predicate(state))return state;await page.waitForTimeout(50);}throw Error('Synthetic extra state did not settle');};
  const nav=page.getByRole('navigation',{name:'개인공간 보기',exact:true});
  const editor=page.getByRole('region',{name:'개인 문서 편집',exact:true});
  const area=editor.getByRole('textbox',{name:'문서 내용',exact:true});
  const dialog=()=>page.getByRole('dialog');
  const period=async name=>nav.getByRole('button',{name,exact:true}).click();
  try {
    await period('전체 할 일');
    const initial=await read(), a=initial.items.find(item=>item.title==='개별 날짜 작업'), b=initial.items.find(item=>item.title==='다른 날짜 작업');
    if(!a||!b||b.date!=='2026-10-12')throw Error('Extra scenario requires prior final-app success state');
    await page.getByRole('button',{name:`${b.title} 작업`,exact:true}).click();
    const date=dialog().getByLabel('실행 날짜',{exact:true});await date.focus();
    for(let n=0;n<4;n++)await date.press('ArrowLeft');
    let day=false;
    for(let n=0;n<3;n++){await date.press('ArrowUp');const value=await date.inputValue();keyboardSteps.push(value);if(value==='2026-10-13'){day=true;break;}await date.press('ArrowDown');await date.press('ArrowRight');}
    if(day){await date.press('ArrowUp');await date.press('ArrowUp');}
    check('EX01 period native keyboard date entry',day&&await date.inputValue()==='2026-10-15');
    await date.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Enter');
    let s=await wait(state=>state.items.find(item=>item.id===b.id)?.date==='2026-10-15');
    const nextB=s.items.find(item=>item.id===b.id);
    check('EX02 period keyboard applies exact Item only',s.commandCount===initial.commandCount+1&&s.items.find(item=>item.id===a.id)?.date===a.date&&nextB.note===b.note&&nextB.time===b.time&&nextB.docId===b.docId&&nextB.folderId===b.folderId&&nextB.scopeId===b.scopeId);
    await dialog().getByRole('button',{name:'닫기',exact:true}).click();
    await page.getByRole('button',{name:new RegExp(`^${b.title} 2026-10-15`)}).click();await area.waitFor();
    const beforeRename=await read();await area.fill(beforeRename.raw.replace(`- [ ] ${b.title}`,`- [ ] ${a.title}`));
    s=await wait(state=>state.items.filter(item=>item.title===a.title).length===2);
    check('EX03 equal titles preserve two independent IDs',s.items.some(item=>item.id===b.id&&item.date==='2026-10-15')&&s.items.some(item=>item.id===a.id&&item.date===a.date));
    await period('전체 할 일');await page.getByRole('button',{name:new RegExp(`^${a.title} 2026-10-15`)}).click();await area.waitFor();
    s=await read();const target=s.items.find(item=>item.id===b.id), row=s.rows.find(row=>row.taskId===b.id);
    const selection=await area.evaluate(node=>({start:node.selectionStart,end:node.selectionEnd})), raw=await area.inputValue();
    check('EX04 equal-title period return targets exact source row',!!row&&row.index===target.sourceIndex&&raw.slice(0,selection.start).split('\n').length===row.index+1,{taskId:b.id,lineId:row?.id,sourceIndex:target.sourceIndex});
    const taskOffset=raw.split('\n').slice(0,row.index).reduce((sum,line)=>sum+line.length+1,0)+5;
    await area.focus();await area.evaluate((node,offset)=>node.setSelectionRange(offset,offset),taskOffset);await area.press('ArrowLeft');await editor.getByRole('button',{name:`${row.index+1}행 메뉴`,exact:true}).press('Enter');
    await dialog().getByRole('button',{name:'날짜 바꾸기',exact:true}).click();
    await dialog().getByLabel('실행 날짜',{exact:true}).fill('2026-10-16');await dialog().getByRole('button',{name:'날짜·시간 적용',exact:true}).click();
    s=await wait(state=>state.items.find(item=>item.id===b.id)?.date==='2026-10-16');
    check('EX05 equal-title source date applies B not A',s.items.find(item=>item.id===a.id)?.date===a.date);
    const body=[s.raw,'[2026-11-09]','날짜 미정','- [ ] 자유 문장 미정 검증','[미정]','- [ ] 구획 미정 검증','[2026-11-09]','- [ ] 개별 미정 검증','  - 날짜: 미정'].join('\n');
    await area.fill(body);s=await wait(state=>state.raw===body);
    const prose=s.items.find(item=>item.title==='자유 문장 미정 검증'), section=s.items.find(item=>item.title==='구획 미정 검증'), individual=s.items.find(item=>item.title==='개별 미정 검증');
    check('EX06 MD08 ordinary prose keeps inherited date',prose?.date==='2026-11-09'&&prose.groupDate==='2026-11-09'&&!prose.explicitDate);
    check('EX07 MD08 explicit undated section',section?.date===null&&section.groupDate===null&&!section.explicitDate);
    check('EX08 MD08 individual undated keeps original section',individual?.date===null&&individual.groupDate==='2026-11-09'&&individual.explicitDate);
    await period('날짜 미정');
    check('EX09 MD08 undated list matches syntax',await page.getByRole('button',{name:/^구획 미정 검증 날짜 미정/}).count()===1&&await page.getByRole('button',{name:/^개별 미정 검증 날짜 미정/}).count()===1&&await page.getByRole('button',{name:/^자유 문장 미정 검증 /}).count()===0);
    await page.reload();await area.waitFor();s=await read();
    check('EX10 MD08 reload restores raw and exact IDs',s.raw===body&&s.items.some(item=>item.id===prose.id&&item.date==='2026-11-09')&&s.items.some(item=>item.id===section.id&&item.date===null)&&s.items.some(item=>item.id===individual.id&&item.date===null));
    check('EX11 protection and no real forwarding',s.sentinelsExact&&s.publicUnchanged&&!s.forbiddenStorageCalls.length&&!s.prohibitedRequests.length&&!s.consoleErrors.length&&!s.pageErrors.length&&s.forwardedAuth===0&&s.forwardedApi===0);
  }catch(error){checks.push({id:'HARNESS_STOP',pass:false,error:String(error)});}
  const s=await read();return {schema:'flowme-feedback-gaps-extra-browser/1',buildId:s.expectedBuildId,checks,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,keyboardSteps,commandCount:s.commandCount,revision:s.account.revision,forwardedAuth:s.forwardedAuth,forwardedApi:s.forwardedApi,forbiddenStorageCalls:s.forbiddenStorageCalls,sentinelsExact:s.sentinelsExact,publicUnchanged:s.publicUnchanged,pageErrors:s.pageErrors,consoleErrors:s.consoleErrors,physicalDevice:false,observedUsers:0};
}
