async (page) => {
  const read = () => page.evaluate(() => window.__memoDateFixtureReport());
  const wait = async predicate => { for (let n=0;n<120;n++) { const s=await read(); if (predicate(s)) return s; await page.waitForTimeout(50); } throw Error('Synthetic race did not settle'); };
  const nav = page.getByRole('navigation',{name:'개인공간 보기',exact:true});
  await nav.getByRole('button',{name:'전체 할 일',exact:true}).click();
  const open = async title => { await page.getByRole('button',{name:`${title} 작업`,exact:true}).click(); await page.getByRole('dialog').waitFor(); };
  const close = () => page.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}).click();
  const initial=await read(), taskA=initial.items.find(x=>x.title==='개별 날짜 작업'), taskB=initial.items.find(x=>x.title==='다른 날짜 작업');
  const results=[];
  await open(taskA.title);
  let count=(await read()).commandCount;
  await page.evaluate(()=>window.__memoDateFixtureHoldNext());
  await page.getByRole('dialog').getByRole('button',{name:'오늘로 이동',exact:true}).click();
  await wait(s=>s.requestHeld);
  await page.getByRole('dialog').getByLabel('실행 날짜',{exact:true}).fill('2026-10-08');
  await page.evaluate(()=>window.__memoDateFixtureRelease());
  await wait(s=>s.commandCount===count+1);
  await page.waitForTimeout(250);
  const sameDraft=await page.getByRole('dialog').getByLabel('실행 날짜',{exact:true}).inputValue();
  let current=await read();
  const protectedState=s=>s.sentinelsExact&&s.publicUnchanged&&!s.forbiddenStorageCalls.length&&!s.prohibitedRequests.length
    &&!s.pageErrors.length&&!s.consoleErrors.length&&s.forwardedAuth===0&&s.forwardedApi===0;
  results.push({id:'BR01',pass:sameDraft==='2026-10-08'&&current.items.find(x=>x.id===taskA.id).date==='2026-10-04'
      &&current.items.find(x=>x.id===taskB.id).date===taskB.date&&current.commandCount===count+1&&current.account.revision===initial.account.revision+1&&protectedState(current),expected:'2026-10-08',actual:sameDraft,
    submittedDate:current.items.find(x=>x.id===taskA.id).date,canonicalOtherUnchanged:current.items.find(x=>x.id===taskB.id).date===taskB.date});
  await close(); await open(taskA.title); count=(await read()).commandCount;
  await page.evaluate(()=>window.__memoDateFixtureHoldNext());
  await page.getByRole('dialog').getByRole('button',{name:'내일로 이어하기',exact:true}).click();
  await wait(s=>s.requestHeld); await close(); await open(taskB.title);
  const before=await page.getByRole('dialog').getByLabel('실행 날짜',{exact:true}).inputValue();
  await page.evaluate(()=>window.__memoDateFixtureRelease());
  await wait(s=>s.commandCount===count+1); await page.waitForTimeout(250);
  const otherDraft=await page.getByRole('dialog').getByLabel('실행 날짜',{exact:true}).inputValue(); current=await read();
  results.push({id:'BR02',pass:before===taskB.date&&otherDraft===taskB.date&&current.items.find(x=>x.id===taskA.id).date==='2026-10-05'
      &&current.items.find(x=>x.id===taskB.id).date===taskB.date&&current.commandCount===count+1&&current.account.revision===initial.account.revision+2&&protectedState(current),expected:taskB.date,actual:otherDraft,
    canonicalOtherUnchanged:current.items.find(x=>x.id===taskB.id).date===taskB.date});
  await page.screenshot({path:'output/playwright/feedback-gaps/race-current.png',fullPage:false});
  await close();
  return {schema:'flowme-feedback-date-race-browser/1',buildId:current.expectedBuildId,results,
    passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,
    commandCount:current.commandCount,revision:current.account.revision,heldCommands:current.heldCommands.length,
    protectedBytes:current.sentinelsExact,forbiddenStorageCalls:current.forbiddenStorageCalls,
    forwardedAuth:current.forwardedAuth,forwardedApi:current.forwardedApi,
    pageErrors:current.pageErrors,consoleErrors:current.consoleErrors,device:false,observedUsers:0};
}
