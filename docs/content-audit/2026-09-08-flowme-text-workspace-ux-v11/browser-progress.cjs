'use strict';
// Independent v11 UI QA. No argument writes a not-run plan; freeze permits --run --final.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const KEY='flowme:ux-review:text-workspace-v11:20260908',URL=process.env.FLOWME_V11_URL||'http://127.0.0.1:8771/index.html';
const TRACKED='flow-move-d30-line-3',DAY7='2026-09-07',DAY8='2026-09-08';
const ONLY=(process.argv.find(x=>x.startsWith('--only='))||'').slice(7);
const RESULT=path.join(__dirname,ONLY?'browser-progress-results-'+ONLY.toLowerCase()+'.json':'browser-progress-results.json');
const IMAGE_DIR=path.resolve(__dirname,'../../../output/playwright/flowme-text-v11');
const SOURCES=['app.js','model.js','editor.js','index.html','styles.css','editor.css'];
const hashes=dir=>Object.fromEntries(SOURCES.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,n))).digest('hex')]));
const optionalHashes=dir=>SOURCES.every(n=>fs.existsSync(path.join(dir,n)))?hashes(dir):null;
const PLAN=[
 ['P901','예시 날짜별10/20·현재20 동일항목','keyboard'],
 ['P902','빈 항목 메뉴에서7일10→8일20 기록','keyboard'],
 ['P903','과거15 수정·현재20 보존','keyboard'],
 ['P904','같은날 upsert·0% 유효값','keyboard'],
 ['P905','범위밖·소수·빈 입력 거부','keyboard'],
 ['P906','진행 기록 Undo/Redo 원자성','keyboard'],
 ['P907','reload·저장키·원문/참조 보존','keyboard'],
 ['P908','저장 실패 값 유지·다시 저장','keyboard'],
 ['P909','두 탭 충돌·입력 보존·외부 기록 보호','keyboard'],
 ['P910','동명 항목 두 ID 분리','keyboard'],
 ['P911','참조 문서순서 이동·기록 보존','keyboard'],
 ['P912','375/390 CDP 터치·진행 입력 화면','cdp-touch'],
 ['P913','태블릿 가로/세로·진행 화면','layout'],
 ['P914','100완료·과거수정·최신감소20','keyboard'],
 ['P915','예정일 변경·과거 기록 불이동','keyboard'],
 ['P916','tracked 원문 완료/삭제 차단·복구','keyboard']
].map(([id,name,input])=>({id,name,input}));
const runners=new Map(),pause=ms=>new Promise(r=>setTimeout(r,ms));
const raw=p=>p.locator('.tle-textarea'),tab=(p,name)=>p.getByRole('tab',{name,exact:true});
async function frames(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function saved(p){await p.waitForFunction(()=>['이 기기에 저장됨','예시 · 변경 시 자동저장'].includes(document.querySelector('#save-status').textContent));}
async function data(p){return p.evaluate(()=>{const m=TextWorkspaceModel,s=m.read(localStorage).state;return {state:s,tasks:m.tasks(s),records:s.progressRecords};});}
function history(d,id=TRACKED){return d.records.filter(r=>r.taskId===id).map(({date,percent})=>({date,percent})).sort((a,b)=>a.date.localeCompare(b.date));}
function latest(d,id=TRACKED){return history(d,id).at(-1)||null;}
function task(d,id=TRACKED){return d.tasks.find(t=>t.id===id);}
function stableItems(before,after){assert.deepEqual(after.tasks.map(t=>t.id).sort(),before.tasks.map(t=>t.id).sort());assert.deepEqual(after.state.bindings,before.state.bindings);assert.deepEqual(after.state.folders,before.state.folders);}
async function all(p){if(await p.locator('#dialog').evaluate(e=>e.open))await p.keyboard.press('Escape');await tab(p,'전체').click();await p.locator('#folder-filter').selectOption('');await frames(p);}
async function more(p){await p.locator('#quick-progress-form').waitFor();await frames(p);await p.locator('[data-action="progress-more"]').click();await p.locator('#progress-form').waitFor();await frames(p);}
async function openProgress(p,id=TRACKED,date){
  await all(p);const row=p.locator('[data-task-row="'+id+'"]');assert.equal(await row.count(),1);
  const direct=row.locator('[data-action="progress-open"]');
  if(await direct.count())await direct.click();else{await row.locator('[data-action="task-menu"]').click();await p.locator('#dialog [data-action="progress-open"]').click();}
  await more(p);if(date)await p.locator('#progress-date').fill(date);
}
async function record(p,id,date,percent){await openProgress(p,id,date);await p.locator('#progress-percent').fill(String(percent));await p.locator('#progress-form button[type="submit"]').click();await saved(p);await frames(p);}
async function current(p,id=TRACKED){await all(p);const row=p.locator('[data-task-row="'+id+'"]');assert.equal(await row.count(),1);return row.locator('[data-action="progress-open"]').textContent();}
async function period(p,name,date){await tab(p,name).click();await p.locator('#anchor-date').fill(date);await p.locator('#anchor-date').press('Tab');await frames(p);}
async function snapshots(p,id=TRACKED){return p.locator('[data-task-row="'+id+'"][data-record-percent]').evaluateAll(es=>es.map(e=>({date:e.dataset.entryDate,percent:Number(e.dataset.recordPercent)})).sort((a,b)=>a.date.localeCompare(b.date)));}
async function document(p,id){
  if(await p.locator('#dialog').evaluate(e=>e.open))await p.keyboard.press('Escape');
  const entry=p.locator('#navigation [data-action="document"][data-id="'+id+'"]');
  if(!await entry.isVisible())await p.getByRole('button',{name:'탐색',exact:true}).click();await entry.click();await raw(p).waitFor();await frames(p);
}
async function caret(p,index){await raw(p).focus();await p.keyboard.press('Control+Home');for(let i=0;i<index;i++)await p.keyboard.press('ArrowDown');await p.keyboard.press('End');await frames(p);}
async function fixture(p,title='검사 항목',duplicate=false){
  if(!await p.locator('#navigation [data-action="new-document"]').isVisible())await p.getByRole('button',{name:'탐색',exact:true}).click();
  await p.getByRole('button',{name:'새 문서',exact:true}).click();await p.locator('#new-title').fill('진행 검사');await p.locator('#new-folder').selectOption('folder-unfiled');await p.locator('#new-document-form button[type=submit]').click();
  await raw(p).fill('['+DAY7+']\n- [ ] '+title+(duplicate?'\n- [ ] '+title:''));await saved(p);const d=await data(p),id=await p.evaluate(()=>new URLSearchParams(location.hash.slice(1)).get('doc'));
  return {data:d,id,tasks:d.tasks.filter(t=>t.docId===id)};
}
async function capture(p,name){fs.mkdirSync(IMAGE_DIR,{recursive:true});const file=path.join(IMAGE_DIR,name+'.png');await p.screenshot({path:file});return file;}
async function dimensions(p){return p.evaluate(()=>{const r=document.querySelector('#dialog').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,dialog:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},fonts:document.fonts.status};});}
function visible(g){assert.equal(g.width,g.scrollWidth);assert.equal(g.fonts,'loaded');assert(g.dialog.x>=-1&&g.dialog.right<=g.width+1&&g.dialog.y>=-1&&g.dialog.bottom<=g.height+1,JSON.stringify(g));}
async function touchDriver(ctx,p){const c=await ctx.newCDPSession(p);const send=(type,pt)=>c.send('Input.dispatchTouchEvent',{type,touchPoints:pt?[{x:pt.x,y:pt.y,id:1,radiusX:2,radiusY:2,force:1}]:[]});return {tap:async locator=>{await locator.scrollIntoViewIfNeeded();await frames(p);const b=await locator.boundingBox();assert(b);await send('touchStart',{x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)});await pause(70);await send('touchEnd');},detach:()=>c.detach()};}

