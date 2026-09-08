'use strict';
// Independent v11 UI QA. No argument writes a not-run plan; freeze permits --run --final.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const KEY='flowme:ux-review:text-workspace-v11:20260908',URL=process.env.FLOWME_V11_URL||'http://127.0.0.1:8771/index.html';
const TRACKED='flow-move-d30-line-3',DAY7='2026-09-07',DAY8='2026-09-08';
const ONLY=(process.argv.find(x=>x.startsWith('--only='))||'').slice(7);
const RESULT=path.join(__dirname,ONLY?'browser-v11-results-'+ONLY.toLowerCase()+'.json':'browser-v11-results.json');
const IMAGE_DIR=path.resolve(__dirname,'../../../output/playwright/flowme-text-v11');
const SOURCES=['app.js','model.js','editor.js','index.html','styles.css','editor.css'];
const hashes=dir=>Object.fromEntries(SOURCES.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,n))).digest('hex')]));
const optionalHashes=dir=>SOURCES.every(n=>fs.existsSync(path.join(dir,n)))?hashes(dir):null;
const PLAN=[
  {
    "id": "Q901",
    "name": "첫 빈 상태칸 열기·Escape",
    "expectation": "미저장100 기본값; 기록/완료 변경0; 미완료 필터에서 항목 유지",
    "input": "keyboard"
  },
  {
    "id": "Q902",
    "name": "기존20 기본값·0/중간/100 표현",
    "expectation": "기존20으로 열림; 빈체크/%/체크 표시와 canonical 현재값 일치",
    "input": "keyboard"
  },
  {
    "id": "Q903",
    "name": "slider input→change 한 번 반영",
    "expectation": "드래그 중 미리보기만; change 1회 기록; Undo 1회로 원상복구",
    "input": "mouse"
  },
  {
    "id": "Q904",
    "name": "slider pointercancel·Escape",
    "expectation": "실제 CDP 취소와 늦은 change 분리; 미리보기 취소·저장변경0",
    "input": "cdp-touch"
  },
  {
    "id": "Q905",
    "name": "숫자 직접입력·%단위·범위",
    "expectation": "0/35/100 확정; 공백/소수/음수/101 거부·입력 보존",
    "input": "keyboard"
  },
  {
    "id": "Q906",
    "name": "완료 버튼·상세 기록 경로",
    "expectation": "완료100 한 번 기록; 기록 더 보기/취소 자체는 기록0",
    "input": "keyboard"
  },
  {
    "id": "Q907",
    "name": "상태칸 longpress 이동·하위 체크",
    "expectation": "길게누르기 기록0·이동 선택 유지; subcheck도 조절창으로 독립 기록",
    "input": "cdp-touch"
  },
  {
    "id": "Q908",
    "name": "빠른 조절 quota·두 탭 충돌",
    "expectation": "미저장값·원문 보존; 다시 저장 복구; 외부 기록 덮어쓰기0",
    "input": "keyboard"
  },
  {
    "id": "Q909",
    "name": "375/390 모바일·태블릿 두 방향",
    "expectation": "compact 조절창/실제 CDP slider/넘침/포커스; 키보드 실기기와 구분",
    "input": "cdp-touch"
  },
  {
    "id": "Q910",
    "name": "TXT 다섯 수치 표기",
    "expectation": "[20%]/[20]/[0.2]=20, [1]=1, [1.0]=100; 원문 lexical 보존",
    "input": "keyboard"
  },
  {
    "id": "Q911",
    "name": "같은값 재표기·제목 편집",
    "expectation": "기존 ID와 날짜기록 유지; [20%]→[20]/[0.2]는 기록추가0",
    "input": "keyboard"
  },
  {
    "id": "Q912",
    "name": "개별·구획·fallback 날짜 우선",
    "expectation": "개별날짜→구획날짜→편집 anchor; 입력줄 기준이며 owner 날짜와 구분",
    "input": "keyboard"
  },
  {
    "id": "Q913",
    "name": "다른 날 실제 수치변경",
    "expectation": "7일10→8일20 동일ID; 이전기록 보존·현재는 최신 날짜값",
    "input": "keyboard"
  },
  {
    "id": "Q914",
    "name": "동명 항목·참조 canonical",
    "expectation": "제목으로 병합0; 참조 수치입력은 같은 canonical ID 기록",
    "input": "keyboard"
  },
  {
    "id": "Q915",
    "name": "partial·invalid·코드 안전",
    "expectation": "불완전/범위밖 토큰은 초안 유지·원본/ID/기록 보존; 코드 수치 무해석",
    "input": "keyboard"
  },
  {
    "id": "Q916",
    "name": "기존 체크 문법·삭제 보호",
    "expectation": "[ ]/[x] 자체 진행기록0; 기록과 충돌하는 완료수정·삭제 차단",
    "input": "keyboard"
  },
  {
    "id": "Q917",
    "name": "날짜구획·문서구조 이동",
    "expectation": "같은수치 구조/구획이동 새기록0; 원문당시값과 최신현재값 구분",
    "input": "keyboard"
  },
  {
    "id": "Q918",
    "name": "TXT Undo/Redo·reload·저장실패",
    "expectation": "lexical·동일ID·이력·원문 복구; quota 후 입력과 기록 보존",
    "input": "keyboard"
  }
];
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
async function emptyDocument(p){
  if(!await p.locator('#navigation [data-action="new-document"]').isVisible())await p.getByRole('button',{name:'탐색',exact:true}).click();
  await p.getByRole('button',{name:'새 문서',exact:true}).click();await p.locator('#new-title').fill('진행 검사');await p.locator('#new-folder').selectOption('folder-unfiled');await p.locator('#new-document-form button[type=submit]').click();
  await saved(p);return await p.evaluate(()=>new URLSearchParams(location.hash.slice(1)).get('doc'));
}
async function fixture(p,title='검사 항목',duplicate=false){
  const id=await emptyDocument(p);await raw(p).fill('['+DAY7+']\n- [ ] '+title+(duplicate?'\n- [ ] '+title:''));await saved(p);const d=await data(p);
  return {data:d,id,tasks:d.tasks.filter(t=>t.docId===id)};
}
async function capture(p,name){fs.mkdirSync(IMAGE_DIR,{recursive:true});const file=path.join(IMAGE_DIR,name+'.png');await p.screenshot({path:file});return file;}
async function dimensions(p){return p.evaluate(()=>{const r=document.querySelector('#dialog').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,dialog:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},fonts:document.fonts.status};});}
function visible(g){assert.equal(g.width,g.scrollWidth);assert.equal(g.fonts,'loaded');assert(g.dialog.x>=-1&&g.dialog.right<=g.width+1&&g.dialog.y>=-1&&g.dialog.bottom<=g.height+1,JSON.stringify(g));}
async function touchDriver(ctx,p){const c=await ctx.newCDPSession(p);const send=(type,pt)=>c.send('Input.dispatchTouchEvent',{type,touchPoints:pt?[{x:pt.x,y:pt.y,id:1,radiusX:2,radiusY:2,force:1}]:[]});return {tap:async locator=>{await locator.scrollIntoViewIfNeeded();await frames(p);const b=await locator.boundingBox();assert(b);await send('touchStart',{x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)});await pause(70);await send('touchEnd');},start:p=>send('touchStart',p),move:p=>send('touchMove',p),end:()=>send('touchEnd'),cancel:()=>send('touchCancel'),detach:()=>c.detach()};}


