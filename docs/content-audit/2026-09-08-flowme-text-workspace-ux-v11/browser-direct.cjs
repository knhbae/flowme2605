'use strict';
// Independent v11 child progress / direct drag QA. No argument writes a not-run plan; freeze permits --run --final.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const KEY='flowme:ux-review:text-workspace-v11:20260908',URL=process.env.FLOWME_V11_URL||'http://127.0.0.1:8771/index.html';
const TRACKED='flow-move-d30-line-3',DAY7='2026-09-07',DAY8='2026-09-08';
const ONLY=(process.argv.find(x=>x.startsWith('--only='))||'').slice(7);
const RESULT=path.join(__dirname,ONLY?'browser-direct-results-'+ONLY.toLowerCase()+'.json':'browser-direct-results.json');
const IMAGE_DIR=path.resolve(__dirname,'../../../output/playwright/flowme-text-v11');
const SOURCES=['app.js','model.js','editor.js','index.html','styles.css','editor.css'];
const hashes=dir=>Object.fromEntries(SOURCES.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,n))).digest('hex')]));
const optionalHashes=dir=>SOURCES.every(n=>fs.existsSync(path.join(dir,n)))?hashes(dir):null;
const PLAN=[
  {
    "id": "N01",
    "name": "하위 상태칸 열기·취소·미저장100",
    "input": "keyboard",
    "expectation": "기록0·부모 완료/진행 불변"
  },
  {
    "id": "N02",
    "name": "하위 0/20/100·부모 비합산",
    "input": "keyboard",
    "expectation": "하위만 독립 기록·최신 완료 일치·부모 값 불변"
  },
  {
    "id": "N03",
    "name": "하위 날짜별 기록·과거 수정",
    "input": "keyboard",
    "expectation": "7일10/8일20·과거15수정이 최신20을 덮지 않음"
  },
  {
    "id": "N04",
    "name": "하위 TXT 다섯 수치 표기",
    "input": "keyboard",
    "expectation": "20%/20/0.2/1/1.0·lexical·하위 ID 보존"
  },
  {
    "id": "N05",
    "name": "하위 날짜·같은값/제목 재편집",
    "input": "keyboard",
    "expectation": "날짜 우선·같은값 재표기 기록0·부모와 분리"
  },
  {
    "id": "N06",
    "name": "하위 저장 실패·충돌·재진입",
    "input": "keyboard",
    "expectation": "초안/외부 기록 보호·retry·reload"
  },
  {
    "id": "N07",
    "name": "부모 hold→직접drag·Undo",
    "input": "cdp-touch",
    "expectation": "후손 전체·독립 진행/ID/날짜/owner 보존·이동 1회"
  },
  {
    "id": "N08",
    "name": "하위 묶음만 직접drag",
    "input": "cdp-touch",
    "expectation": "같은 부모 허용대상으로 하위와 딸린 줄만 이동"
  },
  {
    "id": "N09",
    "name": "선택 유지 후 즉시 재잡기",
    "input": "cdp-touch",
    "expectation": "손을 떼었다 다시 잡으면 추가450ms 없이 drag"
  },
  {
    "id": "N10",
    "name": "목적지0·유령 메뉴 방지",
    "input": "cdp-touch",
    "expectation": "불가능 이동은 원문/이력0·첫 대상 오선택0"
  },
  {
    "id": "N11",
    "name": "밖drop·pointercancel·Escape",
    "input": "cdp-touch",
    "expectation": "무효/취소는 원위치·기록/이력0"
  },
  {
    "id": "N12",
    "name": "inline 목적지 탭·키보드",
    "input": "keyboard+cdp-touch",
    "expectation": "modal/하단bar 없이 Enter확정·Escape·기존Undo만"
  },
  {
    "id": "N13",
    "name": "접힌 줄·스크롤 후 이동 geometry",
    "input": "cdp-touch",
    "expectation": "보이는 삽입선과 실제 beforeLineId 일치"
  },
  {
    "id": "N14",
    "name": "375/390·가로/세로 태블릿",
    "input": "cdp-touch",
    "expectation": "터치·수평넘침·inline target·새Undo/이동패널0"
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
  if(await p.evaluate(id=>{const h=new URLSearchParams(location.hash.slice(1));return h.get('view')==='document'&&h.get('doc')===id;},id)){await raw(p).waitFor();await frames(p);return;}
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
async function chooseMove(p,beforeLineId){await p.locator('[data-action=move-choose]').click();await frames(p);const b=p.locator('[data-move-target="'+(beforeLineId===null?'__end':beforeLineId)+'"]');await b.focus();await frames(p);const keepDepth=await p.locator('.tle-move-selected').first().evaluate(e=>{const m=TextWorkspaceModel,s=m.read(localStorage).state,id=new URLSearchParams(location.hash.slice(1)).get('doc');return m.rowMeta(s,id)[Number(e.dataset.lineIndex)].depth;});for(let i=0;i<65&&Number(await b.getAttribute('data-depth'))!==keepDepth;i++){await b.press(Number(await b.getAttribute('data-depth'))>keepDepth?'ArrowLeft':'ArrowRight');await frames(p);}assert.equal(Number(await b.getAttribute('data-depth')),keepDepth);assert.equal(await b.evaluate(e=>document.activeElement===e),true);await p.keyboard.press('Enter');await saved(p);}
async function childFixture(p){const f=await rawFixture(p,'['+DAY7+']\n- [ ] 부모\n  - [ ] 하위 A\n  - [ ] 하위 B\n- [ ] 다음 부모');const parent=f.tasks.find(t=>t.title==='부모');return {...f,parentId:parent.id,childId:parent.subchecks[0].id,secondChildId:parent.subchecks[1].id};}
function child(d,id){return d.tasks.flatMap(t=>t.subchecks.map(c=>({...c,parentId:t.id}))).find(c=>c.id===id);}
async function childQuick(p,f,id=f.childId){await document(p,f.id);await p.locator('#document-title').click();await frames(p);const index=await p.evaluate(({docId,id})=>{const m=TextWorkspaceModel;return m.rowMeta(m.read(localStorage).state,docId).find(r=>r.id===id).index;},{docId:f.id,id});const b=p.locator('.tle-progress-hit[data-line-index="'+index+'"]');await b.scrollIntoViewIfNeeded();await b.click();await p.locator('#quick-progress-form').waitFor();await frames(p);assert.equal(await p.locator('#quick-progress-form').getAttribute('data-id'),id);}
async function childRecord(p,f,value,date=DAY7,id=f.childId){await childQuick(p,f,id);await p.locator('#quick-date').fill(date);await p.locator('#quick-percent').fill(String(value));await p.locator('#quick-apply').click();await saved(p);await frames(p);}
function parentUnchanged(before,after,id){const pick=d=>{const t=task(d,id);return {done:t.done,title:t.title,date:t.date,scopeId:t.scopeId,history:history(d,id)};};assert.deepEqual(pick(after),pick(before));assert.deepEqual(after.tasks.map(t=>t.id),before.tasks.map(t=>t.id));}
runners.set('N01',async({page:p})=>{const f=await childFixture(p),before=await data(p);await childQuick(p,f);assert.equal(await p.locator('#quick-percent').inputValue(),'100');assert.match(await p.locator('#quick-feedback').textContent(),/반영 전/);assert.deepEqual(await data(p),before);assert.equal(await calls(p),0);await p.keyboard.press('Escape');assert.deepEqual(await data(p),before);return {childId:f.childId,openCancelRecords:0,parentChanged:false};});
runners.set('N02',async({page:p})=>{const f=await childFixture(p),checks=[];for(const value of [0,20,100]){await childRecord(p,f,value);const d=await data(p);assert.equal(latest(d,f.childId).percent,value);assert.equal(child(d,f.childId).done,value===100);parentUnchanged(f.data,d,f.parentId);const b=p.locator('.tle-progress-hit[data-progress-percent="'+value+'"][data-line-index="2"]');assert.equal(await b.getAttribute('role'),null);checks.push({value,done:child(d,f.childId).done});}await all(p);assert.equal(await p.locator('[data-task-row="'+f.childId+'"]').count(),0);return {checks,parentAggregation:0,childPromotedToIndependentPeriodItem:false};});
runners.set('N03',async({page:p})=>{const f=await childFixture(p);await childRecord(p,f,10,DAY7);await childRecord(p,f,20,DAY8);await childRecord(p,f,15,DAY7);const d=await data(p);assert.deepEqual(history(d,f.childId),[{date:DAY7,percent:15},{date:DAY8,percent:20}]);assert.equal(latest(d,f.childId).percent,20);parentUnchanged(f.data,d,f.parentId);await childQuick(p,f);assert.equal(await p.locator('#quick-date').inputValue(),DAY8);assert.equal(await p.locator('#quick-percent').inputValue(),'20');await p.locator('[data-action=progress-more]').click();await p.locator('#progress-form').waitFor();assert.equal(await p.locator('[data-history-date]').count(),2);return {childId:f.childId,history:history(d,f.childId),sourceDefault:DAY8,parentAggregation:0};});
runners.set('N04',async({page:p})=>{const source='['+DAY7+']\n- [ ] 부모\n  - [20%] 퍼센트\n  - [20] 정수\n  - [0.2] 비율\n  - [1] 일퍼센트\n  - [1.0] 완료',f=await rawFixture(p,source),parent=f.tasks[0],values=[20,20,20,1,100];assert.equal(f.tasks.length,1);assert.equal(parent.subchecks.length,5);assert.equal(parent.done,false);assert.deepEqual(history(f.data,parent.id),[]);for(let i=0;i<5;i++){assert.deepEqual(history(f.data,parent.subchecks[i].id),[{date:DAY7,percent:values[i]}]);assert.equal(parent.subchecks[i].done,values[i]===100);}assert.equal(await raw(p).inputValue(),source);return {values,lexicalPreserved:true,parentAggregation:0,childIds:parent.subchecks.map(c=>c.id)};});
runners.set('N05',async({page:p})=>{const source='['+DAY7+']\n- [ ] 부모\n  - 날짜: 2026-09-09\n  - [20] 하위',f=await rawFixture(p,source),parent=f.tasks[0],id=parent.subchecks[0].id;assert.deepEqual(history(f.data,id),[{date:'2026-09-09',percent:20}]);const lexical=source.replace(DAY7,DAY8).replace('[20] 하위','[0.2] 하위 이름');await raw(p).fill(lexical);await saved(p);const same=await data(p);assert.deepEqual(same.records,f.data.records);assert.equal(child(same,id).title,'하위 이름');await raw(p).fill(lexical.replace('2026-09-09','2026-09-10').replace('[0.2]','[30]'));await saved(p);const after=await data(p);assert.deepEqual(history(after,id),[{date:'2026-09-09',percent:20},{date:'2026-09-10',percent:30}]);assert.deepEqual(history(after,parent.id),[]);return {childId:id,individualParentDatePriority:true,lexicalAndTitleRecords:0,history:history(after,id)};});
runners.set('N06',async({page:p,context,url})=>{const f=await childFixture(p),before=await data(p);await childQuick(p,f);await p.locator('#quick-percent').fill('35');await p.evaluate(()=>{window.__qaFailure=true;});await p.locator('#quick-apply').click();await p.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');assert.deepEqual(await data(p),before);await p.evaluate(()=>{window.__qaFailure=false;});await p.locator('#save-error [data-action=retry]').click();await saved(p);const stored=await data(p);assert.equal(latest(stored,f.childId).percent,35);await p.reload();await raw(p).waitFor();assert.deepEqual(await data(p),stored);await childQuick(p,f);await p.locator('#quick-percent').fill('45');const other=await context.newPage();await other.goto(url);await raw(other).waitFor();await childRecord(other,f,50,DAY8);await p.waitForFunction(()=>document.querySelector('.tle-textarea').readOnly);const external=await data(p);assert.equal(await p.locator('#quick-percent').inputValue(),'45');assert.equal(await p.locator('#quick-apply').isDisabled(),true);assert.equal(latest(external,f.childId).percent,50);parentUnchanged(f.data,external,f.parentId);return {quotaRetry:35,reloadPreserved:true,conflictDraft:45,externalLatest:50,parentAggregation:0};});
const selected=p=>p.locator('.tle-root.tle-has-move-selection');
async function moveInfo(p,docId,lineId){return p.evaluate(({docId,lineId})=>{const m=TextWorkspaceModel,s=m.read(localStorage).state,d=m.getDocument(s,docId);return {lines:d.lines,rows:m.rowMeta(s,docId),selection:m.selectionForMove(s,docId,lineId),targets:m.moveTargets(s,docId,lineId)};},{docId,lineId});}
async function sourceHandle(p,info,lineId){const row=info.rows.find(r=>r.id===lineId);assert(row);await p.locator('#document-title').click();await frames(p);const h=p.locator((row.kind==='scope'?'.tle-scope-open':'.tle-progress-hit')+'[data-line-index="'+row.index+'"]');await h.scrollIntoViewIfNeeded();await frames(p);return h;}
async function center(h){const b=await h.boundingBox();assert(b);return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};}
async function hold(p,touch,h,release=true){const pt=await center(h);await touch.start(pt);await pause(600);await selected(p).waitFor();if(release){await touch.end();await frames(p);}return pt;}
async function targetPoint(p,index){const line=p.locator('.tle-line[data-line-index="'+index+'"]');const b=await line.boundingBox();assert(b);return {x:Math.round(b.x+90),y:Math.round(b.y+2)};}
function movedState(before,after,info,targetId){assert.deepEqual(after.records,before.records);assert.deepEqual(after.state.folders,before.state.folders);assert.deepEqual(after.state.bindings,before.state.bindings);const flatten=d=>d.tasks.flatMap(t=>[{id:t.id,title:t.title,date:t.date,done:t.done,scopeId:t.scopeId},...t.subchecks.map(c=>({...c,parentId:t.id}))]).sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(flatten(after),flatten(before));const original=info.lines.map(l=>l.id),ids=original.filter(id=>!info.selection.lineIds.includes(id));ids.splice(targetId===null?ids.length:ids.indexOf(targetId),0,...info.selection.lineIds);const doc=after.state.documents.find(d=>d.id===info.rows[0]?.docId)||after.state.documents.find(d=>d.lines.some(l=>l.id===info.selection.lineId));assert(doc);assert.deepEqual(doc.lines.map(l=>l.id).filter(id=>original.includes(id)),ids);}
async function drag(p,touch,f,lineId,target){const before=await data(p),info=await moveInfo(p,f.id,lineId);const origin=await hold(p,touch,await sourceHandle(p,info,lineId),false);const end=await targetPoint(p,target.index);end.x=origin.x;await touch.move(end);await p.locator('.tle-move-drop:not([hidden])').waitFor();assert.equal(await p.locator('.tle-move-drop').getAttribute('data-before-line-id'),target.beforeLineId||'');await touch.end();await saved(p);await frames(p);const after=await data(p);movedState(before,after,info,target.beforeLineId);return {before,after,info};}
async function inlineMove(p,targetId){const t=p.locator('.tle-move-target-button[data-move-target="'+(targetId===null?'__end':targetId)+'"]');await t.evaluate(e=>{const rows=document.querySelectorAll('.tle-line'),row=rows[Number(e.dataset.lineIndex)],last=rows[rows.length-1];document.querySelector('.tle-textarea').scrollTop=Math.max(0,(row?row.offsetTop:last.offsetTop+last.offsetHeight)-80);});await frames(p);await t.scrollIntoViewIfNeeded();await t.focus();await frames(p);const keepDepth=await p.locator('.tle-move-selected').first().evaluate(e=>{const m=TextWorkspaceModel,s=m.read(localStorage).state,id=new URLSearchParams(location.hash.slice(1)).get('doc');return m.rowMeta(s,id)[Number(e.dataset.lineIndex)].depth;});for(let i=0;i<65&&Number(await t.getAttribute('data-depth'))!==keepDepth;i++){await t.press(Number(await t.getAttribute('data-depth'))>keepDepth?'ArrowLeft':'ArrowRight');await frames(p);}assert.equal(Number(await t.getAttribute('data-depth')),keepDepth);await p.keyboard.press('Enter');await saved(p);await frames(p);}
async function noExtraMoveUI(p){assert.equal(await p.locator('#move-bar,[data-action=move-choose]').count(),0);assert.equal(await p.locator('#dialog').evaluate(e=>e.open),false);assert.equal(await p.locator('#undo-button').count(),1);const undo=await p.getByRole('button').evaluateAll(es=>es.filter(e=>/되돌리기|Undo/i.test((e.getAttribute('aria-label')||'')+' '+e.textContent)).map(e=>e.id));assert.deepEqual(undo,['undo-button']);}
runners.set('N07',async({page:p,touch})=>{const f=await childFixture(p);await childRecord(p,f,20);await document(p,f.id);const info=await moveInfo(p,f.id,f.parentId),target=info.targets.find(t=>t.beforeLineId===null);assert(target);const before=await data(p);await caret(p,info.rows.find(r=>r.id===f.parentId).index);await p.keyboard.press('Alt+Shift+m');await inlineMove(p,target.beforeLineId);const reordered=await data(p);movedState(before,reordered,info,target.beforeLineId);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await data(p),before);const fresh=await moveInfo(p,f.id,f.parentId),dest=fresh.targets.find(t=>t.index>=fresh.selection.endIndex&&t.beforeLineId!==null)||fresh.targets.find(t=>t.index<fresh.selection.startIndex);assert(dest);const moved=await drag(p,touch,f,f.parentId,dest);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await data(p),moved.before);const eventsBeforeReload=await p.evaluate(()=>window.__qaEvents);await p.reload();await raw(p).waitFor();assert.deepEqual(await data(p),moved.before);return {selectedIds:info.selection.lineIds,directDrop:dest.beforeLineId,progressPreserved:true,oneUndoAndReload:true,eventsBeforeReload};});
runners.set('N08',async({page:p,touch})=>{const f=await rawFixture(p,'['+DAY7+']\n- [ ] 부모\n  - [20] 하위 A\n    - 일반 메모\n  - [ ] 하위 B\n  - [ ] 하위 C\n- [ ] 다음 부모'),parent=f.tasks[0],id=parent.subchecks[0].id,info=await moveInfo(p,f.id,id),target=info.targets.find(t=>t.beforeLineId===parent.subchecks[2].id);assert(target);assert.equal(info.selection.lineIds.length,2);const moved=await drag(p,touch,f,id,target);assert.equal(child(moved.after,id).parentId,parent.id);assert.equal(latest(moved.after,id).percent,20);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await data(p),moved.before);return {selectedIds:info.selection.lineIds,sameParent:true,parentId:parent.id,childProgress:20,oneUndo:true};});
runners.set('N09',async({page:p,touch})=>{const f=await childFixture(p),before=await data(p),info=await moveInfo(p,f.id,f.parentId),target=info.targets.find(t=>t.index<info.selection.startIndex);assert(target);const h=await sourceHandle(p,info,f.parentId);await hold(p,touch,h);assert.equal(await selected(p).isVisible(),true);const start=Date.now();const grab=await center(h);await touch.start(grab);const end=await targetPoint(p,target.index);end.x=grab.x;await touch.move(end);await frames(p);const elapsed=Date.now()-start;assert(elapsed<450,'Regrab must enter drag without a second hold');assert.equal(await p.locator('.tle-root').getAttribute('data-move-phase'),'dragging');await touch.end();await saved(p);const after=await data(p);movedState(before,after,info,target.beforeLineId);assert.equal(await calls(p),0);return {regrabToDraggingMs:elapsed,second450msWait:false,progressCalls:0};});
runners.set('N10',async({page:p,touch})=>{const f=await rawFixture(p,'- [ ] 유일한 항목'),id=f.tasks[0].id,info=await moveInfo(p,f.id,id);assert.deepEqual(info.targets,[]);const h=await sourceHandle(p,info,id);await touch.start(await center(h));await pause(600);await touch.end();await frames(p);assert.equal(await selected(p).count(),0);assert.equal(await p.locator('.tle-move-target-button').count(),0);await noExtraMoveUI(p);assert.deepEqual(await data(p),f.data);await p.locator('#undo-button').click();await saved(p);assert.equal(await raw(p).inputValue(),'');return {legalTargets:0,phantomMenu:false,phantomHistory:false,progressCalls:await calls(p)};});
runners.set('N11',async({page:p,touch})=>{const f=await childFixture(p),info=await moveInfo(p,f.id,f.parentId);for(const mode of ['outside','pointercancel','escape']){await hold(p,touch,await sourceHandle(p,info,f.parentId),mode==='escape');if(mode==='outside'){await touch.move({x:2,y:2});await touch.end();}else if(mode==='pointercancel')await touch.cancel();else await p.keyboard.press('Escape');await frames(p);assert.deepEqual(await data(p),f.data);assert.equal(await selected(p).count(),0);}await p.locator('#undo-button').click();await saved(p);assert.equal(await raw(p).inputValue(),'');await p.keyboard.press('Control+Shift+z');await saved(p);assert.deepEqual(await data(p),f.data);return {outsideDrop:true,pointercancel:true,escape:true,extraHistoryEntries:0,progressCalls:await calls(p)};});
runners.set('N12',async({page:p,touch})=>{const f=await childFixture(p),info=await moveInfo(p,f.id,f.parentId),target=info.targets.find(t=>t.beforeLineId===null);assert(target);await caret(p,1);await p.keyboard.press('Alt+Shift+m');await noExtraMoveUI(p);assert.deepEqual(await p.locator('.tle-move-target-button').evaluateAll(es=>es.map(e=>e.dataset.moveTarget==='__end'?null:e.dataset.moveTarget)),[...new Set(info.targets.map(t=>t.beforeLineId))]);await p.keyboard.press('Escape');assert.deepEqual(await data(p),f.data);await caret(p,1);await p.keyboard.press('Alt+Shift+m');await inlineMove(p,target.beforeLineId);const after=await data(p);movedState(f.data,after,info,target.beforeLineId);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await data(p),f.data);await caret(p,1);await p.keyboard.press('Alt+Shift+m');await frames(p);const tapTarget=p.locator('.tle-move-target-button[data-move-target="__end"]');await touch.tap(tapTarget);await saved(p);movedState(f.data,await data(p),info,target.beforeLineId);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await data(p),f.data);assert(await p.evaluate(()=>window.__qaEvents.some(e=>e.type==='pointerdown'&&e.trusted&&e.pointerType==='touch')));return {keyboardInlineTarget:target.beforeLineId,cdpTapSameTarget:true,escapeKeepsSource:true,existingUndoOnly:true};});
runners.set('N13',async({page:p,touch})=>{const before=await data(p),docId='d-move',row=await p.evaluate(()=>{const m=TextWorkspaceModel;return m.rowMeta(m.read(localStorage).state,'d-move').find(r=>r.kind==='scope'&&r.scopeId==='folder-move');});await p.locator('.tle-fold-toggle[data-line-index="'+row.index+'"]').click();await frames(p);assert.equal(await p.locator('.tle-root.tle-folded-view').count(),1);const info=await moveInfo(p,docId,row.id);await hold(p,touch,await sourceHandle(p,info,row.id));assert.equal(await p.locator('.tle-root.tle-folded-view').count(),0);assert.deepEqual(await data(p),before);const t=p.locator('.tle-move-target-button:visible').last();await t.scrollIntoViewIfNeeded();const positions=await p.locator('.tle-move-target-button:visible').evaluateAll(es=>es.map(e=>({id:e.dataset.moveTarget,index:Number(e.dataset.lineIndex),y:e.getBoundingClientRect().y})));for(const pos of positions)assert(info.targets.some(t=>t.index===pos.index&&(t.beforeLineId||'__end')===pos.id));const screenshot=await capture(p,'folded-then-inline-scroll-390');await p.keyboard.press('Escape');assert.deepEqual(await data(p),before);return {foldUnfoldOnSelection:true,sourceUnchanged:true,positions,screenshot};});
runners.set('N14',async({page:p,touch})=>{const f=await childFixture(p),checks=[],screenshots=[];for(const [width,height] of [[375,844],[390,844],[1194,834],[834,1194]]){await p.setViewportSize({width,height});const info=await moveInfo(p,f.id,f.parentId);await hold(p,touch,await sourceHandle(p,info,f.parentId));await noExtraMoveUI(p);const t=p.locator('.tle-move-target-button:visible').first();await t.scrollIntoViewIfNeeded();const g=await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,fonts:document.fonts.status,targets:document.querySelectorAll('.tle-move-target-button').length}));assert.equal(g.width,g.scrollWidth);assert.equal(g.fonts,'loaded');checks.push({width,height,...g});screenshots.push(await capture(p,'direct-inline-'+width+'x'+height));await p.keyboard.press('Escape');await childQuick(p,f);visible(await dimensions(p));screenshots.push(await capture(p,'child-quick-'+width+'x'+height));await p.keyboard.press('Escape');assert.deepEqual(await data(p),f.data);}return {checks,screenshots,realDevices:0,existingUndoOnly:true};});