runners.set('P901',async({page:p})=>{
 const before=await data(p);assert.deepEqual(history(before),[{date:DAY7,percent:10},{date:DAY8,percent:20}]);assert.match(await current(p),/20%/);
 const checks=[];for(const [name,date,expected] of [['일',DAY7,[{date:DAY7,percent:10}]],['일',DAY8,[{date:DAY8,percent:20}]],['주',DAY7,history(before)],['월',DAY7,history(before)]]){await period(p,name,date);const actual=await snapshots(p);assert.deepEqual(actual,expected);checks.push({name,date,actual});}
 await all(p);for(const scopeId of ['folder-move','flow-move-d30']){await p.locator('#folder-filter').selectOption(scopeId);assert.equal(await p.locator('[data-task-row="'+TRACKED+'"]').count(),1);assert.match(await p.locator('[data-task-row="'+TRACKED+'"] [data-action="progress-open"]').textContent(),/20%/);}
 await document(p,'flow-move-d30');const source=p.locator('.tle-progress-hit[data-line-index="2"]');assert.equal(await source.getAttribute('data-progress-percent'),'20');assert.equal(await source.getAttribute('role'),null);
 await source.click();await more(p);assert.equal(await p.locator('#progress-date').inputValue(),DAY8,'Source current badge must open its current record date.');assert.equal(await p.locator('#progress-percent').inputValue(),'20');
 assert.deepEqual(await data(p),before);return {checks,currentUnique:true,sourceCurrent20:true};
});
runners.set('P902',async({page:p})=>{
 const f=await fixture(p),id=f.tasks[0].id,before=f.data;await record(p,id,DAY7,10);await record(p,id,DAY8,20);const after=await data(p);
 assert.deepEqual(history(after,id),[{date:DAY7,percent:10},{date:DAY8,percent:20}]);stableItems(before,after);assert.equal(task(after,id).date,DAY7);assert.match(await current(p,id),/20%/);
 return {id,records:history(after,id),newItems:0,scheduledDatePreserved:true};
});
runners.set('P903',async({page:p})=>{
 const before=await data(p);await period(p,'주',DAY7);await p.locator('[data-task-row="'+TRACKED+'"] [data-action="progress-open"][data-date="'+DAY7+'"]').click();await more(p);
 assert.equal(await p.locator('#progress-date').inputValue(),DAY7);assert.equal(await p.locator('#progress-percent').inputValue(),'10');await p.locator('#progress-percent').fill('15');await p.locator('#progress-form button[type=submit]').click();await saved(p);
 const after=await data(p);assert.deepEqual(history(after),[{date:DAY7,percent:15},{date:DAY8,percent:20}]);assert.match(await current(p),/20%/);stableItems(before,after);
 await openProgress(p);const entries=await p.locator('[data-history-date]').evaluateAll(es=>es.map(e=>({date:e.dataset.historyDate,percent:Number(e.dataset.historyPercent)})).sort((a,b)=>a.date.localeCompare(b.date)));assert.deepEqual(entries,history(after));
 return {history:entries,latest:latest(after),pastFormDateCorrect:true};
});
runners.set('P904',async({page:p})=>{await record(p,TRACKED,DAY8,25);assert.equal(history(await data(p)).length,2);await record(p,TRACKED,DAY8,0);const d=await data(p);assert.deepEqual(latest(d),{date:DAY8,percent:0});assert.equal(history(d).length,2);await all(p);assert.match(await p.locator('[data-task-row="'+TRACKED+'"] [data-action="progress-open"]').getAttribute('aria-label'),/0%/);return {upsertRecords:2,zeroIsRecorded:true};});
runners.set('P905',async({page:p})=>{
 const before=await data(p),checks=[];await openProgress(p);for(const value of ['-1','101','12.5','']){await p.locator('#progress-percent').fill(value);await p.locator('#progress-form button[type=submit]').click();await frames(p);assert.deepEqual(await data(p),before);assert.equal(await p.locator('#progress-form').isVisible(),true);checks.push({value,valid:await p.locator('#progress-percent').evaluate(e=>e.validity.valid)});}
 await p.locator('#progress-percent').fill('20');await p.locator('#progress-date').fill('');await p.locator('#progress-form button[type=submit]').click();await frames(p);assert.deepEqual(await data(p),before);await p.keyboard.press('Escape');assert.deepEqual(await data(p),before);return {checks,emptyDateRejected:true,cancelMutations:0};
});
runners.set('P906',async({page:p})=>{const before=await data(p);await record(p,TRACKED,DAY8,100);const after=await data(p);assert.equal(task(after).done,true);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await data(p),before);await p.keyboard.press('Control+Shift+z');await saved(p);assert.deepEqual(await data(p),after);return {oneUndoRestoresRecordAndDone:true,redoRestores:true};});
runners.set('P907',async({page:p})=>{await record(p,TRACKED,DAY8,35);const before=await data(p);await p.reload();await p.locator('#period-view').waitFor();assert.deepEqual(await data(p),before);assert.deepEqual(await p.evaluate(()=>[...new Set(window.__qaStorage.map(x=>x.key))]),[KEY]);assert.match(await current(p),/35%/);return {reloadRecordsAndIds:true,onlyIsolatedV8Key:true};});
runners.set('P908',async({page:p})=>{
 const before=await data(p);await openProgress(p,TRACKED,DAY8);await p.locator('#progress-percent').fill('35');await p.evaluate(()=>{window.__qaFailure=true;});await p.locator('#progress-form button[type=submit]').click();
 await p.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');assert.deepEqual(await data(p),before);
 assert.match(await p.locator('[data-task-row="'+TRACKED+'"] [data-action=progress-open]').textContent(),/35%/);
 assert.equal(await p.locator('#save-error [data-action=retry]').isVisible(),true);
 await p.evaluate(()=>{window.__qaFailure=false;});await p.locator('#save-error [data-action=retry]').click();await saved(p);const after=await data(p);assert.deepEqual(latest(after),{date:DAY8,percent:35});assert.equal(history(after).length,2);stableItems(before,after);
 await openProgress(p,TRACKED,DAY8);assert.equal(await p.locator('#progress-percent').inputValue(),'35');
 return {unsavedValueVisible:true,globalSaveRetry:true,reopenedValue:35,duplicateRecord:0};
});
runners.set('P909',async({page:p,context,url})=>{
 await record(p,TRACKED,DAY8,20);await openProgress(p,TRACKED,DAY8);await p.locator('#progress-percent').fill('35');const other=await context.newPage();await other.goto(url);await raw(other).waitFor();await record(other,TRACKED,'2026-09-09',40);
 await p.waitForFunction(()=>document.querySelector('.tle-textarea').readOnly);const external=await data(p);assert.equal(await p.locator('#progress-percent').inputValue(),'35');await p.locator('#progress-form button[type=submit]').click();await frames(p);assert.deepEqual(await data(p),external);assert.equal(await p.locator('#progress-percent').inputValue(),'35');return {externalLatest:latest(external),localInputPreserved:true,externalNotOverwritten:true};
});
runners.set('P910',async({page:p})=>{const f=await fixture(p,'같은 제목',true);assert.equal(f.tasks.length,2);const [a,b]=f.tasks;await record(p,a.id,DAY7,10);const d=await data(p);assert.deepEqual(history(d,a.id),[{date:DAY7,percent:10}]);assert.deepEqual(history(d,b.id),[]);assert.notEqual(a.id,b.id);assert.equal(d.tasks.length,f.data.tasks.length);return {ids:[a.id,b.id],notMerged:true};});
runners.set('P911',async({page:p})=>{
 const before=await data(p);await document(p,'d-move');const meta=await p.evaluate(id=>{const m=TextWorkspaceModel,s=m.read(localStorage).state;const row=m.rowMeta(s,'d-move').find(r=>r.isReference&&r.taskId===id);return {row,selection:m.selectionForMove(s,'d-move',row.id),targets:m.moveTargets(s,'d-move',row.id)};},TRACKED);const target=meta.targets.find(t=>t.depth===meta.row.depth);assert(target);
 await caret(p,meta.row.index);await p.keyboard.press('Alt+Shift+m');await frames(p);const dest=p.locator('.tle-move-target-button[data-move-target="'+(target.beforeLineId===null?'__end':target.beforeLineId)+'"]');await dest.evaluate(e=>{const rows=document.querySelectorAll('.tle-line'),row=rows[Number(e.dataset.lineIndex)],last=rows[rows.length-1];document.querySelector('.tle-textarea').scrollTop=Math.max(0,(row?row.offsetTop:last.offsetTop+last.offsetHeight)-80);});await frames(p);await dest.scrollIntoViewIfNeeded();await dest.focus();await frames(p);const keepDepth=await p.locator('.tle-move-selected').first().evaluate(e=>{const m=TextWorkspaceModel,s=m.read(localStorage).state,id=new URLSearchParams(location.hash.slice(1)).get('doc');return m.rowMeta(s,id)[Number(e.dataset.lineIndex)].depth;});for(let i=0;i<65&&Number(await dest.getAttribute('data-depth'))!==keepDepth;i++){await dest.press(Number(await dest.getAttribute('data-depth'))>keepDepth?'ArrowLeft':'ArrowRight');await frames(p);}assert.equal(Number(await dest.getAttribute('data-depth')),keepDepth);assert.equal(await dest.evaluate(e=>document.activeElement===e),true);await p.keyboard.press('Enter');await saved(p);
 const after=await data(p);assert.deepEqual(after.records,before.records);assert.deepEqual(after.state.flows,before.state.flows);stableItems(before,after);assert.notDeepEqual(after.state.documents,before.state.documents);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await data(p),before);return {referenceLine:meta.row.id,canonicalId:TRACKED,target:target.beforeLineId,historyAndOriginalPreserved:true};
});
runners.set('P912',async({page:p,touch})=>{
 const checks=[],screenshots=[];for(const width of [375,390]){await p.setViewportSize({width,height:844});await all(p);const badge=p.locator('[data-task-row="'+TRACKED+'"] [data-action=progress-open]');await touch.tap(badge);await more(p);const g=await dimensions(p);visible(g);checks.push(g);screenshots.push(await capture(p,'progress-form-'+width+'x844'));
 await p.locator('#progress-date').fill(DAY8);await p.locator('#progress-percent').fill('20');await touch.tap(p.locator('#progress-form button[type=submit]'));await saved(p);assert.deepEqual(latest(await data(p)),{date:DAY8,percent:20});screenshots.push(await capture(p,'progress-current-'+width+'x844'));}
 return {checks,screenshots,method:'Trusted CDP touch at exact button centers; not physical finger or OS keyboard'};
});
runners.set('P913',async({page:p})=>{const checks=[],screenshots=[];for(const [width,height] of [[1194,834],[834,1194]]){await p.setViewportSize({width,height});await openProgress(p);const g=await dimensions(p);visible(g);checks.push(g);screenshots.push(await capture(p,'progress-form-'+width+'x'+height));await p.keyboard.press('Escape');await period(p,'주',DAY7);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth),true);screenshots.push(await capture(p,'progress-week-'+width+'x'+height));await p.locator('#task-search').fill('이사업체 견적 비교');await frames(p);assert.deepEqual(await snapshots(p),[{date:DAY7,percent:10},{date:DAY8,percent:20}]);screenshots.push(await capture(p,'progress-week-filtered-'+width+'x'+height));}return {checks,screenshots,realTablet:false};});
runners.set('P914',async({page:p})=>{await record(p,TRACKED,DAY8,100);assert.equal(task(await data(p)).done,true);await record(p,TRACKED,DAY7,15);assert.equal(task(await data(p)).done,true);assert.deepEqual(latest(await data(p)),{date:DAY8,percent:100});await record(p,TRACKED,DAY8,20);const d=await data(p);assert.equal(task(d).done,false);assert.deepEqual(history(d),[{date:DAY7,percent:15},{date:DAY8,percent:20}]);return {latestDateControlsDone:true,decreaseAllowed:true,notSummed:true};});
runners.set('P915',async({page:p})=>{const before=await data(p);await all(p);await p.locator('[data-task-row="'+TRACKED+'"] [data-action=task-date]').click();await p.locator('#task-date').fill('2026-09-10');await p.locator('#date-form button[type=submit]').click();await saved(p);const after=await data(p);assert.deepEqual(after.records,before.records);assert.equal(task(after).date,'2026-09-10');await p.locator('[data-task-row="'+TRACKED+'"] [data-action=task-menu]').click();await p.locator('#dialog [data-action=progress-open]').click();await more(p);assert.equal(await p.locator('#progress-date').inputValue(),DAY8);assert.equal(await p.locator('#progress-percent').inputValue(),'20');await p.keyboard.press('Escape');await period(p,'주',DAY7);assert.deepEqual(await snapshots(p),history(before));return {scheduleDateChanged:true,recordDatesUnchanged:true,currentMenuUsesLatestRecordDate:true};});
runners.set('P916',async({page:p})=>{
 await record(p,TRACKED,DAY8,20);await document(p,'flow-move-d30');const before=await data(p),source=await raw(p).inputValue(),lines=source.split('\n');assert.match(lines[2],/- \[ \]/);lines[2]=lines[2].replace('- [ ]','- [x]');const invalid=lines.join('\n');await raw(p).fill(invalid);await p.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');assert.equal(await raw(p).inputValue(),invalid);assert.deepEqual(await data(p),before);await raw(p).fill(source);await saved(p);
 const removed=source.split('\n').filter((_,i)=>i!==2).join('\n');await raw(p).fill(removed);await p.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');assert.equal(await raw(p).inputValue(),removed);assert.deepEqual(await data(p),before);await raw(p).fill(source);await saved(p);assert.deepEqual(await data(p),before);return {rawDoneConflictBlocked:true,recordedItemDeleteBlocked:true,recoveryExact:true};
});