async function quick(p,id=TRACKED){await all(p);await p.locator('[data-task-row="'+id+'"] [data-action=progress-open]').click();await p.locator('#quick-progress-form').waitFor();await frames(p);}
async function calls(p){return p.evaluate(()=>window.__qaProgressCalls.length);}
async function quickNumber(p,id,value,date){await quick(p,id);if(date)await p.locator('#quick-date').fill(date);await p.locator('#quick-percent').fill(String(value));await p.locator('#quick-apply').click();await saved(p);await frames(p);}
async function rawFixture(p,text){const id=await emptyDocument(p);await raw(p).fill(text);await saved(p);const d=await data(p);return {id,data:d,tasks:d.tasks.filter(t=>t.docId===id),source:await raw(p).inputValue()};}
async function itemSource(p,docId){return p.evaluate(id=>{const m=TextWorkspaceModel;return m.raw(m.getDocument(m.read(localStorage).state,id));},docId);}
async function rangePoint(p,fraction){const b=await p.locator('#quick-range').boundingBox();assert(b);return {x:Math.round(b.x+10+(b.width-20)*fraction),y:Math.round(b.y+b.height/2)};}
async function chooseMove(p,beforeLineId){await frames(p);const b=p.locator('.tle-move-target-button[data-move-target="'+(beforeLineId===null?'__end':beforeLineId)+'"]');await b.evaluate(e=>{const rows=document.querySelectorAll('.tle-line'),row=rows[Number(e.dataset.lineIndex)],last=rows[rows.length-1];document.querySelector('.tle-textarea').scrollTop=Math.max(0,(row?row.offsetTop:last.offsetTop+last.offsetHeight)-80);});await frames(p);await b.scrollIntoViewIfNeeded();await b.focus();await frames(p);const keepDepth=await p.locator('.tle-move-selected').first().evaluate(e=>{const m=TextWorkspaceModel,s=m.read(localStorage).state,id=new URLSearchParams(location.hash.slice(1)).get('doc');return m.rowMeta(s,id)[Number(e.dataset.lineIndex)].depth;});for(let i=0;i<65&&Number(await b.getAttribute('data-depth'))!==keepDepth;i++){await b.press(Number(await b.getAttribute('data-depth'))>keepDepth?'ArrowLeft':'ArrowRight');await frames(p);}assert.equal(Number(await b.getAttribute('data-depth')),keepDepth);assert.equal(await b.evaluate(e=>document.activeElement===e),true);await p.keyboard.press('Enter');await saved(p);}
runners.set('Q901',async({page:p})=>{
 const f=await fixture(p),id=f.tasks[0].id;await all(p);await p.locator('#hide-completed').check();const before=await data(p),row=p.locator('[data-task-row="'+id+'"]');assert.equal(await row.count(),1);
 await row.locator('[data-action=progress-open]').click();await p.locator('#quick-progress-form').waitFor();await frames(p);
 assert.equal(await p.locator('#quick-percent').inputValue(),'100');assert.match(await p.locator('#quick-feedback').textContent(),/반영 전/);assert.equal(await calls(p),0);assert.deepEqual(await data(p),before);assert.equal(await row.count(),1);
 await p.keyboard.press('Escape');assert.equal(await p.locator('#dialog').evaluate(e=>e.open),false);assert.deepEqual(await data(p),before);assert.equal(await row.count(),1);return {default100Unsaved:true,openCancelRecordCalls:0,unfinishedFilterKeepsItem:true};
});
runners.set('Q902',async({page:p})=>{
 await quick(p);assert.equal(await p.locator('#quick-percent').inputValue(),'20');assert.equal(await p.locator('#quick-date').inputValue(),DAY8);await p.keyboard.press('Escape');const checks=[];
 for(const value of [0,35,100]){await quickNumber(p,TRACKED,value,DAY8);const d=await data(p);assert.equal(latest(d).percent,value);assert.equal(task(d).done,value===100);await document(p,'flow-move-d30');await p.locator('#document-title').click();await frames(p);const b=p.locator('.tle-progress-hit[data-line-index="2"]');assert.equal(await b.getAttribute('data-progress-percent'),String(value));assert.equal(await b.getAttribute('role'),null);if(value>0&&value<100)assert.match(await b.textContent(),new RegExp(value+'%'));else assert.equal(await b.locator('.tle-progress-badge').count(),0);checks.push({value,done:task(d).done});}
 return {checks,current20Default:true};
});
runners.set('Q903',async({page:p})=>{
 const before=await data(p);await quick(p);const start=await rangePoint(p,.2),end=await rangePoint(p,.63);await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(end.x,end.y,{steps:5});await frames(p);
 const preview=Number(await p.locator('#quick-percent').inputValue());assert(preview>20&&preview<100);assert.deepEqual(await data(p),before);assert.equal(await calls(p),0);assert.match(await p.locator('#quick-feedback').textContent(),/미리보기/);
 await p.mouse.up();await saved(p);await frames(p);const after=await data(p);assert.equal(latest(after).percent,preview);assert.equal(await calls(p),1);assert.equal(await p.locator('#dialog').evaluate(e=>e.open),false);
 await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await data(p),before);
 await period(p,'주',DAY8);const original=p.locator('[data-task-row="'+TRACKED+'"][data-entry-date="'+DAY8+'"] [data-action=progress-open]');await original.click();await p.locator('#quick-progress-form').waitFor();await frames(p);await p.locator('#quick-percent').fill('25');await p.locator('#quick-apply').click();await saved(p);await frames(p);const focus=await p.evaluate(()=>({id:document.activeElement.dataset.id,date:document.activeElement.dataset.date,rowDate:document.activeElement.closest('[data-entry-date]')?.dataset.entryDate}));assert.equal(focus.id,TRACKED);assert.equal(focus.rowDate,DAY8);assert.equal(await calls(p),2);return {preview,previewMutations:0,dragRecordCalls:1,oneUndo:true,originalSnapshotFocus:focus};
});
runners.set('Q904',async({page:p,touch})=>{
 const before=await data(p);await quick(p);const start=await rangePoint(p,.2),end=await rangePoint(p,.7);await touch.start(start);await touch.move(end);await frames(p);assert(Number(await p.locator('#quick-percent').inputValue())>20);assert.deepEqual(await data(p),before);await touch.cancel();await frames(p);
 assert.equal(await p.locator('#quick-percent').inputValue(),'20');assert.equal(await calls(p),0);await p.locator('#quick-range').dispatchEvent('change');await frames(p);assert.equal(await calls(p),0);assert.deepEqual(await data(p),before);
 await p.locator('#quick-apply').click();await saved(p);assert.equal(latest(await data(p)).percent,100);assert.equal(await calls(p),1);return {trustedCDPCancel:true,lateChange:'explicit synthetic regression event',cancelRecords:0,previewRestored:20,explicitCompleteRetry:100,recordCallsAfterRetry:1};
});
runners.set('Q905',async({page:p})=>{
 const before=await data(p);await quick(p);await p.locator('#quick-percent').fill('35');await p.locator('#quick-percent').press('Tab');await frames(p);assert.equal(await calls(p),0);assert.deepEqual(await data(p),before);assert.equal(await p.locator('#quick-apply').textContent(),'반영');await p.locator('#quick-percent').press('Enter');await saved(p);assert.equal(latest(await data(p)).percent,35);
 const valid=await data(p),checks=[];for(const value of ['-1','101','12.5','']){await quick(p);await p.locator('#quick-percent').fill(value);await p.locator('#quick-apply').click();await frames(p);assert.deepEqual(await data(p),valid);assert.equal(await p.locator('#quick-progress-form').isVisible(),true);checks.push({value,validity:await p.locator('#quick-percent').evaluate(e=>e.validity.valid)});await p.keyboard.press('Escape');}
 await quick(p);await p.locator('#quick-range').focus();await p.keyboard.press('ArrowRight');await frames(p);assert.deepEqual(await data(p),valid);const keyboardPreview=Number(await p.locator('#quick-percent').inputValue());await p.keyboard.press('Enter');await saved(p);assert.equal(latest(await data(p)).percent,keyboardPreview);return {blurRecordCalls:0,numberEnter:35,checks,keyboardPreviewThenEnter:keyboardPreview};
});
runners.set('Q906',async({page:p})=>{
 const before=await data(p);await quick(p);assert.equal(await p.locator('#quick-apply').textContent(),'100% 완료');await p.locator('#quick-apply').click();await saved(p);assert.equal(latest(await data(p)).percent,100);assert.equal(await calls(p),1);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await data(p),before);
 await quick(p);await p.locator('[data-action=progress-more]').click();await p.locator('#progress-form').waitFor();await p.keyboard.press('Escape');assert.deepEqual(await data(p),before);assert.equal(await calls(p),1);return {completeWrites100:true,oneUndo:true,detailOpenCancelAddsRecords:0};
});
runners.set('Q907',async({page:p,touch})=>{
 const f=await rawFixture(p,'['+DAY7+']\n- [ ] 부모\n  - [ ] 하위\n- [ ] 다음 부모'),before=f.data;await p.locator('#document-title').click();await frames(p);const b=p.locator('.tle-progress-hit[data-line-index="1"]'),box=await b.boundingBox();assert(box);await touch.start({x:Math.round(box.x+box.width/2),y:Math.round(box.y+box.height/2)});await pause(600);await p.locator('.tle-root.tle-has-move-selection').waitFor();await touch.end();await frames(p);assert.deepEqual(await data(p),before);assert.equal(await calls(p),0);await p.keyboard.press('Escape');
 const child=p.locator('.tle-progress-hit[data-line-index="2"]');assert.equal(await child.getAttribute('role'),null);await touch.tap(child);await p.locator('#quick-progress-form').waitFor();await frames(p);assert.deepEqual(await data(p),before);await p.locator('#quick-apply').click();await saved(p);const after=await data(p),parent=after.tasks.find(t=>t.docId===f.id);assert.equal(parent.done,false);assert.equal(parent.subchecks[0].done,true);assert.equal(latest(after,parent.subchecks[0].id).percent,100);assert.deepEqual(history(after,parent.id),[]);return {longpressRecords:0,releaseKeepsSelection:true,childProgress100:true,parentAggregation:0};
});
runners.set('Q908',async({page:p,context,url})=>{
 const before=await data(p);await quick(p);await p.locator('#quick-percent').fill('35');await p.evaluate(()=>{window.__qaFailure=true;});await p.locator('#quick-apply').click();await p.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');assert.deepEqual(await data(p),before);assert.match(await p.locator('[data-task-row="'+TRACKED+'"] [data-action=progress-open]').textContent(),/35%/);await p.evaluate(()=>{window.__qaFailure=false;});await p.locator('#save-error [data-action=retry]').click();await saved(p);assert.equal(latest(await data(p)).percent,35);
 await quick(p);await p.locator('#quick-percent').fill('45');const other=await context.newPage();await other.goto(url);await raw(other).waitFor();await record(other,TRACKED,'2026-09-09',50);await p.waitForFunction(()=>document.querySelector('.tle-textarea').readOnly);const external=await data(p);assert.equal(await p.locator('#quick-percent').inputValue(),'45');assert.equal(await p.locator('#quick-apply').isDisabled(),true);await p.keyboard.press('Enter');await frames(p);assert.deepEqual(await data(p),external);assert.equal(await p.locator('#quick-percent').inputValue(),'45');assert.equal(await p.locator('#dialog-error').isVisible(),true);return {quotaRetryValue:35,conflictInput:45,conflictSubmitDisabled:true,externalLatest:latest(external)};
});
runners.set('Q909',async({page:p,touch,context})=>{
 const checks=[],screenshots=[];for(const [width,height] of [[375,844],[390,844],[1194,834],[834,1194]]){await p.setViewportSize({width,height});await all(p);await touch.tap(p.locator('[data-task-row="'+TRACKED+'"] [data-action=progress-open]'));await p.locator('#quick-progress-form').waitFor();await frames(p);const g=await dimensions(p);visible(g);assert.equal(await p.locator('#quick-range').evaluate(e=>document.activeElement===e),true);assert.equal(await p.locator('#quick-percent').evaluate(e=>document.activeElement===e),false);checks.push(g);screenshots.push(await capture(p,'quick-'+width+'x'+height));await p.keyboard.press('Escape');}
 await p.setViewportSize({width:390,height:844});await quick(p);const zoom=await context.newCDPSession(p);await zoom.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});await frames(p);const zoomGeometry=await p.evaluate(()=>{const r=document.querySelector('#dialog').getBoundingClientRect(),v=visualViewport;return {scale:v.scale,width:v.width,height:v.height,left:v.offsetLeft,top:v.offsetTop,dialog:{x:r.x,y:r.y,right:r.right,bottom:r.bottom}};});assert.equal(zoomGeometry.scale,2);assert(zoomGeometry.dialog.x>=zoomGeometry.left-1&&zoomGeometry.dialog.right<=zoomGeometry.left+zoomGeometry.width+1&&zoomGeometry.dialog.y>=zoomGeometry.top-1&&zoomGeometry.dialog.bottom<=zoomGeometry.top+zoomGeometry.height+1,JSON.stringify(zoomGeometry));screenshots.push(await capture(p,'quick-zoom2-390'));await p.keyboard.press('Escape');await zoom.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await zoom.detach();
 assert.equal(await calls(p),0);return {checks,zoomGeometry,screenshots,realKeyboard:false,rangeFocusNoNumberKeyboardClaim:true,zoom:'CDP pageScaleFactor2; physical device not tested'};
});
runners.set('Q910',async({page:p})=>{
 const text='['+DAY7+']\n- [20%] 퍼센트\n- [20] 정수\n- [0.2] 비율\n- [1] 일퍼센트\n- [1.0] 완료',f=await rawFixture(p,text),expected={'퍼센트':20,'정수':20,'비율':20,'일퍼센트':1,'완료':100};
 assert.equal(f.source,text);assert.equal(f.tasks.length,5);for(const t of f.tasks){assert.deepEqual(history(f.data,t.id),[{date:DAY7,percent:expected[t.title]}]);assert.equal(t.done,expected[t.title]===100);}
 const existing=await fixture(p,'기존 항목'),original=await raw(p).inputValue();await raw(p).fill(text);await p.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');assert.deepEqual(await data(p),existing.data);assert.equal(await raw(p).inputValue(),text);await raw(p).fill(original);await saved(p);await raw(p).fill(original+'\n'+text);await saved(p);const appended=await data(p);assert.equal(appended.tasks.filter(t=>t.docId===existing.id).length,6);assert.equal(task(appended,existing.tasks[0].id).title,'기존 항목');for(const t of appended.tasks.filter(t=>t.docId===existing.id&&t.id!==existing.tasks[0].id))assert.deepEqual(history(appended,t.id),[{date:DAY7,percent:expected[t.title]}]);return {lexicalSourcePreserved:true,values:expected,ids:f.tasks.map(t=>t.id),appendFiveNumericTasks:true,ambiguousWholeReplacement:'rejected; stored original and screen draft preserved'};
});
runners.set('Q911',async({page:p})=>{
 const f=await rawFixture(p,'['+DAY7+']\n- [20%] 제목'),id=f.tasks[0].id;await period(p,'일',DAY8);await document(p,f.id);const before=await data(p);
 for(const token of ['[20]','[0.2]']){const source='['+DAY7+']\n- '+token+' 제목 수정';await raw(p).fill(source);await saved(p);const d=await data(p);assert.equal(d.tasks.find(t=>t.docId===f.id).id,id);assert.deepEqual(d.records,before.records);assert.equal(await raw(p).inputValue(),source);}
 return {sameId:id,equalLexicalRewritesAddRecords:0,titleChangeAddsRecords:0};
});
runners.set('Q912',async({page:p})=>{
 const id=await emptyDocument(p);await period(p,'일',DAY8);await document(p,id);const text='['+DAY7+']\n- [20] 개별\n  - 날짜: 2026-09-09\n- [20] 구획\n[미정]\n- [20] 기본';await raw(p).fill(text);await saved(p);const d=await data(p),expected={'개별':'2026-09-09','구획':DAY7,'기본':DAY8},checks=[];
 for(const t of d.tasks.filter(t=>t.docId===id)){assert.deepEqual(history(d,t.id),[{date:expected[t.title],percent:20}]);checks.push({title:t.title,date:history(d,t.id)[0].date});}assert.equal(checks.length,3);assert.equal(await raw(p).inputValue(),text);return {checks,priority:'individual > section > explicit editor anchor'};
});
runners.set('Q913',async({page:p})=>{
 const f=await rawFixture(p,'['+DAY7+']\n- [10] 매일 작업'),id=f.tasks[0].id;await raw(p).fill('['+DAY8+']\n- [20] 매일 작업');await saved(p);const d=await data(p);assert.equal(d.tasks.find(t=>t.docId===f.id).id,id);assert.deepEqual(history(d,id),[{date:DAY7,percent:10},{date:DAY8,percent:20}]);assert.equal(latest(d,id).percent,20);await all(p);assert.equal(await p.locator('[data-task-row="'+id+'"]').count(),1);return {id,records:history(d,id),duplicateItems:0};
});
runners.set('Q914',async({page:p})=>{
 const f=await rawFixture(p,'['+DAY7+']\n- [20] 동명\n- [20] 동명'),[a,b]=f.tasks;assert.notEqual(a.id,b.id);await raw(p).fill(f.source.replace('[20]','[30]'));await saved(p);let d=await data(p);assert.equal(latest(d,a.id).percent,30);assert.equal(latest(d,b.id).percent,20);
 await document(p,'d-move');const before=await data(p),source=await raw(p).inputValue(),updated=source.replace('- [ ] 이사업체 견적 비교','- [35%] 이사업체 견적 비교');assert.notEqual(updated,source);await raw(p).fill(updated);await saved(p);d=await data(p);assert.deepEqual(history(d),[{date:DAY7,percent:35},{date:DAY8,percent:20}]);stableItems(before,d);assert.deepEqual(d.state.flows,before.state.flows);assert.equal(await raw(p).inputValue(),updated);return {separateIds:[a.id,b.id],referenceCanonical:TRACKED,inputRowDate:DAY7,currentStill20:true};
});
runners.set('Q915',async({page:p})=>{
 const f=await rawFixture(p,'['+DAY7+']\n- [20%] 안전'),before=f.data,checks=[];for(const token of ['[20','[2.','[101]','[-1]','[1.01]']){const invalid=f.source.replace('[20%]',token);await raw(p).fill(invalid);await p.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');assert.equal(await raw(p).inputValue(),invalid);assert.deepEqual(await data(p),before);checks.push(token);await raw(p).fill(f.source);await saved(p);}
 const fence=String.fromCharCode(96).repeat(3),code=await rawFixture(p,fence+'txt\n- [20%] 코드\n- [101] 코드 오류\n'+fence);assert.equal(code.tasks.length,0);assert.deepEqual(code.data.records,before.records);return {rejectedDrafts:checks,sourceAndIdsPreserved:true,fencedNumericRecords:0};
});
runners.set('Q916',async({page:p})=>{
 const f=await fixture(p),id=f.tasks[0].id;const checked=(await raw(p).inputValue()).replace('- [ ]','- [x]');await raw(p).fill(checked);await saved(p);assert.equal(task(await data(p),id).done,true);assert.deepEqual(history(await data(p),id),[]);
 await quickNumber(p,id,40,DAY7);await document(p,f.id);const before=await data(p),source=await raw(p).inputValue();const invalid=source.replace(/- \[[^\]]*\]/,'- [x]');assert.notEqual(invalid,source);await raw(p).fill(invalid);await p.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');assert.deepEqual(await data(p),before);await raw(p).fill(source);await saved(p);assert.deepEqual(await data(p),before);return {plainCheckboxAddsRecord:0,recordedConflictAtomic:true};
});
runners.set('Q917',async({page:p})=>{
 const f=await rawFixture(p,'['+DAY7+']\n- [20] 이동 항목\n['+DAY8+']\n- [ ] 뒤 항목'),id=f.tasks[0].id;await raw(p).fill(f.source.replace('['+DAY7+']','[2026-09-09]'));await saved(p);const before=await data(p);assert.deepEqual(before.records,f.data.records);
 const info=await p.evaluate(({docId,id})=>{const m=TextWorkspaceModel,s=m.read(localStorage).state;const row=m.rowMeta(s,docId).find(r=>r.id===id);return {row,targets:m.moveTargets(s,docId,id)};},{docId:f.id,id});const target=info.targets.find(t=>t.beforeLineId===null)||info.targets.at(-1);assert(target);await caret(p,info.row.index);await p.keyboard.press('Alt+Shift+m');await chooseMove(p,target.beforeLineId);const after=await data(p);assert.deepEqual(after.records,before.records);assert.equal(task(after,id).date,task(before,id).date);const sourceAfter=await itemSource(p,f.id);assert.match(sourceAfter,/- \[20\] 이동 항목/);return {id,sectionChangeRecords:0,structuralMoveRecords:0,datePreserved:task(after,id).date};
});
runners.set('Q918',async({page:p})=>{
 const f=await rawFixture(p,'['+DAY7+']\n- [20%] 복구'),before=f.data;await pause(950);await raw(p).fill(f.source.replace('20%','30%'));await saved(p);const after=await data(p);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await data(p),before);await p.keyboard.press('Control+Shift+z');await saved(p);assert.deepEqual(await data(p),after);await p.reload();await raw(p).waitFor();assert.deepEqual(await data(p),after);
 await p.evaluate(()=>{window.__qaFailure=true;});const pending=f.source.replace('20%','40%');await raw(p).fill(pending);await p.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');assert.equal(await raw(p).inputValue(),pending);assert.deepEqual(await data(p),after);await p.evaluate(()=>{window.__qaFailure=false;});await p.locator('#save-error [data-action=retry]').click();await saved(p);assert.equal(latest(await data(p),f.tasks[0].id).percent,40);return {undoTypingBoundaryMs:950,undoRedoReload:true,quotaDraftPreserved:true,retry:40};
});