async function main(){
 const report={schema:'flowme-v11-child-direct-qa',mode:'planned',url:URL,storageKey:KEY,createdAt:new Date().toISOString(),realDevices:0,observedUsers:0,productionIntegration:0,summary:{planned:PLAN.length,executed:0,passed:null,failed:null,notRun:PLAN.length},cases:PLAN.map(c=>({...c,status:'not_run',console:[],pageErrors:[]}))};
 if(!process.argv.includes('--run')){if(fs.existsSync(RESULT)&&JSON.parse(fs.readFileSync(RESULT)).mode==='executed'){console.log('기존 실행 결과 보존');return;}fs.writeFileSync(RESULT,JSON.stringify(report,null,2)+'\n');console.log('새 v11 QA 14개 계획 · 실행0');return;}
 report.phase=process.argv.includes('--final')?'final':'preliminary';if(ONLY){assert.equal(report.phase,'preliminary');report.only=ONLY;}
 report.sourceHashesBefore=hashes(__dirname);const previous=path.join(__dirname,'../2026-09-08-flowme-text-workspace-ux-v10');report.v10HashesBefore=optionalHashes(previous);
 const m=require('./model.js');assert.equal(m.KEY,KEY);assert.equal(m.createState().version,11);for(const key of ['recordProgress','progressHistory','latestProgress'])assert.equal(typeof m[key],'function');
 if(fs.existsSync(RESULT)){const old=JSON.parse(fs.readFileSync(RESULT));if(old.mode==='executed'&&JSON.stringify(old.sourceHashesAfter)!==JSON.stringify(report.sourceHashesBefore)){const file=path.join(__dirname,'browser-direct-results-previous-runtime.json');if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(old,null,2)+'\n');}if(old.mode==='executed'&&old.summary.failed){const file=path.join(__dirname,old.phase==='final'?'browser-direct-results-final-initial.json':'browser-direct-results-initial.json');if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(old,null,2)+'\n');}}
 const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});report.mode='executed';report.browser=browser.version();report.startedAt=new Date().toISOString();
 try{for(const c of report.cases){if(ONLY&&c.id!==ONLY)continue;const isTouch=c.input==='cdp-touch',context=await browser.newContext({viewport:{width:isTouch?390:1194,height:isTouch?844:834},hasTouch:true,isMobile:isTouch});
 await context.addInitScript(key=>{window.__qaStorage=[];window.__qaEvents=[];for(const method of ['getItem','setItem','removeItem']){const original=Storage.prototype[method];Storage.prototype[method]=function(name,value){window.__qaStorage.push({method,key:String(name)});if(method==='setItem'&&name===key&&window.__qaFailure)throw new DOMException('Independent QA quota failure','QuotaExceededError');return method==='setItem'?original.call(this,name,value):original.call(this,name);};}for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>{window.__qaEvents.push({type,trusted:e.isTrusted,pointerType:e.pointerType||'',target:e.target.className?.baseVal??e.target.className});},true);},KEY);
 const page=await context.newPage();page.setDefaultTimeout(8000);const touch=await touchDriver(context,page);page.on('console',msg=>{if(['error','warning'].includes(msg.type()))c.console.push({type:msg.type(),text:msg.text()});});page.on('pageerror',e=>c.pageErrors.push(e.message));const start=Date.now();
 try{await page.goto(URL);await raw(page).waitFor();await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>{window.__qaProgressCalls=[];const m=TextWorkspaceModel,original=m.recordProgress;m.recordProgress=function(...args){window.__qaProgressCalls.push({id:args[1],date:args[2],percent:args[3]});return original.apply(this,args);};});assert.equal(typeof runners.get(c.id),'function','Runtime QA implementation not ready for '+c.id);c.evidence=await runners.get(c.id)({page,context,touch,url:URL});assert.deepEqual(c.pageErrors,[]);c.progressCalls=await page.evaluate(()=>window.__qaProgressCalls||[]);c.events=[...(c.evidence.eventsBeforeReload||[]),...await page.evaluate(()=>window.__qaEvents)];if(isTouch)assert(c.events.some(e=>e.trusted&&e.pointerType==='touch'&&e.type==='pointerdown'));c.status='passed';}
 catch(e){c.status='failed';c.error=e.stack||String(e);c.diagnostic=await page.evaluate(()=>({url:location.href,save:document.querySelector('#save-status')?.textContent,error:document.querySelector('#dialog-error')?.textContent,form:document.querySelector('#quick-progress-form,#progress-form')?.outerHTML,quickDate:document.querySelector('#quick-date')?.value,quickPercent:document.querySelector('#quick-percent')?.value,raw:document.querySelector('.tle-textarea')?.value})).catch(()=>null);}
 finally{c.elapsedMs=Date.now()-start;await touch.detach().catch(()=>{});await context.close();}console.log(c.id+' '+c.status+' ('+c.elapsedMs+'ms)'+(c.error?'\n'+c.error:''));}}
 finally{await browser.close();}
 report.finishedAt=new Date().toISOString();report.sourceHashesAfter=hashes(__dirname);report.v10HashesAfter=optionalHashes(previous);report.sourcesUnchangedDuringRun=JSON.stringify(report.sourceHashesBefore)===JSON.stringify(report.sourceHashesAfter);report.v10UnchangedDuringRun=report.v10HashesBefore===null?null:JSON.stringify(report.v10HashesBefore)===JSON.stringify(report.v10HashesAfter);
 const passed=report.cases.filter(c=>c.status==='passed').length,failed=report.cases.filter(c=>c.status==='failed').length;report.summary={planned:PLAN.length,executed:passed+failed,passed,failed,notRun:PLAN.length-passed-failed};fs.writeFileSync(RESULT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(failed||(!ONLY&&report.summary.notRun)||!report.sourcesUnchangedDuringRun||report.v10UnchangedDuringRun===false)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
