async (page) => {
  const checks = [];
  const check = (name, value) => { checks.push({ name, pass:Boolean(value) }); if (!value) throw Error(name); };
  const read = () => page.evaluate(() => window.__memoDateFixtureReport());
  const until = async predicate => { for (let i=0;i<150;i++) { const value=await read(); if (predicate(value)) return value; await page.waitForTimeout(50); } throw Error('Synthetic save did not settle'); };
  const editor = page.getByRole('region',{name:'개인 문서 편집',exact:true});
  const area = editor.getByRole('textbox',{name:'문서 내용',exact:true});
  const focusLine = async text => {
    const raw=await area.inputValue(), index=raw.split('\n').findIndex(line=>line===text);
    if (index<0) throw Error('Selected source row missing');
    const offset=raw.split('\n').slice(0,index).reduce((sum,line)=>sum+line.length+1,0)+Math.min(5,text.length);
    await area.scrollIntoViewIfNeeded(); await area.focus();
    await area.evaluate((node,at)=>node.setSelectionRange(at,at),offset); await area.press('ArrowLeft');
    return index;
  };
  const menu = async text => {
    const index=await focusLine(text), button=editor.getByRole('button',{name:`${index+1}행 메뉴`,exact:true});
    await button.focus(); await button.press('Enter'); await page.getByRole('dialog').waitFor();
  };
  const dateMenu = async title => { await menu(`- [ ] ${title}`);
    await page.getByRole('dialog').getByRole('button',{name:'날짜 바꾸기',exact:true}).click();
    await page.getByRole('dialog',{name:'항목 날짜',exact:true}).waitFor(); };
  const sourceText = () => page.getByRole('dialog').locator('[aria-label="날짜 출처"]').innerText();
  await area.waitFor(); const initial=await read(), parent=initial.items.find(item=>item.title==='구획 날짜 작업'), explicit=initial.items.find(item=>item.title==='개별 날짜 작업');
  check('A01 exact synthetic personal document and unowned prose',initial.items.length===3&&initial.commandCount===0&&parent.note==='부모 첫 메모\n부모 둘째 메모');
  check('A02 no extra memo guidance on ordinary surface', await editor.getByText(/메모 줄 끝에서 Enter/).count()===0);
  await menu('  - 메모: 부모 첫 메모'); let dialog=page.getByRole('dialog');
  check('A03 parent memo context appears on demand', (await dialog.innerText()).includes('메모 · 구획 날짜 작업')
    && (await dialog.innerText()).includes('같은 할 일의 메모를 이어 씁니다'));
  await page.keyboard.press('Escape');
  await menu('    - 메모: 하위 첫 메모'); dialog=page.getByRole('dialog');
  check('A04 child memo uses direct owner and escapes title', (await dialog.innerText()).includes('메모 · 하위 체크 <img src=x onerror=alert(1)>')
    && (await dialog.innerText()).includes('같은 하위 체크의 메모')&&await dialog.locator('img').count()===0);
  await page.screenshot({path:'output/playwright/memo-date/app-child-context.png',fullPage:false}); await page.keyboard.press('Escape');
  await menu('일반 메모 문장');
  check('A05 ordinary prose receives no Item memo instruction', !(await page.getByRole('dialog').innerText()).includes('메모 줄 끝에서 Enter'));
  await page.keyboard.press('Escape');
  await dateMenu('구획 날짜 작업');
  check('A06 inherited date source visible without false change hint', (await sourceText())==='구획 날짜 · 2026-10-04'
    && await page.getByRole('dialog').getByText(/개별 지정/).count()===0);
  const beforeNoop=(await read()).commandCount; await page.getByRole('dialog').getByRole('button',{name:'날짜·시간 적용',exact:true}).click();
  check('A07 same date and time commits zero commands', (await read()).commandCount===beforeNoop);
  await dateMenu('구획 날짜 작업');
  await page.getByRole('dialog').getByLabel('실행 날짜',{exact:true}).fill('2026-10-08');
  check('A08 date draft explains source placement and commits zero before Apply', (await page.getByRole('dialog').innerText()).includes('원문 위치와 구획 날짜는 그대로')
    && (await read()).commandCount===beforeNoop);
  await page.keyboard.press('Escape');
  check('A09 Escape cancels changed draft with no command', (await read()).commandCount===beforeNoop);
  await dateMenu('구획 날짜 작업'); await page.getByRole('dialog').getByLabel('시간',{exact:true}).fill('10:00');
  check('A10 time-only edit warns about the existing individual-date effect', (await page.getByRole('dialog').innerText()).includes('시간을 바꾸면 실행 날짜도 2026-10-04으로 개별 지정됩니다'));
  await page.getByRole('dialog').getByRole('button',{name:'날짜·시간 적용',exact:true}).click();
  let current=await until(value=>value.items.find(item=>item.id===parent.id)?.time==='10:00');
  const savedParent=current.items.find(item=>item.id===parent.id);
  check('A11 time save retains identity, position, section, memo and child', savedParent.explicitDate&&savedParent.date===parent.date&&savedParent.sourceIndex===parent.sourceIndex
    &&savedParent.groupDate===parent.groupDate&&savedParent.note===parent.note&&current.items.find(item=>item.parentItemId===parent.id)?.note==='하위 첫 메모');
  await dateMenu('개별 날짜 작업');
  check('A12 individual exception shows both individual and section dates', (await sourceText()).includes('개별 날짜 · 2026-10-06')&&(await sourceText()).includes('구획 날짜 · 2026-10-04'));
  await page.getByRole('dialog').getByLabel('실행 날짜',{exact:true}).fill('2026-10-08');
  await page.getByRole('dialog').getByRole('button',{name:'날짜·시간 적용',exact:true}).click();
  current=await until(value=>value.items.find(item=>item.id===explicit.id)?.date==='2026-10-08');
  const savedExplicit=current.items.find(item=>item.id===explicit.id);
  check('A13 date-only save retains same original placement and memo', savedExplicit.sourceIndex===current.rows.find(row=>row.id===explicit.id).index
    &&savedExplicit.groupDate===explicit.groupDate&&savedExplicit.note===explicit.note&&savedExplicit.id===explicit.id);
  await dateMenu('개별 날짜 작업');
  await page.getByRole('dialog').getByLabel('실행 날짜',{exact:true}).fill('2026-10-05');
  await page.getByRole('dialog').getByRole('button',{name:'날짜·시간 적용',exact:true}).click();
  await until(value=>value.items.find(item=>item.id===explicit.id)?.date==='2026-10-05');
  await dateMenu('개별 날짜 작업');
  await page.getByRole('dialog').getByLabel('실행 날짜',{exact:true}).fill('2026-10-08');
  await page.getByRole('dialog').getByRole('button',{name:'날짜·시간 적용',exact:true}).click();
  current=await until(value=>value.items.find(item=>item.id===explicit.id)?.date==='2026-10-08');
  await dateMenu('개별 날짜 작업');
  check('F14 fill 10/05 to 10/08 survives save and reopening', (await sourceText()).includes('개별 날짜 · 2026-10-08'));
  await page.getByRole('dialog').getByLabel('실행 날짜',{exact:true}).fill('2026-10-05');
  await page.getByRole('dialog').getByRole('button',{name:'날짜·시간 적용',exact:true}).click();
  await until(value=>value.items.find(item=>item.id===explicit.id)?.date==='2026-10-05');
  await dateMenu('개별 날짜 작업');
  const dateInput=page.getByRole('dialog').getByLabel('실행 날짜',{exact:true}), keyboardDateSteps=[];
  await dateInput.focus();
  for (let i=0;i<4;i++) await dateInput.press('ArrowLeft');
  let daySegment=false;
  for (let i=0;i<3;i++) {
    await dateInput.press('ArrowUp');
    const value=await dateInput.inputValue(); keyboardDateSteps.push({key:'ArrowUp',value});
    if (value==='2026-10-06') { daySegment=true; break; }
    await dateInput.press('ArrowDown');
    keyboardDateSteps.push({key:'ArrowDown',value:await dateInput.inputValue()});
    await dateInput.press('ArrowRight');
  }
  check('F15 native date keyboard finds day segment without fill',daySegment);
  for (let i=0;i<2;i++) { await dateInput.press('ArrowUp'); keyboardDateSteps.push({key:'ArrowUp',value:await dateInput.inputValue()}); }
  check('F16 keyboard draft 10/05 to 10/08 updates the form',await dateInput.inputValue()==='2026-10-08');
  await page.getByRole('dialog').getByRole('button',{name:'날짜·시간 적용',exact:true}).click();
  current=await until(value=>value.items.find(item=>item.id===explicit.id)?.date==='2026-10-08');
  check('F17 keyboard date save retains identity, memo and section',current.items.find(item=>item.id===explicit.id)?.note===explicit.note
    &&current.items.find(item=>item.id===explicit.id)?.groupDate===explicit.groupDate);
  const savedRaw=current.raw; await page.reload(); await area.waitFor(); current=await read();
  check('A14 reload restores successful synthetic account state', current.raw===savedRaw&&current.items.find(item=>item.id===parent.id)?.time==='10:00'
    &&current.items.find(item=>item.id===explicit.id)?.date==='2026-10-08');
  const raw=await area.inputValue(), marker='  - 메모: 부모 둘째 메모', end=raw.indexOf(marker)+marker.length;
  await area.focus(); await area.evaluate((node,at)=>node.setSelectionRange(at,at),end);
  await page.keyboard.press('Enter'); await page.keyboard.insertText('자동 검사에서 이어 쓴 메모');
  current=await until(value=>value.items.find(item=>item.id===parent.id)?.note.endsWith('\n자동 검사에서 이어 쓴 메모'));
  check('A15 real editor memo Enter saves to the same Item', current.items.length===3&&current.items.find(item=>item.id===parent.id)?.time==='10:00');
  const memoRaw=current.raw; await area.fill(memoRaw+'\n일반 문서에만 남을 문장');
  current=await until(value=>value.raw.endsWith('일반 문서에만 남을 문장'));
  check('A16 ordinary text remains prose after real save',current.items.length===3&&current.items.find(item=>item.id===parent.id)?.note.endsWith('자동 검사에서 이어 쓴 메모'));
  await page.getByRole('region',{name:'서버 저장 상태',exact:true}).getByRole('button',{name:'되돌리기',exact:true}).click();
  current=await until(value=>value.raw===memoRaw);
  check('A17 existing account Undo restores last successful text change',current.items.find(item=>item.id===parent.id)?.date===parent.date&&current.items.length===3);
  const viewports=[];
  for (const [width,height] of [[390,844],[375,812],[844,390],[1024,768],[1440,900]]) {
    await page.setViewportSize({width,height}); await dateMenu('개별 날짜 작업');
    const applyButton=page.getByRole('dialog').getByRole('button',{name:'날짜·시간 적용',exact:true}); await applyButton.scrollIntoViewIfNeeded();
    const applyVisible=await applyButton.evaluate(node=>{const r=node.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&!!h&&(h===node||node.contains(h));});
    const close=page.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}); await close.scrollIntoViewIfNeeded();
    const closeVisible=await close.evaluate(node=>{const r=node.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&!!h&&(h===node||node.contains(h));});
    const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
    const dialogOverflow=await page.getByRole('dialog').evaluate(node=>node.scrollWidth-node.clientWidth);
    check(`VD${width}x${height} date source, overflow and apply/close access`,overflow<=1&&dialogOverflow<=1&&applyVisible&&closeVisible&&(await sourceText()).includes('개별 날짜 · 2026-10-08'));
    await page.screenshot({path:`output/playwright/memo-date/app-date-${width}x${height}.png`,fullPage:false}); await page.keyboard.press('Escape');
    await menu('  - 메모: 부모 첫 메모');
    const memoVisible=(await page.getByRole('dialog').innerText()).includes('메모 · 구획 날짜 작업');
    check(`VM${width}x${height} memo owner context readable`,memoVisible&&await page.getByRole('dialog').evaluate(node=>node.scrollWidth-node.clientWidth)<=1);
    await page.screenshot({path:`output/playwright/memo-date/app-memo-${width}x${height}.png`,fullPage:false}); await page.keyboard.press('Escape');
    viewports.push({width,height,overflow,dialogOverflow,applyVisible,closeVisible,memoVisible});
  }
  current=await read();
  check('A18 protected storage bytes, public originals and zero external writers',current.sentinelsExact&&current.publicUnchanged&&current.forbiddenStorageCalls.length===0
    &&current.forwardedAuth===0&&current.forwardedApi===0&&current.prohibitedRequests.length===0&&current.deniedWebSockets.length===0
    &&current.pageErrors.length===0&&current.consoleErrors.length===0&&current.bootstrapErrors.length===0&&current.workerAttempts.length===0);
  return {schema:'flowme-memo-date-app-browser/1',checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,viewports,
    commandCount:current.commandCount,syntheticRevision:current.account.revision,authIntercepted:current.authIntercepted,apiIntercepted:current.apiIntercepted,
    forwardedAuth:current.forwardedAuth,forwardedApi:current.forwardedApi,forbiddenStorageCalls:current.forbiddenStorageCalls,
    storageCallCount:current.storageCalls.length,sentinelsExact:current.sentinelsExact,publicUnchanged:current.publicUnchanged,
    prohibitedRequests:current.prohibitedRequests,pageErrors:current.pageErrors,consoleErrors:current.consoleErrors,
    documentLoads:current.documentLoads,keyboardDateSteps,nativeDatePicker:false,device:false,observedUsers:0};
}