async function main(){
 const report={schema:'flowme-v11-compact-txt-qa',mode:'planned',url:URL,storageKey:KEY,createdAt:new Date().toISOString(),realDevices:0,observedUsers:0,productionIntegration:0,summary:{planned:PLAN.length,executed:0,passed:null,failed:null,notRun:PLAN.length},cases:PLAN.map(c=>({...c,status:'not_run',console:[],pageErrors:[]}))};
 if(!process.argv.includes('--run')){if(fs.existsSync(RESULT)&&JSON.parse(fs.readFileSync(RESULT)).mode==='executed'){console.log('기존 실행 결과 보존');return;}fs.writeFileSync(RESULT,JSON.stringify(report,null,2)+'\n');console.log('새 v11 QA 18개 계획 · 실행0');return;}
 report.phase=process.argv.includes('--final')?'final':'preliminary';if(ONLY){assert.equal(report.phase,'preliminary');report.only=ONLY;}
 report.sourceHashesBefore=hashes(__dirname);const previous=path.join(__dirname,'../2026-09-08-flowme-text-workspace-ux-v10');report.v10HashesBefore=optionalHashes(previous);
 const m=require('./model.js');assert.equal(m.KEY,KEY);assert.equal(m.createState().version,11);for(const key of ['recordProgress','progressHistory','latestProgress'])assert.equal(typeof m[key],'function');
 if(fs.existsSync(RESULT)){const old=JSON.parse(fs.readFileSync(RESULT));if(old.mode==='executed'&&JSON.stringify(old.sourceHashesAfter)!==JSON.stringify(report.sourceHashesBefore)){const file=path.join(__dirname,'browser-v11-results-previous-runtime.json');if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(old,null,2)+'\n');}if(old.mode==='executed'&&old.summary.failed){const file=path.join(__dirname,old.phase==='final'?'browser-v11-results-final-initial.json':'browser-v11-results-initial.json');if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(old,null,2)+'\n');}}
 const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});report.mode='executed';report.browser=browser.version();report.startedAt=new Date().toISOString();
 try{for(const c of report.cases){if(ONLY&&c.id!==ONLY)continue;const isTouch=c.input==='cdp-touch',context=await browser.newContext({viewport:{width:isTouch?390:1194,height:isTouch?844:834},hasTouch:true,isMobile:isTouch});
 await context.addInitScript(key=>{window.__qaStorage=[];window.__qaEvents=[];for(const method of ['getItem','setItem','removeItem']){const original=Storage.prototype[method];Storage.prototype[method]=function(name,value){window.__qaStorage.push({method,key:String(name)});if(method==='setItem'&&name===key&&window.__qaFailure)throw new DOMException('Independent QA quota failure','QuotaExceededError');return method==='setItem'?original.call(this,name,value):original.call(this,name);};}for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>{window.__qaEvents.push({type,trusted:e.isTrusted,pointerType:e.pointerType||'',target:e.target.className?.baseVal??e.target.className});},true);},KEY);
 const page=await context.newPage();page.setDefaultTimeout(8000);const touch=await touchDriver(context,page);page.on('console',msg=>{if(['error','warning'].includes(msg.type()))c.console.push({type:msg.type(),text:msg.text()});});page.on('pageerror',e=>c.pageErrors.push(e.message));const start=Date.now();
 try{await page.goto(URL);await raw(page).waitFor();await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>{window.__qaProgressCalls=[];const m=TextWorkspaceModel,original=m.recordProgress;m.recordProgress=function(...args){window.__qaProgressCalls.push({id:args[1],date:args[2],percent:args[3]});return original.apply(this,args);};});c.evidence=await runners.get(c.id)({page,context,touch,url:URL});assert.deepEqual(c.pageErrors,[]);c.progressCalls=await page.evaluate(()=>window.__qaProgressCalls||[]);c.events=await page.evaluate(()=>window.__qaEvents);if(isTouch)assert(c.events.some(e=>e.trusted&&e.pointerType==='touch'&&e.type==='pointerdown'));c.status='passed';}
 catch(e){c.status='failed';c.error=e.stack||String(e);c.diagnostic=await page.evaluate(()=>({url:location.href,save:document.querySelector('#save-status')?.textContent,error:document.querySelector('#dialog-error')?.textContent,form:document.querySelector('#quick-progress-form,#progress-form')?.outerHTML,quickDate:document.querySelector('#quick-date')?.value,quickPercent:document.querySelector('#quick-percent')?.value,raw:document.querySelector('.tle-textarea')?.value})).catch(()=>null);}
 finally{c.elapsedMs=Date.now()-start;await touch.detach().catch(()=>{});await context.close();}console.log(c.id+' '+c.status+' ('+c.elapsedMs+'ms)'+(c.error?'\n'+c.error:''));}}
 finally{await browser.close();}
 report.finishedAt=new Date().toISOString();report.sourceHashesAfter=hashes(__dirname);report.v10HashesAfter=optionalHashes(previous);report.sourcesUnchangedDuringRun=JSON.stringify(report.sourceHashesBefore)===JSON.stringify(report.sourceHashesAfter);report.v10UnchangedDuringRun=report.v10HashesBefore===null?null:JSON.stringify(report.v10HashesBefore)===JSON.stringify(report.v10HashesAfter);
 const passed=report.cases.filter(c=>c.status==='passed').length,failed=report.cases.filter(c=>c.status==='failed').length;report.summary={planned:PLAN.length,executed:passed+failed,passed,failed,notRun:PLAN.length-passed-failed};fs.writeFileSync(RESULT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(failed||(!ONLY&&report.summary.notRun)||!report.sourcesUnchangedDuringRun||report.v10UnchangedDuringRun===false)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