async function main(){
 const report={schema:'flowme-v11-progress-qa',mode:'planned',url:URL,storageKey:KEY,createdAt:new Date().toISOString(),realDevices:0,observedUsers:0,productionIntegration:0,summary:{planned:PLAN.length,executed:0,passed:null,failed:null,notRun:PLAN.length},cases:PLAN.map(c=>({...c,status:'not_run',console:[],pageErrors:[]}))};
 if(!process.argv.includes('--run')){if(fs.existsSync(RESULT)&&JSON.parse(fs.readFileSync(RESULT)).mode==='executed'){console.log('기존 실행 결과 보존');return;}fs.writeFileSync(RESULT,JSON.stringify(report,null,2)+'\n');console.log('진행 QA 16개 계획 · 실행0');return;}
 report.phase=process.argv.includes('--final')?'final':'preliminary';if(ONLY){assert.equal(report.phase,'preliminary');report.only=ONLY;}
 report.sourceHashesBefore=hashes(__dirname);const previous=path.join(__dirname,'../2026-09-08-flowme-text-workspace-ux-v10');report.v10HashesBefore=optionalHashes(previous);
 const m=require('./model.js');assert.equal(m.KEY,KEY);assert.equal(m.createState().version,11);for(const key of ['recordProgress','progressHistory','latestProgress'])assert.equal(typeof m[key],'function');
 if(fs.existsSync(RESULT)){const old=JSON.parse(fs.readFileSync(RESULT));if(old.mode==='executed'&&JSON.stringify(old.sourceHashesAfter)!==JSON.stringify(report.sourceHashesBefore)){const file=path.join(__dirname,'browser-progress-results-previous-runtime.json');if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(old,null,2)+'\n');}if(old.mode==='executed'&&old.summary.failed){const file=path.join(__dirname,old.phase==='final'?'browser-progress-results-final-initial.json':'browser-progress-results-initial.json');if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(old,null,2)+'\n');}}
 const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});report.mode='executed';report.browser=browser.version();report.startedAt=new Date().toISOString();
 try{for(const c of report.cases){if(ONLY&&c.id!==ONLY)continue;const isTouch=c.input==='cdp-touch',context=await browser.newContext({viewport:{width:isTouch?390:1194,height:isTouch?844:834},hasTouch:true,isMobile:isTouch});
 await context.addInitScript(key=>{window.__qaStorage=[];window.__qaEvents=[];for(const method of ['getItem','setItem','removeItem']){const original=Storage.prototype[method];Storage.prototype[method]=function(name,value){window.__qaStorage.push({method,key:String(name)});if(method==='setItem'&&name===key&&window.__qaFailure)throw new DOMException('Independent QA quota failure','QuotaExceededError');return method==='setItem'?original.call(this,name,value):original.call(this,name);};}for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>{window.__qaEvents.push({type,trusted:e.isTrusted,pointerType:e.pointerType||'',target:e.target.className?.baseVal??e.target.className});},true);},KEY);
 const page=await context.newPage();page.setDefaultTimeout(8000);const touch=await touchDriver(context,page);page.on('console',msg=>{if(['error','warning'].includes(msg.type()))c.console.push({type:msg.type(),text:msg.text()});});page.on('pageerror',e=>c.pageErrors.push(e.message));const start=Date.now();
 try{await page.goto(URL);await raw(page).waitFor();await page.evaluate(()=>document.fonts.ready);c.evidence=await runners.get(c.id)({page,context,touch,url:URL});assert.deepEqual(c.pageErrors,[]);c.events=await page.evaluate(()=>window.__qaEvents);if(isTouch)assert(c.events.some(e=>e.trusted&&e.pointerType==='touch'&&e.type==='pointerdown'));c.status='passed';}
 catch(e){c.status='failed';c.error=e.stack||String(e);c.diagnostic=await page.evaluate(()=>({url:location.href,save:document.querySelector('#save-status')?.textContent,error:document.querySelector('#dialog-error')?.textContent,form:document.querySelector('#progress-form')?.outerHTML,raw:document.querySelector('.tle-textarea')?.value})).catch(()=>null);}
 finally{c.elapsedMs=Date.now()-start;await touch.detach().catch(()=>{});await context.close();}console.log(c.id+' '+c.status+' ('+c.elapsedMs+'ms)'+(c.error?'\n'+c.error:''));}}
 finally{await browser.close();}
 report.finishedAt=new Date().toISOString();report.sourceHashesAfter=hashes(__dirname);report.v10HashesAfter=optionalHashes(previous);report.sourcesUnchangedDuringRun=JSON.stringify(report.sourceHashesBefore)===JSON.stringify(report.sourceHashesAfter);report.v10UnchangedDuringRun=report.v10HashesBefore===null?null:JSON.stringify(report.v10HashesBefore)===JSON.stringify(report.v10HashesAfter);
 const passed=report.cases.filter(c=>c.status==='passed').length,failed=report.cases.filter(c=>c.status==='failed').length;report.summary={planned:PLAN.length,executed:passed+failed,passed,failed,notRun:PLAN.length-passed-failed};fs.writeFileSync(RESULT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(failed||(!ONLY&&report.summary.notRun)||!report.sourcesUnchangedDuringRun||report.v10UnchangedDuringRun===false)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
